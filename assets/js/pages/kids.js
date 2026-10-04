/* ============================================================
   HOMEOS // KIDS

   Kids Mode profiles, PIN access, missions and celebrations.
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";
    const service = window.HomeOS
        ?.services
        ?.kids;
    const ROUTINES = {
        morning: {
            label: "Morning Routine",
            kicker: "START THE DAY"
        },
        backpack: {
            label: "What's in My Backpack?",
            kicker: "SCHOOL READY"
        },
        after_school: {
            label: "After School",
            kicker: "BACK HOME"
        },
        after_school_program: {
            label: "After-School Program",
            kicker: "TODAY'S PROGRAM"
        },
        sports: {
            label: "Sports",
            kicker: "GAME + PRACTICE READY"
        },
        weekend: {
            label: "Weekend Jobs",
            kicker: "WEEKEND CARE"
        },
        night: {
            label: "Night Routine",
            kicker: "CLOSE THE DAY"
        },
        general: {
            label: "My Jobs",
            kicker: "HOMEOS JOBS"
        }
    };
    const App = {
        portalToken: "",
        sessionToken: "",
        portal: null,
        session: null,
        tasks: [],
        selectedProfile: null,
        pin: "",
        toastTimer: null,
        buddyPersonId: null,
        shortcutKidId: "",
        alienBlinkTimer: null,
        async init() {
            if (!service) {
                return;
            }
            this.bind();
            this.setupParticles();
            this.setupAlienBlink();
            await service
                .lockAdultSession();
            const params = new URLSearchParams(window.location.search);
            this.shortcutKidId =
                String(params.get("kid") ||
                    "").trim();
            const explicitPortal = String(params.get("home") ||
                "").trim();
            let signedInPortal = "";
            if (!explicitPortal) {
                const adultPortal = await service.getAdultPortalState?.();
                if (!adultPortal?.error) {
                    signedInPortal = String(adultPortal?.data?.portal_token ||
                        adultPortal?.data?.portalToken ||
                        "").trim();
                }
            }
            this.portalToken =
                explicitPortal ||
                    signedInPortal ||
                    String(localStorage.getItem("homeos_kids_portal") ||
                        "").trim();
            if (!this.portalToken) {
                this.showMissing();
                return;
            }
            localStorage
                .setItem("homeos_kids_portal", this.portalToken);
            const savedSession = sessionStorage
                .getItem("homeos_kids_session") ||
                "";
            if (savedSession) {
                const restored = await service
                    .getSession(savedSession);
                if (!restored.error &&
                    restored.data) {
                    const restoredPersonId = this.sessionPersonId(restored.data);
                    if (this.shortcutKidId &&
                        restoredPersonId &&
                        restoredPersonId !== this.shortcutKidId) {
                        await service.logout(savedSession);
                        sessionStorage.removeItem("homeos_kids_session");
                    }
                    else {
                        this.sessionToken =
                            savedSession;
                        this.session =
                            restored.data;
                        this.applyTheme(restored.data
                            .theme ||
                            "girl");
                        await this.loadTasks();
                        this.showDashboard();
                        return;
                    }
                }
                sessionStorage
                    .removeItem("homeos_kids_session");
            }
            await this.loadProfiles();
        },
        async loadProfiles() {
            const result = await service
                .listProfiles(this.portalToken);
            if (result.error ||
                !result.data) {
                this.showMissing();
                return;
            }
            this.portal =
                result.data;
            this.text("kidsHouseholdName", `${result.data.household_name || "HomeOS"} · choose your explorer`);
            this.renderProfiles();
            this.showProfiles();
            if (this.shortcutKidId) {
                const exists = (this.portal?.profiles || [])
                    .some(profile => profile.id === this.shortcutKidId);
                if (exists) {
                    this.openPin(this.shortcutKidId);
                }
                else {
                    this.clearShortcutFromUrl();
                    this.toast("That child shortcut is no longer available. Choose a profile instead.");
                }
            }
        },
        sessionPersonId(snapshot) {
            return String(snapshot?.family_member_id ||
                snapshot?.person_id ||
                snapshot?.person?.family_member_id ||
                snapshot?.person?.person_id ||
                snapshot?.person?.id ||
                snapshot?.id ||
                "").trim();
        },
        clearShortcutFromUrl() {
            this.shortcutKidId = "";
            const url = new URL(window.location.href);
            url.searchParams.delete("kid");
            window.history.replaceState({}, "", url.href);
        },
        async switchExplorer() {
            this.clearShortcutFromUrl();
            return this.kidLogout(true);
        },
        renderProfiles() {
            const grid = document
                .getElementById("kidsProfileGrid");
            if (!grid) {
                return;
            }
            const profiles = this.portal
                ?.profiles ||
                [];
            if (!profiles.length) {
                grid.innerHTML = `
                        <div
                            class="kids-empty-jobs"
                            style="grid-column:1/-1"
                        >
                            <strong>
                                No Kids Mode profiles yet.
                            </strong>

                            <p>
                                Ask a grown-up to enable Kids Mode in
                                People + Access.
                            </p>
                        </div>
                    `;
                return;
            }
            grid.innerHTML =
                profiles
                    .map(profile => `
                                <button
                                    class="kids-profile-card"
                                    type="button"
                                    data-kid-profile="${this.attr(profile.id)}"
                                    data-theme="${this.attr(profile.theme || "girl")}"
                                    data-profile-theme="${this.attr(profile.theme || "girl")}"
                                >

                                    <span class="kids-profile-orbit" aria-hidden="true">
                                        <span class="kids-holo-ring ring-one"></span>
                                        <span class="kids-holo-ring ring-two"></span>
                                        <span class="kids-profile-avatar">
                                            ${this.escape(profile.initial || profile.display_name?.[0] || "K")}
                                        </span>
                                    </span>

                                    <small class="kids-profile-call">
                                        ${profile.theme === "boy" ? "SPACE CREW // EXPLORER" : "STAR CREW // EXPLORER"}
                                    </small>

                                    <strong>
                                        ${this.escape(profile.display_name)}
                                    </strong>

                                    <small>
                                        Tap to enter Mission Control
                                    </small>

                                </button>
                            `)
                    .join("");
        },
        openPin(profileId) {
            const profile = (this.portal
                ?.profiles ||
                [])
                .find(item => item.id ===
                profileId);
            if (!profile) {
                return;
            }
            this.selectedProfile =
                profile;
            this.pin =
                "";
            this.applyTheme(profile.theme ||
                "girl");
            this.text("kidsPinTitle", `Hi, ${profile.display_name}!`);
            this.text("kidsPinAvatar", profile.initial ||
                profile.display_name?.[0] ||
                "K");
            this.text("kidsPinError", "");
            this.renderPin();
            document
                .getElementById("kidsPinBackdrop")
                .hidden =
                false;
        },
        closePin() {
            document
                .getElementById("kidsPinBackdrop")
                .hidden =
                true;
            this.pin =
                "";
            this.renderPin();
        },
        pinKey(value) {
            if (this.pin.length >=
                4) {
                return;
            }
            this.pin +=
                value;
            this.renderPin();
        },
        pinBack() {
            this.pin =
                this.pin.slice(0, -1);
            this.renderPin();
        },
        pinClear() {
            this.pin =
                "";
            this.renderPin();
        },
        renderPin() {
            const dots = document
                .getElementById("kidsPinDots");
            if (dots) {
                dots.innerHTML =
                    Array.from({
                        length: 4
                    }, (_, index) => `
                                <i
                                    class="${index < this.pin.length ? "filled" : ""}"
                                ></i>
                            `)
                        .join("");
            }
            const unlock = document
                .getElementById("kidsUnlockButton");
            if (unlock) {
                unlock.disabled =
                    this.pin.length !==
                        4;
            }
        },
        async unlock() {
            if (!this.selectedProfile ||
                this.pin.length !==
                    4) {
                return;
            }
            const button = document
                .getElementById("kidsUnlockButton");
            button.disabled =
                true;
            button.textContent =
                "Checking…";
            const result = await service
                .login(this.portalToken, this.selectedProfile.id, this.pin);
            button.textContent =
                "Launch My Missions →";
            if (result.error ||
                !result.data
                    ?.session_token) {
                button.disabled =
                    false;
                this.text("kidsPinError", result.error
                    ?.message ||
                    "That PIN didn't work. Try again.");
                this.pin =
                    "";
                this.renderPin();
                return;
            }
            this.sessionToken =
                result.data
                    .session_token;
            sessionStorage
                .setItem("homeos_kids_session", this.sessionToken);
            this.session = {
                ...result.data
                    .person,
                expires_at: result.data
                    .expires_at
            };
            this.closePin();
            await this.loadTasks();
            this.showDashboard();
        },
        async loadTasks() {
            const result = await service
                .getTasks(this.sessionToken, this.dateKey());
            if (result.error) {
                await this.kidLogout(false);
                this.toast(result.error.message ||
                    "Your Kids Mode session ended.");
                await this.loadProfiles();
                return;
            }
            this.tasks =
                result.data
                    ?.tasks ||
                    [];
            if (result.data
                ?.person) {
                this.session = {
                    ...this.session,
                    ...result.data
                        .person
                };
            }
            this.renderDashboard();
        },
        renderDashboard() {
            const name = this.session
                ?.display_name ||
                "Helper";
            const storedDisplayMode = this.session
                ?.display_mode ||
                "picture_text";
            const ageBand = this.ageBand(storedDisplayMode);
            const displayMode = ({
                little: "picture",
                school_age: "picture_text",
                teen: "text"
            })[ageBand] ||
                storedDisplayMode;
            document.body
                .dataset
                .kidsDisplay =
                displayMode;
            document.body
                .dataset
                .kidsAgeBand =
                ageBand;
            this.text("kidsAgeMode", {
                little: "AGES 1–4 // PICTURE MODE",
                school_age: "AGES 5–10 // MISSION MODE",
                teen: "AGES 11–18 // CREW MODE"
            }[ageBand] || "EXPLORER MODE");
            this.text("kidsName", name);
            this.text("kidsGreeting", this.greeting());
            this.text("kidsDateLabel", new Intl
                .DateTimeFormat(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric"
            })
                .format(new Date())
                .toUpperCase());
            this.applyTheme(this.session
                ?.theme ||
                document.body
                    .dataset
                    .kidsTheme ||
                "girl");
            const completed = this.tasks
                .filter(task => task.complete)
                .length;
            const total = this.tasks
                .length;
            const percent = total
                ? Math.round((completed /
                    total) *
                    100)
                : 0;
            this.text("kidsProgressText", `${completed} of ${total} done`);
            const bar = document
                .getElementById("kidsProgressBar");
            if (bar) {
                bar.style.width =
                    `${percent}%`;
            }
            this.text("kidsBuddyMessage", total &&
                completed ===
                    total
                ? "Mission complete!"
                : completed
                    ? "Keep exploring!"
                    : "Ready for launch!");
            const modeDescription = {
                picture: "Tap a big mission picture when you're done.",
                picture_text: "Tap each mission card as you finish it. Your pictures and words help guide the way.",
                text: "Your routines, activities and household responsibilities for today."
            }[displayMode];
            this.text("kidsModeDescription", modeDescription);
            this.renderPlantBuddy({
                completed,
                total,
                percent
            });
            const focus = this.focusContext();
            this.text("kidsFocusKicker", focus.kicker);
            this.text("kidsFocusTitle", focus.title);
            const list = document
                .getElementById("kidsJobList");
            if (!list) {
                return;
            }
            if (!total) {
                list.innerHTML = `
                        <div class="kids-empty-jobs">

                            <strong>
                                No routines assigned today!
                            </strong>

                            <p>
                                Enjoy the clear list. A grown-up can add
                                HomeOS routine tasks when needed.
                            </p>

                        </div>
                    `;
            }
            else {
                list.innerHTML =
                    this.renderRoutineGroups(displayMode, focus);
            }
            this.bindIconFallbacks();
            document
                .getElementById("kidsAllDone")
                .hidden =
                !(total >
                    0 &&
                    completed ===
                        total);
        },
        renderPlantBuddy({ completed = 0, total = 0, percent = 0 } = {}) {
            const companion = window.HomeOS
                ?.components
                ?.rhythmCompanion;
            if (!companion) {
                return;
            }
            const personId = this.session
                ?.id ||
                this.session
                    ?.person_id ||
                this.session
                    ?.family_member_id ||
                this.session
                    ?.display_name ||
                "kid";
            const styleKey = `homeos.rhythmCompanionStyle:kid:${personId}`;
            companion.setStyleStorageKey?.(styleKey, { reload: true });
            if (this.buddyPersonId !== personId) {
                companion.snapshot = null;
                this.buddyPersonId = personId;
            }
            const firstOpen = this.tasks
                .find(task => !task.complete);
            const name = this.session
                ?.display_name ||
                "Explorer";
            let title = "Your Plant Buddy is ready.";
            let message = `Every mission ${name} finishes gives him more energy.`;
            if (!total) {
                title = "Your Plant Buddy is hanging out.";
                message = "No missions are waiting right now, so he gets to relax with you.";
            }
            else if (percent >= 100) {
                title = "Full bloom! Mission complete.";
                message = "You finished every mission. Your buddy is glowing because you took care of your home.";
            }
            else if (percent >= 70) {
                title = "Look at him grow!";
                message = "You're almost there. A few more missions will bring him to full bloom.";
            }
            else if (percent >= 35) {
                title = "He's growing with you.";
                message = "Every finished mission gives your buddy a little more power.";
            }
            else if (completed > 0) {
                title = "He felt that one!";
                message = "Nice start. Keep helping him grow one mission at a time.";
            }
            const nextLittleWin = firstOpen
                ? firstOpen.title
                : total
                    ? "Everything is complete — enjoy the bloom!"
                    : "No mission needed right now.";
            companion.renderCompanion({
                overallPercent: percent,
                totalTasks: total,
                openingCompleted: completed,
                openingTotal: total,
                closingCompleted: 0,
                closingTotal: 0,
                isSleeping: false,
                currentShift: "opening",
                rhythmPhase: "day",
                stateTitle: title,
                stateMessage: message,
                nextLittleWin,
                scheduleSummary: "",
                talkMessages: [
                    firstOpen
                        ? `Your next mission is ${firstOpen.title}. We can do it together.`
                        : total
                            ? "Every mission is complete. Great work today!"
                            : "There are no missions waiting right now.",
                    percent >= 100
                        ? "You filled my whole garden with energy. Mission complete!"
                        : "Every mission you finish helps me grow a little stronger.",
                    `You're at ${percent}% mission power today.`
                ]
            });
            this.text("kidsBuddyCompletedCount", String(completed));
        },
        renderRoutineGroups(displayMode, focus) {
            const groups = new Map();
            this.tasks
                .forEach(task => {
                const routine = task.routine_type ||
                    "general";
                const groupKey = task.program_name
                    ? `${routine}:${task.program_name}`
                    : routine;
                if (!groups.has(groupKey)) {
                    groups.set(groupKey, {
                        key: groupKey,
                        routine,
                        programName: task.program_name ||
                            null,
                        tasks: []
                    });
                }
                groups
                    .get(groupKey)
                    .tasks
                    .push(task);
            });
            const ordered = [
                ...groups
                    .values()
            ]
                .sort((a, b) => {
                const aIndex = focus.order
                    .indexOf(a.routine);
                const bIndex = focus.order
                    .indexOf(b.routine);
                const safeA = aIndex ===
                    -1
                    ? 99
                    : aIndex;
                const safeB = bIndex ===
                    -1
                    ? 99
                    : bIndex;
                if (safeA !==
                    safeB) {
                    return safeA -
                        safeB;
                }
                return String(a.programName ||
                    "")
                    .localeCompare(String(b.programName ||
                    ""));
            });
            return ordered
                .map(group => this.renderRoutineGroup(group, displayMode, focus))
                .join("");
        },
        renderRoutineGroup(group, displayMode, focus) {
            const tasks = [
                ...group.tasks
            ]
                .sort((a, b) => {
                const sort = (a.sort_order ||
                    900) -
                    (b.sort_order ||
                        900);
                if (sort) {
                    return sort;
                }
                return String(a.title ||
                    "")
                    .localeCompare(String(b.title ||
                    ""));
            });
            const complete = tasks
                .filter(task => task.complete)
                .length;
            const label = group.programName
                ? group.programName
                : ROUTINES[group.routine]
                    ?.label ||
                    "My Jobs";
            const kicker = group.programName
                ? (group.routine ===
                    "sports"
                    ? "SPORTS"
                    : "AFTER-SCHOOL PROGRAM")
                : ROUTINES[group.routine]
                    ?.kicker ||
                    "HOMEOS";
            const activeFocus = focus.primary ===
                group.routine;
            const groupComplete = tasks.length > 0 &&
                complete === tasks.length;
            return `
                    <section
                        class="kids-routine-group ${activeFocus ? "focus" : ""} ${groupComplete ? "complete" : ""}"
                        data-routine="${this.attr(group.routine)}"
                        data-section-key="${this.attr(group.key)}"
                        data-section-label="${this.attr(label)}"
                    >

                        <header class="kids-routine-group-heading">

                            <div>

                                <span class="kids-kicker">
                                    ${this.escape(kicker)}
                                </span>

                                <h3>
                                    ${this.escape(label)}
                                </h3>

                            </div>


                            <div class="kids-routine-heading-status">
                                <span class="kids-routine-complete-pill" ${groupComplete ? "" : "hidden"}>
                                    SECTION COMPLETE
                                </span>

                                <span class="kids-routine-progress">
                                    ${complete} / ${tasks.length}
                                </span>
                            </div>

                        </header>


                        <div class="kids-routine-task-grid">

                            ${tasks
                .map(task => this.renderTask(task, displayMode))
                .join("")}

                        </div>

                    </section>
                `;
        },
        renderTask(task, displayMode) {
            const icon = this.taskIcon(task.icon_key, task.title, task.image_url);
            const complete = task.complete;
            if (displayMode ===
                "picture") {
                return `
                        <button
                            class="kids-picture-job ${complete ? "complete" : ""}"
                            type="button"
                            data-kid-occurrence="${this.attr(task.occurrence_id)}"
                            data-complete="${complete ? "true" : "false"}"
                            data-task-engine="${this.attr(task.task_engine || "kid")}"
                            aria-label="${complete ? "Mark open" : "Mark complete"}: ${this.attr(task.title)}"
                        >

                            ${icon}

                            <span class="kids-picture-job-check">
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="m5 12 4 4L19 6"></path>
                                </svg>
                            </span>

                            <strong>
                                ${this.escape(task.title)}
                            </strong>

                        </button>
                    `;
            }
            if (displayMode ===
                "text") {
                return `
                        <article class="kids-job-card kids-text-job ${task.image_url ? "has-visual" : ""} ${complete ? "complete" : ""}">

                            ${task.image_url ? icon : ""}

                            <div class="kids-job-copy">

                                <strong>
                                    ${this.escape(task.title)}
                                </strong>

                                <span>
                                    ${this.escape([
                    task.program_name,
                    task.room_name,
                    this.timeLabel(task.due_time)
                ]
                    .filter(Boolean)
                    .join(" · ") ||
                    "HomeOS routine")}
                                </span>

                            </div>


                            <span class="kids-job-chip">
                                ${this.escape(ROUTINES[task.routine_type ||
                    "general"]
                    ?.short ||
                    "My Job")}
                            </span>


                            <button
                                class="kids-job-check"
                                type="button"
                                data-kid-occurrence="${this.attr(task.occurrence_id)}"
                                data-complete="${complete ? "true" : "false"}"
                                data-task-engine="${this.attr(task.task_engine || "kid")}"
                                aria-label="${complete ? "Mark open" : "Mark complete"}: ${this.attr(task.title)}"
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="m5 12 4 4L19 6"></path>
                                </svg>
                            </button>

                        </article>
                    `;
            }
            return `
                    <button
                        class="kids-job-card kids-picture-text-job ${complete ? "complete" : ""}"
                        type="button"
                        data-kid-occurrence="${this.attr(task.occurrence_id)}"
                        data-complete="${complete ? "true" : "false"}"
                        data-task-engine="${this.attr(task.task_engine || "kid")}"
                        aria-label="${complete ? "Mark open" : "Mark complete"}: ${this.attr(task.title)}"
                    >

                        ${icon}


                        <div class="kids-job-copy">

                            <strong>
                                ${this.escape(task.title)}
                            </strong>

                            <span>
                                ${this.escape([
                task.program_name,
                task.room_name,
                this.timeLabel(task.due_time)
            ]
                .filter(Boolean)
                .join(" · ") ||
                "HomeOS mission")}
                            </span>

                        </div>


                        <span class="kids-job-check" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <path d="m5 12 4 4L19 6"></path>
                            </svg>
                        </span>

                    </button>
                `;
        },
        taskIcon(iconKey, title, imageUrl = "") {
            const key = String(iconKey ||
                "home-job")
                .trim()
                .toLowerCase();
            const fallback = String(title ||
                "Job")
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map(word => word[0] ||
                "")
                .join("")
                .toUpperCase();
            const imageSource = String(imageUrl || "").trim() ||
                `assets/images/kids/tasks/${key}.png`;
            const customClass = imageUrl ? " custom-picture" : "";
            return `
                    <span
                        class="kids-task-icon${customClass}"
                        data-kid-task-icon
                    >

                        <img
                            src="${this.attr(imageSource)}"
                            alt="${imageUrl ? this.attr(title || "Mission picture") : ""}"
                            loading="lazy"
                        >

                        <span class="kids-task-icon-fallback">
                            ${this.escape(fallback)}
                        </span>

                    </span>
                `;
        },
        bindIconFallbacks() {
            document
                .querySelectorAll("[data-kid-task-icon]")
                .forEach(wrapper => {
                const image = wrapper
                    .querySelector("img");
                if (!image) {
                    return;
                }
                const markMissing = () => wrapper
                    .classList
                    .add("missing");
                if (image.complete &&
                    !image.naturalWidth) {
                    markMissing();
                    return;
                }
                image.addEventListener("error", markMissing, {
                    once: true
                });
            });
        },
        focusContext() {
            const now = new Date();
            const day = now.getDay();
            const hour = now.getHours();
            const saturday = day ===
                6;
            const sunday = day ===
                0;
            if (saturday) {
                if (hour <
                    12) {
                    return {
                        primary: "morning",
                        kicker: "SATURDAY MORNING",
                        title: "Start your Saturday",
                        order: [
                            "morning",
                            "sports",
                            "weekend",
                            "general",
                            "night",
                            "backpack",
                            "after_school",
                            "after_school_program"
                        ]
                    };
                }
                if (hour <
                    18) {
                    return {
                        primary: "sports",
                        kicker: "SATURDAY",
                        title: "Sports + weekend jobs",
                        order: [
                            "sports",
                            "weekend",
                            "general",
                            "night",
                            "morning",
                            "backpack",
                            "after_school",
                            "after_school_program"
                        ]
                    };
                }
                return {
                    primary: "night",
                    kicker: "SATURDAY NIGHT",
                    title: "Close out the day",
                    order: [
                        "night",
                        "weekend",
                        "general",
                        "sports",
                        "morning",
                        "backpack",
                        "after_school",
                        "after_school_program"
                    ]
                };
            }
            if (sunday) {
                if (hour <
                    12) {
                    return {
                        primary: "morning",
                        kicker: "SUNDAY MORNING",
                        title: "Start your Sunday",
                        order: [
                            "morning",
                            "weekend",
                            "general",
                            "night",
                            "sports",
                            "backpack",
                            "after_school",
                            "after_school_program"
                        ]
                    };
                }
                if (hour <
                    18) {
                    return {
                        primary: "weekend",
                        kicker: "SUNDAY",
                        title: "Weekend jobs",
                        order: [
                            "weekend",
                            "general",
                            "night",
                            "morning",
                            "sports",
                            "backpack",
                            "after_school",
                            "after_school_program"
                        ]
                    };
                }
                return {
                    primary: "night",
                    kicker: "SUNDAY NIGHT",
                    title: "Get ready for the week",
                    order: [
                        "night",
                        "weekend",
                        "general",
                        "backpack",
                        "morning",
                        "sports",
                        "after_school",
                        "after_school_program"
                    ]
                };
            }
            if (hour <
                12) {
                return {
                    primary: "morning",
                    kicker: "SCHOOL MORNING",
                    title: "Morning + school ready",
                    order: [
                        "morning",
                        "backpack",
                        "general",
                        "after_school_program",
                        "after_school",
                        "sports",
                        "night",
                        "weekend"
                    ]
                };
            }
            if (hour <
                18) {
                return {
                    primary: "after_school",
                    kicker: "AFTER SCHOOL",
                    title: "Home + activities",
                    order: [
                        "after_school_program",
                        "sports",
                        "after_school",
                        "general",
                        "night",
                        "backpack",
                        "morning",
                        "weekend"
                    ]
                };
            }
            return {
                primary: "night",
                kicker: "TONIGHT",
                title: "Night routine",
                order: [
                    "night",
                    "general",
                    "backpack",
                    "after_school_program",
                    "sports",
                    "after_school",
                    "morning",
                    "weekend"
                ]
            };
        },
        async toggleTask(occurrenceId, currentlyComplete, taskEngine = "kid") {
            const next = !currentlyComplete;
            const finishingLastMission = next &&
                this.tasks.length > 0 &&
                this.tasks.filter(task => !task.complete).length === 1;
            const targetTask = this.tasks
                .find(task => String(task.occurrence_id) ===
                String(occurrenceId)) ||
                null;
            const targetRoutine = targetTask
                ?.routine_type ||
                "general";
            const targetGroupKey = targetTask
                ? (targetTask.program_name
                    ? `${targetRoutine}:${targetTask.program_name}`
                    : targetRoutine)
                : "";
            const targetGroupTasks = targetTask
                ? this.tasks.filter(task => {
                    const routine = task.routine_type ||
                        "general";
                    const key = task.program_name
                        ? `${routine}:${task.program_name}`
                        : routine;
                    return key ===
                        targetGroupKey;
                })
                : [];
            const finishingSection = next &&
                targetGroupTasks.length > 0 &&
                targetGroupTasks
                    .filter(task => !task.complete)
                    .length === 1;
            const sectionLabel = targetTask
                ?.program_name ||
                ROUTINES[targetRoutine]?.label ||
                "Mission set";
            const result = await service
                .setCompletion(this.sessionToken, occurrenceId, next, taskEngine);
            if (result.error) {
                this.toast(result.error.message ||
                    "HomeOS couldn't update that job.");
                return;
            }
            if (next) {
                window.HomeOS
                    ?.components
                    ?.rhythmCompanion
                    ?.reactToTask?.("sun");
                this.celebrate();
            }
            await this.loadTasks();
            if (finishingSection) {
                window.requestAnimationFrame(() => this.celebrateSection(targetGroupKey, sectionLabel));
            }
            if (finishingLastMission) {
                window.setTimeout(() => this.launchFullPageFireworks(), finishingSection
                    ? 2100
                    : 0);
            }
        },
        applyTheme(theme) {
            const safe = theme ===
                "boy"
                ? "boy"
                : "girl";
            document.body
                .dataset
                .kidsTheme =
                safe;
            document
                .querySelectorAll("[data-kids-theme]")
                .forEach(button => {
                if (button.closest(".kids-theme-switch")) {
                    button.classList
                        .toggle("active", button.dataset
                        .kidsTheme ===
                        safe);
                }
            });
            const switcher = document
                .getElementById("kidsThemeSwitch");
            if (switcher) {
                switcher.hidden =
                    !this.sessionToken;
            }
        },
        showMissing() {
            document
                .getElementById("kidsMissingPortal")
                .hidden =
                false;
            document
                .getElementById("kidsProfileStage")
                .hidden =
                true;
            document
                .getElementById("kidsDashboard")
                .hidden =
                true;
        },
        showProfiles() {
            document
                .getElementById("kidsMissingPortal")
                .hidden =
                true;
            document
                .getElementById("kidsProfileStage")
                .hidden =
                false;
            document
                .getElementById("kidsDashboard")
                .hidden =
                true;
            document
                .getElementById("kidsThemeSwitch")
                .hidden =
                true;
        },
        showDashboard() {
            document
                .getElementById("kidsMissingPortal")
                .hidden =
                true;
            document
                .getElementById("kidsProfileStage")
                .hidden =
                true;
            document
                .getElementById("kidsDashboard")
                .hidden =
                false;
            document
                .getElementById("kidsThemeSwitch")
                .hidden =
                false;
        },
        async kidLogout(showProfiles = true) {
            const token = this.sessionToken;
            this.sessionToken =
                "";
            this.session =
                null;
            this.tasks =
                [];
            sessionStorage
                .removeItem("homeos_kids_session");
            if (token) {
                await service
                    .logout(token);
            }
            if (showProfiles) {
                await this.loadProfiles();
            }
        },
        async grownupLogin() {
            await this.kidLogout(false);
            const adultSession = await service.getAdultAuthSession?.();
            window.location.href =
                adultSession?.data
                    ? "index.html"
                    : "login.html";
        },
        celebrateSection(sectionKey, sectionLabel = "Mission set") {
            const sections = [
                ...document
                    .querySelectorAll(".kids-routine-group[data-section-key]")
            ];
            const section = sections.find(node => node.dataset.sectionKey ===
                String(sectionKey));
            if (!section) {
                this.toast(`${sectionLabel} complete!`);
                return;
            }
            section
                .querySelector(".kids-section-celebration")
                ?.remove();
            section.classList
                .remove("section-celebrating");
            void section.offsetWidth;
            section.classList
                .add("section-celebrating");
            const layer = document
                .createElement("div");
            layer.className =
                "kids-section-celebration";
            layer.innerHTML = `
                    <div class="kids-section-celebration-banner" role="status" aria-live="polite">
                        <span>SECTION COMPLETE</span>
                        <strong>${this.escape(sectionLabel)}</strong>
                        <em>Great work! Keep going.</em>
                    </div>
                    <div class="kids-section-celebration-burst" aria-hidden="true"></div>
                `;
            const burst = layer.querySelector(".kids-section-celebration-burst");
            const reducedMotion = window
                .matchMedia("(prefers-reduced-motion: reduce)")
                .matches;
            const pieces = reducedMotion
                ? 16
                : 34;
            for (let i = 0; i < pieces; i += 1) {
                const bit = document
                    .createElement("i");
                bit.style
                    .setProperty("--angle", `${Math.random() * 360}deg`);
                bit.style
                    .setProperty("--distance", `${72 + Math.random() * 165}px`);
                bit.style
                    .setProperty("--delay", `${Math.random() * .18}s`);
                bit.style
                    .setProperty("--size", `${5 + Math.random() * 7}px`);
                burst
                    ?.appendChild(bit);
            }
            section
                .appendChild(layer);
            this.toast(`${sectionLabel} complete! ✦`);
            window.setTimeout(() => {
                section.classList
                    .remove("section-celebrating");
                layer.remove();
            }, reducedMotion
                ? 1700
                : 2600);
        },
        launchFullPageFireworks() {
            document
                .querySelector(".kids-fireworks-layer")
                ?.remove();
            const layer = document
                .createElement("div");
            layer.className =
                "kids-fireworks-layer";
            layer.innerHTML = `
                    <canvas class="kids-fireworks-canvas" aria-hidden="true"></canvas>
                    <div class="kids-fireworks-banner" role="status" aria-live="polite">
                        <span>MISSION COMPLETE</span>
                        <strong>ALL MISSIONS COMPLETE!</strong>
                        <em>Great work, Explorer!</em>
                    </div>
                `;
            document.body
                .appendChild(layer);
            const canvas = layer.querySelector(".kids-fireworks-canvas");
            const ctx = canvas
                ?.getContext("2d");
            if (!canvas ||
                !ctx) {
                window.setTimeout(() => layer.remove(), 4200);
                return;
            }
            const style = getComputedStyle(document.body);
            const colors = [
                style.getPropertyValue("--a").trim() || "#67e8f9",
                style.getPropertyValue("--b").trim() || "#c084fc",
                style.getPropertyValue("--c").trim() || "#f9a8d4",
                "#ffffff",
                "#f7d774"
            ];
            const rockets = [];
            const sparks = [];
            const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            let width = 0;
            let height = 0;
            let dpr = 1;
            let animationFrame = 0;
            let launchTimer = 0;
            let stopped = false;
            const resize = () => {
                width = window.innerWidth;
                height = window.innerHeight;
                dpr = Math.min(window.devicePixelRatio || 1, 2);
                canvas.width =
                    Math.round(width * dpr);
                canvas.height =
                    Math.round(height * dpr);
                canvas.style.width =
                    `${width}px`;
                canvas.style.height =
                    `${height}px`;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            };
            const explode = (x, y, color) => {
                const count = reducedMotion
                    ? 24
                    : 46;
                for (let i = 0; i < count; i += 1) {
                    const angle = Math.random() *
                        Math.PI *
                        2;
                    const speed = 1.8 +
                        Math.random() *
                            4.8;
                    sparks.push({
                        x,
                        y,
                        previousX: x,
                        previousY: y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        gravity: .045 + Math.random() * .035,
                        drag: .986,
                        life: 1,
                        fade: .011 + Math.random() * .012,
                        size: 1.2 + Math.random() * 1.9,
                        color
                    });
                }
            };
            const launchRocket = (forcedX = null, forcedTarget = null) => {
                const color = colors[Math.floor(Math.random() *
                    colors.length)];
                rockets.push({
                    x: forcedX ?? (width * (.10 + Math.random() * .80)),
                    y: height + 20,
                    targetY: forcedTarget ?? (height * (.10 + Math.random() * .46)),
                    speed: 8 + Math.random() * 4,
                    color
                });
            };
            const draw = () => {
                ctx.clearRect(0, 0, width, height);
                ctx.save();
                ctx.globalCompositeOperation =
                    "lighter";
                for (let i = rockets.length - 1; i >= 0; i -= 1) {
                    const rocket = rockets[i];
                    rocket.y -=
                        rocket.speed;
                    rocket.speed *=
                        .994;
                    ctx.beginPath();
                    ctx.moveTo(rocket.x, rocket.y + 20);
                    ctx.lineTo(rocket.x, rocket.y);
                    ctx.strokeStyle =
                        rocket.color;
                    ctx.lineWidth =
                        2.2;
                    ctx.globalAlpha =
                        .92;
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(rocket.x, rocket.y, 3, 0, Math.PI * 2);
                    ctx.fillStyle =
                        "#ffffff";
                    ctx.fill();
                    if (rocket.y <=
                        rocket.targetY) {
                        explode(rocket.x, rocket.y, rocket.color);
                        rockets.splice(i, 1);
                    }
                }
                for (let i = sparks.length - 1; i >= 0; i -= 1) {
                    const spark = sparks[i];
                    spark.previousX =
                        spark.x;
                    spark.previousY =
                        spark.y;
                    spark.vx *=
                        spark.drag;
                    spark.vy =
                        spark.vy *
                            spark.drag +
                            spark.gravity;
                    spark.x +=
                        spark.vx;
                    spark.y +=
                        spark.vy;
                    spark.life -=
                        spark.fade;
                    ctx.globalAlpha =
                        Math.max(spark.life, 0);
                    ctx.strokeStyle =
                        spark.color;
                    ctx.lineWidth =
                        spark.size;
                    ctx.beginPath();
                    ctx.moveTo(spark.previousX, spark.previousY);
                    ctx.lineTo(spark.x, spark.y);
                    ctx.stroke();
                    if (spark.life <= 0) {
                        sparks.splice(i, 1);
                    }
                }
                ctx.restore();
                if (!stopped ||
                    rockets.length ||
                    sparks.length) {
                    animationFrame =
                        window.requestAnimationFrame(draw);
                }
            };
            resize();
            window.addEventListener("resize", resize);
            [
                [.18, .24],
                [.38, .14],
                [.61, .22],
                [.82, .16]
            ].forEach(([x, y], index) => {
                window.setTimeout(() => launchRocket(width * x, height * y), index * 120);
            });
            launchTimer =
                window.setInterval(() => launchRocket(), reducedMotion
                    ? 650
                    : 310);
            draw();
            window.setTimeout(() => {
                stopped = true;
                window.clearInterval(launchTimer);
            }, reducedMotion
                ? 2100
                : 3900);
            window.setTimeout(() => {
                stopped = true;
                window.clearInterval(launchTimer);
                window.cancelAnimationFrame(animationFrame);
                window.removeEventListener("resize", resize);
                layer.remove();
            }, reducedMotion
                ? 3600
                : 5600);
        },
        celebrate() {
            const layer = document
                .createElement("div");
            layer.className =
                "kids-celebrate";
            for (let i = 0; i <
                22; i +=
                1) {
                const bit = document
                    .createElement("i");
                bit.style.left =
                    `${45 + Math.random() * 10}%`;
                bit.style
                    .setProperty("--x", `${-220 + Math.random() * 440}px`);
                bit.style
                    .setProperty("--y", `${-250 + Math.random() * 130}px`);
                bit.style.animationDelay =
                    `${Math.random() * .12}s`;
                layer.appendChild(bit);
            }
            document.body
                .appendChild(layer);
            window.setTimeout(() => layer.remove(), 1200);
        },
        bind() {
            document
                .addEventListener("keydown", event => {
                const backdrop = document.getElementById("kidsPinBackdrop");
                if (!backdrop ||
                    backdrop.hidden) {
                    return;
                }
                if (/^[0-9]$/.test(event.key)) {
                    event.preventDefault();
                    return this.pinKey(event.key);
                }
                if (event.key === "Backspace") {
                    event.preventDefault();
                    return this.pinBack();
                }
                if (event.key === "Escape") {
                    event.preventDefault();
                    return this.closePin();
                }
                if (event.key === "Enter" &&
                    this.pin.length === 4) {
                    event.preventDefault();
                    return this.unlock();
                }
            });
            document
                .addEventListener("click", event => {
                const profile = event.target
                    .closest("[data-kid-profile]");
                if (profile) {
                    return this.openPin(profile.dataset
                        .kidProfile);
                }
                const key = event.target
                    .closest("[data-pin-key]");
                if (key) {
                    return this.pinKey(key.dataset
                        .pinKey);
                }
                if (event.target
                    .closest("[data-pin-back]")) {
                    return this.pinBack();
                }
                if (event.target
                    .closest("[data-pin-clear]")) {
                    return this.pinClear();
                }
                if (event.target
                    .closest("#closeKidsPin")) {
                    return this.closePin();
                }
                if (event.target
                    .closest("#kidsUnlockButton")) {
                    return this.unlock();
                }
                const task = event.target
                    .closest("[data-kid-occurrence]");
                if (task) {
                    return this.toggleTask(task.dataset
                        .kidOccurrence, task.dataset
                        .complete ===
                        "true", task.dataset
                        .taskEngine ||
                        "kid");
                }
                const theme = event.target
                    .closest(".kids-theme-switch [data-kids-theme]");
                if (theme) {
                    return this.applyTheme(theme.dataset
                        .kidsTheme);
                }
                if (event.target
                    .closest("#switchKidButton")) {
                    return this.switchExplorer();
                }
                if (event.target
                    .closest("#grownupLoginButton")) {
                    return this.grownupLogin();
                }
            });
        },
        ageBand(displayMode = "picture_text") {
            const effective = String(this.session
                ?.effective_age_band ||
                "")
                .toLowerCase();
            if ([
                "little",
                "school_age",
                "teen"
            ].includes(effective)) {
                return effective;
            }
            const birthDate = String(this.session
                ?.birth_date ||
                "");
            if (/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
                const [year, month, day] = birthDate.split("-").map(Number);
                const today = new Date();
                let age = today.getFullYear() - year;
                const monthDelta = today.getMonth() - (month - 1);
                if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < day))
                    age -= 1;
                if (age >= 1 && age <= 4)
                    return "little";
                if (age >= 5 && age <= 10)
                    return "school_age";
                if (age >= 11 && age <= 18)
                    return "teen";
            }
            const saved = String(this.session
                ?.age_band ||
                "")
                .toLowerCase();
            if ([
                "little",
                "school_age",
                "teen"
            ].includes(saved)) {
                return saved;
            }
            return {
                picture: "little",
                picture_text: "school_age",
                text: "teen"
            }[displayMode] ||
                "school_age";
        },
        setupAlienBlink() {
            const eyes = Array.from(document.querySelectorAll(".kids-alien-eye"));
            if (!eyes.length) {
                return;
            }
            if (this.alienBlinkTimer) {
                window.clearInterval(this.alienBlinkTimer);
            }
            const setOpen = (eye) => {
                eye.style.setProperty("transform", "scaleY(1)", "important");
            };
            const setClosed = (eye) => {
                eye.style.setProperty("transform", "scaleY(0.06)", "important");
            };
            eyes.forEach(setOpen);
            const blink = () => {
                eyes.forEach((eye, index) => {
                    window.setTimeout(() => {
                        setClosed(eye);
                        window.setTimeout(() => setOpen(eye), 135);
                    }, index * 85);
                });
            };
            // First visible blink shortly after the page appears.
            window.setTimeout(blink, 900);
            // Match the playful rhythm of the original alien.
            this.alienBlinkTimer =
                window.setInterval(blink, 2600);
        },
        setupParticles() {
            const layer = document.getElementById("kidsParticleLayer");
            if (!layer ||
                window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                return;
            }
            const colors = [
                "var(--a)",
                "var(--b)",
                "var(--c)",
                "rgba(255,255,255,.92)"
            ];
            const spawn = () => {
                if (document.hidden ||
                    layer.childElementCount >=
                        28) {
                    return;
                }
                const particle = document.createElement("i");
                particle.className =
                    "kids-space-particle";
                particle.style.setProperty("--particle-size", `${2 + Math.random() * 4}px`);
                particle.style.setProperty("--particle-x", `${Math.random() * 100}%`);
                const drift = -90 + Math.random() * 180;
                particle.style.setProperty("--particle-drift", `${drift}px`);
                particle.style.setProperty("--particle-drift-end", `${drift * -.35}px`);
                particle.style.setProperty("--particle-duration", `${10 + Math.random() * 10}s`);
                particle.style.setProperty("--particle-color", colors[Math.floor(Math.random() *
                    colors.length)]);
                particle.addEventListener("animationend", () => particle.remove(), {
                    once: true
                });
                layer.appendChild(particle);
            };
            for (let index = 0; index < 10; index += 1) {
                window.setTimeout(spawn, index * 160);
            }
            window.setInterval(spawn, 720);
        },
        greeting() {
            return "HI";
        },
        dateKey() {
            const date = new Date();
            return [
                date.getFullYear(),
                String(date.getMonth() +
                    1)
                    .padStart(2, "0"),
                String(date.getDate())
                    .padStart(2, "0")
            ]
                .join("-");
        },
        timeLabel(time) {
            if (!time) {
                return "";
            }
            const [hour, minute] = String(time)
                .slice(0, 5)
                .split(":")
                .map(Number);
            const date = new Date();
            date.setHours(hour, minute, 0, 0);
            return new Intl
                .DateTimeFormat(undefined, {
                hour: "numeric",
                minute: "2-digit"
            })
                .format(date);
        },
        text(id, value) {
            const element = document
                .getElementById(id);
            if (element) {
                element.textContent =
                    String(value ??
                        "");
            }
        },
        toast(message) {
            const element = document
                .getElementById("kidsToast");
            if (!element) {
                return;
            }
            element.textContent =
                message;
            element.classList
                .add("show");
            clearTimeout(this.toastTimer);
            this.toastTimer =
                setTimeout(() => element.classList
                    .remove("show"), 2600);
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
    await App.init();
});
