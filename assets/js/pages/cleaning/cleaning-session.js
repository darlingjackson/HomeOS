/* ============================================================
   HOMEOS // CLEANING SESSION

   Room and zone cleaning sessions and checklists.
============================================================ */

(() => {
    "use strict";
    const service = window.HomeOS
        ?.services
        ?.cleaning;
    window.HomeOS =
        window.HomeOS || {};
    window.HomeOS.cleaningModules =
        window.HomeOS.cleaningModules || {};
    window.HomeOS.cleaningModules.session = {
        // --- Cleaning Dialog ---
        openRoomClean() {
            const room = this.roomById(this.selectedRoomId);
            if (!room)
                return;
            this.mode = "room";
            this.pendingTarget = {
                type: "room",
                id: room.id,
                name: room.name,
                zoneId: room.zone_id
            };
            this.renderMode();
            this.renderCompactChooser();
            this.renderInlineProtocol();
            this.scrollInlineCleanIntoView();
        },
        openZoneClean() {
            const zone = this.zoneById(this.selectedZoneId);
            if (!zone)
                return;
            this.mode = "zone";
            this.pendingTarget = {
                type: "zone",
                id: zone.id,
                name: zone.name,
                zoneId: zone.id
            };
            this.renderMode();
            this.renderCompactChooser();
            this.renderInlineProtocol();
            this.scrollInlineCleanIntoView();
        },
        async openDialog() {
            // Kept as a compatibility alias for older links/actions.
            this.renderInlineProtocol();
            this.scrollInlineCleanIntoView();
        },
        scrollInlineCleanIntoView() {
            document
                .getElementById("cleaningInlineBrief")
                ?.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });
        },
        async startSession(level) {
            if (!this.pendingTarget ||
                ![
                    "quick",
                    "standard",
                    "deep"
                ]
                    .includes(level)) {
                return;
            }
            const matchingSession = (this.data?.sessions || [])
                .find(session => ["active", "paused"].includes(session.status) &&
                this.sessionMatches(session, this.pendingTarget)) ||
                null;
            if (matchingSession && !this.changingLevelSessionId) {
                if (matchingSession.cleaning_level === level) {
                    if (matchingSession.status === "paused") {
                        const resumed = await service.setSessionStatus(matchingSession.id, "active");
                        if (resumed.error) {
                            this.toast(resumed.error.message);
                            return;
                        }
                        await this.reload();
                        const activeMatch = (this.data?.sessions || []).find(item => item.id === matchingSession.id);
                        if (activeMatch)
                            this.showSession(activeMatch);
                    }
                    else {
                        this.showSession(matchingSession);
                    }
                    return;
                }
                this.changingLevelSessionId = matchingSession.id;
            }
            // Changing an existing clean instead of starting another.
            if (this.changingLevelSessionId) {
                const currentSession = (this.data
                    ?.sessions ||
                    [])
                    .find(session => session.id ===
                    this.changingLevelSessionId);
                if (!currentSession) {
                    this.changingLevelSessionId =
                        null;
                    this.toast("HomeOS could not find the active Cleaning session.");
                    return;
                }
                if (currentSession.cleaning_level ===
                    level) {
                    this.changingLevelSessionId =
                        null;
                    this.showSession(currentSession);
                    return;
                }
                const changed = await service
                    .changeLevel(currentSession.id, level);
                if (changed.error) {
                    this.toast(changed.error.message ||
                        "HomeOS could not change the Cleaning level.");
                    return;
                }
                this.changingLevelSessionId =
                    null;
                await this.reload();
                const newSession = (this.data
                    ?.sessions ||
                    [])
                    .find(session => session.id ===
                    changed.sessionId);
                if (newSession) {
                    this.showSession(newSession);
                }
                this.toast(`Cleaning level changed to ${this.title(level)}.`);
                return;
            }
            const current = (this.data
                ?.sessions ||
                [])
                .find(session => session.status ===
                "active");
            let pauseSessionId = null;
            if (current &&
                !this.sessionMatches(current, this.pendingTarget)) {
                pauseSessionId =
                    current.id;
            }
            const result = await service
                .startSession({
                targetType: this.pendingTarget
                    .type,
                targetId: this.pendingTarget
                    .id,
                level,
                pauseSessionId
            });
            if (result.error) {
                console.error(result.error);
                this.toast(result.error.message ||
                    "HomeOS could not build the Cleaning checklist.");
                return;
            }
            await this.reload();
            const session = (this.data
                ?.sessions ||
                [])
                .find(item => item.id ===
                result.sessionId);
            if (session) {
                this.showSession(session);
            }
            // The checklist appearing below is the confirmation.
            // Keep this path quiet so choosing Area/Zone + location + level
            // feels immediate and uninterrupted.
        },
        showSession(session) {
            this.changingLevelSessionId = null;
            this.pendingTarget =
                session.room_id
                    ? {
                        type: "room",
                        id: session.room_id,
                        name: this.sessionTargetName(session),
                        zoneId: session.zone_id
                    }
                    : {
                        type: "zone",
                        id: session.zone_id,
                        name: this.sessionTargetName(session),
                        zoneId: session.zone_id
                    };
            this.setText("cleaningDialogKicker", session.room_id ? "AREA CLEANING" : "ZONE CLEANING");
            this.setText("cleaningDialogTitle", this.sessionTargetName(session));
            this.setText("cleaningProtocolRecommendation", `${this.title(session.cleaning_level)} protocol active. Check things off below or choose another level above.`);
            document
                .querySelectorAll("[data-cleaning-level]")
                .forEach(button => {
                button.classList.remove("recommended");
                button.classList.toggle("current-level", button.dataset.cleaningLevel === session.cleaning_level);
            });
            document
                .getElementById("cleaningLevelScreen")
                ?.classList.remove("is-hidden");
            document
                .getElementById("cleaningTaskScreen")
                ?.classList.remove("is-hidden");
            this.renderSession(session);
        },
        renderSession(session) {
            const progress = this.sessionProgress(session);
            this.setText("sessionLevelTitle", `${this.title(session.cleaning_level)} Clean`);
            this.setText("sessionProgressPercent", `${progress.percent}%`);
            this.setBar("sessionProgressBar", progress.percent);
            this.renderCleaningCompanion?.(session);
            const complete = document
                .getElementById("completeCleaningButton");
            if (complete) {
                complete.disabled =
                    false;
                const remaining = Math.max(0, progress.total -
                    progress.complete);
                complete.title =
                    remaining
                        ? `${remaining} unchecked task${remaining === 1 ? "" : "s"} remain. HomeOS will ask before finishing them.`
                        : "Finish this Cleaning session.";
            }
            const list = document
                .getElementById("cleaningTaskList");
            if (!list) {
                return;
            }
            let lastGroup = null;
            let html = "";
            session.tasks
                .forEach(task => {
                const group = task.metadata
                    ?.room_name ||
                    this.roomById(task.room_id)
                        ?.name ||
                    (session.room_id
                        ? null
                        : "Added During Clean");
                if (!session.room_id &&
                    group &&
                    group !==
                        lastGroup) {
                    html += `
                                <div class="cleaning-task-group" data-cleaning-group="${this.attr(group)}">
                                    <span>${this.escape(group)}</span>
                                    <i aria-hidden="true">SECTION COMPLETE</i>
                                </div>
                            `;
                    lastGroup =
                        group;
                }
                html += `
                            <div
                                class="cleaning-task-row ${task.done ? "done" : ""}"
                                data-cleaning-group-name="${this.attr(group || "")}"
                            >

                                <input
                                    type="checkbox"
                                    id="clean-task-${this.attr(task.id)}"
                                    data-cleaning-task="${this.attr(task.id)}"
                                    ${task.done ? "checked" : ""}
                                >

                                <label
                                    for="clean-task-${this.attr(task.id)}"
                                >
                                    ${this.escape(task.title)}
                                </label>

                                <button
                                    class="remove-custom-task"
                                    type="button"
                                    data-remove-cleaning-task="${this.attr(task.id)}"
                                    title="Remove from this clean"
                                    aria-label="Remove ${this.attr(task.title)} from this clean"
                                >
                                    ×
                                </button>

                            </div>
                        `;
            });
            list.innerHTML =
                html ||
                    `
                    <div class="cleaning-memory-empty">

                        <div class="cleaning-memory-empty-copy">

                            <span class="ui-kicker">
                                CHECKLIST EMPTY
                            </span>

                            <h3>
                                Add only what you want to do.
                            </h3>

                            <p>
                                This clean can still be completed after you customize the checklist.
                            </p>

                        </div>

                    </div>
                `;
        },
        async toggleTask(taskId, done) {
            const session = this.activeSession();
            const task = session?.tasks?.find(item => item.id ===
                taskId) ||
                null;
            const input = [
                ...document.querySelectorAll("[data-cleaning-task]")
            ].find(item => item.dataset.cleaningTask ===
                taskId) ||
                null;
            const row = input?.closest(".cleaning-task-row") ||
                null;
            row?.classList.add("is-updating");
            const result = await service.setTask({
                sessionTaskId: taskId,
                done
            });
            if (result.error) {
                if (input) {
                    input.checked =
                        !done;
                }
                row?.classList.remove("is-updating");
                this.toast(result.error.message ||
                    "HomeOS could not update the Cleaning task.");
                return;
            }
            if (!session || !task) {
                await this.reload();
                return;
            }
            task.done =
                Boolean(done);
            const progress = this.sessionProgress(session);
            this.setText("sessionProgressPercent", `${progress.percent}%`);
            this.setBar("sessionProgressBar", progress.percent);
            this.renderActiveStrip();
            // The whole-home dashboard reacts immediately to checklist
            // progress. A 100% active checklist counts as cared for while the
            // session is being committed to Cleaning memory.
            this.renderHero?.();
            this.renderCleaningCompanion?.(session);
            // Lumi reacts to the same real checklist state as the task row.
            // Section-level reactions are added below once the group status is known.
            if (!done) {
                if (this.cleaningAutoCompleteSessionId === session.id) {
                    window.clearTimeout(this.cleaningAutoCompleteTimer);
                    this.cleaningAutoCompleteTimer = null;
                    this.cleaningAutoCompleteSessionId = null;
                }
                this.reactCleaningCompanion?.({
                    task,
                    progress,
                    done: false,
                    groupComplete: false
                });
                this.showTaskReaction(`Task reopened · ${progress.complete} of ${progress.total} complete.`, "neutral");
                this.renderSession(session);
                return;
            }
            row?.classList.remove("is-updating");
            row?.classList.add("just-completed");
            this.launchTaskCheckBurst?.(row);
            const group = task.metadata?.room_name ||
                this.roomById(task.room_id)?.name ||
                null;
            const groupTasks = group
                ? session.tasks.filter(item => (item.metadata?.room_name ||
                    this.roomById(item.room_id)?.name ||
                    null) === group)
                : [];
            const groupComplete = groupTasks.length > 0 &&
                groupTasks.every(item => item.done);
            this.reactCleaningCompanion?.({
                task,
                progress,
                done,
                groupComplete: Boolean(done && !session.room_id && groupComplete)
            });
            if (done && groupComplete && group) {
                const groupHeader = [...document.querySelectorAll("[data-cleaning-group]")]
                    .find(item => item.dataset.cleaningGroup === group);
                groupHeader?.classList.add("just-completed-group");
                document.querySelectorAll("[data-cleaning-group-name]").forEach(item => {
                    if (item.dataset.cleaningGroupName === group) {
                        item.classList.add("section-complete-pulse");
                    }
                });
            }
            if (progress.total > 0 &&
                progress.complete ===
                    progress.total) {
                this.showTaskReaction("Checklist complete ✦ Saving this reset to whole-home Cleaning memory…", "complete");
                this.launchChecklistCelebration();
                this.launchFullCleaningFireworks?.("CHECKLIST COMPLETE");
                // A fully checked checklist is a completed clean at every level.
                // HomeOS now commits Quick, Standard and Deep sessions
                // automatically so the whole-home tracker always remembers it.
                window.clearTimeout(this.cleaningAutoCompleteTimer);
                this.cleaningAutoCompleteSessionId = session.id;
                this.cleaningAutoCompleteTimer = window.setTimeout(async () => {
                    const active = this.activeSession();
                    if (!active || active.id !== session.id) {
                        return;
                    }
                    const latestProgress = this.sessionProgress(active);
                    if (!latestProgress.total ||
                        latestProgress.complete !== latestProgress.total) {
                        return;
                    }
                    await this.complete();
                }, 1500);
            }
            else if (!session.room_id &&
                groupComplete) {
                this.showTaskReaction(`✓ ${group} complete inside this zone.`, "milestone");
                this.launchChecklistCelebration(14);
            }
            else {
                this.showTaskReaction(`✓ ${task.title} · ${progress.complete} of ${progress.total} complete.`, "task");
            }
            const reactionDelay = progress.total > 0 && progress.complete === progress.total
                ? 1200
                : (!session.room_id && groupComplete ? 1000 : 680);
            window.setTimeout(() => this.renderSession(session), reactionDelay);
        },
        async addTask() {
            const session = this.activeSession();
            const input = document
                .getElementById("manualCleaningTask");
            const title = input
                ?.value
                ?.trim();
            if (!session ||
                !title) {
                return;
            }
            const result = await service
                .addTask({
                sessionId: session.id,
                title,
                roomId: session.room_id ||
                    null
            });
            if (result.error) {
                this.toast(result.error.message ||
                    "HomeOS could not add this Cleaning task.");
                return;
            }
            input.value =
                "";
            await this.reload();
            this.toast("Task added to this clean.");
        },
        async removeTask(taskId) {
            const result = await service
                .removeTask(taskId);
            if (result.error) {
                this.toast(result.error.message ||
                    "HomeOS could not remove this task.");
                return;
            }
            await this.reload();
            this.toast("Task removed from this clean.");
        },
        changeCleaningLevel() {
            const session = this.activeSession();
            if (!session)
                return;
            this.changingLevelSessionId = session.id;
            this.showSession(session);
            document
                .getElementById("cleaningLevelScreen")
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
        },
        async pause() {
            const session = this.activeSession();
            if (!session) {
                return;
            }
            const result = await service
                .setSessionStatus(session.id, "paused");
            if (result.error) {
                this.toast(result.error.message);
                return;
            }
            this.closeDialog();
            await this.reload();
            this.toast(`${this.sessionTargetName(session)} saved.`);
        },
        async resume() {
            let session = this.activeSession();
            if (!session) {
                return;
            }
            if (session.status ===
                "paused") {
                const result = await service
                    .setSessionStatus(session.id, "active");
                if (result.error) {
                    this.toast(result.error.message);
                    return;
                }
                await this.reload();
                session =
                    this.activeSession();
            }
            if (!session) {
                return;
            }
            this.pendingTarget =
                session.room_id
                    ? {
                        type: "room",
                        id: session.room_id,
                        name: this.sessionTargetName(session),
                        zoneId: session.zone_id
                    }
                    : {
                        type: "zone",
                        id: session.zone_id,
                        name: this.sessionTargetName(session),
                        zoneId: session.zone_id
                    };
            this.showSession(session);
            this.scrollInlineCleanIntoView();
        },
        async complete() {
            window.clearTimeout(this.cleaningAutoCompleteTimer);
            this.cleaningAutoCompleteTimer = null;
            this.cleaningAutoCompleteSessionId = null;
            const session = this.activeSession();
            if (!session) {
                return;
            }
            const progress = this.sessionProgress(session);
            const remaining = Math.max(0, progress.total -
                progress.complete);
            let completeRemaining = false;
            if (remaining >
                0) {
                const okay = window.confirm(`${remaining} checklist item${remaining === 1 ? " is" : "s are"} still unchecked.

        Mark the remaining item${remaining === 1 ? "" : "s"} complete and finish this clean?`);
                if (!okay) {
                    return;
                }
                completeRemaining =
                    true;
            }
            const name = this.sessionTargetName(session);
            const level = session
                .cleaning_level;
            const result = await service
                .finishSession(session.id, completeRemaining);
            if (result.error) {
                this.toast(result.error.message ||
                    "HomeOS could not complete this clean.");
                return;
            }
            const targetType = session.room_id
                ? "room"
                : "zone";
            if (completeRemaining) {
                this.launchFullCleaningFireworks?.(`${name.toUpperCase()} COMPLETE`);
            }
            this.closeDialog();
            await this.reload();
            this.celebrateCompletedClean({
                name,
                level,
                targetType
            });
            this.toast(completeRemaining
                ? `${name} ${this.title(level)} Clean complete. Remaining items were marked finished.`
                : `${name} ${this.title(level)} Clean complete.`);
        },
        closeDialog() {
            // Compatibility name retained; Cleaning is now inline.
            this.changingLevelSessionId = null;
            document
                .getElementById("cleaningTaskScreen")
                ?.classList.add("is-hidden");
            this.renderInlineProtocol();
        },
        isRapidSecondClick(type, id) {
            const now = Date.now();
            const previous = this.lastCleaningClick;
            const isDouble = previous.type ===
                type &&
                previous.id ===
                    id &&
                (now -
                    previous.at) <=
                    450;
            this.lastCleaningClick = {
                type,
                id,
                at: isDouble
                    ? 0
                    : now
            };
            return isDouble;
        },
    };
})();
