"""
AI Student Success Platform
Two-Way Intervention Service
"""

from typing import Any, Dict, List, Optional
from database import get_connection, generate_uuid, now_iso
from models import row_to_dict
from services.notification_service import create_notification


def create_intervention(
    student_id: str,
    faculty_id: str,
    data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Create an intervention in the shared database and notify the target student.
    Also registers the opening message in the two-way conversation replies thread.
    """
    int_id = generate_uuid("int")
    now = now_iso()
    sid = str(student_id).strip().upper()
    fid = str(faculty_id).strip().upper()

    title = str(data.get("title") or "Academic Advisory").strip()
    int_type = str(data.get("type") or "Academic Support").strip()
    description = str(data.get("description") or "").strip()
    priority = str(data.get("priority") or "Medium").strip()
    status = str(data.get("status") or "Open").strip()
    due_date = str(data.get("due_date") or "").strip()
    action_type = str(data.get("action_type") or "Mentoring Session").strip()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO interventions (
                intervention_id, student_id, faculty_id, type, title,
                description, priority, status, due_date, action_type,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            int_id, sid, fid, int_type, title,
            description, priority, status, due_date, action_type,
            now, now
        ))

        # Register initial faculty message in intervention_replies thread
        if description:
            rep_id = generate_uuid("rep")
            cursor.execute("""
                INSERT INTO intervention_replies (
                    reply_id, intervention_id, sender_id, sender_role, sender_name, message, created_at
                ) VALUES (?, ?, ?, 'faculty', 'Faculty Mentor', ?, ?);
            """, (rep_id, int_id, fid, description, now))

        conn.commit()

        cursor.execute("SELECT * FROM interventions WHERE intervention_id = ?;", (int_id,))
        created = row_to_dict(cursor.fetchone())

    # Automatically notify the student
    create_notification(
        recipient_id=sid,
        recipient_role="student",
        title=f"New Faculty Intervention: {title}",
        message=description or f"Faculty member {fid} assigned an intervention requiring your attention.",
        notif_type="intervention"
    )

    return created


def get_all_interventions(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Retrieve all interventions with student profile info and thread stats."""
    query = """
        SELECT 
            i.*,
            s.name AS student_name,
            s.course AS student_course,
            s.risk_level AS student_risk,
            s.cgpa AS student_cgpa,
            s.attendance AS student_attendance,
            f.name AS faculty_name,
            (SELECT COUNT(*) FROM intervention_replies r WHERE r.intervention_id = i.intervention_id) AS reply_count,
            (SELECT MAX(r.created_at) FROM intervention_replies r WHERE r.intervention_id = i.intervention_id) AS last_reply_at
        FROM interventions i
        LEFT JOIN students s ON i.student_id = s.student_id
        LEFT JOIN faculty f ON i.faculty_id = f.faculty_id
        WHERE 1=1
    """
    params: List[Any] = []

    if status and status.strip().lower() != "all":
        query += " AND LOWER(i.status) = ?"
        params.append(status.strip().lower())

    if priority and priority.strip().lower() != "all":
        query += " AND LOWER(i.priority) = ?"
        params.append(priority.strip().lower())

    if search:
        s = f"%{search.strip().lower()}%"
        query += " AND (LOWER(i.title) LIKE ? OR LOWER(s.name) LIKE ? OR LOWER(i.student_id) LIKE ?)"
        params.extend([s, s, s])

    query += " ORDER BY i.created_at DESC;"

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        return [row_to_dict(r) for r in cursor.fetchall()]


def get_interventions_for_student(student_id: str) -> List[Dict[str, Any]]:
    """Retrieve all interventions targeted at a given student with stats."""
    sid = str(student_id).strip().upper()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                i.*,
                s.name AS student_name,
                f.name AS faculty_name,
                (SELECT COUNT(*) FROM intervention_replies r WHERE r.intervention_id = i.intervention_id) AS reply_count,
                (SELECT MAX(r.created_at) FROM intervention_replies r WHERE r.intervention_id = i.intervention_id) AS last_reply_at
            FROM interventions i
            LEFT JOIN students s ON i.student_id = s.student_id
            LEFT JOIN faculty f ON i.faculty_id = f.faculty_id
            WHERE i.student_id = ?
            ORDER BY i.created_at DESC;
        """, (sid,))
        return [row_to_dict(r) for r in cursor.fetchall()]


def get_intervention_by_id(
    intervention_id: str,
    user_id: Optional[str] = None,
    role: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """Retrieve full intervention details and two-way conversation thread."""
    iid = str(intervention_id).strip()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                i.*,
                s.name AS student_name,
                s.email AS student_email,
                s.course AS student_course,
                s.risk_level AS student_risk,
                s.cgpa AS student_cgpa,
                s.attendance AS student_attendance,
                f.name AS faculty_name,
                f.department AS faculty_dept
            FROM interventions i
            LEFT JOIN students s ON i.student_id = s.student_id
            LEFT JOIN faculty f ON i.faculty_id = f.faculty_id
            WHERE i.intervention_id = ?;
        """, (iid,))
        row = cursor.fetchone()
        if not row:
            return None

        data = row_to_dict(row)

        # Authorization check: student can only view their own
        if role == "student" and user_id and data["student_id"] != user_id.upper():
            raise PermissionError("Forbidden: You cannot view another student's intervention")

        # Fetch all replies in chronological order
        cursor.execute("""
            SELECT * FROM intervention_replies
            WHERE intervention_id = ?
            ORDER BY created_at ASC;
        """, (iid,))
        replies = [row_to_dict(r) for r in cursor.fetchall()]

        # If replies table is empty but legacy response exists, synthesize it
        if not replies:
            if data.get("description"):
                replies.append({
                    "reply_id": f"initial_{iid}",
                    "intervention_id": iid,
                    "sender_id": data["faculty_id"],
                    "sender_role": "faculty",
                    "sender_name": data.get("faculty_name") or "Faculty Mentor",
                    "message": data["description"],
                    "created_at": data["created_at"]
                })
            if data.get("student_response"):
                replies.append({
                    "reply_id": f"resp_{iid}",
                    "intervention_id": iid,
                    "sender_id": data["student_id"],
                    "sender_role": "student",
                    "sender_name": data.get("student_name") or f"Student {data['student_id']}",
                    "message": data["student_response"],
                    "created_at": data.get("student_response_at") or data["updated_at"]
                })

        data["replies"] = replies
        return data


def reply_to_intervention(
    intervention_id: str,
    sender_id: str,
    sender_role: str,
    sender_name: str,
    message: str
) -> Dict[str, Any]:
    """
    Append a reply to an intervention conversation from either student or faculty.
    Does NOT create a new intervention.
    """
    iid = str(intervention_id).strip()
    uid = str(sender_id).strip().upper()
    role = str(sender_role).strip().lower()
    now = now_iso()
    msg_text = message.strip()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM interventions WHERE intervention_id = ?;", (iid,))
        row = cursor.fetchone()
        if not row:
            raise ValueError("Intervention not found")

        existing = row_to_dict(row)
        sid = existing["student_id"]
        fid = existing["faculty_id"]

        # Authorization check
        if role == "student" and uid != sid:
            raise PermissionError("Forbidden: Cannot reply to another student's intervention")

        # Insert reply
        rid = generate_uuid("rep")
        cursor.execute("""
            INSERT INTO intervention_replies (
                reply_id, intervention_id, sender_id, sender_role, sender_name, message, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (rid, iid, uid, role, sender_name.strip(), msg_text, now))

        # Automatically advance status to In Progress if currently Open or Pending
        new_status = existing["status"]
        if new_status in ("Open", "Pending"):
            new_status = "In Progress"

        # Maintain backward compatibility fields
        if role == "student":
            cursor.execute("""
                UPDATE interventions
                SET student_response = ?, student_response_at = ?, status = ?, updated_at = ?
                WHERE intervention_id = ?;
            """, (msg_text, now, new_status, now, iid))
        else:
            cursor.execute("""
                UPDATE interventions
                SET status = ?, updated_at = ?
                WHERE intervention_id = ?;
            """, (new_status, now, iid))

        conn.commit()

        cursor.execute("SELECT * FROM intervention_replies WHERE reply_id = ?;", (rid,))
        created_reply = row_to_dict(cursor.fetchone())

    # Send notification to opposite party
    if role == "faculty":
        create_notification(
            recipient_id=sid,
            recipient_role="student",
            title=f"Faculty Reply on Intervention: {existing['title']}",
            message=msg_text[:100],
            notif_type="intervention"
        )
    else:
        create_notification(
            recipient_id=fid,
            recipient_role="faculty",
            title=f"Student Reply: {sid} on {existing['title']}",
            message=msg_text[:100],
            notif_type="intervention"
        )

    return created_reply


def update_intervention(
    intervention_id: str,
    updates: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """Update intervention status or priority and notify student."""
    iid = str(intervention_id).strip()
    now = now_iso()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM interventions WHERE intervention_id = ?;", (iid,))
        existing = cursor.fetchone()
        if not existing:
            return None

        status = updates.get("status") or existing["status"]
        priority = updates.get("priority") or existing["priority"]
        due_date = updates.get("due_date") or existing["due_date"]
        description = updates.get("description") or existing["description"]

        cursor.execute("""
            UPDATE interventions
            SET status = ?, priority = ?, due_date = ?, description = ?, updated_at = ?
            WHERE intervention_id = ?;
        """, (status, priority, due_date, description, now, iid))
        conn.commit()

        cursor.execute("SELECT * FROM interventions WHERE intervention_id = ?;", (iid,))
        updated = row_to_dict(cursor.fetchone())

    # Notify student of update
    create_notification(
        recipient_id=existing["student_id"],
        recipient_role="student",
        title=f"Intervention Status: {existing['title']}",
        message=f"Status updated to '{status}'. Priority: {priority}.",
        notif_type="intervention"
    )

    return updated


def respond_to_intervention(
    intervention_id: str,
    student_id: str,
    response_text: str
) -> Optional[Dict[str, Any]]:
    """Backward compatible helper: appends a reply and updates intervention."""
    try:
        reply_to_intervention(
            intervention_id=intervention_id,
            sender_id=student_id,
            sender_role="student",
            sender_name=f"Student {student_id.upper()}",
            message=response_text
        )
        return get_intervention_by_id(intervention_id)
    except Exception:
        return None
