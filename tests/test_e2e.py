import sys
from pathlib import Path

# Add backend to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from fastapi import HTTPException
from database import get_connection
from auth import (
    create_session_token,
    verify_session_token,
    require_student,
    require_faculty,
    require_same_student_or_faculty
)
from routes.auth_routes import student_login, faculty_login, logout
from routes.student_routes import list_students, get_student_detail, get_logged_in_student, get_student_report
from routes.faculty_routes import faculty_me, faculty_summary
from routes.intervention_routes import (
    add_intervention,
    list_interventions,
    list_student_interventions,
    respond_intervention_endpoint,
    update_intervention_status,
    modify_intervention,
    get_single_intervention,
    reply_to_intervention_endpoint
)
from routes.note_and_message_routes import (
    get_conversations_route,
    create_conversation_route,
    get_conversation_detail_route,
    reply_conversation_route,
    list_study_materials_endpoint,
    get_study_material_endpoint,
    delete_study_material_endpoint
)
from routes.notification_routes import list_current_user_notifications, mark_read_route, mark_all_read_route, get_notifications_summary
from routes.goal_routes import create_goal_route, get_my_goals, get_student_goals_route, update_goal_route
from routes.analytics_routes import get_summary_endpoint, get_risk_distribution, chat_with_ai
from schemas import (
    StudentLoginRequest,
    FacultyLoginRequest,
    InterventionCreate,
    InterventionUpdate,
    InterventionRespond,
    InterventionReplyCreate,
    ConversationCreate,
    ConversationReply,
    StudentGoalCreate,
    StudentGoalUpdate,
    AIChatRequest
)
from services.study_resource_service import create_study_material

print("============================================================")
print("  AI STUDENT SUCCESS PLATFORM -- END-TO-END VERIFICATION  ")
print("============================================================")

passed = 0
total = 0

def check(name, condition, extra=""):
    global passed, total
    total += 1
    if condition:
        passed += 1
        print(f"[{total:02d}] PASS: {name} {extra}")
    else:
        print(f"[{total:02d}] FAIL: {name} {extra}")
        raise AssertionError(f"Test failed: {name}")

# Test 1: Student Login Works with student_id payload
stu_res = student_login(StudentLoginRequest(student_id="STU1001", password="STU1001"))
check(
    "Student login works",
    stu_res["message"] == "Student login successful" and
    stu_res["role"] == "student" and
    "student" in stu_res and
    stu_res["student"]["student_id"] == "STU1001" and
    "token" in stu_res
)
stu_token = stu_res["token"]
stu_auth = f"Bearer {stu_token}"

# Test 2: Faculty Login Works with faculty_id payload
fac_res = faculty_login(FacultyLoginRequest(faculty_id="FACULTY001", password="FACULTY001"))
check(
    "Faculty login works",
    fac_res["message"] == "Faculty login successful" and
    fac_res["role"] == "faculty" and
    "faculty" in fac_res and
    fac_res["faculty"]["faculty_id"] == "FACULTY001" and
    "token" in fac_res
)
fac_token = fac_res["token"]
fac_auth = f"Bearer {fac_token}"

# Test 3: Faculty Login Works case-insensitively for ID
fac_res_lower = faculty_login(FacultyLoginRequest(faculty_id="faculty001", password="FACULTY001"))
check("Faculty ID case-normalization works", fac_res_lower["faculty"]["faculty_id"] == "FACULTY001")

# Test 4: Wrong Faculty Password Rejected
try:
    faculty_login(FacultyLoginRequest(faculty_id="FACULTY001", password="WRONG_FACULTY_PASSWORD"))
    check("Wrong Faculty password rejected", False)
except HTTPException as e:
    check("Wrong Faculty password rejected", e.status_code == 401)

# Test 5: Wrong Student Password Rejected
try:
    student_login(StudentLoginRequest(student_id="STU1001", password="WRONG_STUDENT_PASSWORD"))
    check("Wrong Student password rejected", False)
except HTTPException as e:
    check("Wrong Student password rejected", e.status_code == 401)

# Test 6: Faculty /me profile loaded
fac_me_res = faculty_me(authorization=fac_auth)
check("Faculty /me profile loaded", fac_me_res["faculty_id"] == "FACULTY001" and "name" in fac_me_res)

# Test 7: Student Dashboard Loads Logged-in Student Information
me_res = get_logged_in_student(authorization=stu_auth)
check("Student /me profile loaded", me_res["student_id"] == "STU1001" and me_res["cgpa"] > 0)

# Test 8: Student Cannot Access Another Student's Private Data
try:
    require_same_student_or_faculty(authorization=stu_auth, target_student_id="STU1002")
    check("Student privacy isolation", False)
except HTTPException as e:
    check("Student privacy isolation", e.status_code == 403)

# Test 9: Student Cannot Access Faculty-Only APIs
try:
    list_students(authorization=stu_auth)
    check("Student blocked from faculty endpoint", False)
except HTTPException as e:
    check("Student blocked from faculty endpoint", e.status_code == 403)

# Test 10: Faculty Can View Students
students_res = list_students(authorization=fac_auth, page=1, page_size=20)
check("Faculty can list students", len(students_res) == 20)

# Test 11: Faculty Can Search Students
search_res = list_students(authorization=fac_auth, search="Aarav")
check("Faculty search students", len(search_res) >= 1)

# Test 12: Faculty Filter by Risk
risk_res = list_students(authorization=fac_auth, risk="High Risk")
check("Faculty filter by risk", all("high" in s["risk_level"].lower() for s in risk_res))

# Test 13: Faculty Can Open Any Student Profile
detail_res = get_student_detail(student_id="STU1001", authorization=fac_auth)
check("Faculty view student profile", detail_res["student_id"] == "STU1001" and "ai_explanation" in detail_res)

# Test 14 & 15: Faculty Creates an Intervention & Saved in Database
int_data = InterventionCreate(
    student_id="STU1001",
    title="Mandatory Math Mentoring",
    type="Academic Support",
    description="Your attendance has fallen below 75%. Please meet your faculty mentor on Friday.",
    priority="High",
    due_date="2026-11-20"
)
created_int = add_intervention(data=int_data, authorization=fac_auth)
check("Faculty creates intervention", created_int["title"] == "Mandatory Math Mentoring")
created_int_id = created_int["intervention_id"]

with get_connection() as conn:
    c = conn.cursor()
    c.execute("SELECT * FROM interventions WHERE intervention_id = ?;", (created_int_id,))
    row = c.fetchone()
    check("Intervention saved in database", row is not None and row["title"] == "Mandatory Math Mentoring")

# Test 16: Correct Student (STU1001) Sees the Intervention
stu1_ints = list_student_interventions(student_id="STU1001", authorization=stu_auth)
check("Correct student sees intervention", any(i["intervention_id"] == created_int_id for i in stu1_ints))

# Test 17: Other Students (STU1002) Do Not See STU1001's Intervention
stu2_token = create_session_token("student", "STU1002")
stu2_auth = f"Bearer {stu2_token}"
stu2_ints = list_student_interventions(student_id="STU1002", authorization=stu2_auth)
check("Other student cannot see private intervention", not any(i["intervention_id"] == created_int_id for i in stu2_ints))

# Test 18: Student Received a Notification
notifs = list_current_user_notifications(authorization=stu_auth)
check("Student received notification", any("Mandatory Math Mentoring" in n["title"] or "Intervention" in n["title"] for n in notifs))
test_notif_id = notifs[0]["notification_id"]

# Test 19: Student Marks Notification as Read
read_res = mark_read_route(notification_id=test_notif_id, authorization=stu_auth)
check("Student marks notification as read", read_res["success"] is True)

# Test 20: Student Creates & Updates a Goal
goal_data = StudentGoalCreate(
    title="Raise Attendance to 85%",
    description="Attend all morning lecture practicals",
    target_date="2026-11-30",
    progress=50
)
created_goal = create_goal_route(data=goal_data, authorization=stu_auth)
check("Student creates goal", created_goal["title"] == "Raise Attendance to 85%" and created_goal["progress"] == 50)
goal_id = created_goal["goal_id"]

updated_goal = update_goal_route(goal_id=goal_id, data=StudentGoalUpdate(progress=75), authorization=stu_auth)
check("Student updates goal progress", updated_goal["progress"] == 75)

# Test 21: Faculty Can See Student's Progress and Goals
fac_view_goals = get_student_goals_route(student_id="STU1001", authorization=fac_auth)
check("Faculty sees student goals in profile", any(g["goal_id"] == goal_id and g["progress"] == 75 for g in fac_view_goals))

# Test 22: Student Responds to Intervention & Faculty Sees Response
respond_res = respond_intervention_endpoint(
    intervention_id=created_int_id,
    data=InterventionRespond(response="I will attend tutoring on Friday at 3 PM."),
    authorization=stu_auth
)
check("Student responds to intervention", respond_res["student_response"] == "I will attend tutoring on Friday at 3 PM.")

fac_view_int = list_student_interventions(student_id="STU1001", authorization=fac_auth)
matching_int = next(i for i in fac_view_int if i["intervention_id"] == created_int_id)
check("Faculty sees student response in intervention", matching_int["student_response"] == "I will attend tutoring on Friday at 3 PM.")

# Test 23: Faculty Can Mark Intervention as Resolved
resolve_res = update_intervention_status(
    intervention_id=created_int_id,
    data=InterventionUpdate(status="Resolved"),
    authorization=fac_auth
)
check("Faculty resolves intervention", resolve_res["status"] == "Resolved")

# Test 24: Analytics Summary Loads Accurately
analytics = get_summary_endpoint()
check("Analytics summary loads correctly", analytics["total_students"] == 500 and analytics["average_cgpa"] > 0)

risk_dist = get_risk_distribution()
check("Risk distribution loads correctly", risk_dist["total_students"] == 500 and "high_risk" in risk_dist)

# Test 25: Performance Report Generation
report_data = get_student_report(student_id="STU1001", authorization=fac_auth)
check("Performance report data generated", report_data["student"]["student_id"] == "STU1001" and "performance" in report_data)

# Test 26: Logout Endpoint
logout_res = logout()
check("Logout works", "message" in logout_res)

# Test 27: Student Success AI - Student Performance Analysis
stu_ai_res = chat_with_ai(
    req=AIChatRequest(message="Analyze My Performance", student_id="STU1001"),
    authorization=stu_auth
)
check("Student Success AI analyzes student performance", "STU1001" in stu_ai_res["reply"] and "suggestions" in stu_ai_res)

# Test 28: Student Success AI - Risk Factor Query
stu_ai_risk = chat_with_ai(
    req=AIChatRequest(message="Why is my risk level high?", student_id="STU1001"),
    authorization=stu_auth
)
check("Student Success AI explains risk level", "Risk" in stu_ai_risk["reply"] and len(stu_ai_risk["suggestions"]) > 0)

# Test 29: Student Success AI - Attendance Advice Query
stu_ai_att = chat_with_ai(
    req=AIChatRequest(message="How can I improve attendance?", student_id="STU1001"),
    authorization=stu_auth
)
check("Student Success AI attendance recovery roadmap", "Attendance" in stu_ai_att["reply"])

# Test 30: Student Success AI - Faculty High-Risk Cohort Overview
fac_ai_res = chat_with_ai(
    req=AIChatRequest(message="Who needs immediate support?"),
    authorization=fac_auth
)
check("Student Success AI faculty cohort risk overview", "High-Risk" in fac_ai_res["reply"] and fac_ai_res["role"] == "faculty")

# Test 31: Student Success AI - Faculty Specific Student Analysis
fac_ai_stu = chat_with_ai(
    req=AIChatRequest(message="Analyze STU1001"),
    authorization=fac_auth
)
check("Student Success AI faculty student specific lookup", "STU1001" in fac_ai_stu["reply"])

# ============================================================
# TEST A: TWO-WAY STUDENT <-> FACULTY MESSAGING WORKFLOW
# ============================================================
# Step 1: Student creates a new conversation with subject and message
new_conv = create_conversation_route(
    data=ConversationCreate(
        subject="Midterm Query regarding Graph Algorithms",
        message="Hello Professor, I need clarification on Dijkstra algorithm complexity."
    ),
    authorization=stu_auth
)
test_conv_id = new_conv["conversation_id"]
check("Student starts new conversation thread", test_conv_id.startswith("conv_") and new_conv["subject"] == "Midterm Query regarding Graph Algorithms")

# Step 2: Faculty logs in, lists conversations, and sees the student message
fac_convs = get_conversations_route(authorization=fac_auth)
matching_fac_conv = next((c for c in fac_convs if c["conversation_id"] == test_conv_id), None)
check("Faculty inbox displays student conversation", matching_fac_conv is not None and matching_fac_conv["student_id"] == "STU1001")

# Step 3: Faculty opens conversation details and sends reply
fac_detail = get_conversation_detail_route(conversation_id=test_conv_id, authorization=fac_auth)
check("Faculty views student messages in thread", len(fac_detail["messages"]) >= 1 and "Dijkstra" in fac_detail["messages"][0]["message"])

fac_reply_res = reply_conversation_route(
    conversation_id=test_conv_id,
    data=ConversationReply(message="Dijkstra runs in O((V + E) log V) with a priority queue. Come to lab hours at 2 PM."),
    authorization=fac_auth
)
check("Faculty replies to student conversation", fac_reply_res["reply"]["sender_role"] == "faculty")

# Step 4: Student logs in, retrieves conversation, and sees faculty reply
stu_conv_detail = get_conversation_detail_route(conversation_id=test_conv_id, authorization=stu_auth)
faculty_replies_found = [m for m in stu_conv_detail["messages"] if m["sender_role"] == "faculty"]
check("Student sees faculty response in conversation thread", len(faculty_replies_found) >= 1 and "priority queue" in faculty_replies_found[0]["message"])


# ============================================================
# TEST B: TWO-WAY INTERVENTION CONVERSATION & STATUS WORKFLOW
# ============================================================
# Step 1: Faculty logs in and starts a new intervention for STU1001
new_int_res = add_intervention(
    data=InterventionCreate(
        student_id="STU1001",
        type="Low Attendance",
        priority="Urgent",
        title="Urgent: Attendance Deficit in Operating Systems",
        description="Your current attendance is 62%. You must attend remedial classes starting Monday.",
        action_type="Remedial Class",
        due_date="2026-11-20"
    ),
    authorization=fac_auth
)
test_int_id = new_int_res["intervention_id"]
check("Faculty creates + New Intervention with Urgent priority", test_int_id.startswith("int_") and new_int_res["priority"] == "Urgent")

# Step 2: Student logs in and retrieves their intervention
stu_int_detail = get_single_intervention(intervention_id=test_int_id, authorization=stu_auth)
check("Student sees new intervention with opening instructions", stu_int_detail["intervention_id"] == test_int_id and len(stu_int_detail["replies"]) >= 1)

# Step 3: Student replies to the intervention
stu_reply_int_res = reply_to_intervention_endpoint(
    intervention_id=test_int_id,
    data=InterventionReplyCreate(message="Understood Sir. I was hospitalized for a week, but I will attend all remedial classes."),
    authorization=stu_auth
)
check("Student replies to intervention thread", stu_reply_int_res["reply"]["sender_role"] == "student")

# Step 4: Faculty views the student reply in the intervention
fac_int_view = get_single_intervention(intervention_id=test_int_id, authorization=fac_auth)
check("Faculty sees student reply in intervention conversation", any(r["sender_role"] == "student" and "hospitalized" in r["message"] for r in fac_int_view["replies"]))

# Step 5: Faculty replies back to the student in the same intervention thread
fac_reply_int_res = reply_to_intervention_endpoint(
    intervention_id=test_int_id,
    data=InterventionReplyCreate(message="Please submit your medical certificate to the department office so we can regularize your leave."),
    authorization=fac_auth
)
check("Faculty sends follow-up reply in intervention thread", fac_reply_int_res["reply"]["sender_role"] == "faculty")

# Step 6: Student retrieves intervention and sees latest faculty follow-up
stu_int_refreshed = get_single_intervention(intervention_id=test_int_id, authorization=stu_auth)
check("Student sees multi-turn faculty response in same thread", any(r["sender_role"] == "faculty" and "medical certificate" in r["message"] for r in stu_int_refreshed["replies"]))

# Step 7: Faculty updates status to Resolved
status_upd_res = modify_intervention(
    intervention_id=test_int_id,
    data=InterventionUpdate(status="Resolved"),
    authorization=fac_auth
)
check("Faculty updates intervention status to Resolved", status_upd_res["status"] == "Resolved")


# ============================================================
# TEST C: FACULTY STUDY NOTES UPLOAD & STUDENT ACCESS WORKFLOW
# ============================================================
# Step 1: Faculty publishes study material in database
mat_res = create_study_material(
    faculty_id="FACULTY001",
    faculty_name="Faculty Administrator",
    subject_name="Compiler Design",
    subject_code="CS405",
    title="Lexical Analysis & LL(1) Parsing Handbook",
    description="Comprehensive notes on finite automata and predictive parsing tables.",
    semester=6,
    filename="CS405_Compiler_Design_Notes.pdf",
    original_filename="Compiler_Design_Notes.pdf",
    file_type="pdf",
    file_size=204800
)
test_mat_id = mat_res["material_id"]
check("Faculty uploads and registers study material", test_mat_id.startswith("mat_") and mat_res["subject_code"] == "CS405")

# Step 2: Student logs in and retrieves published study materials
student_notes = list_study_materials_endpoint(subject="Compiler Design", authorization=stu_auth)
matching_note = next((n for n in student_notes if n["material_id"] == test_mat_id), None)
check("Student views published faculty study notes", matching_note is not None and "Parsing" in matching_note["title"])

# Step 3: Student can access single study material details
student_single_note = get_study_material_endpoint(resource_id=test_mat_id, authorization=stu_auth)
check("Student accesses study material download URL", student_single_note["file_url"].startswith("/faculty-files/"))


# ============================================================
# TEST D: STUDENT PRIVACY ISOLATION
# ============================================================
# Student B login (STU1002)
stu_b_res = student_login(StudentLoginRequest(student_id="STU1002", password="STU1002"))
stu_b_token = stu_b_res["token"]
stu_b_auth = f"Bearer {stu_b_token}"

# Student B attempts to access Student A's private conversation (should raise 403 Forbidden)
stu_b_blocked_conv = False
try:
    get_conversation_detail_route(conversation_id=test_conv_id, authorization=stu_b_auth)
except HTTPException as e:
    if e.status_code == 403:
        stu_b_blocked_conv = True
check("Privacy Isolation: Student B cannot view Student A's private conversation", stu_b_blocked_conv)

# Student B attempts to access Student A's private intervention (should raise 403 Forbidden)
stu_b_blocked_int = False
try:
    get_single_intervention(intervention_id=test_int_id, authorization=stu_b_auth)
except HTTPException as e:
    if e.status_code == 403:
        stu_b_blocked_int = True
check("Privacy Isolation: Student B cannot view Student A's private intervention", stu_b_blocked_int)

# Student B attempts to reply to Student A's intervention (should raise 403 Forbidden)
stu_b_blocked_reply = False
try:
    reply_to_intervention_endpoint(
        intervention_id=test_int_id,
        data=InterventionReplyCreate(message="Hacked reply from STU1002"),
        authorization=stu_b_auth
    )
except HTTPException as e:
    if e.status_code == 403:
        stu_b_blocked_reply = True
check("Privacy Isolation: Student B cannot reply to Student A's intervention", stu_b_blocked_reply)

# Step 4: Notifications summary endpoint
notif_summary = get_notifications_summary(authorization=fac_auth)
check("Dashboard notifications summary returns valid unread counts", "total_unread" in notif_summary and "messages_unread" in notif_summary)

print("============================================================")
print(f"  RESULT: ALL {passed} OF {total} VERIFICATION SCENARIOS PASSED 100%!  ")
print("============================================================")
