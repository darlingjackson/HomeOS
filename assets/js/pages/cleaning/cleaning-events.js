/* ============================================================
   HOMEOS // CLEANING EVENTS

   Click and change events for Cleaning.
============================================================ */

(() => {
    "use strict";
    window.HomeOS =
        window.HomeOS || {};
    window.HomeOS.cleaningModules =
        window.HomeOS.cleaningModules || {};
    window.HomeOS.cleaningModules.events = {
        // --- Events ---
        bind() {
            document.addEventListener("click", async event => {
                if (event.target
                    .closest("#heroRoomMode")) {
                    this.setMode("room");
                    return;
                }
                if (event.target
                    .closest("#heroZoneMode")) {
                    this.setMode("zone");
                    return;
                }
                const mode = event.target
                    .closest("[data-cleaning-mode]");
                if (mode) {
                    this.setMode(mode.dataset
                        .cleaningMode);
                    return;
                }
                const floor = event.target
                    .closest("[data-floor]");
                if (floor) {
                    this.selectedLevelId =
                        floor.dataset
                            .floor;
                    const room = this.rooms()
                        .find(item => item.level_id ===
                        this.selectedLevelId);
                    if (room) {
                        this.selectedRoomId =
                            room.id;
                        this.selectedZoneId =
                            room.zone_id ||
                                this.selectedZoneId;
                    }
                    this.render();
                    return;
                }
                const room = event.target
                    .closest("[data-room-id]");
                if (room) {
                    const selected = this.roomById(room.dataset
                        .roomId);
                    if (!selected) {
                        return;
                    }
                    const openCleaning = this.isRapidSecondClick("room", selected.id);
                    this.selectedRoomId =
                        selected.id;
                    this.selectedLevelId =
                        selected.level_id;
                    if (selected
                        .zone_id) {
                        this.selectedZoneId =
                            selected.zone_id;
                    }
                    this.mode =
                        "room";
                    this.renderRoomMap();
                    this.renderSelectedRoom();
                    if (openCleaning) {
                        this.openRoomClean();
                    }
                    return;
                }
                const zone = event.target
                    .closest("[data-cleaning-zone]");
                if (zone) {
                    const selected = this.zoneById(zone.dataset
                        .cleaningZone);
                    if (!selected) {
                        return;
                    }
                    const openCleaning = this.isRapidSecondClick("zone", selected.id);
                    this.selectedZoneId =
                        selected.id;
                    this.mode =
                        "zone";
                    this.renderZones();
                    this.renderSelectedZone();
                    if (openCleaning) {
                        this.openZoneClean();
                    }
                    return;
                }
                if (event.target
                    .closest("#openRoomCleaning")) {
                    this.openRoomClean();
                    return;
                }
                if (event.target
                    .closest("#openZoneCleaning")) {
                    this.openZoneClean();
                    return;
                }
                if (event.target
                    .closest("#closeCleaningDialog")) {
                    this.closeDialog();
                    return;
                }
                const level = event.target
                    .closest("[data-cleaning-level]");
                if (level) {
                    const cleaningLevel = level.dataset.cleaningLevel;
                    await this.runCleaningMutation(
                        `start:${cleaningLevel}`,
                        [level],
                        () => this.startSession(cleaningLevel)
                    );
                    return;
                }
                const addTaskButton = event.target
                    .closest("#addManualCleaningTask");
                if (addTaskButton) {
                    await this.runCleaningMutation(
                        "add-task",
                        [addTaskButton, document.getElementById("manualCleaningTask")],
                        () => this.addTask()
                    );
                    return;
                }
                const remove = event.target
                    .closest("[data-remove-cleaning-task]");
                if (remove) {
                    const taskId = remove.dataset.removeCleaningTask;
                    await this.runCleaningMutation(
                        `remove-task:${taskId}`,
                        [remove],
                        () => this.removeTask(taskId)
                    );
                    return;
                }
                if (event.target
                    .closest("#changeCleaningLevelButton")) {
                    this.changeCleaningLevel();
                    return;
                }
                const pauseButton = event.target
                    .closest("#pauseCleaningButton");
                if (pauseButton) {
                    await this.runCleaningMutation(
                        "pause-session",
                        [pauseButton],
                        () => this.pause()
                    );
                    return;
                }
                const completeButton = event.target
                    .closest("#completeCleaningButton");
                if (completeButton) {
                    await this.runCleaningMutation(
                        "complete-session",
                        [completeButton],
                        () => this.complete()
                    );
                    return;
                }
                const resumeButton = event.target
                    .closest("#resumeCleaningButton");
                if (resumeButton) {
                    await this.runCleaningMutation(
                        "resume-session",
                        [resumeButton],
                        () => this.resume()
                    );
                    return;
                }
                const completeCare = event.target.closest("[data-complete-home-care]");
                if (completeCare) {
                    const taskId = completeCare.dataset.completeHomeCare;
                    const controls = [
                        ...document.querySelectorAll(
                            `[data-complete-home-care="${CSS.escape(taskId)}"]`
                        )
                    ];

                    await this.runCleaningMutation(
                        `complete-care:${taskId}`,
                        controls,
                        () => this.completeRecurringCare(taskId)
                    );
                    return;
                }
                const removeCare = event.target.closest("[data-remove-home-care]");
                if (removeCare) {
                    const taskId = removeCare.dataset.removeHomeCare;
                    const controls = [
                        ...document.querySelectorAll(
                            `[data-remove-home-care="${CSS.escape(taskId)}"]`
                        )
                    ];

                    await this.runCleaningMutation(
                        `remove-care:${taskId}`,
                        controls,
                        () => this.removeRecurringCare(taskId)
                    );
                    return;
                }
                const guide = event.target
                    .closest("#guidePrimaryAction");
                if (guide) {
                    const action = guide.dataset
                        .guideAction;
                    if (action ===
                        "resume") {
                        await this.runCleaningMutation(
                            "resume-session",
                            [guide],
                            () => this.resume()
                        );
                        return;
                    }
                    if (action ===
                        "setup") {
                        window.location
                            .href =
                            "account.html#home-layout";
                        return;
                    }
                    if (action ===
                        "recommended") {
                        const selected = this.roomById(guide.dataset
                            .roomId);
                        if (!selected) {
                            return;
                        }
                        this.selectedRoomId =
                            selected.id;
                        this.selectedLevelId =
                            selected.level_id;
                        this.selectedZoneId =
                            selected.zone_id ||
                                this.selectedZoneId;
                        this.mode =
                            "room";
                        this.render();
                        this.openRoomClean();
                    }
                }
            });
            document.addEventListener("change", async event => {
                const areaSelect = event.target.closest("#areaCleanSelect");
                if (areaSelect) {
                    const room = this.roomById(areaSelect.value);
                    if (!room) {
                        return;
                    }
                    this.selectedRoomId =
                        room.id;
                    this.selectedLevelId =
                        room.level_id;
                    if (room.zone_id) {
                        this.selectedZoneId =
                            room.zone_id;
                    }
                    this.mode =
                        "room";
                    this.renderCompactChooser();
                    this.renderInlineProtocol();
                    this.renderSelectedRoom();
                    this.renderHero();
                    return;
                }
                const zoneSelect = event.target.closest("#zoneCleanSelect");
                if (zoneSelect) {
                    const zone = this.zoneById(zoneSelect.value);
                    if (!zone) {
                        return;
                    }
                    this.selectedZoneId =
                        zone.id;
                    this.mode =
                        "zone";
                    this.renderCompactChooser();
                    this.renderInlineProtocol();
                    this.renderSelectedZone();
                    return;
                }
                const task = event.target
                    .closest("[data-cleaning-task]");
                if (task) {
                    const taskId = task.dataset.cleaningTask;
                    await this.runCleaningMutation(
                        `toggle-task:${taskId}`,
                        [task],
                        () => this.toggleTask(taskId, task.checked)
                    );
                }
            });
            document
                .getElementById("manualCleaningTask")
                ?.addEventListener("keydown", async event => {
                if (event.key ===
                    "Enter") {
                    event.preventDefault();
                    await this.runCleaningMutation(
                        "add-task",
                        [
                            document.getElementById("addManualCleaningTask"),
                            document.getElementById("manualCleaningTask")
                        ],
                        () => this.addTask()
                    );
                }
            });
        },

        async runCleaningMutation(key, controls, action) {
            this.pendingCleaningMutations =
                this.pendingCleaningMutations || new Set();

            if (this.pendingCleaningMutations.has(key)) {
                return;
            }

            this.pendingCleaningMutations.add(key);

            const elements = (controls || [])
                .filter(Boolean);

            elements.forEach(element => {
                element.disabled = true;
            });

            try {
                await action();
            }
            catch (error) {
                console.error("[HomeOS] Cleaning action failed.", error);
                this.toast(
                    error?.message ||
                    "HomeOS could not save that Cleaning change."
                );
            }
            finally {
                this.pendingCleaningMutations.delete(key);

                elements.forEach(element => {
                    if (element.isConnected) {
                        element.disabled = false;
                    }
                });
            }
        },

        setMode(mode) {
            if (![
                "room",
                "zone"
            ]
                .includes(mode)) {
                return;
            }
            this.mode =
                mode;
            this.renderMode();
            this.renderCompactChooser();
            this.renderInlineProtocol();
            if (mode === "room") {
                this.renderSelectedRoom();
            }
            else {
                this.renderSelectedZone();
            }
        },
    };
})();
