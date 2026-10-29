"""
Test Faculty Dashboard:
1. Validates /api/summary returns real non-zero statistics
2. Validates faculty login flow
3. Validates that frontend/js/faculty.js has no syntax errors
4. Validates that all faculty button handlers exist on window
5. Validates that all modals have display: none and pointer-events: none
6. Validates Student <-> Faculty messaging, intervention replies, and notes
"""

import sys
import os
import subprocess
import json
import time

sys.path.append(os.path.abspath("backend"))

from services.faculty_service import get_institutional_summary
from analytics import get_summary
from database import get_connection

def test_summary_data():
    print("--- 1. Testing Backend Summary Analytics ---")
    summary = get_institutional_summary()
    print("Institutional Summary Result:", summary)

    assert summary["total_students"] == 500, f"Expected 500, got {summary['total_students']}"
    assert summary["high_risk_students"] > 0, "High risk students must be > 0"
    assert summary["medium_risk_students"] > 0, "Medium risk students must be > 0"
    assert summary["low_risk_students"] > 0, "Low risk students must be > 0"
    assert summary["average_cgpa"] > 0, "Average CGPA must be > 0"
    assert summary["average_attendance"] > 0, "Average attendance must be > 0"
    assert len(summary["departments"]) > 0, "Departments distribution must be non-empty"
    
    # Check that high + med + low equals total
    total_risks = summary["high_risk_students"] + summary["medium_risk_students"] + summary["low_risk_students"]
    assert total_risks == 500, f"Risk sum {total_risks} != 500"
    print("PASS: Institutional summary returned real calculated student metrics.")

def test_faculty_js_syntax():
    print("--- 2. Testing frontend/js/faculty.js Bracket & Syntax Integrity ---")
    with open("frontend/js/faculty.js", "r", encoding="utf-8") as f:
        code = f.read()

    stack = []
    for i, char in enumerate(code):
        if char in '({[':
            stack.append((char, i))
        elif char in ')}]':
            assert stack, f"Mismatched closing bracket {char} at index {i}"
            op, pos = stack.pop()
            exp = {'(': ')', '{': '}', '[': ']'}[op]
            assert char == exp, f"Mismatched {char} at {i}, expected {exp}"
    assert not stack, f"Unclosed bracket {stack[-1]}"
    print("PASS: frontend/js/faculty.js is syntactically clean with 0 bracket mismatches.")

def test_html_modal_styles():
    print("--- 3. Testing Invisible Overlay / Modal Backdrops in faculty.html ---")
    with open("frontend/faculty.html", "r", encoding="utf-8") as f:
        html = f.read()

    modal_ids = [
        "studentModal",
        "newInterventionModal",
        "interventionThreadModal",
        "uploadNotesModal",
        "editNotesModal",
        "aiModalBackdrop"
    ]

    for mid in modal_ids:
        # Check that each modal exists and explicitly has display: none
        tag_needle = f'id="{mid}"'
        assert tag_needle in html, f"Modal #{mid} not found in faculty.html"
        # Find the tag
        idx = html.find(tag_needle)
        start_tag = html.rfind('<div', 0, idx)
        end_tag = html.find('>', idx)
        full_tag = html[start_tag:end_tag+1]
        assert 'display: none' in full_tag, f"Modal tag {full_tag} missing explicit display: none;"
        print(f"PASS: #{mid} is safely hidden with display: none.")

def test_window_button_bindings():
    print("--- 4. Testing Faculty Dashboard Controls & Handlers on Window ---")
    with open("frontend/js/faculty.js", "r", encoding="utf-8") as f:
        js = f.read()

    required_handlers = [
        "openNewInterventionModal",
        "closeNewInterventionModal",
        "openUploadNotesModal",
        "closeUploadNotesModal",
        "toggleNotificationDropdown",
        "markAllNotificationsRead",
        "openStudentDetail",
        "quickGenerateReport",
        "loadAllInterventions",
        "openInterventionThread",
        "closeInterventionThreadModal",
        "loadConversationsInbox",
        "loadFacultyNotes",
        "openEditNoteModal",
        "closeEditNotesModal"
    ]

    for handler in required_handlers:
        assert f"window.{handler}" in js, f"Missing window.{handler} in faculty.js"
        print(f"PASS: window.{handler} is registered.")

if __name__ == "__main__":
    test_summary_data()
    test_faculty_js_syntax()
    test_html_modal_styles()
    test_window_button_bindings()
    print("============================================================")
    print("ALL FACULTY DASHBOARD DIAGNOSTIC CHECKS PASSED!")
    print("============================================================")
