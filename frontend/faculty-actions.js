(function facultyInterventionSystem() {
    "use strict";

    // ============================================================
    // AUTH
    // ============================================================

    const TOKEN_KEYS = ["auth_token", "portal_token"];

    function getToken() {
        for (const key of TOKEN_KEYS) {
            const token = localStorage.getItem(key);
            if (token) return token;
        }
        return null;
    }

    const token = getToken();

    if (!token) {
        return;
    }

    // ============================================================
    // API HELPER
    // ============================================================

    async function api(url, options = {}) {
        const headers = {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`
        };

        if (!(options.body instanceof FormData)) {
            headers["Content-Type"] = "application/json";
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.detail ||
                data.message ||
                "Request failed"
            );
        }

        return data;
    }

    // ============================================================
    // HELPERS
    // ============================================================

    function esc(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function today() {
        return new Date().toISOString().slice(0, 10);
    }

    function formatDate(value) {
        if (!value) return "Not set";

        try {
            const date = new Date(value);

            if (Number.isNaN(date.getTime())) {
                return value;
            }

            return date.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            });
        } catch {
            return value;
        }
    }

    function number(value, decimals = 1) {
        const parsed = Number(value);

        if (Number.isNaN(parsed)) {
            return "—";
        }

        return parsed.toFixed(decimals);
    }

    // ============================================================
    // OVERLAY
    // ============================================================

    function overlay(title, body, wide = false) {
        document
            .getElementById("facultyEnhancementOverlay")
            ?.remove();

        const wrapper = document.createElement("div");

        wrapper.id = "facultyEnhancementOverlay";

        wrapper.innerHTML = `
            <div class="fov-backdrop">
                <div class="fov-card ${wide ? "fov-wide" : ""}">

                    <div class="fov-header">

                        <div>
                            <span class="fov-kicker">
                                STUDENT SUCCESS · INTERVENTION LOOP
                            </span>

                            <h2>${title}</h2>
                        </div>

                        <button
                            type="button"
                            class="fov-close"
                            id="closeFacultyEnhancement"
                        >
                            ×
                        </button>

                    </div>

                    ${body}

                </div>
            </div>
        `;

        document.body.appendChild(wrapper);

        const closeButton =
            document.getElementById("closeFacultyEnhancement");

        if (closeButton) {
            closeButton.onclick = () => {
                wrapper.remove();
            };
        }

        return wrapper;
    }

    // ============================================================
    // STYLES
    // ============================================================

    function injectStyles() {
        if (
            document.getElementById(
                "facultyInterventionStyles"
            )
        ) {
            return;
        }

        const style = document.createElement("style");

        style.id = "facultyInterventionStyles";

        style.textContent = `
            .fov-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.62);
                z-index: 10001;
                display: grid;
                place-items: center;
                padding: 18px;
                font-family:
                    Inter,
                    -apple-system,
                    BlinkMacSystemFont,
                    "Segoe UI",
                    sans-serif;
            }

            .fov-card {
                width: min(820px, 100%);
                max-height: 92vh;
                overflow-y: auto;
                background: #ffffff;
                border-radius: 20px;
                box-shadow:
                    0 30px 90px rgba(0, 0, 0, 0.28);
                padding: 24px;
                color: #172033;
            }

            .fov-wide {
                width: min(1120px, 100%);
            }

            .fov-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 18px;
                margin-bottom: 20px;
            }

            .fov-kicker {
                font-size: 9px;
                font-weight: 900;
                letter-spacing: 1.5px;
                color: #635bff;
            }

            .fov-header h2 {
                margin: 6px 0 0;
                font-size: 23px;
                line-height: 1.2;
            }

            .fov-close {
                border: 0;
                background: #f1f5f9;
                width: 38px;
                height: 38px;
                border-radius: 10px;
                font-size: 22px;
                cursor: pointer;
                color: #334155;
            }

            .fov-close:hover {
                background: #e2e8f0;
            }

            .fov-sub {
                font-size: 11px;
                color: #718096;
                line-height: 1.65;
            }

            .fov-grid {
                display: grid;
                grid-template-columns:
                    repeat(2, minmax(0, 1fr));
                gap: 12px;
            }

            .fov-grid-3 {
                display: grid;
                grid-template-columns:
                    repeat(3, minmax(0, 1fr));
                gap: 10px;
            }

            .fov-grid-4 {
                display: grid;
                grid-template-columns:
                    repeat(4, minmax(0, 1fr));
                gap: 9px;
            }

            .fov-field label {
                display: block;
                font-size: 10px;
                font-weight: 800;
                color: #4b5563;
                margin-bottom: 6px;
            }

            .fov-field input,
            .fov-field textarea,
            .fov-field select {
                width: 100%;
                box-sizing: border-box;
                border: 1px solid #dbe2ea;
                border-radius: 10px;
                padding: 10px;
                outline: none;
                background: #ffffff;
                color: #172033;
                font-size: 12px;
            }

            .fov-field input:focus,
            .fov-field textarea:focus,
            .fov-field select:focus {
                border-color: #635bff;
                box-shadow:
                    0 0 0 3px
                    rgba(99, 91, 255, 0.10);
            }

            .fov-field textarea {
                resize: vertical;
            }

            .fov-section {
                border: 1px solid #e8edf3;
                border-radius: 14px;
                padding: 15px;
                margin: 14px 0;
            }

            .fov-section h3 {
                margin: 0 0 10px;
                font-size: 13px;
            }

            .fov-metric {
                padding: 12px;
                border: 1px solid #edf0f4;
                border-radius: 11px;
                background: #fafbfc;
            }

            .fov-metric span,
            .fov-metric small {
                display: block;
                color: #8992a3;
                font-size: 9px;
            }

            .fov-metric strong {
                display: block;
                font-size: 20px;
                margin: 5px 0;
                color: #172033;
            }

            .fov-actions {
                display: flex;
                justify-content: flex-end;
                gap: 9px;
                margin-top: 17px;
                flex-wrap: wrap;
            }

            .fov-btn {
                border: 0;
                border-radius: 10px;
                padding: 10px 14px;
                font-weight: 800;
                font-size: 11px;
                cursor: pointer;
            }

            .fov-btn.primary {
                background: #635bff;
                color: #ffffff;
            }

            .fov-btn.primary:hover {
                background: #5148ee;
            }

            .fov-btn.secondary {
                background: #f1f5f9;
                color: #334155;
            }

            .fov-btn.success {
                background: #ecfdf5;
                color: #047857;
            }

            .fov-btn.warning {
                background: #fff7ed;
                color: #c2410c;
            }

            .fov-note {
                font-size: 10px;
                color: #8a94a6;
                margin-top: 7px;
            }

            .fov-list {
                display: grid;
                gap: 10px;
            }

            .fov-item {
                border: 1px solid #e8edf3;
                border-radius: 13px;
                padding: 14px;
            }

            .fov-item-top {
                display: flex;
                justify-content: space-between;
                gap: 12px;
                align-items: flex-start;
            }

            .fov-item-title {
                font-size: 13px;
                font-weight: 850;
            }

            .fov-pill {
                font-size: 9px;
                font-weight: 900;
                border-radius: 999px;
                padding: 6px 9px;
                background: #eef2ff;
                color: #4f46e5;
                white-space: nowrap;
            }

            .fov-pill.high {
                background: #fff7ed;
                color: #c2410c;
            }

            .fov-pill.critical {
                background: #fff1f2;
                color: #be123c;
            }

            .fov-pill.done {
                background: #ecfdf5;
                color: #047857;
            }

            .fov-pill.more {
                background: #fff7ed;
                color: #c2410c;
            }

            .fov-small {
                font-size: 10px;
                color: #758195;
                line-height: 1.55;
            }

            .fov-progress {
                height: 7px;
                background: #edf0f4;
                border-radius: 8px;
                overflow: hidden;
                margin: 10px 0;
            }

            .fov-progress span {
                display: block;
                height: 100%;
                background: #635bff;
                border-radius: 8px;
            }

            .fov-timeline {
                display: grid;
                gap: 0;
                margin-top: 5px;
            }

            .fov-tline {
                position: relative;
                padding:
                    0
                    0
                    19px
                    30px;
            }

            .fov-tline:before {
                content: "";
                position: absolute;
                left: 8px;
                top: 15px;
                bottom: -1px;
                width: 2px;
                background: #e5e7eb;
            }

            .fov-tline:last-child:before {
                display: none;
            }

            .fov-dot {
                position: absolute;
                left: 0;
                top: 0;
                width: 17px;
                height: 17px;
                border-radius: 50%;
                background: #635bff;
                box-shadow:
                    0 0 0 4px #efefff;
            }

            .fov-before-after {
                display: grid;
                grid-template-columns:
                    1fr 1fr 1fr;
                gap: 10px;
            }

            .fov-improve {
                background: #effcf6;
                border: 1px solid #ccefdc;
                border-radius: 12px;
                padding: 13px;
            }

            .fov-improve strong {
                display: block;
                color: #047857;
                font-size: 21px;
                margin-top: 4px;
            }

            .fov-empty {
                padding: 18px;
                text-align: center;
                border: 1px dashed #d8dee8;
                border-radius: 12px;
                color: #9099a8;
                font-size: 11px;
            }

            .fov-student-search {
                display: flex;
                gap: 10px;
                align-items: flex-end;
            }

            .fov-student-search .fov-field {
                flex: 1;
            }

            .fov-student-card {
                border:
                    1px solid
                    #dbe5f0;
                border-radius: 14px;
                padding: 15px;
                background:
                    linear-gradient(
                        135deg,
                        #f8fbff,
                        #ffffff
                    );
            }

            .fov-student-name {
                font-size: 18px;
                font-weight: 900;
                color: #172033;
            }

            .fov-student-id {
                font-size: 10px;
                color: #64748b;
                margin-top: 3px;
            }

            .fov-risk {
                display: inline-flex;
                padding: 6px 10px;
                border-radius: 999px;
                font-size: 9px;
                font-weight: 900;
                margin-top: 9px;
            }

            .fov-risk.high {
                background: #fff1f2;
                color: #be123c;
            }

            .fov-risk.moderate {
                background: #fff7ed;
                color: #c2410c;
            }

            .fov-risk.low {
                background: #ecfdf5;
                color: #047857;
            }

            .fov-message {
                border-radius: 10px;
                padding: 10px 12px;
                margin-top: 10px;
                font-size: 11px;
            }

            .fov-message.error {
                background: #fff1f2;
                color: #be123c;
            }

            .fov-message.success {
                background: #ecfdf5;
                color: #047857;
            }

            .fov-message.info {
                background: #eff6ff;
                color: #1d4ed8;
            }

            .fov-hidden {
                display: none !important;
            }

            @media (max-width: 800px) {
                .fov-grid-4,
                .fov-grid-3 {
                    grid-template-columns:
                        repeat(2, minmax(0, 1fr));
                }

                .fov-before-after {
                    grid-template-columns: 1fr;
                }
            }

            @media (max-width: 620px) {
                .fov-grid {
                    grid-template-columns: 1fr;
                }

                .fov-grid-4,
                .fov-grid-3 {
                    grid-template-columns: 1fr;
                }

                .fov-student-search {
                    flex-direction: column;
                    align-items: stretch;
                }

                .fov-card {
                    padding: 17px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // ============================================================
    // STUDENT LOOKUP
    // ============================================================

    async function getStudent(studentId) {
        const cleanId = String(studentId || "")
            .trim()
            .toUpperCase();

        if (!cleanId) {
            throw new Error("Please enter a Student ID.");
        }

        if (!/^STU\d+$/i.test(cleanId)) {
            throw new Error(
                "Enter a valid Student ID such as STU1001."
            );
        }

        return await api(
            `/api/student/${encodeURIComponent(cleanId)}`
        );
    }

    // ============================================================
    // STUDENT SEARCH / INTERVENTION START SCREEN
    // ============================================================

    function openInterventionStart() {
        const wrapper = overlay(
            "Intervention → Student",
            `
                <p class="fov-sub">
                    Enter the Student ID to connect this intervention
                    directly to that student. Every intervention,
                    note, report, notification and outcome will be
                    linked to the selected Student ID.
                </p>

                <div class="fov-section">

                    <div class="fov-student-search">

                        <div class="fov-field">
                            <label>
                                Student ID
                            </label>

                            <input
                                id="facultyInterventionStudentId"
                                type="text"
                                placeholder="Example: STU1001"
                                autocomplete="off"
                            />
                        </div>

                        <button
                            type="button"
                            class="fov-btn primary"
                            id="facultyFindStudent"
                        >
                            Find Student
                        </button>

                    </div>

                    <div
                        id="facultyStudentLookupMessage"
                        class="fov-hidden"
                    ></div>

                </div>

                <div
                    id="facultyStudentPreview"
                    class="fov-hidden"
                ></div>

                <div
                    id="facultyStudentActions"
                    class="fov-actions fov-hidden"
                >
                    <button
                        type="button"
                        class="fov-btn secondary"
                        id="facultyOpenNotes"
                    >
                        Notes & Resources
                    </button>

                    <button
                        type="button"
                        class="fov-btn primary"
                        id="facultyCreateForStudent"
                    >
                        Create Intervention
                    </button>
                </div>

                <div class="fov-section">

                    <h3>
                        What happens after saving?
                    </h3>

                    <div class="fov-small">
                        The intervention is stored against the exact
                        Student ID. The student will immediately see
                        the intervention in Student View after login.
                        The student can then submit progress/evidence,
                        and faculty can review the outcome.
                    </div>

                </div>
            `,
            false
        );

        const input = wrapper.querySelector(
            "#facultyInterventionStudentId"
        );

        const findButton = wrapper.querySelector(
            "#facultyFindStudent"
        );

        const message = wrapper.querySelector(
            "#facultyStudentLookupMessage"
        );

        const preview = wrapper.querySelector(
            "#facultyStudentPreview"
        );

        const actions = wrapper.querySelector(
            "#facultyStudentActions"
        );

        let selectedStudent = null;

        function showMessage(text, type = "info") {
            message.className =
                `fov-message ${type}`;

            message.textContent = text;
        }

        async function findStudent() {
            const studentId =
                input.value.trim().toUpperCase();

            preview.innerHTML = "";
            preview.classList.add("fov-hidden");
            actions.classList.add("fov-hidden");

            if (!studentId) {
                showMessage(
                    "Please enter a Student ID.",
                    "error"
                );
                return;
            }

            findButton.disabled = true;
            findButton.textContent = "Finding...";

            try {
                const student =
                    await getStudent(studentId);

                selectedStudent = student;

                const riskClass =
                    String(student.risk_level || "")
                        .toLowerCase()
                        .includes("high")
                        ? "high"
                        : String(student.risk_level || "")
                            .toLowerCase()
                            .includes("moderate")
                            ? "moderate"
                            : "low";

                preview.innerHTML = `
                    <div class="fov-student-card">

                        <div class="fov-student-name">
                            ${esc(student.name)}
                        </div>

                        <div class="fov-student-id">
                            ${esc(student.student_id)}
                            ·
                            ${esc(student.department)}
                            · Year ${esc(student.year)}
                        </div>

                        <span
                            class="fov-risk ${riskClass}"
                        >
                            ${esc(student.risk_level)}
                            · Success Score
                            ${number(student.success_score)}
                        </span>

                        <div
                            class="fov-grid-4"
                            style="margin-top:14px;"
                        >

                            <div class="fov-metric">
                                <span>Success Score</span>
                                <strong>
                                    ${number(student.success_score)}
                                </strong>
                            </div>

                            <div class="fov-metric">
                                <span>Attendance</span>
                                <strong>
                                    ${number(student.attendance)}%
                                </strong>
                            </div>

                            <div class="fov-metric">
                                <span>Academic</span>
                                <strong>
                                    ${number(
                                        student.academic
                                            ?.subject_performance
                                    )}%
                                </strong>
                            </div>

                            <div class="fov-metric">
                                <span>Assignments</span>
                                <strong>
                                    ${number(
                                        student.lms
                                            ?.assignment_completion
                                    )}%
                                </strong>
                            </div>

                        </div>

                        <div class="fov-small"
                             style="margin-top:12px;">
                            <strong>AI Risk Reasons:</strong>
                            ${
                                (student.risk_reasons || [])
                                    .map(reason =>
                                        esc(reason)
                                    )
                                    .join(" · ")
                                || "No specific risk reason."
                            }
                        </div>

                    </div>
                `;

                preview.classList.remove(
                    "fov-hidden"
                );

                actions.classList.remove(
                    "fov-hidden"
                );

                showMessage(
                    `Student ${student.student_id} found successfully.`,
                    "success"
                );

            } catch (error) {
                selectedStudent = null;

                showMessage(
                    error.message ||
                    "Student could not be found.",
                    "error"
                );
            } finally {
                findButton.disabled = false;
                findButton.textContent =
                    "Find Student";
            }
        }

        findButton.onclick = findStudent;

        input.addEventListener(
            "keydown",
            event => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    findStudent();
                }
            }
        );

        wrapper.querySelector(
            "#facultyCreateForStudent"
        ).onclick = () => {
            if (!selectedStudent) {
                alert("Find a student first.");
                return;
            }

            wrapper.remove();

            openCreateIntervention(
                selectedStudent.student_id,
                selectedStudent.name
            );
        };

        wrapper.querySelector(
            "#facultyOpenNotes"
        ).onclick = () => {
            if (!selectedStudent) {
                alert("Find a student first.");
                return;
            }

            wrapper.remove();

            openStudentNotes(
                selectedStudent.student_id,
                selectedStudent.name
            );
        };

        setTimeout(() => input.focus(), 100);
    }

    // ============================================================
    // CREATE INTERVENTION
    // ============================================================

    async function openCreateIntervention(
        studentId,
        studentName
    ) {
        let student;

        try {
            student = await getStudent(studentId);
        } catch (error) {
            alert(error.message);
            return;
        }

        const reasons =
            student.risk_reasons || [];

        const recommendedActions =
            student.recommendation
                ?.recommended_actions || [];

        const defaultReason =
            reasons.length
                ? reasons.join(", ")
                : "AI risk analysis identified an area requiring support.";

        const defaultRecommended =
            recommendedActions.length
                ? recommendedActions[0]
                : "Academic support + assignment follow-up";

        const wrapper = overlay(
            `Create Intervention · ${esc(studentName)}`,
            `
                <p class="fov-sub">
                    This intervention will be permanently linked to
                    <strong>${esc(studentId)}</strong>.
                    The student's current metrics will be captured
                    as the baseline.
                </p>

                <div class="fov-section">

                    <h3>
                        Student
                    </h3>

                    <div class="fov-student-card">

                        <div class="fov-student-name">
                            ${esc(student.name)}
                        </div>

                        <div class="fov-student-id">
                            ${esc(student.student_id)}
                            ·
                            ${esc(student.department)}
                            · Year ${esc(student.year)}
                        </div>

                    </div>

                </div>

                <div class="fov-section">

                    <h3>
                        Baseline Metrics · At Time of Intervention
                    </h3>

                    <div class="fov-grid-4">

                        <div class="fov-metric">
                            <span>Success Score</span>
                            <strong>
                                ${number(student.success_score)}
                            </strong>
                            <small>AI score</small>
                        </div>

                        <div class="fov-metric">
                            <span>Attendance</span>
                            <strong>
                                ${number(student.attendance)}%
                            </strong>
                            <small>Current</small>
                        </div>

                        <div class="fov-metric">
                            <span>Academic</span>
                            <strong>
                                ${number(
                                    student.academic
                                        ?.subject_performance
                                )}%
                            </strong>
                            <small>Subject performance</small>
                        </div>

                        <div class="fov-metric">
                            <span>Assignments</span>
                            <strong>
                                ${number(
                                    student.lms
                                        ?.assignment_completion
                                )}%
                            </strong>
                            <small>Completion</small>
                        </div>

                    </div>

                </div>

                <div class="fov-section">

                    <h3>
                        Intervention Details
                    </h3>

                    <div class="fov-grid">

                        <div class="fov-field">
                            <label>
                                Reason
                            </label>

                            <textarea
                                id="fiReason"
                                rows="4"
                            >${esc(defaultReason)}</textarea>
                        </div>

                        <div class="fov-field">
                            <label>
                                Recommended Action
                            </label>

                            <textarea
                                id="fiRecommended"
                                rows="4"
                            >${esc(defaultRecommended)}</textarea>
                        </div>

                        <div class="fov-field">
                            <label>
                                Intervention Title
                            </label>

                            <input
                                id="fiTitle"
                                value="Academic Support & Follow-up"
                            />
                        </div>

                        <div class="fov-field">
                            <label>
                                Action Taken
                            </label>

                            <textarea
                                id="fiAction"
                                rows="3"
                                placeholder="Example: Scheduled meeting with advisor"
                            >Scheduled meeting with advisor</textarea>
                        </div>

                        <div class="fov-field">
                            <label>
                                Intervention Date
                            </label>

                            <input
                                id="fiDate"
                                type="date"
                                value="${today()}"
                            />
                        </div>

                        <div class="fov-field">
                            <label>
                                Follow-up Date
                            </label>

                            <input
                                id="fiDue"
                                type="date"
                            />
                        </div>

                        <div class="fov-field">
                            <label>
                                Priority
                            </label>

                            <select id="fiPriority">
                                <option>
                                    Normal
                                </option>

                                <option selected>
                                    High
                                </option>

                                <option>
                                    Critical
                                </option>
                            </select>
                        </div>

                        <div class="fov-field">
                            <label>
                                Status
                            </label>

                            <select id="fiStatus">
                                <option selected>
                                    In Progress
                                </option>

                                <option>
                                    Assigned
                                </option>
                            </select>
                        </div>

                    </div>

                    <div
                        class="fov-field"
                        style="margin-top:12px;"
                    >
                        <label>
                            Student Instructions / Expected Outcome
                        </label>

                        <textarea
                            id="fiDescription"
                            rows="5"
                            placeholder="Explain exactly what the student should do and how progress will be checked."
                        >Complete the recommended action and submit a progress report before the follow-up date.</textarea>
                    </div>

                </div>

                <div class="fov-section">

                    <h3>
                        What the Student Will See
                    </h3>

                    <div class="fov-small">
                        The student will see this intervention in
                        Student View with the reason, recommended
                        action, faculty action, dates, status,
                        progress and submission option.
                    </div>

                </div>

                <div class="fov-actions">

                    <button
                        type="button"
                        class="fov-btn secondary"
                        id="fiCancel"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        class="fov-btn primary"
                        id="fiSave"
                    >
                        Save Intervention
                    </button>

                </div>
            `,
            true
        );

        wrapper.querySelector(
            "#fiCancel"
        ).onclick = () => {
            wrapper.remove();
        };

        wrapper.querySelector(
            "#fiSave"
        ).onclick = async () => {

            const title =
                wrapper
                    .querySelector("#fiTitle")
                    .value
                    .trim();

            const description =
                wrapper
                    .querySelector("#fiDescription")
                    .value
                    .trim();

            if (!title) {
                alert(
                    "Intervention title is required."
                );
                return;
            }

            if (!description) {
                alert(
                    "Student instructions / expected outcome are required."
                );
                return;
            }

            const payload = {
                student_id: studentId,

                title,

                description,

                reason:
                    wrapper
                        .querySelector("#fiReason")
                        .value
                        .trim(),

                recommended_action:
                    wrapper
                        .querySelector("#fiRecommended")
                        .value
                        .trim(),

                action_taken:
                    wrapper
                        .querySelector("#fiAction")
                        .value
                        .trim(),

                priority:
                    wrapper
                        .querySelector("#fiPriority")
                        .value,

                intervention_date:
                    wrapper
                        .querySelector("#fiDate")
                        .value ||
                    null,

                due_date:
                    wrapper
                        .querySelector("#fiDue")
                        .value ||
                    null,

                status:
                    wrapper
                        .querySelector("#fiStatus")
                        .value
            };

            const saveButton =
                wrapper.querySelector("#fiSave");

            saveButton.disabled = true;
            saveButton.textContent =
                "Saving...";

            try {

                await api(
                    "/api/interventions",
                    {
                        method: "POST",
                        body: JSON.stringify(payload)
                    }
                );

                wrapper.remove();

                alert(
                    `Intervention successfully connected to ${studentId}.`
                );

                openInterventionCenter();

            } catch (error) {

                alert(
                    error.message ||
                    "Unable to save intervention."
                );

                saveButton.disabled = false;
                saveButton.textContent =
                    "Save Intervention";
            }
        };
    }

    // ============================================================
    // STUDENT-SPECIFIC NOTES AND RESOURCES
    // ============================================================

    async function openStudentNotes(
        studentId,
        studentName
    ) {
        let data;

        try {
            data = await api(
                `/api/student/${encodeURIComponent(studentId)}/notes`
            );
        } catch (error) {
            alert(error.message);
            return;
        }

        const notes =
            data.notes || [];

        const noteHTML =
            notes.length
                ? notes.map(note => `
                    <div class="fov-item">

                        <div class="fov-item-top">

                            <div>
                                <div class="fov-item-title">
                                    📝 Faculty Resource
                                </div>

                                <div
                                    class="fov-small"
                                    style="margin-top:4px;"
                                >
                                    Shared with:
                                    ${esc(studentName)}
                                    (${esc(studentId)})
                                </div>
                            </div>

                            <span class="fov-pill">
                                Private
                            </span>

                        </div>

                        ${
                            note.note
                                ? `
                                    <div
                                        class="fov-small"
                                        style="
                                            margin-top:9px;
                                            white-space:pre-wrap;
                                        "
                                    >
                                        ${esc(note.note)}
                                    </div>
                                `
                                : ""
                        }

                        ${
                            note.attachment
                                ? `
                                    <div
                                        style="
                                            margin-top:10px;
                                        "
                                    >
                                        <a
                                            href="${esc(
                                                note.attachment.url
                                            )}"
                                            target="_blank"
                                            rel="noopener"
                                        >
                                            📎
                                            ${esc(
                                                note
                                                    .attachment
                                                    .original_filename
                                            )}
                                        </a>
                                    </div>
                                `
                                : ""
                        }

                        <div class="fov-note">
                            ${
                                note.created_at
                                    ? formatDate(
                                        note.created_at
                                    )
                                    : ""
                            }
                        </div>

                    </div>
                `).join("")
                : `
                    <div class="fov-empty">
                        No private notes or resources have been
                        shared with this student yet.
                    </div>
                `;

        const wrapper = overlay(
            `Faculty Notes & Resources · ${esc(studentName)}`,
            `
                <p class="fov-sub">
                    Anything saved here is visible only to
                    <strong>
                        ${esc(studentName)}
                        (${esc(studentId)})
                    </strong>.
                </p>

                <div class="fov-section">

                    <h3>
                        Existing Student-Specific Resources
                    </h3>

                    <div class="fov-list">
                        ${noteHTML}
                    </div>

                </div>

                <div class="fov-section">

                    <h3>
                        Share a Private Note or Resource
                    </h3>

                    <div class="fov-field">

                        <label>
                            Message
                        </label>

                        <textarea
                            id="snText"
                            rows="5"
                            placeholder="Example: Complete chapters 3 and 4 before the next meeting."
                        ></textarea>

                    </div>

                    <div
                        class="fov-field"
                        style="margin-top:12px;"
                    >

                        <label>
                            Attach PDF / DOCX / Image
                        </label>

                        <input
                            id="snFile"
                            type="file"
                            accept=".pdf,.docx,.jpg,.jpeg,.png"
                        />

                    </div>

                    <div class="fov-note">
                        Maximum file size: 10 MB.
                    </div>

                    <div class="fov-actions">

                        <button
                            type="button"
                            class="fov-btn primary"
                            id="snSave"
                        >
                            Share With This Student
                        </button>

                    </div>

                </div>
            `,
            true
        );

        wrapper.querySelector(
            "#snSave"
        ).onclick = async () => {

            const noteText =
                wrapper
                    .querySelector("#snText")
                    .value
                    .trim();

            const file =
                wrapper
                    .querySelector("#snFile")
                    .files[0];

            if (!noteText && !file) {
                alert(
                    "Write a note or select a file."
                );
                return;
            }

            const formData =
                new FormData();

            formData.append(
                "note",
                noteText
            );

            if (file) {
                formData.append(
                    "attachment",
                    file
                );
            }

            const button =
                wrapper.querySelector("#snSave");

            button.disabled = true;
            button.textContent =
                "Sharing...";

            try {

                await api(
                    `/api/student/${encodeURIComponent(studentId)}/notes`,
                    {
                        method: "POST",
                        body: formData
                    }
                );

                wrapper.remove();

                alert(
                    `Resource shared with ${studentName} (${studentId}).`
                );

                openStudentNotes(
                    studentId,
                    studentName
                );

            } catch (error) {

                alert(
                    error.message ||
                    "Unable to share resource."
                );

                button.disabled = false;
                button.textContent =
                    "Share With This Student";
            }
        };
    }

    // ============================================================
    // BEFORE / AFTER METRICS
    // ============================================================

    function metricCards(item) {

        const before =
            item.baseline_metrics || {};

        const after =
            item.after_metrics || {};

        function metric(
            value,
            suffix = ""
        ) {
            if (
                value === null ||
                value === undefined ||
                value === ""
            ) {
                return "—";
            }

            return `${number(value)}${suffix}`;
        }

        function improvement(key) {

            const value =
                item.improvements?.[key];

            if (
                value === null ||
                value === undefined
            ) {
                return "—";
            }

            return `${
                value >= 0 ? "+" : ""
            }${number(value)}`;
        }

        return `
            <div class="fov-before-after">

                <div class="fov-section">
                    <h3>
                        Before Intervention
                    </h3>

                    <div class="fov-grid-4">

                        <div class="fov-metric">
                            <span>Success Score</span>
                            <strong>
                                ${metric(
                                    before.success_score
                                )}
                            </strong>
                        </div>

                        <div class="fov-metric">
                            <span>Attendance</span>
                            <strong>
                                ${metric(
                                    before.attendance,
                                    "%"
                                )}
                            </strong>
                        </div>

                        <div class="fov-metric">
                            <span>Academic</span>
                            <strong>
                                ${metric(
                                    before.academic,
                                    "%"
                                )}
                            </strong>
                        </div>

                        <div class="fov-metric">
                            <span>Assignments</span>
                            <strong>
                                ${metric(
                                    before.assignments,
                                    "%"
                                )}
                            </strong>
                        </div>

                    </div>
                </div>

                <div class="fov-section">
                    <h3>
                        After Intervention
                    </h3>

                    <div class="fov-grid-4">

                        <div class="fov-metric">
                            <span>Success Score</span>
                            <strong>
                                ${metric(
                                    after.success_score
                                )}
                            </strong>
                        </div>

                        <div class="fov-metric">
                            <span>Attendance</span>
                            <strong>
                                ${metric(
                                    after.attendance,
                                    "%"
                                )}
                            </strong>
                        </div>

                        <div class="fov-metric">
                            <span>Academic</span>
                            <strong>
                                ${metric(
                                    after.academic,
                                    "%"
                                )}
                            </strong>
                        </div>

                        <div class="fov-metric">
                            <span>Assignments</span>
                            <strong>
                                ${metric(
                                    after.assignments,
                                    "%"
                                )}
                            </strong>
                        </div>

                    </div>
                </div>

                <div class="fov-improve">

                    <span class="fov-small">
                        Success Score Improvement
                    </span>

                    <strong>
                        ${improvement(
                            "success_score"
                        )}
                    </strong>

                    <div class="fov-small">
                        points
                    </div>

                </div>

            </div>
        `;
    }

    // ============================================================
    // INTERVENTION ANALYTICS
    // ============================================================

    async function getInterventionAnalytics() {
        return await api(
            "/api/interventions/analytics"
        );
    }

    // ============================================================
    // INTERVENTION CENTER
    // ============================================================

    async function openInterventionCenter() {

        let items;
        let stats;

        try {

            [
                items,
                stats
            ] = await Promise.all([
                api("/api/interventions"),
                getInterventionAnalytics()
            ]);

        } catch (error) {

            alert(
                error.message ||
                "Unable to load interventions."
            );

            return;
        }

        const rows =
            (items || []).map(item => {

                const priority =
                    item.priority || "Normal";

                let pillClass = "";

                if (
                    priority === "Critical"
                ) {
                    pillClass = "critical";
                } else if (
                    priority === "High"
                ) {
                    pillClass = "high";
                } else if (
                    item.status === "Completed"
                ) {
                    pillClass = "done";
                } else if (
                    item.status === "Needs More Work"
                ) {
                    pillClass = "more";
                }

                return `
                    <div class="fov-item">

                        <div class="fov-item-top">

                            <div>

                                <div class="fov-item-title">
                                    ${esc(
                                        item.title
                                    )}
                                </div>

                                <div
                                    class="fov-small"
                                    style="margin-top:4px;"
                                >
                                    Student:
                                    <strong>
                                        ${esc(
                                            item.student_name ||
                                            item.student_id
                                        )}
                                    </strong>

                                    ·

                                    ${esc(
                                        item.student_id
                                    )}

                                    ·

                                    ${esc(
                                        priority
                                    )}
                                </div>

                            </div>

                            <span
                                class="
                                    fov-pill
                                    ${pillClass}
                                "
                            >
                                ${esc(
                                    item.status
                                )}
                            </span>

                        </div>

                        <div
                            class="fov-small"
                            style="margin-top:9px;"
                        >
                            <strong>
                                Reason:
                            </strong>

                            ${esc(
                                item.reason ||
                                item.description
                            )}
                        </div>

                        <div class="fov-progress">
                            <span
                                style="
                                    width:${Math.min(
                                        100,
                                        Math.max(
                                            0,
                                            Number(
                                                item.progress_percent ||
                                                0
                                            )
                                        )
                                    )}%;
                                "
                            ></span>
                        </div>

                        <div class="fov-small">

                            Progress:
                            ${number(
                                item.progress_percent || 0,
                                0
                            )}%

                            · Follow-up:
                            ${esc(
                                item.due_date ||
                                "Not set"
                            )}

                        </div>

                        ${
                            item.score_improvement !==
                                null &&
                            item.score_improvement !==
                                undefined
                                ? `
                                    <div
                                        class="fov-small"
                                        style="
                                            margin-top:6px;
                                            color:#047857;
                                            font-weight:800;
                                        "
                                    >
                                        Outcome:
                                        ${
                                            item.score_improvement >= 0
                                                ? "+"
                                                : ""
                                        }${number(
                                            item.score_improvement
                                        )}
                                        score points

                                        ·

                                        ${esc(
                                            item.outcome ||
                                            "Measured"
                                        )}
                                    </div>
                                `
                                : ""
                        }

                        <div
                            class="fov-actions"
                            style="
                                margin-top:11px;
                                justify-content:flex-start;
                            "
                        >

                            <button
                                type="button"
                                class="fov-btn secondary"
                                data-view-intervention="${esc(
                                    item.id
                                )}"
                            >
                                View Loop
                            </button>

                            ${
                                item.status ===
                                "Report Submitted"
                                    ? `
                                        <button
                                            type="button"
                                            class="fov-btn primary"
                                            data-review-intervention="${esc(
                                                item.id
                                            )}"
                                        >
                                            Review Report
                                        </button>
                                    `
                                    : ""
                            }

                        </div>

                    </div>
                `;
            }).join("");

        const wrapper = overlay(
            "Intervention → Outcome Tracking",
            `
                <p class="fov-sub">
                    Identify at-risk student → faculty action →
                    student support → follow-up → compare metrics →
                    measure outcome.
                </p>

                <div class="fov-grid-4">

                    <div class="fov-metric">
                        <span>Total Interventions</span>
                        <strong>
                            ${number(
                                stats.total_interventions,
                                0
                            )}
                        </strong>
                    </div>

                    <div class="fov-metric">
                        <span>Active</span>
                        <strong>
                            ${number(
                                stats.active,
                                0
                            )}
                        </strong>
                    </div>

                    <div class="fov-metric">
                        <span>Completed</span>
                        <strong>
                            ${number(
                                stats.completed,
                                0
                            )}
                        </strong>
                    </div>

                    <div class="fov-metric">
                        <span>Successful</span>
                        <strong>
                            ${number(
                                stats.successful,
                                0
                            )}
                        </strong>
                    </div>

                </div>

                <div class="fov-section">

                    <div class="fov-grid-3">

                        <div>
                            <div class="fov-small">
                                Success Rate
                            </div>

                            <div
                                style="
                                    font-size:24px;
                                    font-weight:900;
                                    color:#635bff;
                                    margin-top:4px;
                                "
                            >
                                ${number(
                                    stats.success_rate
                                )}%
                            </div>
                        </div>

                        <div>
                            <div class="fov-small">
                                Avg. Score Improvement
                            </div>

                            <div
                                style="
                                    font-size:24px;
                                    font-weight:900;
                                    color:#047857;
                                    margin-top:4px;
                                "
                            >
                                ${
                                    Number(
                                        stats.average_score_improvement ||
                                        0
                                    ) >= 0
                                        ? "+"
                                        : ""
                                }${number(
                                    stats.average_score_improvement
                                )}
                            </div>
                        </div>

                        <div>
                            <div class="fov-small">
                                Create New
                            </div>

                            <button
                                type="button"
                                class="fov-btn primary"
                                id="openNewInterventionFromCenter"
                                style="margin-top:6px;"
                            >
                                + Intervention
                            </button>
                        </div>

                    </div>

                </div>

                <div class="fov-section">

                    <h3>
                        All Student Interventions
                    </h3>

                    <div class="fov-list">

                        ${
                            rows ||
                            `
                                <div class="fov-empty">
                                    No interventions created yet.
                                </div>
                            `
                        }

                    </div>

                </div>
            `,
            true
        );

        const createButton =
            wrapper.querySelector(
                "#openNewInterventionFromCenter"
            );

        if (createButton) {
            createButton.onclick = () => {
                wrapper.remove();
                openInterventionStart();
            };
        }

        wrapper
            .querySelectorAll(
                "[data-view-intervention]"
            )
            .forEach(button => {

                button.onclick = () => {

                    openInterventionDetail(
                        button.dataset
                            .viewIntervention,
                        wrapper
                    );

                };

            });

        wrapper
            .querySelectorAll(
                "[data-review-intervention]"
            )
            .forEach(button => {

                button.onclick = () => {

                    openReview(
                        button.dataset
                            .reviewIntervention,
                        wrapper
                    );

                };

            });
    }

    // ============================================================
    // INTERVENTION DETAIL
    // ============================================================

    async function openInterventionDetail(
        interventionId,
        parentOverlay
    ) {

        let item;

        try {

            item = await api(
                `/api/interventions/${encodeURIComponent(
                    interventionId
                )}`
            );

        } catch (error) {

            alert(error.message);
            return;
        }

        const wrapper = overlay(
            `Intervention Loop · ${esc(
                item.student_name ||
                item.student_id
            )}`,
            `
                <div class="fov-section">

                    <div class="fov-item-top">

                        <div>

                            <h3>
                                ${esc(
                                    item.title
                                )}
                            </h3>

                            <div class="fov-small">

                                Student:
                                ${esc(
                                    item.student_name ||
                                    item.student_id
                                )}

                                ·

                                ${esc(
                                    item.student_id
                                )}

                            </div>

                        </div>

                        <span class="fov-pill">
                            ${esc(
                                item.status
                            )}
                        </span>

                    </div>

                </div>

                <div class="fov-section">

                    <h3>
                        Intervention Details
                    </h3>

                    <div class="fov-grid">

                        <div>
                            <div class="fov-small">
                                Reason
                            </div>

                            <div>
                                ${esc(
                                    item.reason
                                )}
                            </div>
                        </div>

                        <div>
                            <div class="fov-small">
                                Recommended Action
                            </div>

                            <div>
                                ${esc(
                                    item.recommended_action
                                )}
                            </div>
                        </div>

                        <div>
                            <div class="fov-small">
                                Faculty Action
                            </div>

                            <div>
                                ${esc(
                                    item.action_taken
                                )}
                            </div>
                        </div>

                        <div>
                            <div class="fov-small">
                                Follow-up Date
                            </div>

                            <div>
                                ${esc(
                                    item.due_date ||
                                    "Not scheduled"
                                )}
                            </div>
                        </div>

                    </div>

                </div>

                <div class="fov-section">

                    <h3>
                        Intervention Timeline
                    </h3>

                    <div class="fov-timeline">

                        <div class="fov-tline">

                            <span class="fov-dot"></span>

                            <strong>
                                Risk Detected
                            </strong>

                            <div class="fov-small">
                                ${esc(
                                    item.intervention_date ||
                                    item.created_at?.slice(
                                        0,
                                        10
                                    ) ||
                                    ""
                                )}

                                · Baseline Score:
                                ${number(
                                    item.baseline_metrics
                                        ?.success_score
                                )}
                            </div>

                        </div>

                        <div class="fov-tline">

                            <span class="fov-dot"></span>

                            <strong>
                                Intervention Recommended
                            </strong>

                            <div class="fov-small">
                                ${esc(
                                    item.recommended_action ||
                                    item.title
                                )}
                            </div>

                        </div>

                        <div class="fov-tline">

                            <span class="fov-dot"></span>

                            <strong>
                                Faculty Action
                            </strong>

                            <div class="fov-small">
                                ${esc(
                                    item.action_taken ||
                                    "Intervention assigned"
                                )}
                            </div>

                        </div>

                        <div class="fov-tline">

                            <span class="fov-dot"></span>

                            <strong>
                                Student Follow-up
                            </strong>

                            <div class="fov-small">
                                ${esc(
                                    item.due_date ||
                                    "Not scheduled"
                                )}

                                · Progress:
                                ${number(
                                    item.progress_percent ||
                                    0,
                                    0
                                )}%
                            </div>

                        </div>

                        <div class="fov-tline">

                            <span class="fov-dot"></span>

                            <strong>
                                Outcome Measured
                            </strong>

                            <div class="fov-small">

                                ${
                                    item.after_metrics
                                        ?.success_score !==
                                        undefined &&
                                    item.after_metrics
                                        ?.success_score !==
                                        null
                                        ? `
                                            Score:
                                            ${number(
                                                item.after_metrics
                                                    .success_score
                                            )}

                                            · Improvement:

                                            ${
                                                item.score_improvement >=
                                                0
                                                    ? "+"
                                                    : ""
                                            }${number(
                                                item.score_improvement
                                            )}
                                            points
                                        `
                                        : `
                                            Pending follow-up
                                            measurement
                                        `
                                }

                            </div>

                        </div>

                    </div>

                </div>

                ${metricCards(item)}

                ${
                    item.report_text
                        ? `
                            <div class="fov-section">

                                <h3>
                                    Student Report
                                </h3>

                                <div
                                    class="fov-small"
                                    style="
                                        white-space:pre-wrap;
                                    "
                                >
                                    ${esc(
                                        item.report_text
                                    )}
                                </div>

                            </div>
                        `
                        : ""
                }

                ${
                    item.attachment
                        ? `
                            <div class="fov-section">

                                <h3>
                                    Student Evidence
                                </h3>

                                <a
                                    href="${esc(
                                        item.attachment.url
                                    )}"
                                    target="_blank"
                                    rel="noopener"
                                >
                                    📎
                                    ${esc(
                                        item.attachment
                                            .original_filename
                                    )}
                                </a>

                            </div>
                        `
                        : ""
                }

                ${
                    item.faculty_feedback
                        ? `
                            <div class="fov-section">

                                <h3>
                                    Faculty Review
                                </h3>

                                <div
                                    class="fov-small"
                                    style="
                                        white-space:pre-wrap;
                                    "
                                >
                                    ${esc(
                                        item.faculty_feedback
                                    )}
                                </div>

                            </div>
                        `
                        : ""
                }

                <div class="fov-actions">

                    <button
                        type="button"
                        class="fov-btn secondary"
                        id="detailBack"
                    >
                        Back
                    </button>

                    ${
                        item.status ===
                        "Report Submitted"
                            ? `
                                <button
                                    type="button"
                                    class="fov-btn primary"
                                    id="detailReview"
                                >
                                    Review Report
                                </button>
                            `
                            : ""
                    }

                </div>
            `,
            true
        );

        wrapper.querySelector(
            "#detailBack"
        ).onclick = () => {

            wrapper.remove();

            openInterventionCenter();
        };

        const reviewButton =
            wrapper.querySelector(
                "#detailReview"
            );

        if (reviewButton) {

            reviewButton.onclick = () => {

                wrapper.remove();

                openReview(
                    interventionId,
                    parentOverlay
                );

            };

        }
    }

    // ============================================================
    // REVIEW STUDENT REPORT
    // ============================================================

    async function openReview(
        interventionId,
        parentOverlay
    ) {

        let item;

        try {

            item = await api(
                `/api/interventions/${encodeURIComponent(
                    interventionId
                )}`
            );

        } catch (error) {

            alert(error.message);
            return;
        }

        const before =
            item.baseline_metrics || {};

        const after =
            item.after_metrics || {};

        const wrapper = overlay(
            `Review Report · ${esc(
                item.student_name ||
                item.student_id
            )}`,
            `
                <p class="fov-sub">

                    Student:
                    <strong>
                        ${esc(
                            item.student_name ||
                            item.student_id
                        )}
                    </strong>

                    ·

                    ${esc(
                        item.student_id
                    )}

                </p>

                ${
                    item.report_text
                        ? `
                            <div class="fov-section">

                                <h3>
                                    Student Report
                                </h3>

                                <div
                                    class="fov-small"
                                    style="
                                        white-space:pre-wrap;
                                    "
                                >
                                    ${esc(
                                        item.report_text
                                    )}
                                </div>

                            </div>
                        `
                        : `
                            <div class="fov-section">

                                <h3>
                                    Student Report
                                </h3>

                                <div class="fov-empty">
                                    No text report was submitted.
                                </div>

                            </div>
                        `
                }

                ${
                    item.attachment
                        ? `
                            <div class="fov-section">

                                <h3>
                                    Evidence
                                </h3>

                                <a
                                    href="${esc(
                                        item.attachment.url
                                    )}"
                                    target="_blank"
                                    rel="noopener"
                                >
                                    📎
                                    ${esc(
                                        item.attachment
                                            .original_filename
                                    )}
                                </a>

                            </div>
                        `
                        : ""
                }

                <div class="fov-section">

                    <h3>
                        Before → After Outcome Metrics
                    </h3>

                    <div class="fov-grid">

                        <div class="fov-field">

                            <label>
                                Success Score · Before
                            </label>

                            <input
                                value="${number(
                                    before.success_score
                                )}"
                                disabled
                            />

                        </div>

                        <div class="fov-field">

                            <label>
                                Success Score · After
                            </label>

                            <input
                                id="raScore"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value="${
                                    after.success_score ??
                                    before.success_score ??
                                    ""
                                }"
                            />

                        </div>

                        <div class="fov-field">

                            <label>
                                Attendance · Before
                            </label>

                            <input
                                value="${number(
                                    before.attendance
                                )}%"
                                disabled
                            />

                        </div>

                        <div class="fov-field">

                            <label>
                                Attendance · After
                            </label>

                            <input
                                id="raAttendance"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value="${
                                    after.attendance ??
                                    ""
                                }"
                            />

                        </div>

                        <div class="fov-field">

                            <label>
                                Academic · Before
                            </label>

                            <input
                                value="${number(
                                    before.academic
                                )}%"
                                disabled
                            />

                        </div>

                        <div class="fov-field">

                            <label>
                                Academic · After
                            </label>

                            <input
                                id="raAcademic"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value="${
                                    after.academic ??
                                    ""
                                }"
                            />

                        </div>

                        <div class="fov-field">

                            <label>
                                LMS · Before
                            </label>

                            <input
                                value="${number(
                                    before.lms
                                )}%"
                                disabled
                            />

                        </div>

                        <div class="fov-field">

                            <label>
                                LMS · After
                            </label>

                            <input
                                id="raLms"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value="${
                                    after.lms ??
                                    ""
                                }"
                            />

                        </div>

                        <div class="fov-field">

                            <label>
                                Assignments · Before
                            </label>

                            <input
                                value="${number(
                                    before.assignments
                                )}%"
                                disabled
                            />

                        </div>

                        <div class="fov-field">

                            <label>
                                Assignments · After
                            </label>

                            <input
                                id="raAssignments"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value="${
                                    after.assignments ??
                                    ""
                                }"
                            />

                        </div>

                    </div>

                </div>

                <div class="fov-grid">

                    <div class="fov-field">

                        <label>
                            Review Status
                        </label>

                        <select id="reviewStatus">

                            <option
                                ${
                                    item.status ===
                                    "Completed"
                                        ? "selected"
                                        : ""
                                }
                            >
                                Completed
                            </option>

                            <option
                                ${
                                    item.status ===
                                    "In Progress"
                                        ? "selected"
                                        : ""
                                }
                            >
                                In Progress
                            </option>

                            <option
                                ${
                                    item.status ===
                                    "Needs More Work"
                                        ? "selected"
                                        : ""
                                }
                            >
                                Needs More Work
                            </option>

                        </select>

                    </div>

                    <div class="fov-field">

                        <label>
                            Outcome
                        </label>

                        <select id="reviewOutcome">

                            <option>
                                Successful
                            </option>

                            <option>
                                Partially Successful
                            </option>

                            <option>
                                Needs Continued Support
                            </option>

                            <option>
                                Pending Measurement
                            </option>

                        </select>

                    </div>

                </div>

                <div
                    class="fov-field"
                    style="margin-top:12px;"
                >

                    <label>
                        Faculty Feedback
                    </label>

                    <textarea
                        id="reviewFeedback"
                        rows="5"
                        placeholder="Tell the student what was done well and what should happen next."
                    >${esc(
                        item.faculty_feedback || ""
                    )}</textarea>

                </div>

                <div class="fov-actions">

                    <button
                        type="button"
                        class="fov-btn secondary"
                        id="reviewCancel"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        class="fov-btn primary"
                        id="saveReview"
                    >
                        Save Review & Measure Outcome
                    </button>

                </div>
            `,
            true
        );

        wrapper.querySelector(
            "#reviewCancel"
        ).onclick = () => {
            wrapper.remove();
        };

        wrapper.querySelector(
            "#saveReview"
        ).onclick = async () => {

            const afterMetrics = {
                success_score:
                    Number(
                        wrapper
                            .querySelector(
                                "#raScore"
                            )
                            .value
                    ),

                attendance:
                    Number(
                        wrapper
                            .querySelector(
                                "#raAttendance"
                            )
                            .value
                    ),

                academic:
                    Number(
                        wrapper
                            .querySelector(
                                "#raAcademic"
                            )
                            .value
                    ),

                lms:
                    Number(
                        wrapper
                            .querySelector(
                                "#raLms"
                            )
                            .value
                    ),

                assignments:
                    Number(
                        wrapper
                            .querySelector(
                                "#raAssignments"
                            )
                            .value
                    )
            };

            const invalid =
                Object.values(
                    afterMetrics
                ).some(
                    value =>
                        Number.isNaN(value)
                );

            if (invalid) {
                alert(
                    "Enter all after-intervention metrics."
                );
                return;
            }

            const button =
                wrapper.querySelector(
                    "#saveReview"
                );

            button.disabled = true;
            button.textContent =
                "Saving...";

            try {

                await api(
                    `/api/interventions/${encodeURIComponent(
                        interventionId
                    )}/review`,
                    {
                        method: "PATCH",

                        body: JSON.stringify({
                            status:
                                wrapper
                                    .querySelector(
                                        "#reviewStatus"
                                    )
                                    .value,

                            outcome:
                                wrapper
                                    .querySelector(
                                        "#reviewOutcome"
                                    )
                                    .value,

                            faculty_feedback:
                                wrapper
                                    .querySelector(
                                        "#reviewFeedback"
                                    )
                                    .value
                                    .trim(),

                            after_metrics:
                                afterMetrics
                        })
                    }
                );

                wrapper.remove();

                parentOverlay?.remove();

                alert(
                    "Intervention outcome saved successfully."
                );

                openInterventionCenter();

            } catch (error) {

                alert(
                    error.message ||
                    "Unable to save review."
                );

                button.disabled = false;
                button.textContent =
                    "Save Review & Measure Outcome";
            }
        };
    }

    // ============================================================
    // EXISTING STUDENT PROFILE SUPPORT
    // ============================================================

    function currentProfileStudentId() {

        const idElement =
            document.getElementById(
                "profileId"
            );

        if (!idElement) {
            return null;
        }

        const text =
            (
                idElement.textContent ||
                ""
            ).trim();

        const match =
            text.match(
                /STU\d+/i
            );

        if (match) {
            return match[0].toUpperCase();
        }

        return (
            text
                .split("•")[0]
                ?.trim() ||
            null
        );
    }

    function currentProfileStudentName() {

        const name =
            document
                .getElementById(
                    "profileName"
                )
                ?.textContent
                ?.trim();

        return (
            name ||
            currentProfileStudentId() ||
            "Student"
        );
    }

    function ensureProfileButtons() {

        const actions =
            document.querySelector(
                "#profile .profile-actions"
            );

        if (!actions) {
            return;
        }

        if (
            !document.getElementById(
                "createInterventionButton"
            )
        ) {

            const button =
                document.createElement(
                    "button"
                );

            button.id =
                "createInterventionButton";

            button.className =
                "secondary-button";

            button.textContent =
                "⚡ Create Intervention";

            button.onclick = () => {

                const id =
                    currentProfileStudentId();

                const name =
                    currentProfileStudentName();

                if (!id) {
                    alert(
                        "Student ID could not be detected."
                    );
                    return;
                }

                openCreateIntervention(
                    id,
                    name
                );
            };

            actions.appendChild(
                button
            );
        }

        if (
            !document.getElementById(
                "studentNotesResourceButton"
            )
        ) {

            const notesButton =
                document.createElement(
                    "button"
                );

            notesButton.id =
                "studentNotesResourceButton";

            notesButton.className =
                "secondary-button";

            notesButton.textContent =
                "📝 Notes & Resources";

            notesButton.onclick = () => {

                const id =
                    currentProfileStudentId();

                const name =
                    currentProfileStudentName();

                if (!id) {
                    alert(
                        "Student ID could not be detected."
                    );
                    return;
                }

                openStudentNotes(
                    id,
                    name
                );
            };

            actions.appendChild(
                notesButton
            );
        }
    }

    // ============================================================
    // CONNECT EXISTING NAVIGATION "INTERVENTION" BUTTON
    // ============================================================

    function isInterventionElement(element) {

        if (!element) {
            return false;
        }

        const text =
            (
                element.textContent ||
                ""
            )
                .replace(/\s+/g, " ")
                .trim()
                .toLowerCase();

        const id =
            String(
                element.id ||
                ""
            ).toLowerCase();

        const className =
            String(
                element.className ||
                ""
            ).toLowerCase();

        return (
            text.includes("intervention") ||
            id.includes("intervention") ||
            className.includes("intervention")
        );
    }

    function connectNavigationInterventionButton() {

        const elements =
            Array.from(
                document.querySelectorAll(
                    [
                        "a",
                        "button",
                        "[role='button']",
                        ".nav-item",
                        ".nav-link",
                        ".sidebar-item",
                        ".sidebar-link"
                    ].join(",")
                )
            );

        for (const element of elements) {

            if (
                !isInterventionElement(
                    element
                )
            ) {
                continue;
            }

            if (
                element.dataset
                    .interventionConnected ===
                "true"
            ) {
                continue;
            }

            element.dataset
                .interventionConnected =
                "true";

            element.addEventListener(
                "click",
                event => {

                    event.preventDefault();
                    event.stopPropagation();

                    openInterventionStart();
                },
                true
            );
        }
    }

    // ============================================================
    // MUTATION OBSERVER
    // ============================================================

    function observeFacultyPage() {

        const observer =
            new MutationObserver(
                () => {

                    connectNavigationInterventionButton();

                    ensureProfileButtons();
                }
            );

        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );

        setInterval(
            () => {

                connectNavigationInterventionButton();

                ensureProfileButtons();

            },
            1000
        );
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================

    window.addEventListener(
        "DOMContentLoaded",
        () => {

            injectStyles();

            connectNavigationInterventionButton();

            ensureProfileButtons();

            observeFacultyPage();
        }
    );

})();