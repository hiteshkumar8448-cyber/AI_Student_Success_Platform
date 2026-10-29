# ============================================================
# AI STUDENT SUCCESS PLATFORM
# Authentication and Session Management
# ============================================================

from pathlib import Path
from datetime import datetime, timezone
import base64
import hashlib
import hmac
import os
import sys
import time

from fastapi import HTTPException

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


# ============================================================
# PROJECT SETTINGS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

AUTH_SECRET = os.getenv(
    "AUTH_SECRET",
    "AI_STUDENT_SUCCESS_PLATFORM_SECRET_2026"
).encode("utf-8")

SESSION_LIFETIME = 8 * 60 * 60  # 8 hours


# ============================================================
# SECURE PASSWORD HASHING (PBKDF2-HMAC-SHA256)
# ============================================================

def hash_password(password: str) -> str:
    """
    Hash a password using PBKDF2-HMAC-SHA256 with a unique random salt.
    """
    salt = os.urandom(16).hex()
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000
    ).hex()
    return f"pbkdf2:sha256:100000${salt}${key}"


def verify_password(plain_password: str, password_hash: str) -> bool:
    """
    Verify plain password against stored pbkdf2 hash, with backwards-compatible
    fallback for case-insensitive initial demo passwords.
    """
    if not plain_password or not password_hash:
        return False

    if str(password_hash).startswith("pbkdf2:sha256:"):
        try:
            parts = password_hash.split("$")
            iterations = int(parts[0].split(":")[2])
            salt = parts[1]
            key = parts[2]
            computed = hashlib.pbkdf2_hmac(
                "sha256",
                plain_password.encode("utf-8"),
                salt.encode("utf-8"),
                iterations
            ).hex()
            if hmac.compare_digest(computed, key):
                return True
            # Case-insensitive retry for convenient student ID typing
            computed_upper = hashlib.pbkdf2_hmac(
                "sha256",
                plain_password.upper().encode("utf-8"),
                salt.encode("utf-8"),
                iterations
            ).hex()
            return hmac.compare_digest(computed_upper, key)
        except Exception:
            return False

    # Plain text / fallback compare
    return (
        hmac.compare_digest(plain_password.strip().upper(), str(password_hash).strip().upper())
    )


# ============================================================
# DATABASE CREDENTIAL CHECKS
# ============================================================

def verify_student_credentials(student_id: str, password: str, student_exists_function=None) -> bool:
    """
    Verify student login against the database.
    """
    from database import get_connection

    sid = str(student_id or "").strip().upper()
    pwd = str(password or "").strip()

    if not sid or not pwd:
        return False

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT password_hash FROM students WHERE student_id = ?;", (sid,))
        row = cursor.fetchone()
        if row:
            return verify_password(pwd, row["password_hash"])

    # Fallback to function if passed
    if student_exists_function:
        student = student_exists_function(sid)
        if student is not None:
            return sid.upper() == pwd.upper()

    return False


def verify_faculty_credentials(faculty_id: str, password: str) -> bool:
    """
    Verify faculty login against the database.
    """
    from database import get_connection

    fid = str(faculty_id or "").strip().upper()
    pwd = str(password or "").strip()

    if not fid or not pwd:
        return False

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT password_hash FROM faculty WHERE faculty_id = ?;", (fid,))
        row = cursor.fetchone()
        if row:
            return verify_password(pwd, row["password_hash"])

    # Fallback for default demo faculty accounts if db check had issues
    if fid in {"FACULTY001", "FACULTY002"} and pwd.upper() == fid:
        return True

    return False


# ============================================================
# TOKEN CREATION & VERIFICATION
# ============================================================

def create_session_token(role: str, user_id: str) -> str:
    """
    Create a cryptographically signed session token.
    """
    role = str(role).strip().lower()
    user_id = str(user_id).strip().upper()
    expires_at = int(time.time()) + SESSION_LIFETIME

    payload = f"{role}:{user_id}:{expires_at}"
    signature = hmac.new(
        AUTH_SECRET,
        payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    raw_token = f"{payload}:{signature}"
    return base64.urlsafe_b64encode(raw_token.encode("utf-8")).decode("utf-8")


def verify_session_token(token: str) -> dict:
    """
    Verify token signature, expiry and format.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        decoded = base64.urlsafe_b64decode(token.encode("utf-8")).decode("utf-8")
        parts = decoded.split(":", 3)

        if len(parts) != 4:
            raise ValueError("Invalid token format")

        role, user_id, expires_at_str, signature = parts
        expires_at = int(expires_at_str)

        payload = f"{role}:{user_id}:{expires_at}"
        expected_sig = hmac.new(
            AUTH_SECRET,
            payload.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_sig):
            raise HTTPException(status_code=401, detail="Invalid session token")

        if int(time.time()) > expires_at:
            raise HTTPException(status_code=401, detail="Session expired")

        if role not in {"student", "faculty"}:
            raise HTTPException(status_code=401, detail="Invalid session role")

        return {
            "role": role,
            "user_id": user_id,
            "expires_at": expires_at
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session token")


def extract_bearer_token(authorization: str | None) -> str:
    """Extract token from Authorization: Bearer <token>."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication token required")

    prefix = "Bearer "
    if not authorization.startswith(prefix):
        raise HTTPException(status_code=401, detail="Invalid authorization header format")

    token = authorization[len(prefix):].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token required")

    return token


def get_authenticated_user(authorization: str | None) -> dict:
    """Verify Authorization header and return user dict."""
    token = extract_bearer_token(authorization)
    return verify_session_token(token)


def require_student(authorization: str | None) -> dict:
    """Enforce that caller has student role."""
    user = get_authenticated_user(authorization)
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    return user


def require_faculty(authorization: str | None) -> dict:
    """Enforce that caller has faculty role."""
    user = get_authenticated_user(authorization)
    if user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty access required")
    return user


def require_student_or_faculty(authorization: str | None) -> dict:
    """Allow either student or faculty role."""
    return get_authenticated_user(authorization)


def require_same_student_or_faculty(authorization: str | None, target_student_id: str) -> dict:
    """
    Ensure students can ONLY access their own data.
    Faculty can access any authorized student's data.
    """
    user = get_authenticated_user(authorization)
    if user["role"] == "faculty":
        return user
    if user["role"] == "student" and user["user_id"].upper() == str(target_student_id).strip().upper():
        return user
    raise HTTPException(
        status_code=403,
        detail="Access forbidden: You cannot view or modify another student's private data."
    )
