"""
AI Student Success Platform
Faculty Notes Service
"""

from typing import Any, Dict, List, Optional
from database import get_connection, generate_uuid, now_iso
from models import row_to_dict
from services.notification_service import create_notification


def add_faculty_note(
    faculty_id: str,
    student_id: str,
    title: str,
    message: str
) -> Dict[str, Any]:
    """Add a faculty note/observation for a student."""
    nid = generate_uuid("note")
    now = now_iso()
    fid = str(faculty_id).strip().upper()
    sid = str(student_id).strip().upper()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO faculty_notes (
                note_id, faculty_id, student_id, title, message, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (nid, fid, sid, title.strip(), message.strip(), now, now))
        conn.commit()

        cursor.execute("SELECT * FROM faculty_notes WHERE note_id = ?;", (nid,))
        created = row_to_dict(cursor.fetchone())

    # Notify student that faculty added a note
    create_notification(
        recipient_id=sid,
        recipient_role="student",
        title=f"New Faculty Note: {title}",
        message=f"Faculty mentor {fid} added an academic progress note.",
        notif_type="note"
    )

    return created


def get_notes_for_student(student_id: str) -> List[Dict[str, Any]]:
    """Retrieve all faculty notes for a student."""
    sid = str(student_id).strip().upper()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM faculty_notes
            WHERE student_id = ?
            ORDER BY created_at DESC;
        """, (sid,))
        return [row_to_dict(r) for r in cursor.fetchall()]
