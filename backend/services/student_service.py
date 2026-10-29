"""
AI Student Success Platform
Student Service
"""

from typing import Any, Dict, List, Optional, Tuple
import json
from database import get_connection, now_iso
from models import row_to_dict, format_student_detail


def get_student_by_id(student_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve formatted student record by ID."""
    sid = str(student_id).strip().upper()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM students WHERE student_id = ?;", (sid,))
        row = cursor.fetchone()
        if not row:
            return None
        return format_student_detail(row_to_dict(row))


def get_all_students(
    search: Optional[str] = None,
    risk: Optional[str] = None,
    department: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    sort_by: str = "student_id",
    sort_order: str = "asc"
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Search, filter, sort and paginate students from the shared database.
    """
    page = int(page) if isinstance(page, (int, str)) and str(page).isdigit() else 1
    page_size = int(page_size) if isinstance(page_size, (int, str)) and str(page_size).isdigit() else 50
    page = max(1, page)
    page_size = max(1, min(500, page_size))
    offset = (page - 1) * page_size

    query = "SELECT * FROM students WHERE 1=1"
    params = []

    if isinstance(search, str) and search.strip():
        s = f"%{search.strip().lower()}%"
        query += " AND (LOWER(student_id) LIKE ? OR LOWER(name) LIKE ? OR LOWER(course) LIKE ?)"
        params.extend([s, s, s])

    if isinstance(risk, str) and risk.strip() and risk.strip().lower() != "all":
        r = risk.strip().lower()
        if "high" in r:
            query += " AND LOWER(risk_level) LIKE '%high%'"
        elif "medium" in r or "attention" in r:
            query += " AND (LOWER(risk_level) LIKE '%medium%' OR LOWER(risk_level) LIKE '%attention%')"
        elif "low" in r or "track" in r:
            query += " AND (LOWER(risk_level) LIKE '%low%' OR LOWER(risk_level) LIKE '%track%')"

    if isinstance(department, str) and department.strip() and department.strip().lower() != "all":
        query += " AND LOWER(course) = ?"
        params.append(department.strip().lower())

    # Count total matching
    count_query = f"SELECT COUNT(*) AS total FROM ({query})"
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(count_query, params)
        total_count = cursor.fetchone()["total"]

        allowed_sorts = {
            "student_id": "student_id",
            "name": "name",
            "cgpa": "cgpa",
            "attendance": "attendance",
            "success_score": "success_score",
            "backlogs": "backlogs",
            "risk_level": "risk_level"
        }
        col = allowed_sorts.get(str(sort_by), "student_id")
        order = "DESC" if str(sort_order).lower() == "desc" else "ASC"
        query += f" ORDER BY {col} {order} LIMIT ? OFFSET ?;"
        params.extend([page_size, offset])

        cursor.execute(query, params)
        students = [format_student_detail(row_to_dict(row)) for row in cursor.fetchall()]

    return students, total_count


def get_student_performance(student_id: str) -> Optional[Dict[str, Any]]:
    """
    Generate semester progression timeline, subject-level breakdowns,
    and performance trend for the student.
    """
    student = get_student_by_id(student_id)
    if not student:
        return None

    cgpa = student["cgpa"]
    prev_cgpa = student["previous_cgpa"]
    semester = student["semester"]
    dept = student["course"]
    coding = student["coding_score"]

    timeline = []
    for sem in range(1, semester + 1):
        if sem == semester:
            gpa = cgpa
        elif sem == semester - 1:
            gpa = prev_cgpa
        else:
            gpa = round(prev_cgpa + ((sem - (semester - 1)) * 0.15), 2)
            gpa = max(4.0, min(9.9, gpa))

        timeline.append({
            "semester": f"Sem {sem}",
            "sem_number": sem,
            "gpa": gpa,
            "attendance": round(min(98.0, max(40.0, student["attendance"] + ((sem % 3) - 1) * 3)), 1),
            "status": "Strong" if gpa >= 8.0 else "Satisfactory" if gpa >= 6.5 else "Needs Attention"
        })

    from analytics import DEPARTMENT_SUBJECTS
    subjects_template = DEPARTMENT_SUBJECTS.get(dept, DEPARTMENT_SUBJECTS.get("Computer Science", []))
    subjects = []

    for i, s in enumerate(subjects_template):
        base_marks = int(coding if "coding" in s["name"].lower() else (cgpa * 9.5))
        offset = (i * 3 - 5)
        score = min(98, max(35, base_marks + offset))
        subjects.append({
            "name": s["name"],
            "code": s["code"],
            "credits": s["credits"],
            "score": score,
            "grade": "A+" if score >= 85 else "A" if score >= 75 else "B" if score >= 65 else "C" if score >= 55 else "D" if score >= 45 else "F",
            "status": "Strong" if score >= 75 else "Satisfactory" if score >= 60 else "Struggling"
        })

    return {
        "student_id": student["student_id"],
        "name": student["name"],
        "course": dept,
        "cgpa": cgpa,
        "attendance": student["attendance"],
        "timeline": timeline,
        "subjects": subjects
    }
