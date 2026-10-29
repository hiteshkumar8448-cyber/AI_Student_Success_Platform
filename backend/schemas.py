"""
AI Student Success Platform
Pydantic Request & Response Schemas
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ============================================================
# AUTHENTICATION SCHEMAS
# ============================================================

class StudentLoginRequest(BaseModel):
    student_id: Optional[str] = None
    studentId: Optional[str] = None
    username: Optional[str] = None
    password: str


class FacultyLoginRequest(BaseModel):
    faculty_id: Optional[str] = None
    facultyId: Optional[str] = None
    username: Optional[str] = None
    password: str


class UnifiedLoginRequest(BaseModel):
    role: Optional[str] = None
    student_id: Optional[str] = None
    studentId: Optional[str] = None
    faculty_id: Optional[str] = None
    facultyId: Optional[str] = None
    username: Optional[str] = None
    password: str


# ============================================================
# INTERVENTION SCHEMAS
# ============================================================

class InterventionCreate(BaseModel):
    student_id: str
    title: str
    type: str = "Academic Support"
    description: str
    priority: str = "Medium"  # Critical, High, Medium, Low
    due_date: Optional[str] = None
    action_type: Optional[str] = "Mentoring Session"


class InterventionUpdate(BaseModel):
    status: Optional[str] = None  # Pending, In Progress, Completed, Resolved
    priority: Optional[str] = None
    due_date: Optional[str] = None
    description: Optional[str] = None


class InterventionRespond(BaseModel):
    response: str


# ============================================================
# FACULTY NOTES SCHEMAS
# ============================================================

class FacultyNoteCreate(BaseModel):
    title: str = "Faculty Mentoring Note"
    message: Optional[str] = None
    note: Optional[str] = None  # compatibility field
    faculty_name: Optional[str] = None


# ============================================================
# STUDENT GOALS SCHEMAS
# ============================================================

class StudentGoalCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    target_date: Optional[str] = ""
    status: str = "In Progress"  # Not Started, In Progress, Completed
    progress: int = Field(default=0, ge=0, le=100)


class StudentGoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_date: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = Field(default=None, ge=0, le=100)


# ============================================================
# MESSAGING SCHEMAS
# ============================================================

class StudentMessageCreate(BaseModel):
    message: str
    subject: Optional[str] = None


class ConversationCreate(BaseModel):
    student_id: Optional[str] = None
    subject: str = "Academic Guidance"
    message: str


class ConversationReply(BaseModel):
    message: str


class InterventionReplyCreate(BaseModel):
    message: str


# ============================================================
# STUDY MATERIAL SCHEMAS
# ============================================================

class StudyMaterialUpdate(BaseModel):
    title: Optional[str] = None
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    description: Optional[str] = None
    semester: Optional[int] = None



# ============================================================
# METRICS UPDATE SCHEMAS
# ============================================================

class StudentMetricsUpdate(BaseModel):
    cgpa: Optional[float] = None
    attendance: Optional[float] = None
    backlogs: Optional[int] = None
    assignment_completion: Optional[float] = None
    lms_activity: Optional[float] = None


# ============================================================
# AI ASSISTANT SCHEMAS
# ============================================================

class AIChatRequest(BaseModel):
    message: str
    student_id: Optional[str] = None

