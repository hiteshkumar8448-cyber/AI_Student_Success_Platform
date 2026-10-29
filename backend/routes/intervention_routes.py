"""
AI Student Success Platform
Two-Way Interventions REST Endpoints
"""

from fastapi import APIRouter, Header, HTTPException, Query
from typing import Optional, Union
from auth import (
    require_faculty,
    require_student,
    get_authenticated_user
)
from schemas import (
    InterventionCreate,
    InterventionUpdate,
    InterventionRespond,
    InterventionReplyCreate
)
from services.intervention_service import (
    create_intervention,
    get_interventions_for_student,
    get_all_interventions,
    get_intervention_by_id,
    reply_to_intervention,
    update_intervention,
    respond_to_intervention
)

router = APIRouter(prefix="/api", tags=["Interventions"])


@router.get("/interventions")
def list_interventions(
    student_id: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    priority: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    authorization: str | None = Header(default=None)
):
    """List interventions. If called by student, limits to their own."""
    if authorization:
        user = get_authenticated_user(authorization)
        if user["role"] == "student":
            return get_interventions_for_student(user["user_id"])

    sid = student_id if isinstance(student_id, str) else None
    st = status if isinstance(status, str) else None
    pr = priority if isinstance(priority, str) else None
    sr = search if isinstance(search, str) else None

    if sid:
        return get_interventions_for_student(sid)

    return get_all_interventions(status=st, priority=pr, search=sr)


@router.get("/interventions/{intervention_id}")
def get_single_intervention(
    intervention_id: str,
    authorization: str | None = Header(default=None)
):
    """Get single intervention with full two-way message conversation thread."""
    user = get_authenticated_user(authorization) if authorization else None
    role = user["role"] if user else None
    uid = user["user_id"] if user else None

    try:
        data = get_intervention_by_id(intervention_id, user_id=uid, role=role)
        if not data:
            raise HTTPException(status_code=404, detail="Intervention not found")
        return data
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))


@router.get("/student/{student_id}/interventions")
@router.get("/students/{student_id}/interventions")
def list_student_interventions(student_id: str, authorization: str | None = Header(default=None)):
    """Retrieve all interventions targeted at a specific student."""
    if authorization:
        user = get_authenticated_user(authorization)
        if user["role"] == "student" and user["user_id"].upper() != student_id.upper():
            raise HTTPException(status_code=403, detail="Forbidden: You can only view your own interventions")

    return get_interventions_for_student(student_id)


@router.post("/interventions")
def add_intervention(
    data: InterventionCreate,
    authorization: str | None = Header(default=None)
):
    """
    Create an intervention for a student.
    Enforces that only faculty can create interventions.
    Automatically generates a notification for the student.
    """
    user = require_faculty(authorization)
    faculty_id = user["user_id"]

    return create_intervention(
        student_id=data.student_id,
        faculty_id=faculty_id,
        data=data.model_dump()
    )


@router.post("/interventions/{intervention_id}/reply")
def reply_to_intervention_endpoint(
    intervention_id: str,
    data: Union[InterventionReplyCreate, InterventionRespond],
    authorization: str | None = Header(default=None)
):
    """
    Append a reply to an intervention conversation from either student or faculty.
    Keeps conversation attached to the original thread.
    """
    user = get_authenticated_user(authorization)
    role = user["role"]
    uid = user["user_id"]
    sender_name = "Faculty Mentor" if role == "faculty" else f"Student {uid}"

    msg = getattr(data, "message", None) or getattr(data, "response", None) or ""
    if not msg.strip():
        raise HTTPException(status_code=400, detail="Reply message cannot be empty")

    try:
        reply = reply_to_intervention(
            intervention_id=intervention_id,
            sender_id=uid,
            sender_role=role,
            sender_name=sender_name,
            message=msg
        )
        return {
            "message": "Reply posted successfully",
            "reply": reply,
            "intervention": get_intervention_by_id(intervention_id, user_id=uid, role=role)
        }
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.patch("/interventions/{intervention_id}")
@router.patch("/interventions/{intervention_id}/status")
def modify_intervention(
    intervention_id: str,
    data: InterventionUpdate,
    authorization: str | None = Header(default=None)
):
    """Update status, priority or due date of an intervention."""
    require_faculty(authorization)
    updated = update_intervention(intervention_id, data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Intervention not found")
    return updated


# Alias for backward compatibility
update_intervention_status = modify_intervention


@router.post("/interventions/{intervention_id}/respond")
def respond_intervention_endpoint(
    intervention_id: str,
    data: InterventionRespond,
    authorization: str | None = Header(default=None)
):
    """Student responds to an intervention (backward compatibility)."""
    user = require_student(authorization)
    try:
        reply_to_intervention(
            intervention_id=intervention_id,
            sender_id=user["user_id"],
            sender_role="student",
            sender_name=f"Student {user['user_id']}",
            message=data.response
        )
        updated = get_intervention_by_id(intervention_id, user_id=user["user_id"], role="student")
        if not updated:
            raise HTTPException(status_code=404, detail="Intervention not found")
        return updated
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))


@router.post("/interventions/{intervention_id}/acknowledge")
def acknowledge_intervention_endpoint(
    intervention_id: str,
    authorization: str | None = Header(default=None)
):
    """Student acknowledges receiving an intervention."""
    user = require_student(authorization)
    try:
        reply_to_intervention(
            intervention_id=intervention_id,
            sender_id=user["user_id"],
            sender_role="student",
            sender_name=f"Student {user['user_id']}",
            message="Acknowledged and reviewing action plan with mentor."
        )
        updated = get_intervention_by_id(intervention_id, user_id=user["user_id"], role="student")
        return updated
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
