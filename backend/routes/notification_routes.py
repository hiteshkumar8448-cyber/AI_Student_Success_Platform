"""
AI Student Success Platform
Notifications REST Endpoints
"""

from fastapi import APIRouter, Header, HTTPException
from auth import get_authenticated_user, require_faculty
from services.notification_service import (
    get_notifications,
    mark_notification_as_read,
    mark_all_read
)

router = APIRouter(prefix="/api", tags=["Notifications"])


@router.get("/notifications")
def list_current_user_notifications(authorization: str | None = Header(default=None)):
    """Fetch notifications for currently logged in student or faculty."""
    user = get_authenticated_user(authorization)
    return get_notifications(
        recipient_id=user["user_id"],
        recipient_role=user["role"]
    )


@router.get("/notifications/summary")
def get_notifications_summary(authorization: str | None = Header(default=None)):
    """Summary of unread counts categorized by notification type for dashboard badges."""
    user = get_authenticated_user(authorization)
    uid = user["user_id"]
    role = user["role"]
    notifs = get_notifications(recipient_id=uid, recipient_role=role)
    unread = [n for n in notifs if not n.get("is_read")]

    return {
        "total_unread": len(unread),
        "messages_unread": len([n for n in unread if n.get("type") == "message"]),
        "interventions_unread": len([n for n in unread if n.get("type") == "intervention"]),
        "notes_unread": len([n for n in unread if n.get("type") in ("note", "material")]),
        "recent_unread": unread[:5]
    }



@router.get("/student/{student_id}/notifications")
@router.get("/students/{student_id}/notifications")
def get_student_notifications_route(student_id: str, authorization: str | None = Header(default=None)):
    """Retrieve notifications for a student."""
    if authorization:
        user = get_authenticated_user(authorization)
        if user["role"] == "student" and user["user_id"].upper() != student_id.upper():
            raise HTTPException(status_code=403, detail="Forbidden")

    return get_notifications(recipient_id=student_id, recipient_role="student")


@router.get("/faculty/notifications")
def get_faculty_notifications_route(authorization: str | None = Header(default=None)):
    """Retrieve notifications for faculty."""
    user = require_faculty(authorization)
    return get_notifications(recipient_id=user["user_id"], recipient_role="faculty")


@router.patch("/notifications/{notification_id}/read")
def mark_read_route(notification_id: str, authorization: str | None = Header(default=None)):
    """Mark a notification as read."""
    user = get_authenticated_user(authorization)
    success = mark_notification_as_read(notification_id, user["user_id"])
    return {"success": success, "notification_id": notification_id}


@router.post("/notifications/read-all")
def mark_all_read_route(authorization: str | None = Header(default=None)):
    """Mark all unread notifications as read for current user."""
    user = get_authenticated_user(authorization)
    count = mark_all_read(user["user_id"])
    return {"success": True, "marked_count": count}
