/* ============================================================
   HOMEOS // TASK EDITOR

   Shared task form for creating and editing household work.
============================================================ */

(function createHomeOSTaskEditor() {
    "use strict";

    window.HomeOS = window.HomeOS || {};
    window.HomeOS.components = window.HomeOS.components || {};

    const ASSIGNMENT_MODES = [
        {
            value: "anyone",
            title: "Anyone",
            copy: "Any eligible household person can take care of it."
        },
        {
            value: "shared",
            title: "Shared",
            copy: "Several people work on one shared responsibility."
        },
        {
            value: "individual",
            title: "Individual",
            copy: "Each assigned person completes their own responsibility."
        },
        {
            value: "owner_helpers",
            title: "Owner + Helpers",
            copy: "One person owns the task; others can help."
        },
        {
            value: "rotation",
            title: "Rotation",
            copy: "Responsibility rotates through the selected people."
        }
    ];

    const REPEAT_DAYS = [
        ["MO", "Mon"],
        ["TU", "Tue"],
        ["WE", "Wed"],
        ["TH", "Thu"],
        ["FR", "Fri"],
        ["SA", "Sat"],
        ["SU", "Sun"]
    ];

    const KNOWN_REPEAT_RULES = new Set([
        "",
        "FREQ=DAILY",
        "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
        "FREQ=WEEKLY;BYDAY=SA,SU",
        "FREQ=WEEKLY;BYDAY=SA",
        "FREQ=WEEKLY;BYDAY=SU",
        "FREQ=WEEKLY",
        "FREQ=MONTHLY"
    ]);

    const getTaskService = () => window.HomeOS?.services?.tasks;
    const getPersonPicker = () => window.HomeOS?.components?.personPicker;

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function editorMarkup() {
        const repeatDayOptions = REPEAT_DAYS.map(([code, label]) => `
            <label>
                <input type="checkbox" value="${code}" data-task-repeat-day>
                <span>${label}</span>
            </label>
        `).join("");

        const modeOptions = ASSIGNMENT_MODES.map(({ value, title, copy }) => `
            <button class="task-mode-card" type="button" data-task-mode="${value}">
                <span>${title}</span>
                <small>${copy}</small>
            </button>
        `).join("");

        return `
            <div class="task-editor-backdrop" id="taskEditorBackdrop" hidden aria-hidden="true">
                <section class="task-editor" role="dialog" aria-modal="true" aria-labelledby="taskEditorTitle">
                    <header class="task-editor-header">
                        <div>
                            <span class="task-editor-kicker">HOMEOS · WORK ASSIGNMENT</span>
                            <h2 id="taskEditorTitle">Create Task</h2>
                            <p>One task engine powers work across the whole household.</p>
                        </div>

                        <button
                            class="task-editor-close"
                            id="taskEditorClose"
                            type="button"
                            aria-label="Close task editor"
                        >×</button>
                    </header>

                    <form id="taskEditorForm">
                        <div class="task-editor-body">
                            <section class="task-editor-section">
                                <div class="task-editor-section-heading">
                                    <span>01</span>
                                    <div>
                                        <strong>The work</strong>
                                        <small>What needs to be done?</small>
                                    </div>
                                </div>

                                <div class="task-editor-grid">
                                    <label class="task-editor-field wide">
                                        <span>Task</span>
                                        <input
                                            id="taskEditorTaskTitle"
                                            type="text"
                                            maxlength="180"
                                            placeholder="Clean the garage"
                                            required
                                        >
                                    </label>

                                    <label class="task-editor-field wide">
                                        <span>Details</span>
                                        <textarea
                                            id="taskEditorDetails"
                                            placeholder="Optional context or instructions"
                                        ></textarea>
                                    </label>

                                    <label class="task-editor-field">
                                        <span>Priority</span>
                                        <select id="taskEditorPriority">
                                            <option value="low">Low</option>
                                            <option value="normal" selected>Normal</option>
                                            <option value="high">High</option>
                                        </select>
                                    </label>

                                    <label class="task-editor-field">
                                        <span>Due date</span>
                                        <input id="taskEditorDueDate" type="date">
                                    </label>

                                    <label class="task-editor-field">
                                        <span>Due time</span>
                                        <input id="taskEditorDueTime" type="time">
                                    </label>

                                    <label class="task-editor-field">
                                        <span>Repeat</span>
                                        <select id="taskEditorRepeat">
                                            <option value="">Does not repeat</option>
                                            <option value="FREQ=DAILY">Every Day</option>
                                            <option value="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR">School Days · Mon–Fri</option>
                                            <option value="FREQ=WEEKLY;BYDAY=SA,SU">Weekends · Sat–Sun</option>
                                            <option value="FREQ=WEEKLY;BYDAY=SA">Saturday</option>
                                            <option value="FREQ=WEEKLY;BYDAY=SU">Sunday</option>
                                            <option value="FREQ=WEEKLY">Weekly · Same Day</option>
                                            <option value="__CUSTOM_DAYS__">Custom Days</option>
                                            <option value="FREQ=MONTHLY">Monthly</option>
                                        </select>
                                    </label>

                                    <div class="task-editor-custom-days wide" id="taskEditorCustomDays" hidden>
                                        <span>CUSTOM REPEAT DAYS</span>
                                        <div>${repeatDayOptions}</div>
                                    </div>
                                </div>
                            </section>

                            <section class="task-editor-section">
                                <div class="task-editor-section-heading">
                                    <span>02</span>
                                    <div>
                                        <strong>How should responsibility work?</strong>
                                        <small>HomeOS uses the same assignment rules everywhere.</small>
                                    </div>
                                </div>

                                <div class="task-mode-grid" id="taskEditorModeGrid">
                                    ${modeOptions}
                                </div>

                                <div
                                    class="task-assignment-workspace"
                                    id="taskEditorAssignmentWorkspace"
                                ></div>
                            </section>
                        </div>

                        <footer class="task-editor-actions">
                            <button class="button button-secondary" id="taskEditorCancel" type="button">
                                Cancel
                            </button>
                            <button class="button button-primary" id="taskEditorSave" type="submit">
                                Save Task <span aria-hidden="true">→</span>
                            </button>
                        </footer>
                    </form>
                </section>
            </div>
        `;
    }

    const Editor = {
        mounted: false,
        people: [],
        task: null,
        source: {},
        onSaved: null,
        mode: "anyone",
        ownerId: null,
        assignmentSnapshot: [],

        // --- Setup ---
        ensureMounted() {
            if (this.mounted) return;

            document.body.insertAdjacentHTML("beforeend", editorMarkup());

            document.getElementById("taskEditorBackdrop")?.addEventListener("click", event => {
                if (event.target.id === "taskEditorBackdrop") this.close();
            });

            document.getElementById("taskEditorClose")?.addEventListener("click", () => this.close());
            document.getElementById("taskEditorCancel")?.addEventListener("click", () => this.close());

            document.getElementById("taskEditorModeGrid")?.addEventListener("click", event => {
                const button = event.target.closest("[data-task-mode]");
                if (!button) return;

                this.mode = button.dataset.taskMode;
                this.renderMode();
            });

            document.getElementById("taskEditorAssignmentWorkspace")?.addEventListener("change", event => {
                if (!event.target.matches('input[name="taskAssignee"]')) return;

                event.target
                    .closest(".task-person-choice")
                    ?.classList.toggle("selected", event.target.checked);
            });

            document.getElementById("taskEditorRepeat")?.addEventListener("change", () => {
                this.syncRepeatDays();
            });

            document.getElementById("taskEditorForm")?.addEventListener("submit", event => {
                this.save(event);
            });

            document.addEventListener("keydown", event => {
                if (event.key !== "Escape") return;

                const backdrop = document.getElementById("taskEditorBackdrop");
                if (backdrop && !backdrop.hidden) this.close();
            });

            this.mounted = true;
        },

        // --- Open + fill the form ---
        async open({ task = null, source = {}, onSaved = null } = {}) {
            if (!window.HomeOS?.permissions?.isAdmin?.()) {
                throw new Error("Owner or Admin permission is required to define household work.");
            }

            const taskService = getTaskService();
            const personPicker = getPersonPicker();

            if (!taskService || !personPicker) {
                throw new Error("The HomeOS task editor is not ready yet.");
            }

            const state = window.HomeOS.session?.getState?.();
            const householdId = state?.household?.id;

            if (!householdId) {
                throw new Error("HomeOS could not find the current household.");
            }

            this.ensureMounted();
            this.resetSaveButton();

            const peopleResult = await taskService.getAssignablePeople(householdId);
            if (peopleResult.error) throw peopleResult.error;

            let bundle = null;
            if (task?.id) {
                const result = await taskService.getTaskBundle(task.id);
                if (result.error) throw result.error;
                bundle = result.data;
            }

            this.people = Array.isArray(peopleResult.data) ? peopleResult.data : [];
            this.task = bundle?.task || task || null;
            this.source = { ...(source || {}) };
            this.onSaved = onSaved;

            const requestedMode = this.task?.assignment_mode || "anyone";
            this.mode = ASSIGNMENT_MODES.some(item => item.value === requestedMode)
                ? requestedMode
                : "anyone";

            this.populate(bundle?.assignments || []);

            const backdrop = document.getElementById("taskEditorBackdrop");
            if (backdrop) {
                backdrop.hidden = false;
                backdrop.setAttribute("aria-hidden", "false");
            }

            document.body.style.overflow = "hidden";
            window.setTimeout(() => document.getElementById("taskEditorTaskTitle")?.focus(), 0);
        },

        populate(assignments) {
            const title = document.getElementById("taskEditorTitle");
            if (title) title.textContent = this.task?.id ? "Edit Task" : "Create Task";

            this.setValue("taskEditorTaskTitle", this.task?.title || "");
            this.setValue("taskEditorDetails", this.task?.details || "");
            this.setValue("taskEditorPriority", this.task?.priority || "normal");
            this.setValue("taskEditorDueDate", this.task?.due_date || "");
            this.setValue(
                "taskEditorDueTime",
                this.task?.due_time ? String(this.task.due_time).slice(0, 5) : ""
            );

            this.populateRepeat(this.task?.recurrence_rule || "");
            this.assignmentSnapshot = Array.isArray(assignments) ? assignments : [];

            const owner = this.assignmentSnapshot.find(
                assignment => assignment.assignment_role === "owner"
            );
            this.ownerId = owner?.family_member_id || null;

            this.renderMode();
        },

        populateRepeat(rule) {
            const normalized = String(rule || "").toUpperCase();
            const custom =
                normalized.includes("FREQ=WEEKLY") &&
                normalized.includes("BYDAY=") &&
                !KNOWN_REPEAT_RULES.has(normalized);

            this.setValue("taskEditorRepeat", custom ? "__CUSTOM_DAYS__" : normalized);

            const match = normalized.match(/BYDAY=([^;]+)/);
            const days = custom && match ? match[1].split(",") : [];

            document.querySelectorAll("[data-task-repeat-day]").forEach(input => {
                input.checked = days.includes(input.value);
            });

            this.syncRepeatDays();
        },

        syncRepeatDays() {
            const custom = document.getElementById("taskEditorRepeat")?.value === "__CUSTOM_DAYS__";
            const row = document.getElementById("taskEditorCustomDays");
            if (row) row.hidden = !custom;
        },

        collectRepeatRule() {
            const value = document.getElementById("taskEditorRepeat")?.value || "";
            if (value !== "__CUSTOM_DAYS__") return value || null;

            const days = [...document.querySelectorAll("[data-task-repeat-day]:checked")]
                .map(input => input.value);

            if (!days.length) {
                throw new Error("Choose at least one custom repeat day.");
            }

            return `FREQ=WEEKLY;BYDAY=${days.join(",")}`;
        },

        // --- Assign people ---
        renderMode() {
            document.querySelectorAll("[data-task-mode]").forEach(button => {
                button.classList.toggle("active", button.dataset.taskMode === this.mode);
            });

            const target = document.getElementById("taskEditorAssignmentWorkspace");
            if (!target) return;

            if (this.mode === "anyone") {
                target.innerHTML = `
                    <div class="task-assignment-note">
                        <strong>Anyone can take care of this.</strong>
                        <p>
                            No fixed assignee is required. Completion is still recorded against
                            the household person who handled the work.
                        </p>
                    </div>
                `;
                return;
            }

            const personPicker = getPersonPicker();
            if (!personPicker) return;

            const selectedIds = this.assignmentSnapshot.map(
                assignment => assignment.family_member_id
            );

            if (this.mode === "owner_helpers") {
                const helpers = selectedIds.filter(id => id !== this.ownerId);
                const peopleOptions = this.people.map(person => `
                    <option value="${escapeHtml(person.id)}" ${person.id === this.ownerId ? "selected" : ""}>
                        ${escapeHtml(person.display_name || person.name || "Household Person")}
                    </option>
                `).join("");

                target.innerHTML = `
                    <div class="task-owner-grid">
                        <label class="task-editor-field">
                            <span>Task owner</span>
                            <select id="taskOwnerPerson">
                                <option value="">Choose the owner</option>
                                ${peopleOptions}
                            </select>
                        </label>
                    </div>

                    <div class="task-assignment-label">
                        <strong>Helpers</strong>
                        <span>Helpers can participate. The task closes when the owner is complete.</span>
                    </div>

                    ${personPicker.render({
                        people: this.people,
                        selectedIds: helpers,
                        inputName: "taskAssignee"
                    })}
                `;
                return;
            }

            const explanation = {
                shared: "One shared completion finishes the task for the group.",
                individual: "Every selected person must complete their own responsibility.",
                rotation: "HomeOS moves responsibility through these people in the order shown."
            }[this.mode] || "Choose who should be responsible for this task.";

            target.innerHTML = `
                <div class="task-assignment-label">
                    <strong>Assigned people</strong>
                    <span>${explanation}</span>
                </div>

                ${personPicker.render({
                    people: this.people,
                    selectedIds,
                    inputName: "taskAssignee"
                })}
            `;
        },

        collectAssignments() {
            if (this.mode === "anyone") return [];

            const personPicker = getPersonPicker();
            if (!personPicker) {
                throw new Error("The household person picker is not available.");
            }

            const root = document.getElementById("taskEditorAssignmentWorkspace");
            const selected = personPicker.selectedIds(root, "taskAssignee");

            if (this.mode === "owner_helpers") {
                const ownerId = document.getElementById("taskOwnerPerson")?.value || "";
                if (!ownerId) throw new Error("Choose the person who owns this task.");

                return [
                    {
                        family_member_id: ownerId,
                        assignment_role: "owner",
                        completion_required: true,
                        rotation_order: null
                    },
                    ...selected
                        .filter(id => id !== ownerId)
                        .map(id => ({
                            family_member_id: id,
                            assignment_role: "helper",
                            completion_required: false,
                            rotation_order: null
                        }))
                ];
            }

            if (!selected.length) {
                throw new Error("Select at least one person for this assignment mode.");
            }

            return selected.map((id, index) => ({
                family_member_id: id,
                assignment_role: "assignee",
                completion_required: true,
                rotation_order: this.mode === "rotation" ? index + 1 : null
            }));
        },

        // --- Save ---
        async save(event) {
            event.preventDefault();

            try {
                const title = document.getElementById("taskEditorTaskTitle")?.value?.trim();
                if (!title) throw new Error("Give this task a name.");

                const assignments = this.collectAssignments();
                const payload = {
                    id: this.task?.id || null,
                    title,
                    details: document.getElementById("taskEditorDetails")?.value?.trim() || null,
                    sourceType: this.task?.source_type || this.source.sourceType || "custom",
                    sourceRecordId: this.task?.source_record_id || this.source.sourceRecordId || null,
                    targetType: this.task?.target_type || this.source.targetType || null,
                    roomId: this.task?.room_id || this.source.roomId || null,
                    zoneId: this.task?.zone_id || this.source.zoneId || null,
                    laundryAreaId: this.task?.laundry_area_id || this.source.laundryAreaId || null,
                    householdFeatureId:
                        this.task?.household_feature_id || this.source.householdFeatureId || null,
                    assignmentMode: this.mode,
                    priority: document.getElementById("taskEditorPriority")?.value || "normal",
                    dueDate: document.getElementById("taskEditorDueDate")?.value || null,
                    dueTime: document.getElementById("taskEditorDueTime")?.value || null,
                    recurrenceRule: this.collectRepeatRule(),
                    recurrenceEndDate: this.task?.recurrence_end_date || null,
                    active: this.task?.active !== false,
                    assignments
                };

                const taskService = getTaskService();
                if (!taskService) throw new Error("The HomeOS task service is not available.");

                const saveButton = document.getElementById("taskEditorSave");
                if (saveButton) {
                    saveButton.disabled = true;
                    saveButton.textContent = "Saving…";
                }

                const result = await taskService.saveTask(payload);
                if (result.error) throw result.error;

                const callback = this.onSaved;
                this.close();

                window.dispatchEvent(new CustomEvent("homeos:tasksaved", {
                    detail: {
                        taskId: result.taskId,
                        task: payload
                    }
                }));

                if (typeof callback === "function") {
                    try {
                        await callback(result.taskId, payload);
                    } catch (callbackError) {
                        console.error("[HomeOS] Task saved, but the page refresh callback failed.", callbackError);
                        window.HomeOS.ui?.notify?.(
                            "The task saved, but this page could not refresh automatically.",
                            { tone: "attention" }
                        );
                    }
                }
            } catch (error) {
                console.error("[HomeOS] Task save failed.", error);
                this.showSaveError(error?.message || "Could not save");
            }
        },

        // --- Close + small helpers ---
        close() {
            const backdrop = document.getElementById("taskEditorBackdrop");
            if (backdrop) {
                backdrop.hidden = true;
                backdrop.setAttribute("aria-hidden", "true");
            }

            document.body.style.removeProperty("overflow");

            this.task = null;
            this.source = {};
            this.onSaved = null;
            this.assignmentSnapshot = [];
            this.ownerId = null;
        },

        resetSaveButton() {
            const button = document.getElementById("taskEditorSave");
            if (!button) return;

            button.disabled = false;
            button.innerHTML = 'Save Task <span aria-hidden="true">→</span>';
        },

        showSaveError(message) {
            const button = document.getElementById("taskEditorSave");
            if (button) {
                button.disabled = false;
                button.textContent = message;
                window.setTimeout(() => this.resetSaveButton(), 2600);
            }

            window.HomeOS.ui?.notify?.(message, { tone: "attention" });
        },

        setValue(id, value) {
            const target = document.getElementById(id);
            if (target) target.value = value ?? "";
        }
    };

    window.HomeOS.components.taskEditor = Editor;
})();
