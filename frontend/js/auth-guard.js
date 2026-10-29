/**
 * AI Student Success Platform — Client-Side Authentication Guard
 */

(function () {
    "use strict";

    const AUTH_TOKEN_KEY = "auth_token";
    const USER_ROLE_KEY = "user_role";

    function getToken() {
        return sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(AUTH_TOKEN_KEY) || "";
    }

    function getRole() {
        return sessionStorage.getItem(USER_ROLE_KEY) || localStorage.getItem(USER_ROLE_KEY) || "";
    }

    function getUserId() {
        return sessionStorage.getItem("user_id") || localStorage.getItem("user_id") || "";
    }

    function clearSession() {
        [
            AUTH_TOKEN_KEY,
            USER_ROLE_KEY,
            "user_id",
            "user_name",
            "student_id",
            "faculty_id",
            "student_token",
            "studentToken",
            "faculty_token",
            "facultyToken"
        ].forEach(key => {
            sessionStorage.removeItem(key);
            localStorage.removeItem(key);
        });
    }

    function logout() {
        clearSession();
        window.location.replace("/login.html");
    }

    // Expose helpers globally immediately
    window.logoutAuth = logout;
    window.logout = logout;
    window.getAuthToken = getToken;
    window.getUserRole = getRole;
    window.getUserId = getUserId;
    window.clearAuthSession = clearSession;
    window.isAuthenticated = function () {
        return Boolean(getToken() && getRole());
    };

    // Route Protection Enforcement
    const path = window.location.pathname.toLowerCase();

    const isLoginPage = path === "/login.html" || path === "/login";
    const isStudentPage = path === "/student.html" || path === "/student";
    const isFacultyPage = path === "/faculty.html" || path === "/faculty" || path === "/index.html" || path === "/";

    const token = getToken();
    const role = getRole().toLowerCase();

    if (isLoginPage) {
        if (token && role === "student") {
            window.location.replace("/student.html");
            return;
        }
        if (token && role === "faculty") {
            window.location.replace("/faculty.html");
            return;
        }
        return;
    }

    if (isStudentPage) {
        if (!token || !role) {
            logout();
            return;
        }
        if (role !== "student") {
            window.location.replace("/faculty.html");
            return;
        }
    }

    if (isFacultyPage) {
        if (!token || !role) {
            logout();
            return;
        }
        if (role !== "faculty") {
            window.location.replace("/student.html");
            return;
        }
    }
})();
