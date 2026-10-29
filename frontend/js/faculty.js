/**
 * AI Student Success Platform — Faculty Dashboard Controller
 */

let currentFaculty = null;
let currentStudentId = null;
let currentPage = 1;
const pageSize = 15;
let totalStudentsCount = 0;
let charts = {};

// API Helper
async function apiCall(endpoint, options = {}) {
    const token = window.getAuthToken ? window.getAuthToken() : "";
    const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(options.headers || {})
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(endpoint, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
        if (window.logout) window.logout();
        throw new Error("Session expired or unauthorized");
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "API Error" }));
        throw new Error(err.detail || err.message || `HTTP ${res.status}`);
    }
    return res.json();
}

// Toast Helper
function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : '⚠️'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3500);
}

// ============================================================
// RESILIENT MODULAR INITIALIZATION ARCHITECTURE
// ============================================================

async function initializeFacultyDashboard() {
    console.log("Faculty dashboard initializing...");
    try { initializeNavigation(); } catch (e) { console.error("Navigation init error:", e); }
    try { setupFilters(); } catch (e) { console.error("Filters init error:", e); }
    try { setupModals(); } catch (e) { console.error("Modals init error:", e); }
    try { await loadFacultyProfile(); } catch (e) { console.error("Faculty profile init error:", e); }
    try { await loadDashboardSummary(); } catch (e) { console.error("Dashboard summary init error:", e); }
    try { await loadStudentsTable(); } catch (e) { console.error("Students table init error:", e); }
    try { await loadNotifications(); } catch (e) { console.error("Notifications init error:", e); }
    try { initializeInterventions(); } catch (e) { console.error("Interventions init error:", e); }
    try { initializeMessages(); } catch (e) { console.error("Messages init error:", e); }
    try { initializeNotes(); } catch (e) { console.error("Notes init error:", e); }
    try { initializeAI(); } catch (e) { console.error("AI init error:", e); }
    console.log("Faculty dashboard initialized successfully.");
}

// Global hook to allow manual re-initialization if ever needed
window.initializeFacultyDashboard = initializeFacultyDashboard;

// Auto-run when DOM is ready or immediately if already loaded
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeFacultyDashboard);
} else {
    initializeFacultyDashboard();
}

// 1. Navigation Initializer
function initializeNavigation() {
    setupNavigation();
    console.log("Navigation initialized");
}

function setupNavigation() {
    const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            const section = item.getAttribute("data-section");
            if (!section) return;
            e.preventDefault();
            navItems.forEach(n => n.classList.remove("active"));
            item.classList.add("active");

            // Hide all sections, show target
            document.querySelectorAll(".page-section").forEach(sec => sec.style.display = "none");
            const targetSec = document.getElementById(section);
            if (targetSec) targetSec.style.display = "block";

            // If At-Risk clicked, preset risk filter to High Risk
            if (section === "sec-students" && item.getAttribute("data-filter") === "high") {
                const rf = document.getElementById("riskFilter");
                if (rf) {
                    rf.value = "High Risk";
                    currentPage = 1;
                    loadStudentsTable();
                }
            } else if (section === "sec-interventions") {
                loadAllInterventions();
            } else if (section === "sec-notifications") {
                loadFullNotificationsSection();
            } else if (section === "sec-messages") {
                loadConversationsInbox();
            } else if (section === "sec-manage-notes") {
                loadFacultyNotes();
            }
        });
    });
}

// 2. Interventions Initializer
function initializeInterventions() {
    console.log("Interventions initialized");
}

// 3. Messages Initializer
function initializeMessages() {
    console.log("Messages initialized");
}

// 4. Notes Initializer
function initializeNotes() {
    console.log("Notes initialized");
}

// 5. AI Initializer
function initializeAI() {
    console.log("AI assistant initialized");
}

// Load Faculty Profile
async function loadFacultyProfile() {
    try {
        const data = await apiCall("/api/faculty/me");
        currentFaculty = data;
        const nameEl = document.getElementById("facultyNameDisplay");
        if (nameEl) nameEl.textContent = data.name || "Faculty Advisor";
        const deptEl = document.getElementById("facultyDeptDisplay");
        if (deptEl) deptEl.textContent = data.department || "Academic Mentor";
    } catch (e) {
        console.error("Failed to load faculty profile:", e);
    }
}

// Load Institutional Summary KPIs & Charts
async function loadDashboardSummary() {
    try {
        const summary = await apiCall("/api/summary");
        console.log("Summary received:", summary);

        // Update KPI Cards with comprehensive property mapping
        const total = summary.total_students ?? summary.totalStudents ?? 0;
        const high = summary.high_risk_students ?? summary.high_risk ?? summary.highRisk ?? summary.immediate_support ?? 0;
        const med = summary.medium_risk_students ?? summary.medium_risk ?? summary.mediumRisk ?? summary.needs_attention ?? 0;
        const low = summary.low_risk_students ?? summary.low_risk ?? summary.lowRisk ?? summary.on_track ?? 0;
        const cgpa = summary.average_cgpa ?? summary.avg_cgpa ?? summary.cgpa ?? 0;
        const att = summary.average_attendance ?? summary.avg_attendance ?? summary.attendance ?? 0;
        const activeInt = summary.active_interventions ?? summary.pending_interventions ?? summary.requiring_intervention ?? 0;

        const elTotal = document.getElementById("totalStudents");
        if (elTotal) elTotal.textContent = total;
        const elHigh = document.getElementById("highRiskStudents");
        if (elHigh) elHigh.textContent = high;
        const elMed = document.getElementById("mediumRiskStudents");
        if (elMed) elMed.textContent = med;
        const elLow = document.getElementById("lowRiskStudents");
        if (elLow) elLow.textContent = low;
        const elCgpa = document.getElementById("avgCgpa");
        if (elCgpa) elCgpa.textContent = Number(cgpa).toFixed(2);
        const elAtt = document.getElementById("avgAttendance");
        if (elAtt) elAtt.textContent = `${Number(att).toFixed(1)}%`;
        const elInt = document.getElementById("activeInterventions");
        if (elInt) elInt.textContent = activeInt;

        renderCharts(summary);
    } catch (e) {
        console.error("Failed to load summary:", e);
        showToast("Unable to load institutional KPIs", "error");
    }
}

// Render Chart.js Visualizations
function renderCharts(summary) {
    if (typeof Chart === "undefined") {
        console.warn("Chart.js not loaded, skipping chart rendering");
        return;
    }

    const high = summary.high_risk_students ?? summary.high_risk ?? summary.highRisk ?? summary.immediate_support ?? 0;
    const med = summary.medium_risk_students ?? summary.medium_risk ?? summary.mediumRisk ?? summary.needs_attention ?? 0;
    const low = summary.low_risk_students ?? summary.low_risk ?? summary.lowRisk ?? summary.on_track ?? 0;

    // 1. Risk Distribution Donut Chart
    const riskCanvas = document.getElementById("riskChart");
    if (riskCanvas) {
        const riskCtx = riskCanvas.getContext("2d");
        if (charts.risk) {
            try { charts.risk.destroy(); } catch (e) {}
        }
        charts.risk = new Chart(riskCtx, {
            type: "doughnut",
            data: {
                labels: ["High Risk", "Medium Risk", "Low Risk"],
                datasets: [{
                    data: [high, med, low],
                    backgroundColor: ["#ef4444", "#f59e0b", "#10b981"],
                    borderWidth: 2,
                    borderColor: "#ffffff"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "bottom" }
                }
            }
        });
    }

    // 2. Department Breakdown Bar Chart
    const deptCanvas = document.getElementById("deptChart");
    const departments = summary.departments || summary.department_enrollment || [];
    if (deptCanvas && Array.isArray(departments) && departments.length > 0) {
        const deptCtx = deptCanvas.getContext("2d");
        if (charts.dept) {
            try { charts.dept.destroy(); } catch (e) {}
        }
        const labels = departments.map(d => d.course || d.department || d.name || "Dept");
        const counts = departments.map(d => d.count || d.students || 0);

        charts.dept = new Chart(deptCtx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: "Students Enrolled",
                    data: counts,
                    backgroundColor: "#3b82f6",
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
}

// Search and Table Filters
function setupFilters() {
    const searchInput = document.getElementById("tableSearch");
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener("input", () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentPage = 1;
                loadStudentsTable();
            }, 300);
        });
    }

    const riskFilter = document.getElementById("riskFilter");
    if (riskFilter) {
        riskFilter.addEventListener("change", () => {
            currentPage = 1;
            loadStudentsTable();
        });
    }

    const deptFilter = document.getElementById("deptFilter");
    if (deptFilter) {
        deptFilter.addEventListener("change", () => {
            currentPage = 1;
            loadStudentsTable();
        });
    }
}

// Load Students Table
async function loadStudentsTable() {
    const tbody = document.getElementById("studentsTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 24px;">Loading students...</td></tr>`;

    const search = document.getElementById("tableSearch")?.value || "";
    const risk = document.getElementById("riskFilter")?.value || "All";
    const dept = document.getElementById("deptFilter")?.value || "All";

    try {
        let url = `/api/students?page=${currentPage}&page_size=${pageSize}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (risk !== "All") url += `&risk=${encodeURIComponent(risk)}`;
        if (dept !== "All") url += `&department=${encodeURIComponent(dept)}`;

        const students = await apiCall(url);
        tbody.innerHTML = "";

        if (!students || students.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 24px; color: #64748b;">No matching student records found.</td></tr>`;
            return;
        }

        students.forEach(s => {
            const tr = document.createElement("tr");

            let badgeClass = "badge-low-risk";
            if (s.risk_level.toLowerCase().includes("high")) badgeClass = "badge-high-risk";
            else if (s.risk_level.toLowerCase().includes("medium")) badgeClass = "badge-medium-risk";

            tr.innerHTML = `
                <td><strong>${s.student_id}</strong></td>
                <td>${s.name}</td>
                <td>${s.course || s.department}</td>
                <td>Sem ${s.semester}</td>
                <td><strong>${s.cgpa.toFixed(2)}</strong></td>
                <td>${s.attendance}%</td>
                <td><span class="badge ${badgeClass}">${s.risk_level}</span></td>
                <td><strong>${s.success_score}</strong>/100</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="openStudentDetail('${s.student_id}')">
                        View Profile
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Update pagination display
        const pageDisplay = document.getElementById("pageInfo");
        if (pageDisplay) {
            pageDisplay.textContent = `Page ${currentPage}`;
        }
    } catch (e) {
        console.error("Failed to load students:", e);
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: #ef4444; padding: 20px;">Failed to load students.</td></tr>`;
    }
}

// Pagination Controls
window.prevPage = function () {
    if (currentPage > 1) {
        currentPage--;
        loadStudentsTable();
    }
};

window.nextPage = function () {
    currentPage++;
    loadStudentsTable();
};

// Open Student Profile Modal
window.openStudentDetail = async function (studentId) {
    currentStudentId = studentId;
    const modal = document.getElementById("studentModal");
    if (!modal) return;

    modal.classList.add("active");
    modal.style.display = "flex";
    modal.style.pointerEvents = "auto";

    try {
        const student = await apiCall(`/api/students/${studentId}`);
        renderStudentModal(student);
    } catch (e) {
        console.error("Failed to fetch student details:", e);
        showToast("Could not load student profile", "error");
    }
};

// Render Student Details Modal
function renderStudentModal(s) {
    document.getElementById("modalStudentName").textContent = s.name;
    document.getElementById("modalStudentId").textContent = s.student_id;
    document.getElementById("modalStudentCourse").textContent = `${s.course} • Semester ${s.semester} • ${s.email}`;

    // Metrics
    document.getElementById("modalCgpa").textContent = s.cgpa.toFixed(2);
    document.getElementById("modalAttendance").textContent = `${s.attendance}%`;
    document.getElementById("modalBacklogs").textContent = s.backlogs;
    document.getElementById("modalScore").textContent = s.success_score;

    // AI Root Cause Explanation
    document.getElementById("modalAiExplanation").innerHTML = `
        <strong>AI Risk Diagnosis (${s.risk_level}):</strong><br>
        ${s.ai_explanation}
    `;

    // Risk factors tags
    const factorsContainer = document.getElementById("modalRiskFactors");
    factorsContainer.innerHTML = "";
    (s.risk_factors || []).forEach(factor => {
        const tag = document.createElement("span");
        tag.className = "risk-factor-tag";
        tag.textContent = factor;
        factorsContainer.appendChild(tag);
    });

    // Populate Tab Lists
    renderInterventionsTab(s.interventions || []);
    renderNotesTab(s.notes || []);
    renderGoalsTab(s.goals || []);
    loadMessagesThread(s.student_id);

    // Reset to Overview tab
    switchModalTab("tab-overview");
}

// Modal Tabs Switcher
window.switchModalTab = function (tabId) {
    document.querySelectorAll(".modal-tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.remove("active"));

    const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeBtn) activeBtn.classList.add("active");

    const activePane = document.getElementById(tabId);
    if (activePane) activePane.classList.add("active");
};

// Setup Modal Events
function setupModals() {
    // Ensure all backdrops are closed on initialization
    document.querySelectorAll(".modal-backdrop").forEach(m => {
        m.classList.remove("active");
        m.style.display = "none";
        m.style.pointerEvents = "none";
    });

    document.querySelectorAll(".modal-close").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".modal-backdrop").forEach(m => {
                m.classList.remove("active");
                m.style.display = "none";
                m.style.pointerEvents = "none";
            });
        });
    });

    // Close on backdrop click
    document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
        backdrop.addEventListener("click", (e) => {
            if (e.target === backdrop) {
                backdrop.classList.remove("active");
                backdrop.style.display = "none";
                backdrop.style.pointerEvents = "none";
            }
        });
    });

    // Tab buttons
    document.querySelectorAll(".modal-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const tabId = btn.getAttribute("data-tab");
            switchModalTab(tabId);
        });
    });
}

// Render Interventions in Modal Tab
function renderInterventionsTab(interventions) {
    const container = document.getElementById("modalInterventionsList");
    if (!container) return;
    container.innerHTML = "";

    if (!interventions || interventions.length === 0) {
        container.innerHTML = `<div style="color: #64748b; font-size: 0.85rem;">No active interventions recorded for this student.</div>`;
        return;
    }

    interventions.forEach(item => {
        const div = document.createElement("div");
        div.className = "intervention-item";
        div.innerHTML = `
            <div class="intervention-top">
                <span class="intervention-title">${item.title}</span>
                <span class="badge badge-pending">${item.status}</span>
            </div>
            <div class="intervention-desc">${item.description}</div>
            <div style="font-size: 0.75rem; color: #64748b;">
                Priority: <strong>${item.priority}</strong> • Due: ${item.due_date || 'N/A'} • Assigned: ${new Date(item.created_at).toLocaleDateString()}
            </div>
            ${item.student_response ? `
                <div class="intervention-response-box">
                    <strong>Student Response:</strong> "${item.student_response}"
                </div>
            ` : ''}
            ${item.status !== 'Resolved' ? `
                <div class="btn-group" style="margin-top: 8px;">
                    <button class="btn btn-outline btn-xs" onclick="updateInterventionStatus('${item.intervention_id}', 'Resolved')">
                        ✓ Mark as Resolved
                    </button>
                </div>
            ` : ''}
        `;
        container.appendChild(div);
    });
}

// Render Notes Tab
function renderNotesTab(notes) {
    const container = document.getElementById("modalNotesList");
    if (!container) return;
    container.innerHTML = "";

    if (!notes || notes.length === 0) {
        container.innerHTML = `<div style="color: #64748b; font-size: 0.85rem;">No faculty notes added yet.</div>`;
        return;
    }

    notes.forEach(note => {
        const div = document.createElement("div");
        div.style.padding = "10px 14px";
        div.style.background = "#f8fafc";
        div.style.border = "1px solid #e2e8f0";
        div.style.borderRadius = "8px";
        div.innerHTML = `
            <div style="font-weight: 700; font-size: 0.85rem; color: #0f172a;">${note.title}</div>
            <div style="font-size: 0.82rem; color: #334155; margin-top: 4px;">${note.message}</div>
            <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 4px;">${new Date(note.created_at).toLocaleString()}</div>
        `;
        container.appendChild(div);
    });
}

// Render Student Goals Tab
function renderGoalsTab(goals) {
    const container = document.getElementById("modalGoalsList");
    if (!container) return;
    container.innerHTML = "";

    if (!goals || goals.length === 0) {
        container.innerHTML = `<div style="color: #64748b; font-size: 0.85rem;">Student has not set any goals yet.</div>`;
        return;
    }

    goals.forEach(g => {
        const card = document.createElement("div");
        card.className = "goal-card";
        card.innerHTML = `
            <div class="goal-header">
                <span class="goal-title">${g.title}</span>
                <span class="badge ${g.status === 'Completed' ? 'badge-completed' : 'badge-in-progress'}">${g.status}</span>
            </div>
            <div style="font-size: 0.8rem; color: #475569;">${g.description || ''}</div>
            <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: ${g.progress}%;"></div>
            </div>
            <div class="goal-footer">
                <span>Progress: ${g.progress}%</span>
                <span>Target: ${g.target_date || 'Flexible'}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

// Load Conversation Messages
async function loadMessagesThread(studentId) {
    const container = document.getElementById("modalChatThread");
    if (!container) return;
    container.innerHTML = `<div style="color: #64748b; font-size: 0.8rem; text-align: center;">Loading messages...</div>`;

    try {
        const messages = await apiCall(`/api/students/${studentId}/messages`);
        container.innerHTML = "";
        if (!messages || messages.length === 0) {
            container.innerHTML = `<div style="color: #94a3b8; font-size: 0.8rem; text-align: center; padding: 12px;">No messages exchanged yet. Send a message below to reach out to the student.</div>`;
            return;
        }

        messages.forEach(m => {
            const bubble = document.createElement("div");
            bubble.className = `chat-bubble ${m.sender_role}`;
            bubble.innerHTML = `
                <div class="sender">${m.sender_name} (${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</div>
                <div>${m.message}</div>
            `;
            container.appendChild(bubble);
        });
        container.scrollTop = container.scrollHeight;
    } catch (e) {
        container.innerHTML = `<div style="color: #ef4444; font-size: 0.8rem;">Could not load messages.</div>`;
    }
}

// Submit New Intervention
window.submitInterventionForm = async function (e) {
    e.preventDefault();
    if (!currentStudentId) return;

    const title = document.getElementById("intTitle").value;
    const type = document.getElementById("intType").value;
    const priority = document.getElementById("intPriority").value;
    const due_date = document.getElementById("intDueDate").value;
    const description = document.getElementById("intDescription").value;

    try {
        await apiCall("/api/interventions", {
            method: "POST",
            body: JSON.stringify({
                student_id: currentStudentId,
                title,
                type,
                priority,
                due_date,
                description
            })
        });

        showToast("Intervention created & student notified!");
        document.getElementById("createInterventionForm").reset();

        // Refresh modal interventions and summary
        const student = await apiCall(`/api/students/${currentStudentId}`);
        renderInterventionsTab(student.interventions || []);
        loadDashboardSummary();
    } catch (e) {
        showToast(e.message || "Failed to create intervention", "error");
    }
};

// Submit New Faculty Note
window.submitNoteForm = async function (e) {
    e.preventDefault();
    if (!currentStudentId) return;

    const title = document.getElementById("noteTitle").value;
    const message = document.getElementById("noteMessage").value;

    try {
        await apiCall(`/api/students/${currentStudentId}/notes`, {
            method: "POST",
            body: JSON.stringify({ title, message })
        });

        showToast("Note saved to student profile!");
        document.getElementById("createNoteForm").reset();

        const student = await apiCall(`/api/students/${currentStudentId}`);
        renderNotesTab(student.notes || []);
    } catch (e) {
        showToast(e.message || "Failed to add note", "error");
    }
};

// Send Message in Thread
window.sendMessageInThread = async function (e) {
    e.preventDefault();
    if (!currentStudentId) return;

    const input = document.getElementById("threadMessageInput");
    const message = input.value.trim();
    if (!message) return;

    try {
        await apiCall(`/api/students/${currentStudentId}/messages`, {
            method: "POST",
            body: JSON.stringify({ message })
        });
        input.value = "";
        await loadMessagesThread(currentStudentId);
        showToast("Message sent to student!");
    } catch (e) {
        showToast(e.message || "Failed to send message", "error");
    }
};

// Print / View Performance Report
window.printStudentReport = async function () {
    if (!currentStudentId) return;
    try {
        const report = await apiCall(`/api/students/${currentStudentId}/report`);
        const win = window.open("", "_blank");
        win.document.write(`
            <html>
            <head>
                <title>Performance Report - ${report.student.name} (${report.student.student_id})</title>
                <style>
                    body { font-family: sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; }
                    .header { border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
                    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
                    .meta-box { background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
                    .box-lbl { font-size: 11px; color: #64748b; text-transform: uppercase; }
                    .box-val { font-size: 18px; font-weight: bold; margin-top: 4px; }
                    .section { margin-bottom: 24px; }
                    h2 { font-size: 16px; color: #1e3a8a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
                    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
                    th { background: #f1f5f9; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Student Performance & Success Report</h1>
                    <div><strong>${report.student.name}</strong> • ${report.student.student_id} • ${report.student.course} • Semester ${report.student.semester}</div>
                </div>
                <div class="meta-grid">
                    <div class="meta-box"><div class="box-lbl">CGPA</div><div class="box-val">${report.student.cgpa.toFixed(2)}</div></div>
                    <div class="meta-box"><div class="box-lbl">Attendance</div><div class="box-val">${report.student.attendance}%</div></div>
                    <div class="meta-box"><div class="box-lbl">Success Score</div><div class="box-val">${report.student.success_score}/100</div></div>
                    <div class="meta-box"><div class="box-lbl">Risk Level</div><div class="box-val">${report.student.risk_level}</div></div>
                </div>
                <div class="section">
                    <h2>AI Academic Analysis</h2>
                    <p>${report.student.ai_explanation}</p>
                </div>
                <div class="section">
                    <h2>Subject Performance</h2>
                    <table>
                        <thead><tr><th>Subject</th><th>Credits</th><th>Grade</th><th>Score</th><th>Status</th></tr></thead>
                        <tbody>
                            ${(report.performance?.subjects || []).map(s => `
                                <tr><td>${s.name}</td><td>${s.credits}</td><td>${s.grade}</td><td>${s.score}</td><td>${s.status}</td></tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="section">
                    <h2>Active Interventions (${(report.interventions || []).length})</h2>
                    ${(report.interventions || []).map(i => `
                        <div style="margin-bottom: 10px; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px;">
                            <strong>${i.title}</strong> (${i.status}) - ${i.description}
                        </div>
                    `).join('')}
                </div>
                <script>window.print();</script>
            </body>
            </html>
        `);
        win.document.close();
    } catch (e) {
        showToast("Failed to generate report", "error");
    }
};

// Notifications Bell & Dropdown
async function loadNotifications() {
    try {
        const notifs = await apiCall("/api/notifications");
        const count = notifs.filter(n => !n.is_read).length;
        const badge = document.getElementById("unreadNotifCount");
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? "flex" : "none";
        }

        const list = document.getElementById("notificationList");
        if (list) {
            list.innerHTML = "";
            if (notifs.length === 0) {
                list.innerHTML = `<div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 0.8rem;">No notifications.</div>`;
                return;
            }
            notifs.forEach(n => {
                const item = document.createElement("div");
                item.className = `notif-item ${!n.is_read ? 'unread' : ''}`;
                item.innerHTML = `
                    <div class="notif-title">${n.title}</div>
                    <div class="notif-message">${n.message}</div>
                    <div class="notif-time">${new Date(n.created_at).toLocaleString()}</div>
                `;
                item.addEventListener("click", async () => {
                    await apiCall(`/api/notifications/${n.notification_id}/read`, { method: "PATCH" });
                    await loadNotifications();
                });
                list.appendChild(item);
            });
        }
    } catch (e) {
        console.error("Failed to load notifications:", e);
    }
}

window.toggleNotificationDropdown = function () {
    const dd = document.getElementById("notificationDropdown");
    if (dd) dd.classList.toggle("active");
};

window.markAllNotificationsRead = async function () {
    try {
        await apiCall("/api/notifications/read-all", { method: "POST" });
        await loadNotifications();
        showToast("All notifications marked as read");
        const box = document.getElementById("fullNotificationList");
        if (box && box.offsetParent !== null) {
            loadFullNotificationsSection();
        }
    } catch (e) {
        showToast("Could not mark notifications read", "error");
    }
};

// Update intervention status (e.g. resolve)
window.updateInterventionStatus = async function (id, newStatus) {
    try {
        await apiCall(`/api/interventions/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: newStatus })
        });
        showToast(`Intervention marked as ${newStatus}`);
        if (currentStudentId) {
            const student = await apiCall(`/api/students/${currentStudentId}`);
            renderInterventionsTab(student.interventions);
        }
        const allList = document.getElementById("allInterventionsList");
        if (allList && allList.offsetParent !== null) {
            loadAllInterventions();
        }
    } catch (e) {
        showToast("Failed to update status", "error");
    }
};

// Cache structures for new features
let allInterventionsCache = [];
let allFacultyNotesCache = [];
let inboxConversationsCache = [];
let activeConvId = null;
let activeThreadInterventionId = null;
let cachedStudentsList = [];

// ============================================================
// NOTIFICATIONS & UNREAD INDICATORS
// ============================================================
async function loadNotifications() {
    try {
        const summary = await apiCall("/api/notifications/summary").catch(() => null);
        const notifs = await apiCall("/api/notifications").catch(() => []);

        const count = summary ? summary.total_unread : notifs.filter(n => !n.is_read).length;
        const msgUnread = summary ? summary.messages_unread : 0;

        const badge = document.getElementById("unreadNotifCount");
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? "flex" : "none";
        }

        const sidebarMsgBadge = document.getElementById("sidebarMsgBadge");
        if (sidebarMsgBadge) {
            sidebarMsgBadge.textContent = msgUnread;
            sidebarMsgBadge.style.display = msgUnread > 0 ? "inline-block" : "none";
        }

        const list = document.getElementById("notificationList");
        if (list) {
            list.innerHTML = "";
            if (notifs.length === 0) {
                list.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">No notifications.</div>`;
                return;
            }
            notifs.forEach(n => {
                const item = document.createElement("div");
                item.className = `notif-item ${!n.is_read ? 'unread' : ''}`;
                item.innerHTML = `
                    <div class="notif-title">${n.title}</div>
                    <div class="notif-message">${n.message}</div>
                    <div class="notif-time">${new Date(n.created_at).toLocaleString()}</div>
                `;
                item.addEventListener("click", async () => {
                    await apiCall(`/api/notifications/${n.notification_id}/read`, { method: "PATCH" });
                    await loadNotifications();
                });
                list.appendChild(item);
            });
        }
    } catch (e) {
        console.error("Failed to load notifications:", e);
    }
}

// ============================================================
// TWO-WAY INTERVENTIONS MANAGEMENT
// ============================================================

window.loadAllInterventions = async function () {
    const list = document.getElementById("allInterventionsList");
    if (!list) return;
    try {
        const items = await apiCall("/api/interventions");
        allInterventionsCache = items || [];
        renderInterventionsList(allInterventionsCache);
    } catch (e) {
        list.innerHTML = `<div style="color: var(--risk-high-text); font-size: 0.85rem;">Failed to load interventions list.</div>`;
    }
};

function renderInterventionsList(items) {
    const list = document.getElementById("allInterventionsList");
    if (!list) return;

    if (!items || items.length === 0) {
        list.innerHTML = `<div style="color: var(--text-secondary); font-size: 0.85rem; padding: 24px; text-align: center; background: #ffffff; border: 1px dashed var(--border); border-radius: var(--radius-md);">No interventions match the selected criteria.</div>`;
        return;
    }

    list.innerHTML = "";
    items.forEach(item => {
        const el = document.createElement("div");
        el.className = "intervention-item";

        // Badges
        const sLower = (item.status || "open").toLowerCase().replace(" ", "-");
        const statusBadge = `badge-${sLower}`;

        const pLower = (item.priority || "medium").toLowerCase();
        const priorityBadge = `badge-${pLower}`;

        const replyCount = item.reply_count || (item.student_response ? 1 : 0);

        el.innerHTML = `
            <div class="intervention-top">
                <div>
                    <strong style="color: var(--navy); font-size: 1rem;">${item.title}</strong>
                    <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 3px;">
                        Student: <b>${item.student_name || item.student_id}</b> (${item.student_id}) 
                        ${item.student_course ? `• ${item.student_course}` : ''}
                    </div>
                </div>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <span class="badge ${priorityBadge}">${item.priority}</span>
                    <span class="badge ${statusBadge}">${item.status}</span>
                </div>
            </div>

            <div class="intervention-desc" style="margin-top: 8px; line-height: 1.5;">${item.description}</div>

            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-secondary); margin-top: 8px; border-top: 1px solid #f1f5f9; padding-top: 8px;">
                <div>
                    Category: <strong>${item.type}</strong> &nbsp;•&nbsp; 
                    Assigned: ${new Date(item.created_at).toLocaleDateString()} &nbsp;•&nbsp;
                    Due: <strong>${item.due_date || 'None'}</strong>
                </div>
                <span class="badge badge-open" style="font-size: 0.72rem;">
                    💬 ${replyCount} ${replyCount === 1 ? 'message' : 'messages'}
                </span>
            </div>

            ${item.student_response ? `
                <div class="intervention-response-box" style="margin-top: 8px; background: #f8fafc; border-left: 3px solid var(--primary); padding: 8px 12px; border-radius: 4px; font-size: 0.8rem;">
                    <strong>Latest Student Reply:</strong> "${item.student_response}"
                </div>
            ` : ''}

            <div class="btn-group" style="margin-top: 12px; display: flex; gap: 8px;">
                <button type="button" class="btn btn-primary btn-xs" onclick="openInterventionThread('${item.intervention_id}')">
                    💬 View Conversation & Reply
                </button>
                <button type="button" class="btn btn-secondary btn-xs" onclick="openStudentDetail('${item.student_id}')">
                    👤 Student Profile
                </button>
                ${item.status !== 'Resolved' && item.status !== 'Closed' ? `
                    <button type="button" class="btn btn-outline btn-xs" onclick="updateInterventionStatus('${item.intervention_id}', 'Resolved')">
                        ✓ Mark Resolved
                    </button>
                ` : ''}
            </div>
        `;
        list.appendChild(el);
    });
}

window.filterInterventionsList = function () {
    const statusVal = document.getElementById("intStatusFilter")?.value || "all";
    const priorityVal = document.getElementById("intPriorityFilter")?.value || "all";
    const searchVal = (document.getElementById("intSearchInput")?.value || "").trim().toLowerCase();

    const filtered = allInterventionsCache.filter(item => {
        const matchesStatus = statusVal === "all" || (item.status && item.status.toLowerCase() === statusVal.toLowerCase());
        const matchesPriority = priorityVal === "all" || (item.priority && item.priority.toLowerCase() === priorityVal.toLowerCase());
        const matchesSearch = !searchVal || 
            (item.title && item.title.toLowerCase().includes(searchVal)) ||
            (item.student_id && item.student_id.toLowerCase().includes(searchVal)) ||
            (item.student_name && item.student_name.toLowerCase().includes(searchVal)) ||
            (item.description && item.description.toLowerCase().includes(searchVal));

        return matchesStatus && matchesPriority && matchesSearch;
    });

    renderInterventionsList(filtered);
};

// ============================================================
// NEW INTERVENTION MODAL
// ============================================================

window.openNewInterventionModal = async function () {
    const modal = document.getElementById("newInterventionModal");
    if (!modal) return;

    modal.classList.add("active");
    modal.style.display = "flex";
    modal.style.pointerEvents = "auto";

    // Populate student dropdown if empty
    const select = document.getElementById("newIntStudentSelect");
    if (select && select.options.length <= 1) {
        select.innerHTML = `<option value="">Loading students...</option>`;
        try {
            const data = await apiCall("/api/students?page_size=100");
            cachedStudentsList = Array.isArray(data) ? data : (data.students || []);
            select.innerHTML = `<option value="">-- Choose a student to mentor --</option>`;
            cachedStudentsList.forEach(s => {
                const opt = document.createElement("option");
                opt.value = s.student_id;
                opt.textContent = `${s.student_id} — ${s.name} (${s.course || 'Engg'}) • CGPA: ${s.cgpa.toFixed(2)} • Att: ${s.attendance}%`;
                select.appendChild(opt);
            });
        } catch (e) {
            select.innerHTML = `<option value="">Failed to load students</option>`;
        }
    }
};

window.closeNewInterventionModal = function () {
    const modal = document.getElementById("newInterventionModal");
    if (modal) {
        modal.classList.remove("active");
        modal.style.display = "none";
        modal.style.pointerEvents = "none";
    }
    const form = document.getElementById("newInterventionForm");
    if (form) form.reset();
    const preview = document.getElementById("newIntStudentPreview");
    if (preview) preview.style.display = "none";
};

window.onNewIntStudentChange = function () {
    const select = document.getElementById("newIntStudentSelect");
    const preview = document.getElementById("newIntStudentPreview");
    if (!select || !preview) return;

    const sid = select.value;
    if (!sid) {
        preview.style.display = "none";
        return;
    }

    const student = cachedStudentsList.find(s => s.student_id === sid);
    if (!student) {
        preview.style.display = "none";
        return;
    }

    document.getElementById("previewStudentName").textContent = student.name;
    document.getElementById("previewStudentMeta").textContent = `ID: ${student.student_id} • ${student.course || 'Engineering'} • Semester ${student.semester || 4}`;
    document.getElementById("previewStudentCgpa").textContent = student.cgpa ? student.cgpa.toFixed(2) : "0.00";
    document.getElementById("previewStudentAtt").textContent = `${student.attendance || 0}%`;
    document.getElementById("previewStudentBacklogs").textContent = student.backlogs || 0;

    const riskBadge = document.getElementById("previewStudentRisk");
    if (riskBadge) {
        riskBadge.textContent = student.risk_level;
        riskBadge.className = `badge ${student.risk_level === 'High Risk' ? 'badge-high-risk' : (student.risk_level === 'Medium Risk' ? 'badge-medium-risk' : 'badge-low-risk')}`;
    }

    preview.style.display = "block";
};

window.submitNewInterventionForm = async function (e) {
    e.preventDefault();
    const sid = document.getElementById("newIntStudentSelect").value;
    const category = document.getElementById("newIntCategory").value;
    const priority = document.getElementById("newIntPriority").value;
    const title = document.getElementById("newIntTitle").value.trim();
    const description = document.getElementById("newIntDescription").value.trim();
    const actionType = document.getElementById("newIntActionType").value;
    const dueDate = document.getElementById("newIntDueDate").value;

    if (!sid || !title || !description) {
        showToast("Please fill all required fields", "error");
        return;
    }

    const btn = document.getElementById("submitNewIntBtn");
    if (btn) btn.disabled = true;

    try {
        await apiCall("/api/interventions", {
            method: "POST",
            body: JSON.stringify({
                student_id: sid,
                type: category,
                priority: priority,
                title: title,
                description: description,
                action_type: actionType,
                due_date: dueDate
            })
        });

        showToast("Intervention assigned successfully!");
        closeNewInterventionModal();
        await loadAllInterventions();
        await loadDashboardSummary();
    } catch (err) {
        showToast(err.message || "Failed to create intervention", "error");
    } finally {
        if (btn) btn.disabled = false;
    }
};

// ============================================================
// TWO-WAY INTERVENTION THREAD MODAL
// ============================================================

window.openInterventionThread = async function (interventionId) {
    activeThreadInterventionId = interventionId;
    const modal = document.getElementById("interventionThreadModal");
    if (!modal) return;

    modal.classList.add("active");
    modal.style.display = "flex";
    modal.style.pointerEvents = "auto";

    const container = document.getElementById("threadRepliesContainer");
    if (container) container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px;">Loading conversation thread...</div>`;

    try {
        const data = await apiCall(`/api/interventions/${interventionId}`);
        document.getElementById("threadIntTitle").textContent = data.title;
        document.getElementById("threadIntSubtitle").textContent = `${data.student_name || data.student_id} (${data.student_id}) • ${data.type}`;

        const pBadge = document.getElementById("threadIntPriorityBadge");
        if (pBadge) {
            pBadge.textContent = data.priority;
            pBadge.className = `badge badge-${data.priority.toLowerCase()}`;
        }

        const sBadge = document.getElementById("threadIntStatusBadge");
        if (sBadge) {
            sBadge.textContent = data.status;
            sBadge.className = `badge badge-${data.status.toLowerCase().replace(' ', '-')}`;
        }

        const statusSelect = document.getElementById("threadStatusSelect");
        if (statusSelect) statusSelect.value = data.status;

        renderThreadReplies(data.replies || []);
    } catch (err) {
        if (container) container.innerHTML = `<div style="color: var(--risk-high-text); text-align: center;">Failed to load conversation thread.</div>`;
    }
};

window.closeInterventionThreadModal = function () {
    const modal = document.getElementById("interventionThreadModal");
    if (modal) {
        modal.classList.remove("active");
        modal.style.display = "none";
        modal.style.pointerEvents = "none";
    }
    activeThreadInterventionId = null;
    const form = document.getElementById("threadReplyForm");
    if (form) form.reset();
};

function renderThreadReplies(replies) {
    const container = document.getElementById("threadRepliesContainer");
    if (!container) return;

    if (!replies || replies.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">No messages recorded yet. Type a reply below.</div>`;
        return;
    }

    container.innerHTML = "";
    replies.forEach(rep => {
        const isFaculty = (rep.sender_role === "faculty");
        const row = document.createElement("div");
        row.className = `conv-bubble-row ${isFaculty ? 'sent' : 'received'}`;
        row.innerHTML = `
            <div class="conv-avatar" style="${isFaculty ? 'background: #dbeafe; color: #1d4ed8;' : 'background: #e2e8f0; color: #334155;'}">
                ${isFaculty ? 'FA' : 'ST'}
            </div>
            <div class="conv-bubble-content">
                <div style="font-size: 0.72rem; font-weight: 700; opacity: 0.85; margin-bottom: 2px;">
                    ${rep.sender_name} • ${new Date(rep.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </div>
                <div>${rep.message}</div>
            </div>
        `;
        container.appendChild(row);
    });

    container.scrollTop = container.scrollHeight;
}

window.submitInterventionThreadReply = async function (e) {
    e.preventDefault();
    if (!activeThreadInterventionId) return;

    const input = document.getElementById("threadReplyInput");
    const msg = (input?.value || "").trim();
    if (!msg) return;

    const btn = document.getElementById("threadSendReplyBtn");
    if (btn) btn.disabled = true;

    try {
        const res = await apiCall(`/api/interventions/${activeThreadInterventionId}/reply`, {
            method: "POST",
            body: JSON.stringify({ message: msg })
        });

        if (input) input.value = "";
        showToast("Reply sent to student!");

        // Refresh thread
        if (res.intervention?.replies) {
            renderThreadReplies(res.intervention.replies);
        } else {
            const refreshed = await apiCall(`/api/interventions/${activeThreadInterventionId}`);
            renderThreadReplies(refreshed.replies || []);
        }

        await loadAllInterventions();
    } catch (err) {
        showToast(err.message || "Failed to send reply", "error");
    } finally {
        if (btn) btn.disabled = false;
    }
};

window.updateThreadStatus = async function () {
    if (!activeThreadInterventionId) return;
    const statusSelect = document.getElementById("threadStatusSelect");
    const newStatus = statusSelect?.value;
    if (!newStatus) return;

    try {
        await apiCall(`/api/interventions/${activeThreadInterventionId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: newStatus })
        });

        showToast(`Status updated to '${newStatus}'`);
        const sBadge = document.getElementById("threadIntStatusBadge");
        if (sBadge) {
            sBadge.textContent = newStatus;
            sBadge.className = `badge badge-${newStatus.toLowerCase().replace(' ', '-')}`;
        }
        await loadAllInterventions();
    } catch (err) {
        showToast("Failed to update status", "error");
    }
};

// ============================================================
// STUDENT MESSAGES & INBOX (TWO-WAY CONVERSATIONS)
// ============================================================

window.loadConversationsInbox = async function () {
    const listContainer = document.getElementById("conversationsListContainer");
    if (!listContainer) return;

    try {
        const convs = await apiCall("/api/conversations");
        inboxConversationsCache = convs || [];
        renderConversationsList(inboxConversationsCache);

        const totalBadge = document.getElementById("inboxTotalCount");
        if (totalBadge) totalBadge.textContent = `${inboxConversationsCache.length} total`;

        // If active conversation is selected, keep it; else select first
        if (activeConvId && inboxConversationsCache.some(c => c.conversation_id === activeConvId)) {
            selectConversation(activeConvId);
        } else if (inboxConversationsCache.length > 0) {
            selectConversation(inboxConversationsCache[0].conversation_id);
        }
    } catch (err) {
        listContainer.innerHTML = `<div style="padding: 16px; color: var(--risk-high-text); font-size: 0.8rem;">Failed to load student messages.</div>`;
    }
};

function renderConversationsList(convs) {
    const listContainer = document.getElementById("conversationsListContainer");
    if (!listContainer) return;

    if (!convs || convs.length === 0) {
        listContainer.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.82rem;">No student conversations yet.</div>`;
        return;
    }

    listContainer.innerHTML = "";
    convs.forEach(c => {
        const item = document.createElement("div");
        item.className = `conv-item ${c.conversation_id === activeConvId ? 'active' : ''}`;
        item.onclick = () => selectConversation(c.conversation_id);

        const unread = c.unread_count || 0;

        item.innerHTML = `
            <div class="conv-avatar">
                ${(c.student_name || 'ST').substring(0, 2).toUpperCase()}
            </div>
            <div class="conv-details">
                <div class="conv-top-line">
                    <span class="conv-name">${c.student_name || c.student_id}</span>
                    <span class="conv-time">${new Date(c.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                </div>
                <div class="conv-subject">${c.subject || 'Academic Guidance'}</div>
                <div class="conv-snippet">${c.last_message || 'No messages yet'}</div>
            </div>
            ${unread > 0 ? `<span class="badge badge-urgent" style="font-size: 0.68rem; padding: 2px 6px;">${unread}</span>` : ''}
        `;
        listContainer.appendChild(item);
    });
}

window.filterConversationsList = function () {
    const q = (document.getElementById("inboxSearchInput")?.value || "").trim().toLowerCase();
    const filtered = inboxConversationsCache.filter(c => {
        return !q ||
            (c.student_name && c.student_name.toLowerCase().includes(q)) ||
            (c.student_id && c.student_id.toLowerCase().includes(q)) ||
            (c.subject && c.subject.toLowerCase().includes(q)) ||
            (c.last_message && c.last_message.toLowerCase().includes(q));
    });
    renderConversationsList(filtered);
};

window.selectConversation = async function (convId) {
    activeConvId = convId;

    // Highlight in list
    document.querySelectorAll(".conv-item").forEach(item => item.classList.remove("active"));
    const convItems = document.querySelectorAll(".conv-item");
    // Re-render list to reflect active and clear unread badge
    renderConversationsList(inboxConversationsCache);

    const messagesBox = document.getElementById("activeConvMessagesContainer");
    if (messagesBox) messagesBox.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px;">Loading conversation...</div>`;

    try {
        const conv = await apiCall(`/api/conversations/${convId}`);

        // Render header
        document.getElementById("activeConvStudentName").textContent = `${conv.student_name || conv.student_id} (${conv.student_id})`;
        document.getElementById("activeConvStudentMeta").textContent = `${conv.student_course || 'Course'} • CGPA: ${conv.student_cgpa ? conv.student_cgpa.toFixed(2) : 'N/A'} • Attendance: ${conv.student_attendance || 0}%`;

        const badgesEl = document.getElementById("activeConvBadges");
        if (badgesEl) {
            const rClass = conv.student_risk === 'High Risk' ? 'badge-high-risk' : (conv.student_risk === 'Medium Risk' ? 'badge-medium-risk' : 'badge-low-risk');
            badgesEl.innerHTML = `<span class="badge ${rClass}">${conv.student_risk || 'Low Risk'}</span>`;
        }

        // Render messages
        renderActiveConvMessages(conv.messages || []);

        // Show reply bar
        const replyBar = document.getElementById("convReplyBar");
        if (replyBar) replyBar.style.display = "block";

        // Refresh unread indicators
        await loadNotifications();
    } catch (err) {
        if (messagesBox) messagesBox.innerHTML = `<div style="color: var(--risk-high-text); text-align: center;">Could not load conversation.</div>`;
    }
};

function renderActiveConvMessages(messages) {
    const box = document.getElementById("activeConvMessagesContainer");
    if (!box) return;

    if (!messages || messages.length === 0) {
        box.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px;">No messages in this conversation yet. Send a response below.</div>`;
        return;
    }

    box.innerHTML = "";
    messages.forEach(m => {
        const isFaculty = (m.sender_role === "faculty");
        const row = document.createElement("div");
        row.className = `conv-bubble-row ${isFaculty ? 'sent' : 'received'}`;
        row.innerHTML = `
            <div class="conv-avatar" style="${isFaculty ? 'background: #dbeafe; color: #1d4ed8;' : 'background: #e2e8f0; color: #334155;'}">
                ${isFaculty ? 'FA' : 'ST'}
            </div>
            <div class="conv-bubble-content">
                <div style="font-size: 0.72rem; font-weight: 700; opacity: 0.85; margin-bottom: 2px;">
                    ${m.sender_name} • ${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div>${m.message}</div>
            </div>
        `;
        box.appendChild(row);
    });

    box.scrollTop = box.scrollHeight;
}

window.submitFacultyConversationReply = async function (e) {
    e.preventDefault();
    if (!activeConvId) return;

    const input = document.getElementById("facultyReplyInput");
    const msg = (input?.value || "").trim();
    if (!msg) return;

    const btn = document.getElementById("facultySendReplyBtn");
    if (btn) btn.disabled = true;

    try {
        const res = await apiCall(`/api/conversations/${activeConvId}/reply`, {
            method: "POST",
            body: JSON.stringify({ message: msg })
        });

        if (input) input.value = "";
        showToast("Reply sent to student!");

        if (res.conversation?.messages) {
            renderActiveConvMessages(res.conversation.messages);
        } else {
            const refreshed = await apiCall(`/api/conversations/${activeConvId}`);
            renderActiveConvMessages(refreshed.messages || []);
        }

        // Update conversation snippet in cached list
        const cached = inboxConversationsCache.find(c => c.conversation_id === activeConvId);
        if (cached) {
            cached.last_message = msg;
            cached.last_message_at = new Date().toISOString();
            renderConversationsList(inboxConversationsCache);
        }
    } catch (err) {
        showToast(err.message || "Failed to send reply", "error");
    } finally {
        if (btn) btn.disabled = false;
    }
};

// ============================================================
// FACULTY STUDY NOTES & RESOURCES
// ============================================================

window.openUploadNotesModal = function () {
    const modal = document.getElementById("uploadNotesModal");
    if (modal) {
        modal.classList.add("active");
        modal.style.display = "flex";
        modal.style.pointerEvents = "auto";
    }
    const nameInput = document.getElementById("uploadFacultyName");
    if (nameInput && currentFaculty?.name) {
        nameInput.value = currentFaculty.name;
    }
};

window.closeUploadNotesModal = function () {
    const modal = document.getElementById("uploadNotesModal");
    if (modal) {
        modal.classList.remove("active");
        modal.style.display = "none";
        modal.style.pointerEvents = "none";
    }
    const form = document.getElementById("uploadNotesForm");
    if (form) form.reset();
};

window.submitUploadNotesForm = async function (e) {
    e.preventDefault();
    const title = document.getElementById("uploadNotesTitle").value.trim();
    const subjectName = document.getElementById("uploadSubjectName").value.trim();
    const subjectCode = document.getElementById("uploadSubjectCode").value.trim();
    const description = document.getElementById("uploadNotesDesc").value.trim();
    const semester = document.getElementById("uploadSemester").value;
    const facultyName = document.getElementById("uploadFacultyName").value.trim();
    const fileInput = document.getElementById("uploadFileInput");

    if (!fileInput || !fileInput.files[0]) {
        showToast("Please select a file to upload", "error");
        return;
    }

    const file = fileInput.files[0];
    const allowed = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".txt"];
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) {
        showToast("Only PDF, DOC, DOCX, PPT, PPTX, and TXT files are allowed", "error");
        return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("subject_name", subjectName);
    formData.append("subject_code", subjectCode);
    formData.append("description", description);
    formData.append("semester", semester);
    formData.append("faculty_name", facultyName || (currentFaculty?.name || "Faculty Advisor"));
    formData.append("file", file);

    const btn = document.getElementById("submitUploadNotesBtn");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Uploading...";
    }

    const token = window.getAuthToken ? window.getAuthToken() : "";
    try {
        const res = await fetch("/api/faculty/notes", {
            method: "POST",
            headers: token ? { "Authorization": `Bearer ${token}` } : {},
            body: formData
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({ detail: "Upload failed" }));
            throw new Error(errData.detail || "Upload failed");
        }

        showToast("Study material uploaded and published successfully!");
        closeUploadNotesModal();
        await loadFacultyNotes();
    } catch (err) {
        showToast(err.message || "Failed to upload notes", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Upload Material";
        }
    }
};

window.loadFacultyNotes = async function () {
    const grid = document.getElementById("facultyNotesGrid");
    if (!grid) return;

    try {
        const notes = await apiCall("/api/study-materials");
        allFacultyNotesCache = notes || [];

        // Populate subject filter
        const subFilter = document.getElementById("notesSubjectFilter");
        if (subFilter) {
            const subjects = Array.from(new Set(allFacultyNotesCache.map(n => n.subject_name).filter(Boolean)));
            subFilter.innerHTML = `<option value="all">All Subjects</option>`;
            subjects.forEach(s => {
                const opt = document.createElement("option");
                opt.value = s;
                opt.textContent = s;
                subFilter.appendChild(opt);
            });
        }

        renderFacultyNotesGrid(allFacultyNotesCache);
    } catch (err) {
        grid.innerHTML = `<div style="color: var(--risk-high-text); font-size: 0.85rem;">Failed to load study materials.</div>`;
    }
};

function renderFacultyNotesGrid(notes) {
    const grid = document.getElementById("facultyNotesGrid");
    if (!grid) return;

    if (!notes || notes.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 30px; background: #ffffff; border: 1px dashed var(--border); border-radius: var(--radius-md);">No study materials published yet. Click "+ Upload Notes" above to add course resources.</div>`;
        return;
    }

    grid.innerHTML = "";
    notes.forEach(note => {
        const card = document.createElement("div");
        card.className = "study-card";

        const fType = (note.file_type || "pdf").toLowerCase();
        const fSizeKb = note.file_size ? `${Math.round(note.file_size / 1024)} KB` : "";

        card.innerHTML = `
            <div class="study-card-top">
                <span class="study-subject-badge">${note.subject_name} ${note.subject_code ? `(${note.subject_code})` : ''}</span>
                <div class="study-file-icon ${fType}">${fType}</div>
            </div>
            <div class="study-card-title">${note.title}</div>
            <div class="study-card-desc">${note.description || 'No description provided.'}</div>
            <div style="font-size: 0.74rem; color: var(--text-secondary); margin-bottom: 12px;">
                Instructor: <b>${note.faculty_name}</b> &nbsp;•&nbsp; 
                Semester: <b>${note.semester ? `Sem ${note.semester}` : 'All'}</b> 
                ${fSizeKb ? `• ${fSizeKb}` : ''}
            </div>
            <div class="study-card-footer">
                <span>${new Date(note.created_at).toLocaleDateString()}</span>
                <div style="display: flex; gap: 6px;">
                    <a href="${note.file_url}" target="_blank" class="btn btn-primary btn-xs" style="text-decoration: none;">
                        ⬇ View / Download
                    </a>
                    <button type="button" class="btn btn-outline btn-xs" onclick="openEditNoteModal('${note.material_id}')">
                        ✏️ Edit
                    </button>
                    <button type="button" class="btn btn-outline btn-xs" style="color: #ef4444; border-color: #fca5a5;" onclick="deleteFacultyNote('${note.material_id}', '${note.title.replace(/'/g, "\\'")}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.filterFacultyNotesList = function () {
    const subVal = document.getElementById("notesSubjectFilter")?.value || "all";
    const q = (document.getElementById("notesSearchInput")?.value || "").trim().toLowerCase();

    const filtered = allFacultyNotesCache.filter(n => {
        const matchesSub = subVal === "all" || (n.subject_name && n.subject_name.toLowerCase() === subVal.toLowerCase());
        const matchesQ = !q ||
            (n.title && n.title.toLowerCase().includes(q)) ||
            (n.description && n.description.toLowerCase().includes(q)) ||
            (n.subject_name && n.subject_name.toLowerCase().includes(q)) ||
            (n.subject_code && n.subject_code.toLowerCase().includes(q));
        return matchesSub && matchesQ;
    });

    renderFacultyNotesGrid(filtered);
};

window.deleteFacultyNote = async function (materialId, title) {
    if (!confirm(`Are you sure you want to permanently delete "${title}"? This cannot be undone.`)) {
        return;
    }

    try {
        await apiCall(`/api/faculty/notes/${materialId}`, { method: "DELETE" });
        showToast("Study material deleted successfully");
        await loadFacultyNotes();
    } catch (err) {
        showToast(err.message || "Failed to delete notes", "error");
    }
};

window.openEditNoteModal = function (materialId) {
    const note = allFacultyNotesCache.find(n => n.material_id === materialId);
    if (!note) return;

    document.getElementById("editNoteId").value = note.material_id;
    document.getElementById("editNotesTitle").value = note.title;
    document.getElementById("editNotesSubject").value = note.subject_name;
    document.getElementById("editNotesCode").value = note.subject_code || "";
    document.getElementById("editNotesDesc").value = note.description || "";
    document.getElementById("editNotesSemester").value = note.semester || 0;

    const modal = document.getElementById("editNotesModal");
    if (modal) {
        modal.classList.add("active");
        modal.style.display = "flex";
        modal.style.pointerEvents = "auto";
    }
};

window.closeEditNotesModal = function () {
    const modal = document.getElementById("editNotesModal");
    if (modal) {
        modal.classList.remove("active");
        modal.style.display = "none";
        modal.style.pointerEvents = "none";
    }
};

window.submitEditNotesForm = async function (e) {
    e.preventDefault();
    const id = document.getElementById("editNoteId").value;
    const title = document.getElementById("editNotesTitle").value.trim();
    const subjectName = document.getElementById("editNotesSubject").value.trim();
    const subjectCode = document.getElementById("editNotesCode").value.trim();
    const description = document.getElementById("editNotesDesc").value.trim();
    const semester = parseInt(document.getElementById("editNotesSemester").value, 10);

    try {
        await apiCall(`/api/faculty/notes/${id}`, {
            method: "PUT",
            body: JSON.stringify({
                title: title,
                subject_name: subjectName,
                subject_code: subjectCode,
                description: description,
                semester: semester
            })
        });

        showToast("Study material metadata updated!");
        closeEditNotesModal();
        await loadFacultyNotes();
    } catch (err) {
        showToast(err.message || "Failed to update study material", "error");
    }
};

// Load Full Notifications Section
window.loadFullNotificationsSection = async function () {
    const box = document.getElementById("fullNotificationList");
    if (!box) return;
    try {
        const notifs = await apiCall("/api/notifications");
        if (!notifs || notifs.length === 0) {
            box.innerHTML = `<div style="color: var(--text-secondary); padding: 12px 0;">No notifications received yet.</div>`;
            return;
        }
        box.innerHTML = "";
        notifs.forEach(n => {
            const item = document.createElement("div");
            item.style.padding = "12px 14px";
            item.style.border = "1px solid var(--border)";
            item.style.background = n.is_read ? "#ffffff" : "#f0fdf4";
            item.style.borderRadius = "var(--radius-sm)";
            item.style.marginBottom = "6px";
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="font-size: 0.85rem; color: var(--navy);">${n.title}</strong>
                    <span style="font-size: 0.72rem; color: var(--text-secondary);">${new Date(n.created_at).toLocaleString()}</span>
                </div>
                <div style="font-size: 0.82rem; color: var(--navy-text); margin-top: 4px;">${n.message}</div>
            `;
            box.appendChild(item);
        });
    } catch (e) {
        box.innerHTML = `<div style="color: var(--risk-high-text);">Failed to load notifications.</div>`;
    }
};

// Quick Generate Report from Reports section
window.quickGenerateReport = async function () {
    const input = document.getElementById("reportStudentIdInput");
    const sid = (input?.value || "").trim().toUpperCase();
    if (!sid) {
        showToast("Please enter a Student ID", "error");
        if (input) input.focus();
        return;
    }
    currentStudentId = sid;
    printStudentReport();
};
