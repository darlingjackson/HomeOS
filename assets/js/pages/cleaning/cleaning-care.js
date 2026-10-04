/* ============================================================
   HOMEOS // CLEANING CARE

   Recurring Home Care tasks and completion behavior.
============================================================ */

(() => {
    "use strict";
    const taskService = window.HomeOS
        ?.services
        ?.tasks;
    window.HomeOS =
        window.HomeOS || {};
    window.HomeOS.cleaningModules =
        window.HomeOS.cleaningModules || {};
    window.HomeOS.cleaningModules.care = {
        async loadRecurringCare() {
            const householdId = this.state
                ?.household
                ?.id;
            if (!householdId) {
                this.careTasksAll = [];
                this.careOccurrences = [];
                return;
            }
            const taskResult = await taskService
                .listTasks(householdId, {
                sourceTypes: [
                    "home_care_auto",
                    "home_care_custom"
                ],
                activeOnly: false
            });
            if (taskResult.error) {
                console.error("[HomeOS] Recurring Home Care tasks failed to load.", taskResult.error);
                this.careTasksAll = [];
                this.careOccurrences = [];
                return;
            }
            this.careTasksAll =
                taskResult.data || [];
            const activeIds = this.careTasksAll
                .filter(task => task.active !== false)
                .map(task => task.id)
                .filter(Boolean);
            if (!activeIds.length) {
                this.careOccurrences = [];
                return;
            }
            const occurrenceResult = await taskService
                .getOccurrences(householdId, {
                taskIds: activeIds
            });
            if (occurrenceResult.error) {
                console.error("[HomeOS] Recurring Home Care history failed to load.", occurrenceResult.error);
                this.careOccurrences = [];
                return;
            }
            this.careOccurrences =
                occurrenceResult.data || [];
        },
        recurringCareDefinitions() {
            const definitions = [];
            const seen = new Set();
            const add = ({ title, days, roomId = null, laundryAreaId = null, householdFeatureId = null, location = "Home" }) => {
                const key = [
                    String(title || "").trim().toLowerCase(),
                    Number(days || 0),
                    roomId || "",
                    laundryAreaId || "",
                    householdFeatureId || ""
                ].join("|");
                if (!title || !days || seen.has(key)) {
                    return;
                }
                seen.add(key);
                definitions.push({
                    key,
                    title,
                    days,
                    roomId,
                    laundryAreaId,
                    householdFeatureId,
                    location
                });
            };
            const rooms = this.data?.rooms || [];
            const laundryAreas = this.data?.laundryAreas || [];
            const features = this.data?.features || [];
            // Laundry equipment comes from Home Setup, so HomeOS only suggests washer/dryer care when that equipment exists.
            laundryAreas.forEach(area => {
                const room = rooms.find(item => item.id === area.room_id);
                const location = room?.name ||
                    area.name ||
                    "Laundry";
                if (area.has_washer) {
                    add({
                        title: "Clean washer gasket + detergent drawer",
                        days: 14,
                        roomId: area.room_id || null,
                        laundryAreaId: area.id,
                        location
                    });
                    add({
                        title: "Run washer cleaning cycle",
                        days: 30,
                        roomId: area.room_id || null,
                        laundryAreaId: area.id,
                        location
                    });
                }
                if (area.has_dryer) {
                    add({
                        title: "Vacuum lint trap housing",
                        days: 14,
                        roomId: area.room_id || null,
                        laundryAreaId: area.id,
                        location
                    });
                    add({
                        title: "Inspect + vacuum dryer vent area",
                        days: 30,
                        roomId: area.room_id || null,
                        laundryAreaId: area.id,
                        location
                    });
                }
            });
            // Specialized spaces get upkeep that normally falls outside a normal Quick / Standard room clean.
            rooms.forEach(room => {
                const type = String(room.room_type || "")
                    .toLowerCase();
                const name = String(room.name || "")
                    .toLowerCase();
                const isKitchen = type === "kitchen" ||
                    name.includes("kitchen");
                const isPorch = ["outdoor"].includes(type) &&
                    /porch|deck|patio/.test(name) ||
                    /porch|deck|patio/.test(name);
                const isGarage = type === "garage" ||
                    name.includes("garage");
                const isPantry = type === "pantry" ||
                    name.includes("pantry");
                const isBathroom = type === "bathroom" ||
                    name.includes("bath");
                if (isKitchen) {
                    add({
                        title: "Wash + sanitize the kitchen trash can",
                        days: 14,
                        roomId: room.id,
                        location: room.name
                    });
                    add({
                        title: "Clean behind the stove",
                        days: 30,
                        roomId: room.id,
                        location: room.name
                    });
                    add({
                        title: "Clean behind the refrigerator",
                        days: 30,
                        roomId: room.id,
                        location: room.name
                    });
                }
                if (isPorch) {
                    add({
                        title: `Sweep ${room.name} + remove overhead cobwebs`,
                        days: 14,
                        roomId: room.id,
                        location: room.name
                    });
                    add({
                        title: `Wipe railings, doors + outdoor surfaces`,
                        days: 30,
                        roomId: room.id,
                        location: room.name
                    });
                }
                if (isGarage) {
                    add({
                        title: "Sweep garage edges + remove cobwebs",
                        days: 30,
                        roomId: room.id,
                        location: room.name
                    });
                }
                if (isPantry) {
                    add({
                        title: "Wipe pantry shelves + floor edges",
                        days: 30,
                        roomId: room.id,
                        location: room.name
                    });
                }
                if (isBathroom) {
                    add({
                        title: "Clean bathroom exhaust fan cover",
                        days: 30,
                        roomId: room.id,
                        location: room.name
                    });
                }
            });
            // Home features cover appliances/maintenance items the user explicitly said exist during Home Setup.
            features.forEach(feature => {
                const key = String(feature.feature_key || feature.name || "")
                    .toLowerCase();
                const room = rooms.find(item => item.id === feature.room_id);
                const location = room?.name ||
                    feature.name ||
                    "Home";
                const common = {
                    roomId: feature.room_id || null,
                    householdFeatureId: feature.id,
                    location
                };
                if (key.includes("dishwasher")) {
                    add({
                        ...common,
                        title: "Clean dishwasher filter + run cleaning cycle",
                        days: 30
                    });
                }
                if (key.includes("range_hood") || key.includes("range hood")) {
                    add({
                        ...common,
                        title: "Clean range hood filter",
                        days: 30
                    });
                }
                if (key.includes("hvac_filter") || key.includes("hvac filter")) {
                    add({
                        ...common,
                        title: "Check HVAC filter + replace if needed",
                        days: 30
                    });
                }
                if (key.includes("smoke")) {
                    add({
                        ...common,
                        title: "Dust + test smoke detectors",
                        days: 30
                    });
                }
                if (key.includes("water_filter") || key.includes("water filter")) {
                    add({
                        ...common,
                        title: "Check water-filter replacement status",
                        days: 30
                    });
                }
                if (key.includes("deep_freezer") || key.includes("deep freezer")) {
                    add({
                        ...common,
                        title: "Vacuum deep-freezer vents + wipe seals",
                        days: 30
                    });
                }
                if ((key.includes("porch") || key.includes("deck")) &&
                    !rooms.some(roomItem => /porch|deck|patio/i.test(roomItem.name || ""))) {
                    add({
                        ...common,
                        title: "Sweep outdoor space + remove overhead cobwebs",
                        days: 14
                    });
                }
                if (key.includes("garage") &&
                    !rooms.some(roomItem => /garage/i.test(roomItem.name || ""))) {
                    add({
                        ...common,
                        title: "Sweep garage edges + remove cobwebs",
                        days: 30
                    });
                }
            });
            return definitions;
        },
        careTaskKey(task) {
            return [
                String(task.title || "").trim().toLowerCase(),
                this.frequencyDays(task.recurrence_rule),
                task.room_id || "",
                task.laundry_area_id || "",
                task.household_feature_id || ""
            ].join("|");
        },
        async normalizeRecurringHomeCareCadences() {
            // Home Care repeats every two weeks or monthly. Move any older
            // automatic weekly task into the current schedule.
            const weeklyAuto = (this.careTasksAll || [])
                .filter(task => task.active !== false &&
                task.source_type === "home_care_auto" &&
                this.frequencyDays(task.recurrence_rule) === 7);
            if (!weeklyAuto.length) {
                return 0;
            }
            const results = await Promise.all(weeklyAuto.map(task => taskService.saveTask({
                id: task.id,
                title: task.title,
                details: task.details || null,
                sourceType: task.source_type || "home_care_auto",
                sourceRecordId: task.source_record_id || null,
                targetType: task.target_type || "home_care",
                roomId: task.room_id || null,
                zoneId: task.zone_id || null,
                laundryAreaId: task.laundry_area_id || null,
                householdFeatureId: task.household_feature_id || null,
                assignmentMode: task.assignment_mode || "anyone",
                priority: task.priority || "normal",
                dueDate: task.due_date || null,
                dueTime: task.due_time || null,
                recurrenceRule: "FREQ=DAILY;INTERVAL=14",
                recurrenceTimezone: task.recurrence_timezone ||
                    Intl.DateTimeFormat().resolvedOptions().timeZone ||
                    "UTC",
                recurrenceEndDate: task.recurrence_end_date || null,
                active: true,
                assignments: []
            })));
            return results.filter(result => !result.error).length;
        },
        async ensureAutomaticHomeCare() {
            const definitions = this.recurringCareDefinitions();
            if (!definitions.length) {
                return 0;
            }
            const existingKeys = new Set((this.careTasksAll || [])
                .filter(task => task.source_type === "home_care_auto")
                .map(task => this.careTaskKey(task)));
            const missing = definitions.filter(definition => !existingKeys.has(definition.key));
            if (!missing.length) {
                return 0;
            }
            const results = await Promise.all(missing.map(definition => taskService.saveTask({
                title: definition.title,
                details: `Suggested by HomeOS from Home Setup · ${definition.location}`,
                sourceType: "home_care_auto",
                targetType: "home_care",
                roomId: definition.roomId,
                laundryAreaId: definition.laundryAreaId,
                householdFeatureId: definition.householdFeatureId,
                assignmentMode: "anyone",
                priority: "normal",
                dueDate: null,
                dueTime: null,
                recurrenceRule: `FREQ=DAILY;INTERVAL=${definition.days}`,
                recurrenceTimezone: Intl.DateTimeFormat()
                    .resolvedOptions()
                    .timeZone ||
                    "UTC",
                active: true,
                assignments: []
            })));
            const errors = results.filter(result => result.error);
            if (errors.length) {
                console.warn("[HomeOS] Some automatic Home Care tasks could not be created.", errors.map(result => result.error));
            }
            return results.filter(result => !result.error).length;
        },
        activeRecurringCareTasks() {
            return (this.careTasksAll || [])
                .filter(task => task.active !== false)
                .map(task => ({
                ...task,
                frequencyDays: this.frequencyDays(task.recurrence_rule),
                lastCompletedAt: this.lastCareCompletion(task.id)
            }))
                .filter(task => [14, 30].includes(task.frequencyDays))
                .sort((first, second) => {
                const cadence = first.frequencyDays - second.frequencyDays;
                if (cadence)
                    return cadence;
                return String(first.title || "")
                    .localeCompare(String(second.title || ""));
            });
        },
        frequencyDays(rule) {
            const match = String(rule || "")
                .match(/INTERVAL=(\d+)/i);
            const days = Number(match?.[1] || 30);
            return Number.isFinite(days) && days > 0
                ? days
                : 30;
        },
        lastCareCompletion(taskId) {
            return (this.careOccurrences || [])
                .filter(occurrence => occurrence.task_id === taskId &&
                occurrence.status === "complete" &&
                occurrence.completed_at)
                .sort((a, b) => new Date(b.completed_at) -
                new Date(a.completed_at))[0]
                ?.completed_at ||
                null;
        },
        careTaskStatus(task) {
            const frequency = Number(task.frequencyDays || 30);
            const anchor = task.lastCompletedAt ||
                task.created_at ||
                new Date().toISOString();
            const due = new Date(anchor);
            due.setDate(due.getDate() +
                frequency);
            const now = new Date();
            const dayMs = 24 * 60 * 60 * 1000;
            const diff = Math.ceil((due - now) /
                dayMs);
            if (diff < 0) {
                return {
                    due,
                    dueNow: true,
                    cssClass: "is-overdue",
                    label: `${Math.abs(diff)}d overdue`
                };
            }
            if (diff === 0) {
                return {
                    due,
                    dueNow: true,
                    cssClass: "is-due",
                    label: "Due today"
                };
            }
            if (!task.lastCompletedAt) {
                return {
                    due,
                    dueNow: false,
                    cssClass: "is-new",
                    label: `Starts in ${diff}d`
                };
            }
            return {
                due,
                dueNow: false,
                cssClass: diff <= 3 ? "is-soon" : "is-set",
                label: `Due in ${diff}d`
            };
        },
        cadenceLabel(days) {
            if (days === 14)
                return "Every 2 weeks";
            if (days === 30)
                return "Monthly";
            return `Every ${days} days`;
        },
        careTaskLocation(task) {
            if (task.room_id) {
                return this.roomById(task.room_id)?.name || "Home";
            }
            if (task.laundry_area_id) {
                return (this.data?.laundryAreas || [])
                    .find(item => item.id === task.laundry_area_id)
                    ?.name ||
                    "Laundry";
            }
            if (task.household_feature_id) {
                return (this.data?.features || [])
                    .find(item => item.id === task.household_feature_id)
                    ?.name ||
                    "Home";
            }
            return "Home";
        },
        renderRoutineCare() {
            const allTarget = document.getElementById("routineCareUnifiedList");
            const attentionTarget = document.getElementById("routineCareAttentionList");
            if (!allTarget || !attentionTarget) {
                return;
            }
            const tasks = this.activeRecurringCareTasks();
            const statuses = tasks.map(task => ({
                task,
                status: this.careTaskStatus(task)
            }));
            const attention = statuses.filter(item => item.status.dueNow ||
                item.status.cssClass === "is-soon");
            this.setText("routineCareDueCount", `${attention.length} ${attention.length === 1 ? "needs" : "need"} attention`);
            this.setText("routineCareTrackedCount", `${tasks.length} tracked`);
            this.setText("routineCareStatusText", attention.length
                ? "These are the repeating jobs that are due or coming up soon."
                : "Nothing needs attention right now. HomeOS will surface upkeep here when it gets close.");
            const taskRow = ({ task, status }, compact = false) => `
                <article
                    class="care-rhythm-task ${status.cssClass} ${compact ? "is-attention" : ""}"
                    data-home-care-task-id="${task.id}"
                >
                    <button
                        class="care-rhythm-check"
                        type="button"
                        data-complete-home-care="${task.id}"
                        aria-label="Complete ${this.attr(task.title)}"
                        title="Mark complete"
                    ><span aria-hidden="true">✓</span></button>

                    <div class="care-rhythm-task-copy">
                        <strong>${this.escape(task.title)}</strong>
                        <span>${this.escape(this.careTaskLocation(task))}</span>
                    </div>

                    <div class="care-rhythm-task-meta">
                        <span class="care-rhythm-cadence">${this.escape(this.cadenceLabel(task.frequencyDays))}</span>
                        <span class="care-rhythm-due">${this.escape(status.label)}</span>
                    </div>

                    <button
                        class="care-rhythm-remove"
                        type="button"
                        data-remove-home-care="${task.id}"
                        aria-label="Remove ${this.attr(task.title)} from recurring Home Care"
                        title="Remove from Home Care"
                    >×</button>
                </article>
            `;
            attentionTarget.innerHTML =
                attention.length
                    ? attention.map(item => taskRow(item, true)).join("")
                    : `
                        <div class="care-rhythm-clear">
                            <span aria-hidden="true">✓</span>
                            <div>
                                <strong>You're clear for now.</strong>
                                <small>No biweekly or monthly upkeep needs attention yet.</small>
                            </div>
                        </div>
                    `;
            if (!tasks.length) {
                allTarget.innerHTML = `
                    <div class="care-rhythm-empty">
                        <strong>No recurring upkeep yet.</strong>
                        <span>HomeOS will add sensible care as the household maps rooms, laundry equipment and home features.</span>
                    </div>
                `;
                return;
            }
            const groups = [
                [14, "Every 2 weeks"],
                [30, "Monthly"]
            ];
            allTarget.innerHTML =
                groups.map(([days, label]) => {
                    const group = statuses.filter(item => item.task.frequencyDays === days);
                    if (!group.length)
                        return "";
                    return `
                        <div class="care-rhythm-group">
                            <div class="care-rhythm-group-head">
                                <strong>${this.escape(label)}</strong>
                                <span>${group.length} ${group.length === 1 ? "task" : "tasks"}</span>
                            </div>
                            <div class="care-rhythm-group-list">
                                ${group.map(item => taskRow(item)).join("")}
                            </div>
                        </div>
                    `;
                }).join("");
        },
        recurringCareTaskById(taskId) {
            return this.activeRecurringCareTasks()
                .find(task => task.id === taskId) ||
                null;
        },
        async completeRecurringCare(taskId) {
            const task = this.recurringCareTaskById(taskId);
            if (!task) {
                return;
            }
            const occurrence = await taskService
                .ensureOccurrence(task.id, new Date()
                .toISOString());
            if (occurrence.error || !occurrence.occurrenceId) {
                this.toast(occurrence.error?.message ||
                    "HomeOS could not start this Home Care check.");
                return;
            }
            const result = await taskService
                .setCompletion({
                occurrenceId: occurrence.occurrenceId,
                familyMemberId: this.state?.person?.id || null,
                complete: true
            });
            if (result.error) {
                this.toast(result.error.message ||
                    "HomeOS could not complete this Home Care task.");
                return;
            }
            await this.loadRecurringCare();
            this.renderRoutineCare();
            const row = document.querySelector(`[data-home-care-task-id="${CSS.escape(task.id)}"]`);
            row?.classList.add("just-completed");
            this.showCareReaction(`✓ ${task.title} complete. Countdown restarted.`);
        },
        async removeRecurringCare(taskId) {
            const task = this.recurringCareTaskById(taskId);
            if (!task) {
                return;
            }
            const okay = window.confirm(`Remove “${task.title}” from recurring Home Care?`);
            if (!okay) {
                return;
            }
            const result = await taskService
                .archiveTask({
                ...task,
                sourceType: task.source_type,
                sourceRecordId: task.source_record_id,
                targetType: task.target_type,
                roomId: task.room_id,
                zoneId: task.zone_id,
                laundryAreaId: task.laundry_area_id,
                householdFeatureId: task.household_feature_id,
                assignmentMode: task.assignment_mode,
                dueDate: task.due_date,
                dueTime: task.due_time,
                recurrenceRule: task.recurrence_rule,
                recurrenceTimezone: task.recurrence_timezone,
                recurrenceEndDate: task.recurrence_end_date,
                assignments: []
            });
            if (result.error) {
                this.toast(result.error.message ||
                    "HomeOS could not remove this recurring task.");
                return;
            }
            await this.loadRecurringCare();
            this.renderRoutineCare();
            this.showCareReaction("Removed from recurring Home Care.");
        },
        showCareReaction(message) {
            const target = document.getElementById("routineCareReaction");
            if (!target) {
                return;
            }
            target.textContent = message;
            target.classList.remove("show");
            void target.offsetWidth;
            target.classList.add("show");
            window.clearTimeout(this.careReactionTimer);
            this.careReactionTimer =
                window.setTimeout(() => target.classList.remove("show"), 2600);
        },
    };
})();
