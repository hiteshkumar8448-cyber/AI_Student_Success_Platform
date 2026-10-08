// ============================================================
// AI STUDENT SUCCESS PLATFORM
// Faculty Dashboard JavaScript
// Enhanced Functionality Version
// UI / Design is intentionally preserved
// ============================================================


// ============================================================
// GLOBAL STATE
// ============================================================

let currentStudents = [];
let activeStudent = null;
let activeStudentForNotes = null;
let typingMessageCounter = 0;
let studentLoadRequest = 0;


// ============================================================
// SECURITY HELPER
// ============================================================

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


// ============================================================
// GENERIC HELPERS
// ============================================================

function getElement(id) {

    return document.getElementById(id);

}


function showElement(id) {

    const element = getElement(id);

    if (element) {
        element.classList.remove("hidden");
    }

}


function hideElement(id) {

    const element = getElement(id);

    if (element) {
        element.classList.add("hidden");
    }

}


function safeNumber(value, fallback = 0) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;

}


// ============================================================
// FORMAT STUDENT STRENGTH
// FIXES [object Object]
// ============================================================

function formatStudentStrength(strength) {

    if (
        strength === null ||
        strength === undefined
    ) {
        return "";
    }


    // --------------------------------------------------------
    // STRING OR NUMBER
    // --------------------------------------------------------

    if (
        typeof strength === "string" ||
        typeof strength === "number"
    ) {

        return String(strength);

    }


    // --------------------------------------------------------
    // OBJECT
    // --------------------------------------------------------

    if (
        typeof strength === "object"
    ) {

        /*
            The backend may return strengths in different formats.

            Example:

            {
                "strength": "Strong academic performance",
                "evidence": "CGPA is above 8"
            }

            Or:

            {
                "title": "Good attendance",
                "description": "Attendance is above 85%"
            }
        */


        const title =
            strength.strength ||
            strength.title ||
            strength.name ||
            strength.area ||
            strength.label;


        const evidence =
            strength.evidence ||
            strength.description ||
            strength.reason ||
            strength.details;


        // Title + evidence
        if (
            title &&
            evidence
        ) {

            return (
                String(title) +
                " — " +
                String(evidence)
            );

        }


        // Only title
        if (title) {

            return String(title);

        }


        // Only evidence
        if (evidence) {

            return String(evidence);

        }


        // ----------------------------------------------------
        // FALLBACK
        // ----------------------------------------------------

        try {

            const values =
                Object.values(strength)
                    .filter(
                        value =>
                            value !== null &&
                            value !== undefined &&
                            String(value).trim() !== ""
                    );


            if (values.length) {

                return values
                    .map(value => String(value))
                    .join(" — ");

            }

        } catch (error) {

            console.error(
                "Unable to format student strength:",
                error
            );

        }


        return "Strength identified";

    }


    return String(strength);

}


// ============================================================
// API HELPER
// ============================================================

async function apiFetch(url, options = {}) {

    const response =
        await fetch(
            url,
            options
        );


    if (!response.ok) {

        let message =
            `Request failed: ${response.status}`;


        try {

            const data =
                await response.json();


            if (data.detail) {

                message =
                    data.detail;

            }

        } catch (error) {

            // Ignore invalid JSON.

        }


        throw new Error(
            message
        );

    }


    return response;

}


// ============================================================
// LOAD DASHBOARD SUMMARY
// ============================================================

async function loadSummary() {

    try {

        const response =
            await apiFetch(
                "/api/summary"
            );


        const data =
            await response.json();


        if (getElement("totalStudents")) {

            getElement(
                "totalStudents"
            ).textContent =
                safeNumber(
                    data.total_students
                );

        }


        if (getElement("averageScore")) {

            getElement(
                "averageScore"
            ).textContent =
                safeNumber(
                    data.average_success_score
                ).toFixed(1);

        }


        if (getElement("onTrack")) {

            getElement(
                "onTrack"
            ).textContent =
                safeNumber(
                    data.on_track
                );

        }


        if (getElement("needsAttention")) {

            getElement(
                "needsAttention"
            ).textContent =
                safeNumber(
                    data.needs_attention
                );

        }


        if (getElement("immediateSupport")) {

            getElement(
                "immediateSupport"
            ).textContent =
                safeNumber(
                    data.immediate_support
                );

        }


        if (getElement("averageCgpa")) {

            getElement(
                "averageCgpa"
            ).textContent =
                safeNumber(
                    data.average_cgpa
                ).toFixed(2);

        }


        if (getElement("averageAttendance")) {

            getElement(
                "averageAttendance"
            ).textContent =
                safeNumber(
                    data.average_attendance
                ).toFixed(1) + "%";

        }


        if (getElement("placementReady")) {

            getElement(
                "placementReady"
            ).textContent =
                safeNumber(
                    data.placement_ready
                );

        }


        const total =
            Math.max(
                safeNumber(
                    data.total_students
                ),
                1
            );


        const onTrackPercent =
            safeNumber(
                data.on_track
            ) /
            total *
            100;


        const attentionPercent =
            safeNumber(
                data.needs_attention
            ) /
            total *
            100;


        const supportPercent =
            safeNumber(
                data.immediate_support
            ) /
            total *
            100;


        setBarWidth(
            "onTrackBar",
            onTrackPercent
        );


        setBarWidth(
            "attentionBar",
            attentionPercent
        );


        setBarWidth(
            "supportBar",
            supportPercent
        );


        if (getElement("onTrackPercent")) {

            getElement(
                "onTrackPercent"
            ).textContent =
                onTrackPercent.toFixed(1) +
                "%";

        }


        if (getElement("attentionPercent")) {

            getElement(
                "attentionPercent"
            ).textContent =
                attentionPercent.toFixed(1) +
                "%";

        }


        if (getElement("supportPercent")) {

            getElement(
                "supportPercent"
            ).textContent =
                supportPercent.toFixed(1) +
                "%";

        }


        updateNotifications(
            data
        );


    } catch (error) {

        console.error(
            "Summary error:",
            error
        );

    }

}


// ============================================================
// SET BAR WIDTH
// ============================================================

function setBarWidth(
    id,
    percentage
) {

    const element =
        getElement(id);


    if (!element) {
        return;
    }


    const safePercentage =
        Math.max(
            0,
            Math.min(
                100,
                safeNumber(
                    percentage
                )
            )
        );


    element.style.width =
        safePercentage + "%";

}


// ============================================================
// LOAD STUDENT SEGMENTS
// ============================================================

async function loadSegments() {

    try {

        const response =
            await apiFetch(
                "/api/segments"
            );


        const segments =
            await response.json();


        const container =
            getElement("segments");


        if (!container) {
            return;
        }


        container.innerHTML =
            "";


        if (
            !Array.isArray(
                segments
            ) ||
            !segments.length
        ) {

            container.innerHTML = `
                <p>
                    No segmentation data available.
                </p>
            `;

            return;

        }


        segments.forEach(
            item => {

                const div =
                    document.createElement(
                        "div"
                    );


                div.className =
                    "segment-item";


                div.innerHTML = `
                    <span>
                        ${escapeHtml(
                            item.segment
                        )}
                    </span>

                    <strong>
                        ${safeNumber(
                            item.count
                        )}
                    </strong>
                `;


                container.appendChild(
                    div
                );

            }
        );


    } catch (error) {

        console.error(
            "Segments error:",
            error
        );

    }

}


// ============================================================
// LOAD DEPARTMENTS
// ============================================================

async function loadDepartments() {

    try {

        const response =
            await apiFetch(
                "/api/departments"
            );


        const departments =
            await response.json();


        const select =
            getElement(
                "departmentFilter"
            );


        if (!select) {
            return;
        }


        const previousValue =
            select.value;


        select.innerHTML =
            '<option value="All">All Departments</option>';


        departments.forEach(
            department => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    department;


                option.textContent =
                    department;


                select.appendChild(
                    option
                );

            }
        );


        if (
            departments.includes(
                previousValue
            )
        ) {

            select.value =
                previousValue;

        }


    } catch (error) {

        console.error(
            "Departments error:",
            error
        );

    }

}


// ============================================================
// LOAD STUDENTS
// ============================================================

async function loadStudents() {

    const requestId =
        ++studentLoadRequest;


    try {

        const searchElement =
            getElement("search");


        const riskElement =
            getElement("riskFilter");


        const departmentElement =
            getElement("departmentFilter");


        const search =
            searchElement
                ? searchElement.value.trim()
                : "";


        const risk =
            riskElement
                ? riskElement.value
                : "All";


        const department =
            departmentElement
                ? departmentElement.value
                : "All";


        const params =
            new URLSearchParams();


        if (search) {

            params.append(
                "search",
                search
            );

        }


        if (
            risk &&
            risk !== "All"
        ) {

            params.append(
                "risk",
                risk
            );

        }


        if (
            department &&
            department !== "All"
        ) {

            params.append(
                "department",
                department
            );

        }


        let url =
            "/api/students";


        const query =
            params.toString();


        if (query) {

            url +=
                "?" +
                query;

        }


        const response =
            await apiFetch(
                url
            );


        const students =
            await response.json();


        if (
            requestId !==
            studentLoadRequest
        ) {

            return;

        }


        currentStudents =
            Array.isArray(
                students
            )
                ? students
                : [];


        renderStudentTable(
            currentStudents
        );


    } catch (error) {

        console.error(
            "Students error:",
            error
        );


        renderTableError();

    }

}


// ============================================================
// RENDER STUDENT TABLE
// ============================================================

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


    table.innerHTML =
        "";


    if (
        !Array.isArray(
            students
        ) ||
        !students.length
    ) {

        table.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:35px;
                        color:#64748b;
                    "
                >
                    No students found for the selected filters.
                </td>
            </tr>
        `;

        return;

    }


    students.forEach(
        student => {

            const row =
                document.createElement(
                    "tr"
                );


            row.style.cursor =
                "pointer";


            const studentCell =
                document.createElement(
                    "td"
                );


            studentCell.innerHTML = `
                <strong>
                    ${escapeHtml(
                        student.student_id
                    )}
                </strong>

                <br>

                <small>
                    ${escapeHtml(
                        student.name
                    )}
                </small>
            `;


            const departmentCell =
                document.createElement(
                    "td"
                );


            departmentCell.textContent =
                student.department ||
                "-";


            const cgpaCell =
                document.createElement(
                    "td"
                );


            cgpaCell.textContent =
                safeNumber(
                    student.cgpa
                ).toFixed(2);


            const attendanceCell =
                document.createElement(
                    "td"
                );


            attendanceCell.textContent =
                safeNumber(
                    student.attendance
                ).toFixed(1) +
                "%";


            const scoreCell =
                document.createElement(
                    "td"
                );


            const score =
                safeNumber(
                    student.success_score
                );


            scoreCell.innerHTML = `
                <strong>
                    ${score.toFixed(1)}
                </strong>
            `;


            const riskCell =
                document.createElement(
                    "td"
                );


            const riskBadge =
                document.createElement(
                    "span"
                );


            riskBadge.className =
                "risk-badge " +
                getRiskClass(
                    student.risk_level
                );


            riskBadge.textContent =
                student.risk_level ||
                "-";


            riskCell.appendChild(
                riskBadge
            );


            const segmentCell =
                document.createElement(
                    "td"
                );


            segmentCell.textContent =
                student.segment ||
                "-";


            const actionCell =
                document.createElement(
                    "td"
                );


            const viewButton =
                document.createElement(
                    "button"
                );


            viewButton.type =
                "button";


            viewButton.className =
                "outline-button";


            viewButton.textContent =
                "View";


            viewButton.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    loadStudentProfile(
                        student.student_id
                    );

                }
            );


            actionCell.appendChild(
                viewButton
            );


            row.appendChild(
                studentCell
            );


            row.appendChild(
                departmentCell
            );


            row.appendChild(
                cgpaCell
            );


            row.appendChild(
                attendanceCell
            );


            row.appendChild(
                scoreCell
            );


            row.appendChild(
                riskCell
            );


            row.appendChild(
                segmentCell
            );


            row.appendChild(
                actionCell
            );


            row.addEventListener(
                "click",
                () => {

                    loadStudentProfile(
                        student.student_id
                    );

                }
            );


            table.appendChild(
                row
            );

        }
    );

}


// ============================================================
// TABLE ERROR
// ============================================================

function renderTableError() {

    const table =
        getElement(
            "studentTable"
        );


    if (!table) {
        return;
    }


    table.innerHTML = `
        <tr>
            <td
                colspan="8"
                style="
                    text-align:center;
                    padding:35px;
                    color:#dc2626;
                "
            >
                Unable to load student data.
                Please refresh the dashboard.
            </td>
        </tr>
    `;

}


// ============================================================
// RISK CSS CLASS
// ============================================================

function getRiskClass(
    risk
) {

    if (
        risk === "On Track"
    ) {

        return "risk-on-track";

    }


    if (
        risk === "Needs Attention"
    ) {

        return "risk-needs-attention";

    }


    if (
        risk === "Immediate Support"
    ) {

        return "risk-immediate-support";

    }


    return "";

}


// ============================================================
// PRIORITY CSS CLASS
// ============================================================

function getPriorityClass(
    priority
) {

    if (
        priority === "Critical"
    ) {

        return "priority-critical";

    }


    if (
        priority === "High"
    ) {

        return "priority-high";

    }


    if (
        priority === "Normal"
    ) {

        return "priority-normal";

    }


    return "";

}


// ============================================================
// DISPLAY AI RECOMMENDATION + STUDENT STRENGTHS
// ============================================================

function displayRecommendation(
    recommendation
) {

    const priorityElement =
        getElement(
            "recommendationPriority"
        );


    const overallElement =
        getElement(
            "overallRecommendation"
        );


    const actionsElement =
        getElement(
            "recommendedActions"
        );


    if (
        !priorityElement ||
        !overallElement ||
        !actionsElement
    ) {

        return;

    }


    priorityElement.textContent =
        "";


    priorityElement.className =
        "priority-badge";


    overallElement.textContent =
        "";


    actionsElement.innerHTML =
        "";


    if (!recommendation) {

        overallElement.textContent =
            "No intervention recommendation is currently available.";

        return;

    }


    const priority =
        recommendation.priority ||
        "Normal";


    priorityElement.textContent =
        priority;


    priorityElement.className =
        "priority-badge " +
        getPriorityClass(
            priority
        );


    overallElement.textContent =
        recommendation.overall_recommendation ||
        "";


    // --------------------------------------------------------
    // RECOMMENDED ACTIONS
    // --------------------------------------------------------

    const actions =
        Array.isArray(
            recommendation.recommended_actions
        )
            ? recommendation.recommended_actions
            : [];


    actions.forEach(
        action => {

            const li =
                document.createElement(
                    "li"
                );


            li.textContent =
                action;


            actionsElement.appendChild(
                li
            );

        }
    );


    // --------------------------------------------------------
    // STUDENT STRENGTHS
    // --------------------------------------------------------

    const strengths =
        Array.isArray(
            recommendation.student_strengths
        )
            ? recommendation.student_strengths
            : [];


    if (strengths.length) {

        const heading =
            document.createElement(
                "li"
            );


        heading.innerHTML =
            "<strong>Student Strengths</strong>";


        heading.style.listStyle =
            "none";


        heading.style.marginTop =
            "12px";


        actionsElement.appendChild(
            heading
        );


        strengths.forEach(
            strength => {

                const formattedStrength =
                    formatStudentStrength(
                        strength
                    );


                if (!formattedStrength) {
                    return;
                }


                const li =
                    document.createElement(
                        "li"
                    );


                li.textContent =
                    formattedStrength;


                li.style.marginLeft =
                    "12px";


                actionsElement.appendChild(
                    li
                );

            }
        );

    }


    if (
        !actions.length &&
        !strengths.length
    ) {

        const li =
            document.createElement(
                "li"
            );


        li.textContent =
            "Continue regular monitoring and student support.";


        actionsElement.appendChild(
            li
        );

    }

}


// ============================================================
// LOAD INDIVIDUAL STUDENT PROFILE
// ============================================================

async function loadStudentProfile(
    studentId
) {

    if (!studentId) {
        return;
    }


    try {

        const response =
            await apiFetch(
                "/api/student/" +
                encodeURIComponent(
                    studentId
                )
            );


        const student =
            await response.json();


        activeStudent =
            student;


        fillStudentProfile(
            student
        );


        await loadFacultyNotes(
            student.student_id
        );


        const overlay =
            getElement(
                "profileOverlay"
            );


        if (overlay) {

            overlay.classList.remove(
                "hidden"
            );

        } else {

            const profile =
                getElement(
                    "profile"
                );


            if (profile) {

                profile.classList.remove(
                    "hidden"
                );


                profile.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }

        }


    } catch (error) {

        console.error(
            "Student profile error:",
            error
        );


        alert(
            "Unable to load student profile."
        );

    }

}


// ============================================================
// FILL STUDENT PROFILE
// ============================================================

function fillStudentProfile(
    student
) {

    if (
        getElement("profileName")
    ) {

        getElement(
            "profileName"
        ).textContent =
            student.name ||
            "Student";

    }


    if (
        getElement("profileId")
    ) {

        getElement(
            "profileId"
        ).textContent =
            `${student.student_id || ""} • ` +
            `${student.department || ""} • ` +
            `Year ${student.year || "-"}`;

    }


    const profileRisk =
        getElement(
            "profileRisk"
        );


    if (profileRisk) {

        profileRisk.textContent =
            student.risk_level ||
            "Unknown";


        profileRisk.className =
            "risk-badge " +
            getRiskClass(
                student.risk_level
            );

    }


    if (
        getElement("profileScore")
    ) {

        getElement(
            "profileScore"
        ).textContent =
            safeNumber(
                student.success_score
            ).toFixed(1);

    }


    if (
        getElement("profileSegment")
    ) {

        getElement(
            "profileSegment"
        ).textContent =
            student.segment ||
            "-";

    }


    if (
        getElement("profilePlacement")
    ) {

        getElement(
            "profilePlacement"
        ).textContent =
            student.placement_outcome ||
            "-";

    }


    displayRecommendation(
        student.recommendation
    );


    // --------------------------------------------------------
    // RISK REASONS
    // --------------------------------------------------------

    const riskReasons =
        getElement(
            "riskReasons"
        );


    if (riskReasons) {

        riskReasons.innerHTML =
            "";


        const reasons =
            Array.isArray(
                student.risk_reasons
            )
                ? student.risk_reasons
                : [];


        const validReasons =
            reasons.filter(
                reason =>
                    reason &&
                    String(
                        reason
                    ).trim() !== ""
            );


        if (!validReasons.length) {

            riskReasons.innerHTML =
                "<li>No major risk factors detected.</li>";

        } else {

            validReasons.forEach(
                reason => {

                    const li =
                        document.createElement(
                            "li"
                        );


                    li.textContent =
                        reason;


                    riskReasons.appendChild(
                        li
                    );

                }
            );

        }

    }


    // --------------------------------------------------------
    // SCORE EXPLANATION
    // --------------------------------------------------------

    const explanation =
        getElement(
            "scoreExplanation"
        );


    if (explanation) {

        explanation.innerHTML =
            "";


        const explanationData =
            Array.isArray(
                student.score_explanation
            )
                ? student.score_explanation
                : [];


        explanationData.forEach(
            item => {

                const div =
                    document.createElement(
                        "div"
                    );


                div.className =
                    "explanation-item";


                div.innerHTML = `

                    <div>

                        <strong>
                            ${escapeHtml(
                                item.indicator
                            )}
                        </strong>

                        <br>

                        <span>
                            Value:
                            ${safeNumber(
                                item.value
                            ).toFixed(1)}
                        </span>

                    </div>

                    <span class="importance">
                        ${escapeHtml(
                            item.importance
                        )}
                    </span>

                `;


                explanation.appendChild(
                    div
                );

            }
        );

    }


    // --------------------------------------------------------
    // ACADEMIC
    // --------------------------------------------------------

    const academic =
        getElement(
            "academic"
        );


    if (academic) {

        const academicData =
            student.academic ||
            {};


        const lms =
            student.lms ||
            {};


        academic.innerHTML = `

            <strong>CGPA:</strong>
            ${safeNumber(
                academicData.cgpa
            ).toFixed(2)}

            <br>

            <strong>Backlogs:</strong>
            ${safeNumber(
                academicData.backlogs
            )}

            <br>

            <strong>Subject Performance:</strong>
            ${safeNumber(
                academicData.subject_performance
            ).toFixed(1)}%

            <br><br>

            <strong>Attendance:</strong>
            ${safeNumber(
                student.attendance
            ).toFixed(1)}%

            <br>

            <strong>LMS Login Frequency:</strong>
            ${safeNumber(
                lms.login_frequency
            ).toFixed(1)}

            <br>

            <strong>Assignment Completion:</strong>
            ${safeNumber(
                lms.assignment_completion
            ).toFixed(1)}%

        `;

    }


    // --------------------------------------------------------
    // PLACEMENT
    // --------------------------------------------------------

    const placement =
        getElement(
            "placement"
        );


    if (placement) {

        const placementData =
            student.placement ||
            {};


        const skills =
            student.skills ||
            {};


        placement.innerHTML = `

            <strong>Outcome:</strong>
            ${escapeHtml(
                student.placement_outcome
            )}

            <br><br>

            <strong>Aptitude:</strong>
            ${safeNumber(
                placementData.aptitude
            ).toFixed(1)}%

            <br>

            <strong>Coding:</strong>
            ${safeNumber(
                placementData.coding
            ).toFixed(1)}%

            <br>

            <strong>Mock Interview:</strong>
            ${safeNumber(
                placementData.mock_interview
            ).toFixed(1)}%

            <br><br>

            <strong>Technical Skill:</strong>
            ${safeNumber(
                skills.technical
            ).toFixed(1)}%

            <br>

            <strong>Soft Skill:</strong>
            ${safeNumber(
                skills.soft
            ).toFixed(1)}%

        `;

    }


    // --------------------------------------------------------
    // ENGAGEMENT
    // --------------------------------------------------------

    const engagement =
        getElement(
            "engagement"
        );


    if (engagement) {

        const engagementData =
            student.engagement ||
            {};


        const feedback =
            student.feedback ||
            {};


        engagement.innerHTML = `

            <strong>Events:</strong>
            ${safeNumber(
                engagementData.events
            )}

            <br>

            <strong>Clubs:</strong>
            ${safeNumber(
                engagementData.clubs
            )}

            <br>

            <strong>Hackathons:</strong>
            ${safeNumber(
                engagementData.hackathons
            )}

            <br>

            <strong>Certifications:</strong>
            ${safeNumber(
                engagementData.certifications
            )}

            <br><br>

            <strong>Student Satisfaction:</strong>
            ${safeNumber(
                feedback.student_satisfaction
            ).toFixed(1)}%

            <br>

            <strong>Faculty Feedback:</strong>
            ${safeNumber(
                feedback.faculty_feedback
            ).toFixed(1)}%

        `;

    }

}


// ============================================================
// FACULTY NOTES
// ============================================================

async function loadFacultyNotes(
    studentId
) {

    const notesContainer =
        getElement(
            "facultyNotes"
        );


    if (!notesContainer) {
        return;
    }


    activeStudentForNotes =
        studentId;


    try {

        const response =
            await apiFetch(
                "/api/student/" +
                encodeURIComponent(
                    studentId
                ) +
                "/notes"
            );


        const data =
            await response.json();


        setupFacultyAttachmentControls();


        renderFacultyNotes(
            data.notes || []
        );


    } catch (error) {

        console.error(
            "Faculty notes error:",
            error
        );


        notesContainer.innerHTML = `
            <p style="color:#dc2626;">
                Unable to load faculty notes.
            </p>
        `;

    }

}


// ============================================================
// CREATE ATTACHMENT CONTROLS
// ============================================================

function setupFacultyAttachmentControls() {

    const notesContainer =
        getElement(
            "facultyNotes"
        );


    if (!notesContainer) {
        return;
    }


    if (
        getElement(
            "facultyAttachmentInput"
        )
    ) {

        return;

    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.id =
        "facultyAttachmentControls";


    wrapper.style.marginBottom =
        "15px";


    wrapper.style.padding =
        "12px";


    wrapper.style.border =
        "1px solid #e5e7eb";


    wrapper.style.borderRadius =
        "8px";


    wrapper.innerHTML = `

        <div
            style="
                font-weight:600;
                margin-bottom:8px;
            "
        >
            Attach Faculty Document
        </div>

        <input
            type="file"
            id="facultyAttachmentInput"
            accept=".pdf,.docx"
            style="
                width:100%;
                margin-bottom:8px;
            "
        >

        <small
            style="
                display:block;
                color:#64748b;
                margin-bottom:8px;
            "
        >
            Optional PDF or DOCX file. Maximum size: 10 MB.
        </small>

        <button
            type="button"
            id="facultyUploadButton"
            class="outline-button"
        >
            Add Note & Attachment
        </button>

    `;


    notesContainer.prepend(
        wrapper
    );


    const uploadButton =
        getElement(
            "facultyUploadButton"
        );


    if (uploadButton) {

        uploadButton.addEventListener(
            "click",
            addFacultyNote
        );

    }

}


// ============================================================
// RENDER FACULTY NOTES
// ============================================================

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


    let notesList =
        getElement(
            "facultyNotesList"
        );


    if (!notesList) {

        notesList =
            document.createElement(
                "div"
            );


        notesList.id =
            "facultyNotesList";


        container.appendChild(
            notesList
        );

    }


    notesList.innerHTML =
        "";


    if (
        !Array.isArray(
            notes
        ) ||
        !notes.length
    ) {

        notesList.innerHTML = `
            <p style="color:#64748b;">
                No faculty notes have been added yet.
            </p>
        `;

        return;

    }


    notes.forEach(
        note => {

            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "faculty-note";


            const date =
                note.created_at
                    ? new Date(
                        note.created_at
                    ).toLocaleString()
                    : "";


            let attachmentHtml =
                "";


            if (
                note.attachment_url
            ) {

                const attachmentName =
                    note.attachment_name ||
                    note.original_filename ||
                    "Attached document";


                attachmentHtml = `

                    <p
                        style="
                            margin-top:8px;
                        "
                    >

                        📎

                        <a
                            href="${escapeHtml(
                                note.attachment_url
                            )}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            ${escapeHtml(
                                attachmentName
                            )}
                        </a>

                    </p>

                `;

            }


            div.innerHTML = `

                <div>

                    <strong>
                        ${escapeHtml(
                            note.faculty_name
                        )}
                    </strong>

                    <small>
                        ${escapeHtml(
                            date
                        )}
                    </small>

                </div>

                <p>
                    ${escapeHtml(
                        note.note
                    )}
                </p>

                ${attachmentHtml}

                <button
                    type="button"
                    class="delete-note-button"
                >
                    Delete
                </button>

            `;


            const deleteButton =
                div.querySelector(
                    ".delete-note-button"
                );


            if (deleteButton) {

                deleteButton.addEventListener(
                    "click",
                    () => {

                        deleteFacultyNote(
                            note.student_id,
                            note.id
                        );

                    }
                );

            }


            notesList.appendChild(
                div
            );

        }
    );

}


// ============================================================
// ADD FACULTY NOTE + OPTIONAL FILE
// ============================================================

async function addFacultyNote() {

    if (!activeStudentForNotes) {

        alert(
            "Please select a student first."
        );

        return;

    }


    const noteInput =
        getElement(
            "facultyNoteInput"
        );


    const facultyInput =
        getElement(
            "facultyNameInput"
        );


    const attachmentInput =
        getElement(
            "facultyAttachmentInput"
        );


    if (!noteInput) {

        alert(
            "Faculty note input is not available."
        );

        return;

    }


    const note =
        noteInput.value.trim();


    const facultyName =
        facultyInput
            ? facultyInput.value.trim()
            : "Faculty";


    const file =
        attachmentInput &&
        attachmentInput.files &&
        attachmentInput.files.length
            ? attachmentInput.files[0]
            : null;


    if (!note) {

        alert(
            "Please write a note first."
        );

        return;

    }


    if (file) {

        const allowed =
            [
                ".pdf",
                ".docx"
            ];


        const fileName =
            file.name.toLowerCase();


        const valid =
            allowed.some(
                extension =>
                    fileName.endsWith(
                        extension
                    )
            );


        if (!valid) {

            alert(
                "Only PDF and DOCX files are allowed."
            );

            return;

        }


        if (
            file.size >
            10 * 1024 * 1024
        ) {

            alert(
                "The file is larger than 10 MB."
            );

            return;

        }

    }


    try {

        let response;


        // ----------------------------------------------------
        // FILE UPLOAD
        // ----------------------------------------------------

        if (file) {

            const formData =
                new FormData();


            formData.append(
                "faculty_name",
                facultyName ||
                "Faculty"
            );


            formData.append(
                "note",
                note
            );


            formData.append(
                "attachment",
                file
            );


            response =
                await apiFetch(
                    "/api/student/" +
                    encodeURIComponent(
                        activeStudentForNotes
                    ) +
                    "/notes/upload",
                    {
                        method: "POST",
                        body: formData
                    }
                );

        }


        // ----------------------------------------------------
        // NORMAL TEXT NOTE
        // ----------------------------------------------------

        else {

            response =
                await apiFetch(
                    "/api/student/" +
                    encodeURIComponent(
                        activeStudentForNotes
                    ) +
                    "/notes",
                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                student_id:
                                    activeStudentForNotes,

                                faculty_name:
                                    facultyName ||
                                    "Faculty",

                                note:
                                    note

                            })

                    }
                );

        }


        await response.json();


        noteInput.value =
            "";


        if (attachmentInput) {

            attachmentInput.value =
                "";

        }


        await loadFacultyNotes(
            activeStudentForNotes
        );


        alert(
            file
                ? "Faculty note and document added successfully."
                : "Faculty note added successfully."
        );


    } catch (error) {

        console.error(
            "Add note error:",
            error
        );


        alert(
            error.message ||
            "Unable to add faculty note."
        );

    }

}


// ============================================================
// DELETE FACULTY NOTE
// ============================================================

async function deleteFacultyNote(
    studentId,
    noteId
) {

    if (
        !confirm(
            "Delete this faculty note?"
        )
    ) {

        return;

    }


    try {

        await apiFetch(
            "/api/student/" +
            encodeURIComponent(
                studentId
            ) +
            "/notes/" +
            encodeURIComponent(
                noteId
            ),
            {
                method:
                    "DELETE"
            }
        );


        await loadFacultyNotes(
            studentId
        );


    } catch (error) {

        console.error(
            "Delete note error:",
            error
        );


        alert(
            error.message ||
            "Unable to delete note."
        );

    }

}


// ============================================================
// FILTER STUDENTS BY RISK
// ============================================================

function filterStudentsByRisk(
    risk
) {

    const riskFilter =
        getElement(
            "riskFilter"
        );


    if (!riskFilter) {
        return;
    }


    riskFilter.value =
        risk;


    const studentsSection =
        document.querySelector(
            ".students-section"
        );


    loadStudents();


    if (studentsSection) {

        studentsSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

}


// ============================================================
// CLEAR STUDENT FILTERS
// ============================================================

function clearStudentFilters() {

    const search =
        getElement(
            "search"
        );


    const risk =
        getElement(
            "riskFilter"
        );


    const department =
        getElement(
            "departmentFilter"
        );


    if (search) {

        search.value =
            "";

    }


    if (risk) {

        risk.value =
            "All";

    }


    if (department) {

        department.value =
            "All";

    }


    loadStudents();

}


// ============================================================
// CLOSE STUDENT PROFILE
// ============================================================

function closeStudentProfile() {

    const overlay =
        getElement(
            "profileOverlay"
        );


    if (overlay) {

        overlay.classList.add(
            "hidden"
        );

    }


    const profile =
        getElement(
            "profile"
        );


    if (
        profile &&
        !overlay
    ) {

        profile.classList.add(
            "hidden"
        );

    }


    activeStudent =
        null;

}


// ============================================================
// PROFILE OVERLAY
// ============================================================

function handleProfileOverlayClick(
    event
) {

    const overlay =
        getElement(
            "profileOverlay"
        );


    if (!overlay) {
        return;
    }


    if (
        event.target ===
        overlay
    ) {

        closeStudentProfile();

    }

}


// ============================================================
// NOTIFICATIONS
// ============================================================

function toggleNotifications() {

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


function closeNotifications() {

    const panel =
        getElement(
            "notificationPanel"
        );


    if (panel) {

        panel.classList.add(
            "hidden"
        );

    }

}


// ============================================================
// UPDATE NOTIFICATIONS
// ============================================================

function updateNotifications(
    summary
) {

    const critical =
        document.querySelector(
            ".notification-item.critical p"
        );


    const warning =
        document.querySelector(
            ".notification-item.warning p"
        );


    const success =
        document.querySelector(
            ".notification-item.success p"
        );


    if (critical) {

        critical.textContent =
            `${safeNumber(
                summary.immediate_support
            )} students require priority intervention.`;

    }


    if (warning) {

        warning.textContent =
            `${safeNumber(
                summary.needs_attention
            )} students have indicators requiring monitoring.`;

    }


    if (success) {

        success.textContent =
            `${safeNumber(
                summary.on_track
            )} students are currently on track.`;

    }

}


// ============================================================
// AI MENTOR
// ============================================================

function openAIMentor() {

    const mentor =
        getElement(
            "aiMentor"
        );


    if (!mentor) {
        return;
    }


    mentor.classList.remove(
        "hidden"
    );


    const input =
        getElement(
            "aiMentorInput"
        );


    if (input) {

        setTimeout(
            () =>
                input.focus(),
            100
        );

    }

}


function closeAIMentor() {

    const mentor =
        getElement(
            "aiMentor"
        );


    if (mentor) {

        mentor.classList.add(
            "hidden"
        );

    }

}


// ============================================================
// AI MENTOR QUICK QUESTION
// ============================================================

function askAIMentor(
    question
) {

    if (!question) {
        return;
    }


    openAIMentor();


    addUserChatMessage(
        question
    );


    setTimeout(
        () => {

            sendAIMentorMessage(
                question,
                true
            );

        },
        350
    );

}


// ============================================================
// AI MENTOR KEYBOARD
// ============================================================

function handleMentorKey(
    event
) {

    if (
        event.key ===
        "Enter"
    ) {

        event.preventDefault();

        sendAIMentorMessage();

    }

}


// ============================================================
// SEND AI MENTOR MESSAGE
// ============================================================

async function sendAIMentorMessage(
    predefinedMessage = null,
    isPredefined = false
) {

    const input =
        getElement(
            "aiMentorInput"
        );


    let message =
        predefinedMessage;


    if (
        !message &&
        input
    ) {

        message =
            input.value.trim();

    }


    if (!message) {
        return;
    }


    if (!isPredefined) {

        addUserChatMessage(
            message
        );

    }


    if (input) {

        input.value =
            "";

    }


    const loadingId =
        addTypingMessage();


    try {

        const answer =
            await generateAIMentorResponse(
                message
            );


        removeChatMessage(
            loadingId
        );


        addAIChatMessage(
            answer
        );


    } catch (error) {

        console.error(
            "AI Mentor error:",
            error
        );


        removeChatMessage(
            loadingId
        );


        addAIChatMessage(`

            <strong>
                AI Mentor
            </strong>

            <p>
                I couldn't analyze the student data right now.
                Please try again.
            </p>

        `);

    }

}


// ============================================================
// AI MENTOR DATA ANALYSIS
// ============================================================

async function generateAIMentorResponse(
    message
) {

    const normalized =
        message
            .toLowerCase()
            .trim();


    if (
        normalized.includes(
            "help"
        ) ||
        normalized.includes(
            "what can you do"
        ) ||
        normalized.includes(
            "what can i ask"
        )
    ) {

        return `

            <strong>
                AI Mentor Capabilities
            </strong>

            <p>
                I can analyze the student-success data and help faculty
                make intervention decisions.
            </p>

            <p>
                <b>
                    I can answer questions about:
                </b>
            </p>

            <p>
                • Immediate support students<br>
                • Students needing attention<br>
                • On-track students<br>
                • Placement risk<br>
                • High performers<br>
                • Department risk<br>
                • Success score<br>
                • Attendance<br>
                • Student profiles<br>
                • Student strengths<br>
                • Intervention strategies
            </p>

            <p>
                Try:
                <b>
                    "Which department has the highest risk?"
                </b>
            </p>

        `;

    }


    const students =
        await fetchAllStudents();


    const matchingStudents =
        findStudentsFromQuery(
            normalized,
            students
        );


    if (
        matchingStudents.length
    ) {

        return createStudentAnalysis(
            matchingStudents[0]
        );

    }


    if (
        normalized.includes(
            "immediate"
        ) ||
        normalized.includes(
            "critical"
        ) ||
        normalized.includes(
            "urgent"
        ) ||
        normalized.includes(
            "highest priority"
        )
    ) {

        const riskStudents =
            students.filter(
                student =>
                    student.risk_level ===
                    "Immediate Support"
            );


        return `

            <strong>
                Immediate Support Students
            </strong>

            <p>
                I found
                <b>
                    ${riskStudents.length}
                </b>
                students who currently require immediate support.
            </p>

            ${createStudentPreview(
                riskStudents,
                5
            )}

            <p>
                <b>
                    Recommended action:
                </b>
                assign faculty mentors, create individual recovery
                plans and monitor progress closely.
            </p>

        `;

    }


    if (
        normalized.includes(
            "needs attention"
        ) ||
        normalized.includes(
            "attention"
        ) ||
        normalized.includes(
            "at risk"
        ) ||
        normalized.includes(
            "risk students"
        )
    ) {

        const riskStudents =
            students.filter(
                student =>
                    student.risk_level ===
                    "Needs Attention"
            );


        return `

            <strong>
                Students Needing Attention
            </strong>

            <p>
                There are
                <b>
                    ${riskStudents.length}
                </b>
                students currently classified as
                <b>
                    Needs Attention
                </b>.
            </p>

            ${createStudentPreview(
                riskStudents,
                5
            )}

            <p>
                These students should receive early intervention
                before their risk increases.
            </p>

        `;

    }


    if (
        normalized.includes(
            "on track"
        ) ||
        normalized.includes(
            "doing well"
        ) ||
        normalized.includes(
            "performing well"
        )
    ) {

        const onTrack =
            students.filter(
                student =>
                    student.risk_level ===
                    "On Track"
            );


        return `

            <strong>
                Students On Track
            </strong>

            <p>
                <b>
                    ${onTrack.length}
                </b>
                students are currently classified as
                <b>
                    On Track
                </b>.
            </p>

            ${createStudentPreview(
                onTrack,
                5
            )}

            <p>
                These students can be encouraged through advanced
                projects, certifications, hackathons and leadership
                opportunities.
            </p>

        `;

    }


    if (
        normalized.includes(
            "placement risk"
        ) ||
        normalized.includes(
            "placement"
        ) ||
        normalized.includes(
            "job ready"
        ) ||
        normalized.includes(
            "career"
        )
    ) {

        const placementRisk =
            students.filter(
                student =>
                    student.segment ===
                    "Academic Strong / Placement Risk"
            );


        return `

            <strong>
                Placement Risk Analysis
            </strong>

            <p>
                I identified
                <b>
                    ${placementRisk.length}
                </b>
                students in the
                <b>
                    Academic Strong / Placement Risk
                </b>
                segment.
            </p>

            ${createStudentPreview(
                placementRisk,
                5
            )}

            <p>
                These students are academically strong but need
                focused coding, aptitude and interview preparation.
            </p>

        `;

    }


    if (
        normalized.includes(
            "high performer"
        ) ||
        normalized.includes(
            "top performer"
        ) ||
        normalized.includes(
            "best students"
        ) ||
        normalized.includes(
            "top students"
        )
    ) {

        const performers =
            students
                .filter(
                    student =>
                        student.segment ===
                        "High Performer"
                )
                .sort(
                    (a, b) =>
                        safeNumber(
                            b.success_score
                        ) -
                        safeNumber(
                            a.success_score
                        )
                );


        return `

            <strong>
                High Performer Analysis
            </strong>

            <p>
                There are
                <b>
                    ${performers.length}
                </b>
                students classified as
                <b>
                    High Performers
                </b>.
            </p>

            ${createStudentPreview(
                performers,
                5
            )}

            <p>
                Consider assigning advanced projects, hackathons,
                certifications and leadership opportunities.
            </p>

        `;

    }


    if (
        normalized.includes(
            "department"
        ) ||
        normalized.includes(
            "highest risk"
        ) ||
        normalized.includes(
            "which department"
        ) ||
        normalized.includes(
            "department risk"
        )
    ) {

        return createDepartmentAnalysis(
            students
        );

    }


    if (
        normalized.includes(
            "intervene"
        ) ||
        normalized.includes(
            "intervention"
        ) ||
        normalized.includes(
            "how should"
        ) ||
        normalized.includes(
            "what should faculty"
        ) ||
        normalized.includes(
            "what should i do"
        )
    ) {

        return `

            <strong>
                Recommended Intervention Strategy
            </strong>

            <p>
                The platform recommends a tiered intervention model:
            </p>

            <p>
                <b>
                    1. Immediate Support
                </b>
                <br>
                Assign a faculty mentor, create an individual recovery
                plan and monitor progress closely.
            </p>

            <p>
                <b>
                    2. Needs Attention
                </b>
                <br>
                Address specific risk factors such as attendance,
                assignments, coding, aptitude or interview readiness.
            </p>

            <p>
                <b>
                    3. Placement Risk
                </b>
                <br>
                Focus on aptitude, coding and interview preparation
                while maintaining academic performance.
            </p>

            <p>
                <b>
                    4. High Performers
                </b>
                <br>
                Provide advanced projects, certifications, hackathons
                and leadership opportunities.
            </p>

        `;

    }


    if (
        normalized.includes(
            "success score"
        ) ||
        normalized.includes(
            "score"
        ) ||
        normalized.includes(
            "student health"
        )
    ) {

        const summary =
            await fetchSummaryData();


        return `

            <strong>
                Student Success Score
            </strong>

            <p>
                The current average Student Success Score is
                <b>
                    ${safeNumber(
                        summary.average_success_score
                    ).toFixed(1)}
                    / 100
                </b>.
            </p>

            <p>
                The score combines academic performance, attendance,
                LMS activity, engagement, placement readiness,
                skills and feedback indicators.
            </p>

            <p>
                A lower score indicates that the student may require
                stronger academic, engagement or placement support.
            </p>

        `;

    }


    if (
        normalized.includes(
            "attendance"
        ) ||
        normalized.includes(
            "absent"
        )
    ) {

        const summary =
            await fetchSummaryData();


        const lowAttendance =
            students
                .filter(
                    student =>
                        safeNumber(
                            student.attendance
                        ) < 60
                )
                .sort(
                    (a, b) =>
                        safeNumber(
                            a.attendance
                        ) -
                        safeNumber(
                            b.attendance
                        )
                );


        return `

            <strong>
                Attendance Analysis
            </strong>

            <p>
                Current average attendance:
                <b>
                    ${safeNumber(
                        summary.average_attendance
                    ).toFixed(1)}%
                </b>.
            </p>

            <p>
                <b>
                    ${lowAttendance.length}
                </b>
                students have attendance below 60%.
            </p>

            ${createStudentPreview(
                lowAttendance,
                5
            )}

            <p>
                Recommended action: attendance counselling,
                weekly monitoring and mentor follow-up.
            </p>

        `;

    }


    if (
        normalized.includes(
            "cgpa"
        ) ||
        normalized.includes(
            "academic performance"
        ) ||
        normalized.includes(
            "academics"
        )
    ) {

        const sorted =
            [...students]
                .sort(
                    (a, b) =>
                        safeNumber(
                            b.cgpa
                        ) -
                        safeNumber(
                            a.cgpa
                        )
                );


        const average =
            students.length
                ? students.reduce(
                    (
                        sum,
                        student
                    ) =>
                        sum +
                        safeNumber(
                            student.cgpa
                        ),
                    0
                ) /
                students.length
                : 0;


        return `

            <strong>
                Academic Performance
            </strong>

            <p>
                Average CGPA:
                <b>
                    ${average.toFixed(2)}
                </b>.
            </p>

            <p>
                Highest CGPA students:
            </p>

            ${createStudentPreview(
                sorted,
                5
            )}

            <p>
                Students with low CGPA should receive academic
                mentoring and subject-specific support.
            </p>

        `;

    }


    if (
        normalized.includes(
            "segment"
        ) ||
        normalized.includes(
            "segmentation"
        )
    ) {

        return createSegmentAnalysis(
            students
        );

    }


    return `

        <strong>
            AI Mentor
        </strong>

        <p>
            I can analyze the student-success data for you.
        </p>

        <p>
            Try asking:
        </p>

        <p>

            <b>
                "Which students need immediate support?"
            </b>

            <br><br>

            <b>
                "Which department has the highest risk?"
            </b>

            <br><br>

            <b>
                "Show placement risk students."
            </b>

            <br><br>

            <b>
                "What is the average attendance?"
            </b>

            <br><br>

            <b>
                "Show high performers."
            </b>

        </p>

    `;

}


// ============================================================
// FIND STUDENT FROM QUERY
// ============================================================

function findStudentsFromQuery(
    query,
    students
) {

    if (
        !query ||
        !students ||
        !students.length
    ) {

        return [];

    }


    return students.filter(
        student => {

            const id =
                String(
                    student.student_id ||
                    ""
                ).toLowerCase();


            const name =
                String(
                    student.name ||
                    ""
                ).toLowerCase();


            return (
                query.includes(id) ||
                (
                    name.length >= 3 &&
                    query.includes(name)
                )
            );

        }
    );

}


// ============================================================
// CREATE INDIVIDUAL STUDENT ANALYSIS
// ============================================================

function createStudentAnalysis(
    student
) {

    const score =
        safeNumber(
            student.success_score
        );


    let recommendation =
        "";


    if (
        student.risk_level ===
        "Immediate Support"
    ) {

        recommendation =
            "Immediate faculty intervention is recommended.";

    } else if (
        student.risk_level ===
        "Needs Attention"
    ) {

        recommendation =
            "Early intervention and regular mentor monitoring are recommended.";

    } else {

        recommendation =
            "The student is currently on track. Continue monitoring and provide growth opportunities.";

    }


    const strengths =
        student.recommendation &&
        Array.isArray(
            student.recommendation.student_strengths
        )
            ? student.recommendation.student_strengths
            : [];


    let strengthsHtml =
        "";


    if (
        strengths.length
    ) {

        strengthsHtml = `

            <p>
                <b>
                    Student Strengths:
                </b>
            </p>

            <ul>

                ${strengths.map(
                    strength => {

                        const formatted =
                            formatStudentStrength(
                                strength
                            );


                        return `
                            <li>
                                ${escapeHtml(
                                    formatted
                                )}
                            </li>
                        `;

                    }
                ).join("")}

            </ul>

        `;

    }


    return `

        <strong>
            Student Analysis
        </strong>

        <p>
            <b>
                ${escapeHtml(
                    student.name
                )}
            </b>

            (
                ${escapeHtml(
                    student.student_id
                )}
            )
        </p>

        <p>
            Department:
            <b>
                ${escapeHtml(
                    student.department
                )}
            </b>
        </p>

        <p>
            Success Score:
            <b>
                ${score.toFixed(1)}/100
            </b>
        </p>

        <p>
            Risk:
            <b>
                ${escapeHtml(
                    student.risk_level
                )}
            </b>
        </p>

        <p>
            Segment:
            <b>
                ${escapeHtml(
                    student.segment
                )}
            </b>
        </p>

        <p>
            CGPA:
            <b>
                ${safeNumber(
                    student.cgpa
                ).toFixed(2)}
            </b>

            |

            Attendance:
            <b>
                ${safeNumber(
                    student.attendance
                ).toFixed(1)}%
            </b>
        </p>

        ${strengthsHtml}

        <p>
            <b>
                Recommendation:
            </b>

            ${recommendation}
        </p>

    `;

}


// ============================================================
// FETCH ALL STUDENTS
// ============================================================

async function fetchAllStudents() {

    const response =
        await apiFetch(
            "/api/students"
        );


    return await response.json();

}


// ============================================================
// FETCH STUDENTS BY RISK
// ============================================================

async function fetchStudentsByRisk(
    risk
) {

    const response =
        await apiFetch(
            "/api/students?risk=" +
            encodeURIComponent(
                risk
            )
        );


    return await response.json();

}


// ============================================================
// FETCH SUMMARY
// ============================================================

async function fetchSummaryData() {

    const response =
        await apiFetch(
            "/api/summary"
        );


    return await response.json();

}


// ============================================================
// CREATE STUDENT PREVIEW
// ============================================================

function createStudentPreview(
    students,
    limit = 5
) {

    if (
        !students ||
        !students.length
    ) {

        return `

            <p>
                No matching students were found.
            </p>

        `;

    }


    const selected =
        students.slice(
            0,
            limit
        );


    let html = `

        <div
            style="
                margin:10px 0;
                border-top:1px solid #e5e7eb;
            "
        >

    `;


    selected.forEach(
        student => {

            html += `

                <div
                    style="
                        padding:8px 0;
                        border-bottom:1px solid #e5e7eb;
                        cursor:pointer;
                    "
                    onclick="loadStudentProfile('${escapeHtml(
                        student.student_id
                    )}')"
                >

                    <b>
                        ${escapeHtml(
                            student.student_id
                        )}
                    </b>

                    -

                    ${escapeHtml(
                        student.name
                    )}

                    <br>

                    <small>

                        Score:
                        ${safeNumber(
                            student.success_score
                        ).toFixed(1)}

                        |

                        ${escapeHtml(
                            student.department
                        )}

                        |

                        ${escapeHtml(
                            student.risk_level
                        )}

                    </small>

                </div>

            `;

        }
    );


    html += `
        </div>
    `;


    if (
        students.length >
        limit
    ) {

        html += `

            <small>

                Showing ${limit} of
                ${students.length} matching students.
                Use the dashboard filters to view the complete list.

            </small>

        `;

    }


    return html;

}


// ============================================================
// DEPARTMENT STATISTICS
// ============================================================

function calculateDepartmentStats(
    students
) {

    const map = {};


    students.forEach(
        student => {

            const department =
                student.department ||
                "Unknown";


            if (
                !map[department]
            ) {

                map[department] = {

                    department:
                        department,

                    total:
                        0,

                    riskCount:
                        0,

                    immediate:
                        0,

                    needsAttention:
                        0,

                    scoreTotal:
                        0,

                    attendanceTotal:
                        0,

                    placementReady:
                        0

                };

            }


            map[department].total++;


            map[department].scoreTotal +=
                safeNumber(
                    student.success_score
                );


            map[department].attendanceTotal +=
                safeNumber(
                    student.attendance
                );


            if (
                student.risk_level ===
                "Immediate Support"
            ) {

                map[department].riskCount++;

                map[department].immediate++;

            }


            if (
                student.risk_level ===
                "Needs Attention"
            ) {

                map[department].riskCount++;

                map[department].needsAttention++;

            }


            if (
                student.placement_outcome ===
                "Ready"
            ) {

                map[department].placementReady++;

            }

        }
    );


    return Object.values(
        map
    ).map(
        item => {

            return {

                department:
                    item.department,

                total:
                    item.total,

                riskCount:
                    item.riskCount,

                immediate:
                    item.immediate,

                needsAttention:
                    item.needsAttention,

                riskPercentage:
                    item.total
                        ? item.riskCount /
                          item.total *
                          100
                        : 0,

                averageScore:
                    item.total
                        ? item.scoreTotal /
                          item.total
                        : 0,

                averageAttendance:
                    item.total
                        ? item.attendanceTotal /
                          item.total
                        : 0,

                placementReady:
                    item.placementReady

            };

        }
    );

}


// ============================================================
// DEPARTMENT ANALYSIS
// ============================================================

function createDepartmentAnalysis(
    students
) {

    const stats =
        calculateDepartmentStats(
            students
        );


    const sorted =
        stats.sort(
            (a, b) =>
                b.riskPercentage -
                a.riskPercentage
        );


    let html = `

        <strong>
            Department Risk Analysis
        </strong>

        <p>
            Departments ranked by the percentage of students
            requiring intervention:
        </p>

        <div>

    `;


    sorted.forEach(
        item => {

            html += `

                <div
                    style="
                        padding:8px 0;
                        border-bottom:1px solid #e5e7eb;
                    "
                >

                    <b>
                        ${escapeHtml(
                            item.department
                        )}
                    </b>

                    <br>

                    <small>

                        Risk:
                        ${item.riskCount}/${item.total}
                        (${item.riskPercentage.toFixed(1)}%)

                        |

                        Avg Score:
                        ${item.averageScore.toFixed(1)}

                        |

                        Placement Ready:
                        ${item.placementReady}

                    </small>

                </div>

            `;

        }
    );


    html += `
        </div>
    `;


    if (
        sorted.length
    ) {

        html += `

            <p>

                <b>
                    Highest risk department:
                </b>

                ${escapeHtml(
                    sorted[0].department
                )}

                with

                ${sorted[0].riskPercentage.toFixed(1)}%

                of students requiring intervention.

            </p>

        `;

    }


    return html;

}


// ============================================================
// SEGMENT ANALYSIS
// ============================================================

function createSegmentAnalysis(
    students
) {

    const map = {};


    students.forEach(
        student => {

            const segment =
                student.segment ||
                "Developing";


            if (
                !map[segment]
            ) {

                map[segment] = {

                    segment:
                        segment,

                    count:
                        0

                };

            }


            map[segment].count++;

        }
    );


    const segments =
        Object.values(
            map
        ).sort(
            (a, b) =>
                b.count -
                a.count
        );


    let html = `

        <strong>
            Student Segmentation
        </strong>

        <p>
            The current student population is divided into
            the following AI-oriented segments:
        </p>

    `;


    segments.forEach(
        item => {

            html += `

                <p>

                    <b>
                        ${escapeHtml(
                            item.segment
                        )}
                    </b>:

                    ${item.count} students

                </p>

            `;

        }
    );


    return html;

}


// ============================================================
// AI CHAT HELPERS
// ============================================================

function getChatContainer() {

    return (
        getElement(
            "aiChatMessages"
        ) ||
        getElement(
            "aiMentorMessages"
        )
    );

}


function addUserChatMessage(
    message
) {

    const container =
        getChatContainer();


    if (!container) {
        return;
    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "ai-message user-message";


    wrapper.innerHTML = `

        <div class="message-content">

            <p>
                ${escapeHtml(
                    message
                )}
            </p>

        </div>

    `;


    container.appendChild(
        wrapper
    );


    scrollChatToBottom();

}


function addAIChatMessage(
    message
) {

    const container =
        getChatContainer();


    if (!container) {
        return;
    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "ai-message";


    wrapper.innerHTML = `

        <div class="message-avatar">
            ✦
        </div>

        <div class="message-content">

            <strong>
                AI Mentor
            </strong>

            <div>
                ${message}
            </div>

        </div>

    `;


    container.appendChild(
        wrapper
    );


    scrollChatToBottom();

}


// ============================================================
// TYPING MESSAGE
// ============================================================

function addTypingMessage() {

    const container =
        getChatContainer();


    if (!container) {
        return null;
    }


    typingMessageCounter++;


    const id =
        "typing-" +
        typingMessageCounter;


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.id =
        id;


    wrapper.className =
        "ai-message";


    wrapper.innerHTML = `

        <div class="message-avatar">
            ✦
        </div>

        <div class="message-content">

            <strong>
                AI Mentor
            </strong>

            <p>
                Analyzing student data...
            </p>

        </div>

    `;


    container.appendChild(
        wrapper
    );


    scrollChatToBottom();


    return id;

}


function removeChatMessage(
    id
) {

    if (!id) {
        return;
    }


    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.remove();

    }

}


function scrollChatToBottom() {

    const container =
        getChatContainer();


    if (!container) {
        return;
    }


    container.scrollTop =
        container.scrollHeight;

}


// ============================================================
// PROFILE OVERLAY EVENTS
// ============================================================

function setupProfileOverlay() {

    const overlay =
        getElement(
            "profileOverlay"
        );


    if (!overlay) {
        return;
    }


    overlay.addEventListener(
        "click",
        handleProfileOverlayClick
    );

}


// ============================================================
// SEARCH EVENTS
// ============================================================

function setupStudentFilters() {

    /*
        The current HTML already uses:

        oninput="loadStudents()"
        onchange="loadStudents()"

        Therefore no extra listeners are attached.
    */

}


// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

function setupKeyboardShortcuts() {

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeStudentProfile();

                closeAIMentor();

                closeNotifications();

            }

        }
    );

}


// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {

    const links =
        document.querySelectorAll(
            ".nav-link"
        );


    links.forEach(
        link => {

            link.addEventListener(
                "click",
                event => {

                    const target =
                        link.getAttribute(
                            "href"
                        );


                    if (
                        !target ||
                        !target.startsWith(
                            "#"
                        )
                    ) {

                        return;

                    }


                    const section =
                        document.querySelector(
                            target
                        );


                    if (!section) {

                        return;

                    }


                    event.preventDefault();


                    section.scrollIntoView({
                        behavior:
                            "smooth",

                        block:
                            "start"
                    });


                    links.forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );


                    link.classList.add(
                        "active"
                    );

                }
            );

        }
    );

}


// ============================================================
// NOTIFICATIONS SETUP
// ============================================================

function setupNotifications() {

    const button =
        getElement(
            "notificationButton"
        );


    if (button) {

        button.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                toggleNotifications();

            }
        );

    }


    document.addEventListener(
        "click",
        event => {

            const panel =
                getElement(
                    "notificationPanel"
                );


            if (!panel) {
                return;
            }


            if (
                !panel.contains(
                    event.target
                ) &&
                !event.target.closest(
                    "#notificationButton"
                )
            ) {

                closeNotifications();

            }

        }
    );

}


// ============================================================
// AI MENTOR SETUP
// ============================================================

function setupAIMentor() {

    /*
        The current HTML already has:

        onclick="openAIMentor()"

        Therefore no additional click listener is required.
    */

}


// ============================================================
// INITIAL DASHBOARD LOADING
// ============================================================

async function initializeDashboard() {

    console.log(
        "Initializing AI Student Success Platform..."
    );


    setupStudentFilters();

    setupProfileOverlay();

    setupKeyboardShortcuts();

    setupNavigation();

    setupNotifications();

    setupAIMentor();


    await Promise.all([

        loadSummary(),

        loadSegments(),

        loadDepartments()

    ]);


    await loadStudents();


    console.log(
        "Dashboard initialized successfully."
    );

}


// ============================================================
// START APPLICATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    initializeDashboard
);