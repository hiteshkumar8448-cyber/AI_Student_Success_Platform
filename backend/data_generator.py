import pandas as pd
import numpy as np
from pathlib import Path


# ============================================================
# RANDOM SEED
# ============================================================

np.random.seed(42)


# ============================================================
# BASIC SETTINGS
# ============================================================

N = 500

departments = [
    "Computer Science",
    "Information Technology",
    "Electronics",
    "Mechanical",
    "Civil"
]


# ============================================================
# REALISTIC FICTIONAL STUDENT NAMES
# ============================================================

first_names = [
    "Aarav",
    "Aditi",
    "Aditya",
    "Akash",
    "Akshara",
    "Aman",
    "Amisha",
    "Ananya",
    "Aniket",
    "Anjali",
    "Ansh",
    "Arjun",
    "Aryan",
    "Avni",
    "Ayush",
    "Bhavya",
    "Chaitanya",
    "Charu",
    "Chetan",
    "Deepak",
    "Diya",
    "Divya",
    "Esha",
    "Gaurav",
    "Harsh",
    "Ishaan",
    "Isha",
    "Jatin",
    "Karan",
    "Kavya",
    "Khushi",
    "Krishna",
    "Kritika",
    "Lakshya",
    "Madhav",
    "Manish",
    "Meera",
    "Mohit",
    "Muskan",
    "Naman",
    "Nandini",
    "Navya",
    "Neeraj",
    "Neha",
    "Nikhil",
    "Nisha",
    "Pallavi",
    "Pankaj",
    "Parth",
    "Pooja",
    "Pranav",
    "Prateek",
    "Priya",
    "Rahul",
    "Riya",
    "Rohan",
    "Rohit",
    "Sakshi",
    "Sameer",
    "Sana",
    "Sanjay",
    "Sanya",
    "Shivam",
    "Shreya",
    "Simran",
    "Sneha",
    "Sonali",
    "Sourabh",
    "Tanisha",
    "Tanya",
    "Tarun",
    "Tushar",
    "Vaibhav",
    "Varun",
    "Vansh",
    "Vanshika",
    "Vikas",
    "Vikram",
    "Yash",
    "Yashi",
    "Zoya",
    "Abhishek",
    "Akanksha",
    "Alok",
    "Arnav",
    "Ayesha",
    "Dev",
    "Devansh",
    "Diwakar",
    "Ishita",
    "Kabir",
    "Komal",
    "Kunal",
    "Mansi",
    "Mayank",
    "Nakul",
    "Palak",
    "Rajat",
    "Rashmi"
]


last_names = [
    "Sharma",
    "Verma",
    "Gupta",
    "Singh",
    "Kumar",
    "Yadav",
    "Mehta",
    "Agarwal",
    "Bansal",
    "Chauhan",
    "Mishra",
    "Joshi",
    "Malhotra",
    "Kapoor",
    "Saini",
    "Shukla",
    "Tiwari",
    "Pandey",
    "Srivastava",
    "Jain",
    "Choudhary",
    "Rana",
    "Arora",
    "Saxena",
    "Mathur",
    "Goyal",
    "Mittal",
    "Khanna",
    "Bhatia",
    "Sethi",
    "Nair",
    "Iyer",
    "Reddy",
    "Rao",
    "Patel",
    "Desai",
    "Shah",
    "Patil",
    "Kulkarni",
    "Naik",
    "Das",
    "Dutta",
    "Roy",
    "Sen",
    "Bose",
    "Banerjee",
    "Ghosh",
    "Mukherjee",
    "Chatterjee",
    "Sarkar"
]


# ============================================================
# GENERATE STUDENT NAMES
# ============================================================

student_names = []

for i in range(N):

    first_name = first_names[i % len(first_names)]

    last_name = last_names[
        (i * 7 + i // len(first_names)) % len(last_names)
    ]

    student_names.append(
        f"{first_name} {last_name}"
    )


# ============================================================
# CREATE BASE STUDENT DATA
# ============================================================

students = pd.DataFrame({
    "student_id": [
        f"STU{1001 + i}" for i in range(N)
    ],

    # Realistic fictional names instead of
    # Student 1, Student 2, etc.
    "name": student_names,

    "department": np.random.choice(
        departments,
        N
    ),

    "year": np.random.choice(
        [1, 2, 3, 4],
        N
    ),

    "cgpa": np.round(
        np.clip(
            np.random.normal(7.2, 1.2, N),
            4.0,
            10.0
        ),
        2
    ),

    "backlogs": np.clip(
        np.random.poisson(0.8, N),
        0,
        5
    ),

    "attendance": np.round(
        np.clip(
            np.random.normal(78, 13, N),
            40,
            100
        ),
        1
    ),

    "subject_performance": np.round(
        np.clip(
            np.random.normal(74, 14, N),
            30,
            100
        ),
        1
    ),

    "lms_login_frequency": np.round(
        np.clip(
            np.random.normal(70, 18, N),
            10,
            100
        ),
        1
    ),

    "assignment_completion": np.round(
        np.clip(
            np.random.normal(76, 17, N),
            20,
            100
        ),
        1
    ),

    "events_participated": np.random.poisson(
        3,
        N
    ),

    "clubs_participated": np.random.poisson(
        1,
        N
    ),

    "hackathons": np.random.poisson(
        1,
        N
    ),

    "certifications": np.random.poisson(
        2,
        N
    ),

    "aptitude_score": np.round(
        np.clip(
            np.random.normal(68, 17, N),
            20,
            100
        ),
        1
    ),

    "coding_score": np.round(
        np.clip(
            np.random.normal(65, 20, N),
            15,
            100
        ),
        1
    ),

    "mock_interview_score": np.round(
        np.clip(
            np.random.normal(67, 18, N),
            15,
            100
        ),
        1
    ),

    "technical_skill": np.round(
        np.clip(
            np.random.normal(70, 16, N),
            20,
            100
        ),
        1
    ),

    "soft_skill": np.round(
        np.clip(
            np.random.normal(72, 15, N),
            20,
            100
        ),
        1
    ),

    "student_satisfaction": np.round(
        np.clip(
            np.random.normal(72, 15, N),
            20,
            100
        ),
        1
    ),

    "faculty_feedback": np.round(
        np.clip(
            np.random.normal(74, 14, N),
            20,
            100
        ),
        1
    )
})


# ============================================================
# GUARANTEE DEPARTMENT DISTRIBUTION
# ============================================================

for i, department in enumerate(departments):

    start = i * 100
    end = start + 100

    students.loc[
        start:end - 1,
        "department"
    ] = department


# ============================================================
# GUARANTEE RISK GROUPS
# ============================================================


# ------------------------------------------------------------
# 1. IMMEDIATE SUPPORT STUDENTS
# ------------------------------------------------------------

for i in range(0, 40):

    students.loc[i, "cgpa"] = np.round(
        np.random.uniform(4.2, 5.8),
        2
    )

    students.loc[i, "backlogs"] = np.random.randint(
        2,
        6
    )

    students.loc[i, "attendance"] = np.round(
        np.random.uniform(40, 59),
        1
    )

    students.loc[i, "subject_performance"] = np.round(
        np.random.uniform(30, 54),
        1
    )

    students.loc[i, "lms_login_frequency"] = np.round(
        np.random.uniform(10, 38),
        1
    )

    students.loc[i, "assignment_completion"] = np.round(
        np.random.uniform(20, 50),
        1
    )

    students.loc[i, "aptitude_score"] = np.round(
        np.random.uniform(20, 48),
        1
    )

    students.loc[i, "coding_score"] = np.round(
        np.random.uniform(15, 48),
        1
    )

    students.loc[i, "mock_interview_score"] = np.round(
        np.random.uniform(15, 48),
        1
    )

    students.loc[i, "technical_skill"] = np.round(
        np.random.uniform(20, 48),
        1
    )

    students.loc[i, "soft_skill"] = np.round(
        np.random.uniform(20, 48),
        1
    )

    students.loc[i, "student_satisfaction"] = np.round(
        np.random.uniform(20, 48),
        1
    )

    students.loc[i, "faculty_feedback"] = np.round(
        np.random.uniform(20, 48),
        1
    )

    students.loc[i, "events_participated"] = np.random.randint(
        0,
        2
    )

    students.loc[i, "clubs_participated"] = 0

    students.loc[i, "hackathons"] = 0

    students.loc[i, "certifications"] = 0


# ------------------------------------------------------------
# 2. NEEDS ATTENTION STUDENTS
# ------------------------------------------------------------

for i in range(40, 200):

    students.loc[i, "cgpa"] = np.round(
        np.random.uniform(5.8, 7.2),
        2
    )

    students.loc[i, "backlogs"] = np.random.randint(
        0,
        3
    )

    students.loc[i, "attendance"] = np.round(
        np.random.uniform(55, 75),
        1
    )

    students.loc[i, "subject_performance"] = np.round(
        np.random.uniform(50, 70),
        1
    )

    students.loc[i, "lms_login_frequency"] = np.round(
        np.random.uniform(30, 65),
        1
    )

    students.loc[i, "assignment_completion"] = np.round(
        np.random.uniform(40, 65),
        1
    )

    students.loc[i, "aptitude_score"] = np.round(
        np.random.uniform(40, 65),
        1
    )

    students.loc[i, "coding_score"] = np.round(
        np.random.uniform(35, 65),
        1
    )

    students.loc[i, "mock_interview_score"] = np.round(
        np.random.uniform(35, 65),
        1
    )

    students.loc[i, "technical_skill"] = np.round(
        np.random.uniform(40, 65),
        1
    )

    students.loc[i, "soft_skill"] = np.round(
        np.random.uniform(40, 70),
        1
    )

    students.loc[i, "student_satisfaction"] = np.round(
        np.random.uniform(40, 70),
        1
    )

    students.loc[i, "faculty_feedback"] = np.round(
        np.random.uniform(40, 70),
        1
    )


# ============================================================
# GUARANTEE STUDENT SEGMENTS
# ============================================================


# ------------------------------------------------------------
# HIGH PERFORMERS
# ------------------------------------------------------------

for i in range(200, 220):

    students.loc[i, "cgpa"] = np.round(
        np.random.uniform(8.2, 9.8),
        2
    )

    students.loc[i, "coding_score"] = np.round(
        np.random.uniform(75, 95),
        1
    )

    students.loc[i, "subject_performance"] = np.round(
        np.random.uniform(80, 98),
        1
    )

    students.loc[i, "attendance"] = np.round(
        np.random.uniform(85, 100),
        1
    )

    students.loc[i, "assignment_completion"] = np.round(
        np.random.uniform(85, 100),
        1
    )

    students.loc[i, "aptitude_score"] = np.round(
        np.random.uniform(75, 95),
        1
    )

    students.loc[i, "mock_interview_score"] = np.round(
        np.random.uniform(75, 95),
        1
    )

    students.loc[i, "technical_skill"] = np.round(
        np.random.uniform(80, 95),
        1
    )

    students.loc[i, "soft_skill"] = np.round(
        np.random.uniform(80, 95),
        1
    )

    students.loc[i, "student_satisfaction"] = np.round(
        np.random.uniform(80, 95),
        1
    )

    students.loc[i, "faculty_feedback"] = np.round(
        np.random.uniform(80, 95),
        1
    )

    students.loc[i, "backlogs"] = 0

    students.loc[i, "lms_login_frequency"] = np.round(
        np.random.uniform(80, 100),
        1
    )

    students.loc[i, "events_participated"] = np.random.randint(
        4,
        8
    )

    students.loc[i, "clubs_participated"] = np.random.randint(
        1,
        4
    )

    students.loc[i, "hackathons"] = np.random.randint(
        1,
        4
    )

    students.loc[i, "certifications"] = np.random.randint(
        2,
        6
    )


# ------------------------------------------------------------
# ACADEMIC STRONG / PLACEMENT RISK
# ------------------------------------------------------------

for i in range(220, 240):

    students.loc[i, "cgpa"] = np.round(
        np.random.uniform(7.2, 8.5),
        2
    )

    students.loc[i, "coding_score"] = np.round(
        np.random.uniform(35, 52),
        1
    )

    students.loc[i, "subject_performance"] = np.round(
        np.random.uniform(75, 90),
        1
    )

    students.loc[i, "attendance"] = np.round(
        np.random.uniform(75, 90),
        1
    )

    students.loc[i, "assignment_completion"] = np.round(
        np.random.uniform(70, 90),
        1
    )

    students.loc[i, "aptitude_score"] = np.round(
        np.random.uniform(40, 60),
        1
    )

    students.loc[i, "mock_interview_score"] = np.round(
        np.random.uniform(40, 60),
        1
    )

    students.loc[i, "technical_skill"] = np.round(
        np.random.uniform(50, 70),
        1
    )

    students.loc[i, "soft_skill"] = np.round(
        np.random.uniform(60, 80),
        1
    )


# ------------------------------------------------------------
# ACADEMIC RISK
# ------------------------------------------------------------

for i in range(240, 260):

    students.loc[i, "cgpa"] = np.round(
        np.random.uniform(4.8, 5.9),
        2
    )

    students.loc[i, "attendance"] = np.round(
        np.random.uniform(45, 58),
        1
    )

    students.loc[i, "backlogs"] = np.random.randint(
        2,
        5
    )

    students.loc[i, "subject_performance"] = np.round(
        np.random.uniform(35, 55),
        1
    )

    students.loc[i, "assignment_completion"] = np.round(
        np.random.uniform(30, 55),
        1
    )

    students.loc[i, "lms_login_frequency"] = np.round(
        np.random.uniform(15, 40),
        1
    )


# ------------------------------------------------------------
# HIGHLY ENGAGED
# ------------------------------------------------------------

for i in range(260, 280):

    students.loc[i, "attendance"] = np.round(
        np.random.uniform(82, 98),
        1
    )

    students.loc[i, "assignment_completion"] = np.round(
        np.random.uniform(82, 100),
        1
    )

    students.loc[i, "lms_login_frequency"] = np.round(
        np.random.uniform(75, 100),
        1
    )

    students.loc[i, "events_participated"] = np.random.randint(
        5,
        10
    )

    students.loc[i, "clubs_participated"] = np.random.randint(
        2,
        5
    )

    students.loc[i, "hackathons"] = np.random.randint(
        1,
        4
    )

    students.loc[i, "certifications"] = np.random.randint(
        3,
        7
    )

    students.loc[i, "cgpa"] = np.round(
        np.random.uniform(6.5, 8.5),
        2
    )

    students.loc[i, "subject_performance"] = np.round(
        np.random.uniform(70, 90),
        1
    )


# ============================================================
# PLACEMENT OUTCOME
# ============================================================

students["placement_outcome"] = np.where(
    (
        (students["aptitude_score"] >= 65)
        &
        (students["coding_score"] >= 60)
        &
        (students["technical_skill"] >= 60)
        &
        (students["mock_interview_score"] >= 60)
    ),
    "Ready",
    "Needs Preparation"
)


# ============================================================
# INTERVENTION LABEL
# ============================================================

risk_signal = (
    (students["cgpa"] < 6.0).astype(int) * 2
    +
    (students["attendance"] < 60).astype(int) * 2
    +
    (students["assignment_completion"] < 55).astype(int)
    +
    (students["coding_score"] < 50).astype(int)
    +
    (students["aptitude_score"] < 50).astype(int)
    +
    (students["mock_interview_score"] < 50).astype(int)
    +
    (students["backlogs"] >= 2).astype(int) * 2
    +
    (students["student_satisfaction"] < 50).astype(int)
)

students["intervention_label"] = np.where(
    risk_signal >= 4,
    1,
    0
)


# ============================================================
# SAVE DATASET
# ============================================================

DATA_DIR = Path("data")

DATA_DIR.mkdir(
    exist_ok=True
)

students.to_csv(
    DATA_DIR / "students.csv",
    index=False
)


# ============================================================
# FINAL INFORMATION
# ============================================================

print(
    f"Created data/students.csv with {len(students)} students."
)

print()
print("Department distribution:")
print(
    students["department"].value_counts()
)

print()
print("Sample student names:")
print(
    students[["student_id", "name"]].head(10).to_string(index=False)
)

print()
print("Dataset generation complete.")