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
            document.addEventListener("click", event => {
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
                    this.startSession(level.dataset
                        .cleaningLevel);
                    return;
                }
                if (event.target
                    .closest("#addManualCleaningTask")) {
                    this.addTask();
                    return;
                }
                const remove = event.target
                    .closest("[data-remove-cleaning-task]");
                if (remove) {
                    this.removeTask(remove.dataset
                        .removeCleaningTask);
                    return;
                }
                if (event.target
                    .closest("#changeCleaningLevelButton")) {
                    this.changeCleaningLevel();
                    return;
                }
                if (event.target
                    .closest("#pauseCleaningButton")) {
                    this.pause();
                    return;
                }
                if (event.target
                    .closest("#completeCleaningButton")) {
                    this.complete();
                    return;
                }
                if (event.target
                    .closest("#resumeCleaningButton")) {
                    this.resume();
                    return;
                }
                const completeCare = event.target.closest("[data-complete-home-care]");
                if (completeCare) {
                    this.completeRecurringCare(completeCare.dataset.completeHomeCare);
                    return;
                }
                const removeCare = event.target.closest("[data-remove-home-care]");
                if (removeCare) {
                    this.removeRecurringCare(removeCare.dataset.removeHomeCare);
                    return;
                }
                const guide = event.target
                    .closest("#guidePrimaryAction");
                if (guide) {
                    const action = guide.dataset
                        .guideAction;
                    if (action ===
                        "resume") {
                        this.resume();
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
            document.addEventListener("change", event => {
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
                    this.toggleTask(task.dataset
                        .cleaningTask, task.checked);
                }
            });
            document
                .getElementById("manualCleaningTask")
                ?.addEventListener("keydown", event => {
                if (event.key ===
                    "Enter") {
                    event.preventDefault();
                    this.addTask();
                }
            });
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
