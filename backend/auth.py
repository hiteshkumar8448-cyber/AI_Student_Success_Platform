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
import time

from fastapi import HTTPException


# ============================================================
# PROJECT SETTINGS
# ============================================================

BASE_DIR = Path(
    __file__
).resolve().parent.parent


# Secret used to sign login tokens.
# For the college project this default is fine.
# For production, use an environment variable.

AUTH_SECRET = os.getenv(
    "AUTH_SECRET",
    "AI_STUDENT_SUCCESS_PLATFORM_SECRET_2026"
).encode(
    "utf-8"
)


SESSION_LIFETIME = (
    8 * 60 * 60
)


# ============================================================
# FACULTY LOGIN
# ============================================================

FACULTY_ID = os.getenv(
    "FACULTY_ID",
    "FACULTY001"
)


FACULTY_PASSWORD = os.getenv(
    "FACULTY_PASSWORD",
    "FACULTY001"
)


# ============================================================
# PASSWORD RULE
# ============================================================

def get_student_password(student_id):
    """
    For this college project, the student's password is
    intentionally the same as the Student ID.

    Example:

        STU1001 / STU1001
    """

    return str(
        student_id
    ).strip()


# ============================================================
# STUDENT CREDENTIAL CHECK
# ============================================================

def verify_student_credentials(
    student_id,
    password,
    student_exists_function
):
    """
    Verify a student login.

    The student's Student ID must already exist in the
    official student dataset.

    Password must equal the Student ID.
    """

    student_id = str(
        student_id
    ).strip()


    password = str(
        password
    ).strip()


    if not student_id:

        return False


    if not password:

        return False


    # Student must already exist.
    student = student_exists_function(
        student_id
    )


    if student is None:

        return False


    expected_password = (
        get_student_password(
            student_id
        )
    )


    return hmac.compare_digest(
        password,
        expected_password
    )


# ============================================================
# FACULTY CREDENTIAL CHECK
# ============================================================

def verify_faculty_credentials(
    faculty_id,
    password
):
    """
    Verify the single faculty account.
    """

    faculty_id = str(
        faculty_id
    ).strip().upper()

    password = str(
        password
    ).strip()

    return (
        hmac.compare_digest(
            faculty_id,
            FACULTY_ID.strip().upper()
        )
        and
        hmac.compare_digest(
            password,
            FACULTY_PASSWORD.strip()
        )
    )


# ============================================================
# TOKEN CREATION
# ============================================================

def create_session_token(
    role,
    user_id
):
    """
    Create a signed session token.

    role:
        student
        faculty

    user_id:
        STU1001
        FACULTY001
    """

    role = str(
        role
    ).strip().lower()


    user_id = str(
        user_id
    ).strip()


    expires_at = (
        int(time.time())
        + SESSION_LIFETIME
    )


    payload = (
        f"{role}:{user_id}:{expires_at}"
    )


    signature = hmac.new(
        AUTH_SECRET,
        payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()


    raw_token = (
        f"{payload}:{signature}"
    )


    token = base64.urlsafe_b64encode(
        raw_token.encode("utf-8")
    ).decode(
        "utf-8"
    )


    return token


# ============================================================
# TOKEN VERIFICATION
# ============================================================

def verify_session_token(
    token
):
    """
    Verify token signature, expiry and structure.

    Returns:

        {
            "role": "student",
            "user_id": "STU1001",
            "expires_at": 1234567890
        }
    """

    if not token:

        raise HTTPException(
            status_code=401,
            detail="Login required"
        )


    try:

        decoded = (
            base64.urlsafe_b64decode(
                token.encode("utf-8")
            )
            .decode("utf-8")
        )


        parts = decoded.split(
            ":",
            3
        )


        if len(parts) != 4:

            raise ValueError(
                "Invalid token format"
            )


        role = parts[0]

        user_id = parts[1]

        expires_at = int(
            parts[2]
        )

        signature = parts[3]


        payload = (
            f"{role}:{user_id}:{expires_at}"
        )


        expected_signature = hmac.new(
            AUTH_SECRET,
            payload.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()


        if not hmac.compare_digest(
            signature,
            expected_signature
        ):

            raise HTTPException(
                status_code=401,
                detail="Invalid session"
            )


        if int(time.time()) > expires_at:

            raise HTTPException(
                status_code=401,
                detail="Session expired"
            )


        if role not in {
            "student",
            "faculty"
        }:

            raise HTTPException(
                status_code=401,
                detail="Invalid session role"
            )


        return {

            "role":
                role,

            "user_id":
                user_id,

            "expires_at":
                expires_at

        }


    except HTTPException:

        raise


    except Exception:

        raise HTTPException(
            status_code=401,
            detail="Invalid session"
        )


# ============================================================
# BEARER TOKEN
# ============================================================

def extract_bearer_token(
    authorization
):
    """
    Extract token from:

        Authorization: Bearer <token>
    """

    if not authorization:

        raise HTTPException(
            status_code=401,
            detail="Login required"
        )


    prefix = "Bearer "


    if not authorization.startswith(
        prefix
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header"
        )


    token = authorization[
        len(prefix):
    ].strip()


    if not token:

        raise HTTPException(
            status_code=401,
            detail="Login required"
        )


    return token


# ============================================================
# AUTHENTICATED USER
# ============================================================

def get_authenticated_user(
    authorization
):
    """
    Verify Authorization header and return user data.
    """

    token = extract_bearer_token(
        authorization
    )


    return verify_session_token(
        token
    )


# ============================================================
# REQUIRE STUDENT
# ============================================================

def require_student(
    authorization
):
    """
    Only allow a logged-in student.
    """

    user = get_authenticated_user(
        authorization
    )


    if user["role"] != "student":

        raise HTTPException(
            status_code=403,
            detail="Student access required"
        )


    return user


# ============================================================
# REQUIRE FACULTY
# ============================================================

def require_faculty(
    authorization
):
    """
    Only allow a logged-in faculty user.
    """

    user = get_authenticated_user(
        authorization
    )


    if user["role"] != "faculty":

        raise HTTPException(
            status_code=403,
            detail="Faculty access required"
        )


    return user


# ============================================================
# SESSION INFORMATION
# ============================================================

def session_expiry_text(
    expires_at
):

    try:

        return datetime.fromtimestamp(
            expires_at,
            timezone.utc
        ).isoformat(
            timespec="seconds"
        )

    except Exception:

        return ""