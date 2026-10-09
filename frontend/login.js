
// ============================================================
// AI STUDENT SUCCESS PLATFORM
// Login JavaScript - Reliable Form Submission
// ============================================================

"use strict";

let currentRole = "student";
let loginInProgress = false;

const AUTH_TOKEN_KEY = "auth_token";
const USER_ROLE_KEY = "user_role";

function getElement(id) {
    return document.getElementById(id);
}

// ------------------------------------------------------------
// SESSION
// ------------------------------------------------------------

function clearSession() {
    [
        AUTH_TOKEN_KEY,
        USER_ROLE_KEY,
        "user_id",
        "user_name",
        "student_id",
        "faculty_id"
    ].forEach(key => sessionStorage.removeItem(key));
}

// ------------------------------------------------------------
// MESSAGES
// ------------------------------------------------------------

function showMessage(message, type = "error") {
    const element = getElement("loginMessage");

    if (!element) {
        console.error("Missing HTML element: loginMessage");
        alert(message);
        return;
    }

    element.textContent = String(message);
    element.classList.remove("hidden", "error", "success");
    element.classList.add(type);
}

function clearMessage() {
    const element = getElement("loginMessage");

    if (!element) return;

    element.textContent = "";
    element.classList.add("hidden");
    element.classList.remove("error", "success");
}

// ------------------------------------------------------------
// ROLE SWITCHING
// ------------------------------------------------------------

function setRole(role) {
    currentRole = role === "faculty" ? "faculty" : "student";

    const isStudent = currentRole === "student";

    const studentButton = getElement("studentRoleButton");
    const facultyButton = getElement("facultyRoleButton");
    const studentGroup = getElement("studentIdGroup");
    const facultyGroup = getElement("facultyIdGroup");
    const studentInput = getElement("studentId");
    const facultyInput = getElement("facultyId");
    const passwordInput = getElement("password");
    const passwordHint = getElement("passwordHint");
    const loginButtonText = getElement("loginButtonText");
    const studentDemo = getElement("studentDemoBox");
    const facultyDemo = getElement("facultyDemoBox");

    studentButton?.classList.toggle("active", isStudent);
    facultyButton?.classList.toggle("active", !isStudent);

    studentGroup?.classList.toggle("hidden", !isStudent);
    facultyGroup?.classList.toggle("hidden", isStudent);

    if (studentInput) {
        studentInput.required = isStudent;
        studentInput.disabled = !isStudent;
    }

    if (facultyInput) {
        facultyInput.required = !isStudent;
        facultyInput.disabled = isStudent;
    }

    if (passwordInput) passwordInput.value = "";

    if (passwordHint) {
        passwordHint.textContent = isStudent ? "Student ID" : "Faculty ID";
    }

    if (loginButtonText) {
        loginButtonText.textContent = isStudent
            ? "Sign in as Student"
            : "Sign in as Faculty";
    }

    studentDemo?.classList.toggle("hidden", !isStudent);
    facultyDemo?.classList.toggle("hidden", isStudent);

    clearMessage();
}

function setupRoleButtons() {
    getElement("studentRoleButton")?.addEventListener("click", event => {
        event.preventDefault();
        setRole("student");
    });

    getElement("facultyRoleButton")?.addEventListener("click", event => {
        event.preventDefault();
        setRole("faculty");
    });
}

// ------------------------------------------------------------
// PASSWORD VISIBILITY
// ------------------------------------------------------------

function setupPasswordToggle() {
    const button = getElement("togglePassword");
    const input = getElement("password");

    if (!button || !input) return;

    button.addEventListener("click", event => {
        event.preventDefault();

        const showPassword = input.type === "password";
        input.type = showPassword ? "text" : "password";

        button.textContent = showPassword ? "🙈" : "👁";
        button.setAttribute(
            "aria-label",
            showPassword ? "Hide password" : "Show password"
        );
    });
}

// ------------------------------------------------------------
// LOADING STATE
// ------------------------------------------------------------

function setLoading(isLoading) {
    const button = getElement("loginButton");
    const buttonText = getElement("loginButtonText");
    const arrow = getElement("loginButtonArrow");

    if (button) button.disabled = isLoading;

    if (buttonText) {
        buttonText.textContent = isLoading
            ? "Signing in..."
            : currentRole === "student"
                ? "Sign in as Student"
                : "Sign in as Faculty";
    }

    if (arrow) arrow.textContent = isLoading ? "..." : "→";
}

// ------------------------------------------------------------
// SAVE SESSION
// ------------------------------------------------------------

function saveSession(data) {
    const token = data?.token || data?.access_token || data?.auth_token;

    if (!token) {
        throw new Error(
            "Login response contains no authentication token."
        );
    }

    const isStudent = currentRole === "student";
    const user = isStudent
        ? (data.student || data)
        : (data.faculty || data);

    const id = isStudent
        ? (user.student_id || user.user_id || data.student_id || data.user_id)
        : (user.faculty_id || user.user_id || data.faculty_id || data.user_id);

    const name = user.name || user.full_name || user.username;

    sessionStorage.setItem("auth_token", token);
    sessionStorage.setItem("user_role", currentRole);

    if (id) {
        sessionStorage.setItem("user_id", String(id));
        sessionStorage.setItem(
            isStudent ? "student_id" : "faculty_id",
            String(id)
        );
    }

    if (name) {
        sessionStorage.setItem("user_name", String(name));
    }
}

// ------------------------------------------------------------
// LOGIN REQUEST
// ------------------------------------------------------------

async function performLogin() {
    if (loginInProgress) return;

    clearMessage();

    const isStudent = currentRole === "student";
    const idInput = getElement(isStudent ? "studentId" : "facultyId");
    const passwordInput = getElement("password");

    const accountId = idInput?.value.trim().toUpperCase() || "";
    const password = passwordInput?.value || "";

    if (!accountId) {
        showMessage(`Please enter your ${isStudent ? "Student" : "Faculty"} ID.`);
        idInput?.focus();
        return;
    }

    if (!password.trim()) {
        showMessage("Please enter your password.");
        passwordInput?.focus();
        return;
    }

    const endpoint = isStudent
        ? "/api/student/login"
        : "/api/faculty/login";

    const payload = isStudent
        ? { student_id: accountId, password }
        : { faculty_id: accountId, password };

    loginInProgress = true;
    setLoading(true);

    // This log confirms that the button reached the login handler.
    console.log("Submitting login request:", endpoint);

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        let data = {};

        if (responseText) {
            try {
                data = JSON.parse(responseText);
            } catch {
                throw new Error(
                    `Unexpected server response (HTTP ${response.status}).`
                );
            }
        }

        if (!response.ok) {
            const detail = data.detail || data.message || data.error;

            throw new Error(
                typeof detail === "string"
                    ? detail
                    : `Login failed (HTTP ${response.status}).`
            );
        }

        saveSession(data);

        showMessage("Login successful. Opening your dashboard...", "success");

        window.location.assign(isStudent ? "/student.html" : "/");

    } catch (error) {
        console.error("Login error:", error);

        clearSession();
        showMessage(error.message || "Unable to sign in. Please try again.");

    } finally {
        loginInProgress = false;
        setLoading(false);
    }
}

// ------------------------------------------------------------
// FORM SUBMISSION AND BUTTON CLICK
// ------------------------------------------------------------

function setupLoginForm() {
    const form = getElement("loginForm");
    const button = getElement("loginButton");

    if (!form) {
        console.error("Login form not found: #loginForm");
        showMessage("Login form could not be initialized. Please refresh the page.");
        return;
    }

    // Prevent native navigation and handle normal form submission.
    form.addEventListener("submit", event => {
        event.preventDefault();
        console.log("Login form submit event fired.");
        performLogin();
    });

    // Fallback for clicks if the form submit event is not triggered.
    if (button) {
        button.addEventListener("click", event => {
            event.preventDefault();
            console.log("Login button click event fired.");
            performLogin();
        });

        // Ensure the button has the correct form behavior.
        button.type = "button";
    } else {
        console.error("Login button not found: #loginButton");
    }

    console.log("Login form handlers initialized.");
}

// ------------------------------------------------------------
// INITIALIZATION
// ------------------------------------------------------------

function initializeLoginPage() {
    console.log("Login JavaScript loaded.");

    setupRoleButtons();
    setupPasswordToggle();
    setupLoginForm();
    setRole("student");

    console.log("Login page initialized.");
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeLoginPage, {
        once: true
    });
} else {
    initializeLoginPage();
}