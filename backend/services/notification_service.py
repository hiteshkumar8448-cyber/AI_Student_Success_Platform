"""
AI Student Success Platform
Notification Service
"""

from typing import Any, Dict, List, Optional
from database import get_connection, generate_uuid, now_iso
from models import row_to_dict


def create_notification(
    recipient_id: str,
    recipient_role: str,
    title: str,
    message: str,
    notif_type: str = "info"
) -> Dict[str, Any]:
    """
    Persist a new notification in the database.
    """
    notif_id = generate_uuid("notif")
    now = now_iso()
    rec_id = str(recipient_id).strip().upper()
    role = str(recipient_role).strip().lower()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO notifications (
                notification_id, recipient_id, recipient_role, title, message, type, is_read, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 0, ?);
        """, (notif_id, rec_id, role, title, message, notif_type, now))
        conn.commit()

        cursor.execute("SELECT * FROM notifications WHERE notification_id = ?;", (notif_id,))
        return row_to_dict(cursor.fetchone())


def get_notifications(
    recipient_id: str,
    recipient_role: Optional[str] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """
    Retrieve notifications for a student or faculty member.
    """
    rec_id = str(recipient_id).strip().upper()

    with get_connection() as conn:
        cursor = conn.cursor()
        if recipient_role:
            cursor.execute("""
                SELECT * FROM notifications
                WHERE recipient_id = ? AND recipient_role = ?
                ORDER BY created_at DESC
                LIMIT ?;
            """, (rec_id, str(recipient_role).strip().lower(), limit))
        else:
            cursor.execute("""
                SELECT * FROM notifications
                WHERE recipient_id = ?
                ORDER BY created_at DESC
                LIMIT ?;
            """, (rec_id, limit))

        return [row_to_dict(row) for row in cursor.fetchall()]


def mark_notification_as_read(notification_id: str, recipient_id: str) -> bool:
    """
    Mark a single notification as read, ensuring recipient owns it.
    """
    nid = str(notification_id).strip()
    rec_id = str(recipient_id).strip().upper()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE notifications
            SET is_read = 1
            WHERE notification_id = ? AND recipient_id = ?;
        """, (nid, rec_id))
        conn.commit()
        return cursor.rowcount > 0


def mark_all_read(recipient_id: str) -> int:
    """
    Mark all unread notifications as read for a recipient.
    """
    rec_id = str(recipient_id).strip().upper()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE notifications
            SET is_read = 1
            WHERE recipient_id = ? AND is_read = 0;
        """, (rec_id,))
        conn.commit()
        return cursor.rowcount
