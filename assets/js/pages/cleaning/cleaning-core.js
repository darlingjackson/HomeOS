/* ============================================================
   HOMEOS // CLEANING CORE

   Cleaning page startup, state and shared service access.
============================================================ */

(() => {
    "use strict";
    const service = window.HomeOS
        ?.services
        ?.cleaning;
    const taskService = window.HomeOS
        ?.services
        ?.tasks;
    window.HomeOS =
        window.HomeOS || {};
    window.HomeOS.cleaningModules =
        window.HomeOS.cleaningModules || {};
    window.HomeOS.cleaningModules.core = {
        async init() {
            if (!service || !taskService) {
                console.error("HomeOS Cleaning services are unavailable.");
                return;
            }
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
                .id);
            if (result.error) {
                console.error("[HomeOS] Cleaning load failed.", result.error);
                this.toast(result.error.message ||
                    "HomeOS could not load Cleaning.");
                return;
            }
            this.data =
                result.data;
            await this.loadRecurringCare();
            if (!this.careCadenceNormalized) {
                this.careCadenceNormalized = true;
                const normalized = await this.normalizeRecurringHomeCareCadences();
                if (normalized > 0) {
                    await this.loadRecurringCare();
                }
            }
            if (!this.careAutoEnsured) {
                this.careAutoEnsured = true;
                const created = await this.ensureAutomaticHomeCare();
                if (created > 0) {
                    await this.loadRecurringCare();
                }
            }
            if (first) {
                this.readQuery();
            }
            this.ensureSelection();
            this.render();
            const active = this.activeSession();
            if (active && this.sessionMatches(active, this.pendingTarget || {})) {
                this.showSession(active);
            }
        },
        // --- Date / Time ---
        startClock() {
            this.renderClock();
            window.clearInterval(this.clockTimer);
            this.clockTimer =
                window.setInterval(() => this.renderClock(), 30000);
        },
        renderClock() {
            const target = document
                .getElementById("cleaningDateTime");
            if (!target) {
                return;
            }
            target.textContent =
                new Intl
                    .DateTimeFormat(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit"
                })
                    .format(new Date());
        },
        // --- Structure ---
        readQuery() {
            const params = new URLSearchParams(window.location.search);
            const roomId = params.get("room");
            const zoneId = params.get("zone");
            if (roomId &&
                this.roomById(roomId)) {
                const room = this.roomById(roomId);
                this.selectedRoomId =
                    room.id;
                this.selectedLevelId =
                    room.level_id;
                this.selectedZoneId =
                    room.zone_id ||
                        this.selectedZoneId;
                this.mode =
                    "room";
                return;
            }
            if (zoneId &&
                this.zoneById(zoneId)) {
                this.selectedZoneId =
                    zoneId;
                this.mode =
                    "zone";
            }
        },
        ensureSelection() {
            const levels = this.data
                ?.levels ||
                [];
            const rooms = this.data
                ?.rooms ||
                [];
            const zones = this.data
                ?.zones ||
                [];
            if (!levels.some(item => item.id ===
                this.selectedLevelId)) {
                this.selectedLevelId =
                    rooms.find(room => room.id ===
                        this.selectedRoomId)
                        ?.level_id ||
                        levels[0]
                            ?.id ||
                        null;
            }
            const floorRooms = rooms.filter(room => room.level_id ===
                this.selectedLevelId);
            if (!floorRooms.some(room => room.id ===
                this.selectedRoomId)) {
                this.selectedRoomId =
                    floorRooms[0]
                        ?.id ||
                        rooms[0]
                            ?.id ||
                        null;
            }
            const selected = this.roomById(this.selectedRoomId);
            if (!zones.some(zone => zone.id ===
                this.selectedZoneId)) {
                this.selectedZoneId =
                    selected
                        ?.zone_id ||
                        zones[0]
                            ?.id ||
                        null;
            }
        },
        roomById(id) {
            return (this.data
                ?.rooms ||
                [])
                .find(room => room.id ===
                id) ||
                null;
        },
        zoneById(id) {
            return (this.data
                ?.zones ||
                [])
                .find(zone => zone.id ===
                id) ||
                null;
        },
        levelById(id) {
            return (this.data
                ?.levels ||
                [])
                .find(level => level.id ===
                id) ||
                null;
        },
        levelName(id) {
            return (this.levelById(id)
                ?.name ||
                "");
        },
        // --- Cleaning Memory ---
        completedSessions() {
            return (this.data
                ?.sessions ||
                [])
                .filter(session => session.status ===
                "complete" &&
                session.completed_at);
        },
        activeSession() {
            const list = (this.data
                ?.sessions ||
                [])
                .filter(session => [
                "active",
                "paused"
            ]
                .includes(session.status));
            return (list.find(session => session.status ===
                "active") ||
                list[0] ||
                null);
        },
        memoryForRoom(room) {
            const sessions = this.completedSessions()
                .filter(session => session.room_id ===
                room.id ||
                (room.zone_id &&
                    session.room_id ===
                        null &&
                    session.zone_id ===
                        room.zone_id));
            return this.memory(sessions);
        },
        memoryForZone(zone) {
            const sessions = this.completedSessions()
                .filter(session => session.room_id ===
                null &&
                session.zone_id ===
                    zone.id);
            return this.memory(sessions);
        },
        memory(sessions) {
            const list = (sessions ||
                [])
                .filter(item => item?.completed_at)
                .slice()
                .sort((first, second) => new Date(second.completed_at) -
                new Date(first.completed_at));
            const latest = list[0] ||
                null;
            const lastQuick = list.find(item => [
                "quick",
                "standard",
                "deep"
            ].includes(item.cleaning_level))?.completed_at ||
                null;
            const lastStandard = list.find(item => [
                "standard",
                "deep"
            ].includes(item.cleaning_level))?.completed_at ||
                null;
            const lastDeep = list.find(item => item.cleaning_level ===
                "deep")?.completed_at ||
                null;
            return {
                // No invented cleanliness score. These are all facts from
                // completed Cleaning sessions.
                cleanState: null,
                hasHistory: Boolean(latest),
                latestAt: latest?.completed_at ||
                    null,
                latestLevel: latest?.cleaning_level ||
                    null,
                lastQuickAt: lastQuick,
                lastStandardAt: lastStandard,
                lastDeepAt: lastDeep
            };
        },
        rooms() {
            const active = this.activeSession();
            return (this.data?.rooms ||
                [])
                .map((room, index) => {
                const memory = this.memoryForRoom(room);
                const activeForRoom = active &&
                    (active.room_id ===
                        room.id ||
                        (!active.room_id &&
                            room.zone_id &&
                            active.zone_id ===
                                room.zone_id))
                    ? active
                    : null;
                return {
                    ...room,
                    ...memory,
                    activeSession: activeForRoom,
                    activeProgress: activeForRoom
                        ? this.sessionProgress(activeForRoom)
                        : null,
                    code: `A-${String(index + 1).padStart(2, "0")}`,
                    short: this.initials(room.name),
                    description: room.metadata?.description ||
                        `${this.pretty(room.room_type)} · ${this.levelName(room.level_id) || "Home"}`
                };
            });
        },
        zones() {
            const rooms = this.rooms();
            const active = this.activeSession();
            return (this.data?.zones ||
                [])
                .map((zone, index) => {
                const zoneRooms = rooms.filter(room => room.zone_id ===
                    zone.id);
                const memory = this.memoryForZone(zone);
                const caredCount = zoneRooms.filter(room => room.hasHistory).length;
                const latestRoomCare = zoneRooms
                    .map(room => room.latestAt)
                    .filter(Boolean)
                    .sort((a, b) => new Date(b) -
                    new Date(a))[0] ||
                    null;
                const activeForZone = active &&
                    !active.room_id &&
                    active.zone_id ===
                        zone.id
                    ? active
                    : null;
                return {
                    ...zone,
                    ...memory,
                    code: `Z-${String(index + 1).padStart(2, "0")}`,
                    icon: this.initials(zone.name),
                    caredCount,
                    roomCount: zoneRooms.length,
                    latestAreaCareAt: latestRoomCare,
                    activeSession: activeForZone,
                    activeProgress: activeForZone
                        ? this.sessionProgress(activeForZone)
                        : null
                };
            });
        },
        suggestedLevel(target) {
            if (!target?.lastQuickAt &&
                !target?.lastStandardAt &&
                !target?.lastDeepAt) {
                return "standard";
            }
            if (target?.lastDeepAt &&
                this.daysSince(target.lastDeepAt) >= 60) {
                return "deep";
            }
            if (!target?.lastStandardAt ||
                this.daysSince(target.lastStandardAt) >= 10) {
                return "standard";
            }
            if (!target?.lastQuickAt ||
                this.daysSince(target.lastQuickAt) >= 3) {
                return "quick";
            }
            return "quick";
        },
    };
})();
