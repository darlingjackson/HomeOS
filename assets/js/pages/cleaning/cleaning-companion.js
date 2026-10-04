/* ============================================================
   HOMEOS // CLEANING COMPANION

   Lumi behavior and Cleaning companion reactions.
============================================================ */

(() => {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    window.HomeOS.cleaningModules = window.HomeOS.cleaningModules || {};
    const SLEEPY_AFTER_MS = 2 * 60 * 1000;
    const WORRIED_AFTER_MS = 5 * 60 * 1000;
    const LOW_POWER_AFTER_MS = 9 * 60 * 1000;
    const HEARTBEAT_MS = 20 * 1000;
    const FIREWORK_COOLDOWN_MS = 4500;
    const MOTIVATION_LINES = [
        "A little order can make room for a lot of peace.",
        "One task at a time — care for the home God has given you.",
        "Clean space, calm pace. Keep going with grace.",
        "Small acts of care are still acts of stewardship.",
        "Thank God for this home, then care for the space in front of you.",
        "Let all things be done decently and in order. — 1 Corinthians 14:40",
        "Work heartily, as for the Lord. — Colossians 3:23",
        "Do everything with love. — 1 Corinthians 16:14",
        "Peace, order, and one small reset at a time.",
        "A cared-for home does not have to be perfect — just tended with love."
    ];
    const randomDelay = (minimum, maximum) => minimum + Math.floor(Math.random() * (maximum - minimum + 1));
    window.HomeOS.cleaningModules.companion = {
        companionLastProgressAt: 0,
        companionLastCompleteCount: null,
        companionHeartbeatTimer: null,
        companionMotivationTimer: null,
        companionWaveTimer: null,
        companionBlinkTimer: null,
        companionLastMotivationIndex: -1,
        lastFullFireworksAt: 0,
        cleaningCompanionMood(progress) {
            const now = Date.now();
            if (this.companionLastCompleteCount === null) {
                this.companionLastCompleteCount = progress.complete;
                this.companionLastProgressAt = now;
            }
            else if (this.companionLastCompleteCount !== progress.complete) {
                this.companionLastCompleteCount = progress.complete;
                this.companionLastProgressAt = now;
            }
            if (progress.percent >= 100) {
                return "delighted";
            }
            // Lumi only starts powering down after the clean has actually begun.
            // An untouched checklist should feel welcoming, not disappointed.
            if (progress.complete > 0 && progress.complete < progress.total) {
                const idleFor = Math.max(0, now - (this.companionLastProgressAt || now));
                if (idleFor >= LOW_POWER_AFTER_MS) {
                    return "lowpower";
                }
                if (idleFor >= WORRIED_AFTER_MS) {
                    return "worried";
                }
                if (idleFor >= SLEEPY_AFTER_MS) {
                    return "sleepy";
                }
            }
            if (progress.percent >= 75) {
                return "happy";
            }
            if (progress.percent >= 25 || progress.complete > 0) {
                return "focused";
            }
            return "neutral";
        },
        cleaningCompanionCopy(progress, mood) {
            if (!progress.total) {
                return {
                    stage: "empty",
                    eyebrow: "WAITING FOR TASKS",
                    status: "IDLE",
                    message: "Add a task and Lumi will keep this reset with you."
                };
            }
            if (mood === "lowpower") {
                return {
                    stage: "lowpower",
                    eyebrow: "LOW-POWER MODE",
                    status: "DIMMING",
                    message: "Lumi is powering down a little. One completed task will bring her right back online."
                };
            }
            if (mood === "worried") {
                return {
                    stage: "worried",
                    eyebrow: "STILL WITH YOU",
                    status: "WAITING",
                    message: "The reset has been quiet for a while. Lumi is dimming, but one small checkoff will brighten her right back up."
                };
            }
            if (mood === "sleepy") {
                return {
                    stage: "sleepy",
                    eyebrow: "ENERGY SAVING",
                    status: "SLEEPY",
                    message: "Lumi is getting sleepy while the checklist waits. One saved checkoff will wake her right back up."
                };
            }
            if (progress.percent >= 100) {
                return {
                    stage: "complete",
                    eyebrow: "SPACE RESTORED",
                    status: "DELIGHTED",
                    message: "Everything on this checklist is complete. Lumi is celebrating the care you gave this space."
                };
            }
            if (progress.percent >= 75) {
                return {
                    stage: "almost",
                    eyebrow: "ALMOST THERE",
                    status: "HAPPY",
                    message: "The finish line is close. Keep going — this space is coming back together beautifully."
                };
            }
            if (progress.percent >= 50) {
                return {
                    stage: "half",
                    eyebrow: "MOMENTUM ACTIVE",
                    status: "FOCUSED",
                    message: "You’re past halfway. Steady care is doing the work."
                };
            }
            if (progress.percent >= 25) {
                return {
                    stage: "moving",
                    eyebrow: "RESET IN PROGRESS",
                    status: "FOCUSED",
                    message: "Good rhythm. One small checkoff at a time."
                };
            }
            if (progress.complete > 0) {
                return {
                    stage: "started",
                    eyebrow: "CLEAN STARTED",
                    status: "AWAKE",
                    message: "First task down. Lumi is awake and tracking every checkoff."
                };
            }
            return {
                stage: "ready",
                eyebrow: "READY WHEN YOU ARE",
                status: "TRACKING",
                message: "Start with one task. A little order can make room for a lot of peace."
            };
        },
        ensureCleaningCompanionHeartbeat() {
            if (!this.companionHeartbeatTimer) {
                this.companionHeartbeatTimer = window.setInterval(() => {
                    const session = this.activeSession?.();
                    if (session) {
                        this.renderCleaningCompanion(session);
                    }
                }, HEARTBEAT_MS);
            }
            this.ensureCleaningCompanionMotivation();
            this.ensureCleaningCompanionWave();
            this.ensureCleaningCompanionBlink();
        },
        ensureCleaningCompanionMotivation() {
            if (this.companionMotivationTimer) {
                return;
            }
            this.companionMotivationTimer = window.setTimeout(() => {
                this.companionMotivationTimer = null;
                const session = this.activeSession?.();
                if (session) {
                    const progress = this.sessionProgress(session);
                    if (progress.total && progress.percent < 100) {
                        this.showCleaningCompanionMotivation();
                    }
                }
                this.ensureCleaningCompanionMotivation();
            }, randomDelay(42000, 68000));
        },
        ensureCleaningCompanionBlink() {
            if (this.companionBlinkTimer) {
                return;
            }
            this.companionBlinkTimer = window.setTimeout(() => {
                this.companionBlinkTimer = null;
                const session = this.activeSession?.();
                const panel = document.getElementById("cleaningCompanionPanel");
                const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
                if (session && panel && !reducedMotion) {
                    const progress = this.sessionProgress(session);
                    const mood = this.cleaningCompanionMood(progress);
                    if (!["sleepy", "lowpower"].includes(mood)) {
                        panel.classList.remove("is-blinking");
                        void panel.offsetWidth;
                        panel.classList.add("is-blinking");
                        window.setTimeout(() => panel.classList.remove("is-blinking"), 260);
                    }
                }
                this.ensureCleaningCompanionBlink();
            }, randomDelay(3200, 7200));
        },
        ensureCleaningCompanionWave() {
            if (this.companionWaveTimer) {
                return;
            }
            this.companionWaveTimer = window.setTimeout(() => {
                this.companionWaveTimer = null;
                const session = this.activeSession?.();
                const panel = document.getElementById("cleaningCompanionPanel");
                const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
                if (session && panel && !reducedMotion) {
                    const progress = this.sessionProgress(session);
                    const mood = this.cleaningCompanionMood(progress);
                    if (!["lowpower", "worried"].includes(mood)) {
                        this.waveCleaningCompanion();
                    }
                }
                this.ensureCleaningCompanionWave();
            }, randomDelay(28000, 56000));
        },
        waveCleaningCompanion() {
            const panel = document.getElementById("cleaningCompanionPanel");
            if (!panel) {
                return;
            }
            panel.classList.remove("is-waving");
            void panel.offsetWidth;
            panel.classList.add("is-waving");
            window.setTimeout(() => panel.classList.remove("is-waving"), 2200);
        },
        showCleaningCompanionMotivation() {
            const panel = document.getElementById("cleaningCompanionPanel");
            const message = document.getElementById("cleaningCompanionMessage");
            if (!panel || !message) {
                return;
            }
            let index = Math.floor(Math.random() * MOTIVATION_LINES.length);
            if (MOTIVATION_LINES.length > 1 && index === this.companionLastMotivationIndex) {
                index = (index + 1) % MOTIVATION_LINES.length;
            }
            this.companionLastMotivationIndex = index;
            this.companionReactionUntil = Date.now() + 7600;
            message.textContent = MOTIVATION_LINES[index];
            panel.classList.add("is-speaking");
            if (Math.random() > 0.45) {
                this.waveCleaningCompanion();
            }
            window.clearTimeout(this.companionMotivationClearTimer);
            this.companionMotivationClearTimer = window.setTimeout(() => {
                panel.classList.remove("is-speaking");
                this.companionReactionUntil = 0;
                const active = this.activeSession?.();
                if (active) {
                    this.renderCleaningCompanion(active);
                }
            }, 7600);
        },
        renderCleaningCompanion(session) {
            const panel = document.getElementById("cleaningCompanionPanel");
            if (!panel || !session) {
                return;
            }
            this.ensureCleaningCompanionHeartbeat();
            const progress = this.sessionProgress(session);
            const visualPercent = progress.total ? progress.percent : 0;
            const mood = this.cleaningCompanionMood(progress);
            const copy = this.cleaningCompanionCopy(progress, mood);
            const targetName = this.sessionTargetName(session);
            const ring = document.getElementById("cleaningCompanionRing");
            const percent = document.getElementById("cleaningCompanionPercent");
            const count = document.getElementById("cleaningCompanionCount");
            const eyebrow = document.getElementById("cleaningCompanionEyebrow");
            const message = document.getElementById("cleaningCompanionMessage");
            const room = document.getElementById("cleaningCompanionRoom");
            const live = document.getElementById("cleaningCompanionLiveText");
            const taskScreen = document.getElementById("cleaningTaskScreen");
            panel.dataset.stage = copy.stage;
            panel.dataset.mood = mood;
            panel.style.setProperty("--lumi-progress", `${visualPercent * 3.6}deg`);
            if (ring) {
                ring.setAttribute("aria-label", `${visualPercent}% of this clean complete`);
            }
            if (percent) {
                percent.textContent = `${visualPercent}%`;
            }
            if (count) {
                count.textContent = progress.total
                    ? `${progress.complete} / ${progress.total} TASKS`
                    : "NO TASKS YET";
            }
            if (eyebrow) {
                eyebrow.textContent = copy.eyebrow;
            }
            if (live) {
                live.textContent = copy.status;
            }
            if (room) {
                room.textContent = targetName;
            }
            const reactionStillActive = this.companionReactionUntil &&
                this.companionReactionUntil > Date.now();
            if (message && !reactionStillActive) {
                message.textContent = copy.message;
            }
            panel.querySelectorAll("[data-lumi-milestone]").forEach(marker => {
                const milestone = Number(marker.dataset.lumiMilestone || 0);
                marker.classList.toggle("is-lit", visualPercent >= milestone);
            });
            taskScreen?.style.setProperty("--cleaning-session-progress", `${Math.max(0, Math.min(100, visualPercent))}%`);
        },
        reactCleaningCompanion({ task = null, progress, done, groupComplete = false }) {
            const panel = document.getElementById("cleaningCompanionPanel");
            const message = document.getElementById("cleaningCompanionMessage");
            if (!panel || !progress) {
                return;
            }
            this.companionLastProgressAt = Date.now();
            this.companionLastCompleteCount = progress.complete;
            this.companionReactionUntil = Date.now() + (groupComplete ? 2500 : 1900);
            let text = "Task reopened. Lumi adjusted the room progress.";
            let reactionClass = "is-reopening";
            if (done) {
                if (progress.percent >= 100) {
                    text = "Checklist complete ✦ Beautiful work. This reset is being saved to your home’s Cleaning memory.";
                    reactionClass = "is-celebrating";
                }
                else if (groupComplete) {
                    text = "Section complete ✦ One whole part of the home is restored.";
                    reactionClass = "is-section-cheering";
                }
                else {
                    text = task?.title
                        ? `✓ ${task.title} complete. Keep that steady rhythm.`
                        : "Task complete. Lumi is cheering you on.";
                    reactionClass = "is-cheering";
                }
            }
            if (message) {
                message.textContent = text;
            }
            panel.classList.remove("is-cheering", "is-section-cheering", "is-celebrating", "is-reopening", "is-speaking");
            void panel.offsetWidth;
            panel.classList.add(reactionClass);
            if (done && progress.percent < 100 && Math.random() > 0.62) {
                this.waveCleaningCompanion();
            }
            window.clearTimeout(this.cleaningCompanionReactionTimer);
            this.cleaningCompanionReactionTimer = window.setTimeout(() => {
                panel.classList.remove("is-cheering", "is-section-cheering", "is-celebrating", "is-reopening");
                this.companionReactionUntil = 0;
                const active = this.activeSession?.();
                if (active) {
                    this.renderCleaningCompanion(active);
                }
            }, groupComplete ? 2550 : 1950);
        },
        launchTaskCheckBurst(row) {
            if (!row) {
                return;
            }
            row.querySelector(".cleaning-check-burst")?.remove();
            const burst = document.createElement("span");
            burst.className = "cleaning-check-burst";
            burst.setAttribute("aria-hidden", "true");
            for (let index = 0; index < 12; index += 1) {
                const spark = document.createElement("i");
                const angle = (360 / 12) * index;
                const distance = 25 + ((index * 7) % 18);
                spark.style.setProperty("--check-angle", `${angle}deg`);
                spark.style.setProperty("--check-distance", `${distance}px`);
                spark.style.setProperty("--check-delay", `${(index % 3) * 18}ms`);
                burst.appendChild(spark);
            }
            row.appendChild(burst);
            const taskScreen = document.getElementById("cleaningTaskScreen");
            if (taskScreen) {
                taskScreen.classList.remove("is-task-syncing");
                void taskScreen.offsetWidth;
                taskScreen.classList.add("is-task-syncing");
                window.setTimeout(() => taskScreen.classList.remove("is-task-syncing"), 760);
            }
            window.setTimeout(() => burst.remove(), 950);
        },
        launchFullCleaningFireworks(label = "HOME RESET COMPLETE") {
            const now = Date.now();
            if (now - this.lastFullFireworksAt < FIREWORK_COOLDOWN_MS) {
                return;
            }
            this.lastFullFireworksAt = now;
            document.getElementById("cleaningFullFireworks")?.remove();
            const layer = document.createElement("div");
            layer.id = "cleaningFullFireworks";
            layer.className = "cleaning-full-fireworks";
            layer.setAttribute("aria-hidden", "true");
            const positions = [
                [10, 24],
                [25, 14],
                [43, 27],
                [61, 13],
                [78, 23],
                [92, 16],
                [18, 54],
                [50, 48],
                [83, 56]
            ];
            positions.forEach(([x, y], burstIndex) => {
                const burst = document.createElement("span");
                burst.className = "cleaning-firework-burst";
                burst.style.setProperty("--burst-x", `${x}%`);
                burst.style.setProperty("--burst-y", `${y}%`);
                burst.style.setProperty("--burst-delay", `${burstIndex * 105}ms`);
                for (let sparkIndex = 0; sparkIndex < 20; sparkIndex += 1) {
                    const spark = document.createElement("i");
                    const angle = (360 / 20) * sparkIndex + (burstIndex % 2 ? 9 : 0);
                    const distance = 74 + ((sparkIndex * 17 + burstIndex * 11) % 64);
                    spark.style.setProperty("--firework-angle", `${angle}deg`);
                    spark.style.setProperty("--firework-distance", `${distance}px`);
                    spark.style.setProperty("--firework-color", String((sparkIndex + burstIndex) % 5));
                    burst.appendChild(spark);
                }
                layer.appendChild(burst);
            });
            const banner = document.createElement("div");
            banner.className = "cleaning-fireworks-banner";
            const bannerKicker = document.createElement("span");
            bannerKicker.textContent = "✦ HOME OS CLEANING ✦";
            const bannerTitle = document.createElement("strong");
            bannerTitle.textContent = String(label);
            const bannerCopy = document.createElement("small");
            bannerCopy.textContent = "Every task is complete. This reset is now part of your home’s Cleaning memory.";
            banner.append(bannerKicker, bannerTitle, bannerCopy);
            layer.appendChild(banner);
            document.body.appendChild(layer);
            const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
            window.setTimeout(() => layer.remove(), reducedMotion ? 1800 : 4500);
        }
    };
})();
