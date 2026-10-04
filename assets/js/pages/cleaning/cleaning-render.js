/* ============================================================
   HOMEOS // CLEANING RENDER

   Main Cleaning page rendering.
============================================================ */

(() => {
    "use strict";
    window.HomeOS =
        window.HomeOS || {};
    window.HomeOS.cleaningModules =
        window.HomeOS.cleaningModules || {};
    window.HomeOS.cleaningModules.render = {
        render() {
            this.renderHero();
            this.renderGuide();
            this.renderActiveStrip();
            this.renderMode();
            this.renderCompactChooser();
            this.renderInlineProtocol();
            this.renderFloorTabs();
            this.renderRoomMap();
            this.renderSelectedRoom();
            this.renderZones();
            this.renderSelectedZone();
            this.renderRoutineCare();
        },
        renderHero() {
            const rooms = this.rooms()
                .filter(room => room.active !== false);
            const zones = this.zones()
                .filter(zone => zone.active !== false);
            const active = this.activeSession();
            const activeComplete = room => Boolean(room?.activeProgress?.total &&
                room.activeProgress.percent >= 100);
            // Whole-home care coverage means a space has completed at least
            // one Cleaning reset. A just-finished active checklist also counts
            // immediately while HomeOS writes the session into Cleaning memory.
            // Quick, Standard and Deep cleans all count here.
            const cared = rooms.filter(room => room.hasHistory ||
                activeComplete(room));
            const never = rooms.filter(room => !room.hasHistory &&
                !activeComplete(room));
            // Attention remains a separate signal. It can recommend a deeper
            // reset even when the room has already been cared for before.
            const attention = rooms.filter(room => !activeComplete(room) &&
                (!room.hasHistory ||
                    this.suggestedLevel(room) !== "quick"));
            // Whole-home coverage reacts to every saved checkoff.
            // A room with completed Cleaning history contributes 100%.
            // During a first clean, the room contributes its real saved
            // checklist progress immediately — no Complete button required.
            // Zone cleans are calculated room-by-room from each task group.
            const activeFractionForRoom = room => {
                if (!active) {
                    return 0;
                }
                if (active.room_id === room.id) {
                    return Math.max(0, Math.min(100, this.sessionProgress(active).percent)) / 100;
                }
                if (!active.room_id && active.zone_id && active.zone_id === room.zone_id) {
                    const roomTasks = (active.tasks || []).filter(task => {
                        const taskRoomName = task.metadata?.room_name || null;
                        return task.room_id === room.id || taskRoomName === room.name;
                    });
                    if (!roomTasks.length) {
                        return 0;
                    }
                    const completed = roomTasks.filter(task => task.done).length;
                    return completed / roomTasks.length;
                }
                return 0;
            };
            const weightedCare = rooms.reduce((total, room) => total + (room.hasHistory ? 1 : activeFractionForRoom(room)), 0);
            const coverage = rooms.length
                ? Math.round((weightedCare / rooms.length) * 100)
                : 0;
            const latestReset = rooms
                .map(room => room.latestAt)
                .filter(Boolean)
                .sort((first, second) => new Date(second) - new Date(first))[0] ||
                null;
            this.setText("mappedSpaceCount", rooms.length);
            this.setText("roomsCurrentCount", cared.length);
            this.setText("roomsAttentionCount", attention.length);
            this.setText("roomsNeverCount", never.length);
            this.setText("zoneCount", String(zones.length).padStart(2, "0"));
            this.setText("homeCleanPercent", `${coverage}%`);
            this.setText("homeCleanScore", `${cared.length} / ${rooms.length} CARED FOR`);
            this.setText("heroCurrentFloor", "Whole Home");
            const activeProgress = active
                ? this.sessionProgress(active)
                : null;
            this.setText("heroActiveCleaning", active
                ? `${active.status === "paused" ? "Paused" : "Active"} · ${activeProgress?.percent || 0}%`
                : "None");
            this.setText("heroLastCleaned", this.lastDone(latestReset));
            this.setText("homeCleanSignalText", !rooms.length
                ? "No mapped areas yet. Add spaces in Home Setup to activate the whole-home signal."
                : active && activeProgress?.percent > 0 && activeProgress.percent < 100
                    ? `${this.sessionTargetName(active)} is ${activeProgress.percent}% complete. Every checkoff is already saved and is moving the whole-home Cleaning signal.`
                    : cared.length === 0
                        ? `0 of ${rooms.length} mapped areas have completed a Cleaning reset yet.`
                        : never.length > 0
                            ? `${cared.length} of ${rooms.length} mapped areas have completed Cleaning care. ${never.length} still need their first finished reset.`
                            : attention.length > 0
                                ? `Every mapped area has Cleaning history. ${attention.length} ${attention.length === 1 ? "area needs" : "areas need"} a deeper reset right now.`
                                : "Every mapped area has completed Cleaning care and the whole-home signal is steady.");
            const consolePanel = document.getElementById("cleaningHomeHealthConsole");
            if (consolePanel) {
                consolePanel.style.setProperty("--home-current-progress", `${coverage * 3.6}deg`);
                consolePanel.dataset.health =
                    !rooms.length
                        ? "empty"
                        : coverage >= 85
                            ? "strong"
                            : coverage >= 55
                                ? "steady"
                                : "attention";
            }
        },
        renderGuide() {
            const rooms = this.rooms()
                .filter(room => room.active !== false);
            const priority = {
                deep: 3,
                standard: 2,
                quick: 1
            };
            const recommended = rooms
                .slice()
                .sort((first, second) => {
                const levelDiff = priority[this.suggestedLevel(second)] -
                    priority[this.suggestedLevel(first)];
                if (levelDiff) {
                    return levelDiff;
                }
                return (this.daysSince(second.latestAt) -
                    this.daysSince(first.latestAt));
            })[0] ||
                null;
            const active = this.activeSession();
            const button = document.getElementById("guidePrimaryAction");
            if (active) {
                this.setText("cleaningGuideTarget", this.sessionTargetName(active));
                this.setText("cleaningGuideLevel", `${this.title(active.cleaning_level)} · ${active.status === "paused" ? "PAUSED" : "IN PROGRESS"}`);
            }
            else if (recommended) {
                const recommendationLevel = this.suggestedLevel(recommended);
                this.setText("cleaningGuideTarget", recommended.name);
                this.setText("cleaningGuideLevel", `${this.title(recommendationLevel)} CLEAN`);
            }
            else {
                this.setText("cleaningGuideTarget", "HOME READY");
                this.setText("cleaningGuideLevel", "ADD MAPPED AREAS");
            }
            if (active) {
                this.setText("cleaningGuideStatus", active.status === "paused"
                    ? "SESSION PAUSED"
                    : "SESSION ACTIVE");
                this.setText("cleaningGuideMessage", `${this.sessionTargetName(active)} is still in progress. HomeOS saved every completed checklist item.`);
                if (button) {
                    button.textContent =
                        "RESUME ACTIVE CLEAN →";
                    button.dataset.guideAction =
                        "resume";
                    delete button.dataset.roomId;
                }
                return;
            }
            if (!recommended) {
                this.setText("cleaningGuideStatus", "READY");
                this.setText("cleaningGuideMessage", "Add rooms through Home Setup and HomeOS will build Cleaning memory as you complete real cleans.");
                if (button) {
                    button.textContent =
                        "OPEN HOME SETUP →";
                    button.dataset.guideAction =
                        "setup";
                }
                return;
            }
            const level = this.suggestedLevel(recommended);
            this.setText("cleaningGuideStatus", !recommended.hasHistory
                ? "FIRST CLEAN"
                : level === "deep"
                    ? "ATTENTION"
                    : level === "standard"
                        ? "NEXT UP"
                        : "CURRENT");
            this.setText("cleaningGuideMessage", !recommended.hasHistory
                ? `${recommended.name} has no Cleaning history yet. A Standard Clean is a good first baseline.`
                : `${recommended.name} is a good next target. Its last completed clean was ${this.lastDone(recommended.latestAt).toLowerCase()}.`);
            if (button) {
                button.textContent =
                    `START ${recommended.name.toUpperCase()} →`;
                button.dataset.guideAction =
                    "recommended";
                button.dataset.roomId =
                    recommended.id;
            }
        },
        renderActiveStrip() {
            const strip = document
                .getElementById("activeCleaningStrip");
            if (!strip) {
                return;
            }
            const session = this.activeSession();
            if (!session) {
                strip.classList
                    .add("is-hidden");
                return;
            }
            strip.classList
                .remove("is-hidden");
            const progress = this.sessionProgress(session);
            this.setText("activeCleaningTitle", `${this.sessionTargetName(session)} · ${this.title(session.cleaning_level)}`);
            this.setText("activeCleaningDetail", `${progress.complete} of ${progress.total} tasks complete · ${session.status ===
                "paused"
                ? "paused"
                : "progress saved"}`);
            this.setText("activeCleaningPercent", `${progress.percent}%`);
            this.setBar("activeCleaningBar", progress.percent);
        },
        renderMode() {
            document
                .querySelectorAll("[data-cleaning-mode]")
                .forEach(button => {
                button.classList
                    .toggle("active", button.dataset
                    .cleaningMode ===
                    this.mode);
            });
            document
                .getElementById("roomModeWorkspace")
                ?.classList
                .toggle("is-hidden", this.mode !==
                "room");
            document
                .getElementById("zoneModeWorkspace")
                ?.classList
                .toggle("is-hidden", this.mode !==
                "zone");
        },
        renderCompactChooser() {
            const areaSelect = document.getElementById("areaCleanSelect");
            if (areaSelect) {
                const levels = this.data.levels || [];
                const rooms = this.rooms();
                areaSelect.innerHTML =
                    levels
                        .map(level => {
                        const levelRooms = rooms.filter(room => room.level_id ===
                            level.id);
                        if (!levelRooms.length) {
                            return "";
                        }
                        return `
                                    <optgroup label="${this.attr(level.name)}">
                                        ${levelRooms.map(room => `
                                                <option
                                                    value="${this.attr(room.id)}"
                                                    ${room.id === this.selectedRoomId ? "selected" : ""}
                                                >
                                                    ${this.escape(level.name)} — ${this.escape(room.name)}
                                                </option>
                                            `).join("")}
                                    </optgroup>
                                `;
                    })
                        .join("") ||
                        `<option value="">No mapped areas yet</option>`;
                if (this.selectedRoomId) {
                    areaSelect.value =
                        this.selectedRoomId;
                }
            }
            const zoneSelect = document.getElementById("zoneCleanSelect");
            if (zoneSelect) {
                const zones = this.zones();
                zoneSelect.innerHTML =
                    zones.length
                        ? zones.map(zone => `
                                <option
                                    value="${this.attr(zone.id)}"
                                    ${zone.id === this.selectedZoneId ? "selected" : ""}
                                >
                                    ${this.escape(zone.name)} · ${zone.roomCount} ${zone.roomCount === 1 ? "area" : "areas"}
                                </option>
                            `).join("")
                        : `<option value="">No Cleaning zones yet</option>`;
                if (this.selectedZoneId) {
                    zoneSelect.value =
                        this.selectedZoneId;
                }
            }
        },
        renderInlineProtocol() {
            const room = this.roomById(this.selectedRoomId);
            const zone = this.zoneById(this.selectedZoneId);
            const target = this.mode === "zone"
                ? zone
                : room;
            if (!target) {
                this.pendingTarget = null;
                this.setText("cleaningDialogTitle", "Choose a space");
                this.setText("cleaningProtocolRecommendation", "Choose an Area or Zone and HomeOS will build the next step.");
                document.getElementById("cleaningTaskScreen")?.classList.add("is-hidden");
                return;
            }
            this.pendingTarget =
                this.mode === "zone"
                    ? {
                        type: "zone",
                        id: zone.id,
                        name: zone.name,
                        zoneId: zone.id
                    }
                    : {
                        type: "room",
                        id: room.id,
                        name: room.name,
                        zoneId: room.zone_id
                    };
            this.setText("cleaningTargetLabel", this.mode === "zone"
                ? "Choose a zone"
                : "Choose an area");
            this.setText("cleaningTargetHint", this.mode === "zone"
                ? "Connected spaces"
                : "Grouped by level");
            this.setText("cleaningDialogKicker", this.mode === "zone"
                ? "ZONE CLEANING"
                : "AREA CLEANING");
            this.setText("cleaningDialogTitle", target.name);
            const suggested = this.suggestedLevel(target);
            this.setText("cleaningProtocolRecommendation", `HomeOS recommends ${this.title(suggested)} for ${target.name}. Choose a level and the checklist will open below.`);
            const matching = (this.data?.sessions || [])
                .find(session => ["active", "paused"].includes(session.status) &&
                this.sessionMatches(session, this.pendingTarget)) ||
                null;
            document
                .querySelectorAll("[data-cleaning-level]")
                .forEach(button => {
                button.classList.toggle("recommended", !matching && button.dataset.cleaningLevel === suggested);
                button.classList.toggle("current-level", Boolean(matching) && button.dataset.cleaningLevel === matching.cleaning_level);
            });
            if (matching) {
                this.showSession(matching);
            }
            else {
                document
                    .getElementById("cleaningTaskScreen")
                    ?.classList.add("is-hidden");
            }
        },
        renderFloorTabs() {
            const target = document.getElementById("floorTabs");
            if (!target) {
                return;
            }
            const levels = this.data.levels;
            const rooms = this.rooms();
            target.innerHTML =
                levels.length
                    ? levels.map((level, index) => {
                        const list = rooms.filter(room => room.level_id ===
                            level.id);
                        const summary = this.levelCareSummary(list);
                        return `
                                <button
                                    class="floor-tab ${level.id === this.selectedLevelId ? "active" : ""}"
                                    type="button"
                                    data-floor="${this.attr(level.id)}"
                                >

                                    <div class="floor-tab-top">
                                        <span class="floor-tab-code">
                                            L-${String(index + 1).padStart(2, "0")}
                                        </span>

                                        <span class="floor-tab-status">
                                            <i></i>
                                            ${this.escape(summary.status)}
                                        </span>
                                    </div>

                                    <div class="floor-tab-core">
                                        <strong>${this.escape(level.name)}</strong>
                                        <span class="floor-tab-arrow">→</span>
                                    </div>

                                    <p class="floor-tab-description">
                                        ${list.length} mapped ${list.length === 1 ? "space" : "spaces"}.
                                    </p>

                                    <div class="floor-tab-metrics">
                                        <span>
                                            <strong>${String(list.length).padStart(2, "0")}</strong>
                                            SPACES
                                        </span>

                                        <span>
                                            <strong>${summary.cared}/${summary.total}</strong>
                                            CARED
                                        </span>
                                    </div>

                                    <div
                                        class="floor-tab-track"
                                        title="${summary.cared} of ${summary.total} areas have completed Cleaning history"
                                    >
                                        <span style="width:${summary.trackedPercent}%;"></span>
                                    </div>

                                </button>
                            `;
                    }).join("")
                    : `
                        <div class="cleaning-memory-empty">
                            <div class="cleaning-memory-empty-copy">
                                <span class="ui-kicker">HOME SETUP</span>
                                <h3>No active home levels yet.</h3>
                                <p>Create the household layout from Account &amp; Home Settings.</p>
                            </div>
                        </div>
                      `;
            const level = this.levelById(this.selectedLevelId);
            const floorRooms = rooms.filter(room => room.level_id ===
                this.selectedLevelId);
            const summary = this.levelCareSummary(floorRooms);
            const index = levels.findIndex(item => item.id ===
                this.selectedLevelId);
            this.setText("mapLevelCode", index >= 0
                ? `L-${String(index + 1).padStart(2, "0")}`
                : "LEVEL");
            this.setText("mapFloorTitle", level?.name ||
                "Home");
            this.setText("mapFloorDescription", floorRooms.length
                ? `${floorRooms.length} active areas · ${summary.cared} with completed Cleaning history.`
                : "No areas are mapped to this level yet.");
            this.setText("floorStateLabel", summary.status);
        },
        renderRoomMap() {
            const target = document.getElementById("roomMap");
            if (!target) {
                return;
            }
            const rooms = this.rooms()
                .filter(room => room.level_id ===
                this.selectedLevelId);
            if (!rooms.some(room => room.id ===
                this.selectedRoomId)) {
                this.selectedRoomId =
                    rooms[0]?.id ||
                        null;
            }
            const zoneIds = [
                ...new Set(rooms
                    .map(room => room.zone_id)
                    .filter(Boolean))
            ];
            const legend = document.getElementById("roomZoneLegend");
            if (legend) {
                legend.innerHTML =
                    zoneIds.map(id => {
                        const zone = this.zoneById(id);
                        const index = this.data.zones.findIndex(item => item.id === id);
                        return zone
                            ? `
                                    <span
                                        class="room-zone-key"
                                        style="--legend-color:${this.zoneColor(zone)};"
                                    >
                                        <i></i>
                                        <strong>Z-${String(index + 1).padStart(2, "0")}</strong>
                                        <small>${this.escape(zone.name)}</small>
                                    </span>
                                  `
                            : "";
                    }).join("");
            }
            if (!rooms.length) {
                target.innerHTML = `
                    <div class="cleaning-memory-empty" style="grid-column:1 / -1;">
                        <div class="cleaning-memory-empty-copy">
                            <span class="ui-kicker">NO AREAS YET</span>
                            <h3>This level is ready for its first room.</h3>
                            <p>Add rooms in Home Setup. Cleaning will map them automatically.</p>
                        </div>
                    </div>
                `;
                return;
            }
            target.innerHTML =
                rooms.map((room, index) => {
                    const zone = this.zoneById(room.zone_id);
                    const zoneIndex = this.data.zones.findIndex(item => item.id ===
                        room.zone_id);
                    const span = this.roomSpan(room, index);
                    const care = this.roomCareState(room);
                    return `
                            <button
                                class="room-tile ${room.id === this.selectedRoomId ? "selected" : ""} ${care.cssClass}"
                                type="button"
                                data-room-id="${this.attr(room.id)}"
                                title="Click once for details · Click twice quickly to choose Cleaning level"
                                style="--room-color:${this.zoneColor(zone)}; grid-column:span ${span};"
                            >
                                <div class="room-tile-top">
                                    <span class="room-tile-icon">${this.escape(room.short)}</span>
                                    <span class="room-tile-code">${this.escape(room.code)}</span>
                                </div>

                                <h3>${this.escape(room.name)}</h3>

                                <div class="room-tile-bottom">
                                    <span class="room-tile-zone">
                                        ${zoneIndex >= 0 ? `Z-${String(zoneIndex + 1).padStart(2, "0")}` : "UNZONED"}
                                    </span>

                                    <strong class="room-tile-score">
                                        ${this.escape(care.short)}
                                    </strong>
                                </div>
                            </button>
                        `;
                }).join("");
        },
        renderSelectedRoom() {
            const room = this.rooms().find(item => item.id ===
                this.selectedRoomId);
            if (!room) {
                return;
            }
            const zone = this.zoneById(room.zone_id);
            const zoneIndex = this.data.zones.findIndex(item => item.id ===
                room.zone_id);
            const care = this.roomCareState(room);
            this.setText("selectedRoomCode", room.code);
            this.setText("selectedRoomIcon", room.short);
            this.setText("selectedRoomName", room.name);
            this.setText("selectedRoomZone", zone
                ? `Z-${String(zoneIndex + 1).padStart(2, "0")} · ${zone.name}`
                : "NO CLEANING ZONE");
            this.setText("selectedRoomDescription", room.description);
            this.setText("selectedRoomState", care.long);
            this.setText("selectedRoomSuggested", this.suggestedLevel(room).toUpperCase());
            this.setText("selectedRoomQuick", this.lastDone(room.lastQuickAt));
            this.setText("selectedRoomStandard", this.lastDone(room.lastStandardAt));
            this.setText("selectedRoomDeep", this.lastDone(room.lastDeepAt));
            this.setText("selectedRoomFloor", this.levelName(room.level_id) ||
                "Home");
            const panel = document.getElementById("selectedRoomPanel");
            panel?.setAttribute("data-care-state", care.state);
            panel?.style.setProperty("--selected-zone-color", this.zoneColor(zone));
            const accent = document.getElementById("selectedRoomAccent");
            if (accent) {
                accent.style.background =
                    this.zoneColor(zone);
            }
            const icon = document.getElementById("selectedRoomIcon");
            if (icon) {
                icon.style.color =
                    this.zoneColor(zone);
            }
        },
        renderZones() {
            const target = document.getElementById("zoneCleaningGrid");
            if (!target) {
                return;
            }
            const zones = this.zones();
            if (!zones.length) {
                target.innerHTML = `
                    <div class="cleaning-memory-empty">
                        <div class="cleaning-memory-empty-copy">
                            <span class="ui-kicker">ZONE CLEAN</span>
                            <h3>No Cleaning zones are active yet.</h3>
                            <p>Create zones from Account &amp; Home Settings and they will appear here.</p>
                        </div>
                    </div>
                `;
                return;
            }
            target.innerHTML =
                zones.map(zone => {
                    const summary = this.zoneCareState(zone);
                    return `
                            <button
                                class="zone-cleaning-card ${zone.id === this.selectedZoneId ? "selected" : ""} ${summary.cssClass}"
                                type="button"
                                data-cleaning-zone="${this.attr(zone.id)}"
                                title="Click once for details · Click twice quickly to choose Cleaning level"
                                style="--zone-color:${this.zoneColor(zone)};"
                            >
                                <div class="zone-cleaning-card-top">
                                    <span class="zone-cleaning-card-icon">${this.escape(zone.icon)}</span>
                                    <span class="zone-cleaning-card-code">${this.escape(zone.code)}</span>
                                </div>

                                <h3>${this.escape(zone.name)}</h3>

                                <p>${zone.roomCount} mapped ${zone.roomCount === 1 ? "space" : "spaces"}</p>

                                <div class="zone-cleaning-card-footer">
                                    <span>${this.escape(summary.status)}</span>
                                    <strong>${this.escape(summary.metric)}</strong>
                                </div>
                            </button>
                        `;
                }).join("");
        },
        renderSelectedZone() {
            const zone = this.zones().find(item => item.id ===
                this.selectedZoneId);
            if (!zone) {
                return;
            }
            const rooms = this.rooms().filter(room => room.zone_id ===
                zone.id);
            const recommendation = this.suggestedLevel(zone);
            const summary = this.zoneCareState(zone);
            this.setText("selectedZoneCode", zone.code);
            this.setText("selectedZoneName", zone.name);
            this.setText("selectedZoneDescription", zone.description ||
                `${rooms.length} connected areas in this Cleaning zone.`);
            this.setText("selectedZoneState", summary.long);
            this.setText("selectedZoneSuggested", recommendation.toUpperCase());
            this.setText("selectedZoneRooms", rooms.length);
            this.setText("selectedZoneStatus", summary.status);
            const list = document.getElementById("selectedZoneRoomList");
            if (list) {
                list.innerHTML =
                    rooms.length
                        ? rooms.map(room => {
                            const roomState = this.roomCareState(room);
                            return `
                                    <span>
                                        ${this.escape(room.name)}
                                        <small>${this.escape(roomState.short)}</small>
                                    </span>
                                `;
                        }).join("")
                        : `<span>No active rooms</span>`;
            }
            const panel = document.getElementById("selectedZonePanel");
            panel?.setAttribute("data-care-state", summary.state);
            const accent = document.getElementById("selectedZoneAccent");
            if (accent) {
                accent.style.background =
                    this.zoneColor(zone);
            }
        },
        renderHistory() {
            const target = document
                .getElementById("cleaningHistoryList");
            if (!target) {
                return;
            }
            const history = this.completedSessions()
                .slice(0, 8);
            if (!history.length) {
                target.innerHTML = `

                    <div class="cleaning-memory-empty">

                        <div class="cleaning-memory-empty-visual">
                            <div class="cleaning-memory-orbit">
                                <span></span>
                                <i>✦</i>
                            </div>
                        </div>


                        <div class="cleaning-memory-empty-copy">

                            <span class="ui-kicker">
                                MEMORY NODE // READY
                            </span>

                            <h3>
                                Cleaning memory is ready.
                            </h3>

                            <p>
                                Complete your first Quick, Standard or
                                Deep Clean and HomeOS will begin building
                                history for this home.
                            </p>

                        </div>


                        <div class="cleaning-memory-empty-readout">

                            <span>
                                COMPLETED PROTOCOLS
                            </span>

                            <strong>
                                00
                            </strong>

                            <div>
                                <i></i>
                                MEMORY ONLINE
                            </div>

                        </div>

                    </div>
                `;
                return;
            }
            target.innerHTML =
                history
                    .map(session => `
                            <article class="cleaning-history-row">

                                <span class="cleaning-history-icon">
                                    ✓
                                </span>


                                <div class="cleaning-history-main">

                                    <span class="cleaning-history-system">
                                        CLEANING MEMORY
                                    </span>

                                    <h3>
                                        ${this.escape(this.sessionTargetName(session))}
                                    </h3>

                                    <p>
                                        ${this.title(session.cleaning_level)} Clean
                                    </p>

                                </div>


                                <div class="cleaning-history-meta">

                                    <span>
                                        TYPE
                                    </span>

                                    <strong>
                                        ${session.room_id ? "AREA" : "ZONE"}
                                    </strong>

                                </div>


                                <div class="cleaning-history-meta">

                                    <span>
                                        FINISHED
                                    </span>

                                    <strong>
                                        ${this.escape(this.dateTime(session.completed_at))}
                                    </strong>

                                </div>

                            </article>
                        `)
                    .join("");
        },
        // --- Recurring Home Care ---
    };
})();
