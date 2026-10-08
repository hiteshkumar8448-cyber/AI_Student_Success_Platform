from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import pandas as pd
import joblib
from pathlib import Path

DATA_PATH = "data/students.csv"
MODEL_PATH = "models/risk_model.pkl"

df = pd.read_csv(DATA_PATH)

features = [
    "cgpa",
    "backlogs",
    "attendance",
    "subject_performance",
    "lms_login_frequency",
    "assignment_completion",
    "events_participated",
    "clubs_participated",
    "hackathons",
    "certifications",
    "aptitude_score",
    "coding_score",
    "mock_interview_score",
    "technical_skill",
    "soft_skill",
    "student_satisfaction",
    "faculty_feedback"
]

X = df[features]
y = df["intervention_label"]

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

model = RandomForestClassifier(
    n_estimators=150,
    random_state=42,
    class_weight="balanced"
)

model.fit(X_train, y_train)

predictions = model.predict(X_test)
accuracy = accuracy_score(y_test, predictions)

Path("models").mkdir(exist_ok=True)

joblib.dump(
    {
        "model": model,
        "features": features
    },
    MODEL_PATH
)

print("Risk prediction model trained successfully.")
print(f"Test accuracy: {accuracy:.2%}")
print(f"Saved to: {MODEL_PATH}")
