"""
AI Student Success Platform
Domain Data Models & Mapping Helpers
"""

from typing import Any, Dict, List, Optional
import json


def row_to_dict(row) -> Dict[str, Any]:
    """Convert an sqlite3.Row object to a clean Python dictionary."""
    if row is None:
        return {}
    d = dict(row)
    # Parse risk_factors if it is a JSON string
    if "risk_factors" in d and isinstance(d["risk_factors"], str):
        try:
            d["risk_factors"] = json.loads(d["risk_factors"])
        except Exception:
            d["risk_factors"] = [d["risk_factors"]]
    return d


def format_student_detail(row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format a student database record into the rich API response
    consumed by both Student and Faculty dashboards.
    """
    cgpa = float(row.get("cgpa", 7.0))
    prev_cgpa = float(row.get("previous_cgpa", cgpa))
    cgpa_diff = round(cgpa - prev_cgpa, 2)
    attendance = float(row.get("attendance", 75.0))
    backlogs = int(row.get("backlogs", 0))
    assignment = float(row.get("assignment_completion", 80.0))
    lms = float(row.get("lms_activity", 75.0))
    score = float(row.get("success_score", 75.0))
    risk_level = str(row.get("risk_level", "Low Risk"))

    # Determine trend
    if cgpa_diff <= -0.3 or (backlogs >= 2 and attendance < 65.0):
        trend = "Declining"
    elif cgpa_diff >= 0.3:
        trend = "Improving"
    else:
        trend = "Stable"

    # Risk factors
    raw_factors = row.get("risk_factors")
    if isinstance(raw_factors, str):
        try:
            factors = json.loads(raw_factors)
        except Exception:
            factors = [raw_factors] if raw_factors else []
    elif isinstance(raw_factors, list):
        factors = raw_factors
    else:
        factors = []

    # Dynamic explanation paragraph
    if risk_level == "High Risk":
        reasons = []
        if attendance < 75.0:
            reasons.append(f"attendance is {attendance:.1f}% (below 75% threshold)")
        if backlogs > 0:
            reasons.append(f"{backlogs} active academic backlog(s)")
        if cgpa_diff < 0:
            reasons.append(f"CGPA dropped from {prev_cgpa:.2f} to {cgpa:.2f}")
        if assignment < 65.0:
            reasons.append(f"assignment completion is {assignment:.1f}%")
        reason_text = ", ".join(reasons) if reasons else "cumulative assessment metrics"
        ai_explanation = (
            f"High Risk Alert: {row.get('name', 'Student')}'s performance requires immediate faculty intervention. "
            f"Key drivers: {reason_text}. Priority scheduling for academic mentoring is strongly recommended."
        )
    elif risk_level == "Medium Risk":
        ai_explanation = (
            f"Needs Attention: {row.get('name', 'Student')} shows moderate vulnerability in attendance or specific coursework. "
            f"Mentoring follow-up recommended to prevent academic downgrade."
        )
    else:
        ai_explanation = (
            f"On Track: {row.get('name', 'Student')} maintains consistent academic health with CGPA {cgpa:.2f} "
            f"and attendance of {attendance:.1f}%. Continue routine periodic reviews."
        )

    # Recommendations
    recommendations = []
    if attendance < 75.0:
        recommendations.append("Attend mandatory remedial lectures to restore minimum 75% attendance.")
    if backlogs > 0:
        recommendations.append(f"Enroll in faculty review sessions to prepare for {backlogs} backlog examination(s).")
    if assignment < 70.0:
        recommendations.append("Submit pending coursework assignments on the learning portal before semester lock.")
    if float(row.get("coding_score", 70.0)) < 60.0:
        recommendations.append("Participate in weekly coding practice problem sets to improve placement readiness.")
    if not recommendations:
        recommendations.append("Maintain consistent performance and explore advanced certification electives.")

    return {
        "student_id": str(row["student_id"]),
        "name": str(row["name"]),
        "email": str(row.get("email") or f"{row['student_id'].lower()}@university.edu"),
        "course": str(row.get("course", "Computer Science")),
        "department": str(row.get("course", "Computer Science")),
        "semester": int(row.get("semester", 1)),
        "year": max(1, int(row.get("semester", 1)) // 2),
        "cgpa": cgpa,
        "previous_cgpa": prev_cgpa,
        "cgpa_change": cgpa_diff,
        "performance_trend": trend,
        "attendance": attendance,
        "backlogs": backlogs,
        "assignment_completion": assignment,
        "lms_activity": lms,
        "coding_score": float(row.get("coding_score", 70.0)),
        "aptitude_score": float(row.get("aptitude_score", 70.0)),
        "mock_interview_score": float(row.get("mock_interview_score", 70.0)),
        "placement_outcome": str(row.get("placement_outcome", "Not Available")),
        "success_score": score,
        "risk_level": risk_level,
        "risk_factors": factors,
        "ai_explanation": ai_explanation,
        "recommendations": recommendations,
        "academic": {
            "cgpa": cgpa,
            "previous_cgpa": prev_cgpa,
            "backlogs": backlogs,
            "subject_performance": float(row.get("coding_score", 70.0))
        },
        "engagement": {
            "attendance": attendance,
            "assignment_completion": assignment,
            "lms_login_frequency": lms
        }
    }
