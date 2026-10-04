/* ============================================================
   HOMEOS // CALENDAR

   Calendar loading, views, events and household timeline UI.
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";
    const service = window.HomeOS?.services?.calendar;
    if (!service) {
        console.error("[HOME OS] Calendar service is unavailable.");
        return;
    }
    const CATEGORY_ORDER = [
        "family",
        "birthday",
        "grocery",
        "appointment",
        "kids",
        "school",
        "sports",
        "faith",
        "home",
        "social",
        "travel",
        "other"
    ];
    const CATEGORIES = {
        family: { label: "Family", color: "#dc8ba7" },
        birthday: { label: "Birthday", color: "#d4af37" },
        grocery: { label: "Groceries + Errands", color: "#78b68d" },
        appointment: { label: "Appointment", color: "#ee7e70" },
        kids: { label: "Kids", color: "#9b86df" },
        school: { label: "School", color: "#5fa9cf" },
        sports: { label: "Sports", color: "#63b9b0" },
        faith: { label: "Faith + Church", color: "#c59a62" },
        home: { label: "Home + Hosting", color: "#9c91a9" },
        social: { label: "Social", color: "#d57ab5" },
        travel: { label: "Travel", color: "#6f91dc" },
        other: { label: "Other", color: "#8c94a4" }
    };
    const PERSON_PALETTE = [
        "#5f8fe8",
        "#d87fa3",
        "#5eb3a7",
        "#9a7bd8",
        "#c9895e",
        "#7380ca",
        "#b68d5b",
        "#d06f74"
    ];
    // Exact Fall leaf artwork used by HOME OS Seasons.
    // Keep Calendar and the Fall Refresh page visually in sync.
    const FALL_LEAF_SVGS = [
        "https://peppy-horse-0fee5a.netlify.app/leaf1.svg",
        "https://peppy-horse-0fee5a.netlify.app/leaf2.svg",
        "https://peppy-horse-0fee5a.netlify.app/leaf3.svg",
        "https://peppy-horse-0fee5a.netlify.app/leaf4.svg"
    ];
    const randomRange = (min, max) => Math.random() * (max - min) + min;
    const App = {
        state: null,
        view: "month",
        viewDate: new Date(),
        selectedDate: new Date(),
        events: [],
        people: [],
        seasonal: null,
        rhythm: null,
        cleaning: null,
        kidModeId: new URLSearchParams(window.location.search).get("kid") || null,
        personFocusId: null,
        filters: new Set(CATEGORY_ORDER),
        editingId: null,
        selectedEvent: null,
        manualTableUnavailable: false,
        async init() {
            this.state = await window.HomeOS.session.guard();
            if (!this.state?.authenticated || !this.state?.household?.id)
                return;
            this.viewDate = this.startOfDay(new Date());
            this.selectedDate = this.startOfDay(new Date());
            this.bind();
            this.renderFilters();
            this.renderPulseDate();
            this.renderSeasonTheme();
            await this.load();
        },
        householdId() {
            return this.state?.household?.id || null;
        },
        notify(message, type = "info") {
            if (window.HomeOS?.ui?.notify) {
                window.HomeOS.ui.notify(message, { type });
                return;
            }
            const toast = document.getElementById("appToast");
            if (!toast)
                return;
            toast.textContent = message;
            toast.classList.add("show");
            clearTimeout(this.toastTimer);
            this.toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
        },
        startOfDay(date) {
            return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
        },
        addDays(date, amount) {
            const copy = new Date(date);
            copy.setDate(copy.getDate() + amount);
            return copy;
        },
        dateKey(date) {
            return service.dateKey(date);
        },
        sameDay(a, b) {
            return this.dateKey(a) === this.dateKey(b);
        },
        category(category) {
            return CATEGORIES[category] || CATEGORIES.other;
        },
        seasonForDate(date = this.viewDate) {
            const month = Number(date?.getMonth?.() ?? new Date().getMonth());
            if ([11, 0, 1].includes(month))
                return "winter";
            if ([2, 3, 4].includes(month))
                return "spring";
            if ([5, 6, 7].includes(month))
                return "summer";
            return "fall";
        },
        seasonMeta(season) {
            const seasons = {
                spring: {
                    icon: "🌸",
                    name: "SPRING MODE",
                    copy: "Spring atmosphere synced with Seasons · March — May"
                },
                summer: {
                    icon: "☀️",
                    name: "SUMMER MODE",
                    copy: "Summer atmosphere synced with Seasons · June — August"
                },
                fall: {
                    icon: "🍂",
                    name: "FALL MODE",
                    copy: "Fall atmosphere synced with Seasons · September — November"
                },
                winter: {
                    icon: "❄️",
                    name: "WINTER MODE",
                    copy: "Winter atmosphere synced with Seasons · December — February"
                }
            };
            return seasons[season] || seasons.fall;
        },
        renderSeasonTheme() {
            const season = this.seasonForDate(this.viewDate);
            const previous = document.body.dataset.calendarSeason;
            document.body.dataset.calendarSeason = season;
            const meta = this.seasonMeta(season);
            this.text("calendarSeasonIcon", meta.icon);
            this.text("calendarSeasonName", meta.name);
            this.text("calendarSeasonCopy", meta.copy);
            const host = document.getElementById("calendarSeasonParticles");
            if (host && (host.dataset.season !== season || !host.children.length)) {
                // Spring uses the exact same interactive Bloom component as
                // Seasons > Spring Renewal. Tear it down cleanly before the
                // viewed month changes into another season.
                window.HomeOS?.components?.springBloom?.destroy?.(host);
                host.innerHTML = "";
                host.dataset.season = season;
                if (season === "fall") {
                    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                    const count = reducedMotion ? 6 : window.innerWidth < 760 ? 10 : 18;
                    host.innerHTML = Array.from({ length: count }, (_, index) => {
                        const size = randomRange(30, 58);
                        const left = randomRange(-3, 97);
                        const driftOne = randomRange(-135, 135);
                        const driftTwo = randomRange(-180, 180);
                        const duration = randomRange(13, 22);
                        const delay = reducedMotion ? 0 : -randomRange(0, duration);
                        const rotateStart = randomRange(-150, 150);
                        const rotateMid = rotateStart + randomRange(-110, 110);
                        const rotateEnd = rotateMid + randomRange(130, 330) * (Math.random() > .5 ? 1 : -1);
                        const opacity = randomRange(.38, .68);
                        const source = FALL_LEAF_SVGS[index % FALL_LEAF_SVGS.length];
                        return `
                            <span
                                class="calendar-fall-leaf"
                                style="--leaf-size:${size}px;--leaf-left:${left}%;--leaf-drift-one:${driftOne}px;--leaf-drift-two:${driftTwo}px;--leaf-duration:${duration}s;--leaf-delay:${delay}s;--leaf-rotate-start:${rotateStart}deg;--leaf-rotate-mid:${rotateMid}deg;--leaf-rotate-end:${rotateEnd}deg;--leaf-opacity:${opacity.toFixed(2)}"
                            ><img src="${source}" alt="" draggable="false"></span>
                        `;
                    }).join("");
                }
                else if (season === "spring") {
                    const bloom = window.HomeOS?.components?.springBloom;
                    if (bloom?.mount) {
                        bloom.mount(host, {
                            mode: "calendar",
                            maxFlowers: window.innerWidth < 760 ? 34 : 54,
                            maxPetals: window.innerWidth < 760 ? 140 : 220
                        });
                    }
                    else {
                        // Use simple petals if the shared bloom effect is unavailable.
                        host.innerHTML = Array.from({ length: 12 }, (_, index) => `<span class="calendar-spring-petal petal-${String(index + 1).padStart(2, "0")}"></span>`).join("");
                    }
                }
                else if (season === "summer") {
                    host.innerHTML = Array.from({ length: 16 }, (_, index) => `<span class="calendar-summer-lemon lemon-${String(index + 1).padStart(2, "0")}"></span>`).join("");
                }
                else {
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
                    const layer = (name, flakes) => `
                        <div class="calendar-winter-snow calendar-winter-snow--${name}">
                            ${flakes.map(([x, fall, delay, drift], index) => `<span class="calendar-winter-flake" style="--snow-x:${x};--snow-fall:${fall}s;--snow-delay:${delay}s;--snow-drift:${drift}vw;--snow-index:${index};"></span>`).join("")}
                        </div>`;
                    host.innerHTML = layer("far", far) + layer("mid", mid) + layer("near", near);
                }
            }
            if (previous && previous !== season) {
                const board = document.getElementById("calendarBoard");
                board?.classList.remove("calendar-board-season-swap");
                requestAnimationFrame(() => board?.classList.add("calendar-board-season-swap"));
            }
        },
        validHexColor(value) {
            const color = String(value || "").trim();
            return /^#[0-9a-f]{6}$/i.test(color) ? color : null;
        },
        calendarPersonColor(person) {
            if (!person)
                return "#8c94a4";
            const saved = this.validHexColor(person.color);
            if (saved)
                return saved;
            const index = Math.max(0, this.people.findIndex(item => String(item.id) === String(person.id)));
            return PERSON_PALETTE[index % PERSON_PALETTE.length];
        },
        personForEvent(event) {
            if (!event?.familyMemberId)
                return null;
            return this.people.find(person => String(person.id) === String(event.familyMemberId)) || null;
        },
        eventVisual(event) {
            const categoryColor = this.category(event?.category).color;
            const person = this.personForEvent(event);
            const personColor = person ? this.calendarPersonColor(person) : categoryColor;
            const savedEventColor = this.validHexColor(event?.eventColor || event?.raw?.event_color);
            const eventColor = event?.category === "birthday"
                ? CATEGORIES.birthday.color
                : (savedEventColor || (person ? personColor : categoryColor));
            return { categoryColor, personColor, eventColor, person };
        },
        colorStyle(event, variable = "--event-color") {
            const visual = this.eventVisual(event);
            return `${variable}:${visual.eventColor};--person-color:${visual.personColor};--category-color:${visual.categoryColor}`;
        },
        birthdayFireworksMarkup() {
            const burst = (className, delay) => `
                <span class="calendar-birthday-burst ${className}" style="--burst-delay:${delay}s">
                    ${Array.from({ length: 12 }, (_, index) => `
                        <i style="--spark-angle:${index * 30}deg"></i>
                    `).join("")}
                </span>
            `;
            return `
                <div class="calendar-birthday-fireworks" aria-hidden="true">
                    ${burst("burst-one", 0)}
                    ${burst("burst-two", 1.05)}
                    ${burst("burst-three", 2.1)}
                </div>
            `;
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
        },
        pretty(value) {
            return String(value || "")
                .replace(/_/g, " ")
                .replace(/\b\w/g, character => character.toUpperCase());
        },
        viewRange() {
            if (this.view === "day") {
                const start = this.startOfDay(this.viewDate);
                return { start, end: this.addDays(start, 1) };
            }
            if (this.view === "week") {
                const start = this.startOfWeek(this.viewDate);
                return { start, end: this.addDays(start, 7) };
            }
            const first = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), 1);
            const start = this.startOfWeek(first);
            return { start, end: this.addDays(start, 42) };
        },
        loadRange() {
            const view = this.viewRange();
            const today = this.startOfDay(new Date());
            const pulseEnd = this.addDays(today, 61);
            return {
                start: new Date(Math.min(view.start.getTime(), today.getTime())),
                end: new Date(Math.max(view.end.getTime(), pulseEnd.getTime()))
            };
        },
        startOfWeek(date) {
            const copy = this.startOfDay(date);
            copy.setDate(copy.getDate() - copy.getDay());
            return copy;
        },
        async load() {
            const board = document.getElementById("calendarBoard");
            if (board) {
                board.innerHTML = `
                    <div class="calendar-loading">
                        <div>
                            <strong>Syncing your household events…</strong>
                            <span>Birthdays, groceries, appointments and family plans are meeting here.</span>
                        </div>
                    </div>
                `;
            }
            const range = this.loadRange();
            const result = await service.getCalendarRange(this.householdId(), range.start, range.end, this.state?.person?.id || null);
            this.events = result.data?.events || [];
            this.people = result.data?.people || [];
            this.seasonal = result.data?.seasonal || null;
            this.rhythm = result.data?.rhythm || null;
            this.cleaning = result.data?.cleaning || null;
            this.manualTableUnavailable = Boolean(result.manualTableUnavailable);
            if (this.kidModeId && !this.childPeople().some(person => String(person.id) === String(this.kidModeId))) {
                this.kidModeId = null;
            }
            if (result.seasonalError) {
                console.warn("[HOME OS Calendar] Seasonal snapshot unavailable:", result.seasonalError);
            }
            const realErrors = (result.errors || []).filter(error => {
                return !/home_calendar_events|relation .* does not exist|could not find the table/i.test(String(error?.message || error || ""));
            });
            if (realErrors.length) {
                console.error("[HOME OS Calendar]", realErrors);
                this.notify("HOME OS loaded the calendar, but part of the event data could not sync.", "warning");
            }
            if (this.manualTableUnavailable) {
                this.notify("Calendar storage is not available yet. Add Event will still open so you can see what needs to be saved.", "warning");
            }
            this.populatePeople();
            this.render();
        },
        isChildPerson(person) {
            return ["child", "teen"].includes(String(person?.member_type || "").toLowerCase());
        },
        adultPeople() {
            return this.people.filter(person => !this.isChildPerson(person));
        },
        childPeople() {
            return this.people.filter(person => this.isChildPerson(person));
        },
        personInitials(person) {
            return String(person?.display_name || "H")
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(part => part[0]?.toUpperCase() || "")
                .join("") || "H";
        },
        filteredEvents() {
            let events = this.events.filter(event => this.filters.has(event.category));
            if (this.kidModeId) {
                events = events.filter(event => !event.familyMemberId || String(event.familyMemberId) === String(this.kidModeId));
            }
            else if (this.personFocusId) {
                events = events.filter(event => !event.familyMemberId || String(event.familyMemberId) === String(this.personFocusId));
            }
            return events;
        },
        eventsOn(date) {
            const key = this.dateKey(date);
            return this.filteredEvents().filter(event => this.dateKey(event.start) === key);
        },
        render() {
            this.renderSeasonTheme();
            this.renderPeriodTitle();
            this.renderBoard();
            this.renderAgenda();
            this.renderBirthdayState();
            this.renderUpcoming();
            this.renderPulse();
            this.renderHomeHealth();
            this.renderCommandDeck();
            this.renderMonthIntelligence();
            this.renderHouseholdCommand();
            this.renderKidMode();
            this.renderViewButtons();
            this.syncIntelligenceLayout();
        },
        syncIntelligenceLayout() {
            const deck = document.querySelector(".calendar-intelligence-deck");
            if (!deck)
                return;
            deck.dataset.view = this.view;
        },
        renderBirthdayState() {
            const today = this.startOfDay(new Date());
            const birthdayToday = this.events.some(event => event.category === "birthday" && this.sameDay(event.start, today));
            document.body.classList.toggle("calendar-birthday-today", birthdayToday);
            // Birthday state is already visible in the calendar itself. Keep the
            // intelligence bar quiet so it does not repeat the same message.
            this.text("calendarPulseStatus", "LIVE");
        },
        renderPulseDate() {
            const today = new Date();
            this.text("calendarPulseWeekday", today.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase());
            this.text("calendarPulseDay", today.getDate());
            this.text("calendarPulseMonth", today.toLocaleDateString(undefined, { month: "long", year: "numeric" }).toUpperCase());
        },
        renderPulse() {
            const visible = this.filteredEvents();
            const next = visible.find(event => event.start >= new Date());
            const nextUp = document.getElementById("calendarNextUp");
            if (!nextUp)
                return;
            if (!next) {
                nextUp.style.setProperty("--next-color", CATEGORIES.family.color);
                nextUp.innerHTML = `
                    <span>NEXT SIGNAL</span>
                    <strong>Your visible timeline is clear.</strong>
                    <small>Add a household event to bring this timeline to life.</small>
                `;
                return;
            }
            nextUp.style.setProperty("--next-color", this.eventVisual(next).eventColor);
            nextUp.innerHTML = `
                <span>NEXT SIGNAL // ${this.escape(this.category(next.category).label)}</span>
                <strong>${this.escape(next.title)}</strong>
                <small>${this.escape(this.whenShort(next))}</small>
            `;
        },
        renderHomeHealth() {
            const rhythm = this.rhythm || {
                available: false,
                completed: 0,
                total: 0,
                percent: 0,
                opening: { percent: 0 },
                closing: { percent: 0 }
            };
            const cleaning = this.cleaning || {
                available: false,
                percent: 0,
                cared: 0,
                total: 0,
                attention: 0,
                activePercent: 0,
                activeLabel: "None"
            };
            const rhythmPercent = Math.max(0, Math.min(100, Number(rhythm.percent) || 0));
            const cleaningPercent = Math.max(0, Math.min(100, Number(cleaning.percent) || 0));
            this.text("calendarRhythmPercent", `${rhythmPercent}%`);
            this.text("calendarRhythmTasks", `${rhythm.completed || 0} / ${rhythm.total || 0} tasks complete`);
            this.text("calendarRhythmShifts", `Opening ${rhythm.opening?.percent || 0}% · Closing ${rhythm.closing?.percent || 0}%`);
            this.text("calendarRhythmStatus", !rhythm.available
                ? "UNAVAILABLE"
                : !rhythm.total
                    ? "READY"
                    : rhythmPercent >= 100
                        ? "COMPLETE"
                        : rhythmPercent >= 60
                            ? "IN FLOW"
                            : rhythmPercent > 0
                                ? "IN PROGRESS"
                                : "READY");
            this.text("calendarRhythmSummary", !rhythm.available
                ? "Open Rhythm to reconnect today’s task signal."
                : !rhythm.total
                    ? "No Daily Rhythm tasks are scheduled for this view yet."
                    : rhythmPercent >= 100
                        ? "Today’s Daily Rhythm is complete."
                        : `${Math.max(0, (rhythm.total || 0) - (rhythm.completed || 0))} task${Math.max(0, (rhythm.total || 0) - (rhythm.completed || 0)) === 1 ? "" : "s"} remain in today’s rhythm.`);
            const rhythmBar = document.getElementById("calendarRhythmProgressBar");
            if (rhythmBar)
                rhythmBar.style.width = `${rhythmPercent}%`;
            this.text("calendarCleaningPercent", `${cleaningPercent}%`);
            this.text("calendarCleaningAreas", `${cleaning.cared || 0} / ${cleaning.total || 0} areas cared for`);
            this.text("calendarCleaningAttention", `${cleaning.attention || 0} ${Number(cleaning.attention || 0) === 1 ? "needs" : "need"} attention`);
            this.text("calendarCleaningStatus", !cleaning.available
                ? "UNAVAILABLE"
                : cleaning.activePercent > 0 && cleaning.activePercent < 100
                    ? "CLEAN ACTIVE"
                    : cleaningPercent >= 85
                        ? "STRONG"
                        : cleaningPercent >= 55
                            ? "STEADY"
                            : "ATTENTION");
            this.text("calendarCleaningSummary", !cleaning.available
                ? "Open Cleaning to reconnect the whole-home signal."
                : cleaning.activePercent > 0 && cleaning.activePercent < 100
                    ? `${cleaning.activeLabel} — every saved checkoff is already moving this percentage.`
                    : !cleaning.total
                        ? "Map rooms in Home Setup to activate Cleaning health."
                        : cleaning.attention > 0
                            ? `${cleaning.attention} mapped area${cleaning.attention === 1 ? "" : "s"} currently need Cleaning attention.`
                            : "The whole-home Cleaning signal is steady.");
            const cleaningBar = document.getElementById("calendarCleaningProgressBar");
            if (cleaningBar)
                cleaningBar.style.width = `${cleaningPercent}%`;
        },
        renderCommandDeck() {
            const seasonal = this.seasonal || {
                season: this.seasonForDate(new Date()),
                year: new Date().getFullYear(),
                status: "ready",
                total: 0,
                completed: 0,
                percent: 0
            };
            const seasonNames = {
                spring: "Spring Refresh",
                summer: "Summer Refresh",
                fall: "Fall Refresh",
                winter: "Winter Refresh"
            };
            const statusLabel = String(seasonal.status || "ready")
                .replace(/_/g, " ")
                .toUpperCase();
            this.text("calendarSeasonalTitle", seasonNames[seasonal.season] || "Seasonal Refresh");
            this.text("calendarSeasonalPercent", `${seasonal.percent || 0}%`);
            this.text("calendarSeasonalStatus", statusLabel);
            this.text("calendarSeasonalTasks", `${seasonal.completed || 0} / ${seasonal.total || 0} seasonal tasks complete`);
            this.text("calendarSeasonalCopy", seasonal.total
                ? "This is the live Seasonal Cleaning reset from HOME OS Seasons."
                : "HOME OS is ready to build this season’s reset from your real home.");
            const bar = document.getElementById("calendarSeasonalProgressBar");
            if (bar)
                bar.style.width = `${Math.max(0, Math.min(100, Number(seasonal.percent) || 0))}%`;
            const link = document.getElementById("calendarSeasonalOpen");
            if (link)
                link.href = `seasons/${seasonal.season || "fall"}.html`;
            const today = this.startOfDay(new Date());
            const days = Array.from({ length: 7 }, (_, index) => this.addDays(today, index));
            const counts = days.map(day => {
                const next = this.addDays(day, 1);
                return this.events.filter(event => event.start >= day && event.start < next).length;
            });
            const total = counts.reduce((sum, count) => sum + count, 0);
            const max = Math.max(1, ...counts);
            const busiest = counts.indexOf(Math.max(...counts));
            this.text("calendarTempoTotal", total);
            this.text("calendarTempoHeadline", total
                ? `${days[busiest].toLocaleDateString(undefined, { weekday: "long" })} is your busiest household day this week.`
                : "Your household timeline is clear for the next seven days.");
            const tempo = document.getElementById("calendarTempoBars");
            if (tempo) {
                tempo.innerHTML = days.map((day, index) => {
                    const height = counts[index] ? Math.max(18, Math.round((counts[index] / max) * 100)) : 8;
                    return `
                        <div class="matrix-tempo-day" title="${this.attr(`${counts[index]} event${counts[index] === 1 ? "" : "s"}`)}">
                            <span class="matrix-tempo-column"><i style="height:${height}%"></i></span>
                            <strong>${day.toLocaleDateString(undefined, { weekday: "narrow" })}</strong>
                            <small>${counts[index]}</small>
                        </div>
                    `;
                }).join("");
            }
        },
        renderMonthIntelligence() {
            const start = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), 1);
            const end = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
            const monthEvents = this.filteredEvents().filter(event => event.start >= start && event.start < end);
            const birthdays = monthEvents.filter(event => event.category === "birthday");
            let focus = "Whole household";
            if (this.kidModeId) {
                focus = this.childPeople().find(person => String(person.id) === String(this.kidModeId))?.display_name || "Kid calendar";
            }
            else if (this.personFocusId) {
                focus = this.adultPeople().find(person => String(person.id) === String(this.personFocusId))?.display_name || "Household member";
            }
            this.text("calendarMonthEventCount", monthEvents.length);
            this.text("calendarMonthBirthdayCount", birthdays.length);
            this.text("calendarFocusLabel", focus);
            const monthName = this.viewDate.toLocaleDateString(undefined, { month: "long" });
            const signal = birthdays.length
                ? `${monthName} carries ${birthdays.length} birthday celebration${birthdays.length === 1 ? "" : "s"} across ${monthEvents.length} household event${monthEvents.length === 1 ? "" : "s"}.`
                : monthEvents.length
                    ? `${monthName} is carrying ${monthEvents.length} household event${monthEvents.length === 1 ? "" : "s"}.`
                    : `${monthName} is open — your household timeline has room to breathe.`;
            this.text("calendarMonthSignal", signal);
        },
        eventsForPerson(personId, days = 7) {
            const today = this.startOfDay(new Date());
            const end = this.addDays(today, days + 1);
            return this.events.filter(event => String(event.familyMemberId || "") === String(personId || "") &&
                event.start >= today &&
                event.start < end);
        },
        async savePersonCalendarColor(personId, color) {
            const valid = this.validHexColor(color);
            if (!personId || !valid)
                return;

            const person = this.people.find(item => String(item.id) === String(personId));
            if (!person)
                return;

            const previousColor = this.calendarPersonColor(person);
            const inputs = document.querySelectorAll(
                `[data-calendar-person-color="${CSS.escape(String(personId))}"]`
            );

            inputs.forEach(input => {
                input.disabled = true;
            });

            const result = await service.savePersonCalendarColor?.(
                this.householdId(),
                personId,
                valid
            );

            inputs.forEach(input => {
                input.disabled = false;
            });

            if (result?.error) {
                console.error(result.error);

                inputs.forEach(input => {
                    input.value = previousColor;
                });

                this.notify(
                    result.error.message || "HOME OS could not save that calendar color.",
                    "warning"
                );
                return;
            }

            person.color = valid;
            this.renderHouseholdCommand();
            this.renderBoard();
            this.renderAgenda();
            this.renderUpcoming();
            this.notify(`${person.display_name}'s calendar color was updated.`, "success");
        },
        renderHouseholdCommand() {
            const adultHost = document.getElementById("calendarAdultMembers");
            const kidHost = document.getElementById("calendarKidMembers");
            const clear = document.getElementById("calendarClearPersonFocus");
            const adults = this.adultPeople();
            const kids = this.childPeople();
            if (clear)
                clear.hidden = !this.personFocusId;
            if (adultHost) {
                adultHost.innerHTML = adults.length
                    ? adults.map(person => {
                        const weekEvents = this.eventsForPerson(person.id, 7);
                        const next = weekEvents[0] || null;
                        const active = String(this.personFocusId || "") === String(person.id);
                        const color = this.calendarPersonColor(person);
                        const relationship = this.pretty(person.relationship_label || "Adult member");
                        return `
                            <div
                                class="matrix-member-row ${active ? "active" : ""}"
                                style="--member-color:${this.attr(color)}"
                            >
                                <button
                                    class="matrix-adult-member"
                                    type="button"
                                    data-calendar-person-focus="${this.attr(person.id)}"
                                >
                                    <span class="matrix-member-avatar">${this.escape(this.personInitials(person))}</span>
                                    <span class="matrix-member-copy">
                                        <strong>${this.escape(person.display_name)}</strong>
                                        <small>${this.escape(relationship)}</small>
                                        <em>${next ? this.escape(`${next.title} · ${this.whenShort(next)}`) : "No personal events in the next 7 days"}</em>
                                    </span>
                                    <span class="matrix-member-load"><strong>${weekEvents.length}</strong><small>7D</small></span>
                                </button>

                                <label class="matrix-member-color" title="Choose ${this.attr(person.display_name)}'s calendar color">
                                    <input
                                        type="color"
                                        value="${this.attr(color)}"
                                        data-calendar-person-color="${this.attr(person.id)}"
                                        aria-label="Choose ${this.attr(person.display_name)}'s calendar color"
                                    >
                                    <span>Color</span>
                                </label>
                            </div>
                        `;
                    }).join("")
                    : `<div class="matrix-member-empty">Add adult household members in Home Settings to see them here.</div>`;
            }
            if (kidHost) {
                kidHost.innerHTML = kids.length
                    ? kids.map(person => {
                        const color = this.calendarPersonColor(person);
                        const count = this.eventsForPerson(person.id, 30).length;
                        return `
                            <div class="matrix-member-row matrix-kid-row" style="--member-color:${this.attr(color)}">
                                <button
                                    class="matrix-kid-member"
                                    type="button"
                                    data-calendar-kid-view="${this.attr(person.id)}"
                                >
                                    <span class="matrix-kid-avatar">${this.escape(this.personInitials(person))}</span>
                                    <span>
                                        <strong>${this.escape(person.display_name)}</strong>
                                        <small>${count} personal event${count === 1 ? "" : "s"} in the next 30 days</small>
                                    </span>
                                    <i aria-hidden="true">→</i>
                                </button>

                                <label class="matrix-member-color" title="Choose ${this.attr(person.display_name)}'s calendar color">
                                    <input
                                        type="color"
                                        value="${this.attr(color)}"
                                        data-calendar-person-color="${this.attr(person.id)}"
                                        aria-label="Choose ${this.attr(person.display_name)}'s calendar color"
                                    >
                                    <span>Color</span>
                                </label>
                            </div>
                        `;
                    }).join("")
                    : `<div class="matrix-member-empty">No child profiles are connected yet.</div>`;
            }
        },
        renderKidMode() {
            const kid = this.kidModeId
                ? this.childPeople().find(person => String(person.id) === String(this.kidModeId))
                : null;
            const banner = document.getElementById("calendarKidModeBanner");
            document.body.classList.toggle("calendar-kid-mode", Boolean(kid));
            if (banner)
                banner.hidden = !kid;
            const title = document.getElementById("calendarTitle");
            const kicker = document.getElementById("calendarLiveKicker");
            const copy = document.getElementById("calendarHeroCopy");
            const addButton = document.getElementById("calendarAddEvent");
            if (!kid) {
                if (title)
                    title.innerHTML = `Calendar <em>Matrix</em>`;
                if (kicker)
                    kicker.textContent = "HOME OS // HOUSEHOLD TIME MATRIX // LIVE";
                if (copy)
                    copy.textContent = "One live view of the moments that move your household — birthdays, groceries, appointments, school, sports, church, hosting and family plans.";
                if (addButton)
                    addButton.innerHTML = `<span aria-hidden="true">＋</span><span><strong>Add Event</strong><small>Create a household moment</small></span>`;
                return;
            }
            if (title)
                title.innerHTML = `${this.escape(kid.display_name)}’s <em>Calendar</em>`;
            if (kicker)
                kicker.textContent = `HOME OS // KIDS CALENDAR // ${String(kid.display_name || "KID").toUpperCase()}`;
            if (copy)
                copy.textContent = "A simpler view of family plans, school, sports, birthdays and events connected to this child.";
            if (addButton)
                addButton.innerHTML = `<span aria-hidden="true">＋</span><span><strong>Add My Event</strong><small>Put something on my calendar</small></span>`;
            this.text("calendarKidModeName", `${kid.display_name}’s Calendar`);
            this.text("calendarKidModeCopy", "Family-wide events and plans assigned to this child are shown here. They can add and manage their own calendar moments too.");
            const avatar = document.getElementById("calendarKidModeAvatar");
            if (avatar) {
                avatar.textContent = this.personInitials(kid);
                avatar.style.setProperty("--member-color", this.calendarPersonColor(kid));
            }
        },
        renderPeriodTitle() {
            let kicker = "MONTH VIEW";
            let title = this.viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
            if (this.view === "week") {
                const start = this.startOfWeek(this.viewDate);
                const end = this.addDays(start, 6);
                kicker = "WEEK VIEW";
                title = `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} — ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
            }
            if (this.view === "day") {
                kicker = "DAY VIEW";
                title = this.viewDate.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric"
                });
            }
            this.text("calendarPeriodKicker", kicker);
            this.text("calendarPeriodTitle", title);
        },
        renderViewButtons() {
            document.querySelectorAll("[data-calendar-view]").forEach(button => {
                button.classList.toggle("active", button.dataset.calendarView === this.view);
            });
        },
        renderFilters() {
            const host = document.getElementById("calendarFilters");
            if (!host)
                return;
            host.innerHTML = CATEGORY_ORDER.map(category => {
                const data = this.category(category);
                return `
                    <button
                        class="calendar-filter-chip"
                        type="button"
                        data-calendar-filter="${this.attr(category)}"
                        aria-pressed="${this.filters.has(category)}"
                        style="--chip-color:${data.color}"
                    >
                        ${this.escape(data.label)}
                    </button>
                `;
            }).join("");
        },
        renderBoard() {
            if (this.view === "week") {
                this.renderWeek();
                return;
            }
            if (this.view === "day") {
                this.renderDay();
                return;
            }
            this.renderMonth();
        },
        renderMonth() {
            const host = document.getElementById("calendarBoard");
            if (!host)
                return;
            const range = this.viewRange();
            const today = this.startOfDay(new Date());
            const cells = [];
            for (let index = 0; index < 42; index += 1) {
                const day = this.addDays(range.start, index);
                const events = this.eventsOn(day);
                const outside = day.getMonth() !== this.viewDate.getMonth();
                const selected = this.sameDay(day, this.selectedDate);
                const isToday = this.sameDay(day, today);
                const visibleEvents = events.slice(0, 3);
                const hasBirthday = events.some(event => event.category === "birthday");
                cells.push(`
                    <article class="calendar-day-cell ${outside ? "outside" : ""} ${selected ? "selected" : ""} ${isToday ? "today" : ""} ${hasBirthday ? "birthday-day" : ""}" data-calendar-date="${this.dateKey(day)}" tabindex="0" aria-label="${this.attr(day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }))}">
                        ${hasBirthday ? this.birthdayFireworksMarkup() : ""}
                        <div class="calendar-day-cell-head">
                            <button
                                type="button"
                                class="calendar-date-button"
                                data-calendar-date="${this.dateKey(day)}"
                                aria-label="${this.attr(day.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }))}"
                            >
                                ${day.getDate()}
                            </button>
                            <button
                                type="button"
                                class="calendar-cell-add"
                                data-calendar-add-date="${this.dateKey(day)}"
                                aria-label="Add event on ${this.attr(day.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }))}"
                                title="Add event"
                            >+</button>
                            
                        </div>
                        <div class="calendar-day-events">
                            ${visibleEvents.map(event => this.eventPill(event)).join("")}
                            ${events.length > 3 ? `
                                <button class="calendar-more-button" type="button" data-calendar-date="${this.dateKey(day)}">
                                    +${events.length - 3} more
                                </button>
                            ` : ""}
                        </div>
                    </article>
                `);
            }
            host.innerHTML = `
                <div class="calendar-month-view">
                    <div class="calendar-weekday-row" aria-hidden="true">
                        ${["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(day => `<span>${day}</span>`).join("")}
                    </div>
                    <div class="calendar-month-grid">
                        ${cells.join("")}
                    </div>
                </div>
            `;
        },
        renderWeek() {
            const host = document.getElementById("calendarBoard");
            if (!host)
                return;
            const start = this.startOfWeek(this.viewDate);
            const today = this.startOfDay(new Date());
            const columns = [];
            for (let index = 0; index < 7; index += 1) {
                const day = this.addDays(start, index);
                const events = this.eventsOn(day);
                const isToday = this.sameDay(day, today);
                const selected = this.sameDay(day, this.selectedDate);
                const hasBirthday = events.some(event => event.category === "birthday");
                const eventCount = events.length;
                columns.push(`
                    <section
                        class="calendar-week-column ${isToday ? "today" : ""} ${selected ? "selected" : ""} ${hasBirthday ? "birthday-day" : ""}"
                        data-calendar-date="${this.dateKey(day)}"
                        tabindex="0"
                        aria-label="${this.attr(day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }))}"
                    >
                        ${hasBirthday ? this.birthdayFireworksMarkup() : ""}
                        <button class="calendar-week-header" type="button" data-calendar-date="${this.dateKey(day)}">
                            <span class="calendar-week-day-name">${day.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase()}</span>
                            <span class="calendar-week-date-lockup">
                                <strong>${day.getDate()}</strong>
                                <small>${day.toLocaleDateString(undefined, { month: "short" }).toUpperCase()}</small>
                            </span>
                            <span class="calendar-week-count">${eventCount ? `${eventCount} ${eventCount === 1 ? "event" : "events"}` : "Open"}</span>
                        </button>

                        <div class="calendar-week-events">
                            ${events.length
                    ? events.map(event => this.weekEvent(event)).join("")
                    : `
                                    <button class="calendar-week-empty" type="button" data-calendar-add-date="${this.dateKey(day)}">
                                        <span aria-hidden="true">＋</span>
                                        <strong>Add event</strong>
                                        <small>Nothing scheduled</small>
                                    </button>
                                `}
                        </div>
                    </section>
                `);
            }
            host.innerHTML = `<div class="calendar-week-grid">${columns.join("")}</div>`;
        },
        renderDay() {
            const host = document.getElementById("calendarBoard");
            if (!host)
                return;
            const events = this.eventsOn(this.viewDate);
            host.innerHTML = `
                <div class="calendar-day-view">
                    <header class="calendar-day-view-heading">
                        <div>
                            <span class="ui-kicker">${this.escape(this.viewDate.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase())}</span>
                            <h2>${this.escape(this.viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" }))}</h2>
                        </div>
                        <strong>${this.viewDate.getDate()}</strong>
                    </header>

                    <div class="calendar-day-view-list">
                        ${events.length
                ? events.map(event => this.dayEvent(event)).join("")
                : `
                                <div class="calendar-agenda-empty">
                                    <strong>Nothing scheduled here.</strong>
                                    <span>This day has room to breathe.</span>
                                </div>
                            `}
                    </div>
                </div>
            `;
        },
        eventPill(event) {
            const birthday = event.category === "birthday";
            const personal = Boolean(event.familyMemberId);
            return `
                <button
                    class="calendar-event-pill ${birthday ? "birthday-event" : ""} ${personal ? "personal-event" : ""}"
                    type="button"
                    data-calendar-event="${this.attr(event.id)}"
                    style="${this.colorStyle(event)}"
                    title="${this.attr(event.title)}"
                >
                    <span class="calendar-event-pill-copy">${event.allDay ? "" : `${this.escape(this.timeOnly(event.start))} · `}${this.escape(event.title)}</span>
                    ${personal ? `<span class="calendar-person-dot" aria-hidden="true"></span>` : ""}
                </button>
            `;
        },
        weekEvent(event) {
            const people = (event.personNames || []).join(", ");
            const birthday = event.category === "birthday";
            const personal = Boolean(event.familyMemberId);
            const meta = people || this.category(event.category).label;
            return `
                <button
                    class="calendar-week-event ${birthday ? "birthday-event" : ""} ${personal ? "personal-event" : ""}"
                    type="button"
                    data-calendar-event="${this.attr(event.id)}"
                    style="${this.colorStyle(event)}"
                >
                    <span class="calendar-week-event-time">${this.escape(event.allDay ? "ALL DAY" : this.timeOnly(event.start))}</span>
                    <strong>${this.escape(event.title)}</strong>
                    <small>${this.escape(meta)}</small>
                    ${personal ? `<span class="calendar-person-dot" aria-hidden="true"></span>` : ""}
                </button>
            `;
        },
        dayEvent(event) {
            const people = (event.personNames || []).join(", ");
            return `
                <button
                    class="calendar-day-event-card ${event.category === "birthday" ? "birthday-event" : ""}"
                    type="button"
                    data-calendar-event="${this.attr(event.id)}"
                    style="${this.colorStyle(event)}"
                >
                    <span class="calendar-day-event-time">${this.escape(event.allDay ? "ALL DAY" : this.timeOnly(event.start))}</span>
                    <span>
                        <strong>${this.escape(event.title)}</strong>
                        <small>${this.escape(people || event.location || "Whole household")}</small>
                    </span>
                    <span class="calendar-day-event-tag">${this.escape(this.category(event.category).label)}</span>
                </button>
            `;
        },
        renderAgenda() {
            const date = this.selectedDate;
            const events = this.eventsOn(date);
            this.text("calendarAgendaDate", date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }));
            const birthdayDay = events.some(event => event.category === "birthday");
            document.querySelector(".matrix-intelligence-rail")?.classList.toggle("birthday-active", birthdayDay);
            this.text("calendarAgendaSummary", birthdayDay
                ? "A birthday celebration is scheduled for this day."
                : events.length
                    ? `${events.length} ${events.length === 1 ? "thing" : "things"} touching your home on this day.`
                    : "A clear day in the household timeline.");
            const host = document.getElementById("calendarAgendaList");
            if (!host)
                return;
            if (!events.length) {
                host.innerHTML = `
                    <div class="calendar-agenda-empty">
                        <strong>Nothing scheduled.</strong>
                        <span>Use + Add Event if something belongs here.</span>
                    </div>
                `;
                return;
            }
            host.innerHTML = events.map(event => {
                const person = (event.personNames || []).join(", ") || "Whole household";
                return `
                    <button
                        class="calendar-agenda-event ${event.category === "birthday" ? "birthday-event" : ""}"
                        type="button"
                        data-calendar-event="${this.attr(event.id)}"
                        style="${this.colorStyle(event)}"
                    >
                        <span aria-hidden="true"></span>
                        <span>
                            <span>${this.escape(this.whenShort(event))}</span>
                            <strong>${this.escape(event.title)}</strong>
                            <span>${this.escape(person)}</span>
                        </span>
                    </button>
                `;
            }).join("");
        },
        renderUpcoming() {
            const host = document.getElementById("calendarUpcomingList");
            if (!host)
                return;
            // The selected day's events are already shown either in the calendar
            // grid/day view or in Selected Day below. Start this list tomorrow so
            // the same event is never repeated in both places.
            const selected = this.startOfDay(this.selectedDate || new Date());
            const anchor = this.addDays(selected, 1);
            const end = this.addDays(anchor, 7);
            const upcoming = this.filteredEvents()
                .filter(event => event.start >= anchor && event.start < end)
                .slice(0, 6);
            if (!upcoming.length) {
                host.innerHTML = `<div class="calendar-agenda-empty"><span>No household events in the next seven days.</span></div>`;
                return;
            }
            host.innerHTML = upcoming.map(event => `
                <button
                    class="calendar-upcoming-event ${event.category === "birthday" ? "birthday-event" : ""}"
                    type="button"
                    data-calendar-event="${this.attr(event.id)}"
                    style="${this.colorStyle(event)}"
                >
                    <span aria-hidden="true"></span>
                    <span>
                        <span>${this.escape(event.start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }))}</span>
                        <strong>${this.escape(event.title)}</strong>
                        <span>${this.escape(this.category(event.category).label)}</span>
                    </span>
                </button>
            `).join("");
        },
        populatePeople() {
            const select = document.getElementById("calendarEventPerson");
            if (!select)
                return;
            const current = select.value;
            const people = this.kidModeId
                ? this.people.filter(person => String(person.id) === String(this.kidModeId))
                : this.people;
            select.innerHTML = `
                <option value="">Whole household</option>
                ${people.map(person => `
                    <option value="${this.attr(person.id)}">${this.escape(person.display_name)}</option>
                `).join("")}
            `;
            select.value = current && [...select.options].some(option => option.value === current)
                ? current
                : (this.kidModeId || "");
        },
        timeOnly(date) {
            return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        },
        whenShort(event) {
            const date = event.start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
            return event.allDay ? `${date} · All day` : `${date} · ${this.timeOnly(event.start)}`;
        },
        whenLong(event) {
            const date = event.start.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric"
            });
            if (event.allDay)
                return `${date} · All day`;
            const start = this.timeOnly(event.start);
            const end = event.end ? ` – ${this.timeOnly(event.end)}` : "";
            return `${date} · ${start}${end}`;
        },
        eventById(id) {
            return this.events.find(event => event.id === id) || null;
        },
        openDetail(event) {
            this.selectedEvent = event;
            const dialog = document.getElementById("calendarDetailDialog");
            if (!dialog)
                return;
            const category = this.category(event.category);
            this.text("calendarDetailKicker", category.label.toUpperCase());
            this.text("calendarDetailTitle", event.title);
            this.text("calendarDetailWhen", this.whenLong(event));
            this.text("calendarDetailPerson", (event.personNames || []).join(", ") || "Whole household");
            this.text("calendarDetailLocation", event.location || "—");
            this.text("calendarDetailSource", "Household Calendar");
            this.text("calendarDetailNotes", event.notes || "No additional notes.");
            const color = document.getElementById("calendarDetailColor");
            color?.style.setProperty("--detail-color", this.eventVisual(event).eventColor);
            const edit = document.getElementById("calendarDetailEdit");
            if (edit)
                edit.hidden = !event.editable;
            const source = document.getElementById("calendarDetailSourceLink");
            if (source)
                source.hidden = !event.sourceHref;
            dialog.showModal();
        },
        openEditor(event = null, date = this.selectedDate) {
            // Always let the editor open. If the database table is unavailable,
            // explain that inside the editor instead of making the Add Event button feel broken.
            const storageStatus = document.getElementById("calendarStorageStatus");
            if (storageStatus)
                storageStatus.hidden = !this.manualTableUnavailable;
            this.editingId = event?.recordId || null;
            const dialog = document.getElementById("calendarEventDialog");
            if (!dialog)
                return;
            this.text("calendarDialogKicker", event ? "EDIT HOUSEHOLD EVENT" : "NEW HOUSEHOLD EVENT");
            this.text("calendarDialogTitle", event ? "Update this moment" : "Add to your calendar");
            const source = event?.raw || null;
            const start = source?.starts_at
                ? new Date(source.starts_at)
                : (event?.start || this.startOfDay(date));
            const end = source?.ends_at
                ? new Date(source.ends_at)
                : (event?.end || new Date(start.getTime() + 60 * 60 * 1000));
            this.value("calendarEventTitle", source?.title || "");
            this.value("calendarEventCategory", source?.category || "family");
            this.value("calendarEventPerson", source?.family_member_id || (!event && this.kidModeId ? this.kidModeId : ""));
            this.value("calendarEventDate", this.dateKey(start));
            this.checked("calendarEventAllDay", Boolean(source?.all_day));
            this.value("calendarEventStartTime", this.inputTime(start) || "09:00");
            this.value("calendarEventEndTime", source?.ends_at ? this.inputTime(new Date(source.ends_at)) : this.inputTime(end));
            this.value("calendarEventRepeat", source?.recurrence_rule || "");
            this.value("calendarEventRepeatEnd", source?.recurrence_end_date || "");
            this.value("calendarEventLocation", source?.location || "");
            this.value("calendarEventNotes", source?.notes || "");
            const editorCategory = source?.category || "family";
            const editorPersonId = source?.family_member_id || (!event && this.kidModeId ? this.kidModeId : "");
            const editorPerson = this.people.find(person => String(person.id) === String(editorPersonId)) || null;
            const savedEventColor = this.validHexColor(source?.event_color || event?.eventColor);
            const editorColor = editorCategory === "birthday"
                ? CATEGORIES.birthday.color
                : (savedEventColor || (editorPerson ? this.calendarPersonColor(editorPerson) : this.category(editorCategory).color));
            this.value("calendarEventColor", editorColor);
            const deleteButton = document.getElementById("calendarDeleteEvent");
            if (deleteButton)
                deleteButton.hidden = !event;
            this.syncAllDayFields();
            this.syncColorPreview();
            dialog.showModal();
            setTimeout(() => document.getElementById("calendarEventTitle")?.focus(), 60);
        },
        inputTime(date) {
            if (!(date instanceof Date) || Number.isNaN(date.getTime()))
                return "";
            return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
        },
        async saveEvent(event) {
            event.preventDefault();
            const title = this.valueOf("calendarEventTitle").trim();
            const date = this.valueOf("calendarEventDate");
            const allDay = this.isChecked("calendarEventAllDay");
            const startTime = allDay ? "00:00" : (this.valueOf("calendarEventStartTime") || "09:00");
            const endTime = allDay ? "23:59" : (this.valueOf("calendarEventEndTime") || startTime);
            if (!title || !date) {
                this.notify("Give this calendar event a title and date.", "warning");
                return;
            }
            const startsAt = this.localDateTime(date, startTime);
            const endsAt = this.localDateTime(date, endTime);
            if (endsAt < startsAt) {
                this.notify("The end time needs to be after the start time.", "warning");
                return;
            }

            const recurrenceRule = this.valueOf("calendarEventRepeat") || null;
            const recurrenceEndDate = this.valueOf("calendarEventRepeatEnd") || null;

            if (recurrenceRule && recurrenceEndDate && recurrenceEndDate < date) {
                this.notify("Repeat until cannot be before the event date.", "warning");
                return;
            }

            const submit = document.querySelector("#calendarEventForm button[type='submit']");
            if (submit)
                submit.disabled = true;
            const category = this.valueOf("calendarEventCategory") || "family";
            const familyMemberId = this.valueOf("calendarEventPerson") || null;
            const person = this.people.find(item => String(item.id) === String(familyMemberId)) || null;
            const defaultColor = category === "birthday"
                ? CATEGORIES.birthday.color
                : (person ? this.calendarPersonColor(person) : this.category(category).color);
            const chosenColor = this.validHexColor(this.valueOf("calendarEventColor"));
            const eventColor = category === "birthday"
                ? null
                : (chosenColor && chosenColor.toLowerCase() !== defaultColor.toLowerCase() ? chosenColor : null);
            const result = await service.saveManualEvent({
                id: this.editingId,
                householdId: this.householdId(),
                title,
                category,
                eventColor,
                startsAt: startsAt.toISOString(),
                endsAt: endsAt.toISOString(),
                allDay,
                recurrenceRule,
                recurrenceEndDate,
                familyMemberId,
                location: this.valueOf("calendarEventLocation"),
                notes: this.valueOf("calendarEventNotes")
            });
            if (submit)
                submit.disabled = false;
            if (result.error) {
                console.error(result.error);
                const errorMessage = String(result.error.message || "");
                this.notify(/event_color|schema cache.*event_color|column .*event_color/i.test(errorMessage)
                    ? "Run HOME OS Calendar SQL step 18, then hard refresh before saving custom event colors."
                    : /home_calendar_events|could not find the table/i.test(errorMessage)
                        ? "Run the HOME OS Calendar storage repair SQL in Supabase first."
                        : (result.error.message || "HOME OS could not save this event."), "warning");
                return;
            }
            this.manualTableUnavailable = false;
            const storageStatus = document.getElementById("calendarStorageStatus");
            if (storageStatus)
                storageStatus.hidden = true;
            document.getElementById("calendarEventDialog")?.close();
            this.selectedDate = this.startOfDay(startsAt);
            this.viewDate = this.startOfDay(startsAt);
            this.notify(this.editingId ? "Calendar event updated." : "Added to your HOME OS calendar.", "success");
            this.editingId = null;
            await this.load();
        },
        async deleteEvent() {
            if (!this.editingId)
                return;
            if (!window.confirm("Delete this calendar event?"))
                return;
            const result = await service.deleteManualEvent(this.editingId);
            if (result.error) {
                this.notify(result.error.message || "HOME OS could not delete this event.", "warning");
                return;
            }
            document.getElementById("calendarEventDialog")?.close();
            this.editingId = null;
            this.notify("Calendar event deleted.", "success");
            await this.load();
        },
        localDateTime(dateKey, time) {
            const [year, month, day] = dateKey.split("-").map(Number);
            const [hour, minute] = String(time || "00:00").split(":").map(Number);
            return new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0);
        },
        syncAllDayFields() {
            const allDay = this.isChecked("calendarEventAllDay");
            const start = document.getElementById("calendarStartTimeField");
            const end = document.getElementById("calendarEndTimeField");
            if (start)
                start.hidden = allDay;
            if (end)
                end.hidden = allDay;
        },
        syncCategoryDefaults() {
            const category = this.valueOf("calendarEventCategory") || "family";
            if (category === "birthday") {
                this.checked("calendarEventAllDay", true);
                this.value("calendarEventRepeat", "FREQ=YEARLY");
                this.syncAllDayFields();
            }
            if (category === "grocery") {
                this.checked("calendarEventAllDay", true);
                this.value("calendarEventRepeat", "FREQ=WEEKLY");
                this.syncAllDayFields();
            }
            const personId = this.valueOf("calendarEventPerson");
            const person = this.people.find(item => String(item.id) === String(personId)) || null;
            const nextColor = category === "birthday"
                ? CATEGORIES.birthday.color
                : (person ? this.calendarPersonColor(person) : this.category(category).color);
            this.value("calendarEventColor", nextColor);
            this.syncColorPreview();
        },
        syncPersonColorDefault() {
            const category = this.valueOf("calendarEventCategory") || "family";
            if (category === "birthday") {
                this.value("calendarEventColor", CATEGORIES.birthday.color);
                this.syncColorPreview();
                return;
            }
            const personId = this.valueOf("calendarEventPerson");
            const person = this.people.find(item => String(item.id) === String(personId)) || null;
            this.value("calendarEventColor", person ? this.calendarPersonColor(person) : this.category(category).color);
            this.syncColorPreview();
        },
        syncColorPreview() {
            const category = this.valueOf("calendarEventCategory") || "family";
            const data = this.category(category);
            const input = document.getElementById("calendarEventColor");
            const preview = document.getElementById("calendarDialogColorPreview");
            const name = document.getElementById("calendarEventColorName");
            const hint = document.getElementById("calendarEventColorHint");
            const personId = this.valueOf("calendarEventPerson");
            const person = this.people.find(item => String(item.id) === String(personId)) || null;
            let color = this.validHexColor(input?.value) || data.color;
            if (category === "birthday") {
                color = CATEGORIES.birthday.color;
                if (input) {
                    input.value = color;
                    input.disabled = true;
                }
                if (name)
                    name.textContent = "HOME OS birthday gold";
                if (hint)
                    hint.textContent = "Birthday celebrations stay gold everywhere on the calendar.";
            }
            else {
                if (input)
                    input.disabled = false;
                if (name)
                    name.textContent = person
                        ? `${person.display_name}'s event color`
                        : "Custom event color";
                if (hint)
                    hint.textContent = person
                        ? "This event started from the assigned person’s saved color. You can still override it."
                        : "Choose any color for this event.";
            }
            if (preview)
                preview.style.setProperty("--preview-color", color);
            const strong = preview?.querySelector("strong");
            if (strong)
                strong.textContent = data.label.toUpperCase();
        },
        navigate(direction) {
            if (this.view === "month") {
                this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + direction, 1);
            }
            else if (this.view === "week") {
                this.viewDate = this.addDays(this.viewDate, direction * 7);
            }
            else {
                this.viewDate = this.addDays(this.viewDate, direction);
            }
            this.selectedDate = this.startOfDay(this.viewDate);
            this.load();
        },
        goToday() {
            this.viewDate = this.startOfDay(new Date());
            this.selectedDate = this.startOfDay(new Date());
            this.load();
        },
        chooseDate(key, { switchToDay = false } = {}) {
            const date = service.fromDateKey(key);
            this.selectedDate = this.startOfDay(date);
            if (switchToDay) {
                this.view = "day";
                this.viewDate = this.startOfDay(date);
                this.load();
            }
            else {
                this.renderBoard();
                this.renderAgenda();
                this.renderUpcoming();
                const board = document.getElementById("calendarBoard");
                board?.classList.remove("calendar-board-season-swap");
                requestAnimationFrame(() => board?.classList.add("calendar-board-season-swap"));
            }
        },
        setView(view) {
            if (!["month", "week", "day"].includes(view))
                return;
            this.view = view;
            this.viewDate = this.startOfDay(this.selectedDate || new Date());
            this.load();
        },
        toggleFilter(category) {
            if (!CATEGORIES[category])
                return;
            if (this.filters.has(category)) {
                this.filters.delete(category);
            }
            else {
                this.filters.add(category);
            }
            this.renderFilters();
            this.render();
        },
        showAll() {
            this.filters = new Set(CATEGORY_ORDER);
            this.renderFilters();
            this.render();
        },
        openSource(event) {
            if (!event?.sourceHref)
                return;
            const href = window.HomeOS.auth?.pageUrl
                ? window.HomeOS.auth.pageUrl(event.sourceHref)
                : event.sourceHref;
            window.location.href = href;
        },
        bind() {
            document.getElementById("calendarPrev")?.addEventListener("click", () => this.navigate(-1));
            document.getElementById("calendarNext")?.addEventListener("click", () => this.navigate(1));
            document.getElementById("calendarToday")?.addEventListener("click", () => this.goToday());
            document.getElementById("calendarAddEvent")?.addEventListener("click", () => this.openEditor());
            document.getElementById("calendarShowAll")?.addEventListener("click", () => this.showAll());
            document.getElementById("calendarClearPersonFocus")?.addEventListener("click", () => {
                this.personFocusId = null;
                this.render();
            });
            document.getElementById("calendarExitKidMode")?.addEventListener("click", () => {
                const url = new URL(window.location.href);
                url.searchParams.delete("kid");
                window.location.href = url.toString();
            });
            document.getElementById("calendarAdultMembers")?.addEventListener("click", event => {
                if (event.target.closest("[data-calendar-person-color]"))
                    return;
                const button = event.target.closest("[data-calendar-person-focus]");
                if (!button)
                    return;
                const id = button.dataset.calendarPersonFocus;
                this.personFocusId = String(this.personFocusId || "") === String(id) ? null : id;
                this.render();
            });
            document.getElementById("calendarAdultMembers")?.addEventListener("change", event => {
                const input = event.target.closest("[data-calendar-person-color]");
                if (!input)
                    return;
                this.savePersonCalendarColor(input.dataset.calendarPersonColor, input.value);
            });
            document.getElementById("calendarKidMembers")?.addEventListener("click", event => {
                if (event.target.closest("[data-calendar-person-color]"))
                    return;
                const button = event.target.closest("[data-calendar-kid-view]");
                if (!button)
                    return;
                const url = new URL(window.location.href);
                url.searchParams.set("kid", button.dataset.calendarKidView);
                window.location.href = url.toString();
            });
            document.getElementById("calendarKidMembers")?.addEventListener("change", event => {
                const input = event.target.closest("[data-calendar-person-color]");
                if (!input)
                    return;
                this.savePersonCalendarColor(input.dataset.calendarPersonColor, input.value);
            });
            document.querySelectorAll("[data-calendar-view]").forEach(button => {
                button.addEventListener("click", () => this.setView(button.dataset.calendarView));
            });
            document.getElementById("calendarFilters")?.addEventListener("click", event => {
                const button = event.target.closest("[data-calendar-filter]");
                if (button)
                    this.toggleFilter(button.dataset.calendarFilter);
            });
            document.getElementById("calendarBoard")?.addEventListener("click", event => this.handleBoardClick(event));
            document.getElementById("calendarBoard")?.addEventListener("keydown", event => {
                if (!["Enter", " "].includes(event.key))
                    return;
                if (event.target.closest("button"))
                    return;
                const day = event.target.closest(".calendar-day-cell[data-calendar-date], .calendar-week-column[data-calendar-date]");
                if (!day)
                    return;
                event.preventDefault();
                this.chooseDate(day.dataset.calendarDate);
            });
            document.getElementById("calendarAgendaList")?.addEventListener("click", event => this.handleEventClick(event));
            document.getElementById("calendarUpcomingList")?.addEventListener("click", event => this.handleEventClick(event));
            document.getElementById("calendarEventForm")?.addEventListener("submit", event => this.saveEvent(event));
            document.getElementById("calendarDeleteEvent")?.addEventListener("click", () => this.deleteEvent());
            document.getElementById("calendarDialogClose")?.addEventListener("click", () => document.getElementById("calendarEventDialog")?.close());
            document.getElementById("calendarCancelEvent")?.addEventListener("click", () => document.getElementById("calendarEventDialog")?.close());
            document.getElementById("calendarEventAllDay")?.addEventListener("change", () => this.syncAllDayFields());
            document.getElementById("calendarEventCategory")?.addEventListener("change", () => this.syncCategoryDefaults());
            document.getElementById("calendarEventPerson")?.addEventListener("change", () => this.syncPersonColorDefault());
            document.getElementById("calendarEventColor")?.addEventListener("input", () => this.syncColorPreview());
            document.getElementById("calendarDetailClose")?.addEventListener("click", () => document.getElementById("calendarDetailDialog")?.close());
            document.getElementById("calendarDetailDone")?.addEventListener("click", () => document.getElementById("calendarDetailDialog")?.close());
            document.getElementById("calendarDetailEdit")?.addEventListener("click", () => {
                const event = this.selectedEvent;
                document.getElementById("calendarDetailDialog")?.close();
                if (event)
                    this.openEditor(event, event.start);
            });
            document.getElementById("calendarDetailSourceLink")?.addEventListener("click", () => this.openSource(this.selectedEvent));
        },
        handleBoardClick(domEvent) {
            const addButton = domEvent.target.closest("[data-calendar-add-date]");
            if (addButton) {
                const date = service.fromDateKey(addButton.dataset.calendarAddDate);
                this.selectedDate = this.startOfDay(date);
                this.openEditor(null, date);
                return;
            }
            const eventButton = domEvent.target.closest("[data-calendar-event]");
            if (eventButton) {
                const event = this.eventById(eventButton.dataset.calendarEvent);
                if (event)
                    this.openDetail(event);
                return;
            }
            const dateButton = domEvent.target.closest("[data-calendar-date]");
            if (dateButton) {
                this.chooseDate(dateButton.dataset.calendarDate, {
                    switchToDay: domEvent.detail > 1
                });
            }
        },
        handleEventClick(domEvent) {
            const button = domEvent.target.closest("[data-calendar-event]");
            if (!button)
                return;
            const event = this.eventById(button.dataset.calendarEvent);
            if (event)
                this.openDetail(event);
        },
        text(id, value) {
            const element = document.getElementById(id);
            if (element)
                element.textContent = String(value ?? "");
        },
        value(id, value) {
            const element = document.getElementById(id);
            if (element)
                element.value = value ?? "";
        },
        valueOf(id) {
            return document.getElementById(id)?.value || "";
        },
        checked(id, value) {
            const element = document.getElementById(id);
            if (element)
                element.checked = Boolean(value);
        },
        isChecked(id) {
            return Boolean(document.getElementById(id)?.checked);
        }
    };
    window.HomeOS = window.HomeOS || {};
    await App.init();
});
