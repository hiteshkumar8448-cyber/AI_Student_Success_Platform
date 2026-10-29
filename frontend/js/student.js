/**
 * AI Student Success Platform — Student Portal Controller
 */

let currentStudent = null;
let activeInterventionId = null;
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

// Initialization
document.addEventListener("DOMContentLoaded", async () => {
    setupNavigation();
    setupModals();
    await loadStudentData();
    await loadNotifications();
});

// Setup sidebar navigation
function setupNavigation() {
    const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            const section = item.getAttribute("data-section");
            if (!section) return;
            e.preventDefault();
            navItems.forEach(n => n.classList.remove("active"));
            item.classList.add("active");

            document.querySelectorAll(".page-section").forEach(sec => sec.style.display = "none");
            const target = document.getElementById(section);
            if (target) target.style.display = "block";

            if (section === "sec-student-materials") {
                loadStudentMaterials();
            } else if (section === "sec-student-interventions") {
                loadStudentInterventions();
            } else if (section === "sec-student-messages") {
                if (currentStudent) loadMessagesThread(currentStudent.student_id);
            }
        });
    });
}

// Load Full Student Profile & Connected Data
async function loadStudentData() {
    try {
        const s = await apiCall("/api/student/me");
        currentStudent = s;

        // Top Navigation & Identity
        document.getElementById("studentNameDisplay").textContent = s.name;
        document.getElementById("studentIdDisplay").textContent = `${s.student_id} • ${s.course} • Sem ${s.semester}`;
        document.getElementById("sidebarStudentName").textContent = s.name;
        document.getElementById("sidebarStudentId").textContent = s.student_id;

        // KPI Cards
        document.getElementById("studentCgpa").textContent = s.cgpa.toFixed(2);
        const cgpaDiffEl = document.getElementById("studentCgpaDiff");
        if (cgpaDiffEl) {
            const diff = s.cgpa_change || 0;
            cgpaDiffEl.textContent = diff >= 0 ? `+${diff.toFixed(2)} vs prev sem` : `${diff.toFixed(2)} vs prev sem`;
            cgpaDiffEl.style.color = diff >= 0 ? '#10b981' : '#ef4444';
        }

        document.getElementById("studentAttendance").textContent = `${s.attendance}%`;
        const attStatusEl = document.getElementById("attendanceStatus");
        if (attStatusEl) {
            attStatusEl.textContent = s.attendance >= 75 ? "Safe (Above 75%)" : "Warning: Below 75% requirement";
            attStatusEl.style.color = s.attendance >= 75 ? '#10b981' : '#ef4444';
        }

        document.getElementById("studentSuccessScore").textContent = `${s.success_score}/100`;
        document.getElementById("studentAssignmentRate").textContent = `${s.assignment_completion}%`;

        // Risk Level Badge
        const riskEl = document.getElementById("studentRiskLevel");
        if (riskEl) {
            riskEl.textContent = s.risk_level;
            riskEl.className = "badge";
            if (s.risk_level.toLowerCase().includes("high")) riskEl.classList.add("badge-high-risk");
            else if (s.risk_level.toLowerCase().includes("medium")) riskEl.classList.add("badge-medium-risk");
            else riskEl.classList.add("badge-low-risk");
        }

        // AI Diagnosis & Recommendations
        document.getElementById("studentAiExplanation").innerHTML = `
            <strong>AI Performance Analysis:</strong><br>${s.ai_explanation}
        `;

        const factorsContainer = document.getElementById("studentRiskFactors");
        if (factorsContainer) {
            factorsContainer.innerHTML = "";
            (s.risk_factors || []).forEach(factor => {
                const tag = document.createElement("span");
                tag.className = "risk-factor-tag";
                tag.textContent = factor;
                factorsContainer.appendChild(tag);
            });
        }

        const recContainer = document.getElementById("studentRecommendations");
        if (recContainer) {
            recContainer.innerHTML = "";
            (s.recommendations || []).forEach(rec => {
                const card = document.createElement("div");
                card.className = "rec-card";
                card.innerHTML = `<span class="rec-icon">💡</span><div class="rec-text">${rec}</div>`;
                recContainer.appendChild(card);
            });
        }

        // Render Interventions, Goals, & Messages
        renderInterventions(s.interventions || []);
        renderGoals(s.goals || []);
        await loadPerformanceCharts(s.student_id);
        await loadMessagesThread(s.student_id);

    } catch (e) {
        console.error("Failed to load student dashboard:", e);
        showToast("Could not load student profile", "error");
    }
}

// Load Charts & Semester Timeline
async function loadPerformanceCharts(studentId) {
    if (typeof Chart === "undefined") return;

    try {
        const perf = await apiCall(`/api/students/${studentId}/performance`);

        // 1. Semester Timeline Donut / Bar / Line
        const semCtx = document.getElementById("studentProgressionChart")?.getContext("2d");
        if (semCtx && perf.timeline) {
            if (charts.progression) charts.progression.destroy();
            const labels = perf.timeline.map(t => t.semester);
            const gpas = perf.timeline.map(t => t.gpa);
            const attendances = perf.timeline.map(t => t.attendance);

            charts.progression = new Chart(semCtx, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: "Semester GPA",
                            data: gpas,
                            borderColor: "#2563eb",
                            backgroundColor: "rgba(37, 99, 235, 0.1)",
                            tension: 0.3,
                            fill: true,
                            yAxisID: "y"
                        },
                        {
                            label: "Attendance %",
                            data: attendances,
                            borderColor: "#10b981",
                            borderDash: [5, 5],
                            tension: 0.3,
                            yAxisID: "y1"
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { min: 0, max: 10, position: "left", title: { display: true, text: "GPA" } },
                        y1: { min: 0, max: 100, position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: "Attendance %" } }
                    }
                }
            });
        }

        // 2. Subject Breakdown Chart
        const subCtx = document.getElementById("studentSubjectChart")?.getContext("2d");
        if (subCtx && perf.subjects) {
            if (charts.subjects) charts.subjects.destroy();
            const subLabels = perf.subjects.map(s => s.code);
            const subScores = perf.subjects.map(s => s.score);

            charts.subjects = new Chart(subCtx, {
                type: "bar",
                data: {
                    labels: subLabels,
                    datasets: [{
                        label: "Subject Score (out of 100)",
                        data: subScores,
                        backgroundColor: subScores.map(score => score < 50 ? "#ef4444" : score < 70 ? "#f59e0b" : "#10b981"),
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { min: 0, max: 100 }
                    }
                }
            });
        }

        // Render Semester Timeline Cards
        const timelineList = document.getElementById("semesterTimelineList");
        if (timelineList && perf.timeline) {
            timelineList.innerHTML = "";
            perf.timeline.forEach(t => {
                const c = document.createElement("div");
                c.className = `timeline-card ${t.sem_number === currentStudent.semester ? 'current' : ''}`;
                c.innerHTML = `
                    <div class="timeline-sem">${t.semester}</div>
                    <div class="timeline-gpa">${t.gpa.toFixed(2)}</div>
                    <div style="font-size: 0.72rem; color: #64748b;">${t.attendance}% Att.</div>
                    <div style="font-size: 0.7rem; font-weight: 600; color: #2563eb;">${t.status}</div>
                `;
                timelineList.appendChild(c);
            });
        }

    } catch (e) {
        console.error("Failed to load performance charts:", e);
    }
}

let studentMaterialsCache = [];

// Load and Render Two-Way Faculty Interventions
window.loadStudentInterventions = async function () {
    try {
        const interventions = await apiCall("/api/interventions");
        renderInterventions(interventions || []);
    } catch (e) {
        console.error("Failed to load interventions:", e);
    }
};

// Render Faculty Interventions with Two-Way Conversation Threads
async function renderInterventions(interventions) {
    const container = document.getElementById("studentInterventionsList");
    if (!container) return;
    container.innerHTML = "";

    if (!interventions || interventions.length === 0) {
        container.innerHTML = `
            <div style="background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 28px; text-align: center; color: #64748b;">
                🎉 Excellent standing! No active faculty interventions required at this time.
            </div>
        `;
        return;
    }

    for (const item of interventions) {
        // Fetch full thread details if replies not embedded
        let threadReplies = item.replies || [];
        if (!item.replies) {
            try {
                const fullInt = await apiCall(`/api/interventions/${item.intervention_id}`);
                threadReplies = fullInt.replies || [];
            } catch (e) {
                threadReplies = [];
            }
        }

        const pClass = `priority-${(item.priority || 'medium').toLowerCase()}`;
        const sLower = (item.status || 'open').toLowerCase().replace(' ', '-');
        const statusBadge = `badge-${sLower}`;

        const div = document.createElement("div");
        div.className = `intervention-item ${pClass}`;

        let repliesHtml = "";
        if (threadReplies && threadReplies.length > 0) {
            repliesHtml = `
                <div style="margin-top: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid var(--border);">
                    <div style="font-size: 0.76rem; font-weight: 700; color: var(--navy); margin-bottom: 8px; display: flex; justify-content: space-between;">
                        <span>💬 Mentoring Conversation Thread</span>
                        <span>${threadReplies.length} ${threadReplies.length === 1 ? 'message' : 'messages'}</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px; max-height: 240px; overflow-y: auto;">
                        ${threadReplies.map(r => {
                            const isStudent = (r.sender_role === 'student');
                            return `
                                <div style="display: flex; gap: 8px; ${isStudent ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}">
                                    <div style="max-width: 85%; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; ${isStudent ? 'background: #2563eb; color: #ffffff;' : 'background: #ffffff; border: 1px solid #e2e8f0; color: #0f172a;'}">
                                        <div style="font-size: 0.68rem; font-weight: 700; opacity: 0.85; margin-bottom: 2px;">
                                            ${r.sender_name} • ${new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div>${r.message}</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        div.innerHTML = `
            <div class="intervention-top">
                <span class="intervention-title">⚠️ ${item.title}</span>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <span class="badge badge-${(item.priority || 'medium').toLowerCase()}">${item.priority}</span>
                    <span class="badge ${statusBadge}">${item.status}</span>
                </div>
            </div>
            <div class="intervention-desc" style="margin-top: 6px;">${item.description}</div>
            <div style="font-size: 0.78rem; color: #64748b; margin-top: 6px;">
                Category: <strong>${item.type}</strong> • Assigned by Faculty: <strong>${item.faculty_id}</strong> • Due: <strong>${item.due_date || 'N/A'}</strong>
            </div>

            ${repliesHtml}

            <!-- Quick Inline Reply Composer -->
            <form onsubmit="submitInlineInterventionReply(event, '${item.intervention_id}')" style="margin-top: 12px; display: flex; gap: 8px;">
                <input type="text" class="form-control" placeholder="Write a reply or proposed action plan to your mentor..." required style="flex: 1; font-size: 0.82rem;">
                <button type="submit" class="btn btn-primary btn-sm">
                    Reply ➤
                </button>
                ${item.status === 'Open' || item.status === 'Pending' ? `
                    <button type="button" class="btn btn-secondary btn-sm" onclick="acknowledgeIntervention('${item.intervention_id}')">
                        Acknowledge
                    </button>
                ` : ''}
            </form>
        `;
        container.appendChild(div);
    }
}

// Acknowledge Intervention
window.acknowledgeIntervention = async function (id) {
    try {
        await apiCall(`/api/interventions/${id}/acknowledge`, { method: "POST" });
        showToast("Intervention acknowledged!");
        await loadStudentData();
        await loadStudentInterventions();
    } catch (e) {
        showToast(e.message || "Failed to acknowledge", "error");
    }
};

// Inline Reply to Intervention
window.submitInlineInterventionReply = async function (e, interventionId) {
    e.preventDefault();
    const input = e.target.querySelector("input");
    const text = (input?.value || "").trim();
    if (!text) return;

    try {
        await apiCall(`/api/interventions/${interventionId}/reply`, {
            method: "POST",
            body: JSON.stringify({ message: text })
        });
        showToast("Reply sent to your faculty mentor!");
        input.value = "";
        await loadStudentInterventions();
        await loadStudentData();
    } catch (err) {
        showToast(err.message || "Failed to send reply", "error");
    }
};

// Open Respond Modal
window.openRespondModal = function (id, title) {
    activeInterventionId = id;
    document.getElementById("respondIntTitle").textContent = title;
    document.getElementById("respondModal").classList.add("active");
};

// Submit Response to Intervention via Modal
window.submitInterventionResponse = async function (e) {
    e.preventDefault();
    if (!activeInterventionId) return;

    const text = document.getElementById("responseText").value.trim();
    if (!text) return;

    try {
        await apiCall(`/api/interventions/${activeInterventionId}/reply`, {
            method: "POST",
            body: JSON.stringify({ message: text })
        });
        showToast("Response submitted to faculty mentor!");
        document.getElementById("respondModal").classList.remove("active");
        document.getElementById("respondForm").reset();
        await loadStudentData();
        await loadStudentInterventions();
    } catch (e) {
        showToast(e.message || "Failed to submit response", "error");
    }
};

// ============================================================
// STUDENT STUDY MATERIALS & FACULTY NOTES
// ============================================================

window.loadStudentMaterials = async function () {
    const grid = document.getElementById("studentMaterialsGrid");
    if (!grid) return;

    try {
        const materials = await apiCall("/api/study-materials");
        studentMaterialsCache = materials || [];

        // Populate subject filter
        const subFilter = document.getElementById("studentNotesSubjectFilter");
        if (subFilter) {
            const subjects = Array.from(new Set(studentMaterialsCache.map(m => m.subject_name).filter(Boolean)));
            subFilter.innerHTML = `<option value="all">All Subjects</option>`;
            subjects.forEach(s => {
                const opt = document.createElement("option");
                opt.value = s;
                opt.textContent = s;
                subFilter.appendChild(opt);
            });
        }

        renderStudentMaterials(studentMaterialsCache);
    } catch (e) {
        grid.innerHTML = `<div style="color: var(--risk-high-text); font-size: 0.85rem;">Failed to load study materials.</div>`;
    }
};

function renderStudentMaterials(materials) {
    const grid = document.getElementById("studentMaterialsGrid");
    if (!grid) return;

    if (!materials || materials.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 30px; background: #ffffff; border: 1px dashed var(--border); border-radius: var(--radius-md);">No study materials available for your enrolled subjects yet. Check back soon!</div>`;
        return;
    }

    grid.innerHTML = "";
    materials.forEach(mat => {
        const card = document.createElement("div");
        card.className = "study-card";

        const fType = (mat.file_type || "pdf").toLowerCase();
        const fSizeKb = mat.file_size ? `${Math.round(mat.file_size / 1024)} KB` : "";

        card.innerHTML = `
            <div class="study-card-top">
                <span class="study-subject-badge">${mat.subject_name} ${mat.subject_code ? `(${mat.subject_code})` : ''}</span>
                <div class="study-file-icon ${fType}">${fType}</div>
            </div>
            <div class="study-card-title">${mat.title}</div>
            <div class="study-card-desc">${mat.description || 'Lecture reference notes published by course faculty.'}</div>
            <div style="font-size: 0.76rem; color: var(--text-secondary); margin-bottom: 12px;">
                Instructor: <b>${mat.faculty_name}</b> • Semester: <b>${mat.semester ? `Sem ${mat.semester}` : 'All'}</b>
                ${fSizeKb ? ` • ${fSizeKb}` : ''}
            </div>
            <div class="study-card-footer">
                <span>Published: ${new Date(mat.created_at).toLocaleDateString()}</span>
                <a href="${mat.file_url}" target="_blank" class="btn btn-primary btn-xs" style="text-decoration: none;">
                    ⬇ View / Download
                </a>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.filterStudentMaterials = function () {
    const subVal = document.getElementById("studentNotesSubjectFilter")?.value || "all";
    const sortVal = document.getElementById("studentNotesSortFilter")?.value || "desc";
    const q = (document.getElementById("studentNotesSearchInput")?.value || "").trim().toLowerCase();

    let filtered = studentMaterialsCache.filter(m => {
        const matchesSub = subVal === "all" || (m.subject_name && m.subject_name.toLowerCase() === subVal.toLowerCase());
        const matchesQ = !q ||
            (m.title && m.title.toLowerCase().includes(q)) ||
            (m.description && m.description.toLowerCase().includes(q)) ||
            (m.subject_name && m.subject_name.toLowerCase().includes(q)) ||
            (m.subject_code && m.subject_code.toLowerCase().includes(q)) ||
            (m.faculty_name && m.faculty_name.toLowerCase().includes(q));
        return matchesSub && matchesQ;
    });

    if (sortVal === "asc") {
        filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else {
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    renderStudentMaterials(filtered);
};


// Render Student Goals
function renderGoals(goals) {
    const container = document.getElementById("studentGoalsList");
    if (!container) return;
    container.innerHTML = "";

    if (!goals || goals.length === 0) {
        container.innerHTML = `
            <div style="color: #64748b; font-size: 0.85rem; padding: 12px;">
                You haven't set any academic goals yet. Click <strong>+ Create Goal</strong> to track your progress!
            </div>
        `;
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
            <div style="font-size: 0.82rem; color: #475569;">${g.description || ''}</div>
            <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: ${g.progress}%;"></div>
            </div>
            <div class="goal-footer">
                <span>Progress: <strong>${g.progress}%</strong></span>
                <span>Deadline: ${g.target_date || 'Flexible'}</span>
            </div>
            <div class="btn-group" style="margin-top: 6px;">
                <button class="btn btn-secondary btn-sm" onclick="promptUpdateGoalProgress('${g.goal_id}', ${g.progress})">Update Progress</button>
                <button class="btn btn-danger btn-sm" onclick="deleteStudentGoal('${g.goal_id}')">Delete</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Create New Goal
window.openCreateGoalModal = function () {
    document.getElementById("goalModal").classList.add("active");
};

window.submitGoalForm = async function (e) {
    e.preventDefault();
    const title = document.getElementById("goalTitle").value.trim();
    const description = document.getElementById("goalDescription").value.trim();
    const target_date = document.getElementById("goalTargetDate").value;
    const progress = parseInt(document.getElementById("goalProgress").value) || 0;

    try {
        await apiCall("/api/goals", {
            method: "POST",
            body: JSON.stringify({
                title,
                description,
                target_date,
                progress,
                status: progress === 100 ? "Completed" : "In Progress"
            })
        });
        showToast("Goal created successfully!");
        document.getElementById("goalModal").classList.remove("active");
        document.getElementById("createGoalForm").reset();
        await loadStudentData();
    } catch (e) {
        showToast(e.message || "Failed to create goal", "error");
    }
};

window.promptUpdateGoalProgress = async function (goalId, currentProgress) {
    const val = prompt("Enter your updated progress percentage (0 - 100):", currentProgress);
    if (val === null) return;
    const progress = parseInt(val);
    if (isNaN(progress) || progress < 0 || progress > 100) {
        alert("Please enter a valid number between 0 and 100.");
        return;
    }

    try {
        await apiCall(`/api/goals/${goalId}`, {
            method: "PATCH",
            body: JSON.stringify({
                progress: progress,
                status: progress === 100 ? "Completed" : "In Progress"
            })
        });
        showToast("Goal progress updated!");
        await loadStudentData();
    } catch (e) {
        showToast(e.message || "Failed to update goal", "error");
    }
};

window.deleteStudentGoal = async function (goalId) {
    if (!confirm("Are you sure you want to delete this goal?")) return;
    try {
        await apiCall(`/api/goals/${goalId}`, { method: "DELETE" });
        showToast("Goal deleted.");
        await loadStudentData();
    } catch (e) {
        showToast(e.message || "Failed to delete goal", "error");
    }
};

// Communication Thread
async function loadMessagesThread(studentId) {
    const container = document.getElementById("studentChatThread");
    if (!container) return;

    try {
        const messages = await apiCall(`/api/students/${studentId}/messages`);
        container.innerHTML = "";
        if (!messages || messages.length === 0) {
            container.innerHTML = `<div style="color: #94a3b8; font-size: 0.82rem; text-align: center; padding: 16px;">No messages yet. Send a message to your faculty advisor below.</div>`;
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

window.sendMessageToFaculty = async function (e) {
    e.preventDefault();
    if (!currentStudent) return;

    const input = document.getElementById("studentMessageInput");
    const msg = input.value.trim();
    if (!msg) return;

    try {
        await apiCall(`/api/students/${currentStudent.student_id}/messages`, {
            method: "POST",
            body: JSON.stringify({ message: msg })
        });
        input.value = "";
        await loadMessagesThread(currentStudent.student_id);
        showToast("Message sent to mentor!");
    } catch (e) {
        showToast(e.message || "Failed to send message", "error");
    }
};

// Notifications Bell & Dropdown
async function loadNotifications() {
    try {
        const summary = await apiCall("/api/notifications/summary").catch(() => null);
        const notifs = await apiCall("/api/notifications").catch(() => []);

        const count = summary ? summary.total_unread : notifs.filter(n => !n.is_read).length;
        const msgCount = summary ? summary.messages_unread : 0;
        const intCount = summary ? summary.interventions_unread : 0;

        const badge = document.getElementById("unreadNotifCount");
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? "flex" : "none";
        }

        const msgBadge = document.getElementById("studentSidebarMsgBadge");
        if (msgBadge) {
            msgBadge.textContent = msgCount;
            msgBadge.style.display = msgCount > 0 ? "inline-block" : "none";
        }

        const intBadge = document.getElementById("studentSidebarIntBadge");
        if (intBadge) {
            intBadge.textContent = intCount;
            intBadge.style.display = intCount > 0 ? "inline-block" : "none";
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
    } catch (e) {
        showToast("Could not mark notifications read", "error");
    }
};

// Setup Modals
function setupModals() {
    document.querySelectorAll(".modal-close").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.remove("active"));
        });
    });
    document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
        backdrop.addEventListener("click", (e) => {
            if (e.target === backdrop) backdrop.classList.remove("active");
        });
    });
}
