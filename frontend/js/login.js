/**
 * AI Student Success Platform — University Login Controller
 */

// Global role tracker
var currentRole = "student";

function setRole(role) {
    currentRole = (role === "faculty") ? "faculty" : "student";
    const isStudent = (currentRole === "student");

    // Update segmented control buttons
    const studentTab = document.getElementById("tabStudent");
    const facultyTab = document.getElementById("tabFaculty");

    if (studentTab) {
        studentTab.classList.toggle("active", isStudent);
        studentTab.setAttribute("aria-selected", isStudent ? "true" : "false");
    }
    if (facultyTab) {
        facultyTab.classList.toggle("active", !isStudent);
        facultyTab.setAttribute("aria-selected", !isStudent ? "true" : "false");
    }

    // Toggle by data-role as well
    document.querySelectorAll(".role-tab-btn").forEach(btn => {
        const isMatch = btn.getAttribute("data-role") === currentRole;
        btn.classList.toggle("active", isMatch);
        btn.setAttribute("aria-selected", isMatch ? "true" : "false");
    });

    // Form inputs and hints
    const studentGroup = document.getElementById("studentIdGroup");
    const facultyGroup = document.getElementById("facultyIdGroup");
    const studentInput = document.getElementById("studentId");
    const facultyInput = document.getElementById("facultyId");
    const loginIdInput = document.getElementById("loginId");
    const passwordInput = document.getElementById("password");
    const passwordHint = document.getElementById("passwordHint");
    const submitBtnText = document.getElementById("submitBtnText");
    const studentDemo = document.getElementById("studentDemoBox");
    const facultyDemo = document.getElementById("facultyDemoBox");

    if (isStudent) {
        if (studentGroup) studentGroup.style.display = "block";
        if (facultyGroup) facultyGroup.style.display = "none";
        if (facultyInput) facultyInput.value = "";
        if (studentInput) {
            if (loginIdInput) loginIdInput.value = studentInput.value;
            setTimeout(() => studentInput.focus(), 50);
        }
        if (submitBtnText) submitBtnText.textContent = "Sign in as Student";
        if (passwordHint) passwordHint.textContent = "Default student password is your Student ID";
        if (studentDemo) studentDemo.style.display = "block";
        if (facultyDemo) facultyDemo.style.display = "none";
    } else {
        if (studentGroup) studentGroup.style.display = "none";
        if (facultyGroup) facultyGroup.style.display = "block";
        if (studentInput) studentInput.value = "";
        if (facultyInput) {
            if (loginIdInput) loginIdInput.value = facultyInput.value;
            setTimeout(() => facultyInput.focus(), 50);
        }
        if (submitBtnText) submitBtnText.textContent = "Sign in as Faculty";
        if (passwordHint) passwordHint.textContent = "Default faculty password is your Faculty ID";
        if (studentDemo) studentDemo.style.display = "none";
        if (facultyDemo) facultyDemo.style.display = "block";
    }

    if (passwordInput) passwordInput.value = "";
    clearMessage();
}

// Expose setRole globally for immediate onclick availability
window.setRole = setRole;

window.quickFill = function (id, pwd) {
    const isStudent = (currentRole === "student");
    const targetInput = isStudent
        ? document.getElementById("studentId")
        : document.getElementById("facultyId");

    if (targetInput) targetInput.value = id;
    const loginId = document.getElementById("loginId");
    if (loginId) loginId.value = id;

    const pwdEl = document.getElementById("password");
    if (pwdEl) pwdEl.value = pwd;
    clearMessage();
};

function showMessage(msg, type = "error") {
    const el = document.getElementById("loginMessage");
    if (!el) return;
    el.textContent = msg;
    el.className = `login-message ${type}`;
    el.style.display = "block";
}

function clearMessage() {
    const el = document.getElementById("loginMessage");
    if (!el) return;
    el.className = "login-message";
    el.style.display = "none";
    el.textContent = "";
}

async function performLogin(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    clearMessage();

    const isStudent = (currentRole === "student");
    const studentInput = document.getElementById("studentId");
    const facultyInput = document.getElementById("facultyId");
    const fallbackInput = document.getElementById("loginId");
    const pwdInput = document.getElementById("password");
    const submitBtn = document.getElementById("submitBtn");
    const submitBtnText = document.getElementById("submitBtnText");

    const rawId = isStudent
        ? (studentInput?.value || fallbackInput?.value || "")
        : (facultyInput?.value || fallbackInput?.value || "");

    const id = rawId.trim().toUpperCase();
    const password = pwdInput ? pwdInput.value.trim() : "";

    if (!id) {
        showMessage(`Please enter your ${isStudent ? "Student" : "Faculty"} ID.`);
        if (isStudent && studentInput) studentInput.focus();
        else if (!isStudent && facultyInput) facultyInput.focus();
        return;
    }
    if (!password) {
        showMessage("Please enter your password.");
        if (pwdInput) pwdInput.focus();
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        if (submitBtnText) submitBtnText.textContent = "Authenticating...";
    }

    // Determine endpoint and payload
    const endpoint = isStudent ? "/api/student/login" : "/api/faculty/login";
    const payload = isStudent
        ? { student_id: id, password: password }
        : { faculty_id: id, password: password };

    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            if (res.status === 401) {
                throw new Error(isStudent ? "Invalid Student ID or password" : "Invalid Faculty ID or password");
            } else if (res.status >= 500) {
                throw new Error("Server unavailable. Please try again later.");
            }
            const errData = await res.json().catch(() => ({ detail: "Login failed. Please check credentials." }));
            throw new Error(errData.detail || errData.message || "Login failed. Please check credentials.");
        }

        const data = await res.json();
        const token = data.token || data.access_token;
        if (!token) {
            throw new Error("No security token returned by the server.");
        }

        // Clean any old session leftovers to avoid role cross-contamination
        const keysToClean = [
            "auth_token", "user_role", "user_id", "user_name",
            "student_id", "faculty_id", "student_token", "studentToken",
            "faculty_token", "facultyToken"
        ];
        keysToClean.forEach(k => {
            sessionStorage.removeItem(k);
            localStorage.removeItem(k);
        });

        const verifiedRole = (data.role || currentRole).toLowerCase();
        const userId = data.user_id || id;

        // Store active session credentials
        sessionStorage.setItem("auth_token", token);
        sessionStorage.setItem("user_role", verifiedRole);
        sessionStorage.setItem("user_id", userId);

        localStorage.setItem("auth_token", token);
        localStorage.setItem("user_role", verifiedRole);
        localStorage.setItem("user_id", userId);

        if (verifiedRole === "student") {
            sessionStorage.setItem("student_id", userId);
            localStorage.setItem("student_token", token);
            localStorage.setItem("studentToken", token);
            if (data.student?.name) {
                sessionStorage.setItem("user_name", data.student.name);
                localStorage.setItem("user_name", data.student.name);
            }
        } else {
            sessionStorage.setItem("faculty_id", userId);
            localStorage.setItem("faculty_token", token);
            localStorage.setItem("facultyToken", token);
            if (data.faculty?.name) {
                sessionStorage.setItem("user_name", data.faculty.name);
                localStorage.setItem("user_name", data.faculty.name);
            }
        }

        // Set session cookie
        document.cookie = `auth_token=${token}; path=/; max-age=28800; SameSite=Lax`;

        showMessage("Login successful! Redirecting...", "success");

        const destination = (verifiedRole === "faculty") ? "/faculty.html" : "/student.html";
        setTimeout(() => {
            window.location.replace(destination);
        }, 180);

    } catch (err) {
        console.error("Login attempt failed:", err);
        const msg = (err.name === "TypeError" || String(err).includes("fetch"))
            ? "Server unavailable. Please check backend connection."
            : (err.message || "Login failed. Please try again.");
        showMessage(msg, "error");
        if (submitBtn) {
            submitBtn.disabled = false;
            if (submitBtnText) {
                submitBtnText.textContent = isStudent ? "Sign in as Student" : "Sign in as Faculty";
            }
        }
    }
}

// Backward compatibility alias
var handleLogin = performLogin;
window.performLogin = performLogin;
window.handleLogin = performLogin;

// Initialize when DOM is ready or immediately if already loaded
function initLogin() {
    // Attach click listeners to role tabs
    document.querySelectorAll(".role-tab-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const r = btn.getAttribute("data-role");
            if (r) setRole(r);
        });
    });

    const form = document.getElementById("loginForm");
    if (form) {
        form.addEventListener("submit", performLogin);
    }

    // Default to student
    setRole("student");
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLogin);
} else {
    initLogin();
}
