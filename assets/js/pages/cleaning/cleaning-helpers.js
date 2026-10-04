/* ============================================================
   HOMEOS // CLEANING HELPERS

   Small helpers shared by the Cleaning modules.
============================================================ */

(() => {
    "use strict";
    window.HomeOS =
        window.HomeOS || {};
    window.HomeOS.cleaningModules =
        window.HomeOS.cleaningModules || {};
    window.HomeOS.cleaningModules.helpers = {
        // --- Helpers ---
        sessionMatches(session, target) {
            return target
                .type ===
                "room"
                ? session
                    .room_id ===
                    target.id
                : (session
                    .room_id ===
                    null &&
                    session
                        .zone_id ===
                        target.id);
        },
        sessionTargetName(session) {
            if (session
                .room_id) {
                return (this.roomById(session.room_id)
                    ?.name ||
                    "Area Clean");
            }
            return (this.zoneById(session.zone_id)
                ?.name ||
                "Zone Clean");
        },
        sessionProgress(session) {
            const tasks = session
                ?.tasks ||
                [];
            const total = tasks.length;
            const complete = tasks.filter(task => task.done)
                .length;
            return {
                total,
                complete,
                percent: total
                    ? Math.round((complete /
                        total) *
                        100)
                    : 100
            };
        },
        roomCareState(room) {
            if (room?.activeProgress) {
                return {
                    state: "active",
                    cssClass: "care-active",
                    short: `${room.activeProgress.percent}%`,
                    long: `${room.activeProgress.complete}/${room.activeProgress.total} IN PROGRESS`
                };
            }
            if (!room?.hasHistory) {
                return {
                    state: "new",
                    cssClass: "care-new",
                    short: "NOT YET",
                    long: "NOT CLEANED YET"
                };
            }
            const days = this.daysSince(room.latestAt);
            if (days === 0) {
                return {
                    state: "fresh",
                    cssClass: "care-fresh",
                    short: "TODAY",
                    long: "FRESH TODAY"
                };
            }
            if (days === 1) {
                return {
                    state: "recent",
                    cssClass: "care-recent",
                    short: "YESTERDAY",
                    long: "CLEANED YESTERDAY"
                };
            }
            return {
                state: "history",
                cssClass: "care-history",
                short: `${days}D AGO`,
                long: `LAST CLEANED ${days}D AGO`
            };
        },
        levelCareSummary(rooms) {
            const list = Array.isArray(rooms)
                ? rooms
                : [];
            const total = list.length;
            const cared = list.filter(room => room.hasHistory).length;
            const active = list.some(room => room.activeSession);
            return {
                total,
                cared,
                trackedPercent: total
                    ? Math.round((cared / total) * 100)
                    : 0,
                status: active
                    ? "IN PROGRESS"
                    : !total
                        ? "EMPTY"
                        : cared === 0
                            ? "READY"
                            : cared === total
                                ? "MEMORY ACTIVE"
                                : "BUILDING MEMORY"
            };
        },
        zoneCareState(zone) {
            if (zone?.activeProgress) {
                return {
                    state: "active",
                    cssClass: "care-active",
                    status: "IN PROGRESS",
                    metric: `${zone.activeProgress.percent}%`,
                    long: `${zone.activeProgress.complete}/${zone.activeProgress.total} IN PROGRESS`
                };
            }
            const total = Number(zone?.roomCount ||
                0);
            const cared = Number(zone?.caredCount ||
                0);
            if (!total) {
                return {
                    state: "empty",
                    cssClass: "care-new",
                    status: "READY",
                    metric: "0 AREAS",
                    long: "NO AREAS"
                };
            }
            return {
                state: cared === total
                    ? "tracked"
                    : cared
                        ? "partial"
                        : "new",
                cssClass: cared === total
                    ? "care-fresh"
                    : cared
                        ? "care-recent"
                        : "care-new",
                status: cared === total
                    ? "MEMORY ACTIVE"
                    : cared
                        ? "BUILDING MEMORY"
                        : "NOT STARTED",
                metric: `${cared}/${total} CARED`,
                long: `${cared} / ${total} AREAS CARED`
            };
        },
        showTaskReaction(message, tone = "task") {
            const target = document.getElementById("cleaningTaskReaction");
            if (!target) {
                return;
            }
            target.textContent =
                message;
            target.dataset.tone =
                tone;
            target.classList.remove("show");
            void target.offsetWidth;
            target.classList.add("show");
            window.clearTimeout(this.taskReactionTimer);
            this.taskReactionTimer =
                window.setTimeout(() => target.classList.remove("show"), tone === "complete"
                    ? 2800
                    : 1800);
        },
        launchChecklistCelebration(count = 28) {
            const host = document.getElementById("cleaningCelebrationLayer");
            if (!host) {
                return;
            }
            host.replaceChildren();
            for (let index = 0; index < count; index += 1) {
                const piece = document.createElement("i");
                const angle = ((Math.PI * 2) / count) *
                    index;
                const distance = 90 +
                    ((index * 23) % 130);
                piece.style.setProperty("--care-x", `${Math.cos(angle) * distance}px`);
                piece.style.setProperty("--care-y", `${Math.sin(angle) * distance * .62 - 18}px`);
                piece.style.setProperty("--care-r", `${180 + ((index * 71) % 420)}deg`);
                piece.style.setProperty("--care-delay", `${(index % 6) * 18}ms`);
                host.appendChild(piece);
            }
            window.setTimeout(() => host.replaceChildren(), 1900);
        },
        celebrateCompletedClean({ name, level, targetType }) {
            const panel = document.getElementById(targetType === "zone"
                ? "selectedZonePanel"
                : "selectedRoomPanel");
            if (!panel) {
                return;
            }
            panel.classList.remove("is-freshly-cleaned");
            void panel.offsetWidth;
            panel.classList.add("is-freshly-cleaned");
            panel.querySelector(".care-complete-note")?.remove();
            panel.querySelector(".care-panel-confetti")?.remove();
            const note = document.createElement("div");
            note.className =
                "care-complete-note";
            note.innerHTML = `
                <span>CLEAN COMPLETE ✦</span>
                <strong>${this.escape(name)}</strong>
                <small>${this.escape(this.title(level))} clean saved to HomeOS Cleaning memory.</small>
            `;
            const confetti = document.createElement("div");
            confetti.className =
                "care-panel-confetti";
            for (let index = 0; index < 30; index += 1) {
                const piece = document.createElement("i");
                piece.style.setProperty("--x", `${8 + ((index * 31) % 84)}%`);
                piece.style.setProperty("--delay", `${(index % 7) * 32}ms`);
                piece.style.setProperty("--drift", `${-36 + ((index * 19) % 72)}px`);
                confetti.appendChild(piece);
            }
            panel.append(confetti, note);
            window.clearTimeout(this.careCelebrationTimer);
            this.careCelebrationTimer =
                window.setTimeout(() => {
                    panel.classList.remove("is-freshly-cleaned");
                    note.remove();
                    confetti.remove();
                }, 3800);
        },
        average(rooms) {
            const list = Array.isArray(rooms)
                ? rooms
                : [];
            if (!list.length) {
                return 100;
            }
            return Math.round(list.reduce((sum, room) => sum +
                Number(room
                    .cleanState ||
                    0), 0) /
                list.length);
        },
        status(score) {
            const value = Number(score ||
                0);
            if (value >=
                85) {
                return "SETTLED";
            }
            if (value >=
                70) {
                return "ACTIVE";
            }
            return "ATTENTION";
        },
        daysSince(value) {
            if (!value) {
                return 99999;
            }
            const time = new Date(value)
                .getTime();
            if (!Number.isFinite(time)) {
                return 99999;
            }
            return Math.max(0, Math.floor((Date.now() -
                time) /
                86400000));
        },
        roomSpan(room, index) {
            const large = new Set([
                "living_room",
                "living",
                "kitchen",
                "basement",
                "garage",
                "den"
            ]);
            return (large.has(room.room_type) ||
                index %
                    5 ===
                    0)
                ? 3
                : 2;
        },
        zoneColor(zone) {
            const value = String(zone
                ?.color ||
                "")
                .trim();
            return /^#[0-9a-f]{6}$/i
                .test(value)
                ? value
                : "#a88be8";
        },
        initials(value) {
            const parts = String(value ||
                "H")
                .trim()
                .split(/\s+/)
                .filter(Boolean);
            if (!parts.length) {
                return "H";
            }
            if (parts.length ===
                1) {
                return parts[0]
                    .slice(0, 2)
                    .toUpperCase();
            }
            return (parts[0][0] +
                parts[1][0])
                .toUpperCase();
        },
        pretty(value) {
            return String(value ||
                "Area")
                .replace(/_/g, " ")
                .replace(/\b\w/g, letter => letter
                .toUpperCase());
        },
        title(value) {
            return String(value ||
                "")
                .replace(/\b\w/g, letter => letter
                .toUpperCase());
        },
        lastDone(value) {
            if (!value) {
                return "NOT YET";
            }
            const days = this.daysSince(value);
            if (days ===
                0) {
                return "TODAY";
            }
            if (days ===
                1) {
                return "YESTERDAY";
            }
            return `${days}D AGO`;
        },
        dateTime(value) {
            if (!value) {
                return "—";
            }
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return "—";
            }
            return new Intl
                .DateTimeFormat(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit"
            })
                .format(date);
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
        setBar(id, percent) {
            const target = document
                .getElementById(id);
            if (!target) {
                return;
            }
            const value = Math.max(0, Math.min(100, Number(percent) ||
                0));
            target.style.width =
                `${value}%`;
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
                window.setTimeout(() => {
                    target.classList
                        .remove("show");
                }, 2800);
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
})();
