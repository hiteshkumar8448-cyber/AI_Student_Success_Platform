"""
AI Student Success Platform
Student Goals Service
"""

from typing import Any, Dict, List, Optional
from database import get_connection, generate_uuid, now_iso
from models import row_to_dict
from services.notification_service import create_notification


def create_goal(student_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new academic/personal goal for a student."""
    gid = generate_uuid("goal")
    now = now_iso()
    sid = str(student_id).strip().upper()

    title = str(data.get("title") or "Academic Goal").strip()
    description = str(data.get("description") or "").strip()
    target_date = str(data.get("target_date") or "").strip()
    status = str(data.get("status") or "In Progress").strip()
    progress = max(0, min(100, int(data.get("progress") or 0)))

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO student_goals (
                goal_id, student_id, title, description, target_date, status, progress, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (gid, sid, title, description, target_date, status, progress, now, now))
        conn.commit()

        cursor.execute("SELECT * FROM student_goals WHERE goal_id = ?;", (gid,))
        created = row_to_dict(cursor.fetchone())

    # Create confirmation notification for the student
    create_notification(
        recipient_id=sid,
        recipient_role="student",
        title="Goal Created Successfully",
        message=f"You set a new goal: '{title}'. Keep making steady progress!",
        notif_type="goal"
    )

    return created


def get_goals_for_student(student_id: str) -> List[Dict[str, Any]]:
    """Fetch all goals set by a student."""
    sid = str(student_id).strip().upper()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM student_goals
            WHERE student_id = ?
            ORDER BY created_at DESC;
        """, (sid,))
        return [row_to_dict(r) for r in cursor.fetchall()]


def update_goal(goal_id: str, student_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update goal status or progress."""
    gid = str(goal_id).strip()
    sid = str(student_id).strip().upper()
    now = now_iso()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM student_goals WHERE goal_id = ? AND student_id = ?;", (gid, sid))
        existing = cursor.fetchone()
        if not existing:
            return None

        title = updates.get("title") or existing["title"]
        description = updates.get("description") if "description" in updates else existing["description"]
        target_date = updates.get("target_date") if "target_date" in updates else existing["target_date"]
        status = updates.get("status") or existing["status"]
        progress = updates.get("progress") if updates.get("progress") is not None else existing["progress"]
        progress = max(0, min(100, int(progress)))

        # Automatically mark Completed if progress hits 100
        if progress == 100 and status != "Completed":
            status = "Completed"

        cursor.execute("""
            UPDATE student_goals
            SET title = ?, description = ?, target_date = ?, status = ?, progress = ?, updated_at = ?
            WHERE goal_id = ?;
        """, (title, description, target_date, status, progress, now, gid))
        conn.commit()

        cursor.execute("SELECT * FROM student_goals WHERE goal_id = ?;", (gid,))
        updated = row_to_dict(cursor.fetchone())

    return updated


def delete_goal(goal_id: str, student_id: str) -> bool:
    """Delete a student goal."""
    gid = str(goal_id).strip()
    sid = str(student_id).strip().upper()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM student_goals WHERE goal_id = ? AND student_id = ?;", (gid, sid))
        conn.commit()
        return cursor.rowcount > 0
