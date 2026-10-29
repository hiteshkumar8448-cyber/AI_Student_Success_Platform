"""
AI Student Success Platform
Two-Way Messaging & Conversation Service
"""

from typing import Any, Dict, List, Optional
from database import get_connection, generate_uuid, now_iso
from models import row_to_dict
from services.notification_service import create_notification


def get_or_create_default_conversation(
    student_id: str,
    faculty_id: str = "FACULTY001",
    subject: str = "Academic Guidance"
) -> str:
    """Find the most recent open conversation for a student or create one."""
    sid = str(student_id).strip().upper()
    fid = str(faculty_id).strip().upper()
    now = now_iso()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT conversation_id FROM conversations
            WHERE student_id = ? AND status = 'open'
            ORDER BY last_message_at DESC LIMIT 1;
        """, (sid,))
        row = cursor.fetchone()
        if row:
            return row["conversation_id"]

        # Create new conversation
        cid = generate_uuid("conv")
        cursor.execute("""
            INSERT INTO conversations (
                conversation_id, student_id, faculty_id, subject, status,
                last_message, last_message_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'open', '', ?, ?, ?);
        """, (cid, sid, fid, subject.strip(), now, now, now))
        conn.commit()
        return cid


def send_message(
    student_id: str,
    faculty_id: str,
    sender_role: str,
    sender_name: str,
    message: str,
    subject: str = "Academic Guidance",
    conversation_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Send a direct message/reply between student and faculty.
    Ensures message is attached to a conversation thread.
    """
    mid = generate_uuid("msg")
    now = now_iso()
    sid = str(student_id).strip().upper()
    fid = str(faculty_id or "FACULTY001").strip().upper()
    role = str(sender_role).strip().lower()

    cid = conversation_id or get_or_create_default_conversation(sid, fid, subject)
    receiver_id = fid if role == "student" else sid

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO student_messages (
                message_id, student_id, faculty_id, sender_role, sender_name,
                message, created_at, conversation_id, receiver_id, subject, is_read
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);
        """, (mid, sid, fid, role, sender_name.strip(), message.strip(), now, cid, receiver_id, subject.strip()))

        # Update conversation latest preview
        cursor.execute("""
            UPDATE conversations
            SET last_message = ?, last_message_at = ?, updated_at = ?
            WHERE conversation_id = ?;
        """, (message.strip()[:150], now, now, cid))

        conn.commit()

        cursor.execute("SELECT * FROM student_messages WHERE message_id = ?;", (mid,))
        created = row_to_dict(cursor.fetchone())

    # Send notification to the opposite party
    if role == "faculty":
        create_notification(
            recipient_id=sid,
            recipient_role="student",
            title=f"Message from {sender_name}",
            message=message[:100],
            notif_type="message"
        )
    else:
        create_notification(
            recipient_id=fid,
            recipient_role="faculty",
            title=f"Message from Student {sid}",
            message=message[:100],
            notif_type="message"
        )

    return created


def get_messages_for_student(student_id: str) -> List[Dict[str, Any]]:
    """Retrieve all communication messages for a student."""
    sid = str(student_id).strip().upper()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM student_messages
            WHERE student_id = ?
            ORDER BY created_at ASC;
        """, (sid,))
        return [row_to_dict(r) for r in cursor.fetchall()]


def create_conversation(
    student_id: str,
    faculty_id: str,
    subject: str,
    initial_message: str,
    sender_role: str,
    sender_name: str
) -> Dict[str, Any]:
    """Create a new distinct conversation thread."""
    cid = generate_uuid("conv")
    now = now_iso()
    sid = str(student_id).strip().upper()
    fid = str(faculty_id or "FACULTY001").strip().upper()
    role = str(sender_role).strip().lower()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO conversations (
                conversation_id, student_id, faculty_id, subject, status,
                last_message, last_message_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?);
        """, (cid, sid, fid, subject.strip(), initial_message.strip()[:150], now, now, now))

        # Insert initial message
        mid = generate_uuid("msg")
        receiver_id = fid if role == "student" else sid
        cursor.execute("""
            INSERT INTO student_messages (
                message_id, student_id, faculty_id, sender_role, sender_name,
                message, created_at, conversation_id, receiver_id, subject, is_read
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);
        """, (mid, sid, fid, role, sender_name.strip(), initial_message.strip(), now, cid, receiver_id, subject.strip()))

        conn.commit()

        cursor.execute("SELECT * FROM conversations WHERE conversation_id = ?;", (cid,))
        conv = row_to_dict(cursor.fetchone())

    # Send notification
    if role == "faculty":
        create_notification(
            recipient_id=sid,
            recipient_role="student",
            title=f"New message from {sender_name}",
            message=initial_message[:100],
            notif_type="message"
        )
    else:
        create_notification(
            recipient_id=fid,
            recipient_role="faculty",
            title=f"New message from Student {sid}",
            message=initial_message[:100],
            notif_type="message"
        )

    return conv


def list_conversations(
    user_id: str,
    role: str,
    status: Optional[str] = None,
    search: Optional[str] = None
) -> List[Dict[str, Any]]:
    """List conversations filtered by user role and search query."""
    uid = str(user_id).strip().upper()
    role = str(role).strip().lower()

    query = """
        SELECT 
            c.*,
            s.name AS student_name,
            s.course AS student_course,
            s.risk_level AS student_risk,
            s.cgpa AS student_cgpa,
            s.attendance AS student_attendance,
            f.name AS faculty_name,
            (
                SELECT COUNT(*) FROM student_messages m 
                WHERE m.conversation_id = c.conversation_id 
                AND m.is_read = 0 
                AND (m.receiver_id = ? OR (m.receiver_id = 'FACULTY' AND ? = 'faculty'))
            ) AS unread_count,
            (
                SELECT COUNT(*) FROM student_messages m 
                WHERE m.conversation_id = c.conversation_id
            ) AS total_messages
        FROM conversations c
        LEFT JOIN students s ON c.student_id = s.student_id
        LEFT JOIN faculty f ON c.faculty_id = f.faculty_id
        WHERE 1=1
    """
    params: List[Any] = [uid, role]

    if role == "student":
        query += " AND c.student_id = ?"
        params.append(uid)
    elif role == "faculty":
        # Faculty can see all student conversations or those assigned to them
        pass

    if status and isinstance(status, str) and status.strip().lower() != "all":
        query += " AND LOWER(c.status) = ?"
        params.append(status.strip().lower())

    if search and isinstance(search, str) and search.strip():
        s = f"%{search.strip().lower()}%"
        query += " AND (LOWER(c.subject) LIKE ? OR LOWER(s.name) LIKE ? OR LOWER(c.student_id) LIKE ?)"
        params.extend([s, s, s])

    query += " ORDER BY c.last_message_at DESC;"

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        return [row_to_dict(r) for r in cursor.fetchall()]


def get_conversation_by_id(
    conversation_id: str,
    user_id: Optional[str] = None,
    role: Optional[str] = None,
    mark_as_read: bool = True
) -> Optional[Dict[str, Any]]:
    """Retrieve full conversation details and all messages in thread."""
    cid = str(conversation_id).strip()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                c.*,
                s.name AS student_name,
                s.email AS student_email,
                s.course AS student_course,
                s.risk_level AS student_risk,
                s.cgpa AS student_cgpa,
                s.attendance AS student_attendance,
                f.name AS faculty_name,
                f.department AS faculty_dept
            FROM conversations c
            LEFT JOIN students s ON c.student_id = s.student_id
            LEFT JOIN faculty f ON c.faculty_id = f.faculty_id
            WHERE c.conversation_id = ?;
        """, (cid,))
        conv_row = cursor.fetchone()
        if not conv_row:
            return None

        conv = row_to_dict(conv_row)

        # Mark messages received by current user as read
        if mark_as_read and user_id and role:
            uid = str(user_id).strip().upper()
            cursor.execute("""
                UPDATE student_messages
                SET is_read = 1
                WHERE conversation_id = ?
                AND (receiver_id = ? OR (receiver_id = 'FACULTY' AND ? = 'faculty'));
            """, (cid, uid, role.lower()))
            conn.commit()

        # Fetch messages
        cursor.execute("""
            SELECT * FROM student_messages
            WHERE conversation_id = ?
            ORDER BY created_at ASC;
        """, (cid,))
        messages = [row_to_dict(r) for r in cursor.fetchall()]
        conv["messages"] = messages

        return conv


def reply_to_conversation(
    conversation_id: str,
    sender_id: str,
    sender_role: str,
    sender_name: str,
    message: str
) -> Dict[str, Any]:
    """Reply to an existing conversation thread."""
    cid = str(conversation_id).strip()
    uid = str(sender_id).strip().upper()
    role = str(sender_role).strip().lower()
    now = now_iso()
    msg_text = message.strip()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM conversations WHERE conversation_id = ?;", (cid,))
        conv = cursor.fetchone()
        if not conv:
            raise ValueError("Conversation not found")

        sid = conv["student_id"]
        fid = conv["faculty_id"]

        # Student privacy check
        if role == "student" and uid != sid:
            raise PermissionError("Forbidden: Cannot reply to another student's conversation")

        receiver_id = fid if role == "student" else sid

        mid = generate_uuid("msg")
        cursor.execute("""
            INSERT INTO student_messages (
                message_id, student_id, faculty_id, sender_role, sender_name,
                message, created_at, conversation_id, receiver_id, subject, is_read
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);
        """, (mid, sid, fid, role, sender_name.strip(), msg_text, now, cid, receiver_id, conv["subject"]))

        cursor.execute("""
            UPDATE conversations
            SET last_message = ?, last_message_at = ?, updated_at = ?
            WHERE conversation_id = ?;
        """, (msg_text[:150], now, now, cid))

        conn.commit()

        cursor.execute("SELECT * FROM student_messages WHERE message_id = ?;", (mid,))
        created = row_to_dict(cursor.fetchone())

    # Send notification
    if role == "faculty":
        create_notification(
            recipient_id=sid,
            recipient_role="student",
            title=f"Faculty Reply from {sender_name}",
            message=msg_text[:100],
            notif_type="message"
        )
    else:
        create_notification(
            recipient_id=fid,
            recipient_role="faculty",
            title=f"Student Reply from {sid}",
            message=msg_text[:100],
            notif_type="message"
        )

    return created
