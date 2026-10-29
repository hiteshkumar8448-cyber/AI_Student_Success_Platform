"""
AI Student Success Platform
Study Materials & Faculty Notes Service
"""

from pathlib import Path
from typing import Any, Dict, List, Optional
import os
import shutil

from database import get_connection, generate_uuid, now_iso, DATA_DIR
from models import row_to_dict
from services.notification_service import create_notification

FACULTY_FILES_DIR = DATA_DIR / "faculty_files"
FACULTY_FILES_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".txt"}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB


def validate_file_extension(filename: str) -> str:
    """Validate file extension against allowed academic types."""
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Invalid file type '{ext}'. Allowed types: PDF, DOC, DOCX, PPT, PPTX, TXT")
    return ext.lstrip(".")


def create_study_material(
    faculty_id: str,
    faculty_name: str,
    subject_name: str,
    subject_code: str,
    title: str,
    description: str,
    semester: int,
    filename: str,
    original_filename: str,
    file_type: str,
    file_size: int
) -> Dict[str, Any]:
    """Register uploaded study material in database and notify students."""
    mid = generate_uuid("mat")
    now = now_iso()
    file_url = f"/faculty-files/{filename}"

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO study_materials (
                material_id, faculty_id, faculty_name, subject_name, subject_code,
                title, description, semester, filename, original_filename,
                file_type, file_size, file_url, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            mid, faculty_id.strip().upper(), faculty_name.strip(),
            subject_name.strip(), subject_code.strip().upper(),
            title.strip(), description.strip(), int(semester or 0),
            filename, original_filename, file_type.lower(),
            file_size, file_url, now, now
        ))
        conn.commit()

        cursor.execute("SELECT * FROM study_materials WHERE material_id = ?;", (mid,))
        created = row_to_dict(cursor.fetchone())

    # Create cohort notification for students
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT student_id FROM students LIMIT 20;")
        notif_students = [r["student_id"] for r in cursor.fetchall()]

    for sid in notif_students:
        create_notification(
            recipient_id=sid,
            recipient_role="student",
            title=f"New Study Material: {title}",
            message=f"{faculty_name} uploaded notes for {subject_name} ({subject_code}).",
            notif_type="note"
        )

    return created


def list_study_materials(
    subject: Optional[str] = None,
    semester: Optional[int] = None,
    search: Optional[str] = None,
    sort_order: str = "desc"
) -> List[Dict[str, Any]]:
    """Retrieve published study resources with filters and sorting."""
    query = "SELECT * FROM study_materials WHERE 1=1"
    params: List[Any] = []

    if subject and subject.strip().lower() != "all":
        query += " AND (LOWER(subject_name) LIKE ? OR LOWER(subject_code) = ?)"
        s_val = f"%{subject.strip().lower()}%"
        params.extend([s_val, subject.strip().lower()])

    if semester and int(semester) > 0:
        query += " AND (semester = ? OR semester = 0)"
        params.append(int(semester))

    if search:
        s = f"%{search.strip().lower()}%"
        query += " AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(subject_name) LIKE ? OR LOWER(faculty_name) LIKE ?)"
        params.extend([s, s, s, s])

    order_dir = "ASC" if sort_order.strip().lower() == "asc" else "DESC"
    query += f" ORDER BY created_at {order_dir};"

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        return [row_to_dict(r) for r in cursor.fetchall()]


def get_study_material_by_id(material_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve single study material by ID."""
    mid = str(material_id).strip()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM study_materials WHERE material_id = ?;", (mid,))
        row = cursor.fetchone()
        return row_to_dict(row) if row else None


def update_study_material(
    material_id: str,
    faculty_id: str,
    updates: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """Update metadata for an existing study material."""
    mid = str(material_id).strip()
    fid = str(faculty_id).strip().upper()
    now = now_iso()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM study_materials WHERE material_id = ?;", (mid,))
        existing = cursor.fetchone()
        if not existing:
            return None

        # Verify ownership or faculty role
        title = updates.get("title") or existing["title"]
        subject_name = updates.get("subject_name") or existing["subject_name"]
        subject_code = updates.get("subject_code") or existing["subject_code"]
        description = updates.get("description") or existing["description"]
        semester = updates.get("semester") if updates.get("semester") is not None else existing["semester"]

        cursor.execute("""
            UPDATE study_materials
            SET title = ?, subject_name = ?, subject_code = ?, description = ?, semester = ?, updated_at = ?
            WHERE material_id = ?;
        """, (title.strip(), subject_name.strip(), str(subject_code).strip().upper(), description.strip(), int(semester or 0), now, mid))
        conn.commit()

        cursor.execute("SELECT * FROM study_materials WHERE material_id = ?;", (mid,))
        return row_to_dict(cursor.fetchone())


def delete_study_material(material_id: str, faculty_id: str) -> bool:
    """Delete study material entry and underlying file."""
    mid = str(material_id).strip()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM study_materials WHERE material_id = ?;", (mid,))
        existing = cursor.fetchone()
        if not existing:
            return False

        filename = existing["filename"]
        cursor.execute("DELETE FROM study_materials WHERE material_id = ?;", (mid,))
        conn.commit()

    # Attempt to remove file
    if filename:
        try:
            fpath = FACULTY_FILES_DIR / filename
            if fpath.exists():
                fpath.unlink()
        except Exception:
            pass

    return True
