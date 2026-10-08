import pandas as pd
import numpy as np
from pathlib import Path


# ============================================================
# PROJECT PATHS
# ============================================================

# Project root:
# AI_Student_Success_Platform/
#
# This file is inside:
# AI_Student_Success_Platform/backend/
#
# Therefore, parent.parent gives us the project root.
BASE_DIR = Path(__file__).resolve().parent.parent

DATA_PATH = BASE_DIR / "data" / "students.csv"


# ============================================================
# LOAD STUDENT DATA
# ============================================================

def load_data():
    """
    Load the student dataset from the project's data folder.
    """

    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Student dataset not found at: {DATA_PATH}"
        )

    return pd.read_csv(DATA_PATH)


# ============================================================
# STUDENT SUCCESS SCORE
# ============================================================

def calculate_success_score(row):
    """
    Calculate the Student Success Score using:

    Academic
    Attendance
    LMS activity
    Engagement
    Placement readiness
    Skills
    Feedback
    """

    # --------------------------------------------------------
    # Academic performance
    # --------------------------------------------------------

    academic = (
        row["cgpa"] / 10 * 100 * 0.25
        + row["subject_performance"] * 0.10
        + max(0, 100 - row["backlogs"] * 15) * 0.05
    )

    # --------------------------------------------------------
    # Attendance
    # --------------------------------------------------------

    attendance = row["attendance"] * 0.10

    # --------------------------------------------------------
    # LMS activity
    # --------------------------------------------------------

    lms = (
        row["lms_login_frequency"] * 0.05
        + row["assignment_completion"] * 0.10
    )

    # --------------------------------------------------------
    # Engagement
    # --------------------------------------------------------

    engagement = (
        min(row["events_participated"] * 10, 100) * 0.025
        + min(row["clubs_participated"] * 20, 100) * 0.025
        + min(row["hackathons"] * 25, 100) * 0.025
        + min(row["certifications"] * 20, 100) * 0.025
    )

    # --------------------------------------------------------
    # Placement readiness
    # --------------------------------------------------------

    placement = (
        row["aptitude_score"] * 0.05
        + row["coding_score"] * 0.05
        + row["mock_interview_score"] * 0.05
    )

    # --------------------------------------------------------
    # Skills
    # --------------------------------------------------------

    skills = (
        row["technical_skill"] * 0.025
        + row["soft_skill"] * 0.025
    )

    # --------------------------------------------------------
    # Feedback
    # --------------------------------------------------------

    feedback = (
        row["student_satisfaction"] * 0.025
        + row["faculty_feedback"] * 0.025
    )

    # --------------------------------------------------------
    # Final score
    # --------------------------------------------------------

    score = (
        academic
        + attendance
        + lms
        + engagement
        + placement
        + skills
        + feedback
    )

    return round(
        float(np.clip(score, 0, 100)),
        1
    )


# ============================================================
# RISK IDENTIFICATION
# ============================================================

def calculate_risk(score, row):
    """
    Identify the student's risk level and explain the reasons.
    """

    reasons = []

    # Academic risk
    if row["cgpa"] < 6:
        reasons.append("Low CGPA")

    # Attendance risk
    if row["attendance"] < 60:
        reasons.append("Low attendance")

    # LMS / assignment risk
    if row["assignment_completion"] < 55:
        reasons.append("Low assignment completion")

    # Placement readiness risks
    if row["coding_score"] < 50:
        reasons.append("Low coding readiness")

    if row["aptitude_score"] < 50:
        reasons.append("Low aptitude readiness")

    if row["mock_interview_score"] < 50:
        reasons.append("Low interview readiness")

    # Academic backlog risk
    if row["backlogs"] >= 2:
        reasons.append("Multiple academic backlogs")

    # --------------------------------------------------------
    # Determine risk level from Success Score
    # --------------------------------------------------------

    if score >= 75:
        level = "On Track"

    elif score >= 55:
        level = "Needs Attention"

    else:
        level = "Immediate Support"

    # If several risk factors exist,
    # don't classify the student as completely safe.
    if len(reasons) >= 3 and level == "On Track":
        level = "Needs Attention"

    return level, reasons


# ============================================================
# PREPARE COMPLETE ANALYTICS DATA
# ============================================================

def prepare_data():
    """
    Load the student data and calculate:

    - Success Score
    - Risk Level
    - Risk Reasons
    - Student Segment
    """

    df = load_data()

    # --------------------------------------------------------
    # Calculate Success Score
    # --------------------------------------------------------

    df["success_score"] = df.apply(
        calculate_success_score,
        axis=1
    )

    # --------------------------------------------------------
    # Calculate Risk
    # --------------------------------------------------------

    risk_results = df.apply(
        lambda row: calculate_risk(
            row["success_score"],
            row
        ),
        axis=1
    )

    df["risk_level"] = risk_results.apply(
        lambda result: result[0]
    )

    df["risk_reasons"] = risk_results.apply(
        lambda result: " | ".join(result[1])
    )

    # --------------------------------------------------------
    # Student Segmentation
    # --------------------------------------------------------

    def segment(row):

        # Strong academic + strong coding
        if (
            row["cgpa"] >= 8
            and row["coding_score"] >= 70
        ):
            return "High Performer"

        # Strong academic but weak placement readiness
        if (
            row["cgpa"] >= 7
            and row["coding_score"] < 55
        ):
            return "Academic Strong / Placement Risk"

        # Academic + attendance risk
        if (
            row["cgpa"] < 6
            and row["attendance"] < 60
        ):
            return "Academic Risk"

        # Strong attendance + assignment activity
        if (
            row["attendance"] >= 80
            and row["assignment_completion"] >= 80
        ):
            return "Highly Engaged"

        # Everything else
        return "Developing"

    df["segment"] = df.apply(
        segment,
        axis=1
    )

    return df


# ============================================================
# DASHBOARD SUMMARY
# ============================================================

def get_summary(df):
    """
    Generate the main dashboard statistics.
    """

    return {
        "total_students": int(
            len(df)
        ),

        "average_success_score": round(
            float(
                df["success_score"].mean()
            ),
            1
        ),

        "on_track": int(
            (
                df["risk_level"] == "On Track"
            ).sum()
        ),

        "needs_attention": int(
            (
                df["risk_level"] == "Needs Attention"
            ).sum()
        ),

        "immediate_support": int(
            (
                df["risk_level"] == "Immediate Support"
            ).sum()
        ),

        "average_attendance": round(
            float(
                df["attendance"].mean()
            ),
            1
        ),

        "average_cgpa": round(
            float(
                df["cgpa"].mean()
            ),
            2
        ),

        "placement_ready": int(
            (
                df["placement_outcome"] == "Ready"
            ).sum()
        )
    }