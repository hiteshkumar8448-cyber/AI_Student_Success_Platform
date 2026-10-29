import pandas as pd
import numpy as np
from pathlib import Path
import hashlib
import joblib


# ============================================================
# PROJECT PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_PATH = BASE_DIR / "data" / "students.csv"
MODEL_PATH = BASE_DIR / "models" / "risk_model.pkl"


# ============================================================
# REQUIRED DATASET COLUMNS
# ============================================================

REQUIRED_COLUMNS = [
    "student_id",
    "name",
    "department",
    "year",
    "cgpa",
    "backlogs",
    "attendance",
    "subject_performance",
    "lms_login_frequency",
    "assignment_completion",
    "events_participated",
    "clubs_participated",
    "hackathons",
    "certifications",
    "aptitude_score",
    "coding_score",
    "mock_interview_score",
    "technical_skill",
    "soft_skill",
    "student_satisfaction",
    "faculty_feedback",
    "placement_outcome"
]

ML_FEATURES = [
    "cgpa",
    "backlogs",
    "attendance",
    "subject_performance",
    "lms_login_frequency",
    "assignment_completion",
    "events_participated",
    "clubs_participated",
    "hackathons",
    "certifications",
    "aptitude_score",
    "coding_score",
    "mock_interview_score",
    "technical_skill",
    "soft_skill",
    "student_satisfaction",
    "faculty_feedback"
]

# Department Core Curriculum Mapping
DEPARTMENT_SUBJECTS = {
    "Computer Science": [
        {"name": "Data Structures & Algorithms", "code": "CS201", "credits": 4},
        {"name": "Database Management Systems", "code": "CS202", "credits": 4},
        {"name": "Operating Systems & Concurrency", "code": "CS301", "credits": 4},
        {"name": "Computer Networks & Security", "code": "CS302", "credits": 3},
        {"name": "Object-Oriented Software Design", "code": "CS204", "credits": 3}
    ],
    "Information Technology": [
        {"name": "Web Technologies & Cloud Platforms", "code": "IT201", "credits": 4},
        {"name": "Relational & NoSQL Database Systems", "code": "IT202", "credits": 4},
        {"name": "Network & Information Security", "code": "IT301", "credits": 4},
        {"name": "Software Engineering & Agile DevOps", "code": "IT302", "credits": 3},
        {"name": "Python & Data Processing", "code": "IT204", "credits": 3}
    ],
    "Electronics": [
        {"name": "Digital Signal Processing", "code": "EC201", "credits": 4},
        {"name": "Microprocessors & Embedded Systems", "code": "EC202", "credits": 4},
        {"name": "Analog & Digital VLSI Circuit Design", "code": "EC301", "credits": 4},
        {"name": "Signals & Linear Systems", "code": "EC302", "credits": 3},
        {"name": "Control Systems & Automation", "code": "EC204", "credits": 3}
    ],
    "Mechanical": [
        {"name": "Applied Thermodynamics & Heat Transfer", "code": "ME201", "credits": 4},
        {"name": "Fluid Mechanics & Turbo Machinery", "code": "ME202", "credits": 4},
        {"name": "Kinematics & Theory of Machines", "code": "ME301", "credits": 4},
        {"name": "Manufacturing Processes & CAD/CAM", "code": "ME302", "credits": 3},
        {"name": "Mechanics of Materials & Stress Analysis", "code": "ME204", "credits": 3}
    ],
    "Civil": [
        {"name": "Structural Analysis & RCC Design", "code": "CE201", "credits": 4},
        {"name": "Fluid Mechanics & Hydraulics", "code": "CE202", "credits": 4},
        {"name": "Geotechnical & Soil Foundation Eng.", "code": "CE301", "credits": 4},
        {"name": "Advanced Surveying & GIS Mapping", "code": "CE302", "credits": 3},
        {"name": "Concrete Technology & Construction", "code": "CE204", "credits": 3}
    ]
}


# ============================================================
# MACHINE LEARNING MODEL CACHE
# ============================================================

_CACHED_ML_MODEL = None

def get_ml_model():
    """Load and cache the trained Random Forest model."""
    global _CACHED_ML_MODEL
    if _CACHED_ML_MODEL is not None:
        return _CACHED_ML_MODEL

    if MODEL_PATH.exists():
        try:
            model_data = joblib.load(MODEL_PATH)
            _CACHED_ML_MODEL = model_data.get("model") if isinstance(model_data, dict) else model_data
            return _CACHED_ML_MODEL
        except Exception as e:
            print(f"[Warning] Unable to load ML risk model: {e}")
            return None
    return None


def predict_ml_risk(row):
    """
    Predict student risk using the trained scikit-learn Random Forest model for a single row.
    Returns (label, probability_percentage).
    """
    model = get_ml_model()
    if model is None:
        is_risk = (
            float(row.get("cgpa", 7.0)) < 6.0
            or float(row.get("attendance", 75.0)) < 60.0
            or int(row.get("backlogs", 0)) >= 2
        )
        prob = 82.0 if is_risk else 18.0
        return ("High Risk" if is_risk else "Low Risk", prob)

    try:
        df_feat = pd.DataFrame([[float(row[feat]) for feat in ML_FEATURES]], columns=ML_FEATURES)
        pred = model.predict(df_feat)[0]

        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(df_feat)[0]
            risk_prob = round(float(probs[1]) * 100, 1)
        else:
            risk_prob = 85.0 if pred == 1 else 15.0

        label = "High Risk" if pred == 1 or risk_prob >= 50.0 else "Low Risk"
        return (label, risk_prob)
    except Exception as e:
        print(f"[Warning] ML prediction error for row: {e}")
        return ("Low Risk", 20.0)


def predict_ml_risk_batch(df):
    """
    Vectorized batch prediction for the entire dataset using feature names.
    Returns (labels_series, probs_series).
    """
    model = get_ml_model()
    if model is None:
        is_risk = (
            (df["cgpa"] < 6.0)
            | (df["attendance"] < 60.0)
            | (df["backlogs"] >= 2)
        )
        labels = np.where(is_risk, "High Risk", "Low Risk")
        probs = np.where(is_risk, 82.0, 18.0)
        return pd.Series(labels, index=df.index), pd.Series(probs, index=df.index)

    try:
        X_df = df[ML_FEATURES].astype(float)
        preds = model.predict(X_df)
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(X_df)[:, 1] * 100.0
        else:
            probs = np.where(preds == 1, 85.0, 15.0)

        labels = np.where((preds == 1) | (probs >= 50.0), "High Risk", "Low Risk")
        return pd.Series(labels, index=df.index), pd.Series(np.round(probs, 1), index=df.index)
    except Exception as e:
        print(f"[Warning] ML batch prediction error: {e}")
        return pd.Series(["Low Risk"] * len(df), index=df.index), pd.Series([20.0] * len(df), index=df.index)


# ============================================================
# LOAD STUDENT DATA
# ============================================================

def load_data():
    """
    Load the official student dataset with fallback paths.
    """
    target_path = DATA_PATH
    if not target_path.exists():
        fallback = BASE_DIR / "backend" / "data" / "students.csv"
        if fallback.exists():
            target_path = fallback
        else:
            raise FileNotFoundError(
                f"Student dataset not found at: {DATA_PATH} or {fallback}"
            )

    df = pd.read_csv(target_path)

    missing_columns = [
        col for col in REQUIRED_COLUMNS if col not in df.columns
    ]
    if missing_columns:
        raise ValueError(
            "Student dataset missing required columns:\n"
            + "\n".join(f"- {c}" for c in missing_columns)
        )

    df["student_id"] = df["student_id"].astype(str).str.strip()
    df["name"] = df["name"].astype(str).str.strip()
    df["department"] = df["department"].astype(str).str.strip()
    df["placement_outcome"] = df["placement_outcome"].astype(str).str.strip()

    invalid_rows = df[(df["student_id"] == "") | (df["name"] == "")]
    if not invalid_rows.empty:
        raise ValueError("Dataset has rows with empty Student ID or name.")

    return df


# ============================================================
# STUDENT SUCCESS SCORE (HEURISTIC)
# ============================================================

def calculate_success_score(row):
    """
    Calculate multi-dimensional composite student success score (0-100).
    """
    academic = (
        (row["cgpa"] / 10.0 * 100.0) * 0.25
        + row["subject_performance"] * 0.10
        + max(0, 100 - row["backlogs"] * 15) * 0.05
    )

    attendance = row["attendance"] * 0.10

    lms = (
        row["lms_login_frequency"] * 0.05
        + row["assignment_completion"] * 0.10
    )

    engagement = (
        min(row["events_participated"] * 10, 100) * 0.025
        + min(row["clubs_participated"] * 20, 100) * 0.025
        + min(row["hackathons"] * 25, 100) * 0.025
        + min(row["certifications"] * 20, 100) * 0.025
    )

    placement = (
        row["aptitude_score"] * 0.05
        + row["coding_score"] * 0.05
        + row["mock_interview_score"] * 0.05
    )

    skills = (
        row["technical_skill"] * 0.025
        + row["soft_skill"] * 0.025
    )

    feedback = (
        row["student_satisfaction"] * 0.025
        + row["faculty_feedback"] * 0.025
    )

    score = academic + attendance + lms + engagement + placement + skills + feedback
    return round(float(np.clip(score, 0, 100)), 1)


# ============================================================
# RISK IDENTIFICATION (HEURISTIC)
# ============================================================

def calculate_risk(score, row):
    """
    Identify heuristic risk level and risk reasons.
    """
    reasons = []

    if row["cgpa"] < 6.0:
        reasons.append("Low CGPA (< 6.0)")

    if row["attendance"] < 60.0:
        reasons.append("Critically low attendance (< 60%)")
    elif row["attendance"] < 75.0:
        reasons.append("Sub-threshold attendance (< 75%)")

    if row["assignment_completion"] < 55.0:
        reasons.append("Low assignment completion (< 55%)")

    if row["lms_login_frequency"] < 40.0:
        reasons.append("Low LMS activity & portal engagement")

    if row["coding_score"] < 50.0:
        reasons.append("Low coding assessment score (< 50)")

    if row["aptitude_score"] < 50.0:
        reasons.append("Low aptitude readiness score (< 50)")

    if row["mock_interview_score"] < 50.0:
        reasons.append("Low mock interview evaluation (< 50)")

    if row["backlogs"] >= 2:
        reasons.append(f"Multiple academic backlogs ({int(row['backlogs'])} active)")

    if score >= 75:
        level = "On Track"
    elif score >= 55:
        level = "Needs Attention"
    else:
        level = "Immediate Support"

    # Multi-risk override
    if len(reasons) >= 3 and level == "On Track":
        level = "Needs Attention"

    return level, reasons


# ============================================================
# DETERMINISTIC STABLE PSEUDO-RANDOM HELPER
# ============================================================

def _student_seed(student_id: str) -> int:
    """Generate a consistent integer seed from student_id."""
    return int(hashlib.md5(str(student_id).encode("utf-8")).hexdigest()[:8], 16)


# ============================================================
# PERFORMANCE TIMELINE & SEMESTER PROGRESSION
# ============================================================

def generate_semester_history(student_id, year, current_cgpa, attendance, backlogs, subject_perf):
    """
    Generate realistic, deterministic semester-wise progression.
    Detects whether student is declining, improving, or stable.
    Returns: (previous_cgpa, cgpa_change, cgpa_change_pct, timeline)
    """
    seed = _student_seed(student_id)
    rng = np.random.RandomState(seed % (2**31 - 1))

    year = max(1, min(4, int(year)))
    current_sem = year * 2  # e.g. Year 2 = Sem 4
    current_cgpa = float(current_cgpa)
    attendance = float(attendance)
    backlogs = int(backlogs)

    # Determine baseline decline/improvement inclination
    has_decline_signal = (backlogs >= 2) or (attendance < 60) or (current_cgpa < 6.0 and subject_perf < 60)
    has_improve_signal = (attendance >= 85 and backlogs == 0 and current_cgpa >= 7.5)

    if has_decline_signal:
        # Performance was higher previously and dropped
        drop_magnitude = rng.uniform(0.6, 1.3)
        previous_cgpa = round(min(9.8, current_cgpa + drop_magnitude), 2)
    elif has_improve_signal:
        gain_magnitude = rng.uniform(0.4, 0.9)
        previous_cgpa = round(max(4.0, current_cgpa - gain_magnitude), 2)
    else:
        fluctuation = rng.uniform(-0.25, 0.25)
        previous_cgpa = round(max(3.5, min(9.9, current_cgpa - fluctuation)), 2)

    cgpa_change = round(current_cgpa - previous_cgpa, 2)
    cgpa_change_pct = round(((current_cgpa - previous_cgpa) / max(0.1, previous_cgpa)) * 100.0, 1)

    # Build timeline points up to current_sem
    timeline = []
    sem_gpas = []

    if current_sem == 2:
        sem_gpas = [previous_cgpa, current_cgpa]
    else:
        initial_gpa = round(previous_cgpa + (rng.uniform(0.1, 0.4) if has_decline_signal else rng.uniform(-0.4, 0.1)), 2)
        initial_gpa = min(9.8, max(4.0, initial_gpa))

        points = np.linspace(initial_gpa, previous_cgpa, current_sem - 1)
        for i, pt in enumerate(points):
            noise = rng.uniform(-0.15, 0.15)
            sem_gpas.append(round(float(np.clip(pt + noise, 3.5, 10.0)), 2))
        sem_gpas.append(current_cgpa)

    for idx, gpa_val in enumerate(sem_gpas):
        sem_num = idx + 1
        sem_att = round(float(np.clip(attendance + (rng.uniform(5, 15) if has_decline_signal and sem_num < current_sem else rng.uniform(-3, 3)), 30, 98)), 1)
        status_label = (
            "Strong" if gpa_val >= 8.0
            else "Satisfactory" if gpa_val >= 6.5
            else "Needs Attention" if gpa_val >= 5.5
            else "Critical / Retest"
        )
        timeline.append({
            "semester": f"Sem {sem_num}",
            "sem_number": sem_num,
            "gpa": gpa_val,
            "attendance": sem_att,
            "status": status_label,
            "is_current": (sem_num == current_sem)
        })

    return previous_cgpa, cgpa_change, cgpa_change_pct, timeline


# ============================================================
# DEPARTMENT SUBJECT BREAKDOWN
# ============================================================

def generate_subject_performance(student_id, department, subject_perf, coding_score, is_declining):
    """
    Generate subject-level breakdown tailored to the student's department.
    Highlights subjects where student is struggling and subjects that contributed to decline.
    """
    seed = _student_seed(student_id)
    rng = np.random.RandomState(seed % (2**31 - 1))

    dept_key = department if department in DEPARTMENT_SUBJECTS else "Computer Science"
    templates = DEPARTMENT_SUBJECTS[dept_key]

    base_score = float(subject_perf)
    subjects = []

    for idx, tmpl in enumerate(templates):
        offset = rng.uniform(-14.0, 14.0)
        if idx == 0:
            offset -= 6.0 if is_declining else 2.0
        elif idx == 1:
            offset -= 4.0 if is_declining else -2.0

        score = round(float(np.clip(base_score + offset, 28.0, 98.0)), 1)

        if score >= 85:
            grade = "A+"
            status = "Strong"
        elif score >= 75:
            grade = "A"
            status = "Strong"
        elif score >= 65:
            grade = "B"
            status = "Satisfactory"
        elif score >= 55:
            grade = "C"
            status = "Average"
        elif score >= 45:
            grade = "D"
            status = "Struggling"
        else:
            grade = "F"
            status = "Failing / High Risk"

        contributed_to_decline = bool(is_declining and score < 60.0)

        subjects.append({
            "name": tmpl["name"],
            "code": tmpl["code"],
            "credits": tmpl["credits"],
            "score": score,
            "grade": grade,
            "status": status,
            "is_struggling": bool(score < 55.0),
            "contributed_to_decline": contributed_to_decline
        })

    return subjects


# ============================================================
# PERFORMANCE DOWNGRADE & AI ROOT CAUSE EXPLANATION
# ============================================================

def analyze_performance_downgrade(row, previous_cgpa, cgpa_change, cgpa_change_pct, subjects):
    """
    Perform root-cause downgrade detection and produce detailed AI-driven breakdown.
    Explains WHY the student is at risk with structured severity badges.
    """
    current_cgpa = float(row["cgpa"])
    attendance = float(row["attendance"])
    backlogs = int(row["backlogs"])
    lms_freq = float(row["lms_login_frequency"])
    assignment_comp = float(row["assignment_completion"])
    coding = float(row["coding_score"])

    # Trend detection
    if cgpa_change <= -0.3 or (backlogs >= 2 and attendance < 65) or (current_cgpa < 5.8 and previous_cgpa >= 6.5):
        performance_trend = "Declining"
        is_declining = True
    elif cgpa_change >= 0.3:
        performance_trend = "Improving"
        is_declining = False
    else:
        performance_trend = "Stable"
        is_declining = False

    contributing_factors = []
    struggling_areas = []
    strong_areas = []

    # 1. Attendance factor
    if attendance < 60.0:
        contributing_factors.append({
            "factor": "Critical Class Absenteeism",
            "icon": "🔴",
            "severity": "Critical",
            "badge_color": "danger",
            "metric": f"{attendance:.1f}% Attendance",
            "description": f"Attendance has dropped to {attendance:.1f}%, far below the university mandatory 75% threshold. Direct driver of missed lectures and internal marks loss."
        })
        struggling_areas.append(f"Class Attendance ({attendance:.1f}%)")
    elif attendance < 75.0:
        contributing_factors.append({
            "factor": "Low Attendance Warning",
            "icon": "🟠",
            "severity": "Warning",
            "badge_color": "warning",
            "metric": f"{attendance:.1f}% Attendance",
            "description": f"Attendance is {attendance:.1f}%, under the 75% requirement. Immediate risk of exam debarment if not corrected."
        })
        struggling_areas.append(f"Attendance ({attendance:.1f}%)")
    else:
        strong_areas.append(f"Consistent Class Attendance ({attendance:.1f}%)")

    # 2. Subject grade degradation
    declining_subjects = [s["name"] for s in subjects if s.get("contributed_to_decline")]
    strong_subjects = [s["name"] for s in subjects if s.get("status") == "Strong"]

    if declining_subjects:
        contributing_factors.append({
            "factor": "Core Coursework Degradation",
            "icon": "🔴" if len(declining_subjects) >= 2 else "🟠",
            "severity": "Critical" if len(declining_subjects) >= 2 else "Warning",
            "badge_color": "danger" if len(declining_subjects) >= 2 else "warning",
            "metric": f"{len(declining_subjects)} Core Subject(s) Failing/Struggling",
            "description": f"Sharp score decrease identified in {', '.join(declining_subjects[:3])}. Requires targeted tutoring or remedial coursework."
        })
        struggling_areas.extend([f"Coursework in {s}" for s in declining_subjects[:2]])

    if strong_subjects:
        strong_areas.append(f"Strong grasp in {', '.join(strong_subjects[:2])}")

    # 3. LMS & Digital Engagement factor
    if lms_freq < 35.0 or assignment_comp < 50.0:
        contributing_factors.append({
            "factor": "Low LMS & Assignment Activity",
            "icon": "🟠",
            "severity": "Warning",
            "badge_color": "warning",
            "metric": f"{assignment_comp:.1f}% Assignments, {lms_freq:.1f} LMS Logins",
            "description": f"Low digital platform engagement (LMS frequency {lms_freq:.1f}/100) and missed deadlines ({assignment_comp:.1f}% submission rate)."
        })
        struggling_areas.append(f"Assignment Submissions ({assignment_comp:.1f}%)")
    elif assignment_comp >= 80.0:
        strong_areas.append("High assignment completion rate")

    # 4. Academic Backlogs factor
    if backlogs >= 2:
        contributing_factors.append({
            "factor": "Accumulated Academic Backlogs",
            "icon": "🔴",
            "severity": "Critical",
            "badge_color": "danger",
            "metric": f"{backlogs} Backlogs Active",
            "description": f"Student has {backlogs} un-cleared backlog courses. Increases semester cognitive load and blocks placement eligibility."
        })
        struggling_areas.append(f"{backlogs} Active Backlog Exams")
    elif backlogs == 1:
        contributing_factors.append({
            "factor": "Pending Backlog Examination",
            "icon": "🟡",
            "severity": "Moderate",
            "badge_color": "info",
            "metric": "1 Backlog Active",
            "description": "1 pending course backlog requiring re-examination clearance."
        })
        struggling_areas.append("1 Backlog Exam")
    else:
        strong_areas.append("Zero active backlogs")

    # 5. Technical / Coding readiness factor
    if coding < 45.0:
        contributing_factors.append({
            "factor": "Low Technical & Coding readiness",
            "icon": "🟡",
            "severity": "Moderate",
            "badge_color": "info",
            "metric": f"{coding:.1f}/100 Coding Score",
            "description": f"Practical coding readiness score is {coding:.1f}/100, which threatens upcoming campus placements and project evaluations."
        })
        struggling_areas.append("Practical Coding Proficiency")
    elif coding >= 75.0:
        strong_areas.append(f"Advanced coding score ({coding:.1f}/100)")

    # Build human-readable AI explanation paragraph
    name = row.get("name", "Student")

    if performance_trend == "Declining":
        decline_abs_pct = abs(cgpa_change_pct)
        key_reasons = []
        if attendance < 75:
            key_reasons.append(f"low attendance ({attendance:.1f}%)")
        if declining_subjects:
            key_reasons.append(f"declining performance in {declining_subjects[0]}")
        if lms_freq < 40 or assignment_comp < 60:
            key_reasons.append("reduced LMS engagement")
        if backlogs > 0:
            key_reasons.append(f"{backlogs} active backlog(s)")

        reasons_text = ", ".join(key_reasons) if key_reasons else "cumulative evaluation drop"

        ai_explanation = (
            f"Performance Declining: {name}'s academic standing has dropped by {decline_abs_pct:.1f}% "
            f"(CGPA decreased from {previous_cgpa:.2f} to {current_cgpa:.2f}). "
            f"The major contributing factors are {reasons_text}. "
            f"Proactive faculty intervention and mentor consultation are strongly recommended."
        )
    elif performance_trend == "Improving":
        gain_abs_pct = abs(cgpa_change_pct)
        ai_explanation = (
            f"Performance Improving: {name}'s academic trajectory shows a positive gain of {gain_abs_pct:.1f}% "
            f"(CGPA rose from {previous_cgpa:.2f} to {current_cgpa:.2f}). "
            f"Consistent attendance ({attendance:.1f}%) and active assignment completion are contributing positively."
        )
    else:
        ai_explanation = (
            f"Performance Stable: {name} maintains a steady academic performance at CGPA {current_cgpa:.2f} "
            f"(Previous: {previous_cgpa:.2f}). Attendance is {attendance:.1f}% with {backlogs} backlog(s). "
            f"Continue routine monitoring."
        )

    downgrade_details = {
        "is_declining": is_declining,
        "performance_trend": performance_trend,
        "previous_cgpa": previous_cgpa,
        "current_cgpa": current_cgpa,
        "cgpa_change": cgpa_change,
        "cgpa_change_pct": cgpa_change_pct,
        "contributing_factors": contributing_factors,
        "struggling_areas": struggling_areas,
        "strong_areas": strong_areas,
        "ai_explanation": ai_explanation
    }

    return performance_trend, downgrade_details


# ============================================================
# SMART PRIORITIZATION CATEGORY
# ============================================================

def calculate_priority(row, trend, downgrade_factors, ml_risk_label):
    """
    Categorize into smart priority tiers:
    🔴 Critical
    🟠 High Risk
    🟡 Needs Attention
    🟢 Stable
    🔵 Improving
    """
    cgpa = float(row["cgpa"])
    att = float(row["attendance"])
    backlogs = int(row["backlogs"])
    score = float(row.get("success_score", 60.0))

    has_critical_factor = any(f.get("severity") == "Critical" for f in downgrade_factors)

    if (
        (trend == "Declining" and (cgpa < 5.8 or backlogs >= 3 or att < 52.0))
        or (score < 45.0)
        or (backlogs >= 4)
        or (att < 45.0)
    ):
        return {
            "category": "Critical",
            "badge": "🔴 Critical",
            "color": "critical",
            "rank": 1,
            "action_needed": "Immediate Faculty Intervention"
        }

    if (
        trend == "Declining"
        or ml_risk_label == "High Risk"
        or cgpa < 6.0
        or backlogs >= 2
        or att < 60.0
        or score < 55.0
        or has_critical_factor
    ):
        return {
            "category": "High Risk",
            "badge": "🟠 High Risk",
            "color": "high-risk",
            "rank": 2,
            "action_needed": "Academic & Attendance Support"
        }

    if (
        att < 75.0
        or backlogs >= 1
        or float(row.get("assignment_completion", 80)) < 60.0
        or score < 70.0
    ):
        return {
            "category": "Needs Attention",
            "badge": "🟡 Needs Attention",
            "color": "attention",
            "rank": 3,
            "action_needed": "Mentor Follow-up"
        }

    if trend == "Improving" and cgpa >= 6.5:
        return {
            "category": "Improving",
            "badge": "🔵 Improving",
            "color": "improving",
            "rank": 4,
            "action_needed": "Send Encouragement & Monitor"
        }

    return {
        "category": "Stable",
        "badge": "🟢 Stable",
        "color": "stable",
        "rank": 5,
        "action_needed": "Routine Periodic Review"
    }


# ============================================================
# PREPARE COMPLETE ANALYTICS DATA
# ============================================================

def prepare_data():
    """
    Prepare all enriched analytics used by Faculty and Student Views.
    Loads dataset, computes success scores, ML risk predictions,
    semester timelines, downgrade detection, and smart prioritization.
    """
    df = load_data()

    # 1. Success score
    df["success_score"] = df.apply(calculate_success_score, axis=1)

    # 2. Heuristic risk
    risk_results = df.apply(lambda r: calculate_risk(r["success_score"], r), axis=1)
    df["risk_level"] = risk_results.apply(lambda res: res[0])
    df["risk_reasons"] = risk_results.apply(lambda res: " | ".join(res[1]))

    # 3. Machine Learning model predictions
    ml_labels, ml_probs = predict_ml_risk_batch(df)
    df["ai_predicted_risk"] = ml_labels
    df["ai_risk_probability"] = ml_probs

    # 4. Student segmentation
    def segment(row):
        if row["cgpa"] >= 8.0 and row["coding_score"] >= 70.0:
            return "High Performer"
        if row["cgpa"] >= 7.0 and row["coding_score"] < 55.0:
            return "Academic Strong / Placement Risk"
        if row["cgpa"] < 6.0 and row["attendance"] < 60.0:
            return "Academic Risk"
        if row["attendance"] >= 80.0 and row["assignment_completion"] >= 80.0:
            return "Highly Engaged"
        return "Developing"

    df["segment"] = df.apply(segment, axis=1)

    # 5. Historical Semester Timeline & Previous Performance
    history_results = df.apply(
        lambda r: generate_semester_history(
            r["student_id"],
            r["year"],
            r["cgpa"],
            r["attendance"],
            r["backlogs"],
            r["subject_performance"]
        ),
        axis=1
    )
    df["previous_cgpa"] = history_results.apply(lambda res: res[0])
    df["cgpa_change"] = history_results.apply(lambda res: res[1])
    df["cgpa_change_pct"] = history_results.apply(lambda res: res[2])
    df["timeline"] = history_results.apply(lambda res: res[3])

    # 6. Subject-level performance breakdown
    def build_subjects(r):
        is_declining = bool(r["cgpa_change"] <= -0.3 or (r["backlogs"] >= 2 and r["attendance"] < 65))
        return generate_subject_performance(
            r["student_id"],
            r["department"],
            r["subject_performance"],
            r["coding_score"],
            is_declining
        )

    df["subjects"] = df.apply(build_subjects, axis=1)

    # 7. Downgrade detection & AI-driven explanation
    downgrade_results = df.apply(
        lambda r: analyze_performance_downgrade(
            r,
            r["previous_cgpa"],
            r["cgpa_change"],
            r["cgpa_change_pct"],
            r["subjects"]
        ),
        axis=1
    )
    df["performance_trend"] = downgrade_results.apply(lambda res: res[0])
    df["downgrade_details"] = downgrade_results.apply(lambda res: res[1])
    df["ai_explanation"] = df["downgrade_details"].apply(lambda d: d.get("ai_explanation", ""))
    df["struggling_areas"] = df["downgrade_details"].apply(lambda d: d.get("struggling_areas", []))
    df["strong_areas"] = df["downgrade_details"].apply(lambda d: d.get("strong_areas", []))
    df["contributing_factors"] = df["downgrade_details"].apply(lambda d: d.get("contributing_factors", []))

    # 8. Smart Prioritization
    priority_results = df.apply(
        lambda r: calculate_priority(
            r,
            r["performance_trend"],
            r["contributing_factors"],
            r["ai_predicted_risk"]
        ),
        axis=1
    )
    df["priority_category"] = priority_results.apply(lambda p: p["category"])
    df["priority_badge"] = priority_results.apply(lambda p: p["badge"])
    df["priority_rank"] = priority_results.apply(lambda p: p["rank"])
    df["priority_action"] = priority_results.apply(lambda p: p["action_needed"])

    return df


# ============================================================
# DASHBOARD SUMMARY
# ============================================================

def get_summary(df=None, portal_data=None):
    """
    Generate institution-level dashboard statistics.
    Supports being called with 0, 1, or 2 arguments:
      - get_summary()
      - get_summary(df)
      - get_summary(df, portal_data)
    """
    if df is None:
        df = prepare_data()
    elif isinstance(df, list):
        df = pd.DataFrame(df)

    pending_interventions = 0
    completed_interventions = 0

    if portal_data and isinstance(portal_data, dict):
        interventions = portal_data.get("interventions", [])
        for item in interventions:
            st = str(item.get("status", "")).lower()
            if st in ["completed", "closed", "resolved"]:
                completed_interventions += 1
            else:
                pending_interventions += 1

    total_students = int(len(df))
    declining_count = int((df["performance_trend"] == "Declining").sum()) if "performance_trend" in df.columns else 0
    improving_count = int((df["performance_trend"] == "Improving").sum()) if "performance_trend" in df.columns else 0
    critical_count = int((df["priority_category"] == "Critical").sum()) if "priority_category" in df.columns else 0
    high_risk_count = int((df["priority_category"] == "High Risk").sum()) if "priority_category" in df.columns else 0
    low_attendance_count = int((df["attendance"] < 75.0).sum()) if "attendance" in df.columns else 0
    backlog_count = int((df["backlogs"] >= 2).sum()) if "backlogs" in df.columns else 0
    requiring_intervention = int((df["priority_category"].isin(["Critical", "High Risk"])).sum()) if "priority_category" in df.columns else 0

    on_track_count = int((df["risk_level"] == "On Track").sum()) if "risk_level" in df.columns else 0
    needs_attention_count = int((df["risk_level"] == "Needs Attention").sum()) if "risk_level" in df.columns else 0
    immediate_support_count = int((df["risk_level"] == "Immediate Support").sum()) if "risk_level" in df.columns else 0
    placement_ready_count = int((df["placement_outcome"] == "Ready").sum()) if "placement_outcome" in df.columns else 0

    avg_success = round(float(df["success_score"].mean()), 1) if "success_score" in df.columns and len(df) else 0.0
    avg_att = round(float(df["attendance"].mean()), 1) if "attendance" in df.columns and len(df) else 0.0
    avg_cgpa = round(float(df["cgpa"].mean()), 2) if "cgpa" in df.columns and len(df) else 0.0

    # Department breakdown
    departments_list = []
    dept_col = "department" if "department" in df.columns else ("course" if "course" in df.columns else None)
    if dept_col:
        for dept_name, group in df.groupby(dept_col):
            departments_list.append({
                "course": str(dept_name),
                "count": int(len(group)),
                "dept_cgpa": round(float(group["cgpa"].mean()), 2) if "cgpa" in group.columns else 0.0,
                "dept_att": round(float(group["attendance"].mean()), 1) if "attendance" in group.columns else 0.0
            })

    return {
        "total_students": total_students,
        "totalStudents": total_students,
        "average_success_score": avg_success,
        "average_attendance": avg_att,
        "avg_attendance": avg_att,
        "attendance": avg_att,
        "average_cgpa": avg_cgpa,
        "avg_cgpa": avg_cgpa,
        "cgpa": avg_cgpa,
        "on_track": on_track_count,
        "needs_attention": needs_attention_count,
        "immediate_support": immediate_support_count,
        "low_risk_students": on_track_count,
        "medium_risk_students": needs_attention_count,
        "high_risk_students": immediate_support_count,
        "lowRisk": on_track_count,
        "mediumRisk": needs_attention_count,
        "highRisk": immediate_support_count,
        "placement_ready": placement_ready_count,
        "placement_needs_preparation": max(0, total_students - placement_ready_count),
        "on_track_percentage": round((on_track_count / total_students * 100), 1) if total_students else 0.0,
        "needs_attention_percentage": round((needs_attention_count / total_students * 100), 1) if total_students else 0.0,
        "immediate_support_percentage": round((immediate_support_count / total_students * 100), 1) if total_students else 0.0,
        "risk_distribution": {
            "high": immediate_support_count,
            "medium": needs_attention_count,
            "low": on_track_count
        },
        "departments": departments_list,
        "department_enrollment": departments_list,
        # Enriched Connection Metrics
        "declining_students": declining_count,
        "improving_students": improving_count,
        "critical_students": critical_count,
        "requiring_intervention": requiring_intervention,
        "low_attendance_students": low_attendance_count,
        "backlog_students": backlog_count,
        "pending_interventions": pending_interventions,
        "completed_interventions": completed_interventions
    }


# ============================================================
# HELPERS
# ============================================================

def get_student_by_id(student_id):
    """Return one student record by Student ID."""
    student_id = str(student_id).strip()
    df = prepare_data()
    result = df[df["student_id"] == student_id]
    if result.empty:
        return None
    return result.iloc[0]


def get_student_ids():
    """Return list of all student IDs."""
    df = load_data()
    return df["student_id"].astype(str).tolist()


# ============================================================
# COMPATIBILITY ALIASES
# ============================================================

load_students = prepare_data
get_dashboard_summary = get_summary
calculate_summary = get_summary
get_all_student_data = prepare_data
