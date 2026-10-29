"""
AI Student Success Platform
Two-Way Messaging, Conversations & Study Materials Routes
"""

from pathlib import Path
from typing import Optional
import os
import shutil
import uuid

from fastapi import APIRouter, Header, HTTPException, Query, Form, File, UploadFile
from auth import (
    require_faculty,
    require_student,
    require_same_student_or_faculty,
    get_authenticated_user
)
from schemas import (
    FacultyNoteCreate,
    StudentMessageCreate,
    ConversationCreate,
    ConversationReply,
    StudyMaterialUpdate
)
from services.note_service import add_faculty_note, get_notes_for_student
from services.message_service import (
    send_message,
    get_messages_for_student,
    create_conversation,
    list_conversations,
    get_conversation_by_id,
    reply_to_conversation
)
from services.study_resource_service import (
    create_study_material,
    list_study_materials,
    get_study_material_by_id,
    update_study_material,
    delete_study_material,
    validate_file_extension,
    FACULTY_FILES_DIR,
    MAX_FILE_SIZE_BYTES
)

router = APIRouter(prefix="/api", tags=["Notes & Messages"])


# ============================================================
# TWO-WAY CONVERSATION THREAD ROUTES
# ============================================================

@router.get("/conversations")
def get_conversations_route(
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    authorization: str | None = Header(default=None)
):
    """
    List two-way conversations.
    Students see their own conversations; Faculty see all student conversations with unread indicators.
    """
    user = get_authenticated_user(authorization)
    role = user["role"]
    uid = user["user_id"]
    status_str = status if isinstance(status, str) else None
    search_str = search if isinstance(search, str) else None
    return list_conversations(user_id=uid, role=role, status=status_str, search=search_str)


@router.post("/conversations")
def create_conversation_route(
    data: ConversationCreate,
    authorization: str | None = Header(default=None)
):
    """Start a new two-way conversation thread."""
    user = get_authenticated_user(authorization)
    role = user["role"]
    uid = user["user_id"]

    student_id = uid if role == "student" else (data.student_id or "").strip().upper()
    if not student_id:
        raise HTTPException(status_code=400, detail="Student ID is required to start a conversation")

    faculty_id = "FACULTY001" if role == "student" else uid
    sender_name = "Faculty Mentor" if role == "faculty" else f"Student {student_id}"

    if not data.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    conv = create_conversation(
        student_id=student_id,
        faculty_id=faculty_id,
        subject=data.subject or "Academic Guidance",
        initial_message=data.message,
        sender_role=role,
        sender_name=sender_name
    )
    return conv


@router.get("/conversations/{conversation_id}")
def get_conversation_detail_route(
    conversation_id: str,
    authorization: str | None = Header(default=None)
):
    """
    Retrieve full conversation thread and messages.
    Enforces privacy: Student A cannot view Student B's conversation.
    Marks messages received by user as read.
    """
    user = get_authenticated_user(authorization)
    role = user["role"]
    uid = user["user_id"]

    conv = get_conversation_by_id(conversation_id, user_id=uid, role=role, mark_as_read=True)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if role == "student" and conv["student_id"] != uid.upper():
        raise HTTPException(status_code=403, detail="Forbidden: You cannot access another student's conversation")

    return conv


@router.post("/conversations/{conversation_id}/reply")
def reply_conversation_route(
    conversation_id: str,
    data: ConversationReply,
    authorization: str | None = Header(default=None)
):
    """
    Send a reply in an existing conversation thread.
    Enforces privacy and notifications.
    """
    user = get_authenticated_user(authorization)
    role = user["role"]
    uid = user["user_id"]
    sender_name = "Faculty Mentor" if role == "faculty" else f"Student {uid}"

    if not data.message.strip():
        raise HTTPException(status_code=400, detail="Reply message cannot be empty")

    try:
        reply = reply_to_conversation(
            conversation_id=conversation_id,
            sender_id=uid,
            sender_role=role,
            sender_name=sender_name,
            message=data.message
        )
        return {
            "message": "Reply sent successfully",
            "reply": reply,
            "conversation": get_conversation_by_id(conversation_id, user_id=uid, role=role, mark_as_read=False)
        }
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


# ============================================================
# LEGACY STUDENT MESSAGES COMPATIBILITY
# ============================================================

@router.get("/students/{student_id}/messages")
@router.get("/student/{student_id}/messages")
def get_student_messages_route(student_id: str, authorization: str | None = Header(default=None)):
    """Retrieve communication thread between faculty and student."""
    if authorization:
        require_same_student_or_faculty(authorization, student_id)
    return get_messages_for_student(student_id)


@router.post("/students/{student_id}/messages")
@router.post("/student/{student_id}/messages")
def post_student_message_route(
    student_id: str,
    data: StudentMessageCreate,
    authorization: str | None = Header(default=None)
):
    """Send a message/reply in the student-faculty communication thread."""
    user = get_authenticated_user(authorization)
    role = user["role"]
    uid = user["user_id"]

    if role == "student" and uid.upper() != student_id.upper():
        raise HTTPException(status_code=403, detail="Forbidden")

    faculty_id = uid if role == "faculty" else "FACULTY001"
    sender_name = "Faculty Mentor" if role == "faculty" else f"Student {uid}"

    return send_message(
        student_id=student_id,
        faculty_id=faculty_id,
        sender_role=role,
        sender_name=sender_name,
        message=data.message,
        subject=data.subject or "Academic Guidance"
    )


# ============================================================
# FACULTY OBSERVATION NOTES (PRIVATE STUDENT PROFILE NOTES)
# ============================================================

@router.get("/students/{student_id}/notes")
@router.get("/student/{student_id}/notes")
def get_student_notes_route(student_id: str, authorization: str | None = Header(default=None)):
    """Retrieve private faculty observation notes for a student."""
    if authorization:
        require_same_student_or_faculty(authorization, student_id)
    return get_notes_for_student(student_id)


@router.post("/students/{student_id}/notes")
@router.post("/student/{student_id}/notes")
def create_student_note_route(
    student_id: str,
    data: FacultyNoteCreate,
    authorization: str | None = Header(default=None)
):
    """Faculty adds an observation note for a student."""
    user = require_faculty(authorization)
    msg = data.message or data.note or ""
    if not msg:
        raise HTTPException(status_code=400, detail="Note message is required")

    return add_faculty_note(
        faculty_id=user["user_id"],
        student_id=student_id,
        title=data.title,
        message=msg
    )


# ============================================================
# STUDY MATERIALS & FACULTY RESOURCES
# ============================================================

@router.post("/faculty/notes")
@router.post("/study-materials")
async def upload_study_material_endpoint(
    title: str = Form(...),
    subject_name: str = Form(...),
    subject_code: str = Form(""),
    description: str = Form(""),
    semester: int = Form(0),
    faculty_name: Optional[str] = Form(None),
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None)
):
    """
    Upload study materials for students.
    Enforces faculty authentication, file type validation, and size limits.
    """
    user = require_faculty(authorization)
    fac_id = user["user_id"]
    fac_name = faculty_name or user.get("user_name") or "Faculty Instructor"

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="File is required")

    try:
        file_ext = validate_file_extension(file.filename)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    # Read and validate size
    content = await file.read()
    file_size = len(content)
    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds maximum allowed size of 25MB")

    # Sanitize and generate unique disk filename
    safe_stem = "".join(c for c in Path(file.filename).stem if c.isalnum() or c in ("-", "_"))[:40]
    unique_filename = f"{safe_stem}_{uuid.uuid4().hex[:8]}.{file_ext}"
    dest_path = FACULTY_FILES_DIR / unique_filename

    with open(dest_path, "wb") as f_out:
        f_out.write(content)

    created = create_study_material(
        faculty_id=fac_id,
        faculty_name=fac_name,
        subject_name=subject_name,
        subject_code=subject_code,
        title=title,
        description=description,
        semester=semester,
        filename=unique_filename,
        original_filename=file.filename,
        file_type=file_ext,
        file_size=file_size
    )

    return created


@router.get("/notes")
@router.get("/study-materials")
@router.get("/faculty/notes")
def list_study_materials_endpoint(
    subject: Optional[str] = Query(default=None),
    semester: Optional[int] = Query(default=None),
    search: Optional[str] = Query(default=None),
    sort: str = Query(default="desc"),
    authorization: str | None = Header(default=None)
):
    """
    Retrieve published study resources for students and faculty.
    Accessible to all authenticated users.
    """
    if authorization:
        get_authenticated_user(authorization)
    sub_str = subject if isinstance(subject, str) else None
    search_str = search if isinstance(search, str) else None
    sort_str = sort if isinstance(sort, str) else "desc"
    sem_int = int(semester) if isinstance(semester, int) or (isinstance(semester, str) and semester.isdigit()) else None
    return list_study_materials(subject=sub_str, semester=sem_int, search=search_str, sort_order=sort_str)


@router.get("/faculty/notes/{resource_id}")
@router.get("/study-materials/{resource_id}")
def get_study_material_endpoint(
    resource_id: str,
    authorization: str | None = Header(default=None)
):
    """Retrieve single study material by ID."""
    if authorization:
        get_authenticated_user(authorization)
    mat = get_study_material_by_id(resource_id)
    if not mat:
        raise HTTPException(status_code=404, detail="Study material not found")
    return mat


@router.put("/faculty/notes/{resource_id}")
@router.put("/study-materials/{resource_id}")
def update_study_material_endpoint(
    resource_id: str,
    data: StudyMaterialUpdate,
    authorization: str | None = Header(default=None)
):
    """Update metadata for a study resource. Faculty only."""
    user = require_faculty(authorization)
    updated = update_study_material(
        material_id=resource_id,
        faculty_id=user["user_id"],
        updates=data.model_dump(exclude_unset=True)
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Study material not found")
    return updated


@router.delete("/faculty/notes/{resource_id}")
@router.delete("/study-materials/{resource_id}")
def delete_study_material_endpoint(
    resource_id: str,
    authorization: str | None = Header(default=None)
):
    """Delete a study resource and file. Faculty only."""
    user = require_faculty(authorization)
    success = delete_study_material(material_id=resource_id, faculty_id=user["user_id"])
    if not success:
        raise HTTPException(status_code=404, detail="Study material not found")
    return {"message": "Study material deleted successfully", "resource_id": resource_id}
