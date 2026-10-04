/* ============================================================
   HOMEOS // SEASONAL

   Seasonal tasks, zones, shopping and progress behavior.
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";
    const service = window.HomeOS
        ?.services
        ?.seasonal;
    const App = {
        SEASONS: {
            spring: {
                name: "Spring Renewal",
                short: "SP",
                range: "MAR 01 — MAY 31"
            },
            summer: {
                name: "Summer Reset",
                short: "SU",
                range: "JUN 01 — AUG 31"
            },
            fall: {
                name: "Fall Refresh",
                short: "FA",
                range: "SEP 01 — NOV 30"
            },
            winter: {
                name: "Winter Reset",
                short: "WI",
                range: "DEC 01 — FEB 28/29"
            }
        },
        state: null,
        data: null,
        season: null,
        year: null,
        viewMode: "room",
        selectedZoneId: null,
        selectedRoomId: null,
        selectedLevelId: null,
        activeTaskGroupKey: null,
        // Remember every Seasonal task band the user explicitly opens/closes.
        // Keys include the room, so each room keeps its own accordion state.
        openTaskGroupKeys: new Set(),
        closedTaskGroupKeys: new Set(),
        clockTimer: null,
        toastTimer: null,
        declutterSeedPending: new Set(),
        declutterSeedFailed: new Set(),
        pendingMutations: new Set(),
        async init() {
            if (!service) {
                console.error("HomeOS Seasonal service is unavailable.");
                return;
            }
            this.season =
                document.body
                    .dataset
                    .season ||
                    this.calendarSeason();
            this.year =
                this.cycleYear(this.season);
            this.bind();
            this.state =
                await window.HomeOS
                    .session
                    .guard();
            if (!this.state
                ?.authenticated) {
                return;
            }
            await this.reload(true);
            this.startClock();
        },
        async reload(first = false) {
            const result = await service
                .load(this.state
                .household
                .id, this.season, this.year);
            if (result.error) {
                console.error("[HomeOS] Seasonal Care load failed.", result.error);
                this.toast(result.error.message ||
                    "HomeOS could not load Seasonal Care.");
                return;
            }
            this.data =
                result.data;
            if (first) {
                this.ensureSelection();
            }
            else {
                this.ensureSelection(true);
            }
            this.render();
        },
        async runMutation(key, work) {
            const mutationKey = String(key || "seasonal");

            if (this.pendingMutations.has(mutationKey)) {
                return;
            }

            this.pendingMutations.add(mutationKey);

            try {
                return await work();
            } catch (error) {
                console.error("[HomeOS] Seasonal update failed.", error);
                this.toast(
                    error?.message ||
                    "HomeOS could not save that Seasonal change."
                );
            } finally {
                this.pendingMutations.delete(mutationKey);
            }
        },
        // --- Calendar / Cycle ---
        calendarSeason() {
            const month = new Date()
                .getMonth() +
                1;
            if (month >= 3 &&
                month <= 5) {
                return "spring";
            }
            if (month >= 6 &&
                month <= 8) {
                return "summer";
            }
            if (month >= 9 &&
                month <= 11) {
                return "fall";
            }
            return "winter";
        },
        cycleYear(season) {
            const now = new Date();
            const month = now.getMonth() +
                1;
            if (season ===
                "winter" &&
                month <=
                    2) {
                return now.getFullYear() -
                    1;
            }
            return now.getFullYear();
        },
        cycleBounds() {
            const y = this.year;
            if (this.season ===
                "spring") {
                return {
                    start: new Date(y, 2, 1),
                    end: new Date(y, 5, 1)
                };
            }
            if (this.season ===
                "summer") {
                return {
                    start: new Date(y, 5, 1),
                    end: new Date(y, 8, 1)
                };
            }
            if (this.season ===
                "fall") {
                return {
                    start: new Date(y, 8, 1),
                    end: new Date(y, 11, 1)
                };
            }
            return {
                start: new Date(y, 11, 1),
                end: new Date(y +
                    1, 2, 1)
            };
        },
        cycleState() {
            const now = new Date();
            const { start, end } = this.cycleBounds();
            if (now <
                start) {
                const days = Math.ceil((start -
                    now) /
                    86400000);
                return {
                    state: "upcoming",
                    label: "UPCOMING",
                    countdown: days,
                    countdownLabel: days ===
                        1
                        ? "DAY UNTIL CYCLE"
                        : "DAYS UNTIL CYCLE"
                };
            }
            if (now >=
                end) {
                return {
                    state: "closed",
                    label: "WINDOW CLOSED",
                    countdown: "—",
                    countdownLabel: "SEASON WINDOW COMPLETE"
                };
            }
            const days = Math.max(0, Math.ceil((end -
                now) /
                86400000));
            return {
                state: "active",
                label: "ACTIVE",
                countdown: days,
                countdownLabel: days ===
                    1
                    ? "DAY REMAINING"
                    : "DAYS REMAINING"
            };
        },
        startClock() {
            this.renderClock();
            window.clearInterval(this.clockTimer);
            this.clockTimer =
                window.setInterval(() => {
                    this.renderClock();
                    this.renderCycle();
                }, 30000);
        },
        renderClock() {
            const now = new Date();
            this.setText("seasonDetailDateLarge", new Intl
                .DateTimeFormat(undefined, {
                month: "short",
                day: "2-digit",
                year: "numeric"
            })
                .format(now)
                .toUpperCase());
            this.setText("seasonDetailDayLabel", new Intl
                .DateTimeFormat(undefined, {
                weekday: "long"
            })
                .format(now)
                .toUpperCase());
            this.setText("seasonDetailTimeLarge", new Intl
                .DateTimeFormat(undefined, {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit"
            })
                .format(now)
                .toUpperCase());
        },
        // --- Data ---
        rooms() {
            return (this.data
                ?.rooms ||
                []);
        },
        zones() {
            return (this.data
                ?.zones ||
                []);
        },
        levels() {
            return (this.data
                ?.levels ||
                []);
        },
        tasks() {
            return (this.data
                ?.tasks ||
                []);
        },
        shopping() {
            return (this.data
                ?.shopping ||
                []);
        },
        roomById(id) {
            return this.rooms()
                .find(room => room.id ===
                id) ||
                null;
        },
        zoneById(id) {
            return this.zones()
                .find(zone => zone.id ===
                id) ||
                null;
        },
        levelById(id) {
            return this.levels()
                .find(level => level.id ===
                id) ||
                null;
        },
        tasksForRoom(roomId) {
            return this.tasks()
                .filter(task => task.room_id ===
                roomId);
        },
        tasksForZone(zoneId) {
            return this.tasks()
                .filter(task => task.zone_id ===
                zoneId);
        },
        roomsForZone(zoneId) {
            return this.rooms()
                .filter(room => room.zone_id ===
                zoneId);
        },
        roomsForLevel(levelId) {
            return this.rooms()
                .filter(room => room.level_id ===
                levelId);
        },
        ensureSelection(preserve = false) {
            const rooms = this.rooms();
            const zones = this.zones()
                .filter(zone => this.roomsForZone(zone.id)
                .length);
            const levels = this.levels()
                .filter(level => this.roomsForLevel(level.id)
                .length);
            if (!preserve ||
                !zones.some(zone => zone.id ===
                    this.selectedZoneId)) {
                this.selectedZoneId =
                    zones[0]
                        ?.id ||
                        null;
            }
            if (!preserve ||
                !levels.some(level => level.id ===
                    this.selectedLevelId)) {
                this.selectedLevelId =
                    levels[0]
                        ?.id ||
                        rooms[0]
                            ?.level_id ||
                        null;
            }
            const levelRooms = this.roomsForLevel(this.selectedLevelId);
            if (!preserve ||
                !rooms.some(room => room.id ===
                    this.selectedRoomId) ||
                (this.selectedLevelId &&
                    !levelRooms.some(room => room.id ===
                        this.selectedRoomId))) {
                this.selectedRoomId =
                    levelRooms[0]
                        ?.id ||
                        rooms[0]
                            ?.id ||
                        null;
            }
            if (!this.selectedZoneId &&
                this.selectedRoomId) {
                this.selectedZoneId =
                    this.roomById(this.selectedRoomId)
                        ?.zone_id ||
                        null;
            }
            if (!zones.length &&
                rooms.length) {
                this.viewMode =
                    "room";
            }
        },
        progress(tasks) {
            const list = Array.isArray(tasks)
                ? tasks
                : [];
            const total = list.length;
            const completed = list.filter(task => task.done)
                .length;
            return {
                total,
                completed,
                percent: total
                    ? Math.round((completed /
                        total) *
                        100)
                    : 0
            };
        },
        totalProgress() {
            return this.progress(this.tasks());
        },
        currentTarget() {
            const room = this.roomById(this.selectedRoomId);
            if (!room) {
                return null;
            }
            return {
                type: "room",
                id: room.id,
                name: room.name,
                code: this.roomCode(room),
                description: `${this.roomTypeLabel(room)} · ${this.levelById(room.level_id)?.name || "Home"}`,
                tasks: this.tasksForRoom(room.id),
                room
            };
        },
        // --- Render ---
        render() {
            this.renderCycle();
            this.renderGuide();
            this.renderLevels();
            this.renderRoomMap();
            this.renderChecklist();
            this.renderIntelligence();
            this.renderShopping();
        },
        renderCycle() {
            const cycle = this.cycleState();
            document.body
                .dataset
                .seasonCycleState =
                cycle.state;
            this.setText("seasonCycleState", cycle.label);
            this.setText("seasonCycleCountdown", cycle.countdown);
            this.setText("seasonCycleCountdownLabel", cycle.countdownLabel);
            this.setText("seasonCycleWindow", this.SEASONS[this.season]
                .range);
        },
        renderMetrics() {
            const all = this.totalProgress();
            const rooms = this.rooms();
            const completeRooms = rooms.filter(room => {
                const p = this.progress(this.tasksForRoom(room.id));
                return (p.total >
                    0 &&
                    p.percent ===
                        100);
            })
                .length;
            this.setText("seasonTasksMetric", `${all.completed}/${all.total}`);
            this.setText("seasonZonesMetric", `${completeRooms}/${rooms.length}`);
            this.setText("seasonShoppingMetric", this.shopping()
                .length);
            this.setText("seasonProgressMetric", `${all.percent}%`);
            this.setText("seasonProgressValue", `${all.percent}%`);
            this.setText("seasonProgressStatus", this.progressStatus(all.percent));
            const ring = document
                .getElementById("seasonProgressRing");
            if (ring) {
                ring.style
                    .setProperty("--season-progress", `${Math.round(all.percent * 3.6)}deg`);
            }
        },
        renderGuide() {
            const all = this.totalProgress();
            const reset = this.data
                ?.reset;
            let status = "READY";
            let message = `HomeOS built ${this.SEASONS[this.season].name} from the real rooms in this household.`;
            if (reset
                ?.status ===
                "complete") {
                status =
                    "COMPLETE";
                message =
                    `${this.SEASONS[this.season].name} is complete and saved in Home Memory.`;
            }
            else if (all.percent >
                0) {
                status =
                    "IN PROGRESS";
                const target = this.nextIncompleteTarget();
                message =
                    target
                        ? `${this.SEASONS[this.season].name} is ${all.percent}% complete. ${target.name} is a good next place to continue.`
                        : `${this.SEASONS[this.season].name} is ${all.percent}% complete.`;
            }
            this.setText("seasonGuideStatus", status);
            this.setText("seasonGuideMessage", message);
            const action = document
                .getElementById("seasonGuideAction");
            if (action) {
                action.textContent =
                    reset
                        ?.status ===
                        "complete"
                        ? `${this.SEASONS[this.season].name.toUpperCase()} COMPLETE ✓`
                        : all.percent
                            ? `CONTINUE ${this.SEASONS[this.season].name.toUpperCase()} →`
                            : `ENTER ${this.SEASONS[this.season].name.toUpperCase()} →`;
            }
        },
        renderViewMode() {
            // Revision 09B is room-only. This method remains as a compatibility no-op.
        },
        renderZones() {
            // Revision 09B removed Seasonal Zone cleaning.
        },
        renderLevels() {
            const target = document
                .getElementById("seasonFloorTabs");
            if (!target) {
                return;
            }
            const levels = this.levels()
                .filter(level => this.roomsForLevel(level.id)
                .length);
            target.innerHTML =
                levels
                    .map((level, index) => {
                    const rooms = this.roomsForLevel(level.id);
                    const tasks = rooms.flatMap(room => this.tasksForRoom(room.id));
                    const p = this.progress(tasks);
                    const active = level.id ===
                        this.selectedLevelId;
                    return `
                                    <button
                                        class="season-floor-tab ${active ? "active" : ""}"
                                        type="button"
                                        data-season-floor="${this.attr(level.id)}"
                                        aria-pressed="${active}"
                                    >

                                        <span>
                                            L-${String(index + 1).padStart(2, "0")}
                                        </span>

                                        <strong>
                                            ${this.escape(level.name)}
                                        </strong>

                                        <small>
                                            ${rooms.length} spaces · ${p.percent}%
                                        </small>

                                    </button>
                                `;
                })
                    .join("");
        },
        renderRoomMap() {
            const target = document
                .getElementById("seasonHomeMap");
            if (!target) {
                return;
            }
            const rooms = this.roomsForLevel(this.selectedLevelId);
            if (!rooms.some(room => room.id ===
                this.selectedRoomId)) {
                this.selectedRoomId =
                    rooms[0]
                        ?.id ||
                        null;
            }
            if (!rooms.length) {
                target.innerHTML = `
                        <div class="season-empty-state">
                            <strong>No rooms are mapped to this level.</strong>
                            <p>Add or move rooms from Home Setup.</p>
                        </div>
                    `;
                return;
            }
            target.innerHTML =
                rooms
                    .map(room => {
                    const p = this.progress(this.tasksForRoom(room.id));
                    const selected = room.id ===
                        this.selectedRoomId;
                    const remaining = Math.max(0, p.total -
                        p.completed);
                    return `
                                    <button
                                        class="
                                            season-room-directory-card
                                            ${selected ? "selected" : ""}
                                            ${p.percent === 100 && p.total ? "complete" : ""}
                                        "
                                        type="button"
                                        data-season-room="${this.attr(room.id)}"
                                        aria-pressed="${selected}"
                                    >

                                        <div class="season-room-directory-card-top">

                                            <span class="season-room-directory-code">
                                                ${this.escape(this.roomCode(room))}
                                            </span>

                                            <strong class="season-room-directory-percent">
                                                ${p.percent}%
                                            </strong>

                                        </div>


                                        <div class="season-room-directory-card-main">

                                            <span>
                                                ${this.escape(this.roomTypeLabel(room))}
                                            </span>

                                            <h3>
                                                ${this.escape(room.name)}
                                            </h3>

                                            <p>
                                                ${p.total} detailed task${p.total === 1 ? "" : "s"}
                                                ·
                                                ${remaining} remaining
                                            </p>

                                        </div>


                                        <div class="season-room-directory-progress">
                                            <span style="width:${p.percent}%"></span>
                                        </div>


                                        <div class="season-room-directory-open">

                                            <span>
                                                ${selected ? "Checklist open" : "Open room reset"}
                                            </span>

                                            <strong aria-hidden="true">
                                                →
                                            </strong>

                                        </div>

                                    </button>
                                `;
                })
                    .join("");
        },
        displayGroups(target) {
            if (!target) {
                return [];
            }
            const byRoom = new Map();
            target.tasks
                .forEach(task => {
                const room = this.roomById(task.room_id);
                const roomKey = task.room_id ||
                    "zone-custom";
                if (!byRoom.has(roomKey)) {
                    byRoom.set(roomKey, {
                        room,
                        tasks: []
                    });
                }
                byRoom
                    .get(roomKey)
                    .tasks
                    .push(task);
            });
            const groups = [];
            for (const [key, entry] of byRoom) {
                const roomName = entry.room
                    ?.name ||
                    target.name;
                const core = entry.tasks
                    .filter(task => task.universalTask
                    ?.details ===
                    "CORE DEEP RESET");
                const seasonal = entry.tasks
                    .filter(task => String(task.universalTask
                    ?.details ||
                    "")
                    .endsWith(" LAYER"));
                const declutter = entry.tasks
                    .filter(task => task.universalTask
                    ?.details ===
                    "DECLUTTER & EDIT" ||
                    task.universalTask
                        ?.source_type ===
                        "seasonal_declutter");
                const custom = entry.tasks
                    .filter(task => task.universalTask
                    ?.details ===
                    "MY TASKS" ||
                    task.universalTask
                        ?.source_type ===
                        "seasonal_custom");
                if (core.length) {
                    groups.push({
                        id: `${key}-core`,
                        code: "CORE",
                        title: `${roomName} // Core Deep Reset`,
                        seasonal: false,
                        custom: false,
                        declutter: false,
                        tasks: core
                    });
                }
                if (declutter.length) {
                    groups.push({
                        id: `${key}-declutter`,
                        code: "EDIT",
                        title: `${roomName} // Declutter & Edit`,
                        seasonal: false,
                        custom: false,
                        declutter: true,
                        tasks: declutter
                    });
                }
                if (seasonal.length) {
                    groups.push({
                        id: `${key}-${this.season}`,
                        code: this.SEASONS[this.season]
                            .short,
                        title: `${roomName} // ${this.SEASONS[this.season].name} Layer`,
                        seasonal: true,
                        custom: false,
                        declutter: false,
                        tasks: seasonal
                    });
                }
                if (custom.length) {
                    groups.push({
                        id: `${key}-custom`,
                        code: "MY",
                        title: `${roomName} // My Tasks`,
                        seasonal: false,
                        custom: true,
                        declutter: false,
                        tasks: custom
                    });
                }
            }
            return groups;
        },
        renderTaskBuilder() {
            const target = this.currentTarget();
            const sectionSelect = document.getElementById("seasonAddTaskSection");
            if (!target ||
                !sectionSelect) {
                return;
            }
            const existing = sectionSelect.value ||
                "seasonal";
            sectionSelect.innerHTML = `
                    <option value="seasonal">
                        ${this.escape(this.SEASONS[this.season].name)} Layer
                    </option>

                    <option value="declutter">
                        Declutter & Edit
                    </option>

                    <option value="core">
                        Core Deep Reset
                    </option>

                    <option value="custom">
                        Other / My Tasks
                    </option>
                `;
            sectionSelect.value =
                [
                    "seasonal",
                    "declutter",
                    "core",
                    "custom"
                ].includes(existing)
                    ? existing
                    : "seasonal";
            this.setText("seasonTaskBuilderTitle", `Add to ${target.name}.`);
        },
        declutterTemplatesForRoom(room) {
            const name = String(room?.name ||
                "")
                .toLowerCase();
            const common = [
                "Remove anything that does not belong in this room",
                "Choose one drawer, basket or surface to edit down",
                "Make a donate, relocate or trash pass before styling"
            ];
            if (/primary|master|bedroom/.test(name)) {
                return [
                    "Review clothing you no longer wear and pull donation items",
                    "Pair socks and remove worn, damaged or unmatched pairs",
                    "Edit nightstands and dresser drawers so only useful items remain",
                    "Remove anything that does not belong in the bedroom"
                ];
            }
            if (/kitchen/.test(name)) {
                return [
                    "Declutter the junk drawer and remove items that belong elsewhere",
                    "Review food containers and remove damaged or unmatched pieces",
                    "Edit duplicate utensils, gadgets and small tools",
                    "Clear counters of anything that does not earn daily space"
                ];
            }
            if (/pantry/.test(name)) {
                return [
                    "Remove expired food and anything the household will not use",
                    "Combine duplicates and open packages where practical",
                    "Clear empty containers, bags and unnecessary packaging"
                ];
            }
            if (/bath/.test(name)) {
                return [
                    "Remove empty or expired toiletries and products",
                    "Edit under-sink storage and remove duplicates you will not use",
                    "Clear counters and drawers of products that belong elsewhere"
                ];
            }
            if (/laundry/.test(name)) {
                return [
                    "Match stray socks and remove worn or unmatched pairs",
                    "Edit cleaning and laundry supplies you no longer use",
                    "Clear empty containers, excess hangers and worn utility textiles"
                ];
            }
            if (/kid|delilah|leo|lucas|play|nursery/.test(name)) {
                return [
                    "Pull outgrown clothing and shoes for donate, store or hand-down",
                    "Remove broken toys and items no longer played with",
                    "Edit books, papers and small-item bins that have become clutter"
                ];
            }
            if (/living|den|family|common|game/.test(name)) {
                return [
                    "Remove papers, cups and items that migrated into the room",
                    "Edit baskets, games, toys and media that are no longer used",
                    "Reduce decorative pieces before adding seasonal styling"
                ];
            }
            if (/dining/.test(name)) {
                return [
                    "Clear the table and serving surfaces completely",
                    "Edit table linens and serving pieces you no longer use",
                    "Relocate items being stored here that belong elsewhere"
                ];
            }
            if (/closet|wic/.test(name)) {
                return [
                    "Pull clothing you no longer wear for donation",
                    "Remove worn shoes, broken accessories and empty packaging",
                    "Edit seasonal pieces before returning anything to the closet"
                ];
            }
            if (/garage/.test(name)) {
                return [
                    "Remove broken items, empty boxes and obvious trash",
                    "Group duplicates and decide what the household actually needs",
                    "Create a donate, sell or dispose zone before reorganizing"
                ];
            }
            if (/porch|deck|exterior/.test(name)) {
                return [
                    "Remove broken decor, empty containers and weather-damaged items",
                    "Relocate toys, tools and supplies that do not belong here",
                    "Edit outdoor decor before adding the new seasonal layer"
                ];
            }
            return common;
        },
        async ensureDeclutterForCurrentRoom() {
            const target = this.currentTarget();
            if (!target ||
                this.data
                    ?.reset
                    ?.status ===
                    "complete") {
                return false;
            }
            const hasDeclutter = target.tasks.some(task => task.universalTask
                ?.details ===
                "DECLUTTER & EDIT" ||
                task.universalTask
                    ?.source_type ===
                    "seasonal_declutter");
            if (hasDeclutter) {
                return false;
            }
            if (this.declutterSeedPending
                .has(target.id) ||
                this.declutterSeedFailed
                    .has(target.id)) {
                return false;
            }
            this.declutterSeedPending
                .add(target.id);
            try {
                const templates = this.declutterTemplatesForRoom(target.room);
                const results = await Promise.all(templates.map(title => service.addTask({
                    resetId: this.data
                        .reset
                        .id,
                    title,
                    roomId: target.id,
                    zoneId: target.room
                        ?.zone_id ||
                        null,
                    placement: "declutter",
                    seasonName: this.SEASONS[this.season].name
                })));
                const succeeded = results.every(result => !result.error &&
                    !result.placementError);
                if (!succeeded) {
                    this.declutterSeedFailed
                        .add(target.id);
                    const cleanup = await Promise.all(
                        results
                            .filter(result => result.resetTaskId)
                            .map(result => service.removeTask(result.resetTaskId))
                    );
                    const cleanupError = cleanup.find(result => result?.error)?.error;

                    if (cleanupError) {
                        throw cleanupError;
                    }
                }
                return succeeded;
            }
            finally {
                this.declutterSeedPending
                    .delete(target.id);
            }
        },
        renderChecklist() {
            const target = this.currentTarget();
            if (target &&
                !target.tasks.some(task => task.universalTask
                    ?.details ===
                    "DECLUTTER & EDIT" ||
                    task.universalTask
                        ?.source_type ===
                        "seasonal_declutter")) {
                this.ensureDeclutterForCurrentRoom()
                    .then(seeded => {
                    if (seeded) {
                        this.reload(false);
                    }
                })
                    .catch(error => {
                    console.error("[HomeOS] Could not add declutter reminders.", error);
                    this.toast(
                        error?.message ||
                        "HomeOS could not save the declutter reminders."
                    );
                });
            }
            const container = document
                .getElementById("seasonTaskList");
            if (!target ||
                !container) {
                return;
            }
            const p = this.progress(target.tasks);
            this.setText("selectedSeasonZoneCode", `${target.code} // ${this.season.toUpperCase()}`);
            this.setText("selectedSeasonZoneName", target.name);
            this.setText("selectedSeasonZoneDescription", target.description);
            this.setText("selectedSeasonZoneProgress", `${p.percent}%`);
            this.setText("selectedSeasonZoneTaskCount", `${p.completed}/${p.total}`);
            this.setText("seasonTargetProgressLabel", "ROOM COMPLETE");
            this.setText("seasonAddTaskScope", "ADD A TASK // THIS ROOM");
            this.setText("seasonAddTaskHelp", `Choose ${this.SEASONS[this.season].name} Layer, Declutter & Edit, Core Deep Reset, or My Tasks. HOME OS will keep it inside ${target.name}.`);
            this.renderTaskBuilder();
            const groups = this.displayGroups(target);
            const targetKey = `${target.type}:${target.id}`;
            const firstIncomplete = groups.findIndex(group => group.tasks
                .some(task => !task.done));
            container.innerHTML =
                groups.length
                    ? groups
                        .map((group, index) => {
                        const gp = this.progress(group.tasks);
                        const groupKey = `${targetKey}::${group.id}`;
                        const explicitlyOpen = this.openTaskGroupKeys
                            .has(groupKey);
                        const explicitlyClosed = this.closedTaskGroupKeys
                            .has(groupKey);
                        const defaultOpen = index ===
                            firstIncomplete ||
                            (firstIncomplete ===
                                -1 &&
                                index ===
                                    0);
                        // A user's explicit choice always wins.
                        // Otherwise only the default working section opens.
                        const open = explicitlyOpen ||
                            (!explicitlyClosed &&
                                defaultOpen);
                        const typeLabel = group.custom
                            ? "MY TASKS"
                            : group.declutter
                                ? "DECLUTTER"
                                : group.seasonal
                                    ? `${this.SEASONS[this.season].short} LAYER`
                                    : "CORE DEEP RESET";
                        return `
                                        <details
                                            class="
                                                season-task-group
                                                ${group.seasonal ? "seasonal-addon" : ""}
                                                ${group.declutter ? "declutter-addon" : ""}
                                                ${group.custom ? "custom-addon" : ""}
                                                ${gp.percent === 100 && gp.total ? "group-complete" : ""}
                                            "
                                            data-season-group-key="${this.attr(groupKey)}"
                                            ${open ? "open" : ""}
                                        >

                                            <summary>

                                                <span class="season-task-group-code">
                                                    ${this.escape(group.code)}
                                                </span>

                                                <span class="season-task-group-title">
                                                    ${this.escape(group.title)}
                                                </span>

                                                <span class="season-task-group-type">
                                                    ${this.escape(typeLabel)}
                                                </span>

                                                <span class="season-task-group-count">
                                                    ${gp.completed}/${gp.total}
                                                </span>

                                                <strong>
                                                    ${gp.percent}%
                                                </strong>

                                                <span class="season-task-group-chevron">
                                                    ⌄
                                                </span>

                                            </summary>


                                            <div class="season-task-group-body">

                                                ${group.tasks
                            .map(task => this.taskRow(task))
                            .join("")}

                                            </div>

                                        </details>
                                    `;
                    })
                        .join("")
                    : `
                            <div class="season-empty-state">
                                <strong>No tasks mapped yet.</strong>
                                <p>Add a custom task or choose another room.</p>
                            </div>
                          `;
        },
        refreshTaskProgressInPlace(taskId, done) {
            const target = this.currentTarget();
            if (!target) {
                return;
            }
            const p = this.progress(target.tasks);
            // Update the active room numbers without rebuilding the checklist.
            this.setText("selectedSeasonZoneProgress", `${p.percent}%`);
            this.setText("selectedSeasonZoneTaskCount", `${p.completed}/${p.total}`);
            const checkbox = Array.from(document.querySelectorAll("input[data-season-task]"))
                .find(input => String(input.dataset.seasonTask) ===
                String(taskId));
            const row = checkbox
                ?.closest(".season-task-row");
            if (checkbox) {
                checkbox.checked =
                    Boolean(done);
            }
            if (row) {
                row.classList
                    .toggle("done", Boolean(done));
            }
            const details = row
                ?.closest("details[data-season-group-key]");
            if (details) {
                const groupKey = details.dataset
                    .seasonGroupKey;
                const group = this.displayGroups(target)
                    .find(item => `${target.type}:${target.id}::${item.id}` ===
                    groupKey);
                if (group) {
                    const gp = this.progress(group.tasks);
                    const summary = details.querySelector(":scope > summary");
                    const count = summary
                        ?.querySelector(".season-task-group-count");
                    const percent = summary
                        ?.querySelector(":scope > strong");
                    if (count) {
                        count.textContent =
                            `${gp.completed}/${gp.total}`;
                    }
                    if (percent) {
                        percent.textContent =
                            `${gp.percent}%`;
                    }
                    details.classList
                        .toggle("group-complete", gp.percent === 100 &&
                        gp.total > 0);
                }
            }
            // These panels can safely refresh because they do not own the open
            // <details> elements or the user's scroll position.
            this.renderMetrics();
            this.renderGuide();
            this.renderLevels();
            this.renderRoomMap();
            this.renderIntelligence();
            this.renderCompletion();
        },
        taskRow(task) {
            return `
                    <div
                        class="
                            season-task-row
                            ${task.done ? "done" : ""}
                        "
                    >

                        <label>

                            <input
                                type="checkbox"
                                data-season-task="${this.attr(task.id)}"
                                ${task.done ? "checked" : ""}
                                ${this.data.reset.status === "complete" ? "disabled" : ""}
                            >

                            <span class="season-task-checkmark"></span>

                            <span class="season-task-title">
                                ${this.escape(task.title)}
                            </span>

                        </label>


                        ${this.data.reset.status !==
                "complete"
                ? `
                                    <button
                                        class="season-task-remove"
                                        type="button"
                                        title="Remove from this seasonal reset"
                                        data-remove-season-task="${this.attr(task.id)}"
                                    >
                                        ×
                                    </button>
                                  `
                : ""}

                    </div>
                `;
        },
        renderIntelligence() {
            const target = this.currentTarget();
            if (!target) {
                return;
            }
            const p = this.progress(target.tasks);
            const all = this.totalProgress();
            this.setText("seasonIntelligenceTitle", target.name);
            this.setText("seasonIntelligenceDescription", `HomeOS is reading ${target.name}'s detailed Core Deep Reset plus its smaller ${this.SEASONS[this.season].name} layer.`);
            this.setText("seasonZoneTasksDone", `${p.completed}/${p.total}`);
            this.setText("seasonZoneState", this.progressStatus(p.percent));
            this.setText("seasonTotalProgress", `${all.percent}%`);
            this.setText("seasonShoppingCount", this.shopping()
                .length);
        },
        renderShopping() {
            const target = document
                .getElementById("seasonShoppingList");
            const roomSelect = document.getElementById("seasonShoppingRoom");
            if (roomSelect) {
                const selectedRoom = roomSelect.value ||
                    this.currentTarget()
                        ?.id ||
                    "";
                roomSelect.innerHTML =
                    this.rooms()
                        .map(room => `
                                    <option
                                        value="${this.attr(room.id)}"
                                        ${String(room.id) === String(selectedRoom) ? "selected" : ""}
                                    >
                                        ${this.escape(room.name)}
                                    </option>
                                `)
                        .join("");
            }
            const items = this.shopping();
            this.setText("seasonShoppingListCount", `${items.length} ITEM${items.length === 1 ? "" : "S"}`);
            if (!target) {
                return;
            }
            if (!items.length) {
                target.innerHTML = `
                        <div class="season-shopping-empty">
                            <strong>Nothing planned yet.</strong>
                            <p>Add only the things the reset proves the home actually needs.</p>
                        </div>
                    `;
                return;
            }
            target.innerHTML =
                items
                    .map(item => `
                                <div class="season-shopping-row">

                                    <div>

                                        <span>
                                            FOR ${this.escape(item.category || "HOME")}
                                        </span>

                                        <strong>
                                            ${this.escape(item.name)}
                                        </strong>

                                    </div>


                                    <span class="season-shopping-qty">
                                        ×${Math.max(1, Number(item.quantity || 1))}
                                    </span>


                                    <button
                                        class="season-shopping-remove"
                                        type="button"
                                        data-remove-season-shopping="${this.attr(item.id)}"
                                        title="Remove shopping item"
                                    >
                                        ×
                                    </button>

                                </div>
                            `)
                    .join("");
        },
        renderCompletion() {
            const reset = this.data
                ?.reset;
            const all = this.totalProgress();
            this.setText("seasonCompletionMessage", reset
                ?.status ===
                "complete"
                ? `${this.SEASONS[this.season].name} is complete and saved in Home Memory.`
                : all.percent >=
                    100
                    ? `All remaining Seasonal tasks are complete. You can close ${this.SEASONS[this.season].name} now.`
                    : `${this.SEASONS[this.season].name} is ${all.percent}% complete. Finish or remove the remaining tasks before closing this cycle.`);
            const button = document
                .getElementById("completeSeasonButton");
            if (button) {
                button.disabled =
                    reset
                        ?.status !==
                        "complete" &&
                        (all.total ===
                            0 ||
                            all.percent <
                                100);
                button.textContent =
                    reset
                        ?.status ===
                        "complete"
                        ? `${this.SEASONS[this.season].name} Complete ✓`
                        : `Complete ${this.SEASONS[this.season].name}`;
            }
        },
        // --- Actions ---
        async beginWorkspace() {
            if (this.data
                ?.reset
                ?.status !==
                "complete") {
                const result = await service
                    .begin(this.data
                    .reset
                    .id);
                if (result.error) {
                    this.toast(result.error.message);
                }
                else {
                    this.data
                        .reset
                        .status =
                        "active";
                }
            }
            document
                .getElementById("seasonTopology")
                ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        },
        celebrateCompletedGroup(groupKey) {
            const group = Array.from(document.querySelectorAll("[data-season-group-key]"))
                .find(element => element.dataset
                .seasonGroupKey ===
                groupKey);
            if (!group) {
                return;
            }
            const summary = group.querySelector(":scope > summary");
            if (!summary) {
                return;
            }
            group.classList.remove("season-group-celebrate");
            group.querySelector(".season-section-celebration")
                ?.remove();
            void group.offsetWidth;
            const celebration = document.createElement("div");
            celebration.className =
                "season-section-celebration";
            celebration.setAttribute("aria-live", "polite");
            celebration.innerHTML = `
                    <span class="season-celebration-icon" aria-hidden="true">
                        ✓
                    </span>

                    <span class="season-celebration-copy">
                        <strong>Section complete</strong>
                        <small>Every task in this part of the room is done.</small>
                    </span>

                    <span class="season-celebration-sparkles" aria-hidden="true">
                        <i></i><i></i><i></i><i></i><i></i><i></i>
                    </span>
                `;
            summary.appendChild(celebration);
            group.classList.add("season-group-celebrate");
            window.setTimeout(() => {
                celebration.classList
                    .add("is-leaving");
            }, 1500);
            window.setTimeout(() => {
                group.classList.remove("season-group-celebrate");
                celebration.remove();
            }, 2050);
        },
        async toggleTask(taskId, done) {
            const targetBefore = this.currentTarget();
            const groupsBefore = this.displayGroups(targetBefore);
            const completedGroup = done
                ? groupsBefore.find(group => {
                    const contains = group.tasks.some(task => String(task.id) ===
                        String(taskId));
                    if (!contains) {
                        return false;
                    }
                    return group.tasks.every(task => String(task.id) ===
                        String(taskId)
                        ? true
                        : Boolean(task.done));
                })
                : null;
            const completedGroupKey = completedGroup &&
                targetBefore
                ? `${targetBefore.type}:${targetBefore.id}::${completedGroup.id}`
                : null;
            const localTask = this.tasks()
                .find(task => String(task.id) ===
                String(taskId));
            const previousDone = Boolean(localTask
                ?.done);
            const checkboxBeforeSave = Array.from(document.querySelectorAll("input[data-season-task]"))
                .find(input => String(input.dataset.seasonTask) ===
                String(taskId));
            if (checkboxBeforeSave) {
                checkboxBeforeSave.disabled =
                    true;
            }
            let result;

            try {
                result = await service.setTask(taskId, done);
            } catch (error) {
                if (checkboxBeforeSave) {
                    checkboxBeforeSave.checked = previousDone;
                    checkboxBeforeSave.disabled = false;
                }

                this.toast(
                    error?.message ||
                    "HomeOS could not update this Seasonal task."
                );
                return;
            }

            if (result.error) {
                if (checkboxBeforeSave) {
                    checkboxBeforeSave.checked =
                        previousDone;
                    checkboxBeforeSave.disabled =
                        false;
                }
                this.toast(result.error.message ||
                    "HomeOS could not update this Seasonal task.");
                return;
            }
            // The server has saved the task. Update the local model and only
            // refresh the progress readouts. Do NOT reload/rerender the page.
            if (localTask) {
                localTask.done =
                    Boolean(done);
            }
            this.refreshTaskProgressInPlace(taskId, done);
            if (checkboxBeforeSave) {
                checkboxBeforeSave.disabled =
                    this.data
                        ?.reset
                        ?.status ===
                        "complete";
            }
            if (done &&
                completedGroupKey) {
                window.setTimeout(() => this.celebrateCompletedGroup(completedGroupKey), 90);
            }
            if (done) {
                window.setTimeout(() => {
                    const checkbox = Array.from(document.querySelectorAll("input[data-season-task]"))
                        .find(input => input.dataset.seasonTask ===
                        taskId);
                    const row = checkbox
                        ?.closest(".season-task-row");
                    if (row) {
                        row.classList.add("season-task-celebrate");
                        window.setTimeout(() => row.classList.remove("season-task-celebrate"), 760);
                    }
                }, 70);
            }
        },
        async addTask() {
            if (this.data
                ?.reset
                ?.status ===
                "complete") {
                return;
            }
            const input = document.getElementById("newSeasonTask");
            const sectionSelect = document.getElementById("seasonAddTaskSection");
            const title = input
                ?.value
                ?.trim();
            const target = this.currentTarget();
            if (!title ||
                !target) {
                input?.focus();
                return;
            }
            const placement = sectionSelect
                ?.value ||
                "seasonal";
            const button = document.getElementById("addSeasonTaskButton");
            if (button) {
                button.disabled = true;
                button.textContent =
                    "Adding…";
            }
            let result;

            try {
                result = await service.addTask({
                    resetId: this.data.reset.id,
                    title,
                    roomId: target.id,
                    zoneId: target.room?.zone_id || null,
                    placement,
                    seasonName: this.SEASONS[this.season].name
                });
            } finally {
                if (button) {
                    button.disabled = false;
                    button.textContent = "+ Add Task";
                }
            }
            if (result.error) {
                this.toast(result.error.message ||
                    "HomeOS could not add this Seasonal task.");
                return;
            }
            if (result.placementError) {
                this.toast(
                    result.placementError.message ||
                    "HomeOS could not place this Seasonal task."
                );
                return;
            }

            input.value = "";
            await this.reload();
            const placementLabel = placement ===
                "core"
                ? "Core Deep Reset"
                : placement ===
                    "declutter"
                    ? "Declutter & Edit"
                    : placement ===
                        "custom"
                        ? "My Tasks"
                        : `${this.SEASONS[this.season].name} Layer`;
            this.toast(`Added to ${placementLabel}.`);
            input.focus();
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
            this.toast("Task removed from this seasonal cycle.");
        },
        async addShopping() {
            const name = this.value("seasonShoppingName")
                .trim();
            const quantity = Math.max(1, Number(this.value("seasonShoppingQty")) ||
                1);
            const target = this.currentTarget();
            const shoppingRoom = this.roomById(this.value("seasonShoppingRoom")) ||
                target?.room ||
                null;
            if (!name) {
                this.toast("Type a shopping item first.");
                return;
            }
            const result = await service
                .addShopping(this.state
                .household
                .id, this.season, this.year, name, quantity, shoppingRoom
                ?.name ||
                target
                    ?.name ||
                this.SEASONS[this.season]
                    .name);
            if (result.error) {
                this.toast(result.error.message ||
                    "HomeOS could not add this Seasonal shopping item.");
                return;
            }
            this.setValue("seasonShoppingName", "");
            this.setValue("seasonShoppingQty", 1);
            await this.reload();
            this.toast(`${name} added to the shared HomeOS Shopping List.`);
        },
        async removeShopping(shoppingId) {
            const result = await service
                .removeShopping(this.state
                .household
                .id, shoppingId);
            if (result.error) {
                this.toast(result.error.message ||
                    "HomeOS could not remove this shopping item.");
                return;
            }
            await this.reload();
        },
        async completeSeason() {
            const all = this.totalProgress();
            if (all.total ===
                0 ||
                all.percent <
                    100) {
                this.toast("Finish or remove the remaining Seasonal tasks first.");
                return;
            }
            const result = await service
                .complete(this.data
                .reset
                .id);
            if (result.error) {
                this.toast(result.error.message ||
                    "HomeOS could not complete this Seasonal cycle.");
                return;
            }
            await this.reload();
            this.toast(`${this.SEASONS[this.season].name} completed.`);
        },
        // --- Events ---
        bind() {
            const root = document
                .getElementById("seasonDetailRoot") ||
                document;
            root.addEventListener("click", async event => {
                const target = event.target
                    instanceof
                        Element
                    ? event.target
                    : event.target
                        ?.parentElement;
                if (!target) {
                    return;
                }
                if (target.closest("[data-begin-season]")) {
                    event.preventDefault();
                    await this.runMutation(
                        "begin-season",
                        () => this.beginWorkspace()
                    );
                    return;
                }
                const scroll = target.closest("[data-scroll-target]");
                if (scroll) {
                    event.preventDefault();
                    document
                        .getElementById(scroll.dataset
                        .scrollTarget)
                        ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                    return;
                }
                const mode = target.closest("[data-season-view-mode]");
                if (mode) {
                    this.viewMode =
                        mode.dataset
                            .seasonViewMode;
                    this.activeTaskGroupKey =
                        null;
                    this.renderViewMode();
                    this.renderChecklist();
                    this.renderIntelligence();
                    return;
                }
                const zone = target.closest("[data-season-zone]");
                if (zone) {
                    this.selectedZoneId =
                        zone.dataset
                            .seasonZone;
                    this.viewMode =
                        "zone";
                    this.activeTaskGroupKey =
                        null;
                    this.renderViewMode();
                    this.renderZones();
                    this.renderChecklist();
                    this.renderIntelligence();
                    document
                        .getElementById("seasonChecklist")
                        ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                    return;
                }
                const floor = target.closest("[data-season-floor]");
                if (floor) {
                    this.selectedLevelId =
                        floor.dataset
                            .seasonFloor;
                    this.selectedRoomId =
                        this.roomsForLevel(this.selectedLevelId)[0]
                            ?.id ||
                            null;
                    this.renderLevels();
                    this.renderRoomMap();
                    this.renderChecklist();
                    this.renderIntelligence();
                    return;
                }
                const room = target.closest("[data-season-room]");
                if (room) {
                    this.selectedRoomId =
                        room.dataset
                            .seasonRoom;
                    const selected = this.roomById(this.selectedRoomId);
                    if (selected) {
                        this.selectedLevelId =
                            selected.level_id;
                        this.selectedZoneId =
                            selected.zone_id ||
                                this.selectedZoneId;
                    }
                    this.viewMode =
                        "room";
                    this.activeTaskGroupKey =
                        null;
                    this.renderViewMode();
                    this.renderRoomMap();
                    this.renderChecklist();
                    this.renderIntelligence();
                    document
                        .getElementById("seasonChecklist")
                        ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                    return;
                }
                const removeTask = target.closest("[data-remove-season-task]");
                if (removeTask) {
                    const taskId = removeTask.dataset.removeSeasonTask;
                    await this.runMutation(
                        `remove-task:${taskId}`,
                        () => this.removeTask(taskId)
                    );
                    return;
                }
                const removeShopping = target.closest("[data-remove-season-shopping]");
                if (removeShopping) {
                    const shoppingId =
                        removeShopping.dataset.removeSeasonShopping;
                    await this.runMutation(
                        `remove-shopping:${shoppingId}`,
                        () => this.removeShopping(shoppingId)
                    );
                    return;
                }
                if (target.closest("#addSeasonTaskButton")) {
                    await this.runMutation(
                        "add-task",
                        () => this.addTask()
                    );
                    return;
                }
                if (target.closest("#addSeasonShoppingButton")) {
                    await this.runMutation(
                        "add-shopping",
                        () => this.addShopping()
                    );
                    return;
                }
                if (target.closest("#completeSeasonButton")) {
                    await this.runMutation(
                        "complete-season",
                        () => this.completeSeason()
                    );
                }
            });
            root.addEventListener("change", async event => {
                const checkbox = event.target
                    instanceof
                        HTMLInputElement &&
                    event.target
                        .matches("[data-season-task]")
                    ? event.target
                    : null;
                if (!checkbox) {
                    return;
                }
                const taskGroup = checkbox
                    .closest("details[data-season-group-key]");
                if (taskGroup
                    ?.dataset
                    .seasonGroupKey) {
                    this.openTaskGroupKeys
                        .add(taskGroup.dataset
                        .seasonGroupKey);
                    this.closedTaskGroupKeys
                        .delete(taskGroup.dataset
                        .seasonGroupKey);
                }
                const taskId = checkbox.dataset.seasonTask;
                await this.runMutation(
                    `task:${taskId}`,
                    () => this.toggleTask(taskId, checkbox.checked)
                );
            });
            root.addEventListener("toggle", event => {
                const details = event.target;
                if (!(details
                    instanceof
                        HTMLDetailsElement) ||
                    !details.matches("[data-season-group-key]")) {
                    return;
                }
                const groupKey = details.dataset
                    .seasonGroupKey;
                if (details.open) {
                    this.openTaskGroupKeys
                        .add(groupKey);
                    this.closedTaskGroupKeys
                        .delete(groupKey);
                }
                else {
                    this.openTaskGroupKeys
                        .delete(groupKey);
                    this.closedTaskGroupKeys
                        .add(groupKey);
                }
            }, true);
            document
                .getElementById("newSeasonTask")
                ?.addEventListener("keydown", async event => {
                if (event.key ===
                    "Enter") {
                    event.preventDefault();
                    await this.runMutation(
                        "add-task",
                        () => this.addTask()
                    );
                }
            });
            document
                .getElementById("seasonShoppingName")
                ?.addEventListener("keydown", async event => {
                if (event.key ===
                    "Enter") {
                    event.preventDefault();
                    await this.runMutation(
                        "add-shopping",
                        () => this.addShopping()
                    );
                }
            });
        },
        // --- Helpers ---
        nextIncompleteTarget() {
            const room = this.rooms()
                .find(item => this.tasksForRoom(item.id)
                .some(task => !task.done));
            if (room) {
                return room;
            }
            return null;
        },
        progressStatus(percent) {
            const value = Number(percent ||
                0);
            if (value >=
                100) {
                return "COMPLETE";
            }
            if (value >=
                65) {
                return "FINISHING";
            }
            if (value >
                0) {
                return "ACTIVE";
            }
            return "READY";
        },
        zoneCode(zone) {
            const index = this.zones()
                .findIndex(item => item.id ===
                zone.id);
            return `Z-${String(index + 1).padStart(2, "0")}`;
        },
        roomCode(room) {
            const index = this.rooms()
                .findIndex(item => item.id ===
                room.id);
            return `A-${String(index + 1).padStart(2, "0")}`;
        },
        roomTypeLabel(room) {
            return String(room.room_type ||
                "SPACE")
                .replace(/_/g, " ")
                .toUpperCase();
        },
        zoneColor(zone, index = 0) {
            const value = String(zone
                ?.color ||
                "")
                .trim();
            if (/^#[0-9a-f]{6}$/i
                .test(value)) {
                return value;
            }
            const colors = [
                "#74cdd3",
                "#a58be7",
                "#d99bb0",
                "#80c69a",
                "#e7b26f",
                "#8da9dc"
            ];
            return colors[index %
                colors.length];
        },
        initials(value) {
            const parts = String(value ||
                "H")
                .trim()
                .split(/\s+/)
                .filter(Boolean);
            if (parts.length ===
                1) {
                return parts[0]
                    .slice(0, 2)
                    .toUpperCase();
            }
            return parts
                .slice(0, 2)
                .map(part => part[0])
                .join("")
                .toUpperCase();
        },
        value(id) {
            return document
                .getElementById(id)
                ?.value ||
                "";
        },
        setValue(id, value) {
            const target = document
                .getElementById(id);
            if (target) {
                target.value =
                    value ??
                        "";
            }
        },
        setText(id, value) {
            const target = document
                .getElementById(id);
            if (target) {
                target.textContent =
                    String(value ??
                        "");
            }
        },
        toast(message) {
            const target = document
                .getElementById("appToast");
            if (!target) {
                return;
            }
            target.textContent =
                message;
            target.classList
                .add("show");
            window.clearTimeout(this.toastTimer);
            this.toastTimer =
                window.setTimeout(() => target.classList
                    .remove("show"), 2800);
        },
        escape(value) {
            return String(value ??
                "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        },
        attr(value) {
            return this.escape(value);
        }
    };
    window.HomeOS.seasonal =
        App;
    await App.init();
});
