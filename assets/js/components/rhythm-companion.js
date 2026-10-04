/* ============================================================
   HOMEOS // RHYTHM COMPANION

   Shared companion used by Daily Rhythm and Kids Mode.
   Handles season, actions, speech, reactions and celebrations.
============================================================ */

(() => {
    "use strict";

    window.HomeOS = window.HomeOS || {};
    window.HomeOS.components = window.HomeOS.components || {};

    const companion = {
        processing: null,
        scene: null,
        mounted: false,
        currentSeason: null,
        talkMessages: [],
        talkIndex: 0,
        snapshot: null,
        actionTimer: null,
        speechTimer: null,
        speechHideTimer: null,
        reactionTimer: null,
        scheduledSleeping: false,
        lastRender: null,
        ambientWaveTimer: null,
        ambientDanceTimer: null,
        ambientStarted: false,
        taskSecretTimer: null,
        styleStorageKey: "homeos.rhythmCompanionStyle",

        // --- Season + state ---

        // Match the companion season to the current calendar month.
        seasonForDate(date = new Date()) {
            const month = date.getMonth();

            if (month >= 2 && month <= 4) return "spring";
            if (month >= 5 && month <= 7) return "summer";
            if (month >= 8 && month <= 10) return "fall";

            return "winter";
        },

        // Return the display label used in the companion season chip.
        seasonLabel(season) {
            const labels = {
                spring: "SPRING",
                summer: "SUMMER",
                fall: "FALL",
                winter: "WINTER"
            };

            return labels[season] || "SEASON";
        },

        // Choose the visual health state from shift progress and time of day.
        healthForRender({
            currentShift,
            openingCompleted,
            openingTotal,
            closingCompleted,
            closingTotal,
            isSleeping
        }) {
            if (isSleeping) return "sleeping";

            const now = new Date();
            const currentMinutes = (now.getHours() * 60) + now.getMinutes();

            if (currentShift === "opening") {
                if (!openingTotal) return "healthy";

                const percent = Math.round((openingCompleted / openingTotal) * 100);

                if (percent >= 100) return "glowing";
                if (percent >= 75) return "healthy";
                if (percent >= 45) return "recovering";
                if (percent >= 15) return "struggling";

                return "dry";
            }

            if (!closingTotal) return "healthy";

            const percent = Math.round((closingCompleted / closingTotal) * 100);

            if (percent >= 100) return "glowing";
            if (percent >= 75) return "healthy";
            if (percent >= 45) return "recovering";
            if (percent >= 20) return "struggling";

            // Closing becomes the active need in the evening and slowly declines
            // when no Closing work has been completed.
            if (currentMinutes < 18 * 60) return "healthy";
            if (currentMinutes < 19.5 * 60) return "recovering";
            if (currentMinutes < 21 * 60) return "struggling";

            return "dry";
        },

        // Return the SVG used by a companion action button.
        icon(name) {
            const icons = {
                talk: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14v10H10l-4 3v-3H5z"/><path d="M8 9h8M8 12h5"/></svg>',
                wave: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 11V6.8a1.4 1.4 0 0 1 2.8 0V10M11.3 10V5.8a1.4 1.4 0 0 1 2.8 0v4.5M14.1 10.3V7a1.4 1.4 0 0 1 2.8 0v4.8M16.9 11.8V9.6a1.4 1.4 0 0 1 2.8 0v4.1c0 4.1-2.7 6.8-6.7 6.8-3.4 0-5.5-1.8-6.8-4.2L4.7 13.8a1.4 1.4 0 0 1 2.4-1.4L8.5 14"/></svg>',
                dance: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="14" cy="4" r="2"/><path d="M12.8 7.2 10 11l-3.7 1.2M13 7.5l3.5 3 3.2.4M12 11.2l1 4.1-3.1 4.4M13 15.2l4.2 3.8"/></svg>',
                drink: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6h10l-1 14H8zM10 3h7M15 3l-1 4"/></svg>',
                feed: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="7" cy="7" rx="3.3" ry="4.2"/><path d="M9.7 9.5 19 20"/></svg>',
                juggle: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="12" cy="4" r="2.2"/><path d="M7 11c1.2 5 8.8 5 10 0"/></svg>',
                rest: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17h12M8 14h5l-5 4h5M14 9h4l-4 3h4"/></svg>',
                style: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="12" r="3.4"/><circle cx="16" cy="12" r="3.4"/><path d="M11.4 12h1.2M4.6 11 3 9.7M19.4 11 21 9.7"/></svg>'
            };

            return icons[name] || "";
        },

        // --- Mount + controls ---

        // Build the companion UI once and start its interactive sketch.
        mount() {
            const mount = document.getElementById("rhythmCompanionMount");
            if (!mount || this.mounted) return;

            mount.innerHTML = `
                <div class="rhythm-companion-shell">
                    <div class="rhythm-companion-topline">
                        <span class="rhythm-season-chip" id="rhythmCompanionSeason">SEASON · AUTO</span>
                        <span class="rhythm-live-chip"><i></i> LIVE</span>
                    </div>

                    <div
                        class="rhythm-companion-speech"
                        id="rhythmCompanionSpeech"
                        hidden
                        aria-live="polite"
                    >
                        <span>HOME OS</span>
                        <strong id="rhythmCompanionSpeechText">
                            I'm checking what still needs to be done.
                        </strong>
                    </div>

                    <div class="rhythm-canvas-frame" id="rhythmCanvasFrame">
                        <canvas
                            id="rhythmCompanionCanvas"
                            width="600"
                            height="600"
                            tabindex="0"
                            aria-label="Interactive HOME OS rhythm companion"
                        ></canvas>
                    </div>

                    <div
                        class="rhythm-reaction-chip"
                        id="rhythmCompanionReaction"
                        aria-live="polite"
                    ></div>

                    <div
                        class="rhythm-celebration-layer"
                        id="rhythmCompanionConfetti"
                        aria-hidden="true"
                    ></div>

                    <div
                        class="rhythm-petal-layer"
                        id="rhythmCompanionPetals"
                        aria-hidden="true"
                    ></div>

                    <div
                        class="rhythm-sparkle-layer"
                        id="rhythmCompanionSparkles"
                        aria-hidden="true"
                    ></div>

                    <div
                        class="rhythm-action-dock rhythm-action-dock-compact"
                        aria-label="Companion actions"
                    >
                        <button
                            class="rhythm-action-button rhythm-action-primary"
                            type="button"
                            data-companion-action="talk"
                        >
                            <span class="rhythm-action-icon">
                                ${this.icon("talk")}
                            </span>

                            <span class="rhythm-action-copy">
                                <strong>Talk</strong>
                                <small>What needs care?</small>
                            </span>
                        </button>

                        <button
                            class="rhythm-action-button"
                            type="button"
                            data-companion-action="dance"
                        >
                            <span class="rhythm-action-icon">
                                ${this.icon("dance")}
                            </span>

                            <span class="rhythm-action-copy">
                                <strong>Dance</strong>
                                <small>Dance with him</small>
                            </span>
                        </button>

                        <button
                            class="rhythm-action-button"
                            type="button"
                            data-companion-action="style"
                        >
                            <span class="rhythm-action-icon">
                                ${this.icon("style")}
                            </span>

                            <span class="rhythm-action-copy">
                                <strong>Style</strong>
                                <small>Change his look</small>
                            </span>
                        </button>
                    </div>

                    <div
                        class="rhythm-option-panel"
                        id="rhythmStylePanel"
                        hidden
                    >
                        <span>LOOK</span>
                        <button type="button" data-companion-style="none">Natural</button>
                        <button type="button" data-companion-style="love">Love</button>
                        <button type="button" data-companion-style="star">Star</button>
                        <button type="button" data-companion-style="potter">Round</button>
                        <button type="button" data-companion-style="pixel">Pixel</button>
                        <button type="button" data-companion-style="pirate">Pirate</button>
                        <button type="button" data-companion-style="ninja">Ninja</button>
                    </div>
                </div>
            `;

            this.mounted = true;
            this.bindInteractions();
            this.startSketch();
        },

        // Start the Processing sketch and restore the saved companion style.
        startSketch() {
            const canvas = document.getElementById("rhythmCompanionCanvas");
            if (!canvas) return;

            if (!window.Processing || !window.HomeOSGrootSketchProc) {
                const frame = document.getElementById("rhythmCanvasFrame");

                frame?.classList.add("is-unavailable");

                this.showSpeech(
                    "The interactive companion could not start. Refresh once if your connection just came back.",
                    7000
                );

                return;
            }

            if (this.processing) return;

            this.processing = new window.Processing(
                canvas,
                window.HomeOSGrootSketchProc
            );

            this.scene = this.processing.__homeosScene || null;

            this.bindCanvasPointerTracking(canvas);

            const savedStyle =
                localStorage.getItem(
                    this.styleStorageKey || "homeos.rhythmCompanionStyle"
                ) || "none";

            this.setStyle(savedStyle, false);
            this.applyAutomaticSeason();
            this.startAutonomousBehavior();

            // Keep the source sketch's click effect when the character is clicked.
            canvas.addEventListener("click", () => {
                const frame = document.getElementById("rhythmCanvasFrame");

                frame?.classList.add("is-clicked");

                window.setTimeout(
                    () => frame?.classList.remove("is-clicked"),
                    450
                );
            });
        },

        // Send pointer position into the sketch so the companion can react to it.
        bindCanvasPointerTracking(canvas) {
            if (
                !canvas ||
                canvas.dataset.homeosPointerBound === "true"
            ) {
                return;
            }

            const update = event => {
                if (!this.scene) return;

                const rect = canvas.getBoundingClientRect();

                if (!rect.width || !rect.height) return;

                const x = Math.max(
                    0,
                    Math.min(
                        600,
                        ((event.clientX - rect.left) / rect.width) * 600
                    )
                );

                const y = Math.max(
                    0,
                    Math.min(
                        600,
                        ((event.clientY - rect.top) / rect.height) * 600
                    )
                );

                this.scene.homeosPointer = {
                    over: true,
                    x,
                    y
                };

                this.scene.over = true;

                if (this.scene.idle && this.processing?.millis) {
                    this.scene.idle.time = this.processing.millis();
                }
            };

            canvas.addEventListener(
                "pointermove",
                update,
                { passive: true }
            );

            canvas.addEventListener(
                "pointerenter",
                update,
                { passive: true }
            );

            canvas.addEventListener(
                "pointerleave",
                () => {
                    if (!this.scene) return;

                    this.scene.homeosPointer = {
                        ...(this.scene.homeosPointer || {
                            x: 300,
                            y: 300
                        }),
                        over: false
                    };

                    this.scene.over = false;
                },
                { passive: true }
            );

            canvas.dataset.homeosPointerBound = "true";
        },

        // Bind the Talk, Dance and Style controls once.
        bindInteractions() {
            const mount = document.getElementById("rhythmCompanionMount");

            if (
                !mount ||
                mount.dataset.bound === "true"
            ) {
                return;
            }

            mount.addEventListener("click", event => {
                const actionButton =
                    event.target.closest("[data-companion-action]");

                if (actionButton) {
                    this.handleAction(
                        actionButton.dataset.companionAction
                    );

                    return;
                }

                const styleButton =
                    event.target.closest("[data-companion-style]");

                if (styleButton) {
                    this.setStyle(
                        styleButton.dataset.companionStyle || "none"
                    );

                    document.getElementById(
                        "rhythmStylePanel"
                    ).hidden = true;
                }
            });

            mount.dataset.bound = "true";
        },

        // Route a clicked companion control to its action.
        handleAction(action) {
            if (action === "talk") {
                return this.talk();
            }

            if (action === "dance") {
                return this.playAction("dance", 3400);
            }

            if (action === "style") {
                return this.togglePanel("rhythmStylePanel");
            }
        },

        // Open or close one companion option panel.
        togglePanel(id) {
            const panel = document.getElementById(id);
            if (!panel) return;

            panel.hidden = !panel.hidden;
        },

        // --- Automatic buddy behavior ---

        // Return a random delay between the supplied minimum and maximum.
        randomDelay(minMs, maxMs) {
            const min = Math.max(
                0,
                Number(minMs) || 0
            );

            const max = Math.max(
                min,
                Number(maxMs) || min
            );

            return Math.round(
                min + (Math.random() * (max - min))
            );
        },

        // Check whether the companion is available for an automatic action.
        companionIsIdle() {
            if (
                !this.scene ||
                this.scheduledSleeping
            ) {
                return false;
            }

            if (
                document.visibilityState &&
                document.visibilityState !== "visible"
            ) {
                return false;
            }

            return (
                this.scene.groot?.action === "idle" &&
                !this.scene.action?.active
            );
        },

        // Allow ambient dancing only when the home has enough completed care.
        isHappyEnoughForAmbientDance() {
            if (
                !this.lastRender ||
                this.lastRender.isSleeping
            ) {
                return false;
            }

            const care = Math.max(
                0,
                Math.min(
                    100,
                    Number(this.lastRender.overallPercent) || 0
                )
            );

            return care >= 50;
        },

        // Start the companion's occasional automatic wave and dance behavior.
        startAutonomousBehavior() {
            if (this.ambientStarted) return;

            this.ambientStarted = true;

            this.scheduleAmbientWave(true);
            this.scheduleAmbientDance(true);
        },

        // Schedule an occasional wave while the companion is idle.
        scheduleAmbientWave(initial = false) {
            window.clearTimeout(
                this.ambientWaveTimer
            );

            const delay = initial
                ? this.randomDelay(22000, 48000)
                : this.randomDelay(45000, 105000);

            this.ambientWaveTimer = window.setTimeout(() => {
                if (this.companionIsIdle()) {
                    this.setSourceAction(
                        "wave",
                        { duration: 2300 }
                    );
                }

                this.scheduleAmbientWave(false);
            }, delay);
        },

        // Schedule an occasional dance after enough daily care is complete.
        scheduleAmbientDance(initial = false) {
            window.clearTimeout(
                this.ambientDanceTimer
            );

            const delay = initial
                ? this.randomDelay(70000, 125000)
                : this.randomDelay(120000, 240000);

            this.ambientDanceTimer = window.setTimeout(() => {
                if (
                    this.isHappyEnoughForAmbientDance() &&
                    this.companionIsIdle()
                ) {
                    this.setSourceAction(
                        "dance",
                        { duration: 3200 }
                    );
                }

                this.scheduleAmbientDance(false);
            }, delay);
        },

        // Retry a callback until the companion is idle or retries run out.
        runWhenIdle(
            callback,
            {
                delay = 350,
                retries = 8
            } = {}
        ) {
            const attempt = remaining => {
                if (this.scheduledSleeping) return;

                if (this.companionIsIdle()) {
                    callback();
                    return;
                }

                if (remaining <= 0) return;

                window.setTimeout(
                    () => attempt(remaining - 1),
                    700
                );
            };

            window.setTimeout(
                () => attempt(retries),
                Math.max(0, delay)
            );
        },

        // Send an action into the sketch and return to idle afterward.
        setSourceAction(
            action,
            {
                persistent = false,
                duration = 3000
            } = {}
        ) {
            if (!this.scene) return;

            if (
                this.scheduledSleeping &&
                action !== "sleep"
            ) {
                return;
            }

            this.scene.groot.action = action;
            this.scene.action.active = action !== "idle";
            this.scene.action.timer =
                action === "idle" ? 0 : 240;

            this.scene.talkTimer = 50;
            this.scene.updateActionButtons?.();

            window.clearTimeout(
                this.actionTimer
            );

            if (
                !persistent &&
                action !== "idle"
            ) {
                this.actionTimer = window.setTimeout(() => {
                    if (
                        !this.scene ||
                        this.scheduledSleeping
                    ) {
                        return;
                    }

                    this.scene.groot.action = "idle";
                    this.scene.action.active = false;
                    this.scene.action.timer = 0;
                    this.scene.updateActionButtons?.();
                }, duration);
            }
        },

        // Play a visible companion action and show its matching message.
        playAction(action, duration) {
            this.setSourceAction(
                action,
                { duration }
            );

            if (action === "wave") {
                this.showSpeech(
                    "Hi. I'm right here with today's rhythm.",
                    3200
                );
            }

            if (action === "dance") {
                this.showSpeech(
                    "Tiny dance break. Then we'll keep going.",
                    3600
                );
            }
        },

        // Trigger the companion's drink animation.
        drink({ announce = true } = {}) {
            if (
                !this.scene ||
                this.scheduledSleeping
            ) {
                return;
            }

            this.scene.cup.x =
                -this.scene.cup.w;

            this.scene.cup.color =
                this.scene.cup.colors[
                    Math.floor(
                        Math.random() *
                        this.scene.cup.colors.length
                    )
                ];

            this.setSourceAction(
                "drink",
                { duration: 4300 }
            );

            if (announce) {
                this.showSpeech(
                    "Hydration break. Then we're back to the rhythm.",
                    3500
                );
            }
        },

        // Trigger one of the sketch's juggling variations.
        playJuggle(
            type = 0,
            { announce = true } = {}
        ) {
            if (
                !this.scene ||
                this.scheduledSleeping
            ) {
                return;
            }

            if (
                this.scene.groot.action !== "juggle"
            ) {
                this.scene.setBalls?.();
            }

            this.scene.ball.type =
                Number.isFinite(type)
                    ? type
                    : 0;

            this.setSourceAction(
                "juggle",
                { duration: 6200 }
            );

            if (announce) {
                const names = {
                    0: "balls",
                    1: "knives",
                    2: "stars",
                    3: "cards",
                    4: "penguins"
                };

                this.showSpeech(
                    `Okay — ${names[type] || "balls"}. Watch this.`,
                    3000
                );
            }
        },

        // Give a completed task a small random companion celebration.
        celebrateTaskCompletion(type = "sun") {
            if (
                !this.scene ||
                this.scheduledSleeping
            ) {
                return;
            }

            window.clearTimeout(
                this.taskSecretTimer
            );

            this.taskSecretTimer = window.setTimeout(() => {
                if (!this.companionIsIdle()) {
                    this.runWhenIdle(
                        () => this.celebrateTaskCompletion(type),
                        {
                            delay: 250,
                            retries: 5
                        }
                    );

                    return;
                }

                const roll = Math.random();

                if (roll < 0.46) {
                    const pool =
                        this.currentSeason === "winter"
                            ? [4, 0, 2, 3]
                            : [0, 2, 3, 4];

                    const juggleType =
                        pool[
                            Math.floor(
                                Math.random() *
                                pool.length
                            )
                        ];

                    this.playJuggle(
                        juggleType,
                        { announce: false }
                    );

                    this.showMilestone(
                        "NICE WORK ✦"
                    );

                    return;
                }

                if (roll < 0.78) {
                    this.drink({
                        announce: false
                    });

                    this.showMilestone(
                        type === "water"
                            ? "A LITTLE VICTORY SIP 💧"
                            : "CELEBRATION SIP 💧"
                    );

                    return;
                }

                this.setSourceAction(
                    "wave",
                    { duration: 2300 }
                );

                this.showMilestone(
                    "TASK COMPLETE ✓"
                );
            }, this.randomDelay(550, 1100));
        },

        // Celebrate completion of a room or area with a milestone and juggle.
        celebrateArea(label = "Area") {
            window.clearTimeout(
                this.taskSecretTimer
            );

            this.showMilestone(
                `⌂ ${String(label).toUpperCase()} COMPLETE`
            );

            const pool =
                this.currentSeason === "winter"
                    ? [4, 0, 2, 3]
                    : [0, 2, 3, 4];

            const type =
                pool[
                    Math.floor(
                        Math.random() *
                        pool.length
                    )
                ];

            this.runWhenIdle(
                () => this.playJuggle(
                    type,
                    { announce: false }
                ),
                {
                    delay: 650,
                    retries: 10
                }
            );
        },

        // --- Style + season ---

        // Change the localStorage key used for this companion's saved style.
        setStyleStorageKey(
            key = "homeos.rhythmCompanionStyle",
            { reload = true } = {}
        ) {
            const nextKey =
                String(
                    key ||
                    "homeos.rhythmCompanionStyle"
                ).trim() ||
                "homeos.rhythmCompanionStyle";

            const changed =
                this.styleStorageKey !== nextKey;

            this.styleStorageKey = nextKey;

            if (
                reload &&
                changed &&
                this.scene
            ) {
                const saved =
                    localStorage.getItem(
                        this.styleStorageKey
                    ) || "none";

                this.setStyle(
                    saved,
                    false
                );
            }

            return this.styleStorageKey;
        },

        // Apply a companion look and optionally save it for the next visit.
        setStyle(
            style = "none",
            persist = true
        ) {
            const allowed = new Set([
                "none",
                "love",
                "star",
                "potter",
                "pixel",
                "pirate",
                "ninja"
            ]);

            const value =
                allowed.has(style)
                    ? style
                    : "none";

            if (this.scene) {
                this.scene.groot.character =
                    value;
            }

            if (persist) {
                localStorage.setItem(
                    this.styleStorageKey ||
                    "homeos.rhythmCompanionStyle",
                    value
                );
            }

            document
                .querySelectorAll(
                    "[data-companion-style]"
                )
                .forEach(button => {
                    button.classList.toggle(
                        "is-selected",
                        button.dataset.companionStyle === value
                    );
                });
        },

        // Apply the current season to the sketch, card and season chip.
        applyAutomaticSeason() {
            if (!this.scene) return;

            const season =
                this.seasonForDate(
                    new Date()
                );

            if (
                this.currentSeason === season
            ) {
                return;
            }

            this.currentSeason = season;

            this.scene.theme =
                this.scene.themes[season];

            this.scene.groot.theme =
                this.scene.groot.themes[season];

            this.scene.updateThemeButtons?.(
                season
            );

            const chip =
                document.getElementById(
                    "rhythmCompanionSeason"
                );

            if (chip) {
                chip.textContent =
                    `${this.seasonLabel(season)} · AUTO`;
            }

            const card =
                document.getElementById(
                    "rhythmCompanionCard"
                );

            if (card) {
                card.dataset.season = season;
            }
        },

        // --- Talk + page state ---

        // Build the short words shown inside the sketch during Talk.
        talkCanvasWords() {
            const data = this.lastRender;

            if (!data) {
                return [
                    "HOME",
                    "OS",
                    "READY"
                ];
            }

            if (data.isSleeping) {
                return [
                    "REST",
                    "FOR",
                    "TONIGHT"
                ];
            }

            if (
                data.overallPercent >= 100
            ) {
                return [
                    "ALL",
                    "DONE",
                    "TODAY"
                ];
            }

            const remaining =
                data.currentShift === "opening"
                    ? Math.max(
                        0,
                        data.openingTotal -
                        data.openingCompleted
                    )
                    : Math.max(
                        0,
                        data.closingTotal -
                        data.closingCompleted
                    );

            if (remaining) {
                return [
                    String(remaining),
                    data.currentShift === "opening"
                        ? "OPENING"
                        : "CLOSING",
                    "LEFT"
                ];
            }

            return [
                "SHIFT",
                "IS",
                "DONE"
            ];
        },

        // Speak the next message and update the words inside the sketch.
        talk() {
            if (!this.scene) return;

            if (this.scheduledSleeping) {
                this.showSpeech(
                    "We're done for tonight. I'll see you in the morning.",
                    4200
                );

                return;
            }

            const messages =
                this.talkMessages.filter(Boolean);

            const message =
                messages.length
                    ? messages[
                        this.talkIndex %
                        messages.length
                    ]
                    : "I'm checking what still needs to be done.";

            this.talkIndex =
                (this.talkIndex + 1) %
                Math.max(
                    messages.length,
                    1
                );

            const words =
                this.talkCanvasWords();

            words.forEach(
                (word, index) => {
                    if (
                        !this.scene.words[index]
                    ) {
                        return;
                    }

                    this.scene.words[index].content =
                        word;

                    this.scene.words[index].active =
                        false;

                    this.scene.words[index].opacity =
                        0;

                    this.scene.words[index].dir =
                        1;
                }
            );

            this.setSourceAction(
                "talk",
                { duration: 6200 }
            );

            this.showSpeech(
                message,
                6200
            );
        },

        // Show a temporary speech bubble without letting an old timer hide it.
        showSpeech(
            message,
            duration = 4500
        ) {
            const bubble =
                document.getElementById(
                    "rhythmCompanionSpeech"
                );

            const text =
                document.getElementById(
                    "rhythmCompanionSpeechText"
                );

            if (
                !bubble ||
                !text
            ) {
                return;
            }

            window.clearTimeout(
                this.speechTimer
            );

            window.clearTimeout(
                this.speechHideTimer
            );

            text.textContent = message;

            bubble.hidden = false;
            bubble.classList.remove(
                "is-visible"
            );

            void bubble.offsetWidth;

            bubble.classList.add(
                "is-visible"
            );

            this.speechTimer =
                window.setTimeout(() => {
                    bubble.classList.remove(
                        "is-visible"
                    );

                    this.speechHideTimer =
                        window.setTimeout(() => {
                            bubble.hidden = true;
                        }, 220);
                }, duration);
        },

        // Sync the companion UI with the latest Daily or Kids Mode state.
        renderCompanion({
            overallPercent = 0,
            totalTasks = 0,
            openingCompleted = 0,
            openingTotal = 0,
            closingCompleted = 0,
            closingTotal = 0,
            isSleeping = false,
            currentShift = "opening",
            rhythmPhase = "day",
            stateTitle = "Your rhythm companion is ready.",
            stateMessage = "HOME OS is checking what still needs care.",
            nextLittleWin = "Choose one small task.",
            scheduleSummary = "",
            talkMessages = []
        } = {}) {
            this.mount();

            const card =
                document.getElementById(
                    "rhythmCompanionCard"
                );

            if (!card) return;

            this.applyAutomaticSeason();

            const health =
                this.healthForRender({
                    currentShift,
                    openingCompleted,
                    openingTotal,
                    closingCompleted,
                    closingTotal,
                    isSleeping
                });

            const openingComplete =
                openingTotal > 0 &&
                openingCompleted >= openingTotal;

            const closingComplete =
                closingTotal > 0 &&
                closingCompleted >= closingTotal;

            const activeShiftComplete =
                currentShift === "opening"
                    ? openingComplete
                    : closingComplete;

            card.dataset.health =
                health;

            card.dataset.sleeping =
                isSleeping
                    ? "true"
                    : "false";

            card.dataset.rhythmPhase =
                isSleeping
                    ? "sleeping"
                    : rhythmPhase;

            card.dataset.shift =
                currentShift;

            card.dataset.bloom =
                activeShiftComplete
                    ? "true"
                    : "false";

            card.dataset.fullDay =
                Number(overallPercent) >= 100
                    ? "true"
                    : "false";

            this.lastRender = {
                overallPercent,
                totalTasks,
                openingCompleted,
                openingTotal,
                closingCompleted,
                closingTotal,
                isSleeping,
                currentShift
            };

            this.talkMessages =
                Array.isArray(talkMessages)
                    ? talkMessages
                    : [];

            this.setText(
                "rhythmCompanionStatePill",
                isSleeping
                    ? "SLEEPING"
                    : activeShiftComplete
                        ? "IN BLOOM"
                        : health.toUpperCase()
            );

            this.setText(
                "rhythmCompanionName",
                stateTitle
            );

            this.setText(
                "rhythmCompanionMessage",
                stateMessage
            );

            this.setText(
                "rhythmCompanionGoal",
                nextLittleWin
            );

            this.setText(
                "rhythmCompanionCare",
                `${Math.max(
                    0,
                    Math.min(
                        100,
                        Math.round(
                            Number(overallPercent) || 0
                        )
                    )
                )}%`
            );

            this.setText(
                "rhythmCompanionSun",
                openingCompleted
            );

            this.setText(
                "rhythmCompanionSunTotal",
                `/ ${openingTotal}`
            );

            this.setText(
                "rhythmCompanionWater",
                closingCompleted
            );

            this.setText(
                "rhythmCompanionWaterTotal",
                `/ ${closingTotal}`
            );

            this.setText(
                "rhythmScheduleSummary",
                scheduleSummary
            );

            const careBar =
                document.getElementById(
                    "rhythmCompanionCareBar"
                );

            if (careBar) {
                careBar.style.width =
                    `${Math.max(
                        0,
                        Math.min(
                            100,
                            Number(overallPercent) || 0
                        )
                    )}%`;
            }

            if (this.scene) {
                this.scene.homeosBloom =
                    activeShiftComplete;

                this.scene.homeosHealth =
                    health;

                this.scene.homeosScheduleSleeping =
                    isSleeping;

                if (
                    isSleeping &&
                    !this.scheduledSleeping
                ) {
                    this.scheduledSleeping = true;

                    this.setSourceAction(
                        "sleep",
                        { persistent: true }
                    );
                } else if (
                    !isSleeping &&
                    this.scheduledSleeping
                ) {
                    this.scheduledSleeping = false;

                    this.setSourceAction(
                        "idle",
                        { persistent: true }
                    );
                }
            }

            const nextSnapshot = {
                overallPercent:
                    Number(overallPercent) || 0,
                openingComplete,
                closingComplete
            };

            if (this.snapshot) {
                const fullDayBecameComplete =
                    this.snapshot.overallPercent < 100 &&
                    nextSnapshot.overallPercent >= 100;

                if (fullDayBecameComplete) {
                    this.celebrateFullDay();
                } else {
                    if (
                        !this.snapshot.openingComplete &&
                        openingComplete
                    ) {
                        this.celebrateShift(
                            "opening"
                        );
                    }

                    if (
                        !this.snapshot.closingComplete &&
                        closingComplete
                    ) {
                        this.celebrateShift(
                            "closing"
                        );
                    }
                }
            }

            this.snapshot =
                nextSnapshot;
        },

        // --- Reactions + celebrations ---

        // Show the sunlight or water reaction after a completed task.
        reactToTask(type = "sun") {
            const chip =
                document.getElementById(
                    "rhythmCompanionReaction"
                );

            if (!chip) return;

            const sunlight =
                type !== "water";

            chip.textContent =
                sunlight
                    ? "+ SUNLIGHT"
                    : "+ WATER";

            chip.classList.remove(
                "is-visible"
            );

            void chip.offsetWidth;

            chip.classList.add(
                "is-visible"
            );

            this.celebrateTaskCompletion(
                type
            );

            window.clearTimeout(
                this.reactionTimer
            );

            this.reactionTimer =
                window.setTimeout(
                    () =>
                        chip.classList.remove(
                            "is-visible"
                        ),
                    1500
                );
        },

        // Show a short milestone message in the reaction chip.
        showMilestone(
            text = "NICE WORK"
        ) {
            const chip =
                document.getElementById(
                    "rhythmCompanionReaction"
                );

            if (!chip) return;

            chip.textContent = text;

            chip.classList.remove(
                "is-visible"
            );

            void chip.offsetWidth;

            chip.classList.add(
                "is-visible"
            );

            window.clearTimeout(
                this.reactionTimer
            );

            this.reactionTimer =
                window.setTimeout(
                    () =>
                        chip.classList.remove(
                            "is-visible"
                        ),
                    1900
                );
        },

        // Celebrate completion of the Opening or Closing shift.
        celebrateShift(
            shift = "opening"
        ) {
            window.clearTimeout(
                this.taskSecretTimer
            );

            this.populateConfetti(
                34,
                125
            );

            const text =
                shift === "opening"
                    ? "Opening complete. I have all my sunshine — look at my flowers."
                    : "Closing complete. I'm watered, blooming, and ready for the night.";

            this.showSpeech(
                text,
                4700
            );

            if (!this.scheduledSleeping) {
                this.playAction(
                    "dance",
                    2800
                );
            }
        },

        // Celebrate when every task for the day is complete.
        celebrateFullDay() {
            window.clearTimeout(
                this.taskSecretTimer
            );

            this.populateConfetti(
                52,
                175
            );

            this.populatePetals(26);
            this.populateSparkles(30);

            this.showSpeech(
                "Everything is complete. Nothing else needs to be done today — we did it.",
                6000
            );

            if (!this.scheduledSleeping) {
                this.playAction(
                    "dance",
                    4200
                );
            }
        },

        // Create a temporary burst of confetti around the companion.
        populateConfetti(
            count = 34,
            spread = 125
        ) {
            const host =
                document.getElementById(
                    "rhythmCompanionConfetti"
                );

            if (!host) return;

            host.replaceChildren();

            for (
                let i = 0;
                i < count;
                i += 1
            ) {
                const angle =
                    ((Math.PI * 2) / count) * i;

                const distance =
                    90 + ((i * 23) % spread);

                const piece =
                    document.createElement("i");

                piece.style.setProperty(
                    "--x",
                    `${Math.cos(angle) * distance}px`
                );

                piece.style.setProperty(
                    "--y",
                    `${Math.sin(angle) * distance * 0.68 - 30}px`
                );

                piece.style.setProperty(
                    "--r",
                    `${220 + ((i * 67) % 480)}deg`
                );

                piece.style.setProperty(
                    "--d",
                    `${(i % 7) * 18}ms`
                );

                host.appendChild(piece);
            }

            window.setTimeout(
                () => host.replaceChildren(),
                2200
            );
        },

        // Create a temporary burst of flower petals.
        populatePetals(
            count = 20
        ) {
            const host =
                document.getElementById(
                    "rhythmCompanionPetals"
                );

            if (!host) return;

            host.replaceChildren();

            for (
                let i = 0;
                i < count;
                i += 1
            ) {
                const angle =
                    ((Math.PI * 2) / count) *
                    i +
                    0.2;

                const distance =
                    80 + ((i * 19) % 130);

                const petal =
                    document.createElement("i");

                petal.style.setProperty(
                    "--x",
                    `${Math.cos(angle) * distance}px`
                );

                petal.style.setProperty(
                    "--y",
                    `${Math.sin(angle) * distance * 0.72 - 20}px`
                );

                petal.style.setProperty(
                    "--r",
                    `${160 + ((i * 71) % 420)}deg`
                );

                petal.style.setProperty(
                    "--d",
                    `${(i % 6) * 25}ms`
                );

                host.appendChild(petal);
            }

            window.setTimeout(
                () => host.replaceChildren(),
                2300
            );
        },

        // Create a temporary burst of sparkles.
        populateSparkles(
            count = 24
        ) {
            const host =
                document.getElementById(
                    "rhythmCompanionSparkles"
                );

            if (!host) return;

            host.replaceChildren();

            for (
                let i = 0;
                i < count;
                i += 1
            ) {
                const angle =
                    ((Math.PI * 2) / count) * i;

                const distance =
                    65 + ((i * 17) % 115);

                const sparkle =
                    document.createElement("b");

                sparkle.style.setProperty(
                    "--x",
                    `${Math.cos(angle) * distance}px`
                );

                sparkle.style.setProperty(
                    "--y",
                    `${Math.sin(angle) * distance}px`
                );

                sparkle.style.setProperty(
                    "--d",
                    `${(i % 5) * 24}ms`
                );

                host.appendChild(sparkle);
            }

            window.setTimeout(
                () => host.replaceChildren(),
                1700
            );
        },

        // Safely update one companion text element when it exists.
        setText(id, value) {
            const element =
                document.getElementById(id);

            if (!element) return;

            element.textContent =
                value == null
                    ? ""
                    : String(value);
        }
    };

    window.HomeOS.components.rhythmCompanion =
        companion;
})();