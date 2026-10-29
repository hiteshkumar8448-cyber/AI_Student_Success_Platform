"""
AI Student Success Platform
Analytics & Summary Endpoints
"""

import re
from fastapi import APIRouter, HTTPException, Header
from schemas import AIChatRequest
from auth import get_authenticated_user
from services.faculty_service import get_institutional_summary
from services.student_service import get_student_by_id, get_all_students

router = APIRouter(tags=["Analytics"])


@router.get("/api/summary")
@router.get("/api/analytics/summary")
def get_summary_endpoint():
    """Return dashboard summary statistics."""
    return get_institutional_summary()


@router.get("/api/analytics/risk-distribution")
def get_risk_distribution():
    """Return risk distribution breakdown."""
    summary = get_institutional_summary()
    return {
        "total_students": summary["total_students"],
        "high_risk": summary["high_risk_students"],
        "medium_risk": summary["medium_risk_students"],
        "low_risk": summary["low_risk_students"],
        "percentages": {
            "high": summary.get("high_risk_percentage", 0.0),
            "medium": summary.get("medium_risk_percentage", 0.0),
            "low": summary.get("low_risk_percentage", 0.0)
        }
    }


@router.get("/api/departments")
def get_departments():
    """Return all active academic departments."""
    summary = get_institutional_summary()
    return [d["course"] for d in summary.get("departments", [])]


@router.get("/api/segments")
def get_segments():
    """Return student segment types."""
    return [
        "High Performer",
        "Academic Strong / Placement Risk",
        "Academic Risk",
        "Highly Engaged",
        "Developing"
    ]


@router.get("/api/students/{student_id}/risk-analysis")
def get_student_risk_analysis(student_id: str):
    """Return in-depth AI risk breakdown for a single student."""
    student = get_student_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    return {
        "student_id": student["student_id"],
        "name": student["name"],
        "risk_level": student["risk_level"],
        "success_score": student["success_score"],
        "risk_factors": student.get("risk_factors", []),
        "ai_explanation": student.get("ai_explanation", ""),
        "recommendations": student.get("recommendations", [])
    }


# ============================================================
# AI ASSISTANT CHATBOT ENDPOINT
# ============================================================

@router.post("/api/ai/chat")
@router.post("/api/ai-assistant/query")
def ai_assistant_chat(
    req: AIChatRequest,
    authorization: str | None = Header(default=None)
):
    """
    Intelligent Academic Assistant chatbot endpoint.
    Answers queries in real time using actual database metrics for both students and faculty.
    """
    msg = (req.message or "").strip()
    if not msg:
        raise HTTPException(status_code=400, detail="Query message cannot be empty")

    user = None
    role = "student"
    user_id = None
    if authorization:
        try:
            user = get_authenticated_user(authorization)
            role = user.get("role", "student")
            user_id = user.get("user_id")
        except Exception:
            pass

    # If student_id explicitly supplied or user is student
    target_student_id = req.student_id or (user_id if role == "student" else None)

    # Check if a student ID was mentioned in text (e.g. STU1001)
    match = re.search(r"\bSTU\d{4}\b", msg.upper())
    if match:
        target_student_id = match.group(0)

    normalized = msg.lower()
    student = get_student_by_id(target_student_id) if target_student_id else None

    # 1. FACULTY / COHORT LEVEL QUERIES
    if role == "faculty" and not student:
        summary = get_institutional_summary()
        if "immediate support" in normalized or "high risk" in normalized or "who needs" in normalized or "at-risk" in normalized:
            high_risk_list, _ = get_all_students(risk="High Risk", page=1, page_size=5)
            names_txt = "\n".join([f"• **{s['student_id']}** ({s['name']}) — CGPA: {s['cgpa']:.2f}, Att: {s['attendance']}%, Backlogs: {s['backlogs']}" for s in high_risk_list])
            return {
                "reply": f"### 🔴 High-Risk Students Requiring Immediate Support\n\nThere are currently **{summary['high_risk_students']}** students ({summary.get('high_risk_percentage', 0)}% of cohort) classified in the High-Risk tier.\n\nTop priority students:\n{names_txt}\n\n**Action Recommendation:** Issue remedial mentoring interventions with high priority.",
                "role": "faculty",
                "suggestions": ["Department Risk Analysis", "Attendance Trends", "Intervention Strategies"]
            }

        if "department" in normalized:
            depts = summary.get("departments", [])
            highest_risk_dept = min(depts, key=lambda d: d.get("dept_att", 100)) if depts else None
            txt = "\n".join([f"• **{d['course']}**: Avg CGPA {d['dept_cgpa']:.2f}, Avg Attendance {d['dept_att']:.1f}% ({d['count']} students)" for d in depts])
            dept_name = highest_risk_dept['course'] if highest_risk_dept else 'Information Technology'
            return {
                "reply": f"### 📊 Departmental Performance & Risk Breakdown\n\n{txt}\n\n**Key Finding:** **{dept_name}** currently records the lowest attendance average. Targeted department-level advisories are advised.",
                "role": "faculty",
                "suggestions": ["High-Risk Students Summary", "Attendance Trends"]
            }

        if "attendance" in normalized:
            low_att_count = summary.get("low_attendance_students", 0)
            return {
                "reply": f"### 📈 Institutional Attendance Trends\n\n• **Cohort Average Attendance:** {summary['average_attendance']}%\n• **Students Below 75% Cutoff:** {low_att_count} students ({low_att_count/max(summary['total_students'],1)*100:.1f}%)\n\n**Policy Trigger:** Students below 75% are ineligible for final university examinations without authorized medical waivers.",
                "role": "faculty",
                "suggestions": ["High-Risk Students Summary", "Department Risk Analysis"]
            }

        return {
            "reply": f"### 🎓 Institutional Academic Overview\n\n• **Total Monitored Cohort:** {summary['total_students']} students\n• **Average CGPA:** {summary['average_cgpa']:.2f}\n• **Average Attendance:** {summary['average_attendance']}%\n• **Active Interventions:** {summary['active_interventions']}\n\nYou can query specific students by typing their ID (e.g. *\"Analyze STU1001\"*) or explore cohort risk factors.",
            "role": "faculty",
            "suggestions": ["High-Risk Students Summary", "Department Risk Analysis", "Attendance Trends"]
        }

    # 2. STUDENT SPECIFIC QUERIES
    if student:
        sid = student["student_id"]
        name = student["name"]
        cgpa = student["cgpa"]
        att = student["attendance"]
        backlogs = student["backlogs"]
        score = student["success_score"]
        risk = student["risk_level"]
        course = student.get("course") or student.get("department") or "Engineering"
        assignments = student.get("assignment_completion", 80)
        lms = student.get("lms_activity", 50)
        coding = student.get("coding_score", 65)

        if "analyze" in normalized or "performance" in normalized or "how am i" in normalized or "standing" in normalized:
            status_indicator = "🟢 On Track" if "low" in risk.lower() else ("🟡 Needs Attention" if "medium" in risk.lower() else "🔴 Immediate Support Required")
            return {
                "reply": f"### 📊 Academic Performance Diagnostic: {name} ({sid})\n\n"
                         f"• **Current CGPA:** **{cgpa:.2f}** (Semester {student.get('semester', 4)})\n"
                         f"• **Attendance:** **{att}%** {'⚠️ Below 75% cutoff!' if att < 75 else '✓ University criteria met'}\n"
                         f"• **Active Backlogs:** **{backlogs}**\n"
                         f"• **Success Score:** **{score:.1f}/100**\n"
                         f"• **Early-Warning Risk Tier:** **{risk}** ({status_indicator})\n"
                         f"• **Assignment Completion:** {assignments}%\n\n"
                         f"**AI Recommendation:** " + (
                             "Maintain your current momentum; focus on upcoming coding assessments and placement preparation."
                             if "low" in risk.lower() else
                             "Prioritize clearing backlogs and boosting attendance above 75% to eliminate academic probation risk."
                         ),
                "role": role,
                "suggestions": ["Why is my risk level high?", "How can I improve attendance?", "Study Recommendations", "Career Guidance"]
            }

        if "why" in normalized and ("risk" in normalized or "high" in normalized or "tier" in normalized):
            reasons = []
            if att < 75:
                reasons.append(f"**Attendance Deficit:** Your attendance is **{att}%**, which is critically below the university mandatory threshold of 75%.")
            if backlogs > 0:
                reasons.append(f"**Course Backlogs:** You currently have **{backlogs} active backlog(s)**, impacting your semester progression.")
            if cgpa < 6.5:
                reasons.append(f"**CGPA Standing:** Your cumulative GPA of **{cgpa:.2f}** is below the recommended threshold of 6.50.")
            if assignments < 70:
                reasons.append(f"**Assignment Submission:** Only **{assignments}%** of internal assignments have been submitted.")

            if not reasons:
                reasons.append(f"Your academic risk is **{risk}** with strong attendance ({att}%) and zero backlogs.")

            reasons_txt = "\n".join([f"• {r}" for r in reasons])
            return {
                "reply": f"### 🔍 Root-Cause Risk Evaluation for {name}\n\n"
                         f"Your calculated Risk Category is **{risk}** based on the following indicators:\n\n"
                         f"{reasons_txt}\n\n"
                         f"**Immediate Action Plan:**\n"
                         f"1. Schedule an office-hours meeting with your designated faculty mentor.\n"
                         f"2. Attend all scheduled lectures next week to raise attendance.\n"
                         f"3. Submit any pending assignment extensions.",
                "role": role,
                "suggestions": ["How can I improve attendance?", "Study Recommendations", "Analyze My Performance"]
            }

        if "attendance" in normalized:
            if att >= 75:
                return {
                    "reply": f"### 📈 Attendance Status: Good Standing\n\n"
                             f"Your attendance is currently **{att}%**, comfortably above the mandatory 75% university examination eligibility threshold.\n\n"
                             f"**Tip:** Continue attending all practical lab sessions to safeguard internal assessment grades.",
                    "role": role,
                    "suggestions": ["Analyze My Performance", "Study Recommendations", "Career Guidance"]
                }
            else:
                needed = max(1, int((75 * 100 - att * 100) / 25))
                return {
                    "reply": f"### ⚠️ Attendance Recovery Roadmap for {name}\n\n"
                             f"• **Current Attendance:** **{att}%**\n"
                             f"• **University Minimum Requirement:** **75%**\n"
                             f"• **Shortage Margin:** **{75 - att:.1f}%**\n\n"
                             f"**Recovery Calculation:**\n"
                             f"Assuming 100 instructional hours completed to date, attending approximately **{needed} consecutive classes** without absence will bring your record back above the 75% threshold.\n\n"
                             f"**Recommended Steps:**\n"
                             f"1. Acknowledge your active faculty advisory in the **Faculty Advisories** tab.\n"
                             f"2. Submit formal medical certificates if absences were due to illness.\n"
                             f"3. Set an attendance milestone goal in the **Academic Goals** tracker.",
                    "role": role,
                    "suggestions": ["Why is my risk level high?", "Study Recommendations", "Career Guidance"]
                }

        if "study" in normalized or "recommendation" in normalized or "gpa" in normalized or "grade" in normalized:
            return {
                "reply": f"### 📚 Personalized Study Recommendations for {name}\n\n"
                         f"Based on your course profile (**{course}**, Semester {student.get('semester', 4)}):\n\n"
                         f"1. **Backlog Remediation:** Allocate 45 minutes daily to subjects with past backlogs.\n"
                         f"2. **Continuous Assessment:** Ensure all internal quizzes and LMS practicals are submitted before deadlines (Current completion: {assignments}%).\n"
                         f"3. **Peer Study Group:** Join departmental peer tutoring sessions for core technical modules.\n"
                         f"4. **Set Milestone Goals:** Use the platform's **Academic Goals** tracker to set weekly revision targets.",
                "role": role,
                "suggestions": ["Analyze My Performance", "Career Guidance", "How can I improve attendance?"]
            }

        if "career" in normalized or "placement" in normalized or "job" in normalized or "internship" in normalized:
            placement_readiness = "High" if cgpa >= 7.0 and backlogs == 0 and att >= 75 else ("Medium" if backlogs <= 1 else "Needs Improvement")
            return {
                "reply": f"### 🚀 Career & Placement Readiness Assessment\n\n"
                         f"• **Target Discipline:** {course}\n"
                         f"• **Placement Eligibility Tier:** **{placement_readiness}**\n"
                         f"• **Evaluated Technical Skill Score:** {coding}/100\n"
                         f"• **Corporate Criteria Check:** Most campus recruiters mandate **CGPA ≥ 6.50** with **0 active backlogs** at the time of drive registration.\n\n"
                         f"**Action Items to Boost Employability:**\n"
                         f"• Complete certified skill tracks in algorithmic problem-solving.\n"
                         f"• Participate in campus hackathons to build portfolio projects.\n"
                         f"• Schedule a mock interview review with department career counselors.",
                "role": role,
                "suggestions": ["Analyze My Performance", "Study Recommendations", "Why is my risk level high?"]
            }

        # Default student greeting / stats
        return {
            "reply": f"### 🎓 Student Success Assistant\n\n"
                     f"Hello **{name}**! I have your complete academic record loaded from the university database.\n\n"
                     f"**Your Quick Stats:**\n"
                     f"• CGPA: **{cgpa:.2f}** | Attendance: **{att}%** | Backlogs: **{backlogs}** | Risk Tier: **{risk}**\n\n"
                     f"How can I assist you today? You can choose a quick action below or ask any academic question.",
            "role": role,
            "suggestions": ["Analyze My Performance", "Why is my risk level high?", "How can I improve attendance?", "Study Recommendations", "Career Guidance"]
        }

    # General Fallback
    return {
        "reply": "### 🎓 Student Success AI\n\n"
                 "Welcome to the intelligent academic assistant. Please log in to your Student or Faculty account to access customized analytics and predictive insights.",
        "role": "guest",
        "suggestions": ["Analyze My Performance", "Why is my risk level high?", "How can I improve attendance?"]
    }

# Alias for backwards compatibility and tests
chat_with_ai = ai_assistant_chat

