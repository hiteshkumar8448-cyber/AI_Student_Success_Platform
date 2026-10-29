"""
AI Student Success Platform
Student Goals REST Endpoints
"""

from fastapi import APIRouter, Header, HTTPException
from auth import require_student, require_same_student_or_faculty, get_authenticated_user
from schemas import StudentGoalCreate, StudentGoalUpdate
from services.goal_service import (
    create_goal,
    get_goals_for_student,
    update_goal,
    delete_goal
)

router = APIRouter(prefix="/api", tags=["Goals"])


@router.get("/goals")
def get_my_goals(authorization: str | None = Header(default=None)):
    """Fetch goals for the authenticated student."""
    user = require_student(authorization)
    return get_goals_for_student(user["user_id"])


@router.get("/students/{student_id}/goals")
@router.get("/student/{student_id}/goals")
def get_student_goals_route(student_id: str, authorization: str | None = Header(default=None)):
    """Fetch goals for a student. Allowed for faculty or the student."""
    if authorization:
        require_same_student_or_faculty(authorization, student_id)
    return get_goals_for_student(student_id)


@router.post("/goals")
def create_goal_route(data: StudentGoalCreate, authorization: str | None = Header(default=None)):
    """Student creates a new goal."""
    user = require_student(authorization)
    return create_goal(user["user_id"], data.model_dump())


@router.patch("/goals/{goal_id}")
def update_goal_route(goal_id: str, data: StudentGoalUpdate, authorization: str | None = Header(default=None)):
    """Student updates progress or status of a goal."""
    user = require_student(authorization)
    updated = update_goal(goal_id, user["user_id"], data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Goal not found or access denied")
    return updated


@router.delete("/goals/{goal_id}")
def delete_goal_route(goal_id: str, authorization: str | None = Header(default=None)):
    """Student deletes a goal."""
    user = require_student(authorization)
    success = delete_goal(goal_id, user["user_id"])
    if not success:
        raise HTTPException(status_code=404, detail="Goal not found or access denied")
    return {"success": True, "goal_id": goal_id}
