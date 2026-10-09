// ============================================================
// AI STUDENT SUCCESS PLATFORM
// Authentication Guard
// ============================================================

(function () {

    "use strict";


    // ========================================================
    // STORAGE KEYS
    // ========================================================

    const AUTH_TOKEN_KEY = "auth_token";
    const USER_ROLE_KEY = "user_role";


    // ========================================================
    // SESSION HELPERS
    // ========================================================

    function getToken() {

        return sessionStorage.getItem(
            AUTH_TOKEN_KEY
        );
    }


    function getRole() {

        return sessionStorage.getItem(
            USER_ROLE_KEY
        );
    }


    function clearSession() {

        sessionStorage.removeItem(
            AUTH_TOKEN_KEY
        );

        sessionStorage.removeItem(
            USER_ROLE_KEY
        );

        sessionStorage.removeItem(
            "user_id"
        );

        sessionStorage.removeItem(
            "user_name"
        );

        sessionStorage.removeItem(
            "student_id"
        );

        sessionStorage.removeItem(
            "faculty_id"
        );
    }


    function redirectToLogin() {

        if (
            window.location.pathname !==
            "/login.html"
        ) {

            window.location.replace(
                "/login.html"
            );
        }
    }


    function redirectToStudent() {

        window.location.replace(
            "/student.html"
        );
    }


    function redirectToFaculty() {

        window.location.replace(
            "/"
        );
    }


    // ========================================================
    // EXPOSE HELPERS FIRST
    //
    // Important:
    // These must be available on protected pages too.
    // ========================================================

    window.logoutAuth = function () {

        clearSession();

        window.location.replace(
            "/login.html"
        );
    };


    window.getAuthToken = function () {

        return getToken();
    };


    window.getUserRole = function () {

        return getRole();
    };


    window.isAuthenticated = function () {

        return Boolean(
            getToken() &&
            getRole()
        );
    };


    window.clearAuthSession = function () {

        clearSession();
    };


    // ========================================================
    // PATH
    // ========================================================

    const path =
        window.location.pathname
            .toLowerCase();


    const isLoginPage =
        path === "/login.html" ||
        path === "/login";


    const isStudentPage =
        path === "/student.html" ||
        path === "/student";


    const isFacultyPage =
        path === "/" ||
        path === "/index.html";


    const token =
        getToken();

    const role =
        getRole();


    // ========================================================
    // LOGIN PAGE
    // ========================================================

    if (isLoginPage) {

        if (token && role === "student") {

            redirectToStudent();

            return;
        }


        if (token && role === "faculty") {

            redirectToFaculty();

            return;
        }


        return;
    }


    // ========================================================
    // STUDENT PAGE
    // ========================================================

    if (isStudentPage) {

        if (!token || !role) {

            redirectToLogin();

            return;
        }


        if (role !== "student") {

            if (role === "faculty") {

                redirectToFaculty();

            } else {

                clearSession();

                redirectToLogin();
            }

            return;
        }


        return;
    }


    // ========================================================
    // FACULTY PAGE
    // ========================================================

    if (isFacultyPage) {

        if (!token || !role) {

            redirectToLogin();

            return;
        }


        if (role !== "faculty") {

            if (role === "student") {

                redirectToStudent();

            } else {

                clearSession();

                redirectToLogin();
            }

            return;
        }


        return;
    }

})();