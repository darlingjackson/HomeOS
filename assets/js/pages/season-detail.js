/* ============================================================
   HOMEOS // SEASON DETAIL

   Shared controller for the four seasonal detail pages.
============================================================ */

(() => {
    "use strict";
    const CONFIG = {
        spring: {
            pageName: "Spring Renewal",
            systemKicker: "SPRING HOME CARE // RENEWAL CYCLE ONLINE",
            headline: 'Let the home<br>feel <em>new again.</em>',
            heroMessage: "Refresh, release and reset the home after winter.",
            guideLabel: "SPRING GUIDE // ACTIVE",
            guideMessage: "HomeOS is reading your Spring Renewal.",
            guideAction: "CONTINUE SPRING RENEWAL →",
            cycleLabel: "SPRING CYCLE",
            cycleWindowLabel: "HOMEOS SPRING WINDOW",
            cycleWindow: "MAR 01 — MAY 31",
            cycleRule: "Every room uses a Core Deep Reset first. Spring then adds decluttering, lighter textiles, fresh-air preparation and warm-weather transitions.",
            shoppingMetric: "SPRING SHOPPING",
            progressMetric: "SPRING RENEWAL",
            designLabel: "SPRING DESIGN CODE",
            designCopy: "Fresh air. Soft petals. New growth. Clear spaces.",
            palette: [
                ["BLOSSOM", "#f6c9d9"],
                ["MINT", "#8fcab7"],
                ["DEW", "#b9dedf"],
                ["LILAC", "#eee7f5"],
                ["SAGE", "#a8ba8d"],
                ["IVORY", "#fffaf4"]
            ],
            topologyLabel: "SPRING RESET // CLEAN BY ROOM",
            topologyCopy: "Choose one real room at a time. Every room receives a detailed Core Deep Reset, then Spring adds only the fresh-air, lighter-textile and warm-weather transitions that make this season different.",
            workspaceNote: "Open one room protocol at a time. Finish the Core Deep Reset first; the Spring Layer is the seasonal transition that follows.",
            ruleLabel: "SPRING RULE",
            ruleTitle: "Release first. Clean deeply. Bring back only what belongs.",
            ruleCopy: "Spring is the season to remove buildup—physical and visual—before adding fresh textiles, greenery or seasonal decor.",
            shoppingKicker: "SPRING STYLING // SHARED HOMEOS SHOPPING",
            shoppingHeading: "Bring back only what makes the home lighter.",
            shoppingCopy: "Add lighter linens, storage solutions, curtains, organizers, outdoor-prep supplies and Spring decor. Everything joins the shared HomeOS Shopping List.",
            shoppingEntryTitle: "Spring Home + Renewal",
            shoppingEntryCopy: "Think fresh ivory, blossom pink, sage, soft greenery, glass, woven textures and only the organization the reset proves you need.",
            shoppingPlaceholder: "Example: Soft sage linen pillow covers",
            plannedLabel: "SPRING RENEWAL // PLANNED",
            plannedTitle: "Current Spring List",
            completionLabel: "HOME MEMORY // SPRING CYCLE",
            completionTitle: "Close the Spring Renewal.",
            completionMessage: "Finish the Spring Renewal checklist before completing this cycle.",
            completionButton: "Complete Spring Renewal",
            mascot: "assets/images/branding/spring-mascot.png",
            mascotAlt: "HomeOS Spring mascot"
        },
        summer: {
            pageName: "Summer Reset",
            systemKicker: "SUMMER HOME CARE // SUN CYCLE ONLINE",
            headline: 'Let the home<br>breathe <em>summer.</em>',
            heroMessage: "Keep the home light, functional and ready for summer living.",
            guideLabel: "SUMMER GUIDE // ACTIVE",
            guideMessage: "HomeOS is reading your Summer Reset.",
            guideAction: "CONTINUE SUMMER RESET →",
            cycleLabel: "SUMMER CYCLE",
            cycleWindowLabel: "HOMEOS SUMMER WINDOW",
            cycleWindow: "JUN 01 — AUG 31",
            cycleRule: "Every room uses a Core Deep Reset first. Summer then shifts the home toward lighter routines, outdoor living, cool storage and easy hosting.",
            shoppingMetric: "SUMMER SHOPPING",
            progressMetric: "SUMMER RESET",
            designLabel: "SUMMER DESIGN CODE",
            designCopy: "Pool water. Pink resort towels. Citrus. Sunshine.",
            palette: [
                ["AQUA", "#56dce1"],
                ["RESORT PINK", "#ef73ba"],
                ["LEMON", "#f4d85b"],
                ["IVORY", "#fff9ef"],
                ["CORAL", "#f1a58f"],
                ["PALM", "#82ae83"]
            ],
            topologyLabel: "SUMMER RESET // CLEAN BY ROOM",
            topologyCopy: "Choose one real room at a time. Every room receives the same detailed reset foundation, then Summer adds only the warm-weather, outdoor-living and lighter-home transitions that make sense.",
            workspaceNote: "Open one room protocol at a time. Finish the Core Deep Reset first; the Summer Layer is the warm-weather transition that follows.",
            ruleLabel: "SUMMER RULE",
            ruleTitle: "Clear it. Cool it. Lighten it. Enjoy it.",
            ruleCopy: "Summer should make the home easier to live in: open surfaces, cold drinks, lighter textiles and outdoor spaces that are actually ready to use.",
            shoppingKicker: "SUMMER STYLING // SHARED HOMEOS SHOPPING",
            shoppingHeading: "Brighten the house without filling it up.",
            shoppingCopy: "Add summer linens, beverage supplies, outdoor pieces, coolers, storage and decor here. Everything still feeds the single shared HomeOS Shopping List.",
            shoppingEntryTitle: "Summer Home + Hosting",
            shoppingEntryCopy: "Think aqua glass, resort pink, citrus, beautiful woven textures, fresh greenery and useful warm-weather pieces.",
            shoppingPlaceholder: "Example: Aqua outdoor drink pitcher",
            plannedLabel: "SUMMER RESET // PLANNED",
            plannedTitle: "Current Summer List",
            completionLabel: "HOME MEMORY // SUMMER CYCLE",
            completionTitle: "Close the Summer Reset.",
            completionMessage: "Finish the Summer Reset checklist before completing this cycle.",
            completionButton: "Complete Summer Reset",
            mascot: "assets/images/branding/summer-mascot.png",
            mascotAlt: "HomeOS Summer mascot"
        },
        fall: {
            pageName: "Fall Refresh",
            systemKicker: "AUTUMN HOME CARE // FALL CYCLE ONLINE",
            headline: 'Settle the home<br>into <em>fall.</em>',
            heroMessage: "Prepare the home for cooler weather, gathering and cozy living.",
            guideLabel: "FALL GUIDE // ACTIVE",
            guideMessage: "HomeOS is reading your Fall Refresh.",
            guideAction: "CONTINUE FALL REFRESH →",
            cycleLabel: "FALL CYCLE",
            cycleWindowLabel: "HOMEOS FALL WINDOW",
            cycleWindow: "SEP 01 — NOV 30",
            cycleRule: "Every room uses a Core Deep Reset first. Fall then adds cooler-weather transitions, hosting readiness and seasonal home care.",
            shoppingMetric: "FALL SHOPPING",
            progressMetric: "FALL REFRESH",
            designLabel: "FALL DESIGN CODE",
            designCopy: "Cozy. Tailored. Warm. Never Halloween-store orange.",
            palette: [
                ["ESPRESSO", "#34231f"],
                ["BURGUNDY", "#6b3040"],
                ["CHESTNUT", "#74472f"],
                ["BURNT SIENNA", "#a7613d"],
                ["MUTED OLIVE", "#55604a"],
                ["WARM CREAM", "#eee4da"]
            ],
            topologyLabel: "FALL REFRESH // CLEAN BY ROOM",
            topologyCopy: "Choose one real room at a time. Every room receives a detailed Core Deep Reset, then Fall adds cooler-weather transitions, Thanksgiving or hosting preparation and seasonal styling only where it belongs.",
            workspaceNote: "Open one room protocol at a time. Finish the Core Deep Reset first; the Fall Layer handles cooler-weather transitions, hosting preparation and seasonal styling.",
            ruleLabel: "FALL RULE",
            ruleTitle: "Clean first. Organize second. Style last.",
            ruleCopy: "Fall decor should finish the room—not hide unfinished cleaning or create another layer of clutter.",
            shoppingKicker: "FALL STYLING // SHARED HOMEOS SHOPPING",
            shoppingHeading: "Warm the home without creating clutter.",
            shoppingCopy: "Add Fall textiles, hosting pieces, storage and decor here. Everything still joins the single shared HomeOS Shopping List.",
            shoppingEntryTitle: "Fall Decor + Home Prep",
            shoppingEntryCopy: "Buy only what the reset proves the house needs. Keep the palette warm, sophisticated and useful beyond one holiday whenever possible.",
            shoppingPlaceholder: "Example: Burgundy velvet pillow covers",
            plannedLabel: "FALL REFRESH // PLANNED",
            plannedTitle: "Current Fall List",
            completionLabel: "HOME MEMORY // FALL CYCLE",
            completionTitle: "Close the Fall Refresh.",
            completionMessage: "Finish the Fall Refresh checklist before completing this cycle.",
            completionButton: "Complete Fall Refresh",
            mascot: "assets/images/branding/fall-mascot.png",
            mascotAlt: "HomeOS Fall mascot"
        },
        winter: {
            pageName: "Winter Reset",
            systemKicker: "WINTER HOME CARE // SNOW CYCLE ONLINE",
            headline: 'Wrap the home<br>in <em>winter.</em>',
            heroMessage: "Protect, warm and prepare the home for winter and the Christmas season.",
            guideLabel: "WINTER GUIDE // ACTIVE",
            guideMessage: "HomeOS is reading your Winter Reset.",
            guideAction: "CONTINUE WINTER RESET →",
            cycleLabel: "WINTER CYCLE",
            cycleWindowLabel: "HOMEOS WINTER WINDOW",
            cycleWindow: "DEC 01 — FEB 28/29",
            cycleRule: "The Core Deep Reset comes first. Winter then adds warmth, cold-weather protection, hosting readiness and Christmas or holiday preparation.",
            shoppingMetric: "WINTER SHOPPING",
            progressMetric: "WINTER RESET",
            designLabel: "WINTER DESIGN CODE",
            designCopy: "Cashmere. Snowfall. Candlelight. Christmas magic.",
            palette: [
                ["IVORY", "#fffaf2"],
                ["CASHMERE", "#e9dfd4"],
                ["SNOW", "#ffffff"],
                ["CHAMPAGNE", "#cbb9a3"],
                ["FROST", "#b8d7e7"],
                ["BLUSH", "#d8c5cd"]
            ],
            topologyLabel: "WINTER RESET // CLEAN BY ROOM",
            topologyCopy: "Choose one real room at a time. Every room receives the detailed reset foundation first, then Winter adds cold-weather comfort, Christmas tree and holiday decorating or hosting preparation where appropriate.",
            workspaceNote: "Open one room protocol at a time. Finish the Core Deep Reset first; the Winter Layer handles cold-weather protection, comfort and Christmas or holiday preparation.",
            ruleLabel: "WINTER RULE",
            ruleTitle: "Reset first. Warm the room second. Add magic last.",
            ruleCopy: "Christmas and winter decor should make a finished room feel magical—not become a way to decorate around unfinished cleaning.",
            shoppingKicker: "WINTER STYLING // SHARED HOMEOS SHOPPING",
            shoppingHeading: "Warmth, wonder and what the home actually needs.",
            shoppingCopy: "Add winter textiles, holiday hosting pieces, Christmas decor, lighting, storage and home-care supplies here. Everything still joins the single HomeOS Shopping List.",
            shoppingEntryTitle: "Winter + Christmas",
            shoppingEntryCopy: "Keep it polished: snowy whites, creams, soft champagne metals, warm candlelight and just enough Christmas magic.",
            shoppingPlaceholder: "Example: Cream velvet Christmas stockings",
            plannedLabel: "WINTER RESET // PLANNED",
            plannedTitle: "Current Winter List",
            completionLabel: "HOME MEMORY // WINTER CYCLE",
            completionTitle: "Close the Winter Reset.",
            completionMessage: "Finish the Winter Reset checklist before completing this cycle.",
            completionButton: "Complete Winter Reset",
            mascot: "assets/images/branding/winter-mascot.png",
            mascotAlt: "HomeOS Winter mascot"
        }
    };
    const season = document.body.dataset.season;
    const config = CONFIG[season];
    const seasonLabel = season
        ? season.charAt(0).toUpperCase() +
            season.slice(1)
        : "";
    const root = document.getElementById("seasonDetailRoot");
    if (!root ||
        !config) {
        return;
    }
    const buildAtmosphereMarkup = (seasonId) => {
        if (seasonId ===
            "winter") {
            const far = [
                [2, 38, -31, 1.4], [7, 43, -18, 1.8], [13, 36, -5, 1.2],
                [19, 41, -27, 1.6], [25, 39, -11, 1.3], [31, 45, -34, 1.9],
                [38, 37, -20, 1.2], [44, 42, -2, 1.7], [50, 40, -24, 1.4],
                [56, 46, -14, 1.6], [62, 38, -30, 1.1], [68, 44, -8, 1.5],
                [74, 36, -22, 1.7], [80, 43, -16, 1.3], [86, 39, -29, 1.8],
                [92, 45, -10, 1.4], [98, 37, -25, 1.6]
            ];
            const mid = [
                [1, 29, -17, 2.2], [7, 34, -3, 2.7], [14, 27, -23, 2.0],
                [20, 32, -11, 2.9], [27, 30, -28, 2.4], [33, 35, -7, 3.0],
                [40, 28, -20, 2.1], [46, 33, -14, 3.1], [52, 31, -1, 2.5],
                [59, 36, -25, 2.8], [65, 29, -9, 2.3], [72, 34, -18, 3.2],
                [78, 27, -5, 2.4], [84, 32, -21, 3.0], [90, 30, -12, 2.2],
                [95, 35, -27, 2.9], [99, 28, -6, 2.5]
            ];
            const near = [
                [3, 24, -13, 3.4], [11, 27, -2, 4.0], [19, 23, -18, 3.6],
                [27, 26, -7, 4.2], [35, 22, -20, 3.5], [43, 28, -4, 4.1],
                [51, 24, -16, 3.7], [59, 27, -10, 4.4], [67, 23, -1, 3.6],
                [75, 26, -19, 4.2], [83, 22, -6, 3.8], [90, 28, -14, 4.3],
                [96, 24, -9, 3.5], [99, 27, -22, 4.0]
            ];
            const makeLayer = (name, flakes) => `
                <div
                    class="homeos-winter-snow homeos-winter-snow--${name}"
                    aria-hidden="true"
                >
                    ${flakes
                .map(([x, fall, delay, drift], index) => `
                                <span
                                    class="homeos-winter-flake"
                                    style="--snow-x:${x};--snow-fall:${fall}s;--snow-delay:${delay}s;--snow-drift:${drift}vw;--snow-index:${index};"
                                ></span>
                            `)
                .join("")}
                </div>
            `;
            return `
                <div
                    class="homeos-winter-snow-scene"
                    aria-hidden="true"
                >
                    ${makeLayer("far", far)}
                    ${makeLayer("mid", mid)}
                    ${makeLayer("near", near)}
                </div>
            `;
        }
        if (seasonId ===
            "summer") {
            return `

                <div class="season-effect-field summer-lemon-rain">

                    ${Array.from({ length: 16 }, (_, index) => `
                                <span
                                    class="
                                        summer-lemon
                                        lemon-${String(index + 1).padStart(2, "0")}
                                    "
                                ></span>
                            `)
                .join("")}

                </div>

            `;
        }
        if (seasonId ===
            "fall") {
            return `

                <div
                    class="season-effect-field homeos-fall-leaf-field"
                    id="homeosFallLeafField"
                ></div>

            `;
        }
        return `

            <div
                class="season-effect-field spring-bloom-field"
                id="springBloomField"
                aria-hidden="true"
            ></div>

        `;
    };
    // --- Fall Exact Reference Leaves ---
    const FALL_LEAF_SVGS = [
        "https://peppy-horse-0fee5a.netlify.app/leaf1.svg",
        "https://peppy-horse-0fee5a.netlify.app/leaf2.svg",
        "https://peppy-horse-0fee5a.netlify.app/leaf3.svg",
        "https://peppy-horse-0fee5a.netlify.app/leaf4.svg"
    ];
    const randomRange = (min, max) => Math.random() * (max - min) + min;
    const initFallLeaves = () => {
        if (season !== "fall") {
            return;
        }
        const field = document.getElementById("homeosFallLeafField");
        if (!field) {
            return;
        }
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const count = reducedMotion
            ? 6
            : window.innerWidth < 760
                ? 10
                : 18;
        const fragment = document.createDocumentFragment();
        for (let index = 0; index < count; index += 1) {
            const leaf = document.createElement("span");
            leaf.className =
                "homeos-fall-leaf";
            const image = document.createElement("img");
            image.alt = "";
            image.draggable = false;
            image.decoding = "async";
            image.src =
                FALL_LEAF_SVGS[index % FALL_LEAF_SVGS.length];
            const size = randomRange(30, 58);
            const left = randomRange(-3, 97);
            const driftOne = randomRange(-135, 135);
            const driftTwo = randomRange(-180, 180);
            const duration = randomRange(13, 22);
            const delay = reducedMotion ? 0 : -randomRange(0, duration);
            const rotateStart = randomRange(-150, 150);
            const rotateMid = rotateStart + randomRange(-110, 110);
            const rotateEnd = rotateMid +
                randomRange(130, 330) *
                    (Math.random() > .5 ? 1 : -1);
            const opacity = randomRange(.38, .68);
            leaf.style.setProperty("--leaf-size", `${size}px`);
            leaf.style.setProperty("--leaf-left", `${left}%`);
            leaf.style.setProperty("--leaf-drift-one", `${driftOne}px`);
            leaf.style.setProperty("--leaf-drift-two", `${driftTwo}px`);
            leaf.style.setProperty("--leaf-duration", `${duration}s`);
            leaf.style.setProperty("--leaf-delay", `${delay}s`);
            leaf.style.setProperty("--leaf-rotate-start", `${rotateStart}deg`);
            leaf.style.setProperty("--leaf-rotate-mid", `${rotateMid}deg`);
            leaf.style.setProperty("--leaf-rotate-end", `${rotateEnd}deg`);
            leaf.style.setProperty("--leaf-opacity", opacity.toFixed(2));
            leaf.appendChild(image);
            fragment.appendChild(leaf);
        }
        field.replaceChildren(fragment);
    };
    const atmosphereMarkup = buildAtmosphereMarkup(season);
    const palette = config.palette
        .map(([label, color]) => `
                    <span
                        style="--swatch:${color};"
                    >
                        ${label}
                    </span>
                `)
        .join("");
    root.innerHTML = `

        <!-- =====================================================
             UNIVERSAL SEASON ATMOSPHERE
        ====================================================== -->

        <div
            class="season-atmosphere"
            aria-hidden="true"
        >

            <div
                class="
                    season-atmosphere-glow
                    season-atmosphere-glow-one
                "
            ></div>

            <div
                class="
                    season-atmosphere-glow
                    season-atmosphere-glow-two
                "
            ></div>

            ${atmosphereMarkup}

        </div>


        <!-- =====================================================
             UNIVERSAL COMMAND DECK
        ====================================================== -->

        <section class="season-command-deck">


            <div class="season-command-copy">

                <div class="season-system-kicker">

                    <span class="season-live-dot"></span>

                    ${config.systemKicker}

                </div>


                <h1>
                    ${config.headline}
                </h1>


                <p
                    class="season-command-lead"
                    id="seasonHeroMessage"
                >
                    ${config.heroMessage}
                </p>


                <div class="season-identity-line">

                    <span id="seasonEyebrow">
                        HOMEOS // ${season.toUpperCase()} HOME CARE
                    </span>

                    <strong id="seasonHeroName">
                        ${config.pageName}
                    </strong>

                </div>


                <div class="season-live-datetime">

                    <article class="season-time-card">

                        <span>
                            CURRENT DATE
                        </span>

                        <strong id="seasonDetailDateLarge">
                            --- --, ----
                        </strong>

                        <small id="seasonDetailDayLabel">
                            ---------
                        </small>

                    </article>


                    <article
                        class="
                            season-time-card
                            season-clock-card
                        "
                    >

                        <span>
                            LOCAL HOME TIME
                        </span>

                        <strong id="seasonDetailTimeLarge">
                            --:--:-- --
                        </strong>

                        <small>
                            LIVE // HOMEOS CLOCK
                        </small>

                    </article>

                </div>


                <div class="season-command-actions">

                    <a
                        class="button button-secondary"
                        href="../index.html"
                    >
                        ← Rhythm
                    </a>


                    <button
                        class="button button-primary"
                        type="button"
                        data-begin-season
                    >
                        Enter ${seasonLabel} Workspace →
                    </button>

                </div>

            </div>


            <!-- MASCOT -->

            <aside class="season-mascot-stage">

                <div class="season-mascot-topline">

                    <span>
                        HOMEOS GUIDE
                    </span>

                    <strong id="seasonGuideStatus">
                        ONLINE
                    </strong>

                </div>


                <div
                    class="season-scan-line"
                    aria-hidden="true"
                ></div>


                <div
                    class="
                        season-orbit
                        season-orbit-outer
                    "
                    aria-hidden="true"
                ></div>


                <div
                    class="
                        season-orbit
                        season-orbit-inner
                    "
                    aria-hidden="true"
                ></div>


                <div
                    class="season-mascot-glow"
                    aria-hidden="true"
                ></div>


                <img
                    class="season-mascot"
                    src="${config.mascot}"
                    alt="${config.mascotAlt}"
                >


                <div class="season-guide-message">

                    <span>
                        ${config.guideLabel}
                    </span>

                    <p id="seasonGuideMessage">
                        ${config.guideMessage}
                    </p>

                </div>


                <button
                    class="season-guide-action"
                    id="seasonGuideAction"
                    type="button"
                    data-begin-season
                >
                    ${config.guideAction}
                </button>

            </aside>


            <!-- CYCLE -->

            <aside class="season-cycle-core">

                <div class="season-cycle-head">

                    <div>

                        <span class="ui-kicker">
                            ${config.cycleLabel}
                        </span>

                        <h2>
                            Home Readiness
                        </h2>

                    </div>


                    <span
                        class="season-cycle-state"
                        id="seasonCycleState"
                    >
                        CHECKING
                    </span>

                </div>


                <div class="season-cycle-orbit">

                    <div
                        class="season-progress-ring"
                        id="seasonProgressRing"
                    >

                        <div class="season-progress-ring-center">

                            <strong id="seasonProgressValue">
                                0%
                            </strong>

                            <span id="seasonProgressStatus">
                                READY
                            </span>

                        </div>

                    </div>

                </div>


                <div class="season-cycle-window">

                    <span>
                        ${config.cycleWindowLabel}
                    </span>

                    <strong id="seasonCycleWindow">
                        ${config.cycleWindow}
                    </strong>

                </div>


                <div
                    class="season-cycle-countdown"
                    data-saved-label="${season.toUpperCase()}"
                >

                    <strong id="seasonCycleCountdown">
                        --
                    </strong>

                    <span id="seasonCycleCountdownLabel">
                        CHECKING CYCLE
                    </span>

                </div>


                <div class="season-cycle-rule">
                    ${config.cycleRule}
                </div>

            </aside>

        </section>


        <!-- =====================================================
             UNIVERSAL SEASON NAV
        ====================================================== -->

        <nav
            class="
                season-navigation
                season-detail-nav
            "
            aria-label="Season navigation"
        >

            <a
                href="seasons/spring.html"
                data-season-link="spring"
            >
                <span>01</span>
                <strong>Spring</strong>
                <small>Renewal</small>
            </a>


            <a
                href="seasons/summer.html"
                data-season-link="summer"
            >
                <span>02</span>
                <strong>Summer</strong>
                <small>Reset</small>
            </a>


            <a
                href="seasons/fall.html"
                data-season-link="fall"
            >
                <span>03</span>
                <strong>Fall</strong>
                <small>Refresh</small>
            </a>


            <a
                href="seasons/winter.html"
                data-season-link="winter"
            >
                <span>04</span>
                <strong>Winter</strong>
                <small>Reset</small>
            </a>

        </nav>


        <!-- =====================================================
             DESIGN LANGUAGE
        ====================================================== -->

        <section class="season-style-strip">

            <div>

                <span>
                    ${config.designLabel}
                </span>

                <strong>
                    ${config.designCopy}
                </strong>

            </div>


            <div class="season-palette">
                ${palette}
            </div>

        </section>


        <!-- =====================================================
             CLEAN BY ROOM
        ====================================================== -->

        <section
            class="
                season-section
                season-topology-section
                season-room-directory-section
            "
            id="seasonTopology"
        >

            <div class="season-section-heading">

                <div>

                    <span class="ui-kicker">
                        ${config.topologyLabel}
                    </span>

                    <h2>
                        Reset the home one room at a time.
                    </h2>

                </div>


                <p>
                    ${config.topologyCopy}
                </p>

            </div>


            <div class="season-room-directory-intro">

                <span>
                    DEEP SEASONAL RESET
                </span>

                <strong>
                    Pick a level. Pick a room. Work the checklist.
                </strong>

                <p>
                    HomeOS gives every room a strong detailed baseline.
                    The household can remove anything that does not apply
                    and add anything unique to the home.
                </p>

            </div>


            <div
                class="season-floor-tabs"
                id="seasonFloorTabs"
                role="group"
                aria-label="Choose a home level"
            ></div>


            <div class="season-room-directory-frame">

                <div class="season-room-directory-head">

                    <div>
                        <span>
                            ROOMS ON THIS LEVEL
                        </span>

                        <strong>
                            Select a room to open its Seasonal reset.
                        </strong>
                    </div>

                    <small>
                        CORE DEEP RESET + ${season.toUpperCase()} LAYER
                    </small>

                </div>


                <div
                    class="season-room-directory"
                    id="seasonHomeMap"
                ></div>

            </div>

        </section>


        <!-- =====================================================
             WORKSPACE
        ====================================================== -->

        <section
            class="
                season-section
                season-workspace
            "
            id="seasonChecklist"
        >


            <article class="season-checklist-panel">

                <div class="season-workspace-head">

                    <div>

                        <span
                            class="ui-kicker"
                            id="selectedSeasonZoneCode"
                        >
                            A-01 // ${season.toUpperCase()}
                        </span>


                        <h2 id="selectedSeasonZoneName">
                            Master Suite
                        </h2>


                        <p id="selectedSeasonZoneDescription">
                            Detailed deep seasonal reset for this room.
                        </p>

                    </div>


                    <div class="season-zone-progress">

                        <span id="seasonTargetProgressLabel">
                            ROOM COMPLETE
                        </span>

                        <strong id="selectedSeasonZoneProgress">
                            0%
                        </strong>

                        <small id="selectedSeasonZoneTaskCount">
                            0/0
                        </small>

                    </div>

                </div>


                <div class="season-workspace-note">

                    <span>
                        HOW TO USE THIS
                    </span>

                    <p>
                        ${config.workspaceNote}
                    </p>

                </div>


                <div
                    class="season-task-list"
                    id="seasonTaskList"
                ></div>


                <div class="season-add-task season-task-builder">

                    <div class="season-task-builder-head">

                        <div>
                            <span id="seasonAddTaskScope">
                                ADD A TASK // THIS ROOM
                            </span>

                            <strong id="seasonTaskBuilderTitle">
                                Add it where it belongs.
                            </strong>
                        </div>

                        <p id="seasonAddTaskHelp">
                            Choose the section, name the task, and HOME OS will keep it with that part of the room.
                        </p>

                    </div>


                    <div class="season-task-builder-grid season-task-builder-grid-room">

                        <label class="season-builder-field">
                            <span>ADD TO</span>
                            <select
                                class="app-input"
                                id="seasonAddTaskSection"
                            ></select>
                        </label>


                        <label class="season-builder-field season-builder-task-field">
                            <span>TASK</span>
                            <input
                                class="app-input"
                                id="newSeasonTask"
                                type="text"
                                placeholder="What needs to be added?"
                            >
                        </label>


                        <button
                            class="button button-primary season-builder-add"
                            id="addSeasonTaskButton"
                            type="button"
                        >
                            + Add Task
                        </button>

                    </div>

                </div>

            </article>


            <!-- INTELLIGENCE -->

            <aside class="season-intelligence-panel">

                <div class="season-intelligence-line"></div>


                <span class="ui-kicker">
                    HOMEOS // ${season.toUpperCase()} INTELLIGENCE
                </span>


                <h3 id="seasonIntelligenceTitle">
                    Master Suite
                </h3>


                <p id="seasonIntelligenceDescription">
                    HomeOS is reading this room.
                </p>


                <div class="season-stat-grid">

                    <div>
                        <span>TASKS</span>
                        <strong id="seasonZoneTasksDone">0/0</strong>
                    </div>


                    <div>
                        <span>ROOM STATE</span>
                        <strong id="seasonZoneState">READY</strong>
                    </div>


                    <div>
                        <span>${season.toUpperCase()}</span>
                        <strong id="seasonTotalProgress">0%</strong>
                    </div>


                    <div>
                        <span>SHOPPING</span>
                        <strong id="seasonShoppingCount">0</strong>
                    </div>

                </div>


                <div class="season-priority-card">

                    <span>
                        ${config.ruleLabel}
                    </span>

                    <strong>
                        ${config.ruleTitle}
                    </strong>

                    <p>
                        ${config.ruleCopy}
                    </p>

                </div>


                <button
                    class="button button-primary"
                    type="button"
                    data-scroll-target="seasonShoppingSection"
                >
                    Open ${seasonLabel} Shopping ↓
                </button>

            </aside>

        </section>


        <!-- =====================================================
             SHOPPING
        ====================================================== -->

        <section
            class="season-section"
            id="seasonShoppingSection"
        >

            <div class="season-section-heading">

                <div>

                    <span class="ui-kicker">
                        ${config.shoppingKicker}
                    </span>

                    <h2>
                        ${config.shoppingHeading}
                    </h2>

                </div>


                <p>
                    ${config.shoppingCopy}
                </p>

            </div>


            <div class="season-shopping-layout">


                <article class="season-shopping-entry">

                    <span class="ui-kicker">
                        ADD TO HOMEOS
                    </span>

                    <h3>
                        ${config.shoppingEntryTitle}
                    </h3>

                    <p>
                        ${config.shoppingEntryCopy}
                    </p>


                    <div class="season-shopping-form season-shopping-form-room-aware">

                        <label class="season-shopping-field season-shopping-item-field">
                            <span>ITEM</span>
                            <input
                                class="app-input"
                                id="seasonShoppingName"
                                type="text"
                                placeholder="${config.shoppingPlaceholder}"
                            >
                        </label>


                        <label class="season-shopping-field">
                            <span>FOR ROOM</span>
                            <select
                                class="app-input"
                                id="seasonShoppingRoom"
                            ></select>
                        </label>


                        <label class="season-shopping-field season-shopping-qty-field">
                            <span>QTY</span>
                            <input
                                class="app-input"
                                id="seasonShoppingQty"
                                type="number"
                                min="1"
                                value="1"
                                aria-label="Quantity"
                            >
                        </label>


                        <button
                            class="button button-primary"
                            id="addSeasonShoppingButton"
                            type="button"
                        >
                            Add To Shopping
                        </button>

                    </div>

                </article>


                <article class="season-shopping-list-card">

                    <div class="season-shopping-head">

                        <div>

                            <span class="ui-kicker">
                                ${config.plannedLabel}
                            </span>

                            <h3>
                                ${config.plannedTitle}
                            </h3>

                        </div>


                        <span id="seasonShoppingListCount">
                            0 ITEMS
                        </span>

                    </div>


                    <div
                        class="season-shopping-list"
                        id="seasonShoppingList"
                    ></div>


                    <a
                        class="button button-secondary"
                        href="inventory.html#shoppingSection"
                    >
                        Open Full HomeOS Shopping →
                    </a>

                </article>

            </div>

        </section>



    `;
    initFallLeaves();
})();
