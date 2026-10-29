"""
AI Student Success Platform
Shared Relational Database Layer (SQLite)
"""

from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import os
import sqlite3
import sys
import uuid
import pandas as pd

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "student_success.db"
CSV_PATH = DATA_DIR / "students.csv"
BACKEND_CSV_PATH = BASE_DIR / "backend" / "data" / "students.csv"

DATA_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# TIMESTAMP HELPERS
# ============================================================

def now_iso() -> str:
    """Return timezone-aware ISO formatted string."""
    return datetime.now(timezone.utc).isoformat()


def generate_uuid(prefix: str = "id") -> str:
    """Generate a prefixed unique identifier."""
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_connection() -> sqlite3.Connection:
    """
    Establish a connection with SQLite with Row factory and Foreign Keys enabled.
    """
    conn = sqlite3.connect(str(DB_PATH), timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


# ============================================================
# SCHEMA CREATION
# ============================================================

def init_db():
    """
    Initialize SQLite tables, indices, and constraints.
    """
    with get_connection() as conn:
        cursor = conn.cursor()

        # 1. Students table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS students (
                student_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT,
                password_hash TEXT NOT NULL,
                course TEXT NOT NULL,
                semester INTEGER NOT NULL DEFAULT 1,
                cgpa REAL NOT NULL,
                attendance REAL NOT NULL,
                backlogs INTEGER NOT NULL DEFAULT 0,
                assignment_completion REAL NOT NULL DEFAULT 80.0,
                lms_activity REAL NOT NULL DEFAULT 80.0,
                coding_score REAL NOT NULL DEFAULT 70.0,
                aptitude_score REAL NOT NULL DEFAULT 70.0,
                mock_interview_score REAL NOT NULL DEFAULT 70.0,
                technical_skill REAL NOT NULL DEFAULT 75.0,
                soft_skill REAL NOT NULL DEFAULT 75.0,
                student_satisfaction REAL NOT NULL DEFAULT 80.0,
                faculty_feedback REAL NOT NULL DEFAULT 80.0,
                placement_outcome TEXT NOT NULL DEFAULT 'Not Placed',
                previous_cgpa REAL NOT NULL DEFAULT 7.0,
                success_score REAL NOT NULL DEFAULT 75.0,
                risk_level TEXT NOT NULL DEFAULT 'Low Risk',
                risk_factors TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)

        # 2. Faculty table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS faculty (
                faculty_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                department TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)

        # 3. Faculty Notes table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS faculty_notes (
                note_id TEXT PRIMARY KEY,
                faculty_id TEXT NOT NULL,
                student_id TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (faculty_id) REFERENCES faculty (faculty_id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES students (student_id) ON DELETE CASCADE
            );
        """)

        # 4. Interventions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS interventions (
                intervention_id TEXT PRIMARY KEY,
                student_id TEXT NOT NULL,
                faculty_id TEXT NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                priority TEXT NOT NULL DEFAULT 'Medium',
                status TEXT NOT NULL DEFAULT 'Pending',
                due_date TEXT,
                action_type TEXT DEFAULT 'Academic Support',
                student_response TEXT,
                student_response_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (student_id) REFERENCES students (student_id) ON DELETE CASCADE,
                FOREIGN KEY (faculty_id) REFERENCES faculty (faculty_id) ON DELETE CASCADE
            );
        """)

        # 5. Notifications table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                notification_id TEXT PRIMARY KEY,
                recipient_id TEXT NOT NULL,
                recipient_role TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'info',
                is_read INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );
        """)

        # 6. Student Goals table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS student_goals (
                goal_id TEXT PRIMARY KEY,
                student_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                target_date TEXT,
                status TEXT NOT NULL DEFAULT 'Not Started',
                progress INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (student_id) REFERENCES students (student_id) ON DELETE CASCADE
            );
        """)

        # 7. Student Messages table (communication between faculty and student)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS student_messages (
                message_id TEXT PRIMARY KEY,
                student_id TEXT NOT NULL,
                faculty_id TEXT NOT NULL,
                sender_role TEXT NOT NULL,
                sender_name TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (student_id) REFERENCES students (student_id) ON DELETE CASCADE
            );
        """)

        # Add modern messaging columns if not present
        cursor.execute("PRAGMA table_info(student_messages);")
        msg_cols = {row["name"] for row in cursor.fetchall()}
        if "conversation_id" not in msg_cols:
            cursor.execute("ALTER TABLE student_messages ADD COLUMN conversation_id TEXT;")
        if "receiver_id" not in msg_cols:
            cursor.execute("ALTER TABLE student_messages ADD COLUMN receiver_id TEXT;")
        if "subject" not in msg_cols:
            cursor.execute("ALTER TABLE student_messages ADD COLUMN subject TEXT DEFAULT '';")
        if "is_read" not in msg_cols:
            cursor.execute("ALTER TABLE student_messages ADD COLUMN is_read INTEGER DEFAULT 0;")

        # 8. Two-way Conversations Threads table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                conversation_id TEXT PRIMARY KEY,
                student_id TEXT NOT NULL,
                faculty_id TEXT NOT NULL,
                subject TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'open',
                last_message TEXT,
                last_message_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (student_id) REFERENCES students (student_id) ON DELETE CASCADE,
                FOREIGN KEY (faculty_id) REFERENCES faculty (faculty_id) ON DELETE CASCADE
            );
        """)

        # 9. Two-way Intervention Replies table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS intervention_replies (
                reply_id TEXT PRIMARY KEY,
                intervention_id TEXT NOT NULL,
                sender_id TEXT NOT NULL,
                sender_role TEXT NOT NULL,
                sender_name TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (intervention_id) REFERENCES interventions (intervention_id) ON DELETE CASCADE
            );
        """)

        # 10. Study Materials / Uploaded Faculty Notes table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS study_materials (
                material_id TEXT PRIMARY KEY,
                faculty_id TEXT NOT NULL,
                faculty_name TEXT NOT NULL,
                subject_name TEXT NOT NULL,
                subject_code TEXT DEFAULT '',
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                semester INTEGER DEFAULT 0,
                filename TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                file_type TEXT NOT NULL,
                file_size INTEGER DEFAULT 0,
                file_url TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (faculty_id) REFERENCES faculty (faculty_id) ON DELETE CASCADE
            );
        """)

        # Create indices for high-frequency queries
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_students_risk ON students (risk_level);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_students_course ON students (course);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_interventions_student ON interventions (student_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions (status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_id, is_read);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_goals_student ON student_goals (student_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_student ON faculty_notes (student_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_student ON student_messages (student_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversations_student ON conversations (student_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversations_faculty ON conversations (faculty_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_int_replies_int ON intervention_replies (intervention_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_study_materials_subject ON study_materials (subject_name);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_study_materials_faculty ON study_materials (faculty_id);")

        conn.commit()

    # Seed data if tables are empty
    seed_database_if_empty()


# ============================================================
# SEEDING FROM CSV & DEFAULT ACCOUNTS
# ============================================================

def _hash_seed_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 for seeding without circular imports."""
    salt = os.urandom(16).hex()
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000
    ).hex()
    return f"pbkdf2:sha256:100000${salt}${key}"


def seed_database_if_empty():
    """
    Seed students and faculty from students.csv and defaults.
    """
    with get_connection() as conn:
        cursor = conn.cursor()

        # Check faculty count
        cursor.execute("SELECT COUNT(*) AS count FROM faculty;")
        faculty_count = cursor.fetchone()["count"]

        if faculty_count == 0:
            default_faculty = [
                ("FACULTY001", "Faculty Administrator", "faculty@university.edu", "Computer Science", _hash_seed_password("FACULTY001"), now_iso()),
                ("FACULTY002", "Dr. Priya Sharma", "priya.sharma@university.edu", "Information Technology", _hash_seed_password("FACULTY002"), now_iso())
            ]
            cursor.executemany("""
                INSERT INTO faculty (faculty_id, name, email, department, password_hash, created_at)
                VALUES (?, ?, ?, ?, ?, ?);
            """, default_faculty)
            conn.commit()

        # Check students count
        cursor.execute("SELECT COUNT(*) AS count FROM students;")
        student_count = cursor.fetchone()["count"]

        if student_count == 0:
            csv_file = CSV_PATH if CSV_PATH.exists() else BACKEND_CSV_PATH
            if csv_file.exists():
                df = pd.read_csv(csv_file)
                students_data = []
                now = now_iso()

                for _, row in df.iterrows():
                    sid = str(row["student_id"]).strip().upper()
                    name = str(row.get("name", "Student")).strip()
                    dept = str(row.get("department", "Computer Science")).strip()
                    year = int(row.get("year", 1))
                    semester = year * 2  # Approximate semester

                    cgpa = float(row.get("cgpa", 7.0))
                    att = float(row.get("attendance", 75.0))
                    backlogs = int(row.get("backlogs", 0))
                    assignment = float(row.get("assignment_completion", 80.0))
                    lms = float(row.get("lms_login_frequency", 75.0))
                    coding = float(row.get("coding_score", 65.0))
                    aptitude = float(row.get("aptitude_score", 65.0))
                    mock = float(row.get("mock_interview_score", 65.0))
                    tech = float(row.get("technical_skill", 70.0))
                    soft = float(row.get("soft_skill", 70.0))
                    satisfaction = float(row.get("student_satisfaction", 75.0))
                    feedback = float(row.get("faculty_feedback", 75.0))
                    placement = str(row.get("placement_outcome", "Not Available")).strip()

                    # Compute success score (0-100)
                    academic = ((cgpa / 10.0 * 100.0) * 0.25) + (coding * 0.10) + max(0, 100 - backlogs * 15) * 0.05
                    score = round(float(academic + (att * 0.10) + (lms * 0.05) + (assignment * 0.10) + (aptitude * 0.05) + (coding * 0.05) + (mock * 0.05) + (tech * 0.025) + (soft * 0.025) + (satisfaction * 0.025) + (feedback * 0.025)), 1)
                    score = min(100.0, max(0.0, score))

                    # Compute risk level and factors
                    risk_factors_list = []
                    if cgpa < 6.0:
                        risk_factors_list.append(f"Low CGPA ({cgpa:.2f})")
                    if att < 75.0:
                        risk_factors_list.append(f"Attendance below threshold ({att:.1f}%)")
                    if backlogs >= 2:
                        risk_factors_list.append(f"{backlogs} active academic backlogs")
                    if assignment < 60.0:
                        risk_factors_list.append(f"Low assignment submission rate ({assignment:.1f}%)")
                    if lms < 50.0:
                        risk_factors_list.append("Low LMS activity")

                    if cgpa < 5.8 or att < 60.0 or backlogs >= 3 or score < 50.0:
                        risk_level = "High Risk"
                    elif cgpa < 6.8 or att < 75.0 or backlogs >= 1 or score < 65.0:
                        risk_level = "Medium Risk"
                    else:
                        risk_level = "Low Risk"

                    # Previous CGPA calculation
                    prev_cgpa = round(max(4.0, min(9.9, cgpa + (0.5 if risk_level == "High Risk" else -0.2))), 2)
                    email = f"{sid.lower()}@university.edu"
                    pwd_hash = _hash_seed_password(sid)

                    students_data.append((
                        sid, name, email, pwd_hash, dept, semester, cgpa, att,
                        backlogs, assignment, lms, coding, aptitude, mock,
                        tech, soft, satisfaction, feedback, placement, prev_cgpa,
                        score, risk_level, json.dumps(risk_factors_list), now, now
                    ))

                cursor.executemany("""
                    INSERT INTO students (
                        student_id, name, email, password_hash, course, semester,
                        cgpa, attendance, backlogs, assignment_completion, lms_activity,
                        coding_score, aptitude_score, mock_interview_score, technical_skill,
                        soft_skill, student_satisfaction, faculty_feedback, placement_outcome,
                        previous_cgpa, success_score, risk_level, risk_factors, created_at, updated_at
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                    );
                """, students_data)
                conn.commit()

        # Seed sample interventions, goals, notes, notifications for STU1001 if missing
        cursor.execute("SELECT COUNT(*) AS count FROM interventions WHERE student_id = 'STU1001';")
        if cursor.fetchone()["count"] == 0:
            now = now_iso()
            cursor.execute("""
                INSERT INTO interventions (
                    intervention_id, student_id, faculty_id, type, title,
                    description, priority, status, due_date, action_type,
                    student_response, student_response_at, created_at, updated_at
                ) VALUES (
                    ?, 'STU1001', 'FACULTY001', 'Academic Support', 'Attendance & Core Subject Mentoring',
                    'Your attendance has fallen below 75% in Data Structures. Please schedule a mentoring session with your faculty advisor.',
                    'High', 'In Progress', '2026-11-15', 'Mentoring Session',
                    'I will meet Prof. Sharma on Friday during office hours.', ?, ?, ?
                );
            """, (generate_uuid("int"), now, now, now))

            cursor.execute("""
                INSERT INTO faculty_notes (note_id, faculty_id, student_id, title, message, created_at, updated_at)
                VALUES (?, 'FACULTY001', 'STU1001', 'Mid-Term Progress Review', 'Student expressed interest in remedial tutoring for CS201. Advised to attend Friday labs.', ?, ?);
            """, (generate_uuid("note"), now, now))

            cursor.execute("""
                INSERT INTO student_goals (goal_id, student_id, title, description, target_date, status, progress, created_at, updated_at)
                VALUES
                (?, 'STU1001', 'Improve Attendance to 85%', 'Attend all lectures and lab practicals regularly', '2026-11-30', 'In Progress', 65, ?, ?),
                (?, 'STU1001', 'Clear Backlog in Mathematics', 'Attend remedial weekend problem-solving sessions', '2026-12-15', 'Not Started', 20, ?, ?);
            """, (generate_uuid("goal"), now, now, generate_uuid("goal"), now, now))

            cursor.execute("""
                INSERT INTO notifications (notification_id, recipient_id, recipient_role, title, message, type, is_read, created_at)
                VALUES
                (?, 'STU1001', 'student', 'New Faculty Intervention Created', 'Your faculty mentor created an intervention: Attendance & Core Subject Mentoring.', 'intervention', 0, ?),
                (?, 'STU1001', 'student', 'Faculty Note Added', 'Prof. Sharma added a note to your academic profile.', 'note', 0, ?);
            """, (generate_uuid("notif"), now, generate_uuid("notif"), now))

            conn.commit()

        # Seed sample study materials if table is empty
        cursor.execute("SELECT COUNT(*) AS count FROM study_materials;")
        if cursor.fetchone()["count"] == 0:
            faculty_files_dir = DATA_DIR / "faculty_files"
            faculty_files_dir.mkdir(parents=True, exist_ok=True)
            now = now_iso()

            sample_files = [
                ("CS201_Data_Structures_Lecture_01.pdf", "%PDF-1.4 sample data structures lecture notes on arrays and linked lists"),
                ("CS302_Database_Normalization_Notes.txt", "Database Normalization Reference Guide:\n1NF: Atomic values\n2NF: No partial dependency\n3NF: No transitive dependency\nBCNF: Strict determinant rule"),
                ("AI401_Machine_Learning_Primer.pptx", "Sample PPTX presentation on supervised machine learning and regression fundamentals")
            ]
            for fname, content in sample_files:
                fpath = faculty_files_dir / fname
                if not fpath.exists():
                    fpath.write_text(content, encoding="utf-8")

            sample_materials = [
                (
                    generate_uuid("mat"), "FACULTY001", "Faculty Administrator",
                    "Data Structures", "CS201", "Arrays, Linked Lists & Asymptotic Analysis",
                    "Comprehensive lecture slides and reference notes covering Big-O notation, memory layout, and linked list traversals.",
                    4, "CS201_Data_Structures_Lecture_01.pdf", "CS201_Data_Structures_Lecture_01.pdf",
                    "pdf", 102400, "/faculty-files/CS201_Data_Structures_Lecture_01.pdf", now, now
                ),
                (
                    generate_uuid("mat"), "FACULTY002", "Dr. Priya Sharma",
                    "Database Management Systems", "CS302", "1NF, 2NF, 3NF & BCNF Decomposition",
                    "Step-by-step relational database normalization handbook with university past exam problems and solutions.",
                    4, "CS302_Database_Normalization_Notes.txt", "CS302_Database_Normalization_Notes.txt",
                    "txt", 4096, "/faculty-files/CS302_Database_Normalization_Notes.txt", now, now
                ),
                (
                    generate_uuid("mat"), "FACULTY001", "Faculty Administrator",
                    "Artificial Intelligence", "AI401", "Supervised Learning, Regression & Evaluation",
                    "Foundational slides on gradient descent, loss functions, precision/recall metrics, and overfitting avoidance.",
                    6, "AI401_Machine_Learning_Primer.pptx", "AI401_Machine_Learning_Primer.pptx",
                    "pptx", 512000, "/faculty-files/AI401_Machine_Learning_Primer.pptx", now, now
                )
            ]

            cursor.executemany("""
                INSERT INTO study_materials (
                    material_id, faculty_id, faculty_name, subject_name, subject_code,
                    title, description, semester, filename, original_filename,
                    file_type, file_size, file_url, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, sample_materials)
            conn.commit()

        # Seed sample conversation thread for STU1001 if table is empty
        cursor.execute("SELECT COUNT(*) AS count FROM conversations;")
        if cursor.fetchone()["count"] == 0:
            conv_id = generate_uuid("conv")
            now = now_iso()
            cursor.execute("""
                INSERT INTO conversations (
                    conversation_id, student_id, faculty_id, subject, status,
                    last_message, last_message_at, created_at, updated_at
                ) VALUES (?, 'STU1001', 'FACULTY001', 'Academic Guidance & Attendance Recovery', 'open',
                    'Thank you Professor, I will submit the assignments before Friday.', ?, ?, ?);
            """, (conv_id, now, now, now))

            # Add message thread items
            sample_messages = [
                (generate_uuid("msg"), 'STU1001', 'FACULTY001', 'student', 'Student STU1001',
                 'Hello Professor, I am struggling with attendance and assignments due to illness last week.',
                 now, conv_id, 'FACULTY001', 'Academic Guidance & Attendance Recovery', 1),
                (generate_uuid("msg"), 'STU1001', 'FACULTY001', 'faculty', 'Faculty Mentor',
                 'Hello! I reviewed your record. Please meet me tomorrow after lab hours and complete the pending assignments.',
                 now, conv_id, 'STU1001', 'Academic Guidance & Attendance Recovery', 1),
                (generate_uuid("msg"), 'STU1001', 'FACULTY001', 'student', 'Student STU1001',
                 'Thank you Professor, I will submit the assignments before Friday.',
                 now, conv_id, 'FACULTY001', 'Academic Guidance & Attendance Recovery', 0)
            ]
            cursor.executemany("""
                INSERT INTO student_messages (
                    message_id, student_id, faculty_id, sender_role, sender_name,
                    message, created_at, conversation_id, receiver_id, subject, is_read
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, sample_messages)
            conn.commit()



# Automatically initialize on module import
init_db()
