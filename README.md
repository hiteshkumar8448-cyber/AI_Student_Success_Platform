# 🎓 AI Student Success Platform

An intelligent, full-stack, multi-dimensional academic analytics and intervention system that connects **Faculty Mentors** and **Students** through a shared relational database, real-time interventions, and explainable AI-driven academic risk detection.

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Problem Statement](#problem-statement)
3. [Objectives](#objectives)
4. [Key Features](#key-features)
5. [System Architecture](#system-architecture)
6. [Technology Stack](#technology-stack)
7. [Repository Structure](#repository-structure)
8. [Database Schema (Shared SQLite Layer)](#database-schema-shared-sqlite-layer)
9. [Authentication & Authorization Flow](#authentication--authorization-flow)
10. [Student–Faculty Communication & Intervention Flow](#studentfaculty-communication--intervention-flow)
11. [AI Risk Analysis & Diagnosis Engine](#ai-risk-analysis--diagnosis-engine)
12. [REST API Documentation](#rest-api-documentation)
13. [Installation & Setup Instructions](#installation--setup-instructions)
14. [How to Run the Application](#how-to-run-the-application)
15. [Running the Automated Verification Suite](#running-the-automated-verification-suite)
16. [Demo Credentials](#demo-credentials)
17. [Screenshots & UI Walkthrough](#screenshots--ui-walkthrough)

---

## 📖 Project Overview

The **AI Student Success Platform** is an enterprise-grade academic intelligence web application designed for higher education institutions. It bridges the communication and data gap between university faculty and students by coupling academic performance tracking with automated early-warning risk assessments and targeted faculty interventions.

Unlike disparate systems where faculty data and student portals operate as isolated silos, this platform functions on a **single unified relational data model**. Interventions, notes, recommendations, and status updates submitted by faculty immediately appear on the student's dashboard with real-time notifications. In turn, student actions—such as goal tracking, message replies, and intervention acknowledgments—are reflected directly in the faculty monitoring console.

---

## ❓ Problem Statement

In contemporary higher education:
1. **Late Interventions**: Academic distress is often detected only after midterm or end-semester exam failures, leaving insufficient time for remedial action.
2. **Data Fragmentation**: Attendance records, Learning Management System (LMS) activity logs, assignment submissions, and exam CGPAs are stored across fragmented systems.
3. **One-Way Communication**: Faculty lack a closed-loop channel to issue actionable academic interventions, track whether students acknowledge them, and monitor follow-through.
4. **Opaque "Black-Box" Metrics**: Predictive analytics frequently supply arbitrary risk scores without explaining *why* a student is at risk or *what specific corrective steps* should be taken.

---

## 🎯 Objectives

- **Early Risk Detection**: Predict student academic risk levels (`Low`, `Medium`, `High`) before grades decline irrevocably.
- **Explainable AI Recommendations**: Provide clear root-cause breakdowns (e.g., attendance < 75%, CGPA decline, active backlogs, assignment deficits) along with targeted recommendations.
- **Bi-Directional Communication**: Establish a shared database where faculty can create interventions, set deadlines/priorities, and observe student feedback and goal progress.
- **Strict Privacy & Role Isolation**: Ensure students access only their personal academic record, preventing horizontal privilege escalation or unauthorized student-to-student data exposure.
- **Institutional Analytics**: Equip academic leadership and department heads with cohort-wide KPI summaries, risk distributions, and printable performance reports.

---

## ✨ Key Features

### 👨‍🏫 Faculty Portal (`/faculty.html` or `/index.html`)
- **Executive Analytics Dashboard**: Instant institutional KPIs (Total Students, High/Medium/Low Risk counts, Average CGPA, Average Attendance, Active Interventions).
- **Interactive Chart Suite (Chart.js)**:
  - Risk Distribution (Doughnut chart)
  - CGPA Distribution Histogram
  - Attendance vs. CGPA Scatter/Trend
  - Academic Risk vs. Attendance correlation
- **Searchable & Filterable Cohort Directory**:
  - Live full-text search by Student ID or Name
  - Filter by Academic Risk (`All`, `High`, `Medium`, `Low`)
  - Filter by Department/Course (`CS`, `IT`, `ECE`, `MECH`, `CIVIL`, etc.)
  - Multi-column sorting (CGPA, Attendance, Success Score, Name)
  - Server-side pagination for large cohorts
- **360° Student Profile & Intervention Modal**:
  - **Overview**: Academic metrics, semester-wise CGPA trend, attendance, LMS login frequency.
  - **Explainable AI Diagnosis**: Primary risk drivers and recommended corrective steps.
  - **Interventions Hub**: Issue new structured interventions (Counseling, Remedial, Attendance Warning, Assignment Support) with priority levels, deadlines, and view student replies.
  - **Observation Notes**: Log private faculty notes regarding student behavior or progress.
  - **Student Goals**: Monitor student-created personal goals and live progress bars.
  - **Mentor Direct Chat**: Send and receive direct messages with the student.
- **Printable Student Performance Report**: Instantly generate clean, formatted student reports ready for parent-teacher conferences or academic committee meetings.

### 🎓 Student Portal (`/student.html`)
- **Personalized Academic Performance Dashboard**:
  - Key Metric Cards: Current CGPA, Overall Attendance %, Success Score (/100), Assignment Completion %, and Current Risk Level badge.
  - Visual charts showing personal CGPA progression and Attendance vs. Mandatory Criteria (75%).
- **Interactive Faculty Interventions Console**:
  - View interventions created specifically by faculty mentors.
  - Filter by Status (`Open`, `In Progress`, `Resolved`).
  - **One-Click Acknowledge**: Instantly let faculty know the intervention was seen.
  - **Reply / Status Update Modal**: Submit responses explaining current circumstances or progress.
- **Smart Academic Goal Management**:
  - Create custom personal targets (e.g., "Raise Data Structures Grade to A", "Achieve 85% Attendance").
  - Set target completion dates.
  - Interactive slider to update progress (0–100%) and toggle status (`Not Started`, `In Progress`, `Completed`).
- **Notification Center**:
  - Header bell with unread badge counter.
  - Notification dropdown alerting the student when interventions are created or status changes.
  - Single-click "Mark as Read" and "Mark All as Read".
- **Faculty Mentor Direct Messaging**:
  - Dedicated message thread to communicate directly with faculty mentors.

### 🛡️ Security, Privacy & Session Management
- **Role-Based Access Control (RBAC)**: Backend validates incoming session tokens against authorized roles. Students cannot access faculty endpoints.
- **Cryptographic Password Hashing**: PBKDF2-HMAC-SHA256 with cryptographically generated salts.
- **Session Tokens**: Time-stamped HMAC cryptographic session tokens.
- **Client Route Guard (`auth-guard.js`)**: Proactively redirects unauthenticated users or unauthorized roles to `/login.html`.
- **Prominent Sign Out**: Instant session termination from headers and sidebars on all dashboards.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        WEB CLIENT (BROWSER)                            │
│                                                                        │
│   ┌─────────────────────┐   ┌─────────────────────┐   ┌────────────┐   │
│   │ Faculty Dashboard   │   │ Student Dashboard   │   │ Login Page │   │
│   │ (/faculty.html)     │   │ (/student.html)     │   │(/login.html│   │
│   └──────────┬──────────┘   └──────────┬──────────┘   └─────┬──────┘   │
│              │                         │                    │          │
│              └────────────┬────────────┘                    │          │
│                           ▼                                 │          │
│                  Client Auth Guard & Session Storage        │          │
└───────────────────────────┬─────────────────────────────────┴──────────┘
                            │ RESTful JSON Requests (Bearer Token / Cookie)
                            ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND APPLICATION                         │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                      Authentication & RBAC                     │   │
│   │         (PBKDF2 Password Verifier, HMAC Session Tokens)        │   │
│   └──────┬──────────────┬──────────────┬──────────────┬────────────┘   │
│          │              │              │              │                │
│          ▼              ▼              ▼              ▼                │
│   ┌─────────────┐┌─────────────┐┌─────────────┐┌─────────────┐         │
│   │ Auth Routes ││StudentRoutes││FacultyRoutes││Interventions│         │
│   └──────┬──────┘└──────┬──────┘└──────┬──────┘└──────┬──────┘         │
│          │              │              │              │                │
│          ▼              ▼              ▼              ▼                │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                        Service Layer                           │   │
│   │  (StudentService, FacultyService, InterventionService, etc.)   │   │
│   └─────────────────────────────┬──────────────────────────────────┘   │
│                                 │                                      │
│                                 ▼                                      │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                 Analytics & ML Risk Engine                     │   │
│   │        (Scikit-Learn Random Forest + Transparent Fallback)     │   │
│   └─────────────────────────────┬──────────────────────────────────┘   │
└─────────────────────────────────┼──────────────────────────────────────┘
                                  │ Direct SQL Queries (PRAGMA foreign_keys = ON)
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│             SHARED PERSISTENT RELATIONAL DATABASE                      │
│                  (SQLite: data/student_success.db)                     │
│                                                                        │
│   ┌───────────┐      ┌─────────────┐      ┌────────────────────────┐   │
│   │ students  │◄────┤interventions│────►│ notifications          │   │
│   └─────┬─────┘      └─────────────┘      └────────────────────────┘   │
│         │                                                              │
│         ├───────────►┌─────────────┐      ┌────────────────────────┐   │
│         │            │faculty_notes│◄────┤ faculty                │   │
│         │            └─────────────┘      └────────────────────────┘   │
│         │                                                              │
│         ├───────────►┌─────────────┐      ┌────────────────────────┐   │
│         │            │student_goals│      │ student_messages       │   │
│         │            └─────────────┘      └────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 💻 Technology Stack

| Layer | Technologies Used |
|---|---|
| **Backend Framework** | **FastAPI** (Python 3.10–3.14) with **Uvicorn** ASGI server |
| **Data Validation** | **Pydantic v2** (`BaseModel`, typed schemas, validation) |
| **Database** | **SQLite 3** (`data/student_success.db`) with Foreign Key constraints |
| **Machine Learning** | **Scikit-Learn** (Random Forest Classifier), **NumPy**, **Pandas** |
| **Security & Auth** | `hashlib` (PBKDF2-HMAC-SHA256), `hmac` (SHA256 session signatures) |
| **Frontend UI** | Modern Semantic HTML5, CSS3 Custom Properties (Design System), Vanilla JavaScript (ES6 Modules) |
| **Data Visualization** | **Chart.js v4.4** (Responsive Canvas Charts) |
| **Testing** | Standard Python `unittest` / automated E2E assertion test suite |

---

## 📁 Repository Structure

```
AI_Student_Success_Platform/
├── backend/
│   ├── routes/
│   │   ├── analytics_routes.py       # Institutional KPIs, risk breakdowns, segments
│   │   ├── auth_routes.py            # Student/Faculty login, session verification, logout
│   │   ├── faculty_routes.py         # Faculty profile & cohort summaries
│   │   ├── goal_routes.py            # Student goal management CRUD
│   │   ├── intervention_routes.py    # Interventions CRUD, acknowledge & reply
│   │   ├── note_and_message_routes.py# Observation notes & mentor chat
│   │   ├── notification_routes.py    # Notification center endpoints
│   │   └── student_routes.py         # Student profiles, performance, reports
│   ├── services/
│   │   ├── ai_service.py             # Student Success AI academic assistant logic
│   │   ├── faculty_service.py        # Institutional aggregation services
│   │   ├── goal_service.py           # Goal lifecycle logic
│   │   ├── intervention_service.py   # Multi-turn intervention threads & status lifecycle
│   │   ├── message_service.py        # Two-way conversation threads & unread tracking
│   │   ├── note_service.py           # Faculty private behavioral notes service
│   │   ├── notification_service.py   # User notification triggers & summary counts
│   │   ├── report_service.py         # Progress reports & review lifecycle
│   │   ├── study_resource_service.py # Study materials & safe file uploads/downloads
│   │   └── student_service.py        # Student queries & history generator
│   ├── analytics.py                  # Core analytics & ML risk engine
│   ├── auth.py                       # PBKDF2 hashing, HMAC session tokens & RBAC
│   ├── database.py                   # SQLite schema definition, connection pool, seeder
│   ├── main.py                       # FastAPI application assembly & static file mounting
│   ├── models.py                     # Data conversion helpers & explainable AI logic
│   └── schemas.py                    # Pydantic request/response models
├── data/
│   ├── student_success.db            # Persistent shared SQLite database
│   └── students.csv                  # 500-student benchmark dataset
├── frontend/
│   ├── css/
│   │   ├── common.css                # Base design system, sidebar, navbar, cards, modals
│   │   ├── faculty.css               # Faculty charts, tables, filter toolbar, report print
│   │   ├── login.css                 # Clean university login card & demo box
│   │   └── student.css               # Student metric gauges, goals list, intervention cards
│   ├── js/
│   │   ├── auth-guard.js             # Route protection, token verification, logout
│   │   ├── faculty.js                # Faculty dashboard controller, Chart.js, modals
│   │   ├── login.js                  # Authentication submitter & role switchers
│   │   └── student.js                # Student dashboard controller, goal manager, alerts
│   ├── faculty.html                  # Faculty analytics portal
│   ├── index.html                    # Faculty portal entry point
│   ├── login.html                    # Universal login portal
│   └── student.html                  # Student personalized portal
├── models/
│   ├── risk_model.pkl                # Serialized trained Scikit-Learn risk model
│   └── train_model.py                # Model training script
├── tests/
│   └── test_e2e.py                   # Comprehensive 25-step end-to-end verification suite
├── .gitignore                        # Git exclusion rules
├── requirements.txt                  # Production dependencies
└── README.md                         # Project documentation
```

---

## 🗄️ Database Schema (Shared SQLite Layer)

All tables use SQLite Foreign Keys (`PRAGMA foreign_keys = ON;`) to preserve relational integrity.

```sql
-- Students Table
CREATE TABLE students (
    student_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    course TEXT NOT NULL,
    semester INTEGER NOT NULL,
    cgpa REAL NOT NULL,
    attendance REAL NOT NULL,
    backlogs INTEGER NOT NULL DEFAULT 0,
    assignment_completion REAL NOT NULL,
    lms_activity INTEGER NOT NULL DEFAULT 0,
    success_score REAL NOT NULL,
    risk_level TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Faculty Table
CREATE TABLE faculty (
    faculty_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Faculty Notes Table
CREATE TABLE faculty_notes (
    note_id TEXT PRIMARY KEY,
    faculty_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id)
);

-- Interventions Table
CREATE TABLE interventions (
    intervention_id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    faculty_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Medium',
    status TEXT NOT NULL DEFAULT 'Open',
    student_response TEXT,
    responded_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)
);

-- Multi-Turn Intervention Replies Thread Table
CREATE TABLE intervention_replies (
    reply_id TEXT PRIMARY KEY,
    intervention_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (intervention_id) REFERENCES interventions(intervention_id) ON DELETE CASCADE
);

-- Two-Way Student-Faculty Conversations Table
CREATE TABLE conversations (
    conversation_id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    faculty_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    last_message TEXT,
    last_message_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)
);

-- Student-Faculty Messages Table (Thread Messages)
CREATE TABLE student_messages (
    message_id TEXT PRIMARY KEY,
    conversation_id TEXT,
    student_id TEXT NOT NULL,
    faculty_id TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    receiver_id TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)
);

-- Notifications Table
CREATE TABLE notifications (
    notification_id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL,
    recipient_role TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    link TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Student Goals Table
CREATE TABLE student_goals (
    goal_id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_date TEXT,
    progress INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Not Started',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(student_id)
);

-- Faculty Published Study Materials Table
CREATE TABLE study_materials (
    material_id TEXT PRIMARY KEY,
    faculty_id TEXT NOT NULL,
    faculty_name TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    subject_code TEXT,
    title TEXT NOT NULL,
    description TEXT,
    semester INTEGER,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER NOT NULL DEFAULT 0,
    file_url TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)
);
```

---

## 🔐 Authentication & Authorization Flow

1. **User Submits Credentials**:
   - Faculty submits credentials to `POST /api/faculty/login`.
   - Student submits credentials to `POST /api/student/login`.
2. **Backend Authentication**:
   - The password is authenticated against the PBKDF2 hash using constant-time comparison (`hmac.compare_digest`).
   - If valid, a signed token `SESSION:{role}:{user_id}:{timestamp}:{signature}` is issued.
3. **Session Storage**:
   - The frontend stores the token, user profile, and user role in both `sessionStorage` and `localStorage`.
   - An `auth_token` cookie is simultaneously set for native request handling.
4. **Client-Side Auth Guard (`auth-guard.js`)**:
   - Every protected page checks `initAuthGuard(allowedRole)` on page load.
   - If no valid session token exists, user is redirected to `/login.html`.
   - If a student tries to load `/faculty.html`, the guard intercepts and redirects to `/student.html`.
5. **Backend Privacy & Role Enforcement**:
   - Endpoints require `require_faculty` or `require_student`.
   - Any attempt by a student token to query another student's ID (e.g. `GET /api/students/STU1002` while authenticated as `STU1001`) returns an immediate `403 Forbidden`.

---

## 🔄 Student–Faculty Communication & Intervention Flow

The core highlight of this upgrade is true closed-loop interaction:

```
[Faculty Mentor]                                       [Student STU1001]
       │                                                       │
       ├──── 1. Identifies student STU1001 with High Risk ─────┤
       │                                                       │
       ├──── 2. Issues Intervention: ─────────────────────────►│
       │        "Attendance is 62%. Please meet mentor."       │
       │        (Saved to SQLite `interventions` table)        │
       │                                                       │
       │     3. Database automatically creates a notification  │
       │        record for STU1001                             │
       │                                                       │
       │                                                       ├──── 4. Student logs in & sees:
       │                                                       │        • Unread Notification Bell (Badge: 1)
       │                                                       │        • Urgent Intervention Card
       │                                                       │
       │                                                       ├──── 5. Student clicks "Reply / Update":
       │                                                       │        "I was sick last week, submitted
       │                                                       │         medical certificate."
       │                                                       │
       │◄─── 6. Faculty views STU1001 detail modal ────────────┤
       │        • Sees student response instantly              │
       │        • Updates status from 'Open' to 'Resolved'     │
       │                                                       │
       └───────────────────────────────────────────────────────┘
```

---

## 🧠 AI Risk Analysis & Diagnosis Engine

The platform evaluates academic performance using a multi-factor scoring model supported by a Scikit-Learn Random Forest Classifier:

### 1. Risk Classification Tiers
- **High Risk**: Overall Success Score $< 55$ OR Attendance $< 65\%$ OR Backlogs $\ge 2$.
- **Medium Risk**: Overall Success Score between $55$ and $74$, or Attendance between $65\%$ and $74\%$, or $1$ active backlog.
- **Low Risk**: Overall Success Score $\ge 75$ with strong attendance ($\ge 75\%$) and zero backlogs.

### 2. Multi-Factor Formula
$$\text{Success Score} = (\text{CGPA} \times 4.5) + (\text{Attendance} \times 0.25) + (\text{Assignment Completion} \times 0.20) + (\text{LMS Activity} \times 0.10) - (\text{Backlogs} \times 8)$$

### 3. Explainable Diagnosis (Root Causes & Recommendations)
Instead of displaying an unexplained score, the system dynamically analyzes the student's metrics:
- **Low Attendance Trigger**: If Attendance $< 75\%$, the system flags: *"Attendance is critically below the 75% university eligibility requirement."*
- **Backlog Trigger**: If Backlogs $> 0$, the system flags: *"Active backlogs detected; student is at risk of academic probation."*
- **Assignment Deficit**: If Assignments $< 70\%$, the system warns: *"Low internal assessment submission rate."*
- **Actionable Steps**: Automatically generates personalized recommendations such as *"Schedule peer tutoring"*, *"Attend mandatory office hours"*, and *"Set weekly study milestone goals"*.

---

## 📡 REST API Documentation

### Authentication Endpoints
- `POST /api/student/login` — Student authentication (Body: `{ "username": "STU1001", "password": "..." }`)
- `POST /api/faculty/login` — Faculty authentication (Body: `{ "username": "FACULTY001", "password": "..." }`)
- `GET /api/auth/me` — Retrieve active session profile and verified role
- `POST /api/logout` — Terminate session and invalidate session token

### Student Endpoints
- `GET /api/student/me` — Current student's complete academic record and AI diagnosis
- `GET /api/students` — Faculty cohort directory (Supports `?search=`, `?risk=`, `?page=`, `?limit=`, `?sort_by=`)
- `GET /api/students/{student_id}` — Detailed student profile (Faculty or matching student only)
- `GET /api/students/{student_id}/performance` — Historical semester grades and attendance progression
- `GET /api/students/{student_id}/report` — Formatted performance report data

### Interventions & Communication Endpoints
- `GET /api/interventions` — Retrieve all interventions with reply counts (Faculty view, or filtered to self for students)
- `POST /api/interventions` — Issue new intervention with priority (`Urgent`, `High`, `Medium`, `Low`), category, deadline, and auto-notify student (Faculty only)
- `GET /api/interventions/{id}` — Fetch specific intervention with complete multi-turn conversation thread
- `POST /api/interventions/{id}/reply` — Multi-turn reply in intervention thread (Student or Faculty)
- `PATCH /api/interventions/{id}/status` — Update intervention status (`Open`, `In Progress`, `Resolved`, `Closed`)
- `POST /api/interventions/{id}/respond` — Student submits written response
- `POST /api/interventions/{id}/acknowledge` — Student one-click acknowledgment
- `GET /api/conversations` — Inbox of two-way conversation threads (Supports `?search=`, `?status=`)
- `POST /api/conversations` — Start a new student–faculty conversation thread
- `GET /api/conversations/{id}` — Get complete message thread and mark messages as read
- `POST /api/conversations/{id}/reply` — Reply to existing conversation thread
- `GET /api/students/{student_id}/notes` — Retrieve private faculty observation notes for a student
- `POST /api/students/{student_id}/notes` — Create private faculty observation note

### Faculty Notes & Study Materials Endpoints
- `POST /api/faculty/notes` — Upload & publish course study materials (Multipart file upload with validation, max 25MB)
- `GET /api/study-materials` (or `/api/notes`) — Search, filter by subject/semester, and list published study materials
- `GET /api/study-materials/{id}` — Download or view specific study resource
- `PUT /api/faculty/notes/{id}` — Faculty updates study material metadata (Title, description, subject)
- `DELETE /api/faculty/notes/{id}` — Faculty deletes published study material and safely cleans up storage

### Student Success AI Assistant Endpoints
- `POST /api/ai/ask` — Ask Student Success AI with contextual role intelligence (Student or Faculty mode)
- `POST /api/ai/chat` — Conversation endpoint for multi-turn assistant dialogue

### Student Goals Endpoints
- `GET /api/goals` — Retrieve student's personal goals
- `POST /api/goals` — Create new personal academic goal
- `PUT /api/goals/{goal_id}` — Update goal progress (0–100%) and status
- `DELETE /api/goals/{goal_id}` — Remove a goal

### Notifications Endpoints
- `GET /api/notifications` — Fetch recipient notifications (with unread count)
- `PATCH /api/notifications/{id}/read` — Mark a single notification as read
- `POST /api/notifications/mark-all-read` — Mark all notifications as read

### Institutional Analytics Endpoints
- `GET /api/summary` — Institutional KPI summary cards
- `GET /api/analytics/risk-distribution` — Risk category breakdown
- `GET /api/departments` — Departmental performance breakdown

---

## ⚙️ Installation & Setup Instructions

### 1. Prerequisites
- **Python 3.10, 3.11, 3.12, 3.13, or 3.14**
- **Git**
- A modern web browser (Chrome, Edge, Firefox, Safari)

### 2. Clone the Repository
```bash
git clone https://github.com/hiteshkumar8448-cyber/AI_Student_Success_Platform_.git
cd AI_Student_Success_Platform_
```

### 3. Create & Activate a Virtual Environment
**On Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**On macOS / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

---

## 🚀 How to Run the Application

The database (`data/student_success.db`) is automatically verified and seeded upon initial launch from `data/students.csv`.

Start the Uvicorn server:

```bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Once started, open your web browser and navigate to:
```
http://127.0.0.1:8000
```
*(The root URL will automatically redirect you to the login screen at `/login.html`)*

---

## 🧪 Running the Automated Verification Suite

An automated end-to-end test suite validates all 53 critical functional requirements, including role authentication, privacy isolation, two-way messaging, multi-turn intervention threads, study material uploads/downloads, and notification counts:

```bash
python tests/test_e2e.py
```

### Expected Output:
```
============================================================
  AI STUDENT SUCCESS PLATFORM -- END-TO-END VERIFICATION  
============================================================
[01] PASS: Student login works 
[02] PASS: Faculty login works 
[03] PASS: Faculty ID case-normalization works 
[04] PASS: Wrong Faculty password rejected 
[05] PASS: Wrong Student password rejected 
[06] PASS: Faculty /me profile loaded 
[07] PASS: Student /me profile loaded 
[08] PASS: Student privacy isolation 
[09] PASS: Student blocked from faculty endpoint 
[10] PASS: Faculty can list students 
[11] PASS: Faculty search students 
[12] PASS: Faculty filter by risk 
[13] PASS: Faculty view student profile 
[14] PASS: Faculty creates intervention 
[15] PASS: Intervention saved in database 
[16] PASS: Correct student sees intervention 
[17] PASS: Other student cannot see private intervention 
[18] PASS: Student received notification 
[19] PASS: Student marks notification as read 
[20] PASS: Student creates goal 
[21] PASS: Student updates goal progress 
[22] PASS: Faculty sees student goals in profile 
[23] PASS: Student responds to intervention 
[24] PASS: Faculty sees student response in intervention 
[25] PASS: Faculty resolves intervention 
[26] PASS: Analytics summary loads correctly 
[27] PASS: Risk distribution loads correctly 
[28] PASS: Performance report data generated 
[29] PASS: Logout works 
[30] PASS: Student Success AI analyzes student performance 
[31] PASS: Student Success AI explains risk level 
[32] PASS: Student Success AI attendance recovery roadmap 
[33] PASS: Student Success AI faculty cohort risk overview 
[34] PASS: Student Success AI faculty student specific lookup 
[35] PASS: Student starts new conversation thread 
[36] PASS: Faculty inbox displays student conversation 
[37] PASS: Faculty views student messages in thread 
[38] PASS: Faculty replies to student conversation 
[39] PASS: Student sees faculty response in conversation thread 
[40] PASS: Faculty creates + New Intervention with Urgent priority 
[41] PASS: Student sees new intervention with opening instructions 
[42] PASS: Student replies to intervention thread 
[43] PASS: Faculty sees student reply in intervention conversation 
[44] PASS: Faculty sends follow-up reply in intervention thread 
[45] PASS: Student sees multi-turn faculty response in same thread 
[46] PASS: Faculty updates intervention status to Resolved 
[47] PASS: Faculty uploads and registers study material 
[48] PASS: Student views published faculty study notes 
[49] PASS: Student accesses study material download URL 
[50] PASS: Privacy Isolation: Student B cannot view Student A's private conversation 
[51] PASS: Privacy Isolation: Student B cannot view Student A's private intervention 
[52] PASS: Privacy Isolation: Student B cannot reply to Student A's intervention 
[53] PASS: Dashboard notifications summary returns valid unread counts 
============================================================
  RESULT: ALL 53 OF 53 VERIFICATION SCENARIOS PASSED 100%!  
============================================================
```

---

## 🔑 Demo Credentials

Quick-fill demo buttons are provided on the login page for effortless testing.

| Role | Username / ID | Password | Portal View | Description |
|---|---|---|---|---|
| **Faculty Mentor** | `FACULTY001` | `FACULTY001` | `/faculty.html` | Dr. Alan Turing — Computer Science Department Head |
| **Faculty Mentor** | `FACULTY002` | `FACULTY002` | `/faculty.html` | Prof. Grace Hopper — Information Technology Faculty |
| **High-Risk Student** | `STU1001` | `STU1001` | `/student.html` | Student with attendance warning and active intervention |
| **Any Student** | `STU1002` – `STU1500` | Password = ID | `/student.html` | Any student from the 500-student cohort |

---

## 📸 Screenshots & UI Walkthrough

*(Take screenshots of your running application and place them in `docs/screenshots/`)*

### 1. Unified Academic Login (`/login.html`)
- Dedicated tabs for **Student Login** and **Faculty Login**.
- Single-click Demo Quick-Fill buttons for both roles.
- Modern glassmorphic university card aesthetic.

### 2. Faculty Analytics & Intervention Portal (`/faculty.html`)
- **Metric Cards**: Total cohort count, High/Medium/Low risk breakdowns, average attendance, active interventions.
- **Analytics Charts**: Responsive doughnut charts and distribution histograms.
- **Student Management Table**: Real-time search, risk dropdown filtering, and pagination.
- **Student 360° Modal**: Comprehensive tabs for Overview, Interventions, Notes, Goals, and Direct Chat.

### 3. Student Success Portal (`/student.html`)
- **Academic Scoreboard**: CGPA progress bar, attendance gauge with 75% benchmark indicator, assignment completion rate.
- **Active Interventions Card**: Faculty alerts, acknowledgment triggers, and reply modal.
- **Personal Goal Tracker**: Interactive progress sliders and target milestones.
- **Notification Dropdown**: Real-time alerts when faculty mentors take action.
