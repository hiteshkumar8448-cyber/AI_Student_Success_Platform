"""
AI Student Success Platform
Authentication Endpoints
"""

from fastapi import APIRouter, Header, HTTPException
from auth import (
    verify_student_credentials,
    verify_faculty_credentials,
    create_session_token,
    get_authenticated_user
)
from schemas import (
    StudentLoginRequest,
    FacultyLoginRequest,
    UnifiedLoginRequest
)
from services.student_service import get_student_by_id
from services.faculty_service import get_faculty_by_id

router = APIRouter(prefix="/api", tags=["Authentication"])


@router.post("/student/login")
def student_login(login_data: StudentLoginRequest):
    raw_id = login_data.student_id or getattr(login_data, "studentId", None) or login_data.username or ""
    student_id = raw_id.strip().upper()
    password = (login_data.password or "").strip()

    if not student_id:
        raise HTTPException(status_code=400, detail="Student ID is required")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required")

    if not verify_student_credentials(student_id, password):
        raise HTTPException(status_code=401, detail="Invalid Student ID or password")

    student = get_student_by_id(student_id)
    token = create_session_token("student", student_id)

    return {
        "message": "Student login successful",
        "token": token,
        "access_token": token,
        "role": "student",
        "user_id": student_id,
        "student": {
            "student_id": student_id,
            "name": student.get("name", "Student") if student else "Student",
            "department": student.get("course", "Computer Science") if student else "Computer Science",
            "year": student.get("year", 1) if student else 1
        }
    }


@router.post("/faculty/login")
def faculty_login(login_data: FacultyLoginRequest):
    raw_id = login_data.faculty_id or getattr(login_data, "facultyId", None) or login_data.username or ""
    faculty_id = raw_id.strip().upper()
    password = (login_data.password or "").strip()

    if not faculty_id:
        raise HTTPException(status_code=400, detail="Faculty ID is required")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required")

    if not verify_faculty_credentials(faculty_id, password):
        raise HTTPException(status_code=401, detail="Invalid Faculty ID or password")

    faculty = get_faculty_by_id(faculty_id)
    token = create_session_token("faculty", faculty_id)

    return {
        "message": "Faculty login successful",
        "token": token,
        "access_token": token,
        "role": "faculty",
        "user_id": faculty_id,
        "faculty": {
            "faculty_id": faculty_id,
            "name": faculty.get("name", "Faculty Administrator") if faculty else "Faculty Administrator",
            "department": faculty.get("department", "Computer Science") if faculty else "Computer Science"
        }
    }


@router.post("/login")
@router.post("/auth/login")
def unified_login(login_data: UnifiedLoginRequest):
    role = (login_data.role or "").strip().lower()
    has_faculty_id = bool(login_data.faculty_id or getattr(login_data, "facultyId", None))
    if role == "faculty" or (has_faculty_id and not login_data.student_id):
        return faculty_login(FacultyLoginRequest(
            faculty_id=login_data.faculty_id or getattr(login_data, "facultyId", None) or login_data.username or "",
            password=login_data.password
        ))
    return student_login(StudentLoginRequest(
        student_id=login_data.student_id or getattr(login_data, "studentId", None) or login_data.username or "",
        password=login_data.password
    ))
    return student_login(StudentLoginRequest(
        student_id=login_data.student_id or login_data.username or "",
        password=login_data.password
    ))


@router.get("/auth/me")
def get_current_user_profile(authorization: str | None = Header(default=None)):
    user = get_authenticated_user(authorization)
    role = user["role"]
    uid = user["user_id"]

    if role == "faculty":
        faculty = get_faculty_by_id(uid)
        return {
            "role": "faculty",
            "user_id": uid,
            "profile": faculty or {"faculty_id": uid, "name": "Faculty Administrator"}
        }
    else:
        student = get_student_by_id(uid)
        return {
            "role": "student",
            "user_id": uid,
            "profile": student
        }


@router.post("/logout")
def logout():
    return {"message": "Logged out successfully"}
