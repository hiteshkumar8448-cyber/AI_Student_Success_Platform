/* =========================================================
   STUDENT SUCCESS AI - FACULTY APP
   ========================================================= */

"use strict";

/* =========================================================
   GLOBAL STATE
========================================================= */

let currentStudents = [];
let activeStudent = null;
let activeStudentForNotes = null;

let studentLoadRequest = 0;
let typingMessageCounter = 0;

let facultyInterventions = [];
let facultyReports = [];
let globalFacultyNotes = [];


/* =========================================================
   BASIC HELPERS
========================================================= */

function getElement(id) {
    return document.getElementById(id);
}


function escapeHtml(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function safeNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}


function formatDate(dateValue) {
    if (!dateValue) {
        return "-";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return dateValue;
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}


function formatDateTime(dateValue) {
    if (!dateValue) {
        return "-";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return dateValue;
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


function showElement(element) {
    if (element) {
        element.classList.remove("hidden");
    }
}


function hideElement(element) {
    if (element) {
        element.classList.add("hidden");
    }
}


function setText(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent =
            value === null || value === undefined
                ? "-"
                : value;
    }
}


function setHtml(id, value) {
    const element = getElement(id);

    if (element) {
        element.innerHTML = value || "";
    }
}



/* =========================================================
   AUTH TOKEN HELPER
   Supports the existing login.js sessionStorage token
   and legacy localStorage token keys.
========================================================= */

function getFacultyToken() {
    const tokenKeys = [
        "auth_token",
        "faculty_token",
        "facultyToken",
        "faculty_access_token",
        "access_token",
        "token",
        "portal_token"
    ];

    for (const storage of [sessionStorage, localStorage]) {
        for (const key of tokenKeys) {
            const token = storage.getItem(key);

            if (token && token.trim()) {
                return token.trim();
            }
        }
    }

    return "";
}

function getStudentToken() {
    const tokenKeys = [
        "student_token",
        "studentToken"
    ];

    for (const storage of [sessionStorage, localStorage]) {
        for (const key of tokenKeys) {
            const token = storage.getItem(key);

            if (token && token.trim()) {
                return token.trim();
            }
        }
    }

    return "";
}




/* =========================================================
   API REQUEST
========================================================= */

async function apiRequest(url, options = {}) {
    const headers = {
        ...(options.headers || {})
    };

    const isFormData =
        typeof FormData !== "undefined" &&
        options.body instanceof FormData;

    if (!isFormData && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    // Use the logged-in faculty token for faculty API requests.
    const token = getFacultyToken();

    if (token) {
        // Always use the current token rather than a stale header.
        headers["Authorization"] = `Bearer ${token}`;
    }

    const requestOptions = {
        ...options,
        headers,
        credentials: "same-origin"
    };

    let response;

    try {
        response = await fetch(url, requestOptions);
    } catch (error) {
        console.error("API network error:", error);

        throw new Error(
            "Cannot connect to the server. Check that your backend is running."
        );
    }

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const message =
            data?.detail ||
            data?.message ||
            data?.error ||
            `Request failed with status ${response.status}`;

        if (response.status === 401 || response.status === 403) {
            console.error(
                "Authentication error:",
                response.status,
                message,
                "Token found:",
                Boolean(token)
            );
        }

        throw new Error(message);
    }

    return data;
}



/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupNavigation();
        setupNotificationButton();

        /*
         * The current index.html does not contain a Subject
         * input. This creates it automatically.
         */
        setupFacultySubjectField();


        try {

            await loadFacultyProfile();

        } catch (error) {

            console.error(
                "Faculty profile error:",
                error
            );

        }


        try {

            await loadDashboard();

        } catch (error) {

            console.error(
                "Dashboard loading error:",
                error
            );

        }


        try {

            await loadStudents();

        } catch (error) {

            console.error(
                "Student loading error:",
                error
            );

        }


        try {

            await loadFacultyNotes();

        } catch (error) {

            console.error(
                "Faculty notes loading error:",
                error
            );

        }


        try {

            await loadFacultyInterventions();

        } catch (error) {

            console.error(
                "Intervention loading error:",
                error
            );

        }


        try {

            await loadFacultyReports();

        } catch (error) {

            console.error(
                "Report loading error:",
                error
            );

        }


        setTodayAsMinimumDate();

    }
);


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    const navLinks =
        document.querySelectorAll(".nav-link");


    navLinks.forEach(link => {

        link.addEventListener(
            "click",
            () => {

                navLinks.forEach(item => {

                    item.classList.remove(
                        "active"
                    );

                });


                link.classList.add(
                    "active"
                );

            }
        );

    });


    window.addEventListener(
        "scroll",
        () => {

            const sections = [
                "dashboard",
                "students",
                "analytics",
                "interventions"
            ];


            let current =
                "dashboard";


            sections.forEach(
                sectionId => {

                    const section =
                        document.getElementById(
                            sectionId
                        );


                    if (!section) {
                        return;
                    }


                    const rect =
                        section.getBoundingClientRect();


                    if (rect.top <= 160) {
                        current = sectionId;
                    }

                }
            );


            navLinks.forEach(link => {

                const href =
                    link.getAttribute("href");


                link.classList.toggle(
                    "active",
                    href === `#${current}`
                );

            });

        }
    );

}


/* =========================================================
   FACULTY PROFILE
========================================================= */

async function loadFacultyProfile() {

    try {

        const data =
            await apiRequest(
                "/api/faculty/me",
                {
                    method: "GET"
                }
            );


        const faculty =
            data?.faculty ||
            data?.data ||
            data;


        const name =
            faculty?.name ||
            faculty?.faculty_name ||
            faculty?.username ||
            "Faculty";


        setText(
            "facultyDisplayName",
            name
        );


        const facultyNameInput =
            getElement("facultyName");


        if (
            facultyNameInput &&
            !facultyNameInput.value.trim()
        ) {

            facultyNameInput.value =
                name;

        }

    } catch (error) {

        console.warn(
            "Could not load faculty profile:",
            error
        );


        setText(
            "facultyDisplayName",
            "Faculty"
        );

    }

}


/* =========================================================
   DASHBOARD SUMMARY
========================================================= */

async function loadDashboard() {

    const data =
        await apiRequest(
            "/api/summary",
            {
                method: "GET"
            }
        );


    const summary =
        data?.summary ||
        data?.data ||
        data;


    renderDashboardSummary(
        summary
    );


    if (data?.segments) {

        renderSegments(
            data.segments
        );

    }


    if (summary?.segments) {

        renderSegments(
            summary.segments
        );

    }

}



function renderDashboardSummary(summary) {
    summary = summary || {};

    const safeNumber = (value) => {
        const number = Number(value);
        return Number.isFinite(number) && number >= 0
            ? number
            : 0;
    };

    const totalStudents = safeNumber(
        summary.total_students ?? summary.totalStudents
    );

    const onTrackCount = safeNumber(
        summary.on_track ?? summary.onTrack
    );

    const attentionCount = safeNumber(
        summary.needs_attention ?? summary.needsAttention
    );

    const supportCount = safeNumber(
        summary.immediate_support ?? summary.immediateSupport
    );

    // Calculate percentages from backend counts.
    const percentage = (count) => {
        if (totalStudents === 0) return 0;

        return Math.round((count / totalStudents) * 1000) / 10;
    };

    const onTrack = percentage(onTrackCount);
    const attention = percentage(attentionCount);
    const support = percentage(supportCount);

    // Update percentage labels.
    setText("onTrackPercent", `${onTrack}%`);
    setText("attentionPercent", `${attention}%`);
    setText("supportPercent", `${support}%`);

    // Update progress bars, if present.
    const setBarWidth = (id, value) => {
        const bar = getElement(id);

        if (bar) {
            bar.style.width = `${Math.min(100, value)}%`;
            bar.setAttribute("aria-valuenow", String(value));
        }
    };

    setBarWidth("onTrackBar", onTrack);
    setBarWidth("attentionBar", attention);
    setBarWidth("supportBar", support);

    // Update other dashboard summary cards when present.
    setText("totalStudents", totalStudents);
    setText(
        "averageSuccessScore",
        safeNumber(summary.average_success_score).toFixed(1)
    );
    setText(
        "averageAttendance",
        `${safeNumber(summary.average_attendance).toFixed(1)}%`
    );
    setText(
        "averageCGPA",
        safeNumber(summary.average_cgpa).toFixed(1)
    );
    setText(
        "placementReady",
        safeNumber(summary.placement_ready)
    );
    setText(
        "decliningStudents",
        safeNumber(summary.declining_students)
    );
    setText(
        "improvingStudents",
        safeNumber(summary.improving_students)
    );
    setText(
        "criticalStudents",
        safeNumber(summary.critical_students)
    );
    setText(
        "highRiskStudents",
        safeNumber(summary.high_risk_students)
    );
    setText(
        "requiringIntervention",
        safeNumber(summary.requiring_intervention)
    );
    setText(
        "lowAttendanceStudents",
        safeNumber(summary.low_attendance_students)
    );
    setText(
        "backlogStudents",
        safeNumber(summary.backlog_students)
    );
    setText(
        "pendingInterventions",
        safeNumber(summary.pending_interventions)
    );
    setText(
        "completedInterventions",
        safeNumber(summary.completed_interventions)
    );
}



/* =========================================================
   STUDENTS
========================================================= */

async function loadStudents() {

    const requestId =
        ++studentLoadRequest;


    const search =
        getElement("search")
            ?.value.trim() ||
        "";


    const risk =
        getElement("riskFilter")
            ?.value ||
        "All";


    const department =
        getElement("departmentFilter")
            ?.value ||
        "All";


    const trend =
        getElement("trendFilter")
            ?.value ||
        "All";


    const priority =
        getElement("priorityFilter")
            ?.value ||
        "All";


    let data;


    try {

        data =
            await apiRequest(
                "/api/students",
                {
                    method: "GET"
                }
            );

    } catch (error) {

        console.error(
            "Could not load students:",
            error
        );


        renderStudentTable([]);

        return;

    }


    if (
        requestId !==
        studentLoadRequest
    ) {

        return;

    }


    let students =
        data?.students ||
        data?.data ||
        data ||
        [];


    if (!Array.isArray(students)) {

        students = [];

    }


    currentStudents =
        students;


    populateDepartmentFilter(
        students
    );


    students =
        students.filter(
            student => {

                const studentName =
                    String(
                        student.name ||
                        student.student_name ||
                        ""
                    ).toLowerCase();


                const studentId =
                    String(
                        student.student_id ||
                        student.id ||
                        ""
                    ).toLowerCase();


                const departmentValue =
                    String(
                        student.department ||
                        ""
                    );


                const riskValue =
                    String(
                        student.risk_level ||
                        student.risk ||
                        student.risk_tier ||
                        ""
                    );


                const trendValue =
                    String(
                        student.performance_trend ||
                        student.trend ||
                        ""
                    );


                const priorityValue =
                    String(
                        student.priority ||
                        student.priority_tier ||
                        ""
                    );


                const matchesSearch =
                    !search ||
                    studentName.includes(
                        search.toLowerCase()
                    ) ||
                    studentId.includes(
                        search.toLowerCase()
                    );


                const matchesRisk =
                    risk === "All" ||
                    normalizeRisk(
                        riskValue
                    ) ===
                    normalizeRisk(
                        risk
                    );


                const matchesDepartment =
                    department === "All" ||
                    departmentValue ===
                    department;


                const matchesTrend =
                    trend === "All" ||
                    trendValue.toLowerCase() ===
                    trend.toLowerCase();


                const matchesPriority =
                    priority === "All" ||
                    priorityValue.toLowerCase() ===
                    priority.toLowerCase();


                return (
                    matchesSearch &&
                    matchesRisk &&
                    matchesDepartment &&
                    matchesTrend &&
                    matchesPriority
                );

            }
        );


    renderStudentTable(
        students
    );

}


function normalizeRisk(value) {

    const text =
        String(value || "")
            .toLowerCase();


    if (
        text.includes("critical") ||
        text.includes("immediate")
    ) {

        return "immediate support";

    }


    if (
        text.includes("high") ||
        text.includes("attention") ||
        text.includes("medium")
    ) {

        return "needs attention";

    }


    if (
        text.includes("low") ||
        text.includes("on track")
    ) {

        return "on track";

    }


    return text;

}


function populateDepartmentFilter(
    students
) {

    const select =
        getElement(
            "departmentFilter"
        );


    if (!select) {
        return;
    }


    const currentValue =
        select.value ||
        "All";


    const departments =
        [
            ...new Set(
                students
                    .map(
                        student =>
                            student.department
                    )
                    .filter(Boolean)
            )
        ]
        .sort();


    select.innerHTML = `
        <option value="All">
            All
        </option>

        ${
            departments
                .map(
                    department => `
                        <option
                            value="${escapeHtml(
                                department
                            )}"
                        >
                            ${escapeHtml(
                                department
                            )}
                        </option>
                    `
                )
                .join("")
        }
    `;


    if (
        departments.includes(
            currentValue
        )
    ) {

        select.value =
            currentValue;

    } else {

        select.value =
            "All";

    }

}


function renderStudentTable(
    students
) {

    const table =
        getElement(
            "studentTable"
        );


    if (!table) {
        return;
    }


    if (!students.length) {

        table.innerHTML = `
            <tr>

                <td colspan="8">

                    <div class="empty-state">
                        No students match the selected filters.
                    </div>

                </td>

            </tr>
        `;

        return;
    }


    table.innerHTML =
        students.map(
            student => {

                const id =
                    student.student_id ||
                    student.id ||
                    "";


                const name =
                    student.name ||
                    student.student_name ||
                    "Student";


                const department =
                    student.department ||
                    "-";


                const year =
                    student.year ||
                    student.semester ||
                    "-";


                const priority =
                    student.priority ||
                    student.priority_tier ||
                    student.risk_level ||
                    "Stable";


                const cgpa =
                    student.cgpa ??
                    student.current_cgpa ??
                    "-";


                const trend =
                    student.performance_trend ||
                    student.trend ||
                    "Stable";


                const attendance =
                    student.attendance ??
                    student.attendance_percentage ??
                    "-";


                const risk =
                    student.ml_risk ||
                    student.risk_level ||
                    student.risk ||
                    "-";


                const successScore =
                    student.success_score ??
                    student.successScore ??
                    "-";


                return `
                    <tr>

                        <td>

                            <div class="student-table-name">

                                <strong>
                                    ${escapeHtml(name)}
                                </strong>

                                <small>
                                    ${escapeHtml(id)}
                                </small>

                            </div>

                        </td>


                        <td>

                            ${escapeHtml(
                                department
                            )}

                            <br>

                            <small>
                                Year
                                ${escapeHtml(
                                    year
                                )}
                            </small>

                        </td>


                        <td>

                            <span class="priority-badge">
                                ${escapeHtml(
                                    priority
                                )}
                            </span>

                        </td>


                        <td>

                            <strong>
                                ${escapeHtml(
                                    cgpa
                                )}
                            </strong>

                            <br>

                            <small>
                                ${escapeHtml(
                                    trend
                                )}
                            </small>

                        </td>


                        <td>
                            ${escapeHtml(
                                attendance
                            )}%
                        </td>


                        <td>
                            ${escapeHtml(
                                risk
                            )}
                        </td>


                        <td>

                            <strong>
                                ${escapeHtml(
                                    successScore
                                )}
                            </strong>

                        </td>


                        <td>

                            <button
                                type="button"
                                class="outline-button"
                                onclick="openStudentProfile('${escapeHtml(id)}')"
                            >
                                View Profile
                            </button>

                        </td>

                    </tr>
                `;

            }
        ).join("");

}


/* =========================================================
   STUDENT FILTERS
========================================================= */

function clearStudentFilters() {

    const search =
        getElement("search");


    const risk =
        getElement("riskFilter");


    const department =
        getElement("departmentFilter");


    const trend =
        getElement("trendFilter");


    const priority =
        getElement("priorityFilter");


    if (search) {
        search.value = "";
    }


    if (risk) {
        risk.value = "All";
    }


    if (department) {
        department.value = "All";
    }


    if (trend) {
        trend.value = "All";
    }


    if (priority) {
        priority.value = "All";
    }


    loadStudents();

}


function filterStudentsByPriority(
    priority
) {

    const filter =
        getElement(
            "priorityFilter"
        );


    if (filter) {
        filter.value =
            priority;
    }


    loadStudents();

}


function filterStudentsByTrend(
    trend
) {

    const filter =
        getElement(
            "trendFilter"
        );


    if (filter) {
        filter.value =
            trend;
    }


    loadStudents();

}


function filterStudentsByMetric(
    metric
) {

    clearStudentFilters();


    if (
        !Array.isArray(
            currentStudents
        )
    ) {

        return;

    }


    let filtered =
        currentStudents;


    if (
        metric ===
        "requiring_intervention"
    ) {

        filtered =
            currentStudents.filter(
                student => {

                    const risk =
                        String(
                            student.risk_level ||
                            student.risk ||
                            ""
                        ).toLowerCase();


                    return (
                        risk.includes("high") ||
                        risk.includes("critical") ||
                        risk.includes("immediate")
                    );

                }
            );

    }


    if (
        metric ===
        "low_attendance"
    ) {

        filtered =
            currentStudents.filter(
                student =>
                    safeNumber(
                        student.attendance
                    ) < 75
            );

    }


    if (
        metric ===
        "backlogs"
    ) {

        filtered =
            currentStudents.filter(
                student =>
                    safeNumber(
                        student.backlogs
                    ) >= 2
            );

    }


    if (
        metric ===
        "pending_interventions"
    ) {

        filtered =
            currentStudents.filter(
                student =>
                    safeNumber(
                        student.pending_interventions
                    ) > 0
            );

    }


    if (
        metric ===
        "completed_interventions"
    ) {

        filtered =
            currentStudents.filter(
                student =>
                    safeNumber(
                        student.completed_interventions
                    ) > 0
            );

    }


    renderStudentTable(
        filtered
    );

}


/* =========================================================
   STUDENT PROFILE
========================================================= */

async function openStudentProfile(
    studentId
) {

    try {

        const data =
            await apiRequest(
                `/api/student/${encodeURIComponent(studentId)}`,
                {
                    method: "GET"
                }
            );


        activeStudent =
            data?.student ||
            data?.data ||
            data;


        if (!activeStudent) {

            throw new Error(
                "Student data not found."
            );

        }


        activeStudentForNotes =
            activeStudent;


        renderStudentProfile(
            activeStudent
        );


        showElement(
            getElement(
                "profileOverlay"
            )
        );


        /*
         * Faculty cannot use the student-only
         * intervention endpoint.
         *
         * We already load all interventions using
         * /api/interventions.
         *
         * Filter those interventions for this student.
         */

        renderActiveStudentInterventions(
            studentId
        );


        renderActiveStudentReports(
            studentId
        );


    } catch (error) {

        console.error(
            "Student profile error:",
            error
        );


        alert(
            `Unable to load student profile: ${error.message}`
        );

    }

}


function closeStudentProfile() {

    hideElement(
        getElement(
            "profileOverlay"
        )
    );


    activeStudent =
        null;


    activeStudentForNotes =
        null;

}


function renderStudentProfile(
    student
) {

    const id =
        student.student_id ||
        student.id ||
        "-";


    const name =
        student.name ||
        student.student_name ||
        "Student";


    setText(
        "profileName",
        name
    );


    setText(
        "profileId",
        `${id} • ${student.department || "-"} • ${student.year || student.semester || "-"}`
    );


    setText(
        "profileScore",
        student.success_score ??
        student.successScore ??
        "-"
    );


    setText(
        "profileTrendText",
        student.performance_trend ||
        student.trend ||
        "-"
    );


    setText(
        "profileSegment",
        student.segment ||
        student.ai_segment ||
        "-"
    );


    setText(
        "profilePlacement",
        student.placement_readiness ||
        student.placement ||
        "-"
    );


    setText(
        "profileCurrentCgpa",
        student.cgpa ??
        student.current_cgpa ??
        "-"
    );


    setText(
        "profilePrevCgpa",
        student.previous_cgpa ??
        student.prev_cgpa ??
        "-"
    );


    const currentCgpa =
        safeNumber(
            student.cgpa ??
            student.current_cgpa,
            NaN
        );


    const previousCgpa =
        safeNumber(
            student.previous_cgpa ??
            student.prev_cgpa,
            NaN
        );


    if (
        Number.isFinite(
            currentCgpa
        ) &&
        Number.isFinite(
            previousCgpa
        )
    ) {

        const change =
            currentCgpa -
            previousCgpa;


        setText(
            "profileCgpaChange",
            `${change >= 0 ? "+" : ""}${change.toFixed(2)}`
        );

    } else {

        setText(
            "profileCgpaChange",
            "-"
        );

    }


    setText(
        "profileBacklogs",
        student.backlogs ??
        student.active_backlogs ??
        0
    );


    const attendance =
        safeNumber(
            student.attendance,
            0
        );


    setText(
        "profileAttendanceValue",
        `${attendance}%`
    );


    const attendanceBar =
        getElement(
            "profileAttendanceBar"
        );


    if (attendanceBar) {

        attendanceBar.style.width =
            `${Math.max(
                0,
                Math.min(
                    100,
                    attendance
                )
            )}%`;

    }


    const lms =
        safeNumber(
            student.lms_login,
            0
        );


    setText(
        "profileLmsLoginValue",
        `${lms}`
    );


    const lmsBar =
        getElement(
            "profileLmsLoginBar"
        );


    if (lmsBar) {

        lmsBar.style.width =
            `${Math.max(
                0,
                Math.min(
                    100,
                    lms
                )
            )}%`;

    }


    const assignment =
        safeNumber(
            student.assignment_completion,
            0
        );


    setText(
        "profileAssignmentValue",
        `${assignment}%`
    );


    const assignmentBar =
        getElement(
            "profileAssignmentBar"
        );


    if (assignmentBar) {

        assignmentBar.style.width =
            `${Math.max(
                0,
                Math.min(
                    100,
                    assignment
                )
            )}%`;

    }


    setText(
        "profileRisk",
        student.risk_level ||
        student.risk ||
        "-"
    );


    setText(
        "profilePriorityTier",
        student.priority ||
        student.priority_tier ||
        "-"
    );


    setText(
        "profileMlRisk",
        student.ml_risk ||
        student.mlRisk ||
        "Low Risk"
    );


    const mlProbability =
        student.ml_probability ??
        student.ml_prob ??
        student.risk_probability;


    setText(
        "profileMlProb",
        mlProbability !== undefined
            ? `${Number(
                mlProbability
            ).toFixed(1)}%`
            : "0%"
    );


    renderProfileTrend(
        student
    );


    renderProfileSubjects(
        student
    );


    renderRiskReasons(
        student
    );


    renderAiExplanation(
        student
    );


    renderRecommendations(
        student
    );


    renderStrengths(
        student
    );

}


function renderProfileTrend(
    student
) {

    const trend =
        student.performance_trend ||
        student.trend ||
        "Stable";


    const trendBanner =
        getElement(
            "profileTrendBanner"
        );


    if (trendBanner) {

        trendBanner.innerHTML = `
            <strong>
                ${escapeHtml(
                    trend
                )}
            </strong>

            <span>
                ${
                    trend
                        .toLowerCase()
                        .includes("declin")
                        ? "AI detected a negative academic trajectory."
                        : trend
                            .toLowerCase()
                            .includes("improv")
                            ? "Student is showing positive progress."
                            : "Student performance is relatively stable."
                }
            </span>
        `;

    }


    const timeline =
        getElement(
            "semesterTimelineChart"
        );


    if (!timeline) {
        return;
    }


    const semesters =
        student.semester_history ||
        student.semesters ||
        student.performance_history ||
        [];


    if (
        !Array.isArray(
            semesters
        ) ||
        !semesters.length
    ) {

        timeline.innerHTML = `
            <div class="empty-state">
                Semester history is not available.
            </div>
        `;

        return;
    }


    timeline.innerHTML =
        semesters.map(
            (
                semester,
                index
            ) => {

                const label =
                    semester.semester ||
                    semester.name ||
                    `Sem ${index + 1}`;


                const score =
                    semester.cgpa ??
                    semester.score ??
                    "-";


                return `
                    <div class="timeline-point">

                        <span>
                            ${escapeHtml(
                                label
                            )}
                        </span>

                        <strong>
                            ${escapeHtml(
                                score
                            )}
                        </strong>

                    </div>
                `;

            }
        ).join("");

}


function renderProfileSubjects(
    student
) {

    const tbody =
        getElement(
            "profileSubjectTableBody"
        );


    if (!tbody) {
        return;
    }


    const subjects =
        student.subjects ||
        student.subject_performance ||
        student.subjects_performance ||
        [];


    if (
        !Array.isArray(
            subjects
        ) ||
        !subjects.length
    ) {

        tbody.innerHTML = `
            <tr>

                <td colspan="7">
                    No subject-wise data available.
                </td>

            </tr>
        `;

        return;
    }


    tbody.innerHTML =
        subjects.map(
            subject => {

                const score =
                    subject.score ??
                    subject.marks ??
                    subject.performance ??
                    "-";


                const status =
                    subject.status ||
                    (
                        safeNumber(
                            score
                        ) < 50
                            ? "Needs Support"
                            : "On Track"
                    );


                return `
                    <tr>

                        <td>
                            ${escapeHtml(
                                subject.code ||
                                subject.subject_code ||
                                "-"
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                subject.name ||
                                subject.subject_name ||
                                "-"
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                subject.credits ??
                                "-"
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                score
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                subject.grade ||
                                "-"
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                status
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                subject.decline_factor ||
                                subject.declineFactor ||
                                "-"
                            )}
                        </td>

                    </tr>
                `;

            }
        ).join("");

}


function renderRiskReasons(
    student
) {

    const list =
        getElement(
            "riskReasons"
        );


    if (!list) {
        return;
    }


    const reasons =
        student.risk_reasons ||
        student.risk_factors ||
        student.riskReasons ||
        [];


    if (
        !Array.isArray(
            reasons
        ) ||
        !reasons.length
    ) {

        list.innerHTML = `
            <li>
                No major risk triggers detected.
            </li>
        `;

        return;
    }


    list.innerHTML =
        reasons.map(
            reason => `
                <li>
                    ${escapeHtml(
                        typeof reason ===
                        "string"
                            ? reason
                            : reason.reason ||
                              reason.description ||
                              JSON.stringify(
                                  reason
                              )
                    )}
                </li>
            `
        ).join("");

}


function renderAiExplanation(
    student
) {

    setText(
        "profileAiExplanationText",
        student.ai_explanation ||
        student.ai_explanation_text ||
        student.explanation ||
        student.risk_explanation ||
        "AI analysis is not available for this student."
    );


    const factors =
        student.contributing_factors ||
        student.root_causes ||
        student.factors ||
        [];


    const container =
        getElement(
            "profileContributingFactors"
        );


    if (!container) {
        return;
    }


    if (
        !Array.isArray(
            factors
        ) ||
        !factors.length
    ) {

        container.innerHTML = `
            <span class="factor-badge">
                No major root cause identified
            </span>
        `;

        return;
    }


    container.innerHTML =
        factors.map(
            factor => `
                <span class="factor-badge">
                    ${escapeHtml(
                        typeof factor ===
                        "string"
                            ? factor
                            : factor.name ||
                              factor.factor ||
                              factor.description ||
                              ""
                    )}
                </span>
            `
        ).join("");

}


function renderRecommendations(
    student
) {

    setText(
        "overallRecommendation",
        student.overall_recommendation ||
        student.recommendation ||
        "Continue monitoring academic progress and engagement."
    );


    setText(
        "recommendationPriority",
        student.priority ||
        student.priority_tier ||
        "Monitor"
    );


    const actions =
        student.recommended_actions ||
        student.actions ||
        student.interventions_recommended ||
        [];


    const list =
        getElement(
            "recommendedActions"
        );


    if (!list) {
        return;
    }


    if (
        !Array.isArray(
            actions
        ) ||
        !actions.length
    ) {

        list.innerHTML = `
            <li>
                Continue regular academic monitoring.
            </li>
        `;

        return;
    }


    list.innerHTML =
        actions.map(
            action => `
                <li>
                    ${escapeHtml(
                        typeof action ===
                        "string"
                            ? action
                            : action.action ||
                              action.description ||
                              ""
                    )}
                </li>
            `
        ).join("");

}


function renderStrengths(
    student
) {

    const strengths =
        student.strengths ||
        student.student_strengths ||
        [];


    const list =
        getElement(
            "studentStrengths"
        );


    if (!list) {
        return;
    }


    if (
        !Array.isArray(
            strengths
        ) ||
        !strengths.length
    ) {

        list.innerHTML = `
            <li>
                Strength analysis is not available.
            </li>
        `;

        return;
    }


    list.innerHTML =
        strengths.map(
            strength => `
                <li>
                    ${escapeHtml(
                        typeof strength ===
                        "string"
                            ? strength
                            : strength.name ||
                              strength.description ||
                              ""
                    )}
                </li>
            `
        ).join("");

}


/* =========================================================
   GLOBAL FACULTY NOTES
========================================================= */

/*
   GLOBAL FACULTY NOTES

   These notes are NOT connected to a Student ID.

   Every student can see them.

   Every note contains:

   - Faculty name
   - Subject
   - Note
   - Optional PDF/DOCX resource
   - Upload date
*/


function setupFacultySubjectField() {

    const form =
        getElement(
            "facultyNoteForm"
        );


    if (!form) {
        return;
    }


    /*
     * If the user later adds the field manually
     * to index.html, this function does nothing.
     */

    if (
        getElement(
            "facultySubject"
        )
    ) {

        return;

    }


    const textarea =
        getElement(
            "facultyNote"
        );


    if (!textarea) {
        return;
    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "faculty-subject-wrapper";


    wrapper.style.marginBottom =
        "12px";


    wrapper.innerHTML = `

        <label
            for="facultySubject"
            style="
                display:block;
                margin-bottom:6px;
                font-weight:600;
            "
        >
            Subject
        </label>

        <input
            type="text"
            id="facultySubject"
            name="faculty_subject"
            placeholder="e.g. DBMS, Computer Networks, DSA"
            autocomplete="off"
            style="
                width:100%;
                padding:10px 12px;
                border-radius:8px;
                border:1px solid #d1d5db;
                font:inherit;
                box-sizing:border-box;
            "
        >

    `;


    textarea.parentNode.insertBefore(
        wrapper,
        textarea
    );

}


async function loadFacultyNotes() {

    const container =
        getElement(
            "facultyNotes"
        );


    if (!container) {
        return;
    }


    try {

        const data =
            await apiRequest(
                "/api/faculty-notes",
                {
                    method: "GET"
                }
            );


        globalFacultyNotes =
            data?.notes ||
            data?.faculty_notes ||
            data?.data ||
            data ||
            [];


        if (
            !Array.isArray(
                globalFacultyNotes
            )
        ) {

            globalFacultyNotes =
                [];

        }


        renderFacultyNotes(
            globalFacultyNotes
        );

    } catch (error) {

        console.error(
            "Could not load faculty notes:",
            error
        );


        container.innerHTML = `
            <div class="faculty-notes-empty">

                <div class="faculty-notes-empty-icon">
                    ⚠️
                </div>

                <strong>
                    Unable to load faculty notes
                </strong>

                <p>
                    ${escapeHtml(
                        error.message
                    )}
                </p>

            </div>
        `;

    }

}


function renderFacultyNotes(
    notes
) {

    const container =
        getElement(
            "facultyNotes"
        );


    if (!container) {
        return;
    }


    if (
        !Array.isArray(
            notes
        ) ||
        !notes.length
    ) {

        container.innerHTML = `
            <div class="faculty-notes-empty">

                <div class="faculty-notes-empty-icon">
                    📝
                </div>

                <strong>
                    No faculty notes yet
                </strong>

                <p>
                    Add a faculty observation,
                    subject note or supporting document.
                </p>

            </div>
        `;

        return;
    }


    container.innerHTML =
        notes.map(
            note => {

                const facultyName =
                    note.faculty_name ||
                    note.facultyName ||
                    "Faculty";


                const subject =
                    note.subject ||
                    note.subject_name ||
                    "General";


                const noteText =
                    note.note ||
                    note.description ||
                    "";


                const createdAt =
                    note.created_at ||
                    note.createdAt;


                const attachment =
                    note.attachment ||
                    null;


                let attachmentHtml =
                    "";


                if (attachment) {

                    const attachmentUrl =
                        attachment.url ||
                        attachment.attachment_url ||
                        note.attachment_url;


                    const originalFilename =
                        attachment.original_filename ||
                        attachment.filename ||
                        note.attachment_filename ||
                        "Faculty Document";


                    if (attachmentUrl) {

                        attachmentHtml = `
                            <div class="faculty-note-attachment">

                                <span>
                                    📎
                                </span>

                                <a
                                    href="${escapeHtml(
                                        attachmentUrl
                                    )}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    ${escapeHtml(
                                        originalFilename
                                    )}
                                </a>

                            </div>
                        `;

                    }

                } else if (
                    note.attachment_url
                ) {

                    attachmentHtml = `
                        <div class="faculty-note-attachment">

                            <span>
                                📎
                            </span>

                            <a
                                href="${escapeHtml(
                                    note.attachment_url
                                )}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                ${
                                    escapeHtml(
                                        note.attachment_filename ||
                                        "Faculty Document"
                                    )
                                }
                            </a>

                        </div>
                    `;

                }


                return `
                    <article
                        class="faculty-note-item"
                    >

                        <div
                            class="faculty-note-header"
                        >

                            <div>

                                <strong>
                                    ${escapeHtml(
                                        facultyName
                                    )}
                                </strong>

                                <div
                                    class="faculty-note-meta"
                                >

                                    <span>
                                        👨‍🏫 Uploaded by:
                                        ${escapeHtml(
                                            facultyName
                                        )}
                                    </span>

                                    <span>
                                        📚 Subject:
                                        ${escapeHtml(
                                            subject
                                        )}
                                    </span>

                                </div>

                            </div>

                            <small>
                                ${escapeHtml(
                                    formatDateTime(
                                        createdAt
                                    )
                                )}
                            </small>

                        </div>


                        <div
                            class="faculty-note-subject-badge"
                        >
                            📚 Subject:
                            ${escapeHtml(
                                subject
                            )}
                        </div>


                        <p
                            class="faculty-note-text"
                        >
                            ${escapeHtml(
                                noteText
                            )}
                        </p>


                        ${attachmentHtml}

                    </article>
                `;

            }
        ).join("");

}


/* =========================================================
   ADD GLOBAL FACULTY NOTE
========================================================= */

async function addFacultyNote() {

    const facultyNameInput =
        getElement(
            "facultyName"
        );


    const facultyNoteInput =
        getElement(
            "facultyNote"
        );


    const subjectInput =
        getElement(
            "facultySubject"
        );


    const attachmentInput =
        getElement(
            "facultyAttachmentInput"
        );


    const facultyName =
        facultyNameInput
            ?.value
            .trim() ||
        "";


    const note =
        facultyNoteInput
            ?.value
            .trim() ||
        "";


    const subject =
        subjectInput
            ?.value
            .trim() ||
        "";


    const attachment =
        attachmentInput
            ?.files?.[0] ||
        null;


    if (!facultyName) {

        showFacultyNotesStatus(
            "Please enter the faculty name.",
            "error"
        );

        return;
    }


    if (!subject) {

        showFacultyNotesStatus(
            "Please enter the subject name.",
            "error"
        );

        return;
    }


    if (
        !note &&
        !attachment
    ) {

        showFacultyNotesStatus(
            "Please enter a note or attach a document.",
            "error"
        );

        return;
    }


    if (attachment) {

        const maxSize =
            10 *
            1024 *
            1024;


        if (
            attachment.size >
            maxSize
        ) {

            showFacultyNotesStatus(
                "Attachment is larger than 10 MB.",
                "error"
            );

            return;
        }


        const fileName =
            attachment.name.toLowerCase();


        const valid =
            fileName.endsWith(
                ".pdf"
            ) ||
            fileName.endsWith(
                ".docx"
            );


        if (!valid) {

            showFacultyNotesStatus(
                "Only PDF and DOCX files are supported.",
                "error"
            );

            return;
        }

    }


    try {

        showFacultyNotesStatus(
            "Uploading faculty resource...",
            "loading"
        );


        let response;


        if (attachment) {

            const formData =
                new FormData();


            formData.append(
                "faculty_name",
                facultyName
            );


            formData.append(
                "subject",
                subject
            );


            formData.append(
                "note",
                note
            );


            formData.append(
                "attachment",
                attachment
            );


            response =
                await apiRequest(
                    "/api/faculty-notes/upload",
                    {
                        method: "POST",
                        body: formData
                    }
                );

        } else {

            response =
                await apiRequest(
                    "/api/faculty-notes",
                    {
                        method: "POST",

                        body:
                            JSON.stringify({

                                faculty_name:
                                    facultyName,

                                subject:
                                    subject,

                                note:
                                    note

                            })
                    }
                );

        }


        console.log(
            "Faculty note saved:",
            response
        );


        showFacultyNotesStatus(
            "Faculty note/resource uploaded successfully. It is now available to all students.",
            "success"
        );


        clearFacultyNoteForm();


        await loadFacultyNotes();


    } catch (error) {

        console.error(
            "Faculty note upload error:",
            error
        );


        showFacultyNotesStatus(
            error.message ||
            "Could not save faculty note.",
            "error"
        );

    }

}


function showFacultyNotesStatus(
    message,
    type = "success"
) {

    const status =
        getElement(
            "facultyNotesStatus"
        );


    if (!status) {
        return;
    }


    status.textContent =
        message;


    status.className =
        `faculty-notes-status ${type}`;

}


function clearFacultyNoteForm() {

    const name =
        getElement(
            "facultyName"
        );


    const subject =
        getElement(
            "facultySubject"
        );


    const note =
        getElement(
            "facultyNote"
        );


    const attachment =
        getElement(
            "facultyAttachmentInput"
        );


    if (name) {

        /*
         * Keep the logged-in faculty name
         * instead of unnecessarily clearing it.
         */

        const displayName =
            getElement(
                "facultyDisplayName"
            )?.textContent.trim();


        if (displayName) {

            name.value =
                displayName;

        } else {

            name.value =
                "";

        }

    }


    if (subject) {
        subject.value = "";
    }


    if (note) {
        note.value = "";
    }


    if (attachment) {
        attachment.value = "";
    }

}


/* =========================================================
   OLD STUDENT-SPECIFIC NOTES
========================================================= */

async function saveStudentSpecificNote() {

    alert(
        "Faculty Notes are global. Use the Faculty Notes & Documents section to upload a note or resource for all students."
    );

}


async function loadStudentSpecificNotes() {

    return [];

}


/* =========================================================
   INTERVENTIONS
========================================================= */

async function loadFacultyInterventions() {

    try {

        const data =
            await apiRequest(
                "/api/interventions",
                {
                    method: "GET"
                }
            );


        facultyInterventions =
            data?.interventions ||
            data?.data ||
            data ||
            [];


        if (
            !Array.isArray(
                facultyInterventions
            )
        ) {

            facultyInterventions =
                [];

        }


        renderFacultyInterventions(
            facultyInterventions
        );


        updateInterventionSummaryCards();


    } catch (error) {

        console.error(
            "Could not load interventions:",
            error
        );

    }

}


function updateInterventionSummaryCards() {

    const pending =
        facultyInterventions.filter(
            item => {

                const status =
                    String(
                        item.status ||
                        ""
                    ).toLowerCase();


                return (
                    status.includes("pending") ||
                    status.includes("assigned") ||
                    status.includes("in progress") ||
                    status.includes("acknowledged")
                );

            }
        ).length;


    const completed =
        facultyInterventions.filter(
            item => {

                const status =
                    String(
                        item.status ||
                        ""
                    ).toLowerCase();


                return (
                    status.includes("completed") ||
                    status.includes("closed")
                );

            }
        ).length;


    setText(
        "pendingInterventions",
        pending
    );


    setText(
        "completedInterventions",
        completed
    );

}


function renderFacultyInterventions(
    interventions
) {

    const containers = [
        "facultyInterventionsList"
    ];


    containers.forEach(
        containerId => {

            const container =
                getElement(
                    containerId
                );


            if (!container) {
                return;
            }


            if (
                !Array.isArray(
                    interventions
                ) ||
                !interventions.length
            ) {

                container.innerHTML = `
                    <div class="faculty-notes-empty">

                        <div class="faculty-notes-empty-icon">
                            🎯
                        </div>

                        <strong>
                            No interventions yet
                        </strong>

                        <p>
                            Student interventions will appear here.
                        </p>

                    </div>
                `;

                return;
            }


            container.innerHTML =
                interventions
                    .map(
                        intervention =>
                            renderInterventionCard(
                                intervention
                            )
                    )
                    .join("");

        }
    );

}


function renderInterventionCard(
    intervention
) {

    const id =
        intervention.intervention_id ||
        intervention.id ||
        "";


    const studentId =
        intervention.student_id ||
        intervention.studentId ||
        "-";


    const title =
        intervention.title ||
        "Student Intervention";


    const description =
        intervention.description ||
        intervention.message ||
        "";


    const status =
        intervention.status ||
        "Assigned";


    const priority =
        intervention.priority ||
        "Medium";


    const actionType =
        intervention.action_type ||
        intervention.actionType ||
        "Academic Support";


    const reason =
        intervention.reason_category ||
        intervention.reasonCategory ||
        "";


    const dueDate =
        intervention.due_date ||
        intervention.dueDate;


    const feedback =
        intervention.feedback ||
        "";


    const studentResponse =
        intervention.student_response ||
        intervention.response ||
        "";


    const progress =
        intervention.progress ||
        "";


    return `
        <article
            class="intervention-card"
        >

            <div
                class="intervention-card-header"
            >

                <div>

                    <strong>
                        ${escapeHtml(
                            title
                        )}
                    </strong>

                    <small>
                        Student ID:
                        ${escapeHtml(
                            studentId
                        )}
                    </small>

                </div>

                <span
                    class="priority-badge"
                >
                    ${escapeHtml(
                        priority
                    )}
                </span>

            </div>


            <div
                class="intervention-meta"
            >

                <span>
                    🎯
                    ${escapeHtml(
                        actionType
                    )}
                </span>


                ${
                    reason
                        ? `
                            <span>
                                🔎
                                ${escapeHtml(
                                    reason
                                )}
                            </span>
                        `
                        : ""
                }


                ${
                    dueDate
                        ? `
                            <span>
                                📅 Due
                                ${escapeHtml(
                                    formatDate(
                                        dueDate
                                    )
                                )}
                            </span>
                        `
                        : ""
                }


                <span>
                    Status:
                    ${escapeHtml(
                        status
                    )}
                </span>

            </div>


            <p>
                ${escapeHtml(
                    description
                )}
            </p>


            ${
                studentResponse
                    ? `
                        <div
                            class="intervention-feedback"
                        >

                            <strong>
                                Student Response
                            </strong>

                            <p>
                                ${escapeHtml(
                                    studentResponse
                                )}
                            </p>

                        </div>
                    `
                    : ""
            }


            ${
                progress
                    ? `
                        <div
                            class="intervention-feedback"
                        >

                            <strong>
                                Student Progress
                            </strong>

                            <p>
                                ${escapeHtml(
                                    progress
                                )}
                            </p>

                        </div>
                    `
                    : ""
            }


            ${
                feedback
                    ? `
                        <div
                            class="intervention-feedback"
                        >

                            <strong>
                                Faculty Feedback
                            </strong>

                            <p>
                                ${escapeHtml(
                                    feedback
                                )}
                            </p>

                        </div>
                    `
                    : ""
            }


            <div
                class="intervention-actions"
            >

                ${
                    id
                        ? `
                            <button
                                type="button"
                                class="outline-button"
                                onclick="openFacultyReviewModal('${escapeHtml(id)}')"
                            >
                                Review Response
                            </button>
                        `
                        : ""
                }

            </div>

        </article>
    `;

}


/* =========================================================
   CREATE INTERVENTION
========================================================= */

function openFacultyInterventionModal() {

    const modal =
        getElement(
            "facultyInterventionModal"
        );


    if (!modal) {
        return;
    }


    const student =
        activeStudent;


    if (!student) {

        alert(
            "Please open a student profile first, then create an intervention."
        );

        return;
    }


    const studentId =
        student.student_id ||
        student.id ||
        "-";


    const name =
        student.name ||
        student.student_name ||
        "Student";


    const banner =
        getElement(
            "interventionStudentBanner"
        );


    if (banner) {

        banner.innerHTML = `
            <strong>
                🎯
                ${escapeHtml(
                    name
                )}
            </strong>

            <span>
                Student ID:
                ${escapeHtml(
                    studentId
                )}
            </span>

            <span>
                ${escapeHtml(
                    student.department ||
                    "-"
                )}
            </span>
        `;

    }


    const form =
        getElement(
            "facultyInterventionForm"
        );


    if (form) {
        form.reset();
    }


    setTodayAsMinimumDate();


    showElement(
        modal
    );

}


function closeFacultyInterventionModal() {

    hideElement(
        getElement(
            "facultyInterventionModal"
        )
    );

}


async function submitFacultyIntervention(
    event
) {

    event.preventDefault();


    if (!activeStudent) {

        alert(
            "Please select a student first."
        );

        return;
    }


    const studentId =
        activeStudent.student_id ||
        activeStudent.id;


    const actionType =
        getElement(
            "interventionActionType"
        )?.value ||
        "";


    const reasonCategory =
        getElement(
            "interventionReasonCategory"
        )?.value ||
        "";


    const priority =
        getElement(
            "interventionPriority"
        )?.value ||
        "Medium";


    const dueDate =
        getElement(
            "interventionDueDate"
        )?.value ||
        "";


    const title =
        getElement(
            "interventionTitle"
        )?.value.trim() ||
        "";


    const description =
        getElement(
            "interventionDescription"
        )?.value.trim() ||
        "";


    if (!studentId) {

        alert(
            "Student ID is missing."
        );

        return;
    }


    if (
        !title ||
        !description ||
        !dueDate
    ) {

        alert(
            "Please complete all required intervention fields."
        );

        return;
    }


    const button =
        getElement(
            "submitInterventionBtn"
        );


    try {

        if (button) {

            button.disabled =
                true;


            button.textContent =
                "Sending...";

        }


        await apiRequest(
            "/api/interventions",
            {
                method: "POST",

                body:
                    JSON.stringify({

                        student_id:
                            studentId,

                        faculty_name:
                            getElement(
                                "facultyDisplayName"
                            )?.textContent.trim() ||
                            "Faculty",

                        title:
                            title,

                        description:
                            description,

                        priority:
                            priority,

                        due_date:
                            dueDate,

                        action_type:
                            actionType,

                        reason_category:
                            reasonCategory

                    })
            }
        );


        closeFacultyInterventionModal();


        await loadFacultyInterventions();


        await openStudentProfile(
            studentId
        );


        alert(
            "Intervention sent successfully. The student will see it in their Student Portal."
        );


    } catch (error) {

        console.error(
            "Intervention error:",
            error
        );


        alert(
            `Could not send intervention: ${error.message}`
        );


    } finally {

        if (button) {

            button.disabled =
                false;


            button.textContent =
                "🚀 Send Intervention to Student";

        }

    }

}


/* =========================================================
   ACTIVE STUDENT INTERVENTIONS
========================================================= */

function renderActiveStudentInterventions(
    studentId
) {

    const container =
        getElement(
            "profileInterventionsContainer"
        );


    if (!container) {
        return;
    }


    const interventions =
        facultyInterventions.filter(
            item =>
                String(
                    item.student_id ||
                    item.studentId ||
                    ""
                ) ===
                String(
                    studentId
                )
        );


    renderProfileInterventions(
        interventions
    );


    renderProfileAuditTrail(
        interventions
    );

}


function renderProfileInterventions(
    interventions
) {

    const container =
        getElement(
            "profileInterventionsContainer"
        );


    if (!container) {
        return;
    }


    if (!interventions.length) {

        container.innerHTML = `
            <div
                class="empty-interventions-placeholder"
            >

                <p>
                    No interventions have been assigned to this student yet.
                </p>

                <button
                    type="button"
                    class="secondary-button"
                    onclick="openFacultyInterventionModal()"
                >
                    Create First Intervention
                </button>

            </div>
        `;

        return;
    }


    container.innerHTML =
        interventions
            .map(
                intervention =>
                    renderInterventionCard(
                        intervention
                    )
            )
            .join("");

}


function renderProfileAuditTrail(
    interventions
) {

    const container =
        getElement(
            "profileAuditTrailContainer"
        );


    if (!container) {
        return;
    }


    if (!interventions.length) {

        container.innerHTML = `
            <div class="empty-state">
                No intervention history available.
            </div>
        `;

        return;
    }


    const history = [];


    interventions.forEach(
        intervention => {

            if (
                Array.isArray(
                    intervention.history
                )
            ) {

                intervention.history.forEach(
                    item => {

                        history.push({

                            ...item,

                            interventionTitle:
                                intervention.title ||
                                "Intervention"

                        });

                    }
                );

            } else {

                history.push({

                    created_at:
                        intervention.created_at,

                    status:
                        intervention.status,

                    action:
                        "Intervention assigned",

                    description:
                        intervention.description,

                    interventionTitle:
                        intervention.title ||
                        "Intervention"

                });

            }

        }
    );


    history.sort(
        (a, b) =>
            new Date(
                b.created_at || 0
            ) -
            new Date(
                a.created_at || 0
            )
    );


    container.innerHTML =
        history
            .map(
                item => `

                    <div
                        class="audit-timeline-item"
                    >

                        <div
                            class="audit-dot"
                        >
                            •
                        </div>

                        <div>

                            <strong>
                                ${escapeHtml(
                                    item.action ||
                                    item.status ||
                                    "Update"
                                )}
                            </strong>

                            <small>
                                ${escapeHtml(
                                    item.interventionTitle
                                )}
                                ·
                                ${escapeHtml(
                                    formatDateTime(
                                        item.created_at
                                    )
                                )}
                            </small>

                            ${
                                item.description
                                    ? `
                                        <p>
                                            ${escapeHtml(
                                                item.description
                                            )}
                                        </p>
                                    `
                                    : ""
                            }

                        </div>

                    </div>

                `
            )
            .join("");

}


/* =========================================================
   REPORTS
========================================================= */

async function loadFacultyReports() {

    try {

        const data =
            await apiRequest(
                "/api/reports",
                {
                    method: "GET"
                }
            );


        facultyReports =
            data?.reports ||
            data?.data ||
            data ||
            [];


        if (
            !Array.isArray(
                facultyReports
            )
        ) {

            facultyReports =
                [];

        }


        renderFacultyReports(
            facultyReports
        );


    } catch (error) {

        console.error(
            "Could not load faculty reports:",
            error
        );

    }

}


function renderFacultyReports(
    reports
) {

    const container =
        getElement(
            "facultyReportsList"
        );


    if (!container) {
        return;
    }


    if (!reports.length) {

        container.innerHTML = `
            <div class="faculty-notes-empty">

                <div class="faculty-notes-empty-icon">
                    📄
                </div>

                <strong>
                    No student reports yet
                </strong>

                <p>
                    Submitted intervention reports will appear here.
                </p>

            </div>
        `;

        return;
    }


    container.innerHTML =
        reports
            .map(
                report => {

                    const id =
                        report.report_id ||
                        report.id ||
                        "";


                    const studentId =
                        report.student_id ||
                        "-";


                    const title =
                        report.title ||
                        report.report_title ||
                        "Progress Report";


                    const description =
                        report.description ||
                        report.report ||
                        report.content ||
                        "";


                    return `
                        <article
                            class="report-card"
                        >

                            <div
                                class="report-header"
                            >

                                <div>

                                    <strong>
                                        ${escapeHtml(
                                            title
                                        )}
                                    </strong>

                                    <small>
                                        Student ID:
                                        ${escapeHtml(
                                            studentId
                                        )}
                                    </small>

                                </div>

                                <span>
                                    ${escapeHtml(
                                        report.status ||
                                        "Submitted"
                                    )}
                                </span>

                            </div>


                            <p>
                                ${escapeHtml(
                                    description
                                )}
                            </p>


                            ${
                                id
                                    ? `
                                        <button
                                            type="button"
                                            class="outline-button"
                                            onclick="openFacultyReviewModal('${escapeHtml(id)}')"
                                        >
                                            Review
                                        </button>
                                    `
                                    : ""
                            }

                        </article>
                    `;

                }
            )
            .join("");

}


function renderActiveStudentReports(
    studentId
) {

    const reports =
        facultyReports.filter(
            report =>
                String(
                    report.student_id ||
                    ""
                ) ===
                String(
                    studentId
                )
        );


    /*
     * Reports are already visible through the
     * main Faculty Reports section.
     *
     * This function is intentionally lightweight.
     */

    return reports;

}


/* =========================================================
   FACULTY REVIEW
========================================================= */

async function openFacultyReviewModal(
    interventionId
) {

    const modal =
        getElement(
            "facultyReviewModal"
        );


    const details =
        getElement(
            "facultyReviewDetails"
        );


    const hiddenId =
        getElement(
            "reviewInterventionId"
        );


    if (!modal) {
        return;
    }


    const intervention =
        facultyInterventions.find(
            item =>
                String(
                    item.intervention_id ||
                    item.id
                ) ===
                String(
                    interventionId
                )
        );


    if (!intervention) {

        /*
         * If the clicked ID is actually a report,
         * try to find the related intervention.
         */

        const report =
            facultyReports.find(
                item =>
                    String(
                        item.report_id ||
                        item.id
                    ) ===
                    String(
                        interventionId
                    )
            );


        if (report?.intervention_id) {

            return openFacultyReviewModal(
                report.intervention_id
            );

        }


        alert(
            "Intervention could not be found."
        );


        return;

    }


    if (hiddenId) {

        hiddenId.value =
            interventionId;

    }


    if (details) {

        details.innerHTML = `

            <div
                class="review-detail-row"
            >

                <strong>
                    Student ID
                </strong>

                <span>
                    ${escapeHtml(
                        intervention.student_id ||
                        "-"
                    )}
                </span>

            </div>


            <div
                class="review-detail-row"
            >

                <strong>
                    Intervention
                </strong>

                <span>
                    ${escapeHtml(
                        intervention.title ||
                        "-"
                    )}
                </span>

            </div>


            <div
                class="review-detail-row"
            >

                <strong>
                    Current Status
                </strong>

                <span>
                    ${escapeHtml(
                        intervention.status ||
                        "-"
                    )}
                </span>

            </div>


            <div
                class="review-detail-description"
            >

                <strong>
                    Instructions
                </strong>

                <p>
                    ${escapeHtml(
                        intervention.description ||
                        "-"
                    )}
                </p>

            </div>


            ${
                intervention.student_response ||
                intervention.response
                    ? `
                        <div
                            class="review-detail-description"
                        >

                            <strong>
                                Student Response
                            </strong>

                            <p>
                                ${escapeHtml(
                                    intervention.student_response ||
                                    intervention.response
                                )}
                            </p>

                        </div>
                    `
                    : ""
            }


            ${
                intervention.progress
                    ? `
                        <div
                            class="review-detail-description"
                        >

                            <strong>
                                Student Progress
                            </strong>

                            <p>
                                ${escapeHtml(
                                    intervention.progress
                                )}
                            </p>

                        </div>
                    `
                    : ""
            }

        `;

    }


    showElement(
        modal
    );

}


function closeFacultyReviewModal() {

    hideElement(
        getElement(
            "facultyReviewModal"
        )
    );

}


async function submitFacultyReview(
    event
) {

    event.preventDefault();


    const interventionId =
        getElement(
            "reviewInterventionId"
        )?.value;


    const status =
        getElement(
            "reviewStatusSelect"
        )?.value;


    const feedback =
        getElement(
            "reviewFeedbackInput"
        )?.value.trim();


    if (!interventionId) {

        alert(
            "Intervention ID is missing."
        );

        return;
    }


    if (!feedback) {

        alert(
            "Please enter faculty feedback."
        );

        return;
    }


    try {

        await apiRequest(
            `/api/interventions/${encodeURIComponent(interventionId)}/review`,
            {
                method: "POST",

                body:
                    JSON.stringify({

                        status:
                            status,

                        feedback:
                            feedback

                    })
            }
        );


        closeFacultyReviewModal();


        await loadFacultyInterventions();


        if (activeStudent) {

            await openStudentProfile(
                activeStudent.student_id ||
                activeStudent.id
            );

        }


        alert(
            "Review submitted. The student will receive the faculty feedback."
        );


    } catch (error) {

        console.error(
            "Faculty review error:",
            error
        );


        alert(
            `Could not submit review: ${error.message}`
        );

    }

}


/* =========================================================
   NOTIFICATIONS
========================================================= */

function setupNotificationButton() {

    const button =
        getElement(
            "notificationButton"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        () => {

            const panel =
                getElement(
                    "notificationPanel"
                );


            if (!panel) {
                return;
            }


            panel.classList.toggle(
                "hidden"
            );

        }
    );

}


function closeNotifications() {

    hideElement(
        getElement(
            "notificationPanel"
        )
    );

}


/* =========================================================
   AI MENTOR
========================================================= */

function openAIMentor() {

    const mentor =
        getElement(
            "aiMentor"
        );


    if (!mentor) {
        return;
    }


    mentor.classList.add(
        "open"
    );


    mentor.style.display =
        "flex";


    setTimeout(
        () => {

            const input =
                getElement(
                    "aiMentorInput"
                );


            if (input) {
                input.focus();
            }

        },
        100
    );

}


function closeAIMentor() {

    const mentor =
        getElement(
            "aiMentor"
        );


    if (!mentor) {
        return;
    }


    mentor.classList.remove(
        "open"
    );


    mentor.style.display =
        "none";

}


function handleMentorKey(
    event
) {

    if (
        event.key ===
        "Enter" &&
        !event.shiftKey
    ) {

        event.preventDefault();

        sendAIMentorMessage();

    }

}


function askAIMentor(
    question
) {

    const input =
        getElement(
            "aiMentorInput"
        );


    if (!input) {
        return;
    }


    input.value =
        question;


    sendAIMentorMessage();

}


function sendAIMentorMessage() {

    const input =
        getElement(
            "aiMentorInput"
        );


    const container =
        getElement(
            "aiChatMessages"
        );


    if (
        !input ||
        !container
    ) {

        return;

    }


    const question =
        input.value.trim();


    if (!question) {
        return;
    }


    appendMentorMessage(
        "You",
        question,
        "user"
    );


    input.value =
        "";


    const answer =
        generateAIMentorAnswer(
            question
        );


    setTimeout(
        () => {

            appendMentorMessage(
                "AI Mentor",
                answer,
                "ai"
            );

        },
        300
    );

}


function appendMentorMessage(
    sender,
    message,
    type
) {

    const container =
        getElement(
            "aiChatMessages"
        );


    if (!container) {
        return;
    }


    const id =
        `mentor-message-${++typingMessageCounter}`;


    const div =
        document.createElement(
            "div"
        );


    div.id =
        id;


    div.className =
        type === "user"
            ? "user-message"
            : "ai-message";


    div.innerHTML = `

        <div
            class="message-avatar"
        >
            ${
                type === "user"
                    ? "👤"
                    : "✦"
            }
        </div>


        <div
            class="message-content"
        >

            <strong>
                ${escapeHtml(
                    sender
                )}
            </strong>

            <p>
                ${escapeHtml(
                    message
                )}
            </p>

        </div>

    `;


    container.appendChild(
        div
    );


    container.scrollTop =
        container.scrollHeight;

}


function generateAIMentorAnswer(
    question
) {

    const q =
        question.toLowerCase();


    const students =
        Array.isArray(
            currentStudents
        )
            ? currentStudents
            : [];


    if (
        q.includes("immediate") ||
        q.includes("critical") ||
        q.includes("support")
    ) {

        const critical =
            students.filter(
                student => {

                    const risk =
                        String(
                            student.risk_level ||
                            student.risk ||
                            student.priority ||
                            ""
                        ).toLowerCase();


                    return (
                        risk.includes("critical") ||
                        risk.includes("immediate")
                    );

                }
            );


        if (!critical.length) {

            return (
                "No students are currently classified as requiring immediate support in the loaded data."
            );

        }


        return (
            `I found ${critical.length} student(s) requiring immediate support. ` +
            critical
                .slice(0, 5)
                .map(
                    student =>
                        `${student.name || student.student_name || "Student"} (${student.student_id || student.id || "ID"})`
                )
                .join(", ") +
            "."
        );

    }


    if (
        q.includes("department") &&
        q.includes("risk")
    ) {

        const departmentCounts =
            {};


        students.forEach(
            student => {

                const department =
                    student.department ||
                    "Unknown";


                const risk =
                    String(
                        student.risk_level ||
                        student.risk ||
                        ""
                    ).toLowerCase();


                if (
                    risk.includes("critical") ||
                    risk.includes("high") ||
                    risk.includes("immediate")
                ) {

                    departmentCounts[
                        department
                    ] =
                        (
                            departmentCounts[
                                department
                            ] ||
                            0
                        ) + 1;

                }

            }
        );


        const sorted =
            Object.entries(
                departmentCounts
            ).sort(
                (a, b) =>
                    b[1] - a[1]
            );


        if (!sorted.length) {

            return (
                "I could not identify a high-risk department from the currently loaded data."
            );

        }


        return (
            `The department with the highest number of high-risk students is ${sorted[0][0]} with ${sorted[0][1]} student(s).`
        );

    }


    if (
        q.includes("placement") &&
        q.includes("risk")
    ) {

        const riskStudents =
            students.filter(
                student => {

                    const placement =
                        String(
                            student.placement_readiness ||
                            student.placement ||
                            ""
                        ).toLowerCase();


                    return (
                        placement.includes("low") ||
                        placement.includes("risk") ||
                        placement.includes("not ready")
                    );

                }
            );


        return (
            riskStudents.length
                ? `I found ${riskStudents.length} student(s) with low or concerning placement readiness.`
                : "No clearly low-placement-readiness students were found in the currently loaded data."
        );

    }


    if (
        q.includes("intervene") ||
        q.includes("intervention")
    ) {

        return (
            "Start with the student's biggest measurable issue. " +
            "For declining performance, assign targeted academic support. " +
            "For attendance problems, assign an attendance improvement plan. " +
            "For subject weakness, assign subject-specific remedial work. " +
            "Then review the student's submitted progress and provide feedback."
        );

    }


    if (
        q.includes("declin") ||
        q.includes("downgrade")
    ) {

        const declining =
            students.filter(
                student =>
                    String(
                        student.performance_trend ||
                        student.trend ||
                        ""
                    )
                        .toLowerCase()
                        .includes("declin")
            );


        return (
            `There are ${declining.length} student(s) currently showing a declining performance trend in the loaded data. Review their attendance, subject performance, backlogs and LMS activity before assigning an intervention.`
        );

    }


    if (
        q.includes("attendance")
    ) {

        const lowAttendance =
            students.filter(
                student =>
                    safeNumber(
                        student.attendance
                    ) < 75
            );


        return (
            `${lowAttendance.length} student(s) have attendance below 75% based on the currently loaded student data. These students should be reviewed for attendance-related intervention.`
        );

    }


    return (
        "I can help you analyse student risk, performance decline, attendance, placement readiness, departments and intervention strategies. Try asking: 'Which students need immediate support?'"
    );

}


/* =========================================================
   STUDENT LOGIN
========================================================= */

function openStudentLogin() {

    showElement(
        getElement(
            "studentLoginOverlay"
        )
    );

}


function closeStudentLogin() {

    hideElement(
        getElement(
            "studentLoginOverlay"
        )
    );

}


async function submitStudentLogin(
    event
) {

    event.preventDefault();


    const studentId =
        getElement(
            "studentLoginId"
        )?.value.trim();


    const password =
        getElement(
            "studentLoginPassword"
        )?.value;


    const status =
        getElement(
            "studentLoginStatus"
        );


    if (
        !studentId ||
        !password
    ) {

        return;

    }


    if (status) {

        status.textContent =
            "Logging in...";


        status.className =
            "faculty-notes-status loading";

    }


    try {

        const data =
            await apiRequest(
                "/api/student/login",
                {
                    method: "POST",

                    body:
                        JSON.stringify({

                            student_id:
                                studentId,

                            password:
                                password

                        })
                }
            );


        if (data?.token) {

            localStorage.setItem(
                "student_token",
                data.token
            );

        }


        if (
            data?.access_token
        ) {

            localStorage.setItem(
                "student_token",
                data.access_token
            );

        }


        window.location.href =
            "/student.html";


    } catch (error) {

        console.error(
            "Student login error:",
            error
        );


        if (status) {

            status.textContent =
                error.message ||
                "Invalid Student ID or password.";


            status.className =
                "faculty-notes-status error";

        }

    }

}


function studentLogout() {

    localStorage.removeItem(
        "student_token"
    );


    localStorage.removeItem(
        "studentToken"
    );


    window.location.href =
        "/";

}


/* =========================================================
   DATE HELPERS
========================================================= */

function setTodayAsMinimumDate() {

    const dateInput =
        getElement(
            "interventionDueDate"
        );


    if (!dateInput) {
        return;
    }


    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            today.getDate()
        ).padStart(
            2,
            "0"
        );


    dateInput.min =
        `${year}-${month}-${day}`;

}


/* =========================================================
   MODAL CLOSE HELPERS
========================================================= */

document.addEventListener(
    "click",
    event => {

        const profileOverlay =
            getElement(
                "profileOverlay"
            );


        const studentLoginOverlay =
            getElement(
                "studentLoginOverlay"
            );


        const interventionModal =
            getElement(
                "facultyInterventionModal"
            );


        const reviewModal =
            getElement(
                "facultyReviewModal"
            );


        if (
            event.target ===
            profileOverlay
        ) {

            closeStudentProfile();

        }


        if (
            event.target ===
            studentLoginOverlay
        ) {

            closeStudentLogin();

        }


        if (
            event.target ===
            interventionModal
        ) {

            closeFacultyInterventionModal();

        }


        if (
            event.target ===
            reviewModal
        ) {

            closeFacultyReviewModal();

        }

    }
);


/* =========================================================
   GLOBAL EXPORTS
   Needed because index.html uses onclick=""
========================================================= */

window.loadStudents =
    loadStudents;


window.clearStudentFilters =
    clearStudentFilters;


window.filterStudentsByPriority =
    filterStudentsByPriority;


window.filterStudentsByTrend =
    filterStudentsByTrend;


window.filterStudentsByMetric =
    filterStudentsByMetric;


window.openStudentProfile =
    openStudentProfile;


window.closeStudentProfile =
    closeStudentProfile;


window.openAIMentor =
    openAIMentor;


window.closeAIMentor =
    closeAIMentor;


window.askAIMentor =
    askAIMentor;


window.sendAIMentorMessage =
    sendAIMentorMessage;


window.handleMentorKey =
    handleMentorKey;


window.openStudentLogin =
    openStudentLogin;


window.closeStudentLogin =
    closeStudentLogin;


window.submitStudentLogin =
    submitStudentLogin;


window.studentLogout =
    studentLogout;


window.addFacultyNote =
    addFacultyNote;


window.loadFacultyNotes =
    loadFacultyNotes;


window.clearFacultyNoteForm =
    clearFacultyNoteForm;


window.saveStudentSpecificNote =
    saveStudentSpecificNote;


window.openFacultyInterventionModal =
    openFacultyInterventionModal;


window.closeFacultyInterventionModal =
    closeFacultyInterventionModal;


window.submitFacultyIntervention =
    submitFacultyIntervention;


window.openFacultyReviewModal =
    openFacultyReviewModal;


window.closeFacultyReviewModal =
    closeFacultyReviewModal;


window.submitFacultyReview =
    submitFacultyReview;


window.closeNotifications =
    closeNotifications;