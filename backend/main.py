from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pathlib import Path
from datetime import datetime
import json
import uuid

from analytics import prepare_data, get_summary


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="AI Student Success Platform",
    description="AI-powered Student Analytics and Success Platform",
    version="1.0.0"
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

FRONTEND_DIR = BASE_DIR / "frontend"

DATA_DIR = BASE_DIR / "data"

NOTES_FILE = DATA_DIR / "faculty_notes.json"

FACULTY_FILES_DIR = DATA_DIR / "faculty_files"


# Make sure directories exist

DATA_DIR.mkdir(
    parents=True,
    exist_ok=True
)

FACULTY_FILES_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# FILE UPLOAD SETTINGS
# ============================================================

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx"
}

MAX_FILE_SIZE = 10 * 1024 * 1024


# ============================================================
# LOAD STUDENT DATA
# ============================================================

df = prepare_data()


# ============================================================
# FACULTY NOTE MODEL
# ============================================================

class FacultyNote(BaseModel):

    faculty_name: str

    note: str


# ============================================================
# FACULTY NOTES STORAGE
# ============================================================

def load_notes():

    if not NOTES_FILE.exists():

        return []

    try:

        with open(
            NOTES_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            data = json.load(file)

            if isinstance(data, list):
                return data

            return []

    except (
        json.JSONDecodeError,
        OSError
    ):

        return []


def save_notes(notes):

    temporary_file = NOTES_FILE.with_suffix(".tmp")

    with open(
        temporary_file,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            notes,
            file,
            indent=4,
            ensure_ascii=False
        )

    temporary_file.replace(
        NOTES_FILE
    )


# ============================================================
# STUDENT VALIDATION
# ============================================================

def verify_student(student_id):

    result = df[
        df["student_id"] == student_id
    ]

    if result.empty:

        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    return result.iloc[0]


# ============================================================
# SAFE FILE NAME
# ============================================================

def create_safe_filename(original_filename):

    original_path = Path(
        original_filename
    )

    extension = (
        original_path.suffix.lower()
    )

    unique_id = str(
        uuid.uuid4()
    )

    return (
        f"faculty_note_"
        f"{unique_id}"
        f"{extension}"
    )


# ============================================================
# FILE TYPE VALIDATION
# ============================================================

def validate_file_type(filename):

    extension = (
        Path(filename)
        .suffix
        .lower()
    )

    if extension not in ALLOWED_EXTENSIONS:

        raise HTTPException(
            status_code=400,
            detail=(
                "Only PDF and DOCX files "
                "are allowed."
            )
        )

    return extension


# ============================================================
# AI STUDENT STRENGTH ENGINE
# ============================================================

def generate_strengths(row):

    strengths = []

    # --------------------------------------------------------
    # Academic strengths
    # --------------------------------------------------------

    if row["cgpa"] >= 8:

        strengths.append({
            "strength": "Strong Academic Performance",
            "detail": (
                f"CGPA of {row['cgpa']:.2f} indicates strong "
                "overall academic performance."
            ),
            "category": "Academic"
        })

    elif row["subject_performance"] >= 75:

        strengths.append({
            "strength": "Strong Subject Performance",
            "detail": (
                "The student demonstrates strong "
                "performance across subjects."
            ),
            "category": "Academic"
        })

    # --------------------------------------------------------
    # Attendance strength
    # --------------------------------------------------------

    if row["attendance"] >= 85:

        strengths.append({
            "strength": "Excellent Attendance",
            "detail": (
                f"Attendance is {row['attendance']:.1f}%, "
                "showing strong academic participation."
            ),
            "category": "Engagement"
        })

    elif row["attendance"] >= 75:

        strengths.append({
            "strength": "Good Attendance",
            "detail": (
                f"Attendance of {row['attendance']:.1f}% "
                "shows consistent participation."
            ),
            "category": "Engagement"
        })

    # --------------------------------------------------------
    # LMS strength
    # --------------------------------------------------------

    if row["lms_login_frequency"] >= 75:

        strengths.append({
            "strength": "Active LMS Usage",
            "detail": (
                "The student regularly uses the learning "
                "management system."
            ),
            "category": "Learning"
        })

    if row["assignment_completion"] >= 80:

        strengths.append({
            "strength": "Strong Assignment Completion",
            "detail": (
                f"Assignment completion is "
                f"{row['assignment_completion']:.1f}%."
            ),
            "category": "Learning"
        })

    # --------------------------------------------------------
    # Coding strength
    # --------------------------------------------------------

    if row["coding_score"] >= 75:

        strengths.append({
            "strength": "Strong Coding Skills",
            "detail": (
                f"Coding readiness score is "
                f"{row['coding_score']:.1f}%."
            ),
            "category": "Technical"
        })

    # --------------------------------------------------------
    # Aptitude strength
    # --------------------------------------------------------

    if row["aptitude_score"] >= 75:

        strengths.append({
            "strength": "Strong Aptitude",
            "detail": (
                f"Aptitude score is "
                f"{row['aptitude_score']:.1f}%."
            ),
            "category": "Placement"
        })

    # --------------------------------------------------------
    # Interview strength
    # --------------------------------------------------------

    if row["mock_interview_score"] >= 75:

        strengths.append({
            "strength": "Strong Interview Readiness",
            "detail": (
                f"Mock interview score is "
                f"{row['mock_interview_score']:.1f}%."
            ),
            "category": "Placement"
        })

    # --------------------------------------------------------
    # Technical skill
    # --------------------------------------------------------

    if row["technical_skill"] >= 75:

        strengths.append({
            "strength": "Strong Technical Skills",
            "detail": (
                f"Technical skill assessment score is "
                f"{row['technical_skill']:.1f}%."
            ),
            "category": "Skills"
        })

    # --------------------------------------------------------
    # Soft skills
    # --------------------------------------------------------

    if row["soft_skill"] >= 75:

        strengths.append({
            "strength": "Strong Soft Skills",
            "detail": (
                f"Soft-skill assessment score is "
                f"{row['soft_skill']:.1f}%."
            ),
            "category": "Skills"
        })

    # --------------------------------------------------------
    # Hackathon strength
    # --------------------------------------------------------

    if row["hackathons"] >= 2:

        strengths.append({
            "strength": "Hackathon Experience",
            "detail": (
                f"Participated in "
                f"{int(row['hackathons'])} hackathons."
            ),
            "category": "Engagement"
        })

    # --------------------------------------------------------
    # Certification strength
    # --------------------------------------------------------

    if row["certifications"] >= 3:

        strengths.append({
            "strength": "Strong Certification Profile",
            "detail": (
                f"Completed "
                f"{int(row['certifications'])} certifications."
            ),
            "category": "Career"
        })

    # --------------------------------------------------------
    # Events / clubs
    # --------------------------------------------------------

    if row["events_participated"] >= 5:

        strengths.append({
            "strength": "Active Event Participation",
            "detail": (
                "The student actively participates "
                "in institutional events."
            ),
            "category": "Engagement"
        })

    if row["clubs_participated"] >= 2:

        strengths.append({
            "strength": "Active in Student Communities",
            "detail": (
                "The student participates in "
                "student clubs and communities."
            ),
            "category": "Engagement"
        })

    # --------------------------------------------------------
    # Satisfaction
    # --------------------------------------------------------

    if row["student_satisfaction"] >= 80:

        strengths.append({
            "strength": "High Student Satisfaction",
            "detail": (
                f"Student satisfaction score is "
                f"{row['student_satisfaction']:.1f}%."
            ),
            "category": "Feedback"
        })

    # --------------------------------------------------------
    # Faculty feedback
    # --------------------------------------------------------

    if row["faculty_feedback"] >= 80:

        strengths.append({
            "strength": "Positive Faculty Feedback",
            "detail": (
                "Faculty feedback indicates strong "
                "overall student performance."
            ),
            "category": "Feedback"
        })

    # --------------------------------------------------------
    # Prevent empty strengths
    # --------------------------------------------------------

    if not strengths:

        strengths.append({
            "strength": "Growth Potential",
            "detail": (
                "The student has opportunities to develop "
                "strengths across academic and career indicators."
            ),
            "category": "Development"
        })

    return strengths


# ============================================================
# AI-POWERED INTERVENTION RECOMMENDATION ENGINE
# ============================================================

def generate_recommendation(row):

    reasons = []

    if row["risk_reasons"]:

        reasons = [
            reason.strip()
            for reason in str(
                row["risk_reasons"]
            ).split(" | ")
            if reason.strip()
        ]

    strengths = generate_strengths(row)

    strength_names = [
        item["strength"]
        for item in strengths
    ]

    actions = []

    # ========================================================
    # ACADEMIC RECOMMENDATIONS
    # ========================================================

    if "Low CGPA" in reasons:

        actions.append(
            "Assign an academic mentor and create "
            "a personalized study plan."
        )

    if "Weak subject performance" in reasons:

        actions.append(
            "Provide subject-specific tutoring and "
            "additional learning resources."
        )

    if "Multiple academic backlogs" in reasons:

        actions.append(
            "Create a backlog recovery plan with "
            "weekly academic progress tracking."
        )

    # ========================================================
    # ATTENDANCE
    # ========================================================

    if "Low attendance" in reasons:

        actions.append(
            "Schedule attendance counselling and "
            "monitor attendance weekly."
        )

    # ========================================================
    # LMS
    # ========================================================

    if "Low assignment completion" in reasons:

        actions.append(
            "Create an assignment catch-up plan with "
            "weekly completion targets."
        )

    if "Low LMS activity" in reasons:

        actions.append(
            "Encourage regular LMS usage and monitor "
            "weekly learning activity."
        )

    # ========================================================
    # PLACEMENT
    # ========================================================

    if "Low coding readiness" in reasons:

        actions.append(
            "Enroll the student in a coding practice "
            "and problem-solving program."
        )

    if "Low aptitude readiness" in reasons:

        actions.append(
            "Provide aptitude preparation resources "
            "and regular practice tests."
        )

    if "Low interview readiness" in reasons:

        actions.append(
            "Schedule mock interviews and "
            "communication practice sessions."
        )

    # ========================================================
    # SKILLS
    # ========================================================

    if "Technical skill gap" in reasons:

        actions.append(
            "Recommend technical skill development "
            "courses based on the student's profile."
        )

    if "Soft skill gap" in reasons:

        actions.append(
            "Recommend communication, teamwork and "
            "professional-skills workshops."
        )

    # ========================================================
    # SEGMENT RECOMMENDATIONS
    # ========================================================

    segment = row["segment"]

    if segment == "Academic Strong / Placement Risk":

        actions.append(
            "Prioritize placement-readiness training "
            "because academic performance is strong "
            "but placement skills need improvement."
        )

    elif segment == "High Performer":

        actions.append(
            "Provide advanced projects, hackathon "
            "opportunities and leadership activities."
        )

    elif segment == "Highly Engaged":

        actions.append(
            "Maintain current engagement and provide "
            "advanced career-development opportunities."
        )

    elif segment == "Academic Risk":

        actions.append(
            "Assign a faculty mentor and create a "
            "structured academic recovery plan."
        )

    elif segment == "Developing":

        actions.append(
            "Schedule regular mentor check-ins and "
            "monitor academic and engagement progress."
        )

    # ========================================================
    # STRENGTH-AWARE RECOMMENDATIONS
    # ========================================================

    if "Strong Coding Skills" in strength_names:

        actions.append(
            "Leverage the student's strong coding skills "
            "through advanced coding projects and "
            "technical interview preparation."
        )

    if "Strong Academic Performance" in strength_names:

        actions.append(
            "Leverage strong academic performance for "
            "advanced projects, peer mentoring and "
            "leadership opportunities."
        )

    if "Excellent Attendance" in strength_names:

        actions.append(
            "Use the student's consistent attendance as a "
            "positive foundation for structured interventions."
        )

    if "Strong Technical Skills" in strength_names:

        actions.append(
            "Leverage technical strengths by assigning "
            "practical projects and industry-oriented tasks."
        )

    if "Strong Soft Skills" in strength_names:

        actions.append(
            "Leverage communication and teamwork strengths "
            "through presentations, peer mentoring and "
            "leadership activities."
        )

    if "Hackathon Experience" in strength_names:

        actions.append(
            "Use hackathon experience to encourage "
            "project-based learning and innovation activities."
        )

    # ========================================================
    # REMOVE DUPLICATES
    # ========================================================

    actions = list(
        dict.fromkeys(actions)
    )

    # ========================================================
    # PRIORITY
    # ========================================================

    if row["risk_level"] == "Immediate Support":

        priority = "Critical"

    elif row["risk_level"] == "Needs Attention":

        priority = "High"

    else:

        priority = "Normal"

    # ========================================================
    # OVERALL RECOMMENDATION
    # ========================================================

    if row["risk_level"] == "Immediate Support":

        overall = (
            "Immediate intervention is recommended. "
            "The student's risk factors should be addressed "
            "while using existing strengths as a foundation."
        )

    elif row["risk_level"] == "Needs Attention":

        overall = (
            "Early intervention is recommended. "
            "Address the identified risk factors while "
            "building on the student's existing strengths."
        )

    else:

        overall = (
            "Student is currently on track. "
            "Continue monitoring performance and use the "
            "student's strengths to create growth opportunities."
        )

    return {
        "priority": priority,
        "overall_recommendation": overall,
        "student_strengths": strengths,
        "recommended_actions": actions
    }


# ============================================================
# SUMMARY API
# ============================================================

@app.get("/api/summary")
def summary():

    return get_summary(df)


# ============================================================
# STUDENT LIST API
# ============================================================

@app.get("/api/students")
def students(
    risk: str | None = None,
    department: str | None = None,
    search: str | None = None
):

    result = df.copy()

    if risk and risk != "All":

        result = result[
            result["risk_level"] == risk
        ]

    if department and department != "All":

        result = result[
            result["department"] == department
        ]

    if search:

        search = search.lower()

        result = result[
            result["student_id"]
            .str
            .lower()
            .str
            .contains(search)
            |
            result["name"]
            .str
            .lower()
            .str
            .contains(search)
        ]

    columns = [

        "student_id",
        "name",
        "department",
        "year",
        "cgpa",
        "attendance",
        "success_score",
        "risk_level",
        "segment",
        "placement_outcome"

    ]

    return result[
        columns
    ].to_dict(
        orient="records"
    )


# ============================================================
# INDIVIDUAL STUDENT DETAILS API
# ============================================================

@app.get("/api/student/{student_id}")
def student_detail(student_id: str):

    row = verify_student(student_id)

    recommendation = generate_recommendation(
        row
    )

    return {

        "student_id":
            row["student_id"],

        "name":
            row["name"],

        "department":
            row["department"],

        "year":
            int(row["year"]),

        "success_score":
            float(row["success_score"]),

        "risk_level":
            row["risk_level"],

        "risk_reasons":
            (
                row["risk_reasons"].split(" | ")
                if row["risk_reasons"]
                else []
            ),

        "segment":
            row["segment"],

        "placement_outcome":
            row["placement_outcome"],

        "recommendation":
            recommendation,

        "academic": {

            "cgpa":
                float(row["cgpa"]),

            "backlogs":
                int(row["backlogs"]),

            "subject_performance":
                float(
                    row["subject_performance"]
                )

        },

        "attendance":
            float(row["attendance"]),

        "lms": {

            "login_frequency":
                float(
                    row["lms_login_frequency"]
                ),

            "assignment_completion":
                float(
                    row["assignment_completion"]
                )

        },

        "engagement": {

            "events":
                int(
                    row["events_participated"]
                ),

            "clubs":
                int(
                    row["clubs_participated"]
                ),

            "hackathons":
                int(
                    row["hackathons"]
                ),

            "certifications":
                int(
                    row["certifications"]
                )

        },

        "placement": {

            "aptitude":
                float(
                    row["aptitude_score"]
                ),

            "coding":
                float(
                    row["coding_score"]
                ),

            "mock_interview":
                float(
                    row["mock_interview_score"]
                )

        },

        "skills": {

            "technical":
                float(
                    row["technical_skill"]
                ),

            "soft":
                float(
                    row["soft_skill"]
                )

        },

        "feedback": {

            "student_satisfaction":
                float(
                    row["student_satisfaction"]
                ),

            "faculty_feedback":
                float(
                    row["faculty_feedback"]
                )

        },

        "score_explanation": [

            {
                "indicator":
                    "Academic Performance",

                "value":
                    float(row["cgpa"]),

                "importance":
                    "High"
            },

            {
                "indicator":
                    "Attendance",

                "value":
                    float(row["attendance"]),

                "importance":
                    "High"
            },

            {
                "indicator":
                    "Assignment Completion",

                "value":
                    float(
                        row["assignment_completion"]
                    ),

                "importance":
                    "Medium"
            },

            {
                "indicator":
                    "Coding Readiness",

                "value":
                    float(
                        row["coding_score"]
                    ),

                "importance":
                    "High"
            },

            {
                "indicator":
                    "Interview Readiness",

                "value":
                    float(
                        row["mock_interview_score"]
                    ),

                "importance":
                    "Medium"
            }

        ]

    }


# ============================================================
# GENERAL FACULTY NOTES - GET ALL
# ============================================================

@app.get("/api/faculty-notes")
def get_faculty_notes():

    notes = load_notes()

    notes.sort(
        key=lambda item:
            item.get("created_at", ""),
        reverse=True
    )

    return {
        "notes": notes
    }


# ============================================================
# GENERAL FACULTY NOTE - CREATE TEXT NOTE
# ============================================================

@app.post("/api/faculty-notes")
def add_faculty_note(
    note_data: FacultyNote
):

    faculty_name = (
        note_data.faculty_name
        .strip()
    )

    note_text = (
        note_data.note
        .strip()
    )

    if not faculty_name:

        raise HTTPException(
            status_code=400,
            detail="Faculty name is required"
        )

    if not note_text:

        raise HTTPException(
            status_code=400,
            detail="Note cannot be empty"
        )

    if len(note_text) > 1000:

        raise HTTPException(
            status_code=400,
            detail="Note cannot exceed 1000 characters"
        )

    notes = load_notes()

    new_note = {

        "note_id":
            str(uuid.uuid4()),

        "faculty_name":
            faculty_name,

        "note":
            note_text,

        "attachment":
            None,

        "created_at":
            datetime.now()
            .astimezone()
            .isoformat(
                timespec="seconds"
            )

    }

    notes.append(
        new_note
    )

    save_notes(
        notes
    )

    return {

        "message":
            "Faculty note added successfully",

        "note":
            new_note
    }


# ============================================================
# GENERAL FACULTY NOTE + PDF/DOCX UPLOAD
# ============================================================

@app.post("/api/faculty-notes/upload")
async def add_faculty_note_with_file(
    faculty_name: str = Form(...),
    note: str = Form(""),
    attachment: UploadFile = File(...)
):

    faculty_name = faculty_name.strip()

    note = note.strip()

    if not faculty_name:

        raise HTTPException(
            status_code=400,
            detail="Faculty name is required"
        )

    if len(note) > 1000:

        raise HTTPException(
            status_code=400,
            detail="Note cannot exceed 1000 characters"
        )

    if not attachment.filename:

        raise HTTPException(
            status_code=400,
            detail="Please select a file"
        )

    extension = validate_file_type(
        attachment.filename
    )

    safe_filename = create_safe_filename(
        attachment.filename
    )

    destination = (
        FACULTY_FILES_DIR
        / safe_filename
    )

    file_size = 0

    try:

        with open(
            destination,
            "wb"
        ) as output_file:

            while True:

                chunk = await attachment.read(
                    1024 * 1024
                )

                if not chunk:
                    break

                file_size += len(chunk)

                if file_size > MAX_FILE_SIZE:

                    output_file.close()

                    if destination.exists():
                        destination.unlink()

                    raise HTTPException(
                        status_code=413,
                        detail=(
                            "File is too large. "
                            "Maximum size is 10 MB."
                        )
                    )

                output_file.write(
                    chunk
                )

    except HTTPException:

        raise

    except Exception as error:

        if destination.exists():
            destination.unlink()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Unable to save file: {error}"
            )
        )

    finally:

        await attachment.close()

    notes = load_notes()

    new_note = {

        "note_id":
            str(uuid.uuid4()),

        "faculty_name":
            faculty_name,

        "note":
            note,

        "attachment": {

            "original_filename":
                attachment.filename,

            "stored_filename":
                safe_filename,

            "file_type":
                extension.replace(
                    ".",
                    ""
                ).upper(),

            "file_size":
                file_size,

            "file_size_mb":
                round(
                    file_size / (
                        1024 * 1024
                    ),
                    2
                ),

            "url":
                f"/faculty-files/{safe_filename}"

        },

        "created_at":
            datetime.now()
            .astimezone()
            .isoformat(
                timespec="seconds"
            )

    }

    notes.append(
        new_note
    )

    save_notes(
        notes
    )

    return {

        "message":
            "Faculty note and attachment "
            "saved successfully",

        "note":
            new_note
    }


# ============================================================
# GENERAL FACULTY NOTE - DELETE
# ============================================================

@app.delete("/api/faculty-notes/{note_id}")
def delete_faculty_note(
    note_id: str
):

    notes = load_notes()

    original_count = len(
        notes
    )

    note_to_delete = None

    remaining_notes = []

    for note in notes:

        if note.get("note_id") == note_id:

            note_to_delete = note

        else:

            remaining_notes.append(
                note
            )

    if (
        note_to_delete is None
        or len(remaining_notes)
        == original_count
    ):

        raise HTTPException(
            status_code=404,
            detail="Note not found"
        )

    # --------------------------------------------------------
    # Delete attached file
    # --------------------------------------------------------

    attachment = (
        note_to_delete.get(
            "attachment"
        )
    )

    if attachment:

        stored_filename = (
            attachment.get(
                "stored_filename"
            )
        )

        if stored_filename:

            attachment_path = (
                FACULTY_FILES_DIR
                / stored_filename
            )

            if attachment_path.exists():

                try:

                    attachment_path.unlink()

                except OSError:

                    pass

    save_notes(
        remaining_notes
    )

    return {

        "message":
            "Faculty note deleted successfully"
    }


# ============================================================
# DEPARTMENT API
# ============================================================

@app.get("/api/departments")
def departments():

    return sorted(
        df["department"]
        .unique()
        .tolist()
    )


# ============================================================
# SEGMENT API
# ============================================================

@app.get("/api/segments")
def segments():

    counts = df[
        "segment"
    ].value_counts()

    return [

        {
            "segment":
                segment,

            "count":
                int(count)
        }

        for segment, count
        in counts.items()

    ]


# ============================================================
# SERVE FACULTY PDF/DOCX FILES
# ============================================================

app.mount(
    "/faculty-files",
    StaticFiles(
        directory=str(
            FACULTY_FILES_DIR
        )
    ),
    name="faculty-files"
)


# ============================================================
# FRONTEND
# ============================================================

app.mount(
    "/",
    StaticFiles(
        directory=str(
            FRONTEND_DIR
        ),
        html=True
    ),
    name="frontend"
)