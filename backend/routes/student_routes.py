"""
AI Student Success Platform
Student REST Endpoints
"""

from fastapi import APIRouter, Header, HTTPException, Query
from typing import Optional
from auth import (
    require_faculty,
    require_student,
    require_same_student_or_faculty
)
from services.student_service import (
    get_student_by_id,
    get_all_students,
    get_student_performance
)
from services.intervention_service import get_interventions_for_student
from services.goal_service import get_goals_for_student
from services.note_service import get_notes_for_student

router = APIRouter(prefix="/api", tags=["Students"])


@router.get("/students")
def list_students(
    search: Optional[str] = Query(default=None),
    risk: Optional[str] = Query(default=None),
    department: Optional[str] = Query(default=None),
    filter_type: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=500),
    sort_by: str = Query(default="student_id"),
    sort_order: str = Query(default="asc"),
    authorization: str | None = Header(default=None)
):
    """
    Search and filter students from the database.
    Faculty only endpoint.
    """
    require_faculty(authorization)

    # Normalize when invoked directly as python function
    s_search = search if isinstance(search, str) else None
    s_risk = risk if isinstance(risk, str) else None
    s_dept = department if isinstance(department, str) else None
    s_filter = filter_type if isinstance(filter_type, str) else None
    s_page = page if isinstance(page, int) else 1
    s_size = page_size if isinstance(page_size, int) else 50
    s_sort = sort_by if isinstance(sort_by, str) else "student_id"
    s_order = sort_order if isinstance(sort_order, str) else "asc"

    if s_filter and not s_risk:
        s_risk = s_filter

    students_list, total_count = get_all_students(
        search=s_search,
        risk=s_risk,
        department=s_dept,
        page=s_page,
        page_size=s_size,
        sort_by=s_sort,
        sort_order=s_order
    )

    return students_list


@router.get("/student/me")
def get_logged_in_student(authorization: str | None = Header(default=None)):
    """Retrieve personal dashboard for the logged-in student."""
    user = require_student(authorization)
    student = get_student_by_id(user["user_id"])
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")

    student["interventions"] = get_interventions_for_student(user["user_id"])
    student["goals"] = get_goals_for_student(user["user_id"])
    student["notes"] = get_notes_for_student(user["user_id"])
    return student


@router.get("/students/{student_id}")
@router.get("/student/{student_id}")
def get_student_detail(student_id: str, authorization: str | None = Header(default=None)):
    """
    Retrieve full student detail.
    Enforces student isolation: students can only access their own profile.
    """
    if authorization:
        require_same_student_or_faculty(authorization, student_id)

    student = get_student_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail=f"Student {student_id} not found")

    student["interventions"] = get_interventions_for_student(student_id)
    student["goals"] = get_goals_for_student(student_id)
    student["notes"] = get_notes_for_student(student_id)
    return student


@router.get("/students/{student_id}/performance")
@router.get("/student/{student_id}/performance")
def get_student_performance_data(student_id: str, authorization: str | None = Header(default=None)):
    """Retrieve progression timeline and subject performance breakdown."""
    if authorization:
        require_same_student_or_faculty(authorization, student_id)

    perf = get_student_performance(student_id)
    if not perf:
        raise HTTPException(status_code=404, detail=f"Performance data not found for {student_id}")
    return perf


@router.get("/students/{student_id}/report")
@router.get("/student/{student_id}/report")
def get_student_report(student_id: str, authorization: str | None = Header(default=None)):
    """Generate printable comprehensive performance report."""
    if authorization:
        require_same_student_or_faculty(authorization, student_id)

    student = get_student_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    interventions = get_interventions_for_student(student_id)
    notes = get_notes_for_student(student_id)
    perf = get_student_performance(student_id)
    goals = get_goals_for_student(student_id)

    return {
        "student": student,
        "performance": perf,
        "interventions": interventions,
        "notes": notes,
        "goals": goals,
        "generated_at": student.get("updated_at")
    }
