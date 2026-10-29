"""
AI Student Success Platform
Faculty & Institution Analytics Service
"""

from typing import Any, Dict, List, Optional
from database import get_connection
from models import row_to_dict


def get_faculty_by_id(faculty_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve faculty profile."""
    fid = str(faculty_id).strip().upper()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT faculty_id, name, email, department, created_at FROM faculty WHERE faculty_id = ?;", (fid,))
        row = cursor.fetchone()
        return row_to_dict(row) if row else None


def get_institutional_summary() -> Dict[str, Any]:
    """
    Compute institution-wide dashboard KPIs from the shared SQLite database.
    """
    with get_connection() as conn:
        cursor = conn.cursor()

        # Basic counts
        cursor.execute("SELECT COUNT(*) AS total FROM students;")
        total_students = cursor.fetchone()["total"]

        if total_students == 0:
            return {
                "total_students": 0,
                "high_risk_students": 0,
                "medium_risk_students": 0,
                "low_risk_students": 0,
                "average_cgpa": 0.0,
                "average_attendance": 0.0,
                "average_success_score": 0.0,
                "active_interventions": 0
            }

        cursor.execute("""
            SELECT
                AVG(cgpa) AS avg_cgpa,
                AVG(attendance) AS avg_att,
                AVG(success_score) AS avg_score,
                SUM(CASE WHEN LOWER(risk_level) LIKE '%high%' THEN 1 ELSE 0 END) AS high_risk,
                SUM(CASE WHEN LOWER(risk_level) LIKE '%medium%' OR LOWER(risk_level) LIKE '%attention%' THEN 1 ELSE 0 END) AS med_risk,
                SUM(CASE WHEN LOWER(risk_level) LIKE '%low%' OR LOWER(risk_level) LIKE '%track%' THEN 1 ELSE 0 END) AS low_risk,
                SUM(CASE WHEN attendance < 75.0 THEN 1 ELSE 0 END) AS low_att,
                SUM(CASE WHEN backlogs > 0 THEN 1 ELSE 0 END) AS with_backlogs
            FROM students;
        """)
        row = cursor.fetchone()

        avg_cgpa = round(float(row["avg_cgpa"] or 0), 2)
        avg_att = round(float(row["avg_att"] or 0), 1)
        avg_score = round(float(row["avg_score"] or 0), 1)
        high_risk = int(row["high_risk"] or 0)
        med_risk = int(row["med_risk"] or 0)
        low_risk = int(row["low_risk"] or 0)
        low_att = int(row["low_att"] or 0)
        with_backlogs = int(row["with_backlogs"] or 0)

        # Active interventions
        cursor.execute("""
            SELECT COUNT(*) AS active_count
            FROM interventions
            WHERE LOWER(status) NOT IN ('completed', 'resolved', 'closed');
        """)
        active_interventions = cursor.fetchone()["active_count"]

        # Interventions completed
        cursor.execute("""
            SELECT COUNT(*) AS comp_count
            FROM interventions
            WHERE LOWER(status) IN ('completed', 'resolved', 'closed');
        """)
        completed_interventions = cursor.fetchone()["comp_count"]

        # Department distribution
        cursor.execute("""
            SELECT course, COUNT(*) AS count, AVG(cgpa) AS dept_cgpa, AVG(attendance) AS dept_att
            FROM students
            GROUP BY course;
        """)
        departments = [row_to_dict(r) for r in cursor.fetchall()]

        return {
            "total_students": total_students,
            "totalStudents": total_students,
            "high_risk_students": high_risk,
            "medium_risk_students": med_risk,
            "low_risk_students": low_risk,
            "highRisk": high_risk,
            "mediumRisk": med_risk,
            "lowRisk": low_risk,
            "on_track": low_risk,
            "needs_attention": med_risk,
            "immediate_support": high_risk,
            "average_cgpa": avg_cgpa,
            "avg_cgpa": avg_cgpa,
            "cgpa": avg_cgpa,
            "average_attendance": avg_att,
            "avg_attendance": avg_att,
            "attendance": avg_att,
            "average_success_score": avg_score,
            "active_interventions": active_interventions,
            "pending_interventions": active_interventions,
            "completed_interventions": completed_interventions,
            "low_attendance_students": low_att,
            "backlog_students": with_backlogs,
            "high_risk_percentage": round((high_risk / total_students) * 100, 1),
            "medium_risk_percentage": round((med_risk / total_students) * 100, 1),
            "low_risk_percentage": round((low_risk / total_students) * 100, 1),
            "risk_distribution": {
                "high": high_risk,
                "medium": med_risk,
                "low": low_risk
            },
            "departments": departments,
            "department_enrollment": departments
        }
