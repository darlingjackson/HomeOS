/* ============================================================
   HOMEOS // LAUNDRY

   Laundry guide, loads, timers, history and Laundry Buddy.
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";
    const service = window.HomeOS?.services?.laundry;
    const App = {
        TIMER_KEY: "homeos_laundry_stage_timers_v1",
        STAGES: ["washing", "drying", "folding", "put_away"],
        INITIAL_WAIT_DAYS: 14,
        state: null,
        data: null,
        tick: null,
        selectedAreaId: null,
        preselectedCategoryKey: null,
        celebrationTimer: null,
        selectedLoadId: null,
        SYSTEMS: {
            color: {
                label: "Sort by color",
                description: "Clothing is separated by color, while towels, linens and floor textiles keep their own load groups.",
                groups: [
                    ["darks", "Darks"],
                    ["lights", "Lights"],
                    ["whites", "Whites"],
                    ["towels", "Towels"],
                    ["linens", "Bedding + Linens"],
                    ["mats_rugs", "Mats + Rugs"],
                    ["delicates", "Delicates + Special Care"]
                ]
            },
            kids_separate: {
                label: "Kids clothes separate",
                description: "Adult clothing and children's clothing stay separate, with household textiles in their own groups.",
                groups: [
                    ["adult_clothes", "Adult Clothes"],
                    ["kids_clothes", "Kids Clothes"],
                    ["towels", "Towels"],
                    ["linens", "Bedding + Linens"],
                    ["mats_rugs", "Mats + Rugs"],
                    ["delicates", "Delicates + Special Care"]
                ]
            },
            by_person: {
                label: "By person",
                description: "Each person's clothes stay together, with household textiles kept as shared loads.",
                groups: []
            },
            simple: {
                label: "Simple household loads",
                description: "A minimal sorting system for households that prefer fewer decisions.",
                groups: [
                    ["clothes", "Clothes"],
                    ["towels", "Towels"],
                    ["linens", "Bedding + Linens"],
                    ["mats_rugs", "Mats + Rugs"],
                    ["special", "Special Care"]
                ]
            },
            custom: {
                label: "Custom laundry system",
                description: "Your household's own load groups from Home Setup.",
                groups: []
            }
        },
        COLOR_RHYTHM: {
            whites: "Monday",
            delicates: "Monday",
            darks: "Tuesday",
            linens: "Saturday",
            mats_rugs: "Saturday"
        },
        async init() {
            if (!service) {
                console.error("HOME OS Laundry service is unavailable.");
                return;
            }
            this.bind();
            this.state = await window.HomeOS.session.guard();
            if (!this.state?.authenticated) {
                return;
            }
            await this.reload();
            this.tick = setInterval(() => {
                this.renderActiveLoads();
                this.syncShellTimers();
            }, 1000);
        },
        async reload() {
            const result = await service.load(this.state.household.id);
            if (result.error) {
                console.error(result.error);
                this.notify("HOME OS could not load Laundry right now.", "attention");
                return;
            }
            this.data = result.data;
            if (!this.selectedAreaId && this.areas()[0]) {
                this.selectedAreaId = this.areas()[0].id;
            }
            this.render();
            this.syncShellTimers();
        },
        areas() {
            return this.data?.areas || [];
        },
        loads() {
            return this.data?.loads || [];
        },
        people() {
            return (this.data?.people || [])
                .filter(person => person.active !== false && person.can_be_assigned !== false);
        },
        activeLoads() {
            return this.loads().filter(load => load.stage !== "complete");
        },
        history() {
            return this.loads()
                .filter(load => load.stage === "complete" && load.completed_at)
                .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
        },
        areaById(id) {
            return this.areas()
                .find(area => String(area.id) === String(id)) || null;
        },
        primaryArea() {
            return this.areaById(this.selectedAreaId) || this.areas()[0] || null;
        },
        personById(id) {
            return this.people()
                .find(person => String(person.id) === String(id)) || null;
        },
        areaSystem(area = this.primaryArea()) {
            const key = area?.laundry_system || "color";
            return this.SYSTEMS[key] ? key : "color";
        },
        categories(area = this.primaryArea()) {
            const system = this.areaSystem(area);
            if (system === "by_person") {
                const personGroups = this.people().map(person => [
                    `person_${person.id}`,
                    `${person.display_name}'s Clothes`
                ]);
                return [
                    ...personGroups,
                    ["towels", "Towels"],
                    ["linens", "Bedding + Linens"],
                    ["mats_rugs", "Mats + Rugs"],
                    ["special", "Special Care"]
                ];
            }
            if (system === "custom") {
                const custom = Array.isArray(area?.custom_categories)
                    ? area.custom_categories
                    : [];
                if (custom.length) {
                    return custom.map((name, index) => [
                        `custom_${index}_${this.slug(name)}`,
                        String(name)
                    ]);
                }
                return this.SYSTEMS.color.groups;
            }
            return this.SYSTEMS[system]?.groups || this.SYSTEMS.color.groups;
        },
        scheduleForCategory(categoryKey, area = this.primaryArea()) {
            if (this.areaSystem(area) === "color") {
                return this.COLOR_RHYTHM[categoryKey] || "Flexible";
            }
            return "Flexible";
        },
        render() {
            this.renderProfile();
            this.renderGuideAndTracker();
            this.renderSystem();
            this.renderBuddy();
            this.renderActiveLoads();
            this.renderHistory();
            this.renderDialogOptions();
        },
        renderProfile() {
            const strip = document.getElementById("laundryProfileStrip");
            const area = this.primaryArea();
            if (!strip) {
                return;
            }
            if (!area) {
                strip.innerHTML = `
                    <span class="laundry-profile-pill">
                        <i></i>
                        <strong>No laundry area yet</strong>
                    </span>
                    <span class="laundry-profile-pill">
                        Add where laundry happens in Home Setup.
                    </span>
                `;
                document.getElementById("startLoadButton")
                    ?.setAttribute("disabled", "disabled");
                return;
            }
            document.getElementById("startLoadButton")
                ?.removeAttribute("disabled");
            const system = this.SYSTEMS[this.areaSystem(area)] || this.SYSTEMS.color;
            const wash = Math.max(1, Number(area.wash_minutes) || 45);
            const dry = Math.max(1, Number(area.dry_minutes) || 60);
            strip.innerHTML = `
                <span class="laundry-profile-pill">
                    <i></i>
                    <strong>${this.escape(system.label)}</strong>
                </span>
                <span class="laundry-profile-pill">
                    ${this.escape(area.name || "Laundry Area")}
                </span>
                <span class="laundry-profile-pill">
                    Wash <strong>${wash}m</strong>
                </span>
                <span class="laundry-profile-pill">
                    Dry <strong>${dry}m</strong>
                </span>
            `;
        },
        categoryLastCompleted(categoryKey, categoryLabel) {
            return this.history().find(load => {
                const stored = load.metadata?.category_key;
                if (stored && stored === categoryKey) {
                    return true;
                }
                return this.slug(load.name) === this.slug(categoryLabel);
            }) || null;
        },
        daysSinceCategory(categoryKey, categoryLabel) {
            const last = this.categoryLastCompleted(categoryKey, categoryLabel);
            if (!last?.completed_at) {
                return this.INITIAL_WAIT_DAYS;
            }
            const date = new Date(last.completed_at);
            if (Number.isNaN(date.getTime())) {
                return this.INITIAL_WAIT_DAYS;
            }
            return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
        },
        categoryPressure(days) {
            if (days >= 14) {
                return "overdue";
            }
            if (days >= 7) {
                return "due";
            }
            if (days >= 3) {
                return "building";
            }
            return "fresh";
        },
        rhythmStats() {
            const groups = this.categories();
            if (!groups.length) {
                return {
                    total: 0,
                    fresh: 0,
                    waiting: 0,
                    oldest: 0,
                    percent: 0
                };
            }
            const ages = groups.map(([key, label]) => this.daysSinceCategory(key, label));
            const fresh = ages.filter(days => days < 7).length;
            const waiting = ages.filter(days => days >= 7).length;
            const oldest = Math.max(...ages, 0);
            const percent = Math.round((fresh / groups.length) * 100);
            return {
                total: groups.length,
                fresh,
                waiting,
                oldest,
                percent
            };
        },
        renderGuideAndTracker() {
            const stats = this.rhythmStats();
            const active = this.activeLoads();
            const groups = this.categories();
            const trackerRing = document.getElementById("laundryTrackerRing");
            if (trackerRing) {
                trackerRing.style.setProperty("--tracker-progress", `${Math.round((stats.percent / 100) * 360)}deg`);
            }
            this.setText("laundryTrackerPercent", `${stats.percent}%`);
            this.setText("laundryTrackerFresh", `${stats.fresh} / ${stats.total}`);
            this.setText("laundryTrackerActive", active.length);
            this.setText("laundryTrackerOldest", `${stats.oldest}d`);
            let trackerState = "BUILDING";
            let trackerTitle = "Laundry is waiting.";
            let trackerMessage = "HOME OS assumes a new Laundry profile begins with about two weeks of laundry waiting.";
            if (active.length) {
                trackerState = "MOVING";
                trackerTitle = "Laundry is moving.";
                trackerMessage =
                    `${active.length} ${active.length === 1 ? "load is" : "loads are"} active right now. Keep moving each load until it reaches Put Away.`;
            }
            else if (stats.percent >= 100 && stats.total) {
                trackerState = "SETTLED";
                trackerTitle = "Laundry feels caught up.";
                trackerMessage =
                    "Every load group has been handled within the last seven days.";
            }
            else if (stats.percent >= 50) {
                trackerState = "RECOVERING";
                trackerTitle = "You're bringing it back down.";
                trackerMessage =
                    `${stats.fresh} of ${stats.total} load groups are fresh. The basket is getting lighter.`;
            }
            this.setText("laundryTrackerState", trackerState);
            this.setText("laundryTrackerTitle", trackerTitle);
            this.setText("laundryTrackerMessage", trackerMessage);
            let guideStatus = "CATCHING UP";
            let guideMessage = "Pick one load group and HOME OS will keep the washer and dryer time for you.";
            const dueMachine = active.find(load => {
                if (!["washing", "drying"].includes(load.stage)) {
                    return false;
                }
                return this.timerRemaining(load).total <= 0;
            });
            if (dueMachine) {
                guideStatus = "NEEDS YOU";
                guideMessage =
                    dueMachine.stage === "washing"
                        ? `${dueMachine.name} finished washing. Move it to the dryer.`
                        : `${dueMachine.name} finished drying. It is ready to fold.`;
            }
            else {
                const today = new Intl.DateTimeFormat(undefined, {
                    weekday: "long"
                }).format(new Date());
                const todayGroup = groups.find(([key, label]) => this.scheduleForCategory(key) === today &&
                    this.daysSinceCategory(key, label) >= 3);
                const oldestGroup = [...groups]
                    .sort((a, b) => this.daysSinceCategory(b[0], b[1]) -
                    this.daysSinceCategory(a[0], a[1]))[0];
                if (todayGroup) {
                    guideStatus = "TODAY";
                    guideMessage =
                        `${today} is set aside for ${todayGroup[1]}. That is a good next load.`;
                }
                else if (oldestGroup) {
                    const days = this.daysSinceCategory(oldestGroup[0], oldestGroup[1]);
                    guideMessage =
                        `${oldestGroup[1]} has been waiting about ${days} ${days === 1 ? "day" : "days"}. That would make the biggest difference next.`;
                }
            }
            this.setText("laundryGuideStatus", guideStatus);
            this.setText("laundryGuideMessage", guideMessage);
        },
        renderSystem() {
            const area = this.primaryArea();
            const heading = document.getElementById("laundrySystemHeading");
            const copy = document.getElementById("laundrySystemDescription");
            const grid = document.getElementById("laundryCategoryGrid");
            const note = document.getElementById("laundryStartingNote");
            if (!grid) {
                return;
            }
            if (!area) {
                if (heading) {
                    heading.textContent = "Set up your laundry system";
                }
                if (copy) {
                    copy.textContent = "Tell HOME OS where laundry happens first.";
                }
                grid.innerHTML = `
                    <div class="laundry-empty">
                        <strong>Laundry setup comes first.</strong>
                        <span>
                            Open Home Setup → Laundry and add the place where this
                            household washes clothes.
                        </span>
                    </div>
                `;
                if (note) {
                    note.hidden = true;
                }
                return;
            }
            const key = this.areaSystem(area);
            const system = this.SYSTEMS[key] || this.SYSTEMS.color;
            if (heading) {
                heading.textContent = system.label;
            }
            if (copy) {
                copy.textContent = system.description;
            }
            const hasAnyRecordedCompletion = this.categories(area)
                .some(([categoryKey, label]) => Boolean(this.categoryLastCompleted(categoryKey, label)));
            if (note) {
                note.hidden = hasAnyRecordedCompletion;
            }
            grid.innerHTML = this.categories(area)
                .map(([categoryKey, label]) => {
                const last = this.categoryLastCompleted(categoryKey, label);
                const days = this.daysSinceCategory(categoryKey, label);
                const pressure = this.categoryPressure(days);
                const schedule = this.scheduleForCategory(categoryKey, area);
                let detail = "Assuming 2 weeks waiting";
                let status = "Needs a reset";
                if (last?.completed_at) {
                    detail = `Last finished ${this.relativeDate(last.completed_at)}`;
                    if (days < 3) {
                        status = "Fresh";
                    }
                    else if (days < 7) {
                        status = "Building";
                    }
                    else {
                        status = `${days} days waiting`;
                    }
                }
                const alreadyToday = last?.completed_at &&
                    this.sameLocalDay(new Date(last.completed_at), new Date());
                return `
                        <article
                            class="laundry-category-card"
                            data-category="${this.attr(categoryKey)}"
                            data-pressure="${this.attr(pressure)}"
                        >
                            <div class="laundry-category-top">
                                <span class="laundry-day-chip">
                                    ${this.escape(schedule)}
                                </span>
                                <span class="laundry-age-chip">
                                    ${this.escape(days >= 14 ? "2+ WEEKS" : `${days}D`)}
                                </span>
                            </div>

                            <h3>${this.escape(label)}</h3>
                            <p>${this.escape(detail)}</p>

                            <div class="laundry-category-status">
                                ${this.escape(status)}
                            </div>

                            <div class="laundry-category-actions">
                                ${alreadyToday
                    ? `
                                            <button
                                                type="button"
                                                class="done undo"
                                                data-undo-washed="${this.attr(last.id)}"
                                                data-undo-label="${this.attr(label)}"
                                            >
                                                ↶ Undo washed
                                            </button>
                                        `
                    : `
                                            <button
                                                type="button"
                                                data-mark-washed="${this.attr(categoryKey)}"
                                            >
                                                ✓ Already washed
                                            </button>
                                        `}

                                <button
                                    type="button"
                                    class="primary"
                                    data-start-category="${this.attr(categoryKey)}"
                                >
                                    Start load
                                </button>
                            </div>
                        </article>
                    `;
            })
                .join("");
        },
        buddyPressure() {
            const groups = this.categories();
            if (!groups.length) {
                return {
                    average: 0,
                    waiting: 0,
                    oldest: 0
                };
            }
            const ages = groups.map(([key, label]) => this.daysSinceCategory(key, label));
            return {
                average: ages.reduce((sum, age) => sum + age, 0) / ages.length,
                waiting: ages.filter(age => age >= 7).length,
                oldest: Math.max(...ages, 0)
            };
        },
        renderBuddy() {
            const card = document.getElementById("laundryBuddyCard");
            if (!card) {
                return;
            }
            const stats = this.rhythmStats();
            const percent = stats.percent;
            let state = "overwhelmed";
            let title = "She is buried in laundry.";
            let message = "She is starting from the full two-week pile. Every finished load will visibly lighten her mood.";
            if (percent >= 100 && stats.total) {
                state = "sparkling";
                title = "She is completely caught up!";
                message =
                    "The basket is light, the laundry is home, and she is living her best clean life.";
            }
            else if (percent >= 80) {
                state = "happy";
                title = "She is feeling great.";
                message =
                    "Most of the laundry is under control. She is almost completely caught up.";
            }
            else if (percent >= 60) {
                state = "recovering";
                title = "She is looking much better.";
                message =
                    "The pile is shrinking and her mood is coming back. Keep the rhythm moving.";
            }
            else if (percent >= 40) {
                state = "tired";
                title = "She is hanging in there.";
                message =
                    "The basket is still carrying some pressure, but the clean loads are making a real difference.";
            }
            else if (percent >= 20) {
                state = "buried";
                title = "She is still pretty overwhelmed.";
                message =
                    "There is less laundry than before, but she still needs a few good loads to breathe again.";
            }
            if (this.activeLoads().length) {
                message =
                    `${this.activeLoads().length} ${this.activeLoads().length === 1 ? "load is" : "loads are"} already moving. Every completed stage gives her a little boost.`;
            }
            card.dataset.buddyState = state;
            card.style.setProperty("--buddy-percent", `${percent}`);
            this.setText("laundryBuddyTitle", title);
            this.setText("laundryBuddyMessage", message);
            this.setText("laundryBuddyPressure", `${percent}% caught up · ${stats.waiting} ${stats.waiting === 1 ? "group" : "groups"} still waiting`);
            const last = this.history()[0];
            this.setText("laundryBuddyLastDone", last
                ? `Last finished ${this.relativeDate(last.completed_at)}`
                : "No loads recorded yet");
        },
        buddyHop(kind = "small") {
            const visual = document.querySelector("#laundryBuddyCard .laundry-buddy-visual");
            if (!visual) {
                return;
            }
            visual.classList.remove("is-hopping", "is-big-hopping");
            // Restart the CSS animation even for fast consecutive task completions.
            void visual.offsetWidth;
            visual.classList.add(kind === "big"
                ? "is-big-hopping"
                : "is-hopping");
            window.setTimeout(() => visual.classList.remove("is-hopping", "is-big-hopping"), kind === "big" ? 1250 : 760);
        },
        showLaundryCelebration(loadName) {
            const dialog = document.getElementById("laundryCelebrationDialog");
            if (!dialog) {
                return;
            }
            this.setText("laundryCelebrationMessage", `${loadName} made it all the way through Wash → Dry → Fold → Put Away.`);
            if (!dialog.open) {
                dialog.showModal();
            }
            window.clearTimeout(this.celebrationTimer);
            this.celebrationTimer = window.setTimeout(() => {
                if (dialog.open) {
                    dialog.close();
                }
            }, 4800);
        },
        closeLaundryCelebration() {
            const dialog = document.getElementById("laundryCelebrationDialog");
            window.clearTimeout(this.celebrationTimer);
            if (dialog?.open) {
                dialog.close();
            }
        },
        todayLoadSuggestions() {
            const area = this.primaryArea();
            if (!area) {
                return [];
            }
            const today = new Intl.DateTimeFormat(undefined, {
                weekday: "long"
            }).format(new Date());
            const scheduled = this.categories(area)
                .filter(([key]) => this.scheduleForCategory(key, area) === today)
                .filter(([key, label]) => {
                const last = this.categoryLastCompleted(key, label);
                return !(last?.completed_at &&
                    this.sameLocalDay(new Date(last.completed_at), new Date()));
            })
                .map(([key, label]) => {
                const days = this.daysSinceCategory(key, label);
                return {
                    key,
                    label,
                    days,
                    kicker: `${today.toUpperCase()} · SUGGESTED`,
                    message: days >= 14
                        ? `${label} has been waiting about two weeks. Today's rhythm makes this a strong load to run next.`
                        : `${label} is part of your ${today} laundry rhythm and has been waiting about ${days} ${days === 1 ? "day" : "days"}.`
                };
            });
            if (scheduled.length) {
                return scheduled.slice(0, 2);
            }
            const oldest = [...this.categories(area)]
                .map(([key, label]) => ({
                key,
                label,
                days: this.daysSinceCategory(key, label)
            }))
                .filter(item => {
                const last = this.categoryLastCompleted(item.key, item.label);
                return !(last?.completed_at &&
                    this.sameLocalDay(new Date(last.completed_at), new Date()));
            })
                .sort((a, b) => b.days - a.days)[0];
            if (!oldest) {
                return [];
            }
            return [{
                    ...oldest,
                    kicker: "NEXT BEST LOAD",
                    message: `${oldest.label} has been waiting the longest — about ${oldest.days} ${oldest.days === 1 ? "day" : "days"}. HOME OS would start there.`
                }];
        },
        cyclePercent(load) {
            if (!["washing", "drying"].includes(load.stage)) {
                return 100;
            }
            const end = new Date(load.metadata?.timer_ends_at || "").getTime();
            const stageStart = new Date(load.metadata?.stage_updated_at ||
                load.started_at ||
                "").getTime();
            if (!Number.isFinite(end) ||
                !Number.isFinite(stageStart) ||
                end <= stageStart) {
                return 0;
            }
            const total = end - stageStart;
            const elapsed = Date.now() - stageStart;
            return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
        },
        machineVisual(load, due) {
            if (!["washing", "drying"].includes(load.stage)) {
                return "";
            }
            const isWash = load.stage === "washing";
            const progress = due ? 100 : this.cyclePercent(load);
            return `
                <div
                    class="laundry-machine-console ${due ? "is-finished" : "is-running"}"
                    data-cycle="${this.attr(load.stage)}"
                    style="--cycle-progress:${progress}%"
                >
                    <div class="laundry-machine-visual" aria-hidden="true">
                        <div class="machine-shell">
                            <div class="machine-control-panel">
                                <span class="machine-knob"></span>
                                <span class="machine-light"></span>
                                <span class="machine-light"></span>
                                <span class="machine-light"></span>
                            </div>

                            <div class="machine-door">
                                <div class="machine-drum">
                                    <i class="machine-cloth c1"></i>
                                    <i class="machine-cloth c2"></i>
                                    <i class="machine-cloth c3"></i>
                                    <i class="machine-cloth c4"></i>
                                    ${isWash
                ? `<span class="machine-water"></span>`
                : `<span class="machine-warmth"></span>`}
                                </div>
                            </div>

                            <div class="machine-base-line"></div>
                        </div>
                    </div>

                    <div class="machine-cycle-copy">
                        <span>
                            ${due
                ? "CYCLE COMPLETE"
                : isWash
                    ? "WASHER // RUNNING"
                    : "DRYER // RUNNING"}
                        </span>

                        <strong>
                            ${due
                ? isWash
                    ? "Ready for the dryer"
                    : "Ready to fold"
                : isWash
                    ? "Washing in progress"
                    : "Drying in progress"}
                        </strong>

                        <div class="machine-cycle-progress" aria-hidden="true">
                            <i></i>
                        </div>

                        <small>${progress}% of this cycle</small>
                    </div>
                </div>
            `;
        },
        renderLaundryChange() {
            this.renderGuideAndTracker();
            this.renderSystem();
            this.renderBuddy();
            this.renderActiveLoads();
            this.renderHistory();
            this.syncShellTimers();
        },
        replaceLoad(updatedLoad) {
            if (!updatedLoad?.id || !this.data?.loads) {
                return;
            }
            const index = this.data.loads.findIndex(item => String(item.id) === String(updatedLoad.id));
            if (index >= 0) {
                this.data.loads[index] = {
                    ...this.data.loads[index],
                    ...updatedLoad,
                    metadata: {
                        ...(this.data.loads[index]?.metadata || {}),
                        ...(updatedLoad.metadata || {})
                    }
                };
            }
            else {
                this.data.loads.unshift(updatedLoad);
            }
        },
        optimisticAdvance(load) {
            const now = new Date();
            const metadata = {
                ...(load.metadata || {}),
                stage_updated_at: now.toISOString()
            };
            if (load.stage === "washing") {
                load.stage = "drying";
                const dryMinutes = Math.max(1, Number(metadata.dry_minutes) || 60);
                metadata.timer_ends_at =
                    new Date(now.getTime() + dryMinutes * 60000).toISOString();
            }
            else if (load.stage === "drying") {
                load.stage = "folding";
                delete metadata.timer_ends_at;
            }
            else if (load.stage === "folding") {
                load.stage = "put_away";
                delete metadata.timer_ends_at;
            }
            else if (load.stage === "put_away") {
                load.stage = "complete";
                load.completed_at = now.toISOString();
                delete metadata.timer_ends_at;
            }
            load.metadata = metadata;
        },
        renderActiveLoads() {
            const grid = document.getElementById("activeLoadsGrid");
            if (!grid || !this.data) {
                return;
            }
            const active = this.activeLoads()
                .sort((a, b) => new Date(a.started_at) - new Date(b.started_at));
            if (!active.length) {
                const suggestions = this.todayLoadSuggestions();
                if (suggestions.length) {
                    grid.innerHTML = suggestions
                        .map(item => `
                            <article class="laundry-suggestion-card">
                                <div class="laundry-suggestion-copy">
                                    <span>${this.escape(item.kicker)}</span>
                                    <h3>${this.escape(item.label)}</h3>
                                    <p>${this.escape(item.message)}</p>
                                </div>

                                <button
                                    type="button"
                                    class="laundry-suggestion-action"
                                    data-start-category="${this.attr(item.key)}"
                                >
                                    Start this load →
                                </button>
                            </article>
                        `)
                        .join("");
                }
                else {
                    grid.innerHTML = `
                        <div class="laundry-empty">
                            <strong>No loads are moving.</strong>
                            <span>
                                HOME OS does not have a scheduled load for today.
                                Start whichever group needs attention most from your Laundry System below.
                            </span>
                        </div>
                    `;
                }
                return;
            }
            const readyLoad = active.find(load => {
                if (!["washing", "drying"].includes(load.stage)) {
                    return false;
                }
                return this.timerRemaining(load).total <= 0;
            });
            if (!this.selectedLoadId ||
                !active.some(load => String(load.id) === String(this.selectedLoadId))) {
                this.selectedLoadId =
                    readyLoad?.id ||
                        active[0].id;
            }
            const selected = active.find(load => String(load.id) === String(this.selectedLoadId)) ||
                active[0];
            grid.innerHTML = `
                <div class="laundry-machine-bay">
                    <div class="laundry-queue-shell">
                        <div class="laundry-queue-head">
                            <div>
                                <span class="laundry-kicker">ACTIVE QUEUE</span>
                                <strong>
                                    ${active.length}
                                    ${active.length === 1 ? "load" : "loads"} in motion
                                </strong>
                            </div>

                            <span class="laundry-queue-live">
                                <i></i>
                                LIVE
                            </span>
                        </div>

                        <div class="laundry-load-queue">
                            ${active.map((load, index) => {
                const remaining = this.timerRemaining(load);
                const timed = ["washing", "drying"].includes(load.stage);
                const due = timed &&
                    remaining.total <= 0;
                const selectedClass = String(load.id) ===
                    String(selected.id)
                    ? "is-selected"
                    : "";
                return `
                                        <button
                                            type="button"
                                            class="laundry-queue-item ${selectedClass} ${due ? "is-ready" : ""}"
                                            data-select-load="${this.attr(load.id)}"
                                        >
                                            <span class="queue-number">
                                                ${String(index + 1).padStart(2, "0")}
                                            </span>

                                            <span class="queue-copy">
                                                <strong>${this.escape(load.name)}</strong>
                                                <small>
                                                    ${due
                    ? (load.stage === "washing"
                        ? "Washer finished"
                        : "Dryer finished")
                    : `${this.escape(this.stageLabel(load.stage))} · ${timed
                        ? remaining.display
                        : "Ready for you"}`}
                                                </small>
                                            </span>

                                            <span class="queue-stage">
                                                ${this.escape(this.stageLabel(load.stage))}
                                            </span>
                                        </button>
                                    `;
            }).join("")}
                        </div>
                    </div>

                    <div class="laundry-selected-load">
                        ${this.loadCard(selected)}
                    </div>
                </div>
            `;
        },
        loadCard(load) {
            const area = this.areaById(load.laundry_area_id);
            const person = this.personById(load.assigned_family_member_id);
            const timed = ["washing", "drying"].includes(load.stage);
            const remaining = this.timerRemaining(load);
            const due = timed && remaining.total <= 0;
            const nextLabel = ({
                washing: "Move to dryer",
                drying: "Ready to fold",
                folding: "Folded",
                put_away: "Put away ✓"
            })[load.stage] || "Next";
            const meta = [
                area?.name,
                person?.display_name
            ].filter(Boolean).join(" · ");
            return `
                <article
                    class="laundry-load-card laundry-load-console laundry-load-focus ${due ? "is-due" : ""}"
                    data-load-id="${this.attr(load.id)}"
                    data-stage="${this.attr(load.stage)}"
                >
                    <div class="laundry-focus-header">
                        <div>
                            <span class="laundry-kicker">
                                ${due
                ? (load.stage === "washing"
                    ? "WASHER FINISHED"
                    : "DRYER FINISHED")
                : timed
                    ? "MACHINE CYCLE // LIVE"
                    : "HANDOFF // READY"}
                            </span>

                            <h3>${this.escape(load.name)}</h3>
                            <p>${this.escape(meta || "Household laundry")}</p>
                        </div>

                        <div class="laundry-focus-time">
                            <span>
                                ${timed
                ? due
                    ? "READY NOW"
                    : "TIME LEFT"
                : "CURRENT STEP"}
                            </span>

                            <strong>
                                ${timed
                ? due
                    ? "00:00"
                    : remaining.display
                : this.escape(this.stageLabel(load.stage))}
                            </strong>
                        </div>
                    </div>

                    <div class="laundry-focus-body">
                        ${timed
                ? this.machineVisual(load, due)
                : `
                                    <div class="laundry-handoff-console">
                                        <span>
                                            ${load.stage === "folding"
                    ? "MACHINE WORK IS DONE"
                    : "LAST STEP"}
                                        </span>

                                        <strong>
                                            ${load.stage === "folding"
                    ? "Fold it while it is still warm."
                    : "Get it out of the basket and back home."}
                                        </strong>
                                    </div>
                                `}
                    </div>

                    <div class="laundry-focus-footer">
                        <div class="laundry-stage-track compact">
                            ${this.STAGES.map(stage => {
                const index = this.STAGES.indexOf(stage);
                const current = this.STAGES.indexOf(load.stage);
                const cls = index < current
                    ? "done"
                    : index === current
                        ? "current"
                        : "";
                return `
                                        <div class="laundry-stage-step ${cls}">
                                            ${this.escape(this.stageLabel(stage))}
                                            <small>
                                                ${index < current
                    ? "done"
                    : index === current
                        ? "now"
                        : "next"}
                                            </small>
                                        </div>
                                    `;
            }).join("")}
                        </div>

                        <div class="laundry-load-actions">
                            ${timed
                ? `
                                        <button
                                            type="button"
                                            data-add-time="${this.attr(load.id)}"
                                        >
                                            +5 min
                                        </button>
                                    `
                : ""}

                            <button
                                type="button"
                                data-remove-load="${this.attr(load.id)}"
                            >
                                Remove
                            </button>

                            <button
                                type="button"
                                class="primary"
                                data-next-stage="${this.attr(load.id)}"
                            >
                                ${this.escape(nextLabel)} →
                            </button>
                        </div>
                    </div>
                </article>
            `;
        },
        renderHistory() {
            const list = document.getElementById("laundryHistoryList");
            if (!list) {
                return;
            }
            const history = this.history().slice(0, 12);
            this.setText("laundryHistorySummary", history.length
                ? `${history.length} recent completed ${history.length === 1 ? "load" : "loads"}`
                : "No completed loads yet");
            list.innerHTML = history.length
                ? history.map(load => `
                    <div class="laundry-history-row">
                        <div>
                            <h3>${this.escape(load.name)}</h3>
                            <p>
                                ${this.escape(this.areaById(load.laundry_area_id)?.name || "Laundry")}
                            </p>
                        </div>

                        <div class="laundry-history-actions">
                            <time>${this.escape(this.formatDateTime(load.completed_at))}</time>

                            <button
                                type="button"
                                data-undo-washed="${this.attr(load.id)}"
                                data-undo-label="${this.attr(load.name)}"
                            >
                                ↶ Undo
                            </button>
                        </div>
                    </div>
                `).join("")
                : `
                    <div class="laundry-empty">
                        <strong>Nothing here yet.</strong>
                        <span>Completed loads will quietly collect here.</span>
                    </div>
                `;
        },
        renderDialogOptions() {
            const areaSelect = document.getElementById("loadAreaInput");
            const personSelect = document.getElementById("loadAssigneeInput");
            if (areaSelect) {
                areaSelect.innerHTML = this.areas()
                    .map(area => `
                        <option value="${this.attr(area.id)}">
                            ${this.escape(area.name)}
                        </option>
                    `)
                    .join("");
                if (this.selectedAreaId) {
                    areaSelect.value = this.selectedAreaId;
                }
            }
            if (personSelect) {
                personSelect.innerHTML = `
                    <option value="">Anyone</option>
                    ${this.people()
                    .map(person => `
                                <option value="${this.attr(person.id)}">
                                    ${this.escape(person.display_name)}
                                </option>
                            `)
                    .join("")}
                `;
            }
            this.populateCategorySelect();
            this.syncDialogTimes();
        },
        populateCategorySelect() {
            const select = document.getElementById("loadCategoryInput");
            if (!select) {
                return;
            }
            const area = this.areaById(document.getElementById("loadAreaInput")?.value) || this.primaryArea();
            select.innerHTML = this.categories(area)
                .map(([key, label]) => `
                    <option value="${this.attr(key)}">
                        ${this.escape(label)}
                    </option>
                `)
                .join("");
            if (this.preselectedCategoryKey &&
                [...select.options].some(option => option.value === this.preselectedCategoryKey)) {
                select.value = this.preselectedCategoryKey;
            }
        },
        syncDialogTimes() {
            const area = this.areaById(document.getElementById("loadAreaInput")?.value) || this.primaryArea();
            if (!area) {
                return;
            }
            const wash = document.getElementById("loadWashMinutes");
            const dry = document.getElementById("loadDryMinutes");
            if (wash) {
                wash.value = Math.max(1, Number(area.wash_minutes) || 45);
            }
            if (dry) {
                dry.value = Math.max(1, Number(area.dry_minutes) || 60);
            }
        },
        openLoadDialog(categoryKey = null) {
            const dialog = document.getElementById("loadDialog");
            if (!dialog) {
                return;
            }
            if (!this.areas().length) {
                this.notify("Add your laundry area and sorting system in Home Setup first.", "attention");
                return;
            }
            this.preselectedCategoryKey = categoryKey;
            this.renderDialogOptions();
            dialog.showModal();
        },
        closeLoadDialog() {
            document.getElementById("loadDialog")?.close();
            this.preselectedCategoryKey = null;
        },
        async markWashed(categoryKey) {
            const area = this.primaryArea();
            if (!area) {
                return;
            }
            const item = this.categories(area)
                .find(([key]) => key === categoryKey);
            if (!item) {
                return;
            }
            const [, label] = item;
            const result = await service.markCategoryCompleted({
                name: label,
                laundryAreaId: area.id,
                assignedFamilyMemberId: null,
                categoryKey,
                laundrySystem: this.areaSystem(area)
            });
            if (result.error) {
                console.error(result.error);
                this.notify(result.error.message || "HOME OS could not mark that load washed.", "attention");
                return;
            }
            if (result.data) {
                this.replaceLoad(result.data);
            }
            this.renderLaundryChange();
            this.buddyHop("small");
            this.notify(`${label} is marked washed. The basket just got a little lighter.`, "success");
        },
        async startLoad() {
            const area = this.areaById(document.getElementById("loadAreaInput")?.value) || this.primaryArea();
            const select = document.getElementById("loadCategoryInput");
            if (!area || !select?.value) {
                return;
            }
            const label = select.options[select.selectedIndex]?.textContent ||
                "Laundry Load";
            const result = await service.startLoad({
                name: label,
                laundryAreaId: area.id,
                assignedFamilyMemberId: document.getElementById("loadAssigneeInput")?.value ||
                    null,
                categoryKey: select.value,
                laundrySystem: this.areaSystem(area),
                washMinutes: Number(document.getElementById("loadWashMinutes")?.value) ||
                    Number(area.wash_minutes) ||
                    45,
                dryMinutes: Number(document.getElementById("loadDryMinutes")?.value) ||
                    Number(area.dry_minutes) ||
                    60
            });
            if (result.error) {
                console.error(result.error);
                this.notify(result.error.message || "HOME OS could not start this load.", "attention");
                return;
            }
            this.closeLoadDialog();
            if (result.data) {
                this.replaceLoad(result.data);
            }
            this.renderLaundryChange();
            this.notify(`${label} is washing. HOME OS is watching the timer.`, "success");
        },
        async advanceLoad(id, button = null) {
            const load = this.activeLoads()
                .find(item => String(item.id) === String(id));
            if (!load) {
                return;
            }
            const before = load.stage;
            const snapshot = JSON.parse(JSON.stringify(load));
            if (button) {
                button.disabled = true;
                button.classList.add("is-working");
                button.textContent = "Moving…";
            }
            // Make the interface respond immediately. Supabase confirms it
            // underneath; if it fails, reload() restores the real record.
            this.optimisticAdvance(load);
            this.renderLaundryChange();
            this.buddyHop(before === "put_away"
                ? "big"
                : "small");
            const result = await service.advanceLoad(id);
            if (result.error) {
                console.error(result.error);
                // Restore instantly, then reconcile with the database.
                Object.assign(load, snapshot);
                await this.reload();
                this.notify(result.error.message || "HOME OS could not move this load.", "attention");
                return;
            }
            if (result.data) {
                this.replaceLoad(result.data);
            }
            this.renderLaundryChange();
            const message = before === "washing"
                ? `${snapshot.name} is drying now. The dryer timer has started.`
                : before === "drying"
                    ? `${snapshot.name} is ready to fold.`
                    : before === "folding"
                        ? `${snapshot.name} is folded. One last step: put it away.`
                        : `${snapshot.name} is completely put away.`;
            this.notify(message, before === "put_away" ? "success" : "info");
            if (before === "put_away") {
                this.buddyHop("big");
                this.showLaundryCelebration(snapshot.name);
            }
        },
        async addTime(id) {
            const load = this.activeLoads()
                .find(item => String(item.id) === String(id));
            if (!load) {
                return;
            }
            const previousEnd = load.metadata?.timer_ends_at || null;
            const base = previousEnd
                ? new Date(previousEnd)
                : new Date();
            const safeBase = Number.isNaN(base.getTime())
                ? new Date()
                : base;
            load.metadata = {
                ...(load.metadata || {}),
                timer_ends_at: new Date(safeBase.getTime() + 5 * 60000).toISOString()
            };
            this.renderActiveLoads();
            this.syncShellTimers();
            const result = await service.extendTimer(id, 5);
            if (result.error) {
                load.metadata.timer_ends_at = previousEnd;
                this.renderActiveLoads();
                return this.notify("HOME OS could not extend the timer.", "attention");
            }
            if (result.data) {
                this.replaceLoad(result.data);
            }
            this.renderActiveLoads();
            this.syncShellTimers();
            this.notify("Added 5 minutes.", "info");
        },
        async undoCompletedLoad(id, label = "Laundry load") {
            const load = this.loads()
                .find(item => String(item.id) === String(id));
            if (!load) {
                return;
            }
            const snapshot = JSON.parse(JSON.stringify(load));
            this.data.loads = this.data.loads.filter(item => String(item.id) !== String(id));
            this.renderLaundryChange();
            const result = await service.removeLoad(this.state.household.id, id);
            if (result.error) {
                // Put the record back locally if Supabase rejects the delete.
                this.data.loads.push(snapshot);
                this.renderLaundryChange();
                return this.notify(result.error.message ||
                    "HOME OS could not undo that laundry completion.", "attention");
            }
            this.notify(`${label} is back in the waiting pile. HOME OS will no longer count it as completed.`, "info");
        },
        async removeLoad(id) {
            const result = await service.removeLoad(this.state.household.id, id);
            if (result.error) {
                return this.notify(result.error.message || "HOME OS could not remove this load.", "attention");
            }
            await this.reload();
        },
        syncShellTimers() {
            if (!this.state?.household?.id || !this.data) {
                return;
            }
            let existing = [];
            try {
                const parsed = JSON.parse(localStorage.getItem(this.TIMER_KEY) || "[]");
                existing = Array.isArray(parsed) ? parsed : [];
            }
            catch (_) { }
            const householdId = String(this.state.household.id);
            const keepOtherHomes = existing.filter(timer => String(timer.householdId || "") !== householdId);
            const oldMap = new Map(existing
                .filter(timer => String(timer.householdId || "") === householdId)
                .map(timer => [
                `${timer.loadId}:${timer.stage}:${timer.endsAt}`,
                timer
            ]));
            const own = this.activeLoads()
                .filter(load => ["washing", "drying"].includes(load.stage) &&
                load.metadata?.timer_ends_at)
                .map(load => {
                const key = `${load.id}:${load.stage}:${load.metadata.timer_ends_at}`;
                const old = oldMap.get(key);
                return {
                    householdId,
                    loadId: load.id,
                    name: load.name,
                    stage: load.stage,
                    endsAt: load.metadata.timer_ends_at,
                    notified: Boolean(old?.notified),
                    notifiedAt: old?.notifiedAt || null
                };
            });
            localStorage.setItem(this.TIMER_KEY, JSON.stringify([
                ...keepOtherHomes,
                ...own
            ]));
        },
        timerRemaining(load) {
            const end = new Date(load.metadata?.timer_ends_at || "").getTime();
            if (!Number.isFinite(end)) {
                return {
                    total: 0,
                    display: "--:--"
                };
            }
            const total = Math.max(0, end - Date.now());
            const minutes = Math.floor(total / 60000);
            const seconds = Math.floor((total % 60000) / 1000);
            return {
                total,
                display: `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
            };
        },
        stageLabel(stage) {
            return ({
                washing: "Wash",
                drying: "Dry",
                folding: "Fold",
                put_away: "Put Away",
                complete: "Complete"
            })[stage] || "Wash";
        },
        bind() {
            document.addEventListener("click", event => {
                const start = event.target.closest("#startLoadButton");
                if (start) {
                    return this.openLoadDialog();
                }
                const category = event.target.closest("[data-start-category]");
                if (category) {
                    return this.openLoadDialog(category.dataset.startCategory);
                }
                const washed = event.target.closest("[data-mark-washed]");
                if (washed && !washed.disabled) {
                    return this.markWashed(washed.dataset.markWashed);
                }
                const undo = event.target.closest("[data-undo-washed]");
                if (undo) {
                    return this.undoCompletedLoad(undo.dataset.undoWashed, undo.dataset.undoLabel || "Laundry load");
                }
                const selectedLoad = event.target.closest("[data-select-load]");
                if (selectedLoad) {
                    this.selectedLoadId =
                        selectedLoad.dataset.selectLoad;
                    this.renderActiveLoads();
                    return;
                }
                const next = event.target.closest("[data-next-stage]");
                if (next) {
                    return this.advanceLoad(next.dataset.nextStage, next);
                }
                const add = event.target.closest("[data-add-time]");
                if (add) {
                    return this.addTime(add.dataset.addTime, add);
                }
                const remove = event.target.closest("[data-remove-load]");
                if (remove) {
                    return this.removeLoad(remove.dataset.removeLoad);
                }
                if (event.target.closest("[data-close-load]")) {
                    return this.closeLoadDialog();
                }
                if (event.target.closest("[data-close-laundry-celebration]")) {
                    return this.closeLaundryCelebration();
                }
            });
            document.getElementById("loadForm")
                ?.addEventListener("submit", event => {
                event.preventDefault();
                this.startLoad();
            });
            document.getElementById("loadAreaInput")
                ?.addEventListener("change", event => {
                this.selectedAreaId = event.target.value;
                this.populateCategorySelect();
                this.syncDialogTimes();
            });
            window.addEventListener("homeos:laundry-timer-due", () => {
                this.renderActiveLoads();
                this.renderGuideAndTracker();
            });
        },
        notify(message, tone = "info") {
            if (window.HomeOS.ui?.notify) {
                window.HomeOS.ui.notify(message, {
                    title: tone === "success"
                        ? "Laundry updated"
                        : tone === "attention"
                            ? "Laundry needs you"
                            : "Laundry",
                    tone,
                    duration: tone === "attention"
                        ? 9000
                        : 3600
                });
                return;
            }
            const toast = document.getElementById("appToast");
            if (!toast) {
                return;
            }
            toast.textContent = message;
            toast.classList.add("show");
            setTimeout(() => toast.classList.remove("show"), 3000);
        },
        sameLocalDay(a, b) {
            return (a.getFullYear() === b.getFullYear() &&
                a.getMonth() === b.getMonth() &&
                a.getDate() === b.getDate());
        },
        relativeDate(value) {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return "recently";
            }
            const days = Math.floor((Date.now() - date.getTime()) / 86400000);
            if (days <= 0) {
                return "today";
            }
            if (days === 1) {
                return "yesterday";
            }
            return `${days} days ago`;
        },
        formatDateTime(value) {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return "";
            }
            return date.toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit"
            });
        },
        slug(value) {
            return String(value || "")
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_+|_+$/g, "");
        },
        setText(id, value) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = String(value ?? "");
            }
        },
        escape(value) {
            return String(value ?? "")
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
    window.HomeOS = window.HomeOS || {};
    await App.init();
});
