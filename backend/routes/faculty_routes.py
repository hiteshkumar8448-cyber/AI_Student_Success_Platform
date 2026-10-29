"""
AI Student Success Platform
Faculty REST Endpoints
"""

from fastapi import APIRouter, Header, HTTPException
from auth import require_faculty
from services.faculty_service import get_faculty_by_id, get_institutional_summary

router = APIRouter(prefix="/api/faculty", tags=["Faculty"])


@router.get("/me")
def faculty_me(authorization: str | None = Header(default=None)):
    user = require_faculty(authorization)
    faculty = get_faculty_by_id(user["user_id"])
    if not faculty:
        return {
            "faculty_id": user["user_id"],
            "name": "Faculty Administrator",
            "department": "Computer Science"
        }
    return faculty


@router.get("/summary")
def faculty_summary(authorization: str | None = Header(default=None)):
    require_faculty(authorization)
    return get_institutional_summary()
