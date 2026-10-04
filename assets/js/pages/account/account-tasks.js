/* ============================================================
   HOMEOS // ACCOUNT TASKS

   Task setup and assignment tools inside Account.
============================================================ */

(function registerAccountTasksModule() {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    window.HomeOS.accountPageModules =
        window.HomeOS.accountPageModules || {};
    window.HomeOS.accountPageModules.tasks = {
        // --- Task Assignments Person-first Workspace ---
        assignablePeople() {
            return this.people.filter(person => person.active !== false &&
                person.can_be_assigned !== false);
        },
        taskPersonTone(person) {
            if (this.isChildPerson(person)) {
                const theme = this.kidSettingsForPerson(person.id)?.theme;
                if (theme === "girl")
                    return "kid-girl";
                if (theme === "boy")
                    return "kid-boy";
            }
            const seed = String(person?.id || this.personName(person));
            let hash = 0;
            for (let index = 0; index < seed.length; index += 1) {
                hash = ((hash << 5) - hash) + seed.charCodeAt(index);
                hash |= 0;
            }
            return `tone-${Math.abs(hash) % 6}`;
        },
        taskPersonInitials(person) {
            const parts = this.personName(person)
                .split(/\s+/)
                .filter(Boolean);
            if (!parts.length)
                return "H";
            return (parts.length === 1
                ? parts[0].slice(0, 2)
                : `${parts[0][0]}${parts[parts.length - 1][0]}`).toUpperCase();
        },
        roomTaskLabel(room) {
            const level = this.home.levels.find(item => item.id === room?.level_id);
            return level?.name
                ? `${level.name} — ${room.name}`
                : String(room?.name || "Area");
        },
        renderTaskWorkspace() {
            this.renderTaskPersonPicker();
            const workspace = document.getElementById("taskPersonWorkspace");
            const empty = document.getElementById("taskPersonEmptyState");
            const selected = this.people.find(person => person.id === this.selectedTaskPersonId);
            if (!selected) {
                if (workspace)
                    workspace.hidden = true;
                if (empty)
                    empty.hidden = false;
                const childTools = document.getElementById("taskChildMissionTools");
                if (childTools)
                    childTools.hidden = true;
                return;
            }
            if (workspace)
                workspace.hidden = false;
            if (empty)
                empty.hidden = true;
            const childTools = document.getElementById("taskChildMissionTools");
            const childTitle = document.getElementById("taskChildMissionTitle");
            const childCopy = document.getElementById("taskChildMissionCopy");
            const selectedIsChild = this.isChildPerson(selected);
            if (childTools) {
                childTools.hidden = !selectedIsChild;
            }
            if (selectedIsChild && childTitle) {
                const firstName = this.personName(selected).split(/\s+/)[0] || "this child";
                childTitle.textContent = `${firstName}'s missions grow with them automatically`;
                if (childCopy) {
                    const cached = this.kidRoutineStates.get(selected.id);
                    const age = this.kidAgeService?.ageFromProfile?.(cached?.profile);
                    const band = age ? this.kidAgeService?.bandForAge?.(age) : null;
                    childCopy.textContent = age && band
                        ? `Age ${age} · ${this.kidAgeService.bandLabel(band)}. Manual assignments you add here appear alongside the automatic mission pack on their scheduled day.`
                        : "Set this child's birthday in People & Access. HOME OS calculates their age and automatically changes the mission pack as they grow; manual assignments are added on top.";
                }
            }
            const tone = this.taskPersonTone(selected);
            const avatar = document.getElementById("taskSelectedAvatar");
            if (avatar) {
                avatar.className = `task-selected-avatar ${tone}`;
                avatar.textContent = this.taskPersonInitials(selected);
            }
            this.setText("taskSelectedPersonName", this.personName(selected));
            this.setText("taskAssignPersonName", this.personName(selected));
            this.setText("taskAssignButtonName", this.personName(selected).split(/\s+/)[0] || "Person");
            const relationship = this.pretty(selected.relationship_label ||
                (this.isChildPerson(selected) ? "Child" : "Adult"));
            this.setText("taskSelectedPersonMeta", this.taskPersonTasksLoading
                ? "Loading assigned work…"
                : `${relationship} · ${this.selectedTaskPersonTasks.length} assigned ${this.selectedTaskPersonTasks.length === 1 ? "task" : "tasks"}`);
            this.renderSelectedTaskPersonTasks();
            this.configureSimpleTaskCategory({ preserveTarget: true });
        },
        renderTaskPersonPicker() {
            const picker = document.getElementById("taskPersonPicker");
            if (!picker)
                return;
            const people = this.assignablePeople();
            if (!people.length) {
                picker.innerHTML = '<div class="record-empty">No assignable household people yet.</div>';
                return;
            }
            picker.innerHTML = people.map(person => {
                const selected = person.id === this.selectedTaskPersonId;
                const tone = this.taskPersonTone(person);
                const membership = this.membershipForPerson(person);
                const label = this.isChildPerson(person)
                    ? "Child"
                    : this.pretty(membership?.role || person.relationship_label || "Adult");
                const count = selected &&
                    this.taskPersonTasksLoadedFor === person.id
                    ? `<span class="task-person-count">${this.selectedTaskPersonTasks.length}</span>`
                    : "";
                return `
                    <button
                        class="task-person-card ${tone} ${selected ? "is-selected" : ""}"
                        type="button"
                        data-task-person="${this.escape(person.id)}"
                        role="listitem"
                        aria-pressed="${selected ? "true" : "false"}"
                    >
                        <span class="task-person-avatar" aria-hidden="true">${this.escape(this.taskPersonInitials(person))}</span>
                        <span class="task-person-card-copy">
                            <strong>${this.escape(this.personName(person))}</strong>
                            <small>${this.escape(label)}</small>
                        </span>
                        ${count}
                    </button>
                `;
            }).join("");
        },
        async selectTaskPerson(personId) {
            const person = this.assignablePeople()
                .find(item => item.id === personId);
            if (!person)
                return;
            this.selectedTaskPersonId = personId;
            this.selectedTaskPersonTasks = [];
            this.selectedTaskPersonToday = new Map();
            this.taskPersonTasksLoadedFor = null;
            this.clearSimpleTaskForm({ keepPerson: true });
            this.renderTaskWorkspace();
            await this.loadSelectedTaskPersonTasks({ force: true });
        },
        async loadSelectedTaskPersonTasks({ force = false } = {}) {
            const personId = this.selectedTaskPersonId;
            if (!personId || this.taskPersonTasksLoading)
                return;
            if (!force &&
                this.taskPersonTasksLoadedFor === personId) {
                await this.refreshSelectedTaskPersonTodayStatus();
                return;
            }
            this.taskPersonTasksLoading = true;
            this.renderTaskWorkspace();
            try {
                const assignmentsResult = await this.supabase
                    .from("task_assignments")
                    .select("task_id")
                    .eq("household_id", this.householdId())
                    .eq("family_member_id", personId);
                if (assignmentsResult.error)
                    throw assignmentsResult.error;
                const taskIds = Array.from(new Set((assignmentsResult.data || [])
                    .map(row => row.task_id)
                    .filter(Boolean)));
                if (!taskIds.length) {
                    this.selectedTaskPersonTasks = [];
                    this.selectedTaskPersonToday = new Map();
                    this.taskPersonTasksLoadedFor = personId;
                    return;
                }
                const tasksResult = await this.supabase
                    .from("tasks")
                    .select("id,title,details,source_type,target_type,room_id,zone_id,laundry_area_id,household_feature_id,priority,due_date,due_time,recurrence_rule,active,created_at")
                    .eq("household_id", this.householdId())
                    .eq("active", true)
                    .in("id", taskIds)
                    .order("created_at", { ascending: false });
                if (tasksResult.error)
                    throw tasksResult.error;
                this.selectedTaskPersonTasks = tasksResult.data || [];
                this.taskPersonTasksLoadedFor = personId;
                await this.loadTaskPersonTodayStatus(this.selectedTaskPersonTasks.map(task => task.id), personId);
            }
            catch (error) {
                console.error("[HOME OS] Could not load this person's assigned tasks.", error);
                this.selectedTaskPersonTasks = [];
                this.selectedTaskPersonToday = new Map();
                this.taskPersonTasksLoadedFor = personId;
                this.notify("HOME OS could not load this person's current assignments.", { tone: "attention", title: "Task Assignments" });
            }
            finally {
                this.taskPersonTasksLoading = false;
                this.renderTaskWorkspace();
            }
        },
        taskDayBounds(date = new Date()) {
            const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(end.getDate() + 1);
            return { start: start.toISOString(), end: end.toISOString() };
        },
        async loadTaskPersonTodayStatus(taskIds = [], personId = this.selectedTaskPersonId) {
            const ids = Array.from(new Set((taskIds || []).filter(Boolean)));
            if (!personId || !ids.length) {
                this.selectedTaskPersonToday = new Map();
                return;
            }
            const { start, end } = this.taskDayBounds();
            const occurrenceResult = await this.supabase
                .from("task_occurrences")
                .select("id,task_id,status,due_at")
                .eq("household_id", this.householdId())
                .in("task_id", ids)
                .gte("due_at", start)
                .lt("due_at", end)
                .order("due_at", { ascending: false });
            if (occurrenceResult.error)
                throw occurrenceResult.error;
            const occurrences = occurrenceResult.data || [];
            const occurrenceIds = occurrences.map(row => row.id).filter(Boolean);
            let completions = [];
            if (occurrenceIds.length) {
                const completionResult = await this.supabase
                    .from("task_occurrence_completions")
                    .select("occurrence_id,family_member_id,completed_at")
                    .in("occurrence_id", occurrenceIds)
                    .eq("family_member_id", personId)
                    .order("completed_at", { ascending: false });
                if (completionResult.error)
                    throw completionResult.error;
                completions = completionResult.data || [];
            }
            const completionByOccurrence = new Map();
            completions.forEach(row => {
                if (!completionByOccurrence.has(row.occurrence_id)) {
                    completionByOccurrence.set(row.occurrence_id, row);
                }
            });
            const statusByTask = new Map();
            occurrences.forEach(occurrence => {
                if (statusByTask.has(occurrence.task_id))
                    return;
                const completion = completionByOccurrence.get(occurrence.id) || null;
                const done = Boolean(completion) || String(occurrence.status || "").toLowerCase() === "complete";
                statusByTask.set(occurrence.task_id, {
                    occurrenceId: occurrence.id,
                    dueAt: occurrence.due_at || null,
                    status: occurrence.status || null,
                    complete: done,
                    completedAt: completion?.completed_at || null
                });
            });
            this.selectedTaskPersonToday = statusByTask;
        },
        async refreshSelectedTaskPersonTodayStatus() {
            if (!this.selectedTaskPersonId || this.taskPersonTasksLoading)
                return;
            try {
                await this.loadTaskPersonTodayStatus((this.selectedTaskPersonTasks || []).map(task => task.id), this.selectedTaskPersonId);
                this.renderTaskWorkspace();
            }
            catch (error) {
                console.warn("[HOME OS] Live task completion refresh skipped.", error);
            }
        },
        taskTodayStatus(task) {
            return this.selectedTaskPersonToday?.get(task?.id) || null;
        },
        taskTodayStatusText(task) {
            const today = this.taskTodayStatus(task);
            if (!today)
                return "";
            if (today.complete) {
                if (!today.completedAt)
                    return "✓ Done today";
                const completed = new Date(today.completedAt);
                const time = Number.isNaN(completed.getTime())
                    ? ""
                    : completed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
                return time ? `✓ Done today · ${time}` : "✓ Done today";
            }
            return "○ Open today";
        },
        taskPanelIsVisible() {
            const panel = document.querySelector('[data-account-panel="tasks"]');
            return Boolean(panel && !panel.hidden);
        },
        scheduleTaskLiveRefresh() {
            if (!this.selectedTaskPersonId || !this.taskPanelIsVisible())
                return;
            window.clearTimeout(this.taskLiveRefreshTimer);
            this.taskLiveRefreshTimer = window.setTimeout(() => this.refreshSelectedTaskPersonTodayStatus(), 250);
        },
        startTaskLiveSync() {
            const householdId = this.householdId();
            if (!householdId)
                return;
            if (!this.taskLiveChannel && typeof this.supabase?.channel === "function") {
                try {
                    this.taskLiveChannel = this.supabase
                        .channel(`homeos-account-task-live-${householdId}`)
                        .on("postgres_changes", {
                        event: "*",
                        schema: "public",
                        table: "task_occurrence_completions",
                        filter: `household_id=eq.${householdId}`
                    }, () => this.scheduleTaskLiveRefresh())
                        .on("postgres_changes", {
                        event: "*",
                        schema: "public",
                        table: "task_occurrences",
                        filter: `household_id=eq.${householdId}`
                    }, () => this.scheduleTaskLiveRefresh())
                        .subscribe();
                }
                catch (error) {
                    console.warn("[HOME OS] Realtime task sync is unavailable; fallback refresh remains active.", error);
                }
            }
            if (!this.taskLivePollTimer) {
                this.taskLivePollTimer = window.setInterval(() => {
                    if (document.visibilityState === "visible" &&
                        this.selectedTaskPersonId &&
                        this.taskPanelIsVisible()) {
                        this.refreshSelectedTaskPersonTodayStatus();
                    }
                }, 15000);
            }
            if (!this.taskLiveListenersBound) {
                this.taskLiveListenersBound = true;
                window.addEventListener("focus", () => {
                    if (this.selectedTaskPersonId && this.taskPanelIsVisible()) {
                        this.refreshSelectedTaskPersonTodayStatus();
                    }
                });
                document.addEventListener("visibilitychange", () => {
                    if (document.visibilityState === "visible" &&
                        this.selectedTaskPersonId &&
                        this.taskPanelIsVisible()) {
                        this.refreshSelectedTaskPersonTodayStatus();
                    }
                });
            }
        },
        taskSourceGroup(task) {
            const source = String(task?.source_type || "custom").toLowerCase();
            if (source === "daily_opening") {
                return { key: "opening", label: "Opening Shift", icon: "☼", order: 1 };
            }
            if (source === "daily_closing") {
                return { key: "closing", label: "Closing Shift", icon: "☾", order: 2 };
            }
            if (source.includes("clean")) {
                return { key: "cleaning", label: "Cleaning", icon: "✦", order: 3 };
            }
            if (source.includes("laundry")) {
                return { key: "laundry", label: "Laundry", icon: "◉", order: 4 };
            }
            if (source.includes("home_care") || source.includes("maintenance")) {
                return { key: "care", label: "Home Care", icon: "⌂", order: 5 };
            }
            if (source.includes("season")) {
                return { key: "seasonal", label: "Seasonal", icon: "◇", order: 6 };
            }
            return { key: "other", label: "Other", icon: "＋", order: 7 };
        },
        taskTargetName(task) {
            if (task?.room_id) {
                const room = this.home.rooms.find(item => item.id === task.room_id);
                if (room)
                    return this.roomTaskLabel(room);
            }
            if (task?.zone_id) {
                const zone = this.home.zones.find(item => item.id === task.zone_id);
                if (zone)
                    return `Zone — ${zone.name}`;
            }
            if (task?.laundry_area_id) {
                const laundry = this.home.laundry.find(item => item.id === task.laundry_area_id);
                if (laundry)
                    return laundry.name;
            }
            if (task?.household_feature_id) {
                const feature = this.home.features.find(item => item.id === task.household_feature_id);
                if (feature)
                    return feature.name;
            }
            return "Whole home";
        },
        taskRecurrenceLabelFromRule(rule) {
            const value = String(rule || "").toUpperCase();
            if (!value)
                return "One time";
            if (value.includes("FREQ=DAILY"))
                return "Every day";
            const dayNames = {
                MO: "Mon", TU: "Tue", WE: "Wed", TH: "Thu",
                FR: "Fri", SA: "Sat", SU: "Sun"
            };
            const byDay = value.match(/(?:^|;)BYDAY=([^;]+)/)?.[1]
                ?.split(",")
                .map(day => dayNames[day])
                .filter(Boolean) || [];
            if (value.includes("FREQ=WEEKLY") && value.includes("INTERVAL=2")) {
                return byDay.length
                    ? `Every 2 weeks · ${byDay.join(" + ")}`
                    : "Every 2 weeks";
            }
            if (value.includes("FREQ=WEEKLY")) {
                return byDay.length ? byDay.join(" + ") : "Every week";
            }
            if (value.includes("FREQ=MONTHLY"))
                return "Every month";
            return "Repeating";
        },
        renderSelectedTaskPersonTasks() {
            const list = document.getElementById("taskPersonAssignedList");
            if (!list)
                return;
            if (this.taskPersonTasksLoading) {
                list.innerHTML = `
                    <div class="task-list-loading">
                        <span></span>
                        <strong>Checking their current load…</strong>
                    </div>
                `;
                return;
            }
            const tasks = this.selectedTaskPersonTasks || [];
            const dailyCount = tasks.filter(task => ["daily_opening", "daily_closing"].includes(String(task.source_type || "").toLowerCase())).length;
            const recurringCount = tasks.filter(task => Boolean(task.recurrence_rule)).length;
            this.setText("taskSelectedTotalCount", tasks.length);
            this.setText("taskSelectedDailyCount", dailyCount);
            this.setText("taskSelectedRecurringCount", recurringCount);
            if (!tasks.length) {
                list.innerHTML = `
                    <div class="task-person-no-work">
                        <span aria-hidden="true">✓</span>
                        <div>
                            <strong>Nothing is assigned right now.</strong>
                            <p>This person has room for something new.</p>
                        </div>
                    </div>
                `;
                return;
            }
            const grouped = new Map();
            tasks.forEach(task => {
                const group = this.taskSourceGroup(task);
                if (!grouped.has(group.key)) {
                    grouped.set(group.key, { ...group, tasks: [] });
                }
                grouped.get(group.key).tasks.push(task);
            });
            const groups = Array.from(grouped.values())
                .sort((a, b) => a.order - b.order);
            list.innerHTML = groups.map((group, index) => `
                <details class="task-assignment-group" ${index === 0 || group.key === "opening" || group.key === "closing" ? "open" : ""}>
                    <summary>
                        <span class="task-assignment-group-icon" aria-hidden="true">${group.icon}</span>
                        <strong>${this.escape(group.label)}</strong>
                        <span>${group.tasks.length}</span>
                    </summary>

                    <div class="task-assignment-group-list">
                        ${group.tasks.map(task => {
                const todayStatus = this.taskTodayStatus(task);
                const todayText = this.taskTodayStatusText(task);
                return `
                                <article class="task-assigned-row ${todayStatus?.complete ? "is-complete-today" : ""}">
                                    <div>
                                        <strong>${this.escape(task.title)}</strong>
                                        <span>
                                            ${this.escape(this.taskTargetName(task))}
                                            ·
                                            ${this.escape(this.taskRecurrenceLabelFromRule(task.recurrence_rule))}
                                            ${todayText ? ` · ${this.escape(todayText)}` : ""}
                                        </span>
                                    </div>
                                    ${task.priority === "high" ? '<span class="task-priority-chip">High</span>' : ""}
                                </article>
                            `;
            }).join("")}
                    </div>
                </details>
            `).join("");
        },
        simpleTaskCategoryConfig(value = this.value("taskCategoryInput")) {
            const map = {
                daily_opening: {
                    sourceType: "daily_opening",
                    label: "Opening Shift",
                    destination: "Morning Rhythm",
                    targetMode: "room",
                    targetLabel: "Area / room",
                    targetPlaceholder: "Choose an area",
                    daily: true,
                    routeCopy: "Opening Shift · Every day · Assigned only to the selected person."
                },
                daily_closing: {
                    sourceType: "daily_closing",
                    label: "Closing Shift",
                    destination: "Evening Rhythm",
                    targetMode: "room",
                    targetLabel: "Area / room",
                    targetPlaceholder: "Choose an area",
                    daily: true,
                    routeCopy: "Closing Shift · Every day · Assigned only to the selected person."
                },
                cleaning: {
                    sourceType: "cleaning",
                    label: "Cleaning",
                    destination: "Cleaning",
                    targetMode: "room_or_zone",
                    targetLabel: "Room or zone",
                    targetPlaceholder: "Choose where it belongs",
                    daily: false,
                    routeCopy: "Cleaning task · Assigned only to the selected person."
                },
                laundry: {
                    sourceType: "laundry",
                    label: "Laundry",
                    destination: "Laundry",
                    targetMode: "laundry",
                    targetLabel: "Laundry area",
                    targetPlaceholder: "Choose a laundry area",
                    daily: false,
                    routeCopy: "Laundry task · Assigned only to the selected person."
                },
                home_care: {
                    sourceType: "home_care",
                    label: "Home Care",
                    destination: "Home Care",
                    targetMode: "feature",
                    targetLabel: "Appliance / home feature",
                    targetPlaceholder: "Choose a home feature",
                    daily: false,
                    routeCopy: "Home Care task · Assigned only to the selected person."
                },
                seasonal: {
                    sourceType: "seasonal_custom",
                    label: "Seasonal",
                    destination: "Seasonal",
                    targetMode: "room",
                    targetLabel: "Area / room",
                    targetPlaceholder: "Choose an area",
                    daily: false,
                    routeCopy: "Seasonal household task · Assigned only to the selected person."
                },
                custom: {
                    sourceType: "custom",
                    label: "Other",
                    destination: "Household",
                    targetMode: "optional_room",
                    targetLabel: "Area / room (optional)",
                    targetPlaceholder: "Whole home / no area",
                    daily: false,
                    optionalTarget: true,
                    routeCopy: "General household task · Assigned only to the selected person."
                }
            };
            return map[value] || map.daily_opening;
        },
        simpleTaskTargetOptions(config = this.simpleTaskCategoryConfig()) {
            const roomOptions = this.home.rooms
                .filter(item => item.active !== false)
                .slice()
                .sort((a, b) => this.roomTaskLabel(a).localeCompare(this.roomTaskLabel(b)))
                .map(room => ({
                value: `room:${room.id}`,
                label: this.roomTaskLabel(room),
                type: "room",
                id: room.id
            }));
            if (config.targetMode === "room" || config.targetMode === "optional_room") {
                return roomOptions;
            }
            if (config.targetMode === "room_or_zone") {
                const zones = this.home.zones
                    .filter(item => item.active !== false)
                    .slice()
                    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
                    .map(zone => ({
                    value: `zone:${zone.id}`,
                    label: `ZONE — ${zone.name}`,
                    type: "zone",
                    id: zone.id
                }));
                return [...roomOptions, ...zones];
            }
            if (config.targetMode === "laundry") {
                return this.home.laundry
                    .filter(item => item.active !== false)
                    .map(item => ({
                    value: `laundry:${item.id}`,
                    label: item.name,
                    type: "laundry",
                    id: item.id
                }));
            }
            if (config.targetMode === "feature") {
                return this.home.features
                    .filter(item => item.enabled !== false)
                    .map(item => ({
                    value: `feature:${item.id}`,
                    label: item.name,
                    type: "feature",
                    id: item.id
                }));
            }
            return [];
        },
        configureSimpleTaskCategory({ preserveTarget = false } = {}) {
            const config = this.simpleTaskCategoryConfig();
            const target = document.getElementById("taskTargetInput");
            const previous = preserveTarget ? target?.value || "" : "";
            const options = this.simpleTaskTargetOptions(config);
            this.setText("taskContextLabel", config.targetLabel);
            document.querySelectorAll("[data-task-category-choice]").forEach(button => {
                const active = button.dataset.taskCategoryChoice === this.value("taskCategoryInput");
                button.classList.toggle("is-active", active);
                button.setAttribute("aria-pressed", String(active));
            });
            if (target) {
                target.innerHTML = `
                    <option value="">${this.escape(config.targetPlaceholder)}</option>
                    ${options.map(option => `
                        <option value="${this.escape(option.value)}">${this.escape(option.label)}</option>
                    `).join("")}
                `;
                if (previous && options.some(option => option.value === previous)) {
                    target.value = previous;
                }
            }
            this.configureTaskSchedule();
        },
        selectedTaskWeekdays() {
            return Array.from(document.querySelectorAll("[data-task-weekday].is-active"))
                .map(button => button.dataset.taskWeekday)
                .filter(Boolean);
        },
        taskScheduleLabel() {
            const repeat = this.value("taskRepeatInput") || "daily";
            const days = this.selectedTaskWeekdays();
            const names = {
                MO: "Monday", TU: "Tuesday", WE: "Wednesday", TH: "Thursday",
                FR: "Friday", SA: "Saturday", SU: "Sunday"
            };
            if (repeat === "none") {
                const due = this.value("taskDueDateInput");
                if (!due)
                    return "One time";
                const [year, month, day] = due.split("-").map(Number);
                return `One time · ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(year, month - 1, day))}`;
            }
            if (repeat === "daily")
                return "Every day";
            const dayCopy = days.length
                ? days.map(day => names[day]).join(" & ")
                : "Choose day(s)";
            return repeat === "biweekly"
                ? `Every 2 weeks · ${dayCopy}`
                : `Every ${dayCopy}`;
        },
        configureTaskSchedule() {
            const repeat = this.value("taskRepeatInput") || "daily";
            const config = this.simpleTaskCategoryConfig();
            const dateField = document.getElementById("taskOneTimeDateField");
            const weekdayField = document.getElementById("taskWeekdayField");
            const dueDate = document.getElementById("taskDueDateInput");
            document.querySelectorAll("[data-task-repeat-choice]").forEach(button => {
                const active = button.dataset.taskRepeatChoice === repeat;
                button.classList.toggle("is-active", active);
                button.setAttribute("aria-pressed", String(active));
            });
            if (dateField)
                dateField.hidden = repeat !== "none";
            if (weekdayField)
                weekdayField.hidden = !["weekly", "biweekly"].includes(repeat);
            if (dueDate)
                dueDate.required = repeat === "none";
            this.setText("taskRouteExplainer", `${config.label} · ${this.taskScheduleLabel()} · Assigned only to the selected person.`);
        },
        chooseTaskRepeat(value) {
            if (!["none", "daily", "weekly", "biweekly"].includes(value))
                return;
            this.setValue("taskRepeatInput", value);
            if (!["weekly", "biweekly"].includes(value)) {
                document.querySelectorAll("[data-task-weekday]").forEach(button => {
                    button.classList.remove("is-active");
                    button.setAttribute("aria-pressed", "false");
                });
            }
            this.configureTaskSchedule();
        },
        toggleTaskWeekday(day) {
            const button = document.querySelector(`[data-task-weekday="${day}"]`);
            if (!button)
                return;
            const active = !button.classList.contains("is-active");
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", String(active));
            this.configureTaskSchedule();
        },
        chooseSimpleTaskCategory(value) {
            this.setValue("taskCategoryInput", value);
            this.configureSimpleTaskCategory();
        },
        clearSimpleTaskForm({ keepPerson = true } = {}) {
            const selectedPerson = keepPerson ? this.selectedTaskPersonId : null;
            document.getElementById("taskAssignmentForm")?.reset();
            this.selectedTaskPersonId = selectedPerson;
            this.setValue("taskCategoryInput", "daily_opening");
            this.setValue("taskRepeatInput", "daily");
            this.setValue("taskPriorityInput", "normal");
            document.querySelectorAll("[data-task-weekday]").forEach(button => {
                button.classList.remove("is-active");
                button.setAttribute("aria-pressed", "false");
            });
            this.configureSimpleTaskCategory();
        },
        parseSimpleTaskTarget() {
            const value = this.value("taskTargetInput");
            if (!value) {
                return {
                    type: null,
                    id: null,
                    roomId: null,
                    zoneId: null,
                    laundryAreaId: null,
                    featureId: null
                };
            }
            const [type, id] = value.split(":");
            return {
                type,
                id,
                roomId: type === "room" ? id : null,
                zoneId: type === "zone" ? id : null,
                laundryAreaId: type === "laundry" ? id : null,
                featureId: type === "feature" ? id : null
            };
        },
        taskRecurrenceRule(value, weekdays = []) {
            if (value === "daily")
                return "FREQ=DAILY";
            if (["weekly", "biweekly"].includes(value)) {
                const dayPart = weekdays.length ? `;BYDAY=${weekdays.join(",")}` : "";
                const interval = value === "biweekly" ? ";INTERVAL=2" : "";
                return `FREQ=WEEKLY${interval}${dayPart}`;
            }
            return null;
        },
        localTodayKey() {
            const now = new Date();
            return [
                now.getFullYear(),
                String(now.getMonth() + 1).padStart(2, "0"),
                String(now.getDate()).padStart(2, "0")
            ].join("-");
        },
        async saveTask(event) {
            event.preventDefault();
            if (!this.requireAdmin())
                return;
            const person = this.assignablePeople()
                .find(item => item.id === this.selectedTaskPersonId);
            if (!person) {
                return this.notify("Choose a household person first.", { tone: "attention", title: "Task Assignments" });
            }
            const title = this.value("taskTitleInput").trim();
            if (!title) {
                return this.notify("Enter the task first.", { tone: "attention", title: "Task Assignments" });
            }
            const config = this.simpleTaskCategoryConfig();
            const target = this.parseSimpleTaskTarget(config);
            if (!config.optionalTarget && !target.id) {
                return this.notify(`Choose the ${config.targetLabel.toLowerCase()} for this task.`, { tone: "attention", title: "Task Assignments" });
            }
            const repeatValue = this.value("taskRepeatInput") || "daily";
            const weekdays = this.selectedTaskWeekdays();
            const dueDate = repeatValue === "none"
                ? this.value("taskDueDateInput")
                : (["weekly", "biweekly"].includes(repeatValue) ? this.localTodayKey() : null);
            if (repeatValue === "none" && !dueDate) {
                return this.notify("Choose the date for this one-time task.", { tone: "attention", title: "Task Assignments" });
            }
            if (["weekly", "biweekly"].includes(repeatValue) && !weekdays.length) {
                return this.notify("Choose at least one day of the week.", { tone: "attention", title: "Task Assignments" });
            }
            const button = event.submitter;
            await this.withBusy(button, async () => {
                const { error } = await this.supabase.rpc("homeos_save_task", {
                    p_task_id: null,
                    p_title: title,
                    p_details: this.value("taskDetailsInput").trim() || null,
                    p_source_type: config.sourceType,
                    p_source_record_id: null,
                    p_target_type: target.type,
                    p_room_id: target.roomId,
                    p_zone_id: target.zoneId,
                    p_laundry_area_id: target.laundryAreaId,
                    p_household_feature_id: target.featureId,
                    p_assignment_mode: "individual",
                    p_priority: this.value("taskPriorityInput") || "normal",
                    p_due_date: dueDate,
                    p_due_time: null,
                    p_recurrence_rule: this.taskRecurrenceRule(repeatValue, weekdays),
                    p_recurrence_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
                    p_recurrence_end_date: null,
                    p_active: true,
                    p_assignments: [
                        {
                            family_member_id: person.id,
                            assignment_role: "assignee",
                            completion_required: true,
                            rotation_order: null
                        }
                    ]
                });
                if (error)
                    throw error;
                this.notify(`${title} was assigned to ${this.personName(person)} · ${this.taskScheduleLabel()}.`, { tone: "success", title: "Task assigned" });
                this.clearSimpleTaskForm({ keepPerson: true });
                await this.loadSelectedTaskPersonTasks({ force: true });
                document.getElementById("taskTitleInput")?.focus();
            }).catch(error => this.handleError("The task could not be assigned.", error));
        },
    };
})();
