# ============================================================
# AI STUDENT SUCCESS PLATFORM
# PORTAL STORAGE
# ============================================================

from pathlib import Path
from datetime import datetime
import json
import uuid


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BASE_DIR / "data"

PORTAL_DATA_FILE = DATA_DIR / "portal_data.json"

INTERVENTION_FILES_DIR = DATA_DIR / "intervention_files"


# ============================================================
# CREATE DIRECTORIES
# ============================================================

DATA_DIR.mkdir(
    parents=True,
    exist_ok=True
)

INTERVENTION_FILES_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# DEFAULT STORAGE
# ============================================================

DEFAULT_DATA = {
    "student_notes": [],
    "interventions": [],
    "reports": [],
    "notifications": []
}


# ============================================================
# DATE / TIME
# ============================================================

def current_timestamp():
    """
    Return the current local timezone-aware timestamp.
    """

    return (
        datetime.now()
        .astimezone()
        .isoformat(timespec="seconds")
    )


# ============================================================
# HELPERS
# ============================================================

def generate_id(prefix):
    """
    Generate a unique application ID.
    """

    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def normalize_id(value):
    """
    Normalize IDs for safe comparison.
    """

    return str(value or "").strip()


def normalize_text(value, default=""):
    """
    Safely convert values to cleaned strings.
    """

    if value is None:
        return default

    return str(value).strip()


def safe_progress(value, default=0):
    """
    Convert progress to an integer between 0 and 100.
    """

    try:
        value = int(value)
    except (TypeError, ValueError):
        return default

    return max(0, min(100, value))


def ensure_history(intervention):
    """
    Make sure an intervention always has a history list.
    """

    if not isinstance(
        intervention.get("history"),
        list
    ):
        intervention["history"] = []

    return intervention["history"]


def add_history_event(
    intervention,
    actor,
    actor_name,
    action,
    note="",
    metadata=None
):
    """
    Add a standardized event to intervention history.

    This history is shared by Student and Faculty views.
    """

    history = ensure_history(intervention)

    event = {
        "history_id": generate_id("HISTORY"),
        "timestamp": current_timestamp(),
        "actor": normalize_text(actor, "system"),
        "actor_name": normalize_text(
            actor_name,
            "System"
        ),
        "action": normalize_text(
            action,
            "Activity"
        ),
        "note": normalize_text(note),
        "metadata": (
            metadata
            if isinstance(metadata, dict)
            else {}
        )
    }

    history.append(event)

    return event


def copy_default_data():
    """
    Return a fresh copy of the default storage structure.
    """

    return {
        key: list(value)
        for key, value in DEFAULT_DATA.items()
    }


# ============================================================
# LOAD DATA
# ============================================================

def load_portal_data():
    """
    Load portal data from JSON.

    If the file does not exist or is corrupted,
    a clean default structure is returned.
    """

    if not PORTAL_DATA_FILE.exists():

        return copy_default_data()

    try:

        with open(
            PORTAL_DATA_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            data = json.load(file)

        if not isinstance(data, dict):

            raise ValueError(
                "Portal data must be an object"
            )

        for key in DEFAULT_DATA:

            if (
                key not in data
                or not isinstance(data[key], list)
            ):

                data[key] = []

        return data

    except (
        json.JSONDecodeError,
        OSError,
        ValueError
    ):

        return copy_default_data()


# ============================================================
# SAVE DATA
# ============================================================

def save_portal_data(data):
    """
    Safely save portal data using a temporary file.
    """

    temporary_file = (
        PORTAL_DATA_FILE.with_suffix(".tmp")
    )

    with open(
        temporary_file,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            data,
            file,
            indent=4,
            ensure_ascii=False
        )

    temporary_file.replace(
        PORTAL_DATA_FILE
    )


# ============================================================
# STUDENT NOTES
# ============================================================

def add_student_note(
    student_id,
    faculty_name,
    title,
    note
):
    """
    Add a faculty note specifically for one student.
    """

    data = load_portal_data()

    now = current_timestamp()

    new_note = {
        "note_id": generate_id("NOTE"),
        "student_id": normalize_id(student_id),
        "faculty_name": normalize_text(
            faculty_name,
            "Faculty Administrator"
        ),
        "title": normalize_text(
            title,
            "Faculty Note"
        ),
        "note": normalize_text(note),
        "created_at": now,
        "read": False
    }

    data["student_notes"].append(
        new_note
    )

    save_portal_data(data)

    return new_note


def get_student_notes(student_id):
    """
    Get all student-specific notes.
    """

    student_id = normalize_id(student_id)

    data = load_portal_data()

    notes = [
        note
        for note in data["student_notes"]
        if normalize_id(
            note.get("student_id")
        ) == student_id
    ]

    notes.sort(
        key=lambda item: item.get(
            "created_at",
            ""
        ),
        reverse=True
    )

    return notes


# ============================================================
# INTERVENTIONS
# ============================================================

def add_intervention(
    student_id,
    faculty_name,
    title,
    description,
    priority="Medium",
    due_date="",
    action_type="Academic Support",
    reason_category="General"
):
    """
    Create a new faculty intervention.

    The intervention becomes the central shared record
    connecting Faculty and Student.
    """

    data = load_portal_data()

    now = current_timestamp()

    student_id = normalize_id(student_id)

    faculty_name = normalize_text(
        faculty_name,
        "Faculty Administrator"
    )

    title = normalize_text(
        title,
        "Faculty Intervention"
    )

    description = normalize_text(
        description
    )

    priority = normalize_text(
        priority,
        "Medium"
    )

    due_date = normalize_text(
        due_date
    )

    action_type = normalize_text(
        action_type,
        "Academic Support"
    )

    reason_category = normalize_text(
        reason_category,
        "General"
    )

    intervention = {

        "intervention_id":
            generate_id("INT"),

        "student_id":
            student_id,

        "faculty_name":
            faculty_name,

        "title":
            title,

        "description":
            description,

        "priority":
            priority,

        "due_date":
            due_date,

        "action_type":
            action_type,

        "reason_category":
            reason_category,

        "status":
            "Pending",

        "progress":
            0,

        "created_at":
            now,

        "updated_at":
            now,

        "faculty_feedback":
            "",

        "student_report_submitted":
            False,

        "student_acknowledgement": {

            "viewed":
                False,

            "viewed_at":
                None,

            "response_message":
                "",

            "responded_at":
                None

        },

        "latest_report_id":
            None,

        "baseline_metrics":
            {},

        "after_metrics":
            {},

        "outcome":
            "",

        "history": []

    }

    add_history_event(
        intervention=intervention,
        actor="faculty",
        actor_name=faculty_name,
        action="Intervention Assigned",
        note=(
            f"Assigned: {title} "
            f"({action_type})"
        ),
        metadata={
            "priority": priority,
            "reason_category": reason_category,
            "due_date": due_date
        }
    )

    data["interventions"].append(
        intervention
    )

    save_portal_data(data)

    # --------------------------------------------------------
    # Notify student.
    #
    # IMPORTANT:
    # This is the ONLY notification generated here.
    # main.py should not create a second notification.
    # --------------------------------------------------------

    add_notification(
        user_type="student",
        user_id=student_id,
        title=f"Faculty Action: {title}",
        message=(
            f"{faculty_name} assigned an intervention "
            f"({action_type}): "
            f"{description[:100]}"
        ),
        notification_type="intervention"
    )

    return intervention


def get_student_interventions(student_id):
    """
    Return interventions belonging to one student.
    """

    student_id = normalize_id(student_id)

    data = load_portal_data()

    results = [
        item
        for item in data["interventions"]
        if normalize_id(
            item.get("student_id")
        ) == student_id
    ]

    results.sort(
        key=lambda item: item.get(
            "created_at",
            ""
        ),
        reverse=True
    )

    return results


def get_all_interventions():
    """
    Return all interventions for Faculty.
    """

    data = load_portal_data()

    results = list(
        data["interventions"]
    )

    results.sort(
        key=lambda item: item.get(
            "created_at",
            ""
        ),
        reverse=True
    )

    return results


def find_intervention(
    intervention_id
):
    """
    Find an intervention and return the loaded
    data object so callers can modify it safely.
    """

    intervention_id = normalize_id(
        intervention_id
    )

    data = load_portal_data()

    for intervention in data["interventions"]:

        if normalize_id(
            intervention.get(
                "intervention_id"
            )
        ) == intervention_id:

            return intervention, data

    return None, data


# ============================================================
# UPDATE INTERVENTION
# ============================================================

def update_intervention(
    intervention_id,
    **updates
):
    """
    Update an existing intervention.

    This function also creates history entries for
    meaningful Faculty changes.
    """

    intervention, data = find_intervention(
        intervention_id
    )

    if intervention is None:
        return None

    allowed_fields = {
        "title",
        "description",
        "priority",
        "due_date",
        "action_type",
        "reason_category",
        "status",
        "progress",
        "faculty_feedback",
        "student_report_submitted",
        "student_acknowledgement",
        "history",
        "baseline_metrics",
        "after_metrics",
        "outcome",
        "latest_report_id"
    }

    old_values = {
        key: intervention.get(key)
        for key in allowed_fields
    }

    changed_fields = []

    for key, value in updates.items():

        if key not in allowed_fields:
            continue

        if key == "progress":

            value = safe_progress(value)

        intervention[key] = value

        if old_values.get(key) != value:

            changed_fields.append(key)

    now = current_timestamp()

    if changed_fields:

        add_history_event(
            intervention=intervention,
            actor="faculty",
            actor_name=normalize_text(
                updates.get(
                    "_actor_name",
                    "Faculty Administrator"
                ),
                "Faculty Administrator"
            ),
            action="Intervention Updated",
            note=(
                "Updated fields: "
                + ", ".join(changed_fields)
            ),
            metadata={
                "changed_fields":
                    changed_fields
            }
        )

    intervention["updated_at"] = now

    save_portal_data(data)

    return intervention


# ============================================================
# STUDENT ACKNOWLEDGEMENT
# ============================================================

def acknowledge_intervention(
    intervention_id,
    student_id
):
    """
    Student marks an intervention as viewed.
    """

    intervention, data = find_intervention(
        intervention_id
    )

    if intervention is None:
        return None

    student_id = normalize_id(
        student_id
    )

    if normalize_id(
        intervention.get("student_id")
    ) != student_id:

        raise PermissionError(
            "Intervention belongs to another student."
        )

    now = current_timestamp()

    acknowledgement = (
        intervention.get(
            "student_acknowledgement"
        )
    )

    if not isinstance(
        acknowledgement,
        dict
    ):

        acknowledgement = {}

    first_view = not bool(
        acknowledgement.get("viewed")
    )

    acknowledgement["viewed"] = True

    if not acknowledgement.get(
        "viewed_at"
    ):

        acknowledgement["viewed_at"] = now

    intervention[
        "student_acknowledgement"
    ] = acknowledgement

    if intervention.get(
        "status"
    ) in {
        "Pending",
        "Assigned"
    }:

        intervention["status"] = "Acknowledged"

    if first_view:

        add_history_event(
            intervention=intervention,
            actor="student",
            actor_name=f"Student {student_id}",
            action="Intervention Viewed",
            note=(
                "Student viewed and acknowledged "
                "the intervention."
            )
        )

    intervention["updated_at"] = now

    save_portal_data(data)

    if first_view:

        add_notification(
            user_type="faculty",
            user_id="FACULTY001",
            title="Student Viewed Intervention",
            message=(
                f"Student {student_id} acknowledged "
                f"intervention: "
                f"{intervention.get('title', '')}"
            ),
            notification_type="info"
        )

    return intervention


# ============================================================
# STUDENT RESPONSE
# ============================================================

def respond_to_intervention(
    intervention_id,
    student_id,
    message,
    progress=None,
    new_status="Responded"
):
    """
    Student sends a direct response to Faculty.
    """

    intervention, data = find_intervention(
        intervention_id
    )

    if intervention is None:
        return None

    student_id = normalize_id(
        student_id
    )

    if normalize_id(
        intervention.get("student_id")
    ) != student_id:

        raise PermissionError(
            "Intervention belongs to another student."
        )

    message = normalize_text(
        message
    )

    if not message:

        raise ValueError(
            "Student response cannot be empty."
        )

    now = current_timestamp()

    acknowledgement = (
        intervention.get(
            "student_acknowledgement"
        )
    )

    if not isinstance(
        acknowledgement,
        dict
    ):

        acknowledgement = {}

    acknowledgement["viewed"] = True

    if not acknowledgement.get(
        "viewed_at"
    ):

        acknowledgement["viewed_at"] = now

    acknowledgement[
        "response_message"
    ] = message

    acknowledgement[
        "responded_at"
    ] = now

    intervention[
        "student_acknowledgement"
    ] = acknowledgement

    if progress is not None:

        intervention[
            "progress"
        ] = safe_progress(
            progress,
            intervention.get(
                "progress",
                0
            )
        )

    status = normalize_text(
        new_status,
        "Responded"
    )

    intervention["status"] = status

    add_history_event(
        intervention=intervention,
        actor="student",
        actor_name=f"Student {student_id}",
        action=f"Student Response ({status})",
        note=message,
        metadata={
            "progress":
                intervention.get(
                    "progress",
                    0
                )
        }
    )

    intervention["updated_at"] = now

    save_portal_data(data)

    add_notification(
        user_type="faculty",
        user_id="FACULTY001",
        title="New Student Response",
        message=(
            f"Student {student_id} responded to "
            f"'{intervention.get('title', '')}': "
            f"{message[:100]}"
        ),
        notification_type="student_response"
    )

    return intervention


# ============================================================
# FACULTY REVIEW OF INTERVENTION
# ============================================================

def review_intervention_by_faculty(
    intervention_id,
    faculty_name,
    feedback,
    status="Completed"
):
    """
    Faculty reviews a student's intervention response.
    """

    intervention, data = find_intervention(
        intervention_id
    )

    if intervention is None:
        return None

    faculty_name = normalize_text(
        faculty_name,
        "Faculty Administrator"
    )

    feedback = normalize_text(
        feedback
    )

    status = normalize_text(
        status,
        "Completed"
    )

    now = current_timestamp()

    intervention[
        "faculty_feedback"
    ] = feedback

    intervention[
        "status"
    ] = status

    intervention[
        "updated_at"
    ] = now

    if status.lower() == "completed":

        intervention["progress"] = 100

    add_history_event(
        intervention=intervention,
        actor="faculty",
        actor_name=faculty_name,
        action=f"Faculty Review ({status})",
        note=feedback,
        metadata={
            "status": status,
            "progress":
                intervention.get(
                    "progress",
                    0
                )
        }
    )

    save_portal_data(data)

    student_id = normalize_id(
        intervention.get("student_id")
    )

    if student_id:

        add_notification(
            user_type="student",
            user_id=student_id,
            title="Faculty Reviewed Intervention",
            message=(
                f"Faculty reviewed "
                f"'{intervention.get('title', '')}'. "
                f"Status: {status}."
            ),
            notification_type="faculty_feedback"
        )

    return intervention


# ============================================================
# PROGRESS REPORTS
# ============================================================

def add_progress_report(
    student_id,
    intervention_id,
    progress,
    completed_work,
    difficulties,
    next_steps,
    attachment
):
    """
    Store a Student progress report and update the
    corresponding intervention in the same data object.

    This prevents stale-data overwrites.
    """

    data = load_portal_data()

    student_id = normalize_id(
        student_id
    )

    intervention_id = normalize_id(
        intervention_id
    )

    intervention = None

    for item in data["interventions"]:

        if normalize_id(
            item.get("intervention_id")
        ) == intervention_id:

            intervention = item
            break

    if intervention is None:

        raise ValueError(
            "Intervention not found."
        )

    if normalize_id(
        intervention.get("student_id")
    ) != student_id:

        raise PermissionError(
            "Intervention belongs to another student."
        )

    progress = safe_progress(
        progress
    )

    now = current_timestamp()

    report = {

        "report_id":
            generate_id("REPORT"),

        "student_id":
            student_id,

        "intervention_id":
            intervention_id,

        "progress":
            progress,

        "completed_work":
            normalize_text(
                completed_work
            ),

        "difficulties":
            normalize_text(
                difficulties
            ),

        "next_steps":
            normalize_text(
                next_steps
            ),

        "attachment":
            attachment,

        "status":
            "Submitted",

        "faculty_feedback":
            "",

        "created_at":
            now,

        "reviewed_at":
            None

    }

    data["reports"].append(
        report
    )

    # --------------------------------------------------------
    # Update intervention using the SAME loaded data object.
    # --------------------------------------------------------

    intervention["progress"] = progress

    intervention[
        "status"
    ] = "Report Submitted"

    intervention[
        "student_report_submitted"
    ] = True

    intervention[
        "latest_report_id"
    ] = report["report_id"]

    intervention[
        "updated_at"
    ] = now

    acknowledgement = (
        intervention.get(
            "student_acknowledgement"
        )
    )

    if not isinstance(
        acknowledgement,
        dict
    ):

        acknowledgement = {}

    acknowledgement["viewed"] = True

    if not acknowledgement.get(
        "viewed_at"
    ):

        acknowledgement["viewed_at"] = now

    intervention[
        "student_acknowledgement"
    ] = acknowledgement

    add_history_event(
        intervention=intervention,
        actor="student",
        actor_name=f"Student {student_id}",
        action="Progress Report Submitted",
        note=(
            "Student submitted a progress report."
        ),
        metadata={
            "report_id":
                report["report_id"],

            "progress":
                progress
        }
    )

    save_portal_data(data)

    return report


# ============================================================
# GET STUDENT REPORTS
# ============================================================

def get_student_reports(
    student_id
):
    """
    Return all reports belonging to a student.
    """

    student_id = normalize_id(
        student_id
    )

    data = load_portal_data()

    reports = [
        report
        for report in data["reports"]
        if normalize_id(
            report.get("student_id")
        ) == student_id
    ]

    reports.sort(
        key=lambda item: item.get(
            "created_at",
            ""
        ),
        reverse=True
    )

    return reports


# ============================================================
# GET ALL REPORTS
# ============================================================

def get_all_reports():
    """
    Return all reports for Faculty.
    """

    data = load_portal_data()

    reports = list(
        data["reports"]
    )

    reports.sort(
        key=lambda item: item.get(
            "created_at",
            ""
        ),
        reverse=True
    )

    return reports


# ============================================================
# FIND REPORT
# ============================================================

def find_report(
    report_id
):
    """
    Find a report and its loaded data object.
    """

    report_id = normalize_id(
        report_id
    )

    data = load_portal_data()

    for report in data["reports"]:

        if normalize_id(
            report.get("report_id")
        ) == report_id:

            return report, data

    return None, data


# ============================================================
# REVIEW REPORT
# ============================================================

def review_report(
    report_id,
    status,
    faculty_feedback,
    faculty_name="Faculty Administrator"
):
    """
    Faculty reviews a Student report.

    IMPORTANT:
    The report and its intervention are modified
    inside the SAME loaded data object.
    """

    report, data = find_report(
        report_id
    )

    if report is None:
        return None

    status = normalize_text(
        status
    )

    faculty_feedback = normalize_text(
        faculty_feedback
    )

    faculty_name = normalize_text(
        faculty_name,
        "Faculty Administrator"
    )

    now = current_timestamp()

    report["status"] = status

    report[
        "faculty_feedback"
    ] = faculty_feedback

    report[
        "reviewed_at"
    ] = now

    intervention_id = normalize_id(
        report.get(
            "intervention_id"
        )
    )

    intervention = None

    for item in data["interventions"]:

        if normalize_id(
            item.get("intervention_id")
        ) == intervention_id:

            intervention = item
            break

    if intervention is not None:

        intervention[
            "faculty_feedback"
        ] = faculty_feedback

        if status == "Completed":

            intervention[
                "status"
            ] = "Completed"

            intervention[
                "progress"
            ] = 100

        elif status == "Needs More Work":

            intervention[
                "status"
            ] = "Needs More Work"

            intervention[
                "progress"
            ] = safe_progress(
                report.get(
                    "progress",
                    0
                )
            )

        elif status == "Under Review":

            intervention[
                "status"
            ] = "Under Review"

        intervention[
            "updated_at"
        ] = now

        add_history_event(
            intervention=intervention,
            actor="faculty",
            actor_name=faculty_name,
            action=f"Report Reviewed ({status})",
            note=faculty_feedback,
            metadata={
                "report_id":
                    report_id,

                "status":
                    status,

                "progress":
                    intervention.get(
                        "progress",
                        0
                    )
            }
        )

    save_portal_data(data)

    return report


# ============================================================
# NOTIFICATIONS
# ============================================================

def add_notification(
    user_type,
    user_id,
    title,
    message,
    notification_type="info"
):
    """
    Add a notification for either Student or Faculty.
    """

    data = load_portal_data()

    notification = {

        "notification_id":
            generate_id("NOTIFY"),

        "user_type":
            normalize_text(
                user_type
            ).lower(),

        "user_id":
            normalize_id(
                user_id
            ),

        "title":
            normalize_text(
                title
            ),

        "message":
            normalize_text(
                message
            ),

        "type":
            normalize_text(
                notification_type,
                "info"
            ),

        "read":
            False,

        "created_at":
            current_timestamp()

    }

    data[
        "notifications"
    ].append(
        notification
    )

    save_portal_data(data)

    return notification


def get_notifications(
    user_type,
    user_id
):
    """
    Get notifications for a specific user.
    """

    user_type = normalize_text(
        user_type
    ).lower()

    user_id = normalize_id(
        user_id
    )

    data = load_portal_data()

    notifications = [

        notification

        for notification
        in data["notifications"]

        if (
            normalize_text(
                notification.get(
                    "user_type"
                )
            ).lower()
            == user_type

            and

            normalize_id(
                notification.get(
                    "user_id"
                )
            )
            == user_id
        )

    ]

    notifications.sort(
        key=lambda item:
            item.get(
                "created_at",
                ""
            ),
        reverse=True
    )

    return notifications


def mark_notification_read(
    notification_id,
    user_type,
    user_id
):
    """
    Mark a notification as read only if it belongs
    to the authenticated user.
    """

    data = load_portal_data()

    notification_id = normalize_id(
        notification_id
    )

    user_type = normalize_text(
        user_type
    ).lower()

    user_id = normalize_id(
        user_id
    )

    for notification in data[
        "notifications"
    ]:

        if (

            normalize_id(
                notification.get(
                    "notification_id"
                )
            )
            == notification_id

            and

            normalize_text(
                notification.get(
                    "user_type"
                )
            ).lower()
            == user_type

            and

            normalize_id(
                notification.get(
                    "user_id"
                )
            )
            == user_id

        ):

            notification[
                "read"
            ] = True

            save_portal_data(data)

            return notification

    return None