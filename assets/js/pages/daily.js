/* ============================================================
   HOMEOS // DAILY

   Daily Rhythm, shifts, routines and companion state.
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";
    const service = window.HomeOS?.services?.daily;
    const taskService = window.HomeOS?.services?.tasks;
    const App = {
        state: null,
        daily: null,
        clockTimer: null,
        toastTimer: null,
        timerInterval: null,
        companionReactionTimer: null,
        starterChecked: false,
        celebrationTimer: null,
        timerCelebrationTimer: null,
        celebrationQueue: [],
        shiftView: null,
        lastRecommendedShift: null,
        timer: {
            minutes: 10,
            durationSeconds: 600,
            remainingSeconds: 600,
            running: false,
            endAt: null,
            label: "",
            sourceTaskId: null
        },
        LAUNDRY_STAGES: ["washing", "drying", "folding", "put_away"],
        async init() {
            if (!service || !taskService) {
                console.error("Daily Rhythm services are unavailable.");
                return;
            }
            this.bindEvents();
            this.state = await window.HomeOS.session.guard();
            if (!this.state?.authenticated)
                return;
            // Make the page feel alive immediately. The clock, timer and
            // companion do not need to wait on network/database work.
            this.startClock();
            this.startTimerClock();
            this.renderCompanion();
            await this.reload();
        },
        canManageTasks() {
            return Boolean(window.HomeOS.permissions?.isAdmin?.());
        },
        canAddPersonalTasks() {
            return Boolean(this.state?.authenticated && this.state?.person?.id);
        },
        async reload({ skipStarter = false } = {}) {
            const result = await service.load(this.state.household.id);
            if (result.error) {
                console.error("[HomeOS] Daily Rhythm load failed.", result.error);
                this.setText("dailyGuideMessage", "HOME OS could not load the rhythm. Try refreshing once.");
                this.toast(result.error.message || "HOME OS could not load Daily Rhythm.");
                return;
            }
            this.daily = result.data;
            this.render();
            // A brand-new household receives a practical starter rhythm once.
            // If the user later removes every starter task, inactive task history
            // prevents HOME OS from recreating them.
            if (!skipStarter && !this.starterChecked && this.canManageTasks() && !this.visibleDailyTasks().length) {
                this.starterChecked = true;
                const starter = await service.ensureStarterRhythm(this.state.household.id, this.daily.rooms, this.state?.person?.id || null);
                if (starter.error) {
                    console.warn("[HomeOS] Starter rhythm could not be created.", starter.error);
                }
                else if (starter.created) {
                    await this.reload({ skipStarter: true });
                    this.toast(`${starter.count} starter tasks added. Keep what fits and remove what doesn't.`);
                }
            }
        },
        startClock() {
            this.renderClock();
            window.clearInterval(this.clockTimer);
            this.clockTimer = window.setInterval(() => this.renderClock(), 30000);
        },
        renderClock() {
            const now = new Date();
            const hour = now.getHours();
            const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
            const name = this.state?.user?.displayName || "HOME OS";
            const target = document.getElementById("dailyGreeting");
            if (target)
                target.innerHTML = `${this.escape(greeting)},<br><strong>${this.escape(name)}.</strong>`;
            this.setText("dailyClock", new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(now));
            this.setText("dailyShortDate", new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(now).toUpperCase());
            this.setText("dailyDateTime", new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(now));
            if (this.daily) {
                this.renderGuide();
                this.renderProgress();
                this.renderTimerTaskOptions();
            }
            this.renderCompanion();
        },
        render() {
            if (!this.daily)
                return;
            this.renderGuide();
            this.renderProgress();
            this.renderShiftList("opening");
            this.renderShiftList("closing");
            this.renderRoomSelect();
            this.renderShopping();
            this.renderLaundryFlow();
            this.renderCompanion();
            this.renderTimerTaskOptions();
            this.renderTimer();
            document.querySelectorAll("[data-shift-composer]").forEach(composer => {
                composer.hidden = !this.canAddPersonalTasks();
            });
            this.renderPersonalRhythmLabels();
        },
        taskAppliesToCurrentPerson(runtime) {
            if (!runtime)
                return false;
            const personId = this.state?.person?.id;
            const mode = runtime.task?.assignment_mode || "anyone";
            // Household-flexible tasks remain visible to every adult.
            if (mode === "anyone")
                return true;
            if (!personId)
                return false;
            if (mode === "rotation") {
                return runtime.expectedRotationPersonId === personId;
            }
            return runtime.assignments.some(row => row.family_member_id === personId);
        },
        visibleDailyTasks() {
            return (this.daily?.tasks || []).filter(runtime => this.taskAppliesToCurrentPerson(runtime));
        },
        runtimeForShift(shift) {
            const source = shift === "closing" ? "daily_closing" : "daily_opening";
            return this.visibleDailyTasks().filter(runtime => runtime.task.source_type === source);
        },
        runtimeByTaskId(taskId) {
            return this.visibleDailyTasks().find(runtime => runtime.task.id === taskId) || null;
        },
        calculateProgress(runtimes) {
            const list = Array.isArray(runtimes) ? runtimes : [];
            const total = list.length;
            const completed = list.filter(runtime => this.isDoneForCurrentPerson(runtime)).length;
            return {
                total,
                completed,
                remaining: Math.max(0, total - completed),
                percent: total ? Math.round((completed / total) * 100) : 0
            };
        },
        calculateOverallProgress() {
            return this.calculateProgress(this.visibleDailyTasks());
        },
        getRecommendedShift() {
            // Opening is the active rhythm until 5:00 PM. Closing becomes the
            // active rhythm at 5:00 PM even if someone worked ahead earlier.
            return new Date().getHours() < 17 ? "opening" : "closing";
        },
        renderGuide() {
            const opening = this.calculateProgress(this.runtimeForShift("opening"));
            const closing = this.calculateProgress(this.runtimeForShift("closing"));
            const overall = this.calculateOverallProgress();
            let message;
            if (overall.total && overall.percent === 100) {
                message = "Today's household rhythm is complete. HOME OS will start fresh tomorrow.";
            }
            else if (new Date().getHours() < 17 && opening.remaining) {
                message = `${opening.remaining} Opening task${opening.remaining === 1 ? "" : "s"} remain. Each one gives your companion sunlight. Closing takes over at 5:00 PM.`;
            }
            else if (closing.remaining) {
                message = `${closing.remaining} Closing task${closing.remaining === 1 ? "" : "s"} remain. Evening Rhythm is active now, and each one gives your companion water.`;
            }
            else {
                message = "Opening and Closing stay visible together so you can move through the household without switching views.";
            }
            this.setText("dailyGuideMessage", message);
        },
        renderProgress() {
            const opening = this.calculateProgress(this.runtimeForShift("opening"));
            const closing = this.calculateProgress(this.runtimeForShift("closing"));
            const overall = this.calculateOverallProgress();
            this.setText("openingShiftProgress", `${opening.percent}%`);
            this.setText("closingShiftProgress", `${closing.percent}%`);
            this.setText("openingShiftRemaining", !opening.total
                ? "No tasks yet"
                : opening.remaining
                    ? `${opening.remaining} task${opening.remaining === 1 ? "" : "s"} left`
                    : "Opening complete");
            this.setText("closingShiftRemaining", !closing.total
                ? "No tasks yet"
                : closing.remaining
                    ? `${closing.remaining} task${closing.remaining === 1 ? "" : "s"} left`
                    : "Closing complete");
            this.setBarWidth("openingShiftProgressBar", opening.percent);
            this.setBarWidth("closingShiftProgressBar", closing.percent);
            this.setText("selectedShiftLabel", "DAILY RHYTHM");
            this.setText("selectedShiftProgress", `${overall.percent}%`);
            this.setText("selectedShiftRemaining", `${overall.remaining} TASK${overall.remaining === 1 ? "" : "S"}`);
            this.setBarWidth("dailyOverallProgressBar", overall.percent);
            this.setText("dailyOverallText", `${overall.completed} of ${overall.total} daily tasks complete.`);
            document.getElementById("openingShiftCard")?.classList.toggle("is-complete", opening.total > 0 && opening.percent === 100);
            document.getElementById("closingShiftCard")?.classList.toggle("is-complete", closing.total > 0 && closing.percent === 100);
            // Closing Rhythm becomes current at 5 PM.
            const activeShift = this.getRecommendedShift();
            document.getElementById("openingShiftCard")?.classList.toggle("is-current", activeShift === "opening");
            document.getElementById("closingShiftCard")?.classList.toggle("is-current", activeShift === "closing");
            const openingNow = document.getElementById("openingShiftNow");
            const closingNow = document.getElementById("closingShiftNow");
            if (openingNow)
                openingNow.hidden = activeShift !== "opening";
            if (closingNow)
                closingNow.hidden = activeShift !== "closing";
            this.setText("openingShiftTabCount", opening.total ? (opening.remaining ? `${opening.remaining} left` : "Done") : "No tasks");
            this.setText("closingShiftTabCount", closing.total ? (closing.remaining ? `${closing.remaining} left` : "Done") : "No tasks");
            this.syncShiftWorkspace(activeShift);
        },
        setShiftWorkspaceView(shift) {
            if (!['opening', 'closing'].includes(shift))
                return;
            this.shiftView = shift;
            this.syncShiftWorkspace(this.getRecommendedShift());
        },
        syncShiftWorkspace(activeShift = this.getRecommendedShift()) {
            // Follow the real shift when the day crosses 5 PM.
            // The other shift can still be opened without changing what is current.
            if (!this.shiftView || this.lastRecommendedShift !== activeShift) {
                this.shiftView = activeShift;
                this.lastRecommendedShift = activeShift;
            }
            const view = this.shiftView;
            const openingCard = document.getElementById('openingShiftCard');
            const closingCard = document.getElementById('closingShiftCard');
            if (openingCard)
                openingCard.hidden = view !== 'opening';
            if (closingCard)
                closingCard.hidden = view !== 'closing';
            document.querySelectorAll('[data-shift-view]').forEach(button => {
                const selected = button.dataset.shiftView === view;
                button.classList.toggle('is-selected', selected);
                button.setAttribute('aria-selected', selected ? 'true' : 'false');
                button.classList.toggle('is-now', button.dataset.shiftView === activeShift);
            });
            this.setText('dailyShiftViewName', view === 'closing' ? 'Closing Shift' : 'Opening Shift');
        },
        renderShiftList(shift) {
            const target = document.getElementById(shift === "opening"
                ? "openingTaskList"
                : "closingTaskList");
            if (!target)
                return;
            const runtimes = this.runtimeForShift(shift);
            if (!runtimes.length) {
                target.innerHTML = `
                    <div class="daily-visible-empty">
                        No ${this.shiftName(shift)} tasks yet.
                        ${this.canManageTasks() ? "Add one right here at the bottom of this shift." : ""}
                    </div>`;
                return;
            }
            const groups = new Map();
            runtimes.forEach(runtime => {
                const room = this.roomForTask(runtime.task);
                const label = room
                    ? (this.levelName(room.level_id) || "Home")
                    : "Whole Home";
                if (!groups.has(label))
                    groups.set(label, []);
                groups.get(label).push(runtime);
            });
            target.innerHTML = [...groups.entries()].map(([label, tasks]) => `
                <div class="daily-visible-task-group">
                    ${this.escape(label)}
                </div>
                ${tasks.map(runtime => this.renderTaskRow(runtime)).join("")}
            `).join("");
        },
        renderTaskRow(runtime) {
            const task = runtime.task;
            const currentPersonId = this.state?.person?.id;
            const selfCompletion = runtime.completions.find(row => row.family_member_id === currentPersonId);
            const viewComplete = this.isDoneForCurrentPerson(runtime);
            const room = this.roomForTask(task);
            const completedAt = selfCompletion?.completed_at || runtime.occurrence?.completed_at || null;
            const meta = viewComplete && completedAt
                ? `Completed ${this.formatTime(completedAt)}`
                : `${this.locationLabelForRoom(room)} · ${this.assignmentSummary(runtime)}`;
            const canManage = this.canManageTasks();
            const canRemove = canManage || this.isPersonalTaskOwnedByCurrentPerson(runtime);
            return `
                <div class="daily-task-row ${viewComplete ? "done" : ""}">
                    <input class="daily-task-checkbox" id="daily-${this.attr(task.id)}" type="checkbox" data-daily-task="${this.attr(task.id)}" ${viewComplete ? "checked" : ""}>
                    <label class="daily-task-main" for="daily-${this.attr(task.id)}">
                        <strong>${this.escape(task.title)}</strong>
                        <span>${this.escape(meta)}</span>
                    </label>
                    <div class="daily-task-row-actions">
                        <button class="daily-task-timer" type="button" data-task-timer="${this.attr(task.id)}" title="Start a focus timer for ${this.attr(task.title)}" aria-label="Start a focus timer for ${this.attr(task.title)}">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l3 2M9 3h6"></path></svg>
                        </button>
                        ${canManage ? `<button class="daily-task-manage" type="button" data-manage-daily-task="${this.attr(task.id)}" title="Manage assignment">···</button>` : ""}
                        ${canRemove ? `<button class="daily-task-remove" type="button" data-remove-daily-task="${this.attr(task.id)}" title="Remove from my Daily Rhythm">×</button>` : ""}
                    </div>
                </div>`;
        },
        assignmentSummary(runtime) {
            const mode = runtime.task.assignment_mode;
            const personId = this.state?.person?.id;
            if (mode === "anyone")
                return "SHARED HOUSEHOLD";
            if (mode === "rotation") {
                const expected = runtime.expectedRotationPersonId;
                return expected === personId ? "YOU · ROTATION" : `ROTATION · ${this.personName(expected) || "ASSIGNED"}`;
            }
            const names = runtime.assignments
                .map(row => row.family_member_id === personId ? "YOU" : this.personName(row.family_member_id))
                .filter(Boolean);
            if (names.length === 1)
                return names[0].toUpperCase();
            if (mode === "shared")
                return `SHARED · ${names.join(" + ").toUpperCase()}`;
            if (mode === "individual")
                return names.join(" + ").toUpperCase();
            return `${taskService.assignmentModeLabel(mode).toUpperCase()}${names.length ? ` · ${names.join(" + ").toUpperCase()}` : ""}`;
        },
        locationLabelForRoom(room) {
            if (!room)
                return "Whole Home";
            const level = this.levelName(room.level_id);
            return level ? `${level} — ${room.name}` : room.name;
        },
        isPersonalTaskOwnedByCurrentPerson(runtime) {
            const personId = this.state?.person?.id;
            if (!runtime || !personId)
                return false;
            if (runtime.task.assignment_mode !== "individual")
                return false;
            if (runtime.assignments.length !== 1)
                return false;
            return runtime.assignments[0]?.family_member_id === personId;
        },
        roomForTask(task) {
            return task.room_id ? (this.daily.rooms.find(room => room.id === task.room_id) || null) : null;
        },
        personName(id) {
            return this.daily.people.find(person => person.id === id)?.display_name || "";
        },
        async toggleTask(taskId, checkbox = null) {
            const runtime = this.runtimeByTaskId(taskId);
            if (!runtime?.occurrence)
                return;
            const personId = this.state?.person?.id;
            if (!personId) {
                this.toast("This HOME OS account is not linked to a household person.");
                return;
            }
            const mode = runtime.task.assignment_mode;
            const assigned = runtime.assignments.some(row => row.family_member_id === personId);
            const canSelf = mode === "anyone" || (["shared", "individual", "owner_helpers"].includes(mode) && assigned) || (mode === "rotation" && runtime.expectedRotationPersonId === personId);
            if (!canSelf) {
                const ownerName = mode === "rotation"
                    ? (this.personName(runtime.expectedRotationPersonId) || "another household person")
                    : (runtime.assignments.map(row => this.personName(row.family_member_id)).filter(Boolean).join(" + ") || "another household person");
                this.toast(`This task belongs to ${ownerName}. HOME OS records completions as the person who is signed in. Use ··· to reassign it if needed.`);
                return;
            }
            const before = this.captureMilestones();
            const existing = runtime.completions.find(row => row.family_member_id === personId);
            const completing = !existing;
            const originalChecked = Boolean(existing);
            const title = runtime.task.title;

            if (checkbox) {
                checkbox.disabled = true;
            }

            const result = await taskService.setCompletion({
                occurrenceId: runtime.occurrence.id,
                familyMemberId: personId,
                complete: completing
            });
            if (result.error) {
                if (checkbox) {
                    checkbox.checked = originalChecked;
                    checkbox.disabled = false;
                }
                this.toast(result.error.message || "HOME OS could not update this task.");
                return;
            }
            if (completing) {
                // Opening gives sunlight; Closing gives water. Keep the feedback
                // on the page instead of opening a popup for every task.
                const shift = runtime.task.source_type === "daily_closing" ? "closing" : "opening";
                const rewardType = this.careForCompanion(shift);
                this.showCompanionReaction(title, rewardType);
            }
            await this.reload({ skipStarter: true });
            if (completing) {
                this.handleNewMilestones(before);
            }
        },
        async manageTask(taskId) {
            const runtime = this.runtimeByTaskId(taskId);
            if (!runtime)
                return;
            try {
                await window.HomeOS.components.taskEditor.open({
                    task: runtime.task,
                    onSaved: async () => this.reload()
                });
            }
            catch (error) {
                this.toast(error.message || "HOME OS could not open task management.");
            }
        },
        async archiveTask(taskId) {
            const runtime = this.runtimeByTaskId(taskId);
            if (!runtime)
                return;
            let result;
            if (this.canManageTasks()) {
                result = await taskService.archiveTask(runtime.task);
            }
            else if (this.isPersonalTaskOwnedByCurrentPerson(runtime)) {
                result = await service.archiveMyDailyTask(taskId);
            }
            else {
                this.toast("Only an Owner/Admin can remove a household-assigned task.");
                return;
            }
            if (result.error) {
                this.toast(result.error.message || "HOME OS could not remove this Daily task.");
                return;
            }
            await this.reload({ skipStarter: true });
            this.toast("Task removed from your Daily Rhythm.");
        },
        renderRoomSelect() {
            if (!this.daily)
                return;
            const levels = (this.daily.levels || [])
                .filter(level => level.active !== false)
                .slice()
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.name || "").localeCompare(String(b.name || "")));
            const levelOrder = new Map(levels.map((level, index) => [level.id, index]));
            const rooms = (this.daily.rooms || [])
                .filter(room => room.active !== false)
                .slice()
                .sort((a, b) => {
                const levelA = levelOrder.has(a.level_id) ? levelOrder.get(a.level_id) : 9999;
                const levelB = levelOrder.has(b.level_id) ? levelOrder.get(b.level_id) : 9999;
                return levelA - levelB
                    || (a.sort_order ?? 0) - (b.sort_order ?? 0)
                    || String(a.name || "").localeCompare(String(b.name || ""));
            });
            ["opening", "closing"].forEach(shift => {
                const select = document.getElementById(`${shift}NewTaskArea`);
                if (!select)
                    return;
                const current = select.value;
                select.innerHTML = `<option value="">Whole Home</option>` + rooms.map(room => {
                    const levelName = this.levelName(room.level_id) || "Home";
                    return `<option value="${this.attr(room.id)}">${this.escape(levelName)} — ${this.escape(room.name)}</option>`;
                }).join("");
                if ([...select.options].some(option => option.value === current))
                    select.value = current;
            });
        },
        renderPersonalRhythmLabels() {
            const rawName = this.state?.person?.display_name || this.state?.user?.displayName || "You";
            const firstName = String(rawName).trim().split(/\s+/)[0] || "You";
            this.setText("openingShiftOwnerLabel", `${firstName.toUpperCase()}'S`);
            this.setText("closingShiftOwnerLabel", `${firstName.toUpperCase()}'S`);
            this.setText("openingTaskOwnerName", firstName);
            this.setText("closingTaskOwnerName", firstName);
        },
        async addInlineTask(shift) {
            if (!this.canAddPersonalTasks()) {
                this.toast("Link this login to a household person before adding personal Daily Rhythm tasks.");
                return;
            }
            const normalizedShift = shift === "closing" ? "closing" : "opening";
            const input = document.getElementById(`${normalizedShift}NewTask`);
            const roomInput = document.getElementById(`${normalizedShift}NewTaskArea`);
            const repeatInput = document.getElementById(`${normalizedShift}NewTaskRecurring`);
            const button = document.querySelector(`[data-add-shift-task="${normalizedShift}"]`);
            const title = input?.value?.trim();
            if (!title) {
                this.toast(`Type an ${normalizedShift === "opening" ? "Opening" : "Closing"} task first.`);
                input?.focus();
                return;
            }
            if (button) {
                button.disabled = true;
                button.dataset.originalHtml = button.innerHTML;
                button.innerHTML = "<span>Adding…</span>";
            }
            const result = await service.createMyDailyTask({
                title,
                shift: normalizedShift,
                roomId: roomInput?.value || null,
                recurring: Boolean(repeatInput?.checked),
                familyMemberId: this.state?.person?.id || null
            });
            if (button) {
                button.disabled = false;
                button.innerHTML = button.dataset.originalHtml || "<span>Add task</span><b aria-hidden=\"true\">→</b>";
            }
            if (result.error) {
                console.error("[HomeOS] Add Daily task failed.", result.error);
                this.toast(result.error.message || "HOME OS could not add this task.");
                return;
            }
            input.value = "";
            await this.reload({ skipStarter: true });
            this.toast(`${title} added to your ${this.shiftName(normalizedShift)}.`);
            input?.focus();
        },
        async buildStarterRhythm() {
            if (!this.canManageTasks())
                return;
            const result = await service.buildStarterRhythm(this.state.household.id, this.daily.rooms, this.state?.person?.id || null);
            if (result.error) {
                this.toast(result.error.message || "HOME OS could not build the starter rhythm.");
                return;
            }
            await this.reload({ skipStarter: true });
            this.toast(result.data?.length ? "Starter Daily Rhythm added." : "Your starter rhythm is already here.");
        },
        renderShopping() {
            const container = document.getElementById("dailyShoppingList");
            if (!container)
                return;
            const list = this.daily.shopping || [];
            const open = list.filter(item => !item.completed);
            this.setText("dailyShoppingCount", `${open.length} ITEM${open.length === 1 ? "" : "S"}`);
            if (!list.length) {
                container.innerHTML = `<div class="daily-shopping-empty"><span>◇</span><strong>Nothing to pick up yet.</strong><p>Add something the moment you think of it.</p></div>`;
                return;
            }
            container.innerHTML = list.map(item => `
                <div class="daily-shopping-row ${item.completed ? "done" : ""}">
                    <input type="checkbox" id="shopping-${this.attr(item.id)}" data-shopping-check="${this.attr(item.id)}" ${item.completed ? "checked" : ""}>
                    <label for="shopping-${this.attr(item.id)}"><strong>${this.escape(item.name)}</strong><span>${item.source_type === "daily_quick" ? "QUICK SHOPPING" : "SHARED LIST"}</span></label>
                    <button type="button" data-remove-shopping="${this.attr(item.id)}" aria-label="Remove ${this.attr(item.name)}">×</button>
                </div>`).join("");
        },
        async addShoppingItem() {
            const input = document.getElementById("newShoppingItem");
            const title = input?.value?.trim();
            if (!title) {
                this.toast("Type an item before adding it.");
                input?.focus();
                return;
            }
            const result = await service.addShoppingItem(this.state.household.id, title);
            if (result.error) {
                this.toast(result.error.message || "HOME OS could not add this shopping item.");
                return;
            }
            input.value = "";
            await this.reload();
            input.focus();
            this.toast(`${title} added to the shared shopping list.`);
        },
        async toggleShoppingItem(itemId, complete, checkbox = null) {
            const item = this.daily?.shopping?.find(row => row.id === itemId) || null;
            const originalChecked = Boolean(item?.completed);

            if (checkbox) {
                checkbox.disabled = true;
            }

            const result = await service.setShoppingComplete(
                this.state.household.id,
                itemId,
                complete
            );

            if (result.error) {
                if (checkbox) {
                    checkbox.checked = originalChecked;
                    checkbox.disabled = false;
                }
                this.toast(result.error.message || "HOME OS could not update this shopping item.");
                return;
            }

            await this.reload();
        },
        async removeShoppingItem(itemId) {
            const result = await service.removeShoppingItem(this.state.household.id, itemId);
            if (result.error)
                this.toast(result.error.message || "HOME OS could not remove this shopping item.");
            else {
                await this.reload();
                this.toast("Shopping item removed.");
            }
        },
        renderLaundryFlow() {
            const card = document.getElementById("dailyLaundryFlow");
            const track = document.getElementById("dailyLaundryStageTrack");
            const action = document.getElementById("dailyLaundryActionButton");
            const newLoad = document.getElementById("dailyLaundryNewLoadButton");
            if (!card || !track || !action)
                return;
            const loads = this.daily.laundry.loads || [];
            if (!loads.length) {
                card.dataset.stage = "idle";
                this.setText("dailyLaundryState", "IDLE");
                this.setText("dailyLaundryCount", "0 ACTIVE");
                this.setText("dailyLaundryTitle", "No active loads");
                this.setText("dailyLaundryMessage", "Laundry Flow is ready when you are.");
                track.innerHTML = this.renderLaundryStageMarkup(null);
                action.textContent = "+ Start A Load";
                action.dataset.laundryAction = "start";
                delete action.dataset.loadId;
                if (newLoad)
                    newLoad.hidden = true;
                return;
            }
            const load = loads[0];
            const stage = this.LAUNDRY_STAGES.includes(load.stage) ? load.stage : "washing";
            const index = this.LAUNDRY_STAGES.indexOf(stage);
            const next = this.LAUNDRY_STAGES[index + 1] || "complete";
            const extra = Math.max(0, loads.length - 1);
            card.dataset.stage = this.cssLaundryStage(stage);
            this.setText("dailyLaundryState", this.laundryStageLabel(stage).toUpperCase());
            this.setText("dailyLaundryCount", `${loads.length} ACTIVE${loads.length === 1 ? "" : " LOADS"}`);
            this.setText("dailyLaundryTitle", load.name || "Laundry Load");
            const stageTime = load.metadata?.stage_updated_at || load.started_at;
            const stageCopy = { washing: "Washer is running", drying: "Dryer is running", folding: "Ready to fold", put_away: "Ready to put away" }[stage] || "Laundry is moving";
            this.setText("dailyLaundryMessage", `${stageCopy}${stageTime ? ` · ${this.formatTime(stageTime)}` : ""}${extra ? ` · +${extra} more active` : ""}`);
            track.innerHTML = this.renderLaundryStageMarkup(stage);
            action.textContent = next === "complete" ? "Finish + Put Away ✓" : `Move To ${this.laundryStageLabel(next)} →`;
            action.dataset.laundryAction = next === "complete" ? "complete" : "advance";
            action.dataset.loadId = load.id;
            if (newLoad)
                newLoad.hidden = false;
        },
        renderLaundryStageMarkup(activeStage) {
            const activeIndex = activeStage ? this.LAUNDRY_STAGES.indexOf(activeStage) : -1;
            return this.LAUNDRY_STAGES.map((stage, index) => {
                const status = activeIndex === -1 ? "" : index < activeIndex ? "complete" : index === activeIndex ? "active" : "";
                return `<div class="daily-laundry-stage ${status}"><span>${String(index + 1).padStart(2, "0")}</span><strong>${this.laundryStageLabel(stage)}</strong></div>`;
            }).join("");
        },
        openLaundryDialog() {
            const dialog = document.getElementById("dailyLaundryDialog");
            const input = document.getElementById("dailyLaundryName");
            if (!dialog || !input)
                return;
            input.value = "";
            if (typeof dialog.showModal === "function")
                dialog.showModal();
            else
                dialog.setAttribute("open", "");
            requestAnimationFrame(() => input.focus());
        },
        closeLaundryDialog() {
            const dialog = document.getElementById("dailyLaundryDialog");
            if (!dialog)
                return;
            if (typeof dialog.close === "function")
                dialog.close();
            else
                dialog.removeAttribute("open");
        },
        async startLaundryLoad() {
            const input = document.getElementById("dailyLaundryName");
            const name = input?.value?.trim();
            if (!name) {
                this.toast("Name the load before starting it.");
                input?.focus();
                return;
            }
            const area = this.daily.laundry.areas.find(item => item.has_washer) || this.daily.laundry.areas[0] || null;
            const result = await service.startLaundryLoad(this.state.household.id, name, area?.id || null);
            if (result.error) {
                this.toast(result.error.message || "HOME OS could not start this laundry load.");
                return;
            }
            this.closeLaundryDialog();
            await this.reload();
            this.toast(`${name} started in Wash.`);
        },
        async advanceLaundryLoad(loadId) {
            const load = this.daily.laundry.loads.find(item => item.id === loadId);
            if (!load)
                return;
            const result = await service.advanceLaundryLoad(this.state.household.id, load);
            if (result.error) {
                this.toast(result.error.message || "HOME OS could not move this laundry load.");
                return;
            }
            await this.reload();
            this.toast(result.data?.stage === "complete" ? `${load.name} is finished and put away.` : `${load.name} moved to ${this.laundryStageLabel(result.data.stage)}.`);
        },
        wakeTime() {
            const value = this.daily?.schedule?.wakeTime || "08:00";
            return /^\d{2}:\d{2}$/.test(value) ? value : "08:00";
        },
        bedTime() {
            const value = this.daily?.schedule?.bedTime || "22:00";
            return /^\d{2}:\d{2}$/.test(value) ? value : "22:00";
        },
        async saveDaySchedule() {
            if (!this.canManageTasks()) {
                this.toast("Only a HomeOS Owner or Admin can change the household day cycle.");
                return;
            }

            const wake = document.getElementById("dailyWakeTime")?.value || "08:00";
            const bed = document.getElementById("dailyBedTime")?.value || "22:00";

            if (!/^\d{2}:\d{2}$/.test(wake) || !/^\d{2}:\d{2}$/.test(bed)) {
                this.toast("Choose both a wake-up time and bedtime first.");
                return;
            }

            if (wake === bed) {
                this.toast("Wake-up time and bedtime need to be different.");
                return;
            }

            const button = document.getElementById("dailySaveSchedule");
            if (button) {
                button.disabled = true;
                button.dataset.originalText = button.textContent || "Save";
                button.textContent = "Saving…";
            }

            const result = await service.saveDaySchedule(
                this.state.household.id,
                { wakeTime: wake, bedTime: bed }
            );

            if (button) {
                button.disabled = false;
                button.textContent = button.dataset.originalText || "Save";
            }

            if (result.error) {
                console.error("[HomeOS] Day-cycle save failed.", result.error);
                this.toast(result.error.message || "HOME OS could not save the day cycle.");
                this.renderCompanion();
                return;
            }

            this.daily.schedule = result.data;
            this.renderCompanion();
            this.toast(`Your companion will wake at ${this.formatScheduleTime(wake)} and rest at ${this.formatScheduleTime(bed)}.`);
        },
        timeToMinutes(value) {
            const [hour, minute] = String(value || "00:00").split(":").map(Number);
            return ((Number.isFinite(hour) ? hour : 0) * 60) + (Number.isFinite(minute) ? minute : 0);
        },
        currentMinutes(now = new Date()) {
            return (now.getHours() * 60) + now.getMinutes();
        },
        isAwakeWindow(now = new Date()) {
            const wake = this.timeToMinutes(this.wakeTime());
            const bed = this.timeToMinutes(this.bedTime());
            const current = this.currentMinutes(now);
            if (wake === bed)
                return true;
            if (wake < bed)
                return current >= wake && current < bed;
            return current >= wake || current < bed;
        },
        isCompanionSleeping(now = new Date()) {
            return !this.isAwakeWindow(now);
        },
        sleepPhase(now = new Date()) {
            if (!this.isCompanionSleeping(now))
                return "awake";
            const wake = this.timeToMinutes(this.wakeTime());
            const bed = this.timeToMinutes(this.bedTime());
            const current = this.currentMinutes(now);
            if (wake < bed)
                return current < wake ? "before-wake" : "after-bed";
            // Overnight wake schedules: the sleep interval sits between bedtime and wake.
            return current >= bed && current < wake ? "after-bed" : "before-wake";
        },
        minutesSinceWake(now = new Date()) {
            if (!this.isAwakeWindow(now))
                return 0;
            const wake = this.timeToMinutes(this.wakeTime());
            const current = this.currentMinutes(now);
            return (current - wake + 1440) % 1440;
        },
        minutesUntilBed(now = new Date()) {
            if (!this.isAwakeWindow(now))
                return 0;
            const bed = this.timeToMinutes(this.bedTime());
            const current = this.currentMinutes(now);
            return (bed - current + 1440) % 1440;
        },
        careForCompanion(shift = "opening") {
            // Opening completion gives the companion sunlight; Closing gives water.
            const type = shift === "closing" ? "water" : "sun";
            this.lastCompanionCareType = type;
            this.renderCompanion();
            return type;
        },
        canCurrentPersonComplete(runtime) {
            const personId = this.state?.person?.id;
            if (!runtime || !personId)
                return true;
            const mode = runtime.task.assignment_mode;
            const assigned = runtime.assignments.some(row => row.family_member_id === personId);
            if (mode === "anyone")
                return true;
            if (["shared", "individual", "owner_helpers"].includes(mode))
                return assigned;
            if (mode === "rotation")
                return runtime.expectedRotationPersonId === personId;
            return true;
        },
        isDoneForCurrentPerson(runtime) {
            const personId = this.state?.person?.id;
            if (!runtime)
                return true;
            if (["individual", "owner_helpers"].includes(runtime.task.assignment_mode) && personId) {
                return runtime.completions.some(row => row.family_member_id === personId);
            }
            return runtime.occurrence?.status === "complete";
        },
        nextIncompleteTask(shift) {
            const list = this.runtimeForShift(shift).filter(runtime => !this.isDoneForCurrentPerson(runtime));
            return list.find(runtime => this.canCurrentPersonComplete(runtime)) || list[0] || null;
        },
        companionTalkMessages() {
            const phase = this.sleepPhase();
            const wake = this.formatScheduleTime(this.wakeTime());
            const bed = this.formatScheduleTime(this.bedTime());
            if (phase === "before-wake") {
                return [
                    `We're still resting. I'll wake with you at ${wake}.`,
                    "Nothing needs your attention from me yet. Rest first."
                ];
            }
            if (phase === "after-bed") {
                return [
                    `It's after ${bed}. We're done for tonight.`,
                    `I'll be ready again when we wake at ${wake}.`
                ];
            }
            if (!this.daily)
                return ["I'm checking today's HOME OS rhythm now."];
            const overall = this.calculateOverallProgress();
            const evening = new Date().getHours() >= 17;
            const messages = [];
            if (!overall.total) {
                return [
                    "There aren't any Daily Rhythm tasks yet.",
                    "Add one small Opening or Closing task and I'll start tracking it with you."
                ];
            }
            if (overall.percent === 100) {
                return [
                    "Everything on today's Daily Rhythm is complete.",
                    "Look at my flowers — you finished both parts of the day.",
                    "HOME OS is clear for tonight. Nothing else needs to be done."
                ];
            }
            if (!evening) {
                if (opening.remaining) {
                    messages.push(`${opening.remaining} Opening task${opening.remaining === 1 ? "" : "s"} still need${opening.remaining === 1 ? "s" : ""} to be done.`);
                    const next = this.nextIncompleteTask("opening");
                    if (next) {
                        const room = this.roomForTask(next.task);
                        messages.push(`${next.task.title}${room?.name ? ` in ${room.name}` : ""} is a good next task.`);
                    }
                    messages.push("Every Opening task gives me more sunlight. Finish the shift and my flowers open.");
                }
                else {
                    messages.push("Opening Shift is complete. Nothing else needs to be done this morning.");
                    if (closing.remaining) {
                        const next = this.nextIncompleteTask("closing");
                        messages.push(`Closing starts at 5:00 PM. ${next?.task?.title || "Your first Closing task"} will be waiting then.`);
                    }
                }
                return messages;
            }
            if (closing.remaining) {
                messages.push(`${closing.remaining} Closing task${closing.remaining === 1 ? "" : "s"} still need${closing.remaining === 1 ? "s" : ""} to be done.`);
                const next = this.nextIncompleteTask("closing");
                if (next) {
                    const room = this.roomForTask(next.task);
                    messages.push(`${next.task.title}${room?.name ? ` in ${room.name}` : ""} is the next little win.`);
                }
                messages.push("I'm getting thirsty now that Closing Rhythm is active. Each finished task gives me water.");
            }
            else {
                messages.push("Closing Shift is complete. Nothing else needs to be done tonight.");
                messages.push("I'm watered, blooming, and ready to settle down.");
            }
            if (opening.remaining) {
                messages.push(`${opening.remaining} Opening task${opening.remaining === 1 ? " is" : "s are"} still unfinished, but HOME OS can leave that for tomorrow if you want.`);
            }
            return messages;
        },
        companionGoal() {
            const phase = this.sleepPhase();
            if (phase === "before-wake")
                return `Rest for now. I'll wake with you at ${this.formatScheduleTime(this.wakeTime())}.`;
            if (phase === "after-bed")
                return `We're tucked in for the night. Tomorrow we can start again together at ${this.formatScheduleTime(this.wakeTime())}.`;
            if (!this.daily)
                return "I'm finding our next little win.";
            const overall = this.calculateOverallProgress();
            const evening = new Date().getHours() >= 17;
            if (!overall.total)
                return "Give me one tiny job to grow with — add a task below and we'll start together.";
            if (overall.percent === 100)
                return "I'm blooming! You finished today's whole rhythm — look at everything you cared for.";
            if (!evening) {
                const next = this.nextIncompleteTask("opening");
                if (next) {
                    const room = this.roomForTask(next.task);
                    const where = room?.name ? ` in ${room.name}` : "";
                    return `I could use more sunshine ☀️ Try “${next.task.title}”${where} next. One task is enough to help me perk up.`;
                }
                const closingNext = this.nextIncompleteTask("closing");
                if (closingNext) {
                    return `I'm full of sunshine for now. At 5:00 PM I'll get thirsty — “${closingNext.task.title}” can be our first little evening win.`;
                }
                return "I'm full of sunshine and we're all caught up for now.";
            }
            const next = this.nextIncompleteTask("closing");
            if (next) {
                const room = this.roomForTask(next.task);
                const where = room?.name ? ` in ${room.name}` : "";
                return `I'm still a little thirsty 💧 How about “${next.task.title}”${where}? Finish that one and I'll get a drink.`;
            }
            const openingNext = this.nextIncompleteTask("opening");
            if (openingNext) {
                return `I'm watered for tonight. If you want one extra win, “${openingNext.task.title}” is still waiting — but it can also wait until tomorrow.`;
            }
            return "I'm watered, happy, and ready to settle in. You did enough for today.";
        },
        renderCompanion() {
            const card = document.getElementById("rhythmCompanionCard");
            if (!card)
                return;
            const wakeInput = document.getElementById("dailyWakeTime");
            const bedInput = document.getElementById("dailyBedTime");
            if (wakeInput && document.activeElement !== wakeInput)
                wakeInput.value = this.wakeTime();
            if (bedInput && document.activeElement !== bedInput)
                bedInput.value = this.bedTime();
            const phase = this.sleepPhase();
            const isSleeping = phase !== "awake";
            const overall = this.daily ? this.calculateOverallProgress() : { completed: 0, total: 0, percent: 0 };
            const opening = this.daily ? this.calculateProgress(this.runtimeForShift("opening")) : { completed: 0, total: 0, percent: 0 };
            const closing = this.daily ? this.calculateProgress(this.runtimeForShift("closing")) : { completed: 0, total: 0, percent: 0 };
            const evening = new Date().getHours() >= 17;
            let stateTitle = "Your rhythm companion is ready.";
            let stateMessage = "Add a Daily Rhythm task and he'll start moving with your day.";
            const openingComplete = opening.total > 0 && opening.completed >= opening.total;
            const closingComplete = closing.total > 0 && closing.completed >= closing.total;
            const now = new Date();
            const nowMinutes = (now.getHours() * 60) + now.getMinutes();
            const closingMinutes = Math.max(0, nowMinutes - (17 * 60));
            if (phase === "before-wake") {
                stateTitle = "Shhh… he's sleeping.";
                stateMessage = `He'll wake with you at ${this.formatScheduleTime(this.wakeTime())}.`;
            }
            else if (phase === "after-bed") {
                if (closingComplete) {
                    stateTitle = "He's asleep in bloom.";
                    stateMessage = "Closing Shift is complete. He's watered, glowing, and resting for the night.";
                }
                else {
                    stateTitle = "He's asleep for the night.";
                    stateMessage = "His evening state is paused now. Tomorrow starts fresh when he wakes with you.";
                }
            }
            else if (!evening) {
                if (openingComplete) {
                    stateTitle = "He's glowing in the sunshine.";
                    stateMessage = "Opening Shift is complete, so his flowers are open and he's enjoying the day.";
                }
                else if (opening.total > 0 && opening.percent <= 10) {
                    stateTitle = "He could use some sunshine.";
                    stateMessage = "He needs some morning care. One Opening task will start bringing his energy back.";
                }
                else if (opening.percent <= 29 && opening.total > 0) {
                    stateTitle = "He's still waking up.";
                    stateMessage = "A little more Opening care will bring back his color.";
                }
                else if (opening.percent <= 54 && opening.total > 0) {
                    stateTitle = "He's recovering.";
                    stateMessage = "The sunlight is working. He's starting to perk up.";
                }
                else if (opening.percent <= 79 && opening.total > 0) {
                    stateTitle = "He's happy and healthy.";
                    stateMessage = "He's standing taller and soaking up the morning care.";
                }
                else if (opening.total > 0) {
                    stateTitle = "He's almost glowing.";
                    stateMessage = "The Opening Shift is nearly complete — his flowers are almost ready.";
                }
            }
            else {
                if (closingComplete) {
                    stateTitle = "He's watered and blooming again.";
                    stateMessage = "Closing Shift is complete. His flowers and glow are back for the night.";
                }
                else if (!closing.total) {
                    stateTitle = "He's settled for the evening.";
                    stateMessage = "There are no Closing tasks waiting, so he can stay comfortable until bedtime.";
                }
                else if (closing.percent >= 80) {
                    stateTitle = "He's almost watered.";
                    stateMessage = "Just a little more Closing care and his evening flowers will open.";
                }
                else if (closing.percent >= 50) {
                    stateTitle = "The water is helping.";
                    stateMessage = "He's staying bright as you work through the Closing Shift.";
                }
                else if (closing.percent >= 25) {
                    stateTitle = "He's getting thirsty.";
                    stateMessage = "A few Closing tasks are helping, but he still needs more water.";
                }
                else if (closingMinutes < 60) {
                    stateTitle = "Closing Rhythm is here.";
                    stateMessage = "His morning flowers have settled. He'll slowly get thirsty until Closing tasks give him water.";
                }
                else if (closingMinutes < 150) {
                    stateTitle = "He's starting to fade.";
                    stateMessage = "The evening is moving along and he's getting thirsty. One Closing task will help.";
                }
                else if (closingMinutes < 240) {
                    stateTitle = "He really needs some water.";
                    stateMessage = "His energy is fading. A Closing task can perk him back up.";
                }
                else {
                    stateTitle = "He's getting dry for the night.";
                    stateMessage = "It's getting late and Closing still needs care. Even one small task will make a visible difference.";
                }
            }
            const companion = window.HomeOS?.components?.rhythmCompanion;
            if (!companion)
                return;
            companion.renderCompanion({
                overallPercent: overall.percent,
                totalTasks: overall.total,
                openingCompleted: opening.completed || 0,
                openingTotal: opening.total || 0,
                closingCompleted: closing.completed || 0,
                closingTotal: closing.total || 0,
                isSleeping,
                currentShift: evening ? "closing" : "opening",
                rhythmPhase: evening ? "evening" : "day",
                stateTitle,
                stateMessage,
                nextLittleWin: this.companionGoal(),
                scheduleSummary: `He wakes at ${this.formatScheduleTime(this.wakeTime())}, rests at ${this.formatScheduleTime(this.bedTime())}, and Closing Rhythm begins at 5:00 PM.`,
                talkMessages: this.companionTalkMessages()
            });
        },
        showCompanionReaction(type = this.lastCompanionCareType || "sun") {
            window.HomeOS?.components?.rhythmCompanion?.reactToTask(type);
        },
        showInlineMilestone(milestone) {
            if (!milestone)
                return;
            if (milestone.type === "shift") {
                document.getElementById(`${milestone.shift}ShiftCard`)?.classList.add("is-complete");
                // The companion component detects the actual shift-completion transition
                // and fires one local confetti burst + message. No modal is added.
                return;
            }
            const companion = window.HomeOS?.components?.rhythmCompanion;
            if (milestone.type === "area") {
                companion?.celebrateArea?.(milestone.label || "Area");
                return;
            }
            companion?.showMilestone?.("✓ ROOM COMPLETE");
        },
        captureMilestones() {
            const milestones = new Map();
            if (!this.daily)
                return milestones;
            ["opening", "closing"].forEach(shift => {
                const progress = this.calculateProgress(this.runtimeForShift(shift));
                if (progress.total > 0 && progress.percent === 100) {
                    milestones.set(`shift:${shift}`, {
                        type: "shift",
                        label: this.shiftName(shift),
                        shift
                    });
                }
            });
            (this.daily.rooms || []).filter(room => room.active !== false).forEach(room => {
                const list = this.visibleDailyTasks().filter(runtime => runtime.task.room_id === room.id);
                const progress = this.calculateProgress(list);
                if (progress.total > 0 && progress.percent === 100) {
                    milestones.set(`room:${room.id}`, { type: "room", label: room.name || "Room" });
                }
            });
            // Area milestones are evaluated inside each shift. That means
            // finishing every Opening task Upstairs can trigger a juggle even
            // if Upstairs still has separate Closing tasks waiting for later.
            (this.daily.levels || []).filter(level => level.active !== false).forEach(level => {
                const roomIds = new Set((this.daily.rooms || [])
                    .filter(room => room.level_id === level.id)
                    .map(room => room.id));
                ["opening", "closing"].forEach(shift => {
                    const list = this.runtimeForShift(shift)
                        .filter(runtime => runtime.task.room_id && roomIds.has(runtime.task.room_id));
                    const progress = this.calculateProgress(list);
                    if (progress.total > 0 && progress.percent === 100) {
                        milestones.set(`area:${shift}:${level.id}`, {
                            type: "area",
                            label: level.name || "Home Area",
                            shift
                        });
                    }
                });
            });
            const overall = this.calculateOverallProgress();
            if (overall.total > 0 && overall.percent === 100) {
                milestones.set("day:complete", { type: "day", label: "Daily Rhythm" });
            }
            return milestones;
        },
        handleNewMilestones(before) {
            const after = this.captureMilestones();
            const priority = { day: 0, shift: 1, area: 2, room: 3 };
            const fresh = [...after.entries()]
                .filter(([key]) => !before.has(key))
                .map(([, milestone]) => milestone)
                .sort((a, b) => (priority[a.type] ?? 9) - (priority[b.type] ?? 9));
            // One completion should never unleash a stack of popups.
            // The only modal celebration is the entire Daily Rhythm.
            const wholeDay = fresh.find(milestone => milestone.type === "day");
            if (wholeDay) {
                this.celebrationQueue.length = 0;
                this.queueCelebration(wholeDay);
                return;
            }
            // Shift / room / area milestones stay on the page as one subtle reaction.
            const inline = fresh.find(milestone => ["shift", "area", "room"].includes(milestone.type));
            if (inline)
                this.showInlineMilestone(inline);
        },
        queueCelebration(milestone) {
            this.celebrationQueue.push(milestone);
            const layer = document.getElementById("dailyCelebrationLayer");
            if (layer?.hidden)
                this.showNextCelebration();
        },
        showNextCelebration() {
            const layer = document.getElementById("dailyCelebrationLayer");
            if (!layer || !layer.hidden || !this.celebrationQueue.length)
                return;
            const milestone = this.celebrationQueue.shift();
            const content = this.celebrationCopy(milestone);
            this.setText("dailyCelebrationIcon", content.icon);
            this.setText("dailyCelebrationKicker", content.kicker);
            this.setText("dailyCelebrationTitle", content.title);
            this.setText("dailyCelebrationMessage", content.message);
            layer.hidden = false;
            if (milestone.type === "day") {
                document.getElementById("rhythmCompanionCard")?.classList.add("companion-celebrate");
            }
        },
        celebrationCopy(milestone) {
            if (milestone.type === "day") {
                return {
                    icon: "✦",
                    kicker: "DAILY RHYTHM COMPLETE",
                    title: "The whole rhythm is complete.",
                    message: "Opening and Closing are done. Your rhythm garden is blooming, and HOME OS is ready to start fresh tomorrow."
                };
            }
            if (milestone.type === "shift") {
                return {
                    icon: milestone.shift === "opening" ? "☀" : "☾",
                    kicker: `${milestone.label.toUpperCase()} COMPLETE`,
                    title: `${milestone.label} is done.`,
                    message: milestone.shift === "opening"
                        ? "The home is opened up and ready for the day."
                        : "The home is settled. You can close out the day with less waiting for you tomorrow."
                };
            }
            if (milestone.type === "area") {
                return {
                    icon: "⌂",
                    kicker: "HOME AREA COMPLETE",
                    title: `${milestone.label} is cared for.`,
                    message: "Every Daily Rhythm task in this part of the home is complete."
                };
            }
            return {
                icon: "✓",
                kicker: "ROOM COMPLETE",
                title: `${milestone.label} is done.`,
                message: "That room has no Daily Rhythm tasks left waiting."
            };
        },
        closeCelebration() {
            const layer = document.getElementById("dailyCelebrationLayer");
            if (!layer)
                return;
            layer.hidden = true;
            document.getElementById("rhythmCompanionCard")?.classList.remove("companion-celebrate");
            window.clearTimeout(this.celebrationTimer);
            this.celebrationTimer = window.setTimeout(() => this.showNextCelebration(), 140);
        },
        timerFirstName() {
            const value = this.state?.person?.display_name ||
                this.state?.user?.displayName ||
                this.state?.user?.display_name ||
                "";
            return String(value).trim().split(/\s+/)[0] || "";
        },
        clearTimerCelebration() {
            const card = document.getElementById("dailyTimerCard");
            const panel = document.getElementById("dailyTimerCelebration");
            const confetti = document.getElementById("dailyTimerConfetti");
            card?.classList.remove("timer-celebrating");
            if (panel)
                panel.hidden = true;
            if (confetti)
                confetti.replaceChildren();
            window.clearTimeout(this.timerCelebrationTimer);
        },
        launchTimerConfetti() {
            const host = document.getElementById("dailyTimerConfetti");
            const card = document.getElementById("dailyTimerCard");
            if (!host || !card)
                return;
            host.replaceChildren();
            const pieces = 34;
            for (let index = 0; index < pieces; index += 1) {
                const angle = ((Math.PI * 2) / pieces) * index + ((index % 3) * 0.045);
                const distance = 105 + ((index * 17) % 105);
                const verticalBias = -42 + ((index * 23) % 76);
                const piece = document.createElement("i");
                piece.style.setProperty("--tx", `${Math.cos(angle) * distance}px`);
                piece.style.setProperty("--ty", `${(Math.sin(angle) * distance * .68) + verticalBias}px`);
                piece.style.setProperty("--rot", `${260 + ((index * 71) % 420)}deg`);
                piece.style.setProperty("--delay", `${(index % 6) * 18}ms`);
                host.appendChild(piece);
            }
            card.classList.remove("timer-celebrating");
            void card.offsetWidth;
            card.classList.add("timer-celebrating");
            window.clearTimeout(this.timerCelebrationTimer);
            this.timerCelebrationTimer = window.setTimeout(() => {
                card.classList.remove("timer-celebrating");
                host.replaceChildren();
            }, 2100);
        },
        showTimerCongratulations({ early = false, taskCompleted = false } = {}) {
            const panel = document.getElementById("dailyTimerCelebration");
            if (!panel)
                return;
            const firstName = this.timerFirstName();
            const title = firstName ? `Congratulations, ${firstName}!` : "Congratulations!";
            let message;
            if (taskCompleted && early) {
                message = `${this.timer.label || "That task"} is complete — and you finished before the timer. That is a win.`;
            }
            else if (taskCompleted) {
                message = `${this.timer.label || "That task"} is complete. Focus session finished.`;
            }
            else if (early) {
                message = `You finished your focus session early. Nice work — you do not have to wait for the clock.`;
            }
            else if (this.timer.sourceTaskId) {
                message = `Time is up for ${this.timer.label || "your task"}. Nice work staying with it. If the task is finished, tap Task Complete.`;
            }
            else {
                message = `Your ${this.timer.label || "focus session"} is complete. Nice work giving it your attention.`;
            }
            this.setText("dailyTimerCongratsTitle", title);
            this.setText("dailyTimerCongratsMessage", message);
            panel.hidden = false;
            this.launchTimerConfetti();
        },
        async completeTimerEarly() {
            const linkedTaskId = this.timer.sourceTaskId;
            if (!linkedTaskId) {
                this.finishTimer({ early: true, force: true });
                return;
            }
            const runtime = this.runtimeByTaskId(linkedTaskId);
            if (!runtime) {
                this.finishTimer({ early: true, force: true });
                return;
            }
            if (this.isDoneForCurrentPerson(runtime)) {
                this.finishTimer({ early: true, force: true, taskCompleted: true });
                return;
            }
            if (!this.canCurrentPersonComplete(runtime)) {
                this.toast("This timer is linked to a task assigned to someone else.");
                return;
            }
            const personId = this.state?.person?.id;
            if (!personId || !runtime.occurrence?.id) {
                this.toast("HOME OS could not connect this timer to your task completion.");
                return;
            }
            const before = this.captureMilestones();
            const result = await taskService.setCompletion({
                occurrenceId: runtime.occurrence.id,
                familyMemberId: personId,
                complete: true
            });
            if (result.error) {
                this.toast(result.error.message || "HOME OS could not complete this task.");
                return;
            }
            const shift = runtime.task.source_type === "daily_closing" ? "closing" : "opening";
            const rewardType = this.careForCompanion(shift);
            this.showCompanionReaction(runtime.task.title, rewardType);
            await this.reload({ skipStarter: true });
            this.handleNewMilestones(before);
            this.finishTimer({ early: true, force: true, taskCompleted: true });
        },
        timerTasksForActiveShift() {
            const shift = this.getRecommendedShift();
            return this.runtimeForShift(shift)
                .filter(runtime => !this.isDoneForCurrentPerson(runtime));
        },
        renderTimerTaskOptions() {
            const select = document.getElementById("dailyTimerTaskSelect");
            const hint = document.getElementById("dailyTimerTaskSelectHint");
            if (!select || !this.daily)
                return;
            const shift = this.getRecommendedShift();
            const shiftLabel = this.shiftName(shift);
            const runtimes = this.timerTasksForActiveShift();
            const linked = this.timer.sourceTaskId
                ? this.runtimeByTaskId(this.timer.sourceTaskId)
                : null;
            const options = [];
            options.push(`<option value="">Choose a task from your ${this.escape(shiftLabel)}…</option>`);
            // If a task was loaded from its timer icon and it belongs to the
            // other visible shift, keep it selectable without polluting the
            // normal active-shift list.
            if (linked && !runtimes.some(runtime => runtime.task.id === linked.task.id)) {
                const room = this.roomForTask(linked.task);
                const where = this.locationLabelForRoom(room);
                options.push(`<option value="${this.attr(linked.task.id)}">${this.escape(linked.task.title)} · ${this.escape(where)}</option>`);
            }
            runtimes.forEach(runtime => {
                const room = this.roomForTask(runtime.task);
                const where = this.locationLabelForRoom(room);
                options.push(`<option value="${this.attr(runtime.task.id)}">${this.escape(runtime.task.title)} · ${this.escape(where)}</option>`);
            });
            select.innerHTML = options.join("");
            select.value = this.timer.sourceTaskId && select.querySelector(`option[value="${CSS.escape(this.timer.sourceTaskId)}"]`)
                ? this.timer.sourceTaskId
                : "";
            select.disabled = this.timer.running || (!runtimes.length && !linked);
            if (hint) {
                hint.textContent = runtimes.length
                    ? `${runtimes.length} unfinished ${shiftLabel} task${runtimes.length === 1 ? "" : "s"} available.`
                    : linked
                        ? "This task is loaded from the other visible shift."
                        : `Your ${shiftLabel} has no unfinished tasks right now.`;
            }
        },
        chooseTimerTask(taskId) {
            if (this.timer.running) {
                this.toast("Pause the timer before switching tasks.");
                this.renderTimerTaskOptions();
                return;
            }
            if (!taskId) {
                this.timer.label = "";
                this.timer.sourceTaskId = null;
                this.saveTimer();
                this.renderTimer();
                return;
            }
            this.loadTimerFromTask(taskId, { scroll: false, preserveTime: true });
        },
        saveTimer() {
            // Focus Timer state is intentionally session-only. It is not household data.
        },
        startTimerClock() {
            window.clearInterval(this.timerInterval);
            this.timerInterval = window.setInterval(() => this.tickTimer(), 500);
            this.renderTimer();
        },
        tickTimer() {
            if (!this.timer.running || !this.timer.endAt)
                return;
            const remaining = Math.max(0, Math.ceil((this.timer.endAt - Date.now()) / 1000));
            if (remaining !== this.timer.remainingSeconds) {
                this.timer.remainingSeconds = remaining;
                this.renderTimer();
            }
            if (remaining <= 0)
                this.finishTimer();
        },
        setTimerMinutes(value) {
            if (this.timer.running) {
                this.toast("Pause the timer before changing the time.");
                return;
            }
            this.clearTimerCelebration();
            const minutes = Math.max(1, Math.min(180, Math.round(Number(value) || 10)));
            this.timer.minutes = minutes;
            this.timer.durationSeconds = minutes * 60;
            this.timer.remainingSeconds = minutes * 60;
            this.timer.endAt = null;
            this.saveTimer();
            this.renderTimer();
        },
        startPauseTimer() {
            if (!this.timer.running && !this.timer.sourceTaskId) {
                this.toast("Choose a task from your current shift first.");
                document.getElementById("dailyTimerTaskSelect")?.focus();
                return;
            }
            if (this.timer.running) {
                this.timer.remainingSeconds = Math.max(0, Math.ceil((this.timer.endAt - Date.now()) / 1000));
                this.timer.running = false;
                this.timer.endAt = null;
                this.saveTimer();
                this.renderTimer();
                return;
            }
            if (this.timer.remainingSeconds <= 0) {
                this.timer.remainingSeconds = this.timer.durationSeconds || this.timer.minutes * 60;
            }
            this.clearTimerCelebration();
            this.timer.running = true;
            this.timer.endAt = Date.now() + (this.timer.remainingSeconds * 1000);
            this.saveTimer();
            this.renderTimer();
        },
        resetTimer() {
            this.clearTimerCelebration();
            this.timer.running = false;
            this.timer.endAt = null;
            this.timer.remainingSeconds = this.timer.durationSeconds || this.timer.minutes * 60;
            this.timer.sourceTaskId = null;
            this.timer.label = "";
            this.saveTimer();
            this.renderTimerTaskOptions();
            this.renderTimer();
        },
        finishTimer({ early = false, force = false, taskCompleted = false } = {}) {
            if (!force && !this.timer.running && this.timer.remainingSeconds > 0)
                return;
            this.timer.running = false;
            this.timer.endAt = null;
            this.timer.remainingSeconds = 0;
            this.saveTimer();
            this.renderTimer();
            const card = document.getElementById("dailyTimerCard");
            card?.classList.remove("timer-finished");
            void card?.offsetWidth;
            card?.classList.add("timer-finished");
            window.setTimeout(() => card?.classList.remove("timer-finished"), 1200);
            this.showTimerCongratulations({ early, taskCompleted });
        },
        loadTimerFromTask(taskId, { scroll = true, preserveTime = false } = {}) {
            const runtime = this.runtimeByTaskId(taskId);
            if (!runtime)
                return;
            if (this.timer.running) {
                this.toast("Pause your current timer before loading another task.");
                return;
            }
            this.clearTimerCelebration();
            this.timer.label = runtime.task.title;
            this.timer.sourceTaskId = taskId;
            if (!preserveTime) {
                this.timer.minutes = 10;
                this.timer.durationSeconds = 600;
                this.timer.remainingSeconds = 600;
            }
            else {
                const minutes = Math.max(1, Math.min(180, Number(this.timer.minutes) || 10));
                this.timer.minutes = minutes;
                this.timer.durationSeconds = minutes * 60;
                this.timer.remainingSeconds = minutes * 60;
            }
            this.timer.endAt = null;
            this.saveTimer();
            this.renderTimerTaskOptions();
            this.renderTimer();
            if (scroll) {
                document.getElementById("dailyTimerCard")?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            this.toast(`${runtime.task.title} loaded into the ${this.timer.minutes}-minute timer.`);
        },
        renderTimer() {
            const card = document.getElementById("dailyTimerCard");
            if (!card)
                return;
            const remaining = Math.max(0, Number(this.timer.remainingSeconds) || 0);
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            const duration = Math.max(1, Number(this.timer.durationSeconds) || 1);
            const progress = Math.max(0, Math.min(1, (duration - remaining) / duration));
            const label = this.timer.label || "Focus session";
            this.setText("dailyTimerDisplay", `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
            this.setText("dailyTimerLabelDisplay", label.toUpperCase());
            const timerState = this.timer.running ? "FOCUSING" : remaining === 0 ? "DONE" : progress > 0 ? "PAUSED" : "READY";
            this.setText("dailyTimerStatus", timerState);
            this.setText("dailyTimerMode", timerState === "FOCUSING" ? "ACTIVE" : timerState === "PAUSED" ? "PAUSED" : timerState === "DONE" ? "COMPLETE" : "STANDBY");
            this.setText("dailyTimerProgressText", `${Math.round(progress * 100)}% COMPLETE`);
            const timerActionButton = document.getElementById("dailyTimerStartButton");
            const timerActionLabel = timerActionButton?.querySelector("span:last-child");
            const timerActionText = this.timer.running ? "Pause Timer" : remaining === 0 ? "Start Again" : "Start Timer";
            if (timerActionLabel)
                timerActionLabel.textContent = timerActionText;
            else if (timerActionButton)
                timerActionButton.textContent = timerActionText;
            const ring = document.getElementById("dailyTimerRing");
            if (ring)
                ring.style.setProperty("--timer-progress", `${progress * 360}deg`);
            card.classList.toggle("timer-running", this.timer.running);
            const taskSelect = document.getElementById("dailyTimerTaskSelect");
            if (taskSelect) {
                if (this.timer.sourceTaskId && taskSelect.querySelector(`option[value="${CSS.escape(this.timer.sourceTaskId)}"]`)) {
                    taskSelect.value = this.timer.sourceTaskId;
                }
                else if (!this.timer.sourceTaskId) {
                    taskSelect.value = "";
                }
                taskSelect.disabled = this.timer.running || taskSelect.options.length <= 1;
            }
            document.querySelectorAll("[data-timer-minutes]").forEach(button => {
                button.classList.toggle("selected", Number(button.dataset.timerMinutes) === Number(this.timer.minutes));
                button.disabled = this.timer.running;
            });
            const custom = document.getElementById("dailyCustomMinutes");
            if (custom)
                custom.disabled = this.timer.running;
            const completeButton = document.getElementById("dailyTimerCompleteButton");
            const completeLabel = document.getElementById("dailyTimerCompleteButtonLabel");
            const linkedRuntime = this.timer.sourceTaskId ? this.runtimeByTaskId(this.timer.sourceTaskId) : null;
            const linkedAlreadyDone = linkedRuntime ? this.isDoneForCurrentPerson(linkedRuntime) : false;
            const canCompleteLinked = linkedRuntime ? this.canCurrentPersonComplete(linkedRuntime) : true;
            const focusHasStarted = this.timer.running || progress > 0;
            if (completeButton) {
                completeButton.hidden = !focusHasStarted || Boolean(linkedRuntime && (!canCompleteLinked || linkedAlreadyDone));
            }
            if (completeLabel) {
                completeLabel.textContent = linkedRuntime ? "Task Complete" : "Finish Early";
            }
        },
        bindEvents() {
            document.addEventListener("click", event => {
                if (event.target.closest("#buildStarterRhythmButton"))
                    return this.buildStarterRhythm();
                const shiftViewButton = event.target.closest("[data-shift-view]");
                if (shiftViewButton)
                    return this.setShiftWorkspaceView(shiftViewButton.dataset.shiftView);
                const addShiftTask = event.target.closest("[data-add-shift-task]");
                if (addShiftTask)
                    return this.addInlineTask(addShiftTask.dataset.addShiftTask);
                if (event.target.closest("#dailySaveSchedule"))
                    return this.saveDaySchedule();
                const taskTimer = event.target.closest("[data-task-timer]");
                if (taskTimer)
                    return this.loadTimerFromTask(taskTimer.dataset.taskTimer);
                const timerPreset = event.target.closest("[data-timer-minutes]");
                if (timerPreset)
                    return this.setTimerMinutes(timerPreset.dataset.timerMinutes);
                if (event.target.closest("#dailyTimerStartButton"))
                    return this.startPauseTimer();
                if (event.target.closest("#dailyTimerCompleteButton"))
                    return this.completeTimerEarly();
                if (event.target.closest("#dailyTimerResetButton"))
                    return this.resetTimer();
                if (event.target.closest("#dailyCelebrationClose"))
                    return this.closeCelebration();
                if (event.target.id === "dailyCelebrationLayer")
                    return this.closeCelebration();
                const manage = event.target.closest("[data-manage-daily-task]");
                if (manage)
                    return this.manageTask(manage.dataset.manageDailyTask);
                const remove = event.target.closest("[data-remove-daily-task]");
                if (remove)
                    return this.archiveTask(remove.dataset.removeDailyTask);
                const laundryAction = event.target.closest("#dailyLaundryActionButton");
                if (laundryAction) {
                    const action = laundryAction.dataset.laundryAction;
                    const loadId = laundryAction.dataset.loadId;
                    if (action === "start")
                        this.openLaundryDialog();
                    else if (loadId)
                        this.advanceLaundryLoad(loadId);
                    return;
                }
                if (event.target.closest("#dailyLaundryNewLoadButton"))
                    return this.openLaundryDialog();
                if (event.target.closest("#dailyLaundryStartButton"))
                    return this.startLaundryLoad();
                if (event.target.closest("#dailyLaundryCancelButton") || event.target.closest("#dailyLaundryCancelButtonSecondary"))
                    return this.closeLaundryDialog();
                if (event.target.closest("#addShoppingItemButton"))
                    return this.addShoppingItem();
                const removeShopping = event.target.closest("[data-remove-shopping]");
                if (removeShopping)
                    return this.removeShoppingItem(removeShopping.dataset.removeShopping);
            });
            document.addEventListener("change", event => {
                const task = event.target.closest("[data-daily-task]");
                if (task)
                    return this.toggleTask(task.dataset.dailyTask, task);
                const shopping = event.target.closest("[data-shopping-check]");
                if (shopping)
                    return this.toggleShoppingItem(shopping.dataset.shoppingCheck, shopping.checked, shopping);
                if (event.target.id === "dailyCustomMinutes") {
                    const value = Math.max(1, Math.min(180, Number(event.target.value) || 10));
                    event.target.value = value;
                    return this.setTimerMinutes(value);
                }
            });
            document.querySelectorAll("[data-shift-task-input]").forEach(input => {
                input.addEventListener("keydown", event => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        this.addInlineTask(input.dataset.shiftTaskInput);
                    }
                });
            });
            document.getElementById("newShoppingItem")?.addEventListener("keydown", event => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    this.addShoppingItem();
                }
            });
            document.getElementById("dailyLaundryName")?.addEventListener("keydown", event => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    this.startLaundryLoad();
                }
            });
            document.getElementById("dailyLaundryDialog")?.addEventListener("click", event => {
                if (event.target === event.currentTarget)
                    this.closeLaundryDialog();
            });
            document.getElementById("dailyTimerTaskSelect")?.addEventListener("change", event => {
                this.chooseTimerTask(event.target.value);
            });
        },
        levelName(levelId) {
            return this.daily.levels.find(level => level.id === levelId)?.name || "";
        },
        shiftName(shift) {
            return shift === "closing" ? "Closing Shift" : "Opening Shift";
        },
        laundryStageLabel(stage) {
            return { washing: "Wash", drying: "Dry", folding: "Fold", put_away: "Put Away", complete: "Complete" }[stage] || "Wash";
        },
        cssLaundryStage(stage) {
            return { washing: "wash", drying: "dry", folding: "fold", put_away: "put-away" }[stage] || "idle";
        },
        formatTime(value) {
            const date = new Date(value);
            if (Number.isNaN(date.getTime()))
                return "";
            return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
        },
        formatScheduleTime(value) {
            const [hour, minute] = String(value || "08:00").split(":").map(Number);
            const date = new Date();
            date.setHours(Number.isFinite(hour) ? hour : 8, Number.isFinite(minute) ? minute : 0, 0, 0);
            return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
        },
        setText(id, value) {
            const element = document.getElementById(id);
            if (element)
                element.textContent = String(value ?? "");
        },
        setBarWidth(id, percent) {
            const bar = document.getElementById(id);
            if (bar)
                bar.style.width = `${Math.max(0, Math.min(100, Number(percent) || 0))}%`;
        },
        toast(message) {
            const target = document.getElementById("appToast");
            if (!target)
                return;
            target.textContent = message;
            target.classList.add("show");
            window.clearTimeout(this.toastTimer);
            this.toastTimer = window.setTimeout(() => target.classList.remove("show"), 2800);
        },
        escape(value) {
            return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        },
        attr(value) { return this.escape(value); }
    };
    window.HomeOS.daily = App;
    await App.init();
});
