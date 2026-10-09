// ============================================================
// AI STUDENT SUCCESS PLATFORM
// Student Portal JavaScript
// STEP 3 - CONNECTED STUDENT / FACULTY WORKFLOW
// ============================================================


// ============================================================
// GLOBAL STATE
// ============================================================

let currentStudent = null;

let currentInterventions = [];
let currentReports = [];
let currentNotes = [];
let currentNotifications = [];

const AUTH_TOKEN_KEY = "auth_token";
const USER_ROLE_KEY = "user_role";


// ============================================================
// DOM HELPER
// ============================================================

function getElement(id) {
    return document.getElementById(id);
}


// ============================================================
// SAFE HTML
// ============================================================

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// NUMBER HELPER
// ============================================================

function safeNumber(value, fallback = 0) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}


// ============================================================
// DATE HELPER
// ============================================================

function formatDate(value) {

    if (!value) {
        return "-";
    }

    try {

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleDateString(
            undefined,
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    } catch (error) {

        return String(value);
    }
}


function formatDateTime(value) {

    if (!value) {
        return "-";
    }

    try {

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString(
            undefined,
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    } catch (error) {

        return String(value);
    }
}


// ============================================================
// NORMALIZATION HELPERS
// ============================================================

function normalizeIntervention(intervention) {

    if (!intervention) {
        return null;
    }

    const item = {
        ...intervention
    };

    if (
        !item.id &&
        item.intervention_id
    ) {

        item.id =
            item.intervention_id;
    }

    if (
        !item.intervention_id &&
        item.id
    ) {

        item.intervention_id =
            item.id;
    }

    item.status =
        item.status ||
        "Assigned";

    item.progress =
        Math.max(
            0,
            Math.min(
                100,
                safeNumber(
                    item.progress
                )
            )
        );

    item.title =
        item.title ||
        "Faculty Intervention";

    item.description =
        item.description ||
        item.reason ||
        "";

    item.recommended_action =
        item.recommended_action ||
        item.action ||
        item.action_type ||
        "";

    item.faculty_feedback =
        item.faculty_feedback ||
        "";

    item.outcome =
        item.outcome ||
        "";

    item.reason =
        item.reason ||
        item.reason_category ||
        "";

    item.history =
        Array.isArray(item.history)
            ? item.history
            : [];

    item.baseline_metrics =
        item.baseline_metrics || {};

    item.after_metrics =
        item.after_metrics || {};

    return item;
}


function normalizeInterventions(items) {

    if (!Array.isArray(items)) {
        return [];
    }

    return items
        .map(normalizeIntervention)
        .filter(Boolean);
}


function normalizeReport(report) {

    if (!report) {
        return null;
    }

    return {
        ...report,
        id:
            report.id ||
            report.report_id ||
            "",
        report_id:
            report.report_id ||
            report.id ||
            "",
        status:
            report.status ||
            "Submitted",
        created_at:
            report.created_at ||
            report.submitted_at ||
            "",
        faculty_feedback:
            report.faculty_feedback ||
            report.feedback ||
            ""
    };
}


function normalizeReports(items) {

    if (!Array.isArray(items)) {
        return [];
    }

    return items
        .map(normalizeReport)
        .filter(Boolean);
}


// ============================================================
// API
// ============================================================

async function apiFetch(url, options = {}) {

    const response = await fetch(
        url,
        options
    );

    let data = null;

    try {

        data = await response.json();

    } catch (error) {

        data = null;
    }

    if (!response.ok) {

        let message =
            `Request failed: ${response.status}`;

        if (data) {

            if (
                typeof data.detail === "string"
            ) {

                message =
                    data.detail;

            } else if (
                typeof data.message === "string"
            ) {

                message =
                    data.message;
            }
        }

        throw new Error(message);
    }

    return data;
}


// ============================================================
// AUTH
// ============================================================

function getAuthToken() {

    return sessionStorage.getItem(
        AUTH_TOKEN_KEY
    );
}


function getUserRole() {

    return sessionStorage.getItem(
        USER_ROLE_KEY
    );
}


// ============================================================
// CLEAR SESSION
// ============================================================

function clearStudentSession() {

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
}


// ============================================================
// AUTH HEADERS
// ============================================================

function getAuthHeaders() {

    const token =
        getAuthToken();

    return {
        "Authorization":
            "Bearer " + token
    };
}


// ============================================================
// LOAD LOGGED-IN STUDENT
// ============================================================

async function loadLoggedInStudent() {

    const token =
        getAuthToken();

    const role =
        getUserRole();

    if (
        !token ||
        role !== "student"
    ) {

        window.location.replace(
            "/login.html"
        );

        return;
    }

    try {

        const data =
            await apiFetch(
                "/api/student/me",
                {
                    method: "GET",
                    headers:
                        getAuthHeaders()
                }
            );

        currentStudent =
            data;

        populateStudentDashboard(
            data
        );

        const dashboard =
            getElement(
                "studentDashboard"
            );

        if (dashboard) {

            dashboard.classList.remove(
                "hidden"
            );
        }

        loadPortalCollections(
            data
        );

        renderStudentPortalData();

    } catch (error) {

        console.error(
            "Student session error:",
            error
        );

        clearStudentSession();

        currentStudent =
            null;

        window.location.replace(
            "/login.html"
        );
    }
}


// ============================================================
// LOAD PORTAL COLLECTIONS
// ============================================================

function loadPortalCollections(data) {

    currentInterventions =
        normalizeInterventions(
            data?.interventions
        );

    currentReports =
        normalizeReports(
            data?.reports
        );

    currentNotes =
        Array.isArray(data?.notes)
            ? data.notes
            : [];

    currentNotifications =
        Array.isArray(
            data?.notifications
        )
            ? data.notifications
            : [];
}


// ============================================================
// REFRESH PORTAL DATA
// ============================================================

async function refreshStudentPortalData() {

    const token =
        getAuthToken();

    const role =
        getUserRole();

    if (
        !token ||
        role !== "student"
    ) {

        window.location.replace(
            "/login.html"
        );

        return;
    }

    try {

        const data =
            await apiFetch(
                "/api/student/me",
                {
                    method: "GET",
                    headers:
                        getAuthHeaders()
                }
            );

        currentStudent =
            data;

        populateStudentDashboard(
            data
        );

        loadPortalCollections(
            data
        );

        renderStudentPortalData();

    } catch (error) {

        console.error(
            "Unable to refresh student data:",
            error
        );
    }
}


// ============================================================
// LOGOUT
// ============================================================

function logoutStudent() {

    currentStudent =
        null;

    currentInterventions = [];
    currentReports = [];
    currentNotes = [];
    currentNotifications = [];

    clearStudentSession();

    window.location.replace(
        "/login.html"
    );
}


// ============================================================
// POPULATE DASHBOARD
// ============================================================

function populateStudentDashboard(
    student
) {

    if (!student) {
        return;
    }


    // ========================================================
    // IDENTITY
    // ========================================================

    setText(
        "topStudentName",
        student.name
    );

    setText(
        "topStudentId",
        student.student_id
    );

    setText(
        "dashboardStudentName",
        student.name
    );

    setText(
        "dashboardStudentId",
        student.student_id
    );

    setText(
        "accountStudentName",
        student.name
    );

    setText(
        "accountStudentId",
        student.student_id
    );


    // ========================================================
    // INITIAL
    // ========================================================

    const initialElement =
        getElement(
            "topStudentInitial"
        );

    if (initialElement) {

        const name =
            String(
                student.name ||
                "S"
            ).trim();

        initialElement.textContent =
            name
                ? name
                    .charAt(0)
                    .toUpperCase()
                : "S";
    }


    // ========================================================
    // BASIC
    // ========================================================

    const academic =
        student.academic || {};

    const cgpa =
        safeNumber(
            academic.cgpa
        );

    const attendance =
        safeNumber(
            student.attendance
        );

    const successScore =
        safeNumber(
            student.success_score
        );


    // ========================================================
    // SUMMARY
    // ========================================================

    setText(
        "studentCgpa",
        cgpa.toFixed(2)
    );

    setText(
        "studentAttendance",
        attendance.toFixed(1) +
        "%"
    );

    setText(
        "studentSuccessScore",
        successScore.toFixed(1)
    );

    setText(
        "studentRiskLevel",
        student.risk_level
    );

    applyRiskClass(
        "studentRiskLevel",
        student.risk_level
    );


    // ========================================================
    // ACADEMICS
    // ========================================================

    setText(
        "studentDepartment",
        student.department
    );

    setText(
        "studentYear",
        student.year
    );

    setText(
        "studentAcademicCgpa",
        cgpa.toFixed(2)
    );

    setText(
        "studentBacklogs",
        safeNumber(
            academic.backlogs
        )
    );

    setText(
        "studentSubjectPerformance",
        safeNumber(
            academic.subject_performance
        ).toFixed(1) +
        "%"
    );

    setText(
        "studentAcademicAttendance",
        attendance.toFixed(1) +
        "%"
    );


    // ========================================================
    // AI ANALYSIS
    // ========================================================

    setText(
        "studentAiScore",
        successScore.toFixed(1)
    );

    setText(
        "studentAiRisk",
        student.risk_level
    );

    applyRiskClass(
        "studentAiRisk",
        student.risk_level
    );

    setText(
        "studentSegment",
        student.segment
    );

    setText(
        "studentPlacement",
        student.placement_outcome
    );


    // ========================================================
    // RECOMMENDATION
    // ========================================================

    const recommendation =
        student.recommendation || {};

    setText(
        "studentRecommendation",
        recommendation.overall_recommendation ||
        "Continue working consistently on your academic and career goals."
    );


    // ========================================================
    // LEARNING
    // ========================================================

    const lms =
        student.lms || {};

    const engagement =
        student.engagement || {};

    setText(
        "studentLmsLogin",
        safeNumber(
            lms.login_frequency
        ).toFixed(1)
    );

    setText(
        "studentAssignmentCompletion",
        safeNumber(
            lms.assignment_completion
        ).toFixed(1) +
        "%"
    );

    setText(
        "studentEvents",
        safeNumber(
            engagement.events
        )
    );

    setText(
        "studentClubs",
        safeNumber(
            engagement.clubs
        )
    );

    setText(
        "studentHackathons",
        safeNumber(
            engagement.hackathons
        )
    );

    setText(
        "studentCertifications",
        safeNumber(
            engagement.certifications
        )
    );


    // ========================================================
    // PLACEMENT
    // ========================================================

    const placement =
        student.placement || {};

    const skills =
        student.skills || {};

    setText(
        "studentAptitude",
        safeNumber(
            placement.aptitude
        ).toFixed(1) +
        "%"
    );

    setText(
        "studentCoding",
        safeNumber(
            placement.coding
        ).toFixed(1) +
        "%"
    );

    setText(
        "studentMockInterview",
        safeNumber(
            placement.mock_interview
        ).toFixed(1) +
        "%"
    );

    setText(
        "studentTechnical",
        safeNumber(
            skills.technical
        ).toFixed(1) +
        "%"
    );

    setText(
        "studentSoftSkill",
        safeNumber(
            skills.soft
        ).toFixed(1) +
        "%"
    );


    // ========================================================
    // INSIGHTS
    // ========================================================

    renderStrengths(
        recommendation.student_strengths
    );

    renderRecommendedActions(
        recommendation.recommended_actions
    );

    renderRiskReasons(
        student.risk_reasons
    );


    // ========================================================
    // FEEDBACK
    // ========================================================

    const feedback =
        student.feedback || {};

    const satisfaction =
        safeNumber(
            feedback.student_satisfaction
        );

    const facultyFeedbackScore =
        safeNumber(
            feedback.faculty_feedback
        );

    setText(
        "studentSatisfaction",
        satisfaction.toFixed(1) +
        "%"
    );

    setText(
        "studentFacultyFeedbackScore",
        facultyFeedbackScore.toFixed(1) +
        "%"
    );

    /*
     * The CSV feedback score is kept for compatibility.
     *
     * The actual faculty feedback from interventions
     * and reports is rendered separately below.
     */

    renderFacultyFeedback(
        facultyFeedbackScore
    );

    renderLatestFacultyFeedback();
}


// ============================================================
// RENDER ALL PORTAL DATA
// ============================================================

function renderStudentPortalData() {

    renderActiveIntervention();

    renderInterventionReportArea();

    renderInterventionOutcome();

    renderFacultyNotes();

    renderNotifications();

    renderInterventionTimeline();

    renderLatestFacultyFeedback();

    setupReportForm();
}


// ============================================================
// SET TEXT
// ============================================================

function setText(
    id,
    value
) {

    const element =
        getElement(id);

    if (!element) {
        return;
    }

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        element.textContent =
            "-";

        return;
    }

    element.textContent =
        String(value);
}


// ============================================================
// RISK CLASS
// ============================================================

function applyRiskClass(
    elementId,
    risk
) {

    const element =
        getElement(
            elementId
        );

    if (!element) {
        return;
    }

    element.classList.remove(
        "risk-on-track",
        "risk-needs-attention",
        "risk-immediate-support"
    );

    if (
        risk === "On Track"
    ) {

        element.classList.add(
            "risk-on-track"
        );

    } else if (
        risk === "Needs Attention"
    ) {

        element.classList.add(
            "risk-needs-attention"
        );

    } else if (
        risk === "Immediate Support"
    ) {

        element.classList.add(
            "risk-immediate-support"
        );
    }
}


// ============================================================
// STRENGTHS
// ============================================================

function renderStrengths(
    strengths
) {

    const container =
        getElement(
            "studentStrengths"
        );

    if (!container) {
        return;
    }

    container.innerHTML =
        "";

    if (
        !Array.isArray(strengths) ||
        !strengths.length
    ) {

        container.innerHTML = `
            <div class="empty-insight">
                No specific strengths were identified yet.
            </div>
        `;

        return;
    }

    strengths.forEach(
        strength => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "insight-item strength-item";

            const title =
                strength?.strength ||
                strength?.title ||
                strength?.name ||
                "Student Strength";

            const detail =
                strength?.detail ||
                strength?.description ||
                strength?.evidence ||
                "";

            const category =
                strength?.category ||
                "General";

            item.innerHTML = `

                <div class="insight-item-icon">
                    ✓
                </div>

                <div>

                    <strong>
                        ${escapeHtml(title)}
                    </strong>

                    <p>
                        ${escapeHtml(detail)}
                    </p>

                    <small>
                        ${escapeHtml(category)}
                    </small>

                </div>
            `;

            container.appendChild(
                item
            );
        }
    );
}


// ============================================================
// RECOMMENDED ACTIONS
// ============================================================

function renderRecommendedActions(
    actions
) {

    const container =
        getElement(
            "studentRecommendedActions"
        );

    if (!container) {
        return;
    }

    container.innerHTML =
        "";

    if (
        !Array.isArray(actions) ||
        !actions.length
    ) {

        container.innerHTML = `
            <div class="empty-insight">
                Continue your current learning routine
                and monitor your academic progress.
            </div>
        `;

        return;
    }

    actions.forEach(
        action => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "insight-item action-item";

            item.innerHTML = `

                <div class="insight-item-icon">
                    →
                </div>

                <div>

                    <p>
                        ${escapeHtml(action)}
                    </p>

                </div>
            `;

            container.appendChild(
                item
            );
        }
    );
}


// ============================================================
// RISK REASONS
// ============================================================

function renderRiskReasons(
    reasons
) {

    const container =
        getElement(
            "studentRiskReasons"
        );

    if (!container) {
        return;
    }

    container.innerHTML =
        "";

    const validReasons =
        Array.isArray(reasons)
            ? reasons.filter(
                reason =>
                    reason &&
                    String(
                        reason
                    ).trim()
            )
            : [];

    if (!validReasons.length) {

        container.innerHTML = `

            <div class="no-risk-message">

                <span>
                    ✓
                </span>

                <div>

                    <strong>
                        No major risk factors detected
                    </strong>

                    <p>
                        Keep maintaining your current academic
                        and engagement performance.
                    </p>

                </div>

            </div>
        `;

        return;
    }

    validReasons.forEach(
        reason => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "risk-reason-item";

            item.innerHTML = `

                <span>
                    !
                </span>

                <strong>
                    ${escapeHtml(reason)}
                </strong>
            `;

            container.appendChild(
                item
            );
        }
    );
}


// ============================================================
// FACULTY FEEDBACK SCORE
// ============================================================

function renderFacultyFeedback(
    score
) {

    const container =
        getElement(
            "studentFacultyFeedback"
        );

    if (!container) {
        return;
    }

    const safeScore =
        Math.max(
            0,
            Math.min(
                100,
                safeNumber(score)
            )
        );

    let title =
        "Faculty Feedback";

    let message =
        "Your faculty feedback score is currently being monitored.";

    if (
        safeScore >= 80
    ) {

        title =
            "Positive Faculty Feedback";

        message =
            "Your faculty feedback indicates strong overall performance. Keep maintaining your current progress.";

    } else if (
        safeScore >= 60
    ) {

        title =
            "Good Faculty Feedback";

        message =
            "Your faculty feedback is positive, with some opportunities to continue improving.";

    } else if (
        safeScore > 0
    ) {

        title =
            "Faculty Feedback Needs Improvement";

        message =
            "Use the AI recommendations and academic insights to focus on the areas that need improvement.";

    } else {

        title =
            "Faculty Feedback";

        message =
            "Faculty feedback has not been recorded yet.";
    }

    container.innerHTML = `

        <div class="feedback-result">

            <div class="feedback-result-icon">
                💬
            </div>

            <div class="feedback-result-content">

                <strong>
                    ${escapeHtml(title)}
                </strong>

                <p>
                    ${escapeHtml(message)}
                </p>

            </div>

            <div class="feedback-score">

                <span>
                    Score
                </span>

                <strong>
                    ${safeScore.toFixed(1)}%
                </strong>

            </div>

        </div>
    `;

    /*
     * Add real intervention feedback below the
     * existing score when available.
     */

    renderLatestFacultyFeedback();
}


// ============================================================
// LATEST FACULTY FEEDBACK
// ============================================================

function getLatestFacultyFeedback() {

    const feedbackItems = [];


    // --------------------------------------------------------
    // Intervention feedback
    // --------------------------------------------------------

    currentInterventions.forEach(
        intervention => {

            const feedback =
                intervention.faculty_feedback ||
                intervention.feedback ||
                "";

            if (
                String(
                    feedback
                ).trim()
            ) {

                feedbackItems.push({

                    text:
                        String(
                            feedback
                        ),

                    date:
                        intervention.reviewed_at ||
                        intervention.updated_at ||
                        intervention.created_at,

                    source:
                        "Intervention Review"
                });
            }
        }
    );


    // --------------------------------------------------------
    // Report feedback
    // --------------------------------------------------------

    currentReports.forEach(
        report => {

            const feedback =
                report.faculty_feedback ||
                report.feedback ||
                "";

            if (
                String(
                    feedback
                ).trim()
            ) {

                feedbackItems.push({

                    text:
                        String(
                            feedback
                        ),

                    date:
                        report.reviewed_at ||
                        report.updated_at ||
                        report.created_at,

                    source:
                        "Progress Report Review"
                });
            }
        }
    );


    if (!feedbackItems.length) {
        return null;
    }


    feedbackItems.sort(
        (a, b) => {

            const first =
                new Date(
                    a.date || 0
                ).getTime();

            const second =
                new Date(
                    b.date || 0
                ).getTime();

            return second - first;
        }
    );


    return feedbackItems[0];
}


// ============================================================
// RENDER LATEST FACULTY FEEDBACK
// ============================================================

function renderLatestFacultyFeedback() {

    const feedback =
        getLatestFacultyFeedback();

    if (!feedback) {
        return;
    }

    const possibleContainers = [

        "studentLatestFacultyFeedback",

        "studentFacultyReview",

        "studentInterventionFeedback"
    ];


    let container = null;

    for (
        const id of possibleContainers
    ) {

        const element =
            getElement(id);

        if (element) {

            container =
                element;

            break;
        }
    }


    /*
     * If the HTML has no dedicated area,
     * do not create a new large UI block.
     */

    if (!container) {
        return;
    }


    container.innerHTML = `

        <div class="faculty-feedback-card">

            <div class="faculty-feedback-header">

                <strong>
                    Latest Faculty Feedback
                </strong>

                <span>
                    ${escapeHtml(
                        formatDateTime(
                            feedback.date
                        )
                    )}
                </span>

            </div>

            <p>
                ${escapeHtml(
                    feedback.text
                )}
            </p>

            <small>
                ${escapeHtml(
                    feedback.source
                )}
            </small>

        </div>
    `;
}


// ============================================================
// FIND ACTIVE INTERVENTION
// ============================================================

function getActiveIntervention() {

    if (
        !Array.isArray(
            currentInterventions
        )
    ) {

        return null;
    }

    const active =
        currentInterventions.find(
            intervention => {

                const status =
                    String(
                        intervention?.status ||
                        ""
                    ).toLowerCase();

                return ![
                    "completed",
                    "closed"
                ].includes(
                    status
                );
            }
        );

    return (
        active ||
        currentInterventions[
            currentInterventions.length - 1
        ] ||
        null
    );
}


// ============================================================
// INTERVENTION STATUS CLASS
// ============================================================

function getInterventionStatusClass(
    status
) {

    const value =
        String(
            status || ""
        ).toLowerCase();

    if (
        value.includes("completed") ||
        value.includes("closed")
    ) {

        return "status-completed";
    }

    if (
        value.includes("progress") ||
        value.includes("responded")
    ) {

        return "status-in-progress";
    }

    if (
        value.includes("review")
    ) {

        return "status-review";
    }

    if (
        value.includes("more work")
    ) {

        return "status-more-work";
    }

    return "status-assigned";
}


// ============================================================
// ACTIVE INTERVENTION
// ============================================================

function renderActiveIntervention() {

    const section =
        getElement(
            "studentInterventionSection"
        );

    const noIntervention =
        getElement(
            "studentNoIntervention"
        );

    const activeCard =
        getElement(
            "studentActiveIntervention"
        );

    if (!section) {
        return;
    }

    const intervention =
        getActiveIntervention();

    if (!intervention) {

        if (activeCard) {

            activeCard.classList.add(
                "hidden"
            );
        }

        if (noIntervention) {

            noIntervention.classList.remove(
                "hidden"
            );
        }

        setText(
            "studentInterventionStatus",
            "No Active Intervention"
        );

        return;
    }


    if (activeCard) {

        activeCard.classList.remove(
            "hidden"
        );
    }

    if (noIntervention) {

        noIntervention.classList.add(
            "hidden"
        );
    }


    const status =
        intervention.status ||
        "Assigned";


    const progress =
        Math.max(
            0,
            Math.min(
                100,
                safeNumber(
                    intervention.progress
                )
            )
        );


    setText(
        "studentInterventionStatus",
        status
    );


    const statusElement =
        getElement(
            "studentInterventionStatus"
        );


    if (statusElement) {

        statusElement.classList.remove(
            "status-completed",
            "status-in-progress",
            "status-review",
            "status-more-work",
            "status-assigned"
        );

        statusElement.classList.add(
            getInterventionStatusClass(
                status
            )
        );
    }


    setText(
        "studentInterventionTitle",
        intervention.title
    );


    setText(
        "studentInterventionStatusDetail",
        `${status} • ${progress}% progress`
    );


    setText(
        "studentInterventionReason",
        intervention.description ||
        intervention.reason
    );


    setText(
        "studentInterventionAction",
        intervention.recommended_action ||
        intervention.action ||
        intervention.action_type ||
        "Complete the assigned intervention activities and submit your progress report."
    );


    setText(
        "studentInterventionFacultyAction",
        intervention.action_taken ||
        intervention.faculty_action ||
        intervention.faculty_feedback ||
        "Faculty will review your progress after you submit your report."
    );


    setText(
        "studentInterventionDate",
        formatDate(
            intervention.intervention_date ||
            intervention.created_at ||
            intervention.assigned_at
        )
    );


    setText(
        "studentInterventionFollowup",
        intervention.due_date
            ? formatDate(
                intervention.due_date
            )
            : "No deadline specified"
    );


    setText(
        "studentInterventionAssignedBy",
        intervention.assigned_by ||
        intervention.faculty_name ||
        "Faculty Administrator"
    );


    setText(
        "studentInterventionInstructions",
        intervention.description ||
        intervention.reason ||
        "Follow the instructions provided by your faculty member."
    );


    const reportButton =
        getElement(
            "openInterventionReportButton"
        );


    if (reportButton) {

        const lowerStatus =
            String(
                status
            ).toLowerCase();

        if (
            lowerStatus.includes(
                "completed"
            )
        ) {

            reportButton.textContent =
                "View / Submit Report";

        } else {

            reportButton.textContent =
                "Submit Progress Report";
        }
    }


    updateInterventionProgressBar(
        progress
    );


    /*
     * Render richer metrics if the HTML
     * already provides these elements.
     */

    renderInterventionMetrics(
        intervention
    );
}


// ============================================================
// INTERVENTION METRICS
// ============================================================

function renderInterventionMetrics(
    intervention
) {

    const baseline =
        intervention.baseline_metrics ||
        {};

    const after =
        intervention.after_metrics ||
        {};


    const mappings = [

        [
            "studentInterventionBaselineCgpa",
            baseline.cgpa
        ],

        [
            "studentInterventionAfterCgpa",
            after.cgpa
        ],

        [
            "studentInterventionBaselineAttendance",
            baseline.attendance !== undefined
                ? `${safeNumber(
                    baseline.attendance
                ).toFixed(1)}%`
                : undefined
        ],

        [
            "studentInterventionAfterAttendance",
            after.attendance !== undefined
                ? `${safeNumber(
                    after.attendance
                ).toFixed(1)}%`
                : undefined
        ]
    ];


    mappings.forEach(
        ([id, value]) => {

            if (
                value !== undefined &&
                value !== null
            ) {

                setText(
                    id,
                    value
                );
            }
        }
    );


    setText(
        "studentInterventionOutcome",
        intervention.outcome ||
        "Outcome will appear after faculty review."
    );
}


// ============================================================
// INTERVENTION PROGRESS BAR
// ============================================================

function updateInterventionProgressBar(
    progress
) {

    const possibleIds = [

        "studentInterventionProgress",

        "studentInterventionProgressBar"
    ];


    possibleIds.forEach(
        id => {

            const element =
                getElement(id);

            if (!element) {
                return;
            }

            if (
                element.tagName ===
                "PROGRESS"
            ) {

                element.value =
                    progress;

                element.max =
                    100;

            } else {

                element.style.width =
                    `${progress}%`;
            }
        }
    );
}


// ============================================================
// REPORT AREA
// ============================================================

function renderInterventionReportArea() {

    const reportSection =
        getElement(
            "studentReportSection"
        );

    if (!reportSection) {
        return;
    }

    const intervention =
        getActiveIntervention();

    if (!intervention) {

        reportSection.classList.add(
            "hidden"
        );

        return;
    }


    const form =
        getElement(
            "studentInterventionReportForm"
        );


    if (form) {

        if (
            form.dataset.open !==
            "true"
        ) {

            reportSection.classList.add(
                "hidden"
            );
        }
    }
}


// ============================================================
// OPEN REPORT FORM
// ============================================================

function openInterventionReport() {

    const intervention =
        getActiveIntervention();

    if (!intervention) {

        showReportMessage(
            "There is no active intervention to report.",
            true
        );

        return;
    }


    const reportSection =
        getElement(
            "studentReportSection"
        );


    if (reportSection) {

        reportSection.classList.remove(
            "hidden"
        );
    }


    const form =
        getElement(
            "studentInterventionReportForm"
        );


    if (form) {

        form.dataset.open =
            "true";
    }


    const titleInput =
        getElement(
            "studentReportTitle"
        );


    if (
        titleInput &&
        !titleInput.value
    ) {

        titleInput.value =
            `Progress Report - ${
                intervention.title ||
                "Intervention"
            }`;
    }


    ensureReportExtraFields();


    if (reportSection) {

        reportSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}


// ============================================================
// CLOSE REPORT FORM
// ============================================================

function closeInterventionReport() {

    const reportSection =
        getElement(
            "studentReportSection"
        );


    if (reportSection) {

        reportSection.classList.add(
            "hidden"
        );
    }


    const form =
        getElement(
            "studentInterventionReportForm"
        );


    if (form) {

        form.dataset.open =
            "false";
    }


    const message =
        getElement(
            "studentReportMessage"
        );


    if (message) {

        message.textContent =
            "";

        message.className =
            "report-message";
    }
}


// ============================================================
// REPORT MESSAGE
// ============================================================

function showReportMessage(
    message,
    isError = false
) {

    const element =
        getElement(
            "studentReportMessage"
        );

    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.className =
        isError
            ? "report-message error"
            : "report-message success";
}


// ============================================================
// ENSURE REPORT EXTRA FIELDS
// ============================================================

function ensureReportExtraFields() {

    const form =
        getElement(
            "studentInterventionReportForm"
        );


    if (!form) {
        return;
    }


    let progressInput =
        getElement(
            "studentReportProgress"
        );


    let attachmentInput =
        getElement(
            "studentReportAttachment"
        );


    // --------------------------------------------------------
    // PROGRESS
    // --------------------------------------------------------

    if (!progressInput) {

        const wrapper =
            document.createElement(
                "div"
            );

        wrapper.className =
            "student-report-extra-field";

        wrapper.innerHTML = `

            <label
                for="studentReportProgress"
                class="form-label"
            >
                Progress
            </label>

            <select
                id="studentReportProgress"
                class="form-input"
                required
            >

                <option value="25">
                    25% completed
                </option>

                <option value="50">
                    50% completed
                </option>

                <option value="75">
                    75% completed
                </option>

                <option value="100">
                    100% completed
                </option>

            </select>

        `;


        form.insertBefore(
            wrapper,
            form.lastElementChild
        );


        progressInput =
            getElement(
                "studentReportProgress"
            );
    }


    // --------------------------------------------------------
    // ATTACHMENT
    // --------------------------------------------------------

    if (!attachmentInput) {

        const wrapper =
            document.createElement(
                "div"
            );

        wrapper.className =
            "student-report-extra-field";

        wrapper.innerHTML = `

            <label
                for="studentReportAttachment"
                class="form-label"
            >
                Evidence / Attachment
            </label>

            <input
                type="file"
                id="studentReportAttachment"
                class="form-input"
                accept=".pdf,.docx,.jpg,.jpeg,.png"
            />

            <small>
                PDF, DOCX, JPG, JPEG or PNG. Maximum 10 MB.
            </small>

        `;


        form.insertBefore(
            wrapper,
            form.lastElementChild
        );


        attachmentInput =
            getElement(
                "studentReportAttachment"
            );
    }


    // --------------------------------------------------------
    // DEFAULT PROGRESS
    // --------------------------------------------------------

    const intervention =
        getActiveIntervention();


    const currentProgress =
        intervention
            ? safeNumber(
                intervention.progress
            )
            : 0;


    if (progressInput) {

        if (
            currentProgress >= 100
        ) {

            progressInput.value =
                "100";

        } else if (
            currentProgress >= 75
        ) {

            progressInput.value =
                "100";

        } else if (
            currentProgress >= 50
        ) {

            progressInput.value =
                "75";

        } else if (
            currentProgress >= 25
        ) {

            progressInput.value =
                "50";

        } else {

            progressInput.value =
                "25";
        }
    }
}


// ============================================================
// REPORT FORM SETUP
// ============================================================

function setupReportForm() {

    const form =
        getElement(
            "studentInterventionReportForm"
        );


    if (!form) {
        return;
    }


    if (
        form.dataset.listenerAttached ===
        "true"
    ) {

        return;
    }


    form.dataset.listenerAttached =
        "true";


    form.addEventListener(
        "submit",
        submitInterventionReport
    );


    const openButton =
        getElement(
            "openInterventionReportButton"
        );


    if (
        openButton &&
        openButton.dataset.listenerAttached !==
        "true"
    ) {

        openButton.dataset.listenerAttached =
            "true";

        openButton.addEventListener(
            "click",
            openInterventionReport
        );
    }


    const cancelButton =
        getElement(
            "cancelInterventionReportButton"
        );


    if (
        cancelButton &&
        cancelButton.dataset.listenerAttached !==
        "true"
    ) {

        cancelButton.dataset.listenerAttached =
            "true";

        cancelButton.addEventListener(
            "click",
            closeInterventionReport
        );
    }
}


// ============================================================
// SUBMIT INTERVENTION REPORT
// ============================================================

async function submitInterventionReport(
    event
) {

    event.preventDefault();


    const intervention =
        getActiveIntervention();


    if (!intervention) {

        showReportMessage(
            "No active intervention found.",
            true
        );

        return;
    }


    const titleInput =
        getElement(
            "studentReportTitle"
        );


    const descriptionInput =
        getElement(
            "studentReportDescription"
        );


    const evidenceInput =
        getElement(
            "studentReportEvidence"
        );


    const progressInput =
        getElement(
            "studentReportProgress"
        );


    const fileInput =
        getElement(
            "studentReportAttachment"
        ) ||
        getElement(
            "studentReportFile"
        ) ||
        getElement(
            "reportAttachment"
        );


    const title =
        titleInput?.value.trim() ||
        "";


    const description =
        descriptionInput?.value.trim() ||
        "";


    const evidence =
        evidenceInput?.value.trim() ||
        "";


    if (!description) {

        showReportMessage(
            "Please describe the work you completed.",
            true
        );

        return;
    }


    const selectedProgress =
        progressInput
            ? safeNumber(
                progressInput.value
            )
            : Math.min(
                100,
                safeNumber(
                    intervention.progress
                ) + 25
            );


    const submittedProgress =
        Math.max(
            0,
            Math.min(
                100,
                selectedProgress
            )
        );


    const formData =
        new FormData();


    formData.append(
        "progress",
        String(
            submittedProgress
        )
    );


    formData.append(
        "completed_work",
        title
            ? `${title}\n\n${description}`
            : description
    );


    formData.append(
        "difficulties",
        evidence
            ? `Evidence / additional details:\n${evidence}`
            : ""
    );


    formData.append(
        "next_steps",
        submittedProgress >= 100
            ? "Intervention work completed. Awaiting faculty review."
            : "Continue the assigned intervention and wait for faculty review."
    );


    if (
        fileInput &&
        fileInput.files &&
        fileInput.files.length > 0
    ) {

        const file =
            fileInput.files[0];


        if (
            file.size >
            10 * 1024 * 1024
        ) {

            showReportMessage(
                "The attachment is larger than 10 MB.",
                true
            );

            return;
        }


        formData.append(
            "attachment",
            file
        );
    }


    const interventionId =
        intervention.intervention_id ||
        intervention.id;


    if (!interventionId) {

        showReportMessage(
            "This intervention does not have a valid ID.",
            true
        );

        return;
    }


    const submitButton =
        event.submitter ||
        document.querySelector(
            "#studentInterventionReportForm button[type='submit']"
        );


    const originalButtonText =
        submitButton
            ? submitButton.textContent
            : "";


    try {

        if (submitButton) {

            submitButton.disabled =
                true;

            submitButton.textContent =
                "Submitting...";
        }


        showReportMessage(
            "Submitting your progress report..."
        );


        const response =
            await apiFetch(
                `/api/interventions/${encodeURIComponent(
                    interventionId
                )}/reports`,
                {
                    method: "POST",
                    headers:
                        getAuthHeaders(),
                    body:
                        formData
                }
            );


        console.log(
            "Report submitted:",
            response
        );


        showReportMessage(
            "Your progress report was submitted successfully. Faculty will review it."
        );


        const form =
            getElement(
                "studentInterventionReportForm"
            );


        if (form) {

            form.reset();

            form.dataset.open =
                "false";
        }


        await refreshStudentPortalData();


        const reportSection =
            getElement(
                "studentReportSection"
            );


        if (reportSection) {

            reportSection.classList.add(
                "hidden"
            );
        }


    } catch (error) {

        console.error(
            "Report submission error:",
            error
        );


        showReportMessage(
            error.message ||
            "Unable to submit the report.",
            true
        );


    } finally {

        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                originalButtonText ||
                "Submit Report";
        }
    }
}


// ============================================================
// INTERVENTION OUTCOME
// ============================================================

function renderInterventionOutcome() {

    const section =
        getElement(
            "studentOutcomeSection"
        );


    if (!section) {
        return;
    }


    const intervention =
        getActiveIntervention();


    if (!intervention) {

        section.classList.add(
            "hidden"
        );

        return;
    }


    section.classList.remove(
        "hidden"
    );


    const progress =
        Math.max(
            0,
            Math.min(
                100,
                safeNumber(
                    intervention.progress
                )
            )
        );


    const interventionId =
        intervention.intervention_id ||
        intervention.id;


    const reports =
        currentReports.filter(
            report =>
                String(
                    report?.intervention_id
                ) ===
                String(
                    interventionId
                )
        );


    const latestReport =
        reports.length
            ? reports[
                reports.length - 1
            ]
            : null;


    const baselineSuccess =
        currentStudent
            ? safeNumber(
                currentStudent.success_score
            )
            : 0;


    const baselineRisk =
        currentStudent
            ? currentStudent.risk_level
            : "-";


    const baselineMetrics =
        intervention.baseline_metrics ||
        {};


    const afterMetrics =
        intervention.after_metrics ||
        {};


    setText(
        "studentBeforeSuccessScore",
        baselineMetrics.success_score !== undefined
            ? safeNumber(
                baselineMetrics.success_score
            ).toFixed(1)
            : baselineSuccess.toFixed(1)
    );


    setText(
        "studentBeforeRisk",
        baselineMetrics.risk_level ||
        baselineRisk
    );


    /*
     * IMPORTANT:
     *
     * Only display an after-intervention score when
     * the backend actually has an after snapshot.
     *
     * Otherwise we do not fake an improvement.
     */

    if (
        afterMetrics.success_score !== undefined
    ) {

        setText(
            "studentAfterSuccessScore",
            safeNumber(
                afterMetrics.success_score
            ).toFixed(1)
        );

    } else {

        setText(
            "studentAfterSuccessScore",
            "Pending review"
        );
    }


    if (
        afterMetrics.risk_level
    ) {

        setText(
            "studentAfterRisk",
            afterMetrics.risk_level
        );

    } else {

        setText(
            "studentAfterRisk",
            intervention.status ||
            "Pending review"
        );
    }


    if (
        afterMetrics.success_score !== undefined &&
        baselineMetrics.success_score !== undefined
    ) {

        const improvement =
            safeNumber(
                afterMetrics.success_score
            ) -
            safeNumber(
                baselineMetrics.success_score
            );

        setText(
            "studentScoreImprovement",
            `${improvement >= 0 ? "+" : ""}${improvement.toFixed(1)} points`
        );

    } else {

        setText(
            "studentScoreImprovement",
            `${progress}% intervention progress`
        );
    }


    const beforeAttendance =
        baselineMetrics.attendance !== undefined
            ? safeNumber(
                baselineMetrics.attendance
            )
            : safeNumber(
                currentStudent?.attendance
            );


    const afterAttendance =
        afterMetrics.attendance !== undefined
            ? safeNumber(
                afterMetrics.attendance
            )
            : null;


    setText(
        "studentBeforeAfterAttendance",
        beforeAttendance.toFixed(1) +
        "%"
    );


    if (afterAttendance !== null) {

        const change =
            afterAttendance -
            beforeAttendance;

        setText(
            "studentAttendanceImprovement",
            `${change >= 0 ? "+" : ""}${change.toFixed(1)} points`
        );

    } else {

        setText(
            "studentAttendanceImprovement",
            latestReport
                ? "Awaiting faculty outcome review"
                : "No report submitted yet"
        );
    }


    const beforeCgpa =
        baselineMetrics.cgpa !== undefined
            ? safeNumber(
                baselineMetrics.cgpa
            )
            : safeNumber(
                currentStudent?.academic?.cgpa
            );


    const afterCgpa =
        afterMetrics.cgpa !== undefined
            ? safeNumber(
                afterMetrics.cgpa
            )
            : null;


    setText(
        "studentBeforeAfterAcademic",
        beforeCgpa.toFixed(2)
    );


    if (afterCgpa !== null) {

        const change =
            afterCgpa -
            beforeCgpa;

        setText(
            "studentAcademicImprovement",
            `${change >= 0 ? "+" : ""}${change.toFixed(2)} CGPA`
        );

    } else {

        setText(
            "studentAcademicImprovement",
            `${reports.length} report(s) submitted`
        );
    }


    const beforeLms =
        baselineMetrics.lms_login_frequency !== undefined
            ? safeNumber(
                baselineMetrics.lms_login_frequency
            )
            : safeNumber(
                currentStudent?.lms?.login_frequency
            );


    const afterLms =
        afterMetrics.lms_login_frequency !== undefined
            ? safeNumber(
                afterMetrics.lms_login_frequency
            )
            : null;


    setText(
        "studentBeforeAfterLms",
        beforeLms.toFixed(1)
    );


    if (afterLms !== null) {

        const change =
            afterLms -
            beforeLms;

        setText(
            "studentLmsImprovement",
            `${change >= 0 ? "+" : ""}${change.toFixed(1)} activity`
        );

    } else {

        setText(
            "studentLmsImprovement",
            "Current LMS activity"
        );
    }


    const beforeAssignments =
        baselineMetrics.assignment_completion !== undefined
            ? safeNumber(
                baselineMetrics.assignment_completion
            )
            : safeNumber(
                currentStudent?.lms?.assignment_completion
            );


    const afterAssignments =
        afterMetrics.assignment_completion !== undefined
            ? safeNumber(
                afterMetrics.assignment_completion
            )
            : null;


    setText(
        "studentBeforeAfterAssignments",
        beforeAssignments.toFixed(1) +
        "%"
    );


    if (
        afterAssignments !== null
    ) {

        const change =
            afterAssignments -
            beforeAssignments;

        setText(
            "studentAssignmentImprovement",
            `${change >= 0 ? "+" : ""}${change.toFixed(1)} points`
        );

    } else {

        setText(
            "studentAssignmentImprovement",
            "Current assignment completion"
        );
    }


    setText(
        "studentInterventionOutcome",
        intervention.outcome ||
        "Outcome will appear after faculty review."
    );


    updateOutcomeProgressBars(
        progress
    );
}


// ============================================================
// OUTCOME PROGRESS BARS
// ============================================================

function updateOutcomeProgressBars(
    progress
) {

    const mappings = [

        [
            "studentAttendanceProgress",
            progress
        ],

        [
            "studentAcademicProgress",
            progress
        ],

        [
            "studentLmsProgress",
            progress
        ],

        [
            "studentAssignmentProgress",
            progress
        ]
    ];


    mappings.forEach(
        ([id, value]) => {

            const element =
                getElement(id);


            if (!element) {
                return;
            }


            if (
                element.tagName ===
                "PROGRESS"
            ) {

                element.value =
                    value;

                element.max =
                    100;

            } else {

                element.style.width =
                    `${value}%`;
            }
        }
    );
}


// ============================================================
// FACULTY NOTES
// ============================================================

function renderFacultyNotes() {

    const section =
        getElement(
            "studentFacultyNotesSection"
        );


    const container =
        getElement(
            "studentFacultyNotes"
        );


    if (!container) {
        return;
    }


    if (section) {

        section.classList.remove(
            "hidden"
        );
    }


    setText(
        "studentNotesCount",
        currentNotes.length
    );


    container.innerHTML =
        "";


    if (
        !Array.isArray(
            currentNotes
        ) ||
        !currentNotes.length
    ) {

        container.innerHTML = `
            <div class="empty-insight">
                No faculty notes have been added for you yet.
            </div>
        `;

        return;
    }


    currentNotes.forEach(
        note => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "faculty-note-card";


            const title =
                note.title ||
                "Faculty Note";


            const faculty =
                note.faculty_name ||
                note.assigned_by ||
                "Faculty Administrator";


            const noteText =
                note.note ||
                note.description ||
                note.content ||
                "";


            const created =
                formatDate(
                    note.created_at
                );


            let attachmentHtml =
                "";


            const attachment =
                note.attachment ||
                null;


            const attachmentUrl =
                attachment?.url ||
                note.attachment_url ||
                note.file_url ||
                null;


            const filename =
                attachment?.original_filename ||
                attachment?.filename ||
                note.filename ||
                note.file_name ||
                "Attachment";


            if (attachmentUrl) {

                attachmentHtml = `

                    <div class="faculty-note-attachment">

                        <span>
                            📎
                            ${escapeHtml(filename)}
                        </span>

                        <a
                            href="${escapeHtml(
                                attachmentUrl
                            )}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            View
                        </a>

                        <a
                            href="${escapeHtml(
                                attachmentUrl
                            )}"
                            download
                        >
                            Download
                        </a>

                    </div>
                `;
            }


            card.innerHTML = `

                <div class="faculty-note-card-header">

                    <div>

                        <strong>
                            ${escapeHtml(title)}
                        </strong>

                        <small>
                            ${escapeHtml(faculty)}
                            •
                            ${escapeHtml(created)}
                        </small>

                    </div>

                </div>

                <p>
                    ${escapeHtml(noteText)}
                </p>

                ${attachmentHtml}

            `;


            container.appendChild(
                card
            );
        }
    );
}


// ============================================================
// NOTIFICATIONS
// ============================================================

function renderNotifications() {

    const section =
        getElement(
            "studentNotificationsSection"
        );


    const container =
        getElement(
            "studentNotifications"
        );


    if (!container) {
        return;
    }


    if (section) {

        section.classList.remove(
            "hidden"
        );
    }


    const unreadCount =
        currentNotifications.filter(
            notification =>
                !notification.read
        ).length;


    setText(
        "studentNotificationCount",
        unreadCount
    );


    container.innerHTML =
        "";


    if (
        !Array.isArray(
            currentNotifications
        ) ||
        !currentNotifications.length
    ) {

        container.innerHTML = `
            <div class="empty-insight">
                You have no notifications.
            </div>
        `;

        return;
    }


    currentNotifications.forEach(
        notification => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "student-notification";


            if (
                !notification.read
            ) {

                item.classList.add(
                    "unread"
                );
            }


            const type =
                notification.type ||
                "notification";


            const title =
                notification.title ||
                "Notification";


            const message =
                notification.message ||
                "";


            const created =
                formatDateTime(
                    notification.created_at ||
                    notification.timestamp
                );


            const notificationId =
                notification.notification_id ||
                notification.id ||
                "";


            item.innerHTML = `

                <div class="notification-icon">
                    ${getNotificationIcon(
                        type
                    )}
                </div>

                <div class="notification-content">

                    <strong>
                        ${escapeHtml(title)}
                    </strong>

                    <p>
                        ${escapeHtml(message)}
                    </p>

                    <small>
                        ${escapeHtml(created)}
                    </small>

                </div>

                ${
                    !notification.read
                        ? `
                            <button
                                type="button"
                                class="notification-read-button"
                                data-notification-id="${escapeHtml(
                                    notificationId
                                )}"
                            >
                                Mark read
                            </button>
                        `
                        : `
                            <span class="notification-read-label">
                                Read
                            </span>
                        `
                }

            `;


            container.appendChild(
                item
            );
        }
    );


    container
        .querySelectorAll(
            ".notification-read-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            button.dataset
                                .notificationId;

                        markStudentNotificationRead(
                            id
                        );
                    }
                );
            }
        );
}


// ============================================================
// NOTIFICATION ICON
// ============================================================

function getNotificationIcon(
    type
) {

    const value =
        String(
            type || ""
        ).toLowerCase();


    if (
        value.includes(
            "intervention"
        )
    ) {

        return "🎯";
    }


    if (
        value.includes(
            "report"
        )
    ) {

        return "📝";
    }


    if (
        value.includes(
            "review"
        )
    ) {

        return "✅";
    }


    if (
        value.includes(
            "response"
        )
    ) {

        return "💬";
    }


    if (
        value.includes(
            "note"
        )
    ) {

        return "📚";
    }


    return "🔔";
}


// ============================================================
// MARK NOTIFICATION READ
// ============================================================

async function markStudentNotificationRead(
    notificationId
) {

    if (!notificationId) {
        return;
    }


    try {

        await apiFetch(
            `/api/student/notifications/${encodeURIComponent(
                notificationId
            )}/read`,
            {
                method: "PATCH",
                headers:
                    getAuthHeaders()
            }
        );


        await refreshStudentPortalData();


    } catch (error) {

        console.error(
            "Notification update error:",
            error
        );
    }
}


// ============================================================
// INTERVENTION TIMELINE
// ============================================================

function renderInterventionTimeline() {

    const section =
        getElement(
            "studentInterventionTimelineSection"
        );


    const container =
        getElement(
            "studentInterventionTimeline"
        );


    if (!container) {
        return;
    }


    if (section) {

        section.classList.remove(
            "hidden"
        );
    }


    container.innerHTML =
        "";


    const timelineItems = [];


    // --------------------------------------------------------
    // INTERVENTIONS
    // --------------------------------------------------------

    currentInterventions.forEach(
        intervention => {

            const interventionDate =
                intervention.intervention_date ||
                intervention.created_at ||
                intervention.assigned_at;


            timelineItems.push({

                date:
                    interventionDate,

                title:
                    "Intervention Assigned",

                description:
                    intervention.title ||
                    "New intervention",

                type:
                    "assigned"
            });


            if (
                intervention.description
            ) {

                timelineItems.push({

                    date:
                        interventionDate,

                    title:
                        "Faculty Instructions",

                    description:
                        intervention.description,

                    type:
                        "instruction"
                });
            }


            if (
                intervention.status
            ) {

                timelineItems.push({

                    date:
                        intervention.updated_at ||
                        intervention.created_at,

                    title:
                        "Intervention Status",

                    description:
                        `${intervention.status}${
                            intervention.progress !==
                            undefined
                                ? ` • ${safeNumber(
                                    intervention.progress
                                )}% progress`
                                : ""
                        }`,

                    type:
                        "status"
                });
            }


            if (
                intervention.action_taken
            ) {

                timelineItems.push({

                    date:
                        intervention.updated_at ||
                        intervention.created_at,

                    title:
                        "Faculty Action",

                    description:
                        intervention.action_taken,

                    type:
                        "faculty"
                });
            }


            if (
                intervention.faculty_feedback
            ) {

                timelineItems.push({

                    date:
                        intervention.reviewed_at ||
                        intervention.updated_at,

                    title:
                        "Faculty Feedback",

                    description:
                        intervention.faculty_feedback,

                    type:
                        "review"
                });
            }


            /*
             * New storage format can contain a detailed
             * intervention history array.
             */

            if (
                Array.isArray(
                    intervention.history
                )
            ) {

                intervention.history.forEach(
                    historyItem => {

                        timelineItems.push({

                            date:
                                historyItem.timestamp ||
                                historyItem.created_at ||
                                historyItem.date,

                            title:
                                historyItem.title ||
                                historyItem.action ||
                                "Intervention Update",

                            description:
                                historyItem.description ||
                                historyItem.message ||
                                historyItem.status ||
                                "",

                            type:
                                historyItem.type ||
                                "status"
                        });
                    }
                );
            }
        }
    );


    // --------------------------------------------------------
    // REPORTS
    // --------------------------------------------------------

    currentReports.forEach(
        report => {

            timelineItems.push({

                date:
                    report.created_at ||
                    report.submitted_at,

                title:
                    "Progress Report Submitted",

                description:
                    report.completed_work ||
                    "Student submitted intervention progress.",

                type:
                    "report"
            });


            if (
                report.status
            ) {

                timelineItems.push({

                    date:
                        report.reviewed_at ||
                        report.updated_at,

                    title:
                        "Faculty Review",

                    description:
                        report.faculty_feedback
                            ? `${report.status} • ${report.faculty_feedback}`
                            : report.status,

                    type:
                        "review"
                });
            }
        }
    );


    // --------------------------------------------------------
    // NOTIFICATIONS
    // --------------------------------------------------------

    currentNotifications
        .filter(
            notification =>
                notification.created_at ||
                notification.timestamp
        )
        .forEach(
            notification => {

                timelineItems.push({

                    date:
                        notification.created_at ||
                        notification.timestamp,

                    title:
                        notification.title ||
                        "Notification",

                    description:
                        notification.message ||
                        "",

                    type:
                        "notification"
                });
            }
        );


    // --------------------------------------------------------
    // SORT
    // --------------------------------------------------------

    timelineItems.sort(
        (a, b) => {

            const first =
                new Date(
                    a.date || 0
                ).getTime();


            const second =
                new Date(
                    b.date || 0
                ).getTime();


            return second - first;
        }
    );


    if (
        !timelineItems.length
    ) {

        container.innerHTML = `
            <div class="empty-insight">
                Your intervention activity timeline will appear here.
            </div>
        `;

        return;
    }


    timelineItems.forEach(
        timelineItem => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "timeline-item";


            item.innerHTML = `

                <div class="timeline-dot">
                    ${getTimelineIcon(
                        timelineItem.type
                    )}
                </div>

                <div class="timeline-content">

                    <strong>
                        ${escapeHtml(
                            timelineItem.title
                        )}
                    </strong>

                    <p>
                        ${escapeHtml(
                            timelineItem.description
                        )}
                    </p>

                    <small>
                        ${escapeHtml(
                            formatDateTime(
                                timelineItem.date
                            )
                        )}
                    </small>

                </div>
            `;


            container.appendChild(
                item
            );
        }
    );
}


// ============================================================
// TIMELINE ICON
// ============================================================

function getTimelineIcon(
    type
) {

    switch (type) {

        case "assigned":
            return "🎯";

        case "instruction":
            return "📌";

        case "status":
            return "🔄";

        case "faculty":
            return "👨‍🏫";

        case "report":
            return "📝";

        case "review":
            return "✅";

        case "notification":
            return "🔔";

        default:
            return "•";
    }
}


// ============================================================
// LOGOUT SETUP
// ============================================================

function setupLogout() {

    const button =
        getElement(
            "studentLogoutButton"
        );


    if (!button) {
        return;
    }


    if (
        button.dataset.listenerAttached ===
        "true"
    ) {

        return;
    }


    button.dataset.listenerAttached =
        "true";


    button.addEventListener(
        "click",
        logoutStudent
    );
}


// ============================================================
// HISTORY / BROWSER CACHE
// ============================================================

function setupHistoryProtection() {

    window.addEventListener(
        "pageshow",
        event => {

            if (
                event.persisted
            ) {

                loadLoggedInStudent();
            }
        }
    );
}


// ============================================================
// AUTO REFRESH
// ============================================================

function setupPortalAutoRefresh() {

    /*
     * This keeps the student portal synchronized with
     * faculty actions while the student page is open.
     */

    if (
        window.studentPortalRefreshTimer
    ) {

        clearInterval(
            window.studentPortalRefreshTimer
        );
    }


    window.studentPortalRefreshTimer =
        setInterval(
            async () => {

                const token =
                    getAuthToken();

                const role =
                    getUserRole();

                if (
                    !token ||
                    role !== "student"
                ) {

                    return;
                }


                try {

                    await refreshStudentPortalData();

                } catch (error) {

                    console.error(
                        "Automatic student portal refresh failed:",
                        error
                    );
                }

            },
            30000
        );
}


// ============================================================
// INITIALIZE
// ============================================================

async function initializeStudentPortal() {

    console.log(
        "Initializing Student Portal..."
    );


    setupLogout();

    setupHistoryProtection();

    await loadLoggedInStudent();

    setupPortalAutoRefresh();


    console.log(
        "Student Portal initialized."
    );
}


// ============================================================
// START
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    initializeStudentPortal
);