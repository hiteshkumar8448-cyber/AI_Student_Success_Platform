"""
AI Student Success Platform
Main Application Server (FastAPI)
"""

from pathlib import Path
import os
import sys
import shutil

# Ensure backend directory is in sys.path so imports work regardless of working directory
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi import FastAPI, File, UploadFile, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

# Database initialization
from database import init_db

# Modular routers
from routes import (
    auth_routes,
    student_routes,
    faculty_routes,
    intervention_routes,
    notification_routes,
    goal_routes,
    analytics_routes,
    note_and_message_routes
)

from auth import require_faculty
from storage import (
    add_progress_report,
    get_student_reports,
    get_all_reports,
    review_report
)

# ============================================================
# APP INITIALIZATION
# ============================================================

app = FastAPI(
    title="AI Student Success Platform",
    description="AI-powered Student Success & Academic Early-Warning System",
    version="3.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# LIFECYCLE EVENT
# ============================================================

@app.on_event("startup")
def on_startup():
    """Ensure database tables and seeds are initialized on start."""
    init_db()


# ============================================================
# INCLUDE MODULAR ROUTERS
# ============================================================

app.include_router(auth_routes.router)
app.include_router(student_routes.router)
app.include_router(faculty_routes.router)
app.include_router(intervention_routes.router)
app.include_router(notification_routes.router)
app.include_router(goal_routes.router)
app.include_router(analytics_routes.router)
app.include_router(note_and_message_routes.router)


# ============================================================
# DIRECTORY PATHS & FILE UPLOADS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
DATA_DIR = BASE_DIR / "data"

FACULTY_FILES_DIR = DATA_DIR / "faculty_files"
INTERVENTION_FILES_DIR = DATA_DIR / "intervention_files"

FACULTY_FILES_DIR.mkdir(parents=True, exist_ok=True)
INTERVENTION_FILES_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AI Student Success Platform",
        "version": "3.0.0",
        "database": "sqlite-shared"
    }


# ============================================================
# FILE UPLOAD & ATTACHMENT ENDPOINTS
# ============================================================

@app.post("/api/faculty-notes/upload")
def upload_faculty_file(
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None)
):
    """Save an uploaded file attachment for faculty notes."""
    require_faculty(authorization)
    filename = Path(file.filename or "attachment.dat").name
    dest = FACULTY_FILES_DIR / filename
    with open(dest, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "filename": filename,
        "url": f"/faculty-files/{filename}",
        "size": dest.stat().st_size
    }


@app.post("/api/interventions/{intervention_id}/reports")
def upload_intervention_report(
    intervention_id: str,
    title: str = "Student Progress Report",
    summary: str = "",
    student_id: str = "",
    file: UploadFile | None = File(default=None),
    authorization: str | None = Header(default=None)
):
    """Submit a progress report or proof file for an intervention."""
    filename = None
    if file and file.filename:
        filename = Path(file.filename).name
        dest = INTERVENTION_FILES_DIR / filename
        with open(dest, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

    rep = add_progress_report(
        intervention_id=intervention_id,
        student_id=student_id or "STU1001",
        title=title,
        summary=summary,
        attachment_filename=filename
    )
    return rep


@app.get("/api/reports")
def list_reports(authorization: str | None = Header(default=None)):
    """Retrieve all student progress reports."""
    require_faculty(authorization)
    return get_all_reports()


@app.get("/api/student/{student_id}/reports")
@app.get("/api/students/{student_id}/reports")
def list_student_reports(student_id: str):
    """Retrieve reports submitted by a student."""
    return get_student_reports(student_id)


@app.patch("/api/reports/{report_id}/review")
def review_student_report(
    report_id: str,
    status: str = "Approved",
    review_notes: str = "",
    authorization: str | None = Header(default=None)
):
    """Review and approve/reject a student progress report."""
    user = require_faculty(authorization)
    updated = review_report(report_id, user["user_id"], status, review_notes)
    if not updated:
        raise HTTPException(status_code=404, detail="Report not found")
    return updated


# ============================================================
# MOUNT STATIC ASSETS AND FRONTEND
# ============================================================

# Dedicated subpaths for modern modular assets
if (FRONTEND_DIR / "css").exists():
    app.mount("/css", StaticFiles(directory=str(FRONTEND_DIR / "css")), name="css")

if (FRONTEND_DIR / "js").exists():
    app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")

if (FRONTEND_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")

app.mount("/faculty-files", StaticFiles(directory=str(FACULTY_FILES_DIR)), name="faculty-files")
app.mount("/intervention-files", StaticFiles(directory=str(INTERVENTION_FILES_DIR)), name="intervention-files")


# ============================================================
# ROOT ROUTE — OPEN LOGIN PAGE FIRST
# ============================================================

@app.get("/", include_in_schema=False)
def home():
    return RedirectResponse(url="/login.html", status_code=302)


# Frontend root mount (serves login.html, student.html, faculty.html, index.html)
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
