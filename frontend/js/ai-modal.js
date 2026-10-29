/**
 * AI Student Success Platform — Student Success AI Assistant Modal Controller
 * Modern High-Contrast AI Assistant Interface
 */

(function () {
    "use strict";

    // Track initialization to avoid duplicate event listeners
    if (window._aiModalInitialized) return;
    window._aiModalInitialized = true;

    // State
    let isSending = false;
    let initialGreetingRendered = false;

    // Helpers to get active session
    function getSessionRole() {
        if (typeof window.getUserRole === "function") {
            const r = window.getUserRole();
            if (r) return r.toLowerCase();
        }
        return (sessionStorage.getItem("user_role") || localStorage.getItem("user_role") || "student").toLowerCase();
    }

    function getSessionUserId() {
        if (typeof window.getUserId === "function") {
            const uid = window.getUserId();
            if (uid) return uid;
        }
        return sessionStorage.getItem("user_id") || localStorage.getItem("user_id") || "";
    }

    function getSessionToken() {
        if (typeof window.getAuthToken === "function") {
            const t = window.getAuthToken();
            if (t) return t;
        }
        return sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || "";
    }

    function getUserDisplayName() {
        return sessionStorage.getItem("user_name") || localStorage.getItem("user_name") || (getSessionRole() === "faculty" ? "Faculty Advisor" : "Student");
    }

    // Modal DOM Elements
    function getElements() {
        return {
            backdrop: document.getElementById("aiModalBackdrop"),
            card: document.querySelector(".ai-modal-card"),
            chatBody: document.getElementById("aiChatBody"),
            chatInput: document.getElementById("aiChatInput"),
            chatForm: document.getElementById("aiChatForm"),
            sendBtn: document.getElementById("aiSendBtn"),
            suggestionsBar: document.getElementById("aiSuggestionsBar"),
            floatingTrigger: document.getElementById("aiFloatingTrigger")
        };
    }

    // Markdown-like text to sanitized HTML
    function formatAiText(text) {
        if (!text) return "";

        // Escape raw HTML entities
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Headers: ### Header -> <h3>Header</h3>
        html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
        html = html.replace(/^##\s+(.+)$/gm, "<h3>$1</h3>");

        // Bold: **text** -> <strong>text</strong>
        html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

        // Italics: *text* -> <em>text</em>
        html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

        // Split into lines for bullet and numbered list processing
        const lines = html.split("\n");
        let formatted = [];
        let inUl = false;
        let inOl = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (!line) {
                if (inUl) { formatted.push("</ul>"); inUl = false; }
                if (inOl) { formatted.push("</ol>"); inOl = false; }
                continue;
            }

            // Bullet items (•, -, *)
            if (/^[•\-\*]\s+(.+)/.test(line)) {
                if (inOl) { formatted.push("</ol>"); inOl = false; }
                if (!inUl) { formatted.push("<ul>"); inUl = true; }
                const item = line.replace(/^[•\-\*]\s+/, "");
                formatted.push(`<li>${item}</li>`);
                continue;
            }

            // Numbered items (1. , 2. )
            if (/^\d+\.\s+(.+)/.test(line)) {
                if (inUl) { formatted.push("</ul>"); inUl = false; }
                if (!inOl) { formatted.push("<ol>"); inOl = true; }
                const item = line.replace(/^\d+\.\s+/, "");
                formatted.push(`<li>${item}</li>`);
                continue;
            }

            // Normal text
            if (inUl) { formatted.push("</ul>"); inUl = false; }
            if (inOl) { formatted.push("</ol>"); inOl = false; }

            if (line.startsWith("<h3>") && line.endsWith("</h3>")) {
                formatted.push(line);
            } else {
                formatted.push(`<p>${line}</p>`);
            }
        }

        if (inUl) formatted.push("</ul>");
        if (inOl) formatted.push("</ol>");

        return formatted.join("");
    }

    // Scroll chat body to bottom
    function scrollToBottom() {
        const { chatBody } = getElements();
        if (chatBody) {
            chatBody.scrollTop = chatBody.scrollHeight;
        }
    }

    // Render Quick Action Suggestion Chips
    function renderSuggestions(suggestions) {
        const { suggestionsBar } = getElements();
        if (!suggestionsBar) return;

        suggestionsBar.innerHTML = "";
        if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
            suggestionsBar.style.display = "none";
            return;
        }

        suggestionsBar.style.display = "flex";
        suggestions.forEach(text => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "ai-suggestion-chip";
            chip.innerHTML = `<span>✨</span><span>${text}</span>`;
            chip.addEventListener("click", () => {
                triggerSuggestion(text);
            });
            suggestionsBar.appendChild(chip);
        });
    }

    // Append a message bubble to the chat
    function appendMessage(role, text) {
        const { chatBody } = getElements();
        if (!chatBody) return;

        const row = document.createElement("div");
        row.className = `ai-chat-row ${role === "user" ? "user" : "assistant"}`;

        const avatar = document.createElement("div");
        avatar.className = "ai-chat-avatar";
        avatar.textContent = (role === "user") ? "👤" : "✨";

        const bubble = document.createElement("div");
        bubble.className = "ai-bubble";

        if (role === "user") {
            bubble.textContent = text;
        } else {
            bubble.innerHTML = formatAiText(text);
        }

        row.appendChild(avatar);
        row.appendChild(bubble);
        chatBody.appendChild(row);
        scrollToBottom();
    }

    // Show / Hide Typing Indicator
    function showTypingIndicator() {
        const { chatBody } = getElements();
        if (!chatBody || document.getElementById("aiTypingIndicator")) return;

        const row = document.createElement("div");
        row.id = "aiTypingIndicator";
        row.className = "ai-chat-row assistant";
        row.innerHTML = `
            <div class="ai-chat-avatar">✨</div>
            <div class="ai-typing-indicator">
                <div class="ai-typing-dot"></div>
                <div class="ai-typing-dot"></div>
                <div class="ai-typing-dot"></div>
            </div>
        `;
        chatBody.appendChild(row);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const el = document.getElementById("aiTypingIndicator");
        if (el) el.remove();
    }

    // Default suggestions based on role
    function getDefaultSuggestions() {
        const role = getSessionRole();
        if (role === "faculty") {
            return [
                "High-Risk Students Summary",
                "Department Risk Analysis",
                "Attendance Trends",
                "Analyze STU1001"
            ];
        }
        return [
            "Analyze My Performance",
            "Why is my risk level high?",
            "How can I improve attendance?",
            "Study Recommendations",
            "Career Guidance"
        ];
    }

    // Render Initial Welcome Greeting
    function renderInitialGreeting() {
        if (initialGreetingRendered) return;
        initialGreetingRendered = true;

        const role = getSessionRole();
        const userName = getUserDisplayName();
        const userId = getSessionUserId();

        let welcomeText = "";
        if (role === "faculty") {
            welcomeText = `### 🎓 Student Success AI Advisor\n\n` +
                `Hello **${userName}**! I am your AI academic advisor assistant connected directly to the live cohort database.\n\n` +
                `You can inquire about institutional trends, at-risk cohorts, department analytics, or ask me to analyze a specific student by ID (e.g. *"Analyze STU1001"*).\n\n` +
                `Choose a quick action below or type any query to get started!`;
        } else {
            welcomeText = `### 🎓 Welcome to Student Success AI\n\n` +
                `Hello **${userName}** (${userId || 'STU1001'})! I am your intelligent academic assistant.\n\n` +
                `I can analyze your attendance trajectory, explain early-warning risk factors, suggest recovery plans, and offer personalized study tips tailored to your coursework.\n\n` +
                `How can I assist your academic journey today?`;
        }

        appendMessage("assistant", welcomeText);
        renderSuggestions(getDefaultSuggestions());
    }

    // Open Modal
    function openAiModal() {
        const { backdrop, chatInput } = getElements();
        if (!backdrop) return;

        backdrop.classList.add("active");
        backdrop.style.display = "flex";
        backdrop.style.pointerEvents = "auto";
        document.body.style.overflow = "hidden"; // Prevent background scrolling

        renderInitialGreeting();

        if (chatInput) {
            setTimeout(() => chatInput.focus(), 80);
        }
    }

    // Close Modal
    function closeAiModal() {
        const { backdrop } = getElements();
        if (!backdrop) return;

        backdrop.classList.remove("active");
        backdrop.style.display = "none";
        backdrop.style.pointerEvents = "none";
        document.body.style.overflow = ""; // Restore background scrolling
    }

    // Backdrop click handler
    function handleAiBackdropClick(event) {
        const { backdrop, card } = getElements();
        if (event.target === backdrop || (card && !card.contains(event.target))) {
            closeAiModal();
        }
    }

    // Send AI Message
    async function sendAiMessage(messageText) {
        if (isSending) return;

        const text = (messageText || "").trim();
        if (!text) return;

        const { chatInput, sendBtn } = getElements();
        if (chatInput) chatInput.value = "";

        // Render user message
        appendMessage("user", text);

        isSending = true;
        if (sendBtn) sendBtn.disabled = true;
        showTypingIndicator();

        const role = getSessionRole();
        const userId = getSessionUserId();
        const token = getSessionToken();

        // Build payload
        const payload = {
            message: text,
            student_id: (role === "student" ? userId : undefined)
        };

        const headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        try {
            // First try /api/ai/chat, fallback to /api/ai-assistant/query
            let res = await fetch("/api/ai/chat", {
                method: "POST",
                headers,
                body: JSON.stringify(payload)
            });

            if (!res.ok && res.status === 404) {
                res = await fetch("/api/ai-assistant/query", {
                    method: "POST",
                    headers,
                    body: JSON.stringify(payload)
                });
            }

            removeTypingIndicator();

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || errData.message || `Server responded with status ${res.status}`);
            }

            const data = await res.json();
            const reply = data.reply || data.response || data.message || "I have received your request, but no response was returned.";

            appendMessage("assistant", reply);

            if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
                renderSuggestions(data.suggestions);
            } else {
                renderSuggestions(getDefaultSuggestions());
            }

        } catch (error) {
            console.error("AI Assistant API error:", error);
            removeTypingIndicator();
            appendMessage("assistant", `⚠️ **Academic Assistant Notice:** ${error.message || "Unable to reach the AI analytics service. Please try again in a moment."}`);
        } finally {
            isSending = false;
            if (sendBtn) sendBtn.disabled = false;
            if (chatInput) chatInput.focus();
        }
    }

    // Trigger suggestion chip
    function triggerSuggestion(text) {
        sendAiMessage(text);
    }

    // Form submit handler
    function handleAiFormSubmit(event) {
        if (event && event.preventDefault) event.preventDefault();
        const { chatInput } = getElements();
        if (!chatInput) return;
        const msg = chatInput.value;
        sendAiMessage(msg);
    }

    // Global Key Listener (ESC closes modal)
    function setupGlobalKeyListeners() {
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" || e.keyCode === 27) {
                const { backdrop } = getElements();
                if (backdrop && (backdrop.classList.contains("active") || backdrop.style.display === "flex")) {
                    closeAiModal();
                }
            }
        });
    }

    // Ensure DOM listeners are attached once
    function init() {
        setupGlobalKeyListeners();

        // Attach form submission if present
        const form = document.getElementById("aiChatForm");
        if (form) {
            form.addEventListener("submit", handleAiFormSubmit);
        }

        // Attach close button
        const closeBtn = document.querySelector(".ai-modal-close");
        if (closeBtn) {
            closeBtn.addEventListener("click", closeAiModal);
        }

        // Attach backdrop click
        const backdrop = document.getElementById("aiModalBackdrop");
        if (backdrop) {
            backdrop.style.display = "none";
            backdrop.style.pointerEvents = "none";
            backdrop.addEventListener("click", handleAiBackdropClick);
        }

        // Floating trigger
        const trigger = document.getElementById("aiFloatingTrigger");
        if (trigger) {
            trigger.addEventListener("click", openAiModal);
        }
    }

    // Expose Public API
    window.openAiModal = openAiModal;
    window.openAiAssistantModal = openAiModal;
    window.toggleAiModal = function () {
        const { backdrop } = getElements();
        if (backdrop && (backdrop.classList.contains("active") || backdrop.style.display === "flex")) {
            closeAiModal();
        } else {
            openAiModal();
        }
    };
    window.closeAiModal = closeAiModal;
    window.closeAiAssistantModal = closeAiModal;
    window.sendAiMessage = sendAiMessage;
    window.triggerSuggestion = triggerSuggestion;
    window.handleAiFormSubmit = handleAiFormSubmit;
    window.handleAiBackdropClick = handleAiBackdropClick;

    // Run setup
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
