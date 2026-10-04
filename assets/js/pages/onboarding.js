/* ============================================================
   HOMEOS // ONBOARDING

   The guided HomeOS setup flow.
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";
    const service = window.HomeOS?.services?.onboarding;
    const STEPS = [
        ["household", "Home", "Name this home",
            "Set the shared household name and home type."],
        ["people", "People", "Who lives here?",
            "Add the people HomeOS may organize responsibilities for. Kids use a birthday so HomeOS can calculate age and update their mission mode automatically."],
        ["levels", "Layout", "Build your home layout",
            "Add the floors or sections, then the rooms and spaces inside them."],
        ["zones", "Cleaning", "Create cleaning zones",
            "Group rooms into the zones you want Cleaning to track."],
        ["inventory", "Inventory", "Choose inventory locations",
            "Select the places where food and household supplies are stored."],
        ["laundry", "Laundry", "Build your laundry system",
            "Choose where laundry runs and how your household separates loads."],
        ["features", "Home care", "Choose recurring-care items",
            "Select the appliances and features HomeOS should maintain."],
        ["ready", "Review", "Review your setup",
            "Check the structure before HomeOS builds it."]
    ].map(([key, label, title, description]) => ({
        key, label, title, description
    }));
    const HOME_TYPES = [
        ["house", "House"],
        ["townhome", "Townhome"],
        ["apartment", "Apartment"],
        ["condo", "Condo"],
        ["multi_family", "Multi-family"],
        ["other", "Other"]
    ];
    // --- Setup Definitions + Presets ---
    const LEVEL_PRESETS = [
        ["main", "Main Floor"],
        ["single", "Single Level"],
        ["upstairs", "Upstairs"],
        ["second", "Second Floor"],
        ["third", "Third Floor"],
        ["lower", "Lower Level"],
        ["basement", "Basement"],
        ["garage", "Garage"],
        ["exterior", "Exterior"],
        ["custom", "Other / Custom Level"]
    ];
    const AREA_CATEGORIES = [
        ["", "Choose an area category"],
        ["bedroom", "Bedroom"],
        ["bathroom", "Bathroom"],
        ["living", "Living + Family Space"],
        ["kitchen_dining", "Kitchen + Dining"],
        ["work_play", "Work + Play"],
        ["storage", "Storage + Closets"],
        ["utility", "Utility + Circulation"],
        ["garage", "Garage"],
        ["exterior", "Exterior"],
        ["other", "Other / Custom"]
    ];
    const AREA_TYPES = {
        bedroom: [
            ["bedroom", "Bedroom", "bedroom", "Bedroom"],
            ["primary_bedroom", "Primary Bedroom", "bedroom", "Primary Bedroom"],
            ["kids_bedroom", "Kids Bedroom", "bedroom", "Kids Bedroom"],
            ["guest_bedroom", "Guest Bedroom", "bedroom", "Guest Bedroom"],
            ["nursery", "Nursery", "bedroom", "Nursery"]
        ],
        bathroom: [
            ["full_bathroom", "Full Bathroom", "bathroom", "Bathroom"],
            ["primary_bathroom", "Primary Bathroom", "bathroom", "Primary Bathroom"],
            ["kids_bathroom", "Kids Bathroom", "bathroom", "Kids Bathroom"],
            ["guest_bathroom", "Guest Bathroom", "bathroom", "Guest Bathroom"],
            ["half_bathroom", "Half Bath / Powder Room", "bathroom", "Half Bathroom"]
        ],
        living: [
            ["living_room", "Living Room", "living_room", "Living Room"],
            ["family_room", "Family Room", "living_room", "Family Room"],
            ["great_room", "Great Room", "living_room", "Great Room"],
            ["den", "Den", "den", "Den"],
            ["basement_living", "Basement Living Area", "basement", "Basement Living Area"]
        ],
        kitchen_dining: [
            ["kitchen", "Kitchen", "kitchen", "Kitchen"],
            ["breakfast_nook", "Breakfast Nook", "dining", "Breakfast Nook"],
            ["dining_room", "Dining Room", "dining", "Dining Room"],
            ["formal_dining", "Formal Dining Room", "dining", "Formal Dining Room"],
            ["pantry", "Pantry / Butler's Pantry", "pantry", "Pantry"],
            ["bar", "Bar / Beverage Area", "bar", "Bar"]
        ],
        work_play: [
            ["office", "Office", "office", "Office"],
            ["sitting_area", "Sitting Area", "office", "Sitting Area"],
            ["playroom", "Playroom", "den", "Playroom"],
            ["game_room", "Game / Common Room", "den", "Game Room"],
            ["gym", "Home Gym", "other", "Home Gym"]
        ],
        storage: [
            ["walk_in_closet", "Walk-In Closet", "closet", "Walk-In Closet"],
            ["closet", "Closet", "closet", "Closet"],
            ["linen_closet", "Linen Closet", "linen", "Linen Closet"],
            ["storage", "Storage Room", "storage", "Storage Room"],
            ["utility_closet", "Utility Closet", "storage", "Utility Closet"]
        ],
        utility: [
            ["laundry", "Laundry Room", "laundry", "Laundry Room"],
            ["entry", "Entryway / Foyer", "entry", "Entryway"],
            ["mudroom", "Mudroom", "entry", "Mudroom"],
            ["hallway", "Hallway", "hall", "Hallway"],
            ["stairs", "Stairs / Stairway", "hall", "Stairs"]
        ],
        garage: [
            ["garage", "Garage", "garage", "Garage"],
            ["one_car_garage", "1-Car Garage", "garage", "Garage"],
            ["two_car_garage", "2-Car Garage", "garage", "Garage"],
            ["three_car_garage", "3-Car Garage", "garage", "Garage"],
            ["garage_storage", "Garage Storage Area", "garage", "Garage Storage"]
        ],
        exterior: [
            ["front_porch", "Front Porch", "outdoor", "Front Porch"],
            ["back_porch", "Back Porch", "outdoor", "Back Porch"],
            ["deck", "Deck", "outdoor", "Deck"],
            ["patio", "Patio", "outdoor", "Patio"],
            ["yard", "Yard", "outdoor", "Yard"],
            ["front_yard", "Front Yard", "outdoor", "Front Yard"],
            ["back_yard", "Back Yard", "outdoor", "Back Yard"],
            ["driveway", "Driveway", "outdoor", "Driveway"],
            ["shed", "Shed", "outdoor", "Shed"],
            ["garden", "Garden", "outdoor", "Garden"],
            ["pool", "Pool / Pool Area", "outdoor", "Pool Area"]
        ],
        other: []
    };
    const LAUNDRY_PRESETS = [
        ["laundry_room", "Laundry Room", "washer_dryer", "Laundry Room"],
        ["laundry_closet", "Laundry Closet", "washer_dryer", "Laundry Closet"],
        ["upstairs_laundry", "Upstairs Laundry", "washer_dryer", "Upstairs Laundry"],
        ["basement_laundry", "Basement Laundry", "washer_dryer", "Basement Laundry"],
        ["garage_laundry", "Garage Laundry", "washer_dryer", "Garage Laundry"],
        ["washer_only", "Washer Only Area", "washer_only", "Washer Area"],
        ["dryer_only", "Dryer Only Area", "dryer_only", "Dryer Area"],
        ["shared", "Shared / Community Laundry", "shared", "Shared Laundry"],
        ["custom", "Custom Laundry Area", "washer_dryer", ""]
    ];
    const LAUNDRY_SYSTEMS = [
        {
            key: "color",
            dbKey: "color",
            code: "COLOR",
            title: "Sort by color",
            description: "Separate clothes into darks, lights and whites, with towels and linens in their own loads.",
            groups: ["Darks", "Lights", "Whites", "Towels", "Bedding + Linens", "Delicates + Special Care"]
        },
        {
            key: "by_person",
            dbKey: "by_person",
            code: "PERSON",
            title: "By person",
            description: "Each person gets their own clothes load. Great when kids handle or help with their own laundry.",
            groups: []
        },
        {
            key: "kids_separate",
            dbKey: "kids_separate",
            code: "FAMILY",
            title: "Kids separate",
            description: "Adult clothes stay together and kids' clothes stay in a separate family load.",
            groups: ["Adult Clothes", "Kids Clothes", "Towels", "Bedding + Linens", "Special Care"]
        },
        {
            key: "hybrid",
            dbKey: "custom",
            code: "HYBRID",
            title: "Hybrid system",
            description: "Mix methods — for example, adults by color while each child keeps their own clothes load.",
            groups: []
        },
        {
            key: "simple",
            dbKey: "simple",
            code: "SIMPLE",
            title: "Simple household loads",
            description: "Use a few broad groups: clothes, towels, bedding and special-care items.",
            groups: ["Clothes", "Towels", "Bedding + Linens", "Mats + Rugs", "Special Care"]
        },
        {
            key: "custom",
            dbKey: "custom",
            code: "CUSTOM",
            title: "Create my own",
            description: "Build the exact load groups your household already uses.",
            groups: []
        }
    ];
    const INVENTORY = [
        ["pantry", "Pantry", "pantry"],
        ["refrigerator", "Refrigerator", "refrigerator"],
        ["freezer", "Kitchen Freezer", "freezer"],
        ["deep_freezer", "Deep Freezer", "deep_freezer"],
        ["mini_fridge", "Mini Fridge", "mini_fridge"],
        ["household_supplies", "Household Supplies", "household_supplies"]
    ];
    const FEATURES = [
        ["dishwasher", "Dishwasher", "appliance"],
        ["oven", "Oven", "appliance"],
        ["microwave", "Microwave", "appliance"],
        ["range_hood", "Range Hood", "appliance"],
        ["refrigerator", "Refrigerator", "appliance"],
        ["deep_freezer", "Deep Freezer", "appliance"],
        ["hvac_filter", "HVAC Filter", "maintenance"],
        ["washer", "Washer", "appliance"],
        ["dryer", "Dryer", "appliance"],
        ["fireplace", "Fireplace", "home_feature"],
        ["deck", "Deck", "exterior"],
        ["porch", "Porch", "exterior"],
        ["garage", "Garage", "home_feature"],
        ["pool", "Pool", "exterior"],
        ["water_filter", "Water Filter", "maintenance"],
        ["smoke_detectors", "Smoke Detectors", "safety"]
    ];
    const COLORS = [
        "#80cbd0",
        "#aaa0e4",
        "#dca0b4",
        "#8fc3a2",
        "#89badd",
        "#d0aa72",
        "#aeb8e6",
        "#efad93"
    ];
    const uid = prefix => `${prefix}-${crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`}`;
    // --- Controller State + Initialization ---
    const App = {
        session: null,
        stepIndex: 0,
        completedSteps: [],
        committedHouseholdId: null,
        draft: {
            rebuildExistingHome: false,
            household: {
                name: "",
                homeType: "",
                tagline: ""
            },
            people: [],
            levels: [],
            zones: [],
            suppressedLevelZoneIds: [],
            inventory: [],
            laundry: [],
            laundryProfile: {
                mode: "color",
                customCategories: [],
                washMinutes: 45,
                dryMinutes: 60
            },
            features: []
        },
        async init() {
            if (!service) {
                this.alert("HomeOS onboarding services are unavailable.");
                return;
            }
            this.session = await window.HomeOS.session.guard({
                allowWithoutHousehold: true,
                allowIncompleteOnboarding: true
            });
            if (!this.session.authenticated)
                return;
            if (this.session.household?.onboarding_status === "complete") {
                this.redirect(window.HomeOS.config.routes.home);
                return;
            }
            this.bindEvents();
            this.renderUser();
            await this.load();
            this.render();
        },
        async load() {
            const { data, error } = await service.getState();
            if (error) {
                if (!this.session.household?.id)
                    return;
                console.error(error);
                this.alert(error.message ||
                    "HomeOS could not load setup progress.");
                return;
            }
            if (data?.household) {
                this.session = {
                    ...this.session,
                    household: data.household,
                    membership: data.membership,
                    person: data.person,
                    role: data.membership?.role || this.session.role
                };
            }
            const onboarding = data?.onboarding;
            if (onboarding?.draft &&
                Object.keys(onboarding.draft).length) {
                this.draft = this.normalizeDraft(onboarding.draft);
            }
            else if (data?.household?.id) {
                this.draft.household = {
                    name: data.household.name || "",
                    homeType: data.household.home_type || "",
                    tagline: data.household.tagline || ""
                };
            }
            this.completedSteps =
                Array.isArray(onboarding?.completed_steps)
                    ? onboarding.completed_steps
                    : [];
            const index = STEPS.findIndex(step => step.key === onboarding?.current_step);
            if (index >= 0)
                this.stepIndex = index;
        },
        normalizeDraft(draft) {
            return {
                rebuildExistingHome: Boolean(draft?.rebuildExistingHome),
                household: {
                    name: draft?.household?.name || "",
                    homeType: draft?.household?.homeType || "",
                    tagline: draft?.household?.tagline || ""
                },
                people: Array.isArray(draft?.people)
                    ? draft.people.map(person => ({
                        ...person,
                        birthDate:
                            window.HomeOS?.services?.kidAge?.normalizeDateKey?.(
                                person?.birthDate || person?.birth_date
                            ) || ""
                    }))
                    : [],
                levels: Array.isArray(draft?.levels) ? draft.levels : [],
                zones: Array.isArray(draft?.zones) ? draft.zones : [],
                suppressedLevelZoneIds: Array.isArray(draft?.suppressedLevelZoneIds)
                    ? draft.suppressedLevelZoneIds
                    : [],
                inventory: Array.isArray(draft?.inventory)
                    ? draft.inventory
                    : [],
                laundry: Array.isArray(draft?.laundry)
                    ? draft.laundry.map(area => ({
                        ...area,
                        laundrySystem: area?.laundrySystem ||
                            area?.laundry_system ||
                            "color",
                        systemMode: area?.systemMode ||
                            (area?.laundrySystem === "custom" || area?.laundry_system === "custom"
                                ? "custom"
                                : area?.laundrySystem || area?.laundry_system || "color"),
                        customCategories: Array.isArray(area?.customCategories)
                            ? area.customCategories
                            : Array.isArray(area?.custom_categories)
                                ? area.custom_categories
                                : [],
                        washMinutes: Number(area?.washMinutes || area?.wash_minutes || 45),
                        dryMinutes: Number(area?.dryMinutes || area?.dry_minutes || 60)
                    }))
                    : [],
                laundryProfile: this.normalizeLaundryProfile(draft),
                features: Array.isArray(draft?.features) ? draft.features : []
            };
        },
        normalizeLaundryProfile(draft) {
            const laundry = Array.isArray(draft?.laundry) ? draft.laundry : [];
            const first = laundry[0] || {};
            const saved = draft?.laundryProfile || {};
            const firstSystem = first?.laundrySystem || first?.laundry_system || "color";
            let mode = saved?.mode || first?.systemMode || firstSystem || "color";
            if (!LAUNDRY_SYSTEMS.some(item => item.key === mode)) {
                mode = firstSystem === "custom" ? "custom" : "color";
            }
            const categories = Array.isArray(saved?.customCategories)
                ? saved.customCategories
                : Array.isArray(first?.customCategories)
                    ? first.customCategories
                    : Array.isArray(first?.custom_categories)
                        ? first.custom_categories
                        : [];
            return {
                mode,
                customCategories: categories.map(String).filter(Boolean),
                washMinutes: Math.max(1, Number(saved?.washMinutes || first?.washMinutes || first?.wash_minutes || 45)),
                dryMinutes: Math.max(1, Number(saved?.dryMinutes || first?.dryMinutes || first?.dry_minutes || 60))
            };
        },
        // --- Shared Rendering ---
        step() {
            return STEPS[this.stepIndex];
        },
        render() {
            const step = this.step();
            this.text("stepKicker", `MODULE ${String(this.stepIndex + 1).padStart(2, "0")} / ${String(STEPS.length).padStart(2, "0")}`);
            this.text("stepTitle", step.title);
            this.text("stepDescription", step.description);
            this.renderProgress();
            this.renderStep();
            this.renderActions();
            this.renderRebuildBanner();
            this.clearAlert();
        },
        renderRebuildBanner() {
            const workspace = document.querySelector(".onboarding-workspace");
            if (!workspace)
                return;
            workspace
                .querySelector(".ob-rebuild-banner")
                ?.remove();
            if (!this.draft.rebuildExistingHome)
                return;
            const banner = document.createElement("section");
            banner.className =
                "ob-rebuild-banner";
            banner.innerHTML = `
                <div>
                    <span class="onboarding-kicker">
                        HOME SETUP REBUILD
                    </span>

                    <strong>
                        Your current home stays live until you finish.
                    </strong>

                    <p>
                        Make your changes here. HomeOS only replaces the live
                        layout after you review it and choose <b>Build My HomeOS</b>.
                    </p>
                </div>

                <button
                    class="onboarding-button onboarding-button-secondary"
                    type="button"
                    data-action="cancel-home-rebuild"
                >
                    Cancel Rebuild
                </button>
            `;
            document
                .getElementById("onboardingAlert")
                ?.insertAdjacentElement("beforebegin", banner);
        },
        renderUser() {
            const name = this.session?.user?.displayName ||
                "HomeOS User";
            this.text("onboardingUserName", name);
            this.text("onboardingUserAvatar", name.charAt(0).toUpperCase() || "H");
        },
        renderProgress() {
            const target = document.getElementById("onboardingProgress");
            if (!target)
                return;
            target.innerHTML = STEPS.map((step, index) => {
                const active = index === this.stepIndex;
                const complete = this.completedSteps.includes(step.key);
                const disabled = index > this.stepIndex && !complete;
                return `
                    <button
                        class="onboarding-progress-item
                            ${active ? "active" : ""}
                            ${complete ? "complete" : ""}"
                        type="button"
                        data-step-index="${index}"
                        ${disabled ? "disabled" : ""}
                    >
                        <span class="onboarding-progress-number">
                            ${index + 1}
                        </span>
                        <span class="onboarding-progress-copy">
                            <strong>${this.escape(step.label)}</strong>
                            <small>${this.escape(step.title)}</small>
                        </span>
                        <span class="onboarding-progress-check">
                            ${complete ? "✓" : ""}
                        </span>
                    </button>
                `;
            }).join("");
        },
        renderStep() {
            const target = document.getElementById("onboardingStep");
            if (!target)
                return;
            const method = `render_${this.step().key}`;
            target.innerHTML =
                typeof this[method] === "function"
                    ? this[method]()
                    : "";
        },
        renderActions() {
            const back = document.getElementById("onboardingBack");
            const next = document.getElementById("onboardingNext");
            if (back)
                back.hidden = this.stepIndex === 0;
            if (next) {
                next.innerHTML =
                    this.step().key === "ready"
                        ? `Build My HomeOS <span aria-hidden="true">→</span>`
                        : `Continue <span aria-hidden="true">→</span>`;
            }
        },
        // --- Household ---
        render_household() {
            const h = this.draft.household;
            return `
                <div class="ob-section-heading">
                    <h3>Home identity</h3>
                    <p>
                        Give this household the name and home type you want shown across HomeOS.
                    </p>
                </div>

                <div class="ob-form-grid">

                    <label class="ob-field">
                        <span>Household name</span>
                        <input
                            id="householdName"
                            type="text"
                            maxlength="80"
                            placeholder="Jackson Home"
                            value="${this.attr(h.name)}"
                        >
                    </label>

                    <label class="ob-field">
                        <span>Home type</span>
                        <select id="householdType">
                            <option value="">Choose a home type</option>
                            ${HOME_TYPES.map(([value, label]) => `
                                <option
                                    value="${value}"
                                    ${h.homeType === value ? "selected" : ""}
                                >
                                    ${label}
                                </option>
                            `).join("")}
                        </select>
                    </label>

                    <label class="ob-field ob-field-wide">
                        <span>Optional household tagline</span>
                        <input
                            id="householdTagline"
                            type="text"
                            maxlength="120"
                            placeholder="A brighter home lives here."
                            value="${this.attr(h.tagline)}"
                        >
                    </label>

                </div>
            `;
        },
        captureHousehold() {
            this.draft.household = {
                name: this.value("householdName").trim(),
                homeType: this.value("householdType"),
                tagline: this.value("householdTagline").trim()
            };
            if (!this.draft.household.name) {
                throw new Error("Give your household a name before continuing.");
            }
        },
        // --- People ---
        render_people() {
            const ownerName = this.session?.user?.displayName ||
                "You";
            return `
                <div class="ob-section-heading">
                    <h3>Household people</h3>
                    <p>
                        Add the people HomeOS may assign tasks to. A person does not need a login.
                    </p>
                </div>

                <div class="ob-collection">

                    <article class="ob-card ob-owner-card">
                        <div>
                            <h4>${this.escape(ownerName)}</h4>
                            <p>Your connected HomeOS account</p>
                        </div>
                        <strong>OWNER · CONNECTED</strong>
                    </article>

                    ${this.draft.people.map(person => `
                        <article class="ob-collection-card">
                            <div class="ob-collection-card-header">
                                <div>
                                    <h4>${this.escape(person.name)}</h4>
                                    <p>${this.escape(
                                        ["child", "teen", "dependent"].includes(person.memberType)
                                            ? this.childBirthdayLine(person.birthDate)
                                            : this.pretty(person.memberType)
                                    )}</p>
                                </div>

                                <button
                                    class="ob-remove"
                                    type="button"
                                    data-action="remove-person"
                                    data-id="${this.attr(person.id)}"
                                >
                                    Remove
                                </button>
                            </div>
                        </article>
                    `).join("")}

                </div>

                <div class="ob-inline-form ob-person-builder">
                    <input
                        id="newPersonName"
                        type="text"
                        placeholder="Person's name"
                    >

                    <select id="newPersonType">
                        <option value="adult">Adult</option>
                        <option value="child">Child</option>
                        <option value="caregiver">Caregiver / Helper</option>
                        <option value="household_member">Household Member</option>
                    </select>

                    <label class="ob-person-age" id="newPersonAgeWrap" hidden>
                        <span>Birthday</span>
                        <input id="newPersonBirthDate" type="date">
                        <small>HomeOS calculates age automatically and updates the mission pack as the child grows.</small>
                    </label>

                    <button
                        class="ob-small-button"
                        type="button"
                        data-action="add-person"
                    >
                        Add Person
                    </button>
                </div>
            `;
        },
        childBirthdayLine(value) {
            const ageService = window.HomeOS?.services?.kidAge;
            const birthDate = ageService?.normalizeDateKey?.(value) || "";
            const age = birthDate
                ? ageService?.ageFromBirthDate?.(birthDate)
                : null;

            if (!birthDate || age === null || age === undefined) {
                return "Child · birthday needed";
            }

            const band = ageService.bandForAge(age);
            const [year, month, day] = birthDate.split("-").map(Number);
            const date = new Date(year, month - 1, day, 12, 0, 0, 0);
            const label = Number.isNaN(date.getTime())
                ? birthDate
                : date.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                });

            return `Child · ${label} · Age ${age} · ${ageService.bandLabel(band)}`;
        },
        syncPersonAgeField() {
            const wrap = document.getElementById("newPersonAgeWrap");
            const input = document.getElementById("newPersonBirthDate");
            const isChild = this.value("newPersonType") === "child";

            if (wrap) {
                wrap.hidden = !isChild;
            }

            if (input) {
                input.disabled = !isChild;
                input.required = isChild;

                if (!isChild) {
                    input.value = "";
                }
            }
        },
        addPerson() {
            const name = this.value("newPersonName").trim();
            const memberType = this.value("newPersonType") || "household_member";
            const birthDate = memberType === "child"
                ? this.value("newPersonBirthDate").trim()
                : "";

            if (!name) {
                return;
            }

            let age = null;

            if (memberType === "child") {
                const ageService = window.HomeOS?.services?.kidAge;
                const safeBirthDate = ageService?.normalizeDateKey?.(birthDate) || "";
                age = safeBirthDate
                    ? ageService?.ageFromBirthDate?.(safeBirthDate)
                    : null;

                if (
                    !safeBirthDate ||
                    age === null ||
                    age === undefined ||
                    age < 1 ||
                    age > 18
                ) {
                    this.alert(
                        "Enter the child's birthday. Kids Mode currently supports ages 1 through 18."
                    );
                    return;
                }
            }

            this.draft.people.push({
                id: uid("person"),
                name,
                memberType,
                birthDate: birthDate || "",
                age,
                relationship: "",
                assignable: true,
                sortOrder: this.draft.people.length + 1
            });

            this.renderStep();
        },
        // --- Levels + Areas ---
        render_levels() {
            return `
                <div class="ob-section-heading">
                    <h3>Floors, sections and rooms</h3>
                    <p>
                        Add a major level first, then add the rooms and spaces that belong inside it.
                    </p>
                </div>


                <div class="ob-quick-builder">

                    <label>
                        <span class="ob-builder-label">
                            LEVEL
                        </span>

                        <select id="newLevelPreset">
                            <option value="">
                                Choose a level
                            </option>

                            ${LEVEL_PRESETS.map(([value, label]) => `
                                <option value="${this.attr(value)}">
                                    ${this.escape(label)}
                                </option>
                            `).join("")}
                        </select>
                    </label>


                    <label
                        class="ob-conditional-field"
                        id="customLevelField"
                        hidden
                    >
                        <span class="ob-builder-label">
                            CUSTOM LEVEL NAME
                        </span>

                        <input
                            id="newLevelName"
                            type="text"
                            placeholder="Example: Guest Wing"
                        >
                    </label>


                    <button
                        class="ob-small-button ob-builder-button"
                        type="button"
                        data-action="add-level-from-picker"
                    >
                        Add Level
                    </button>

                </div>


                <div
                    class="ob-collection"
                    style="margin-top:16px;"
                >

                    ${this.draft.levels.length
                ? this.draft.levels
                    .map(level => this.levelCard(level))
                    .join("")
                : `
                                <div class="ob-card ob-quick-start-empty">

                                    <strong>
                                        Add your first floor or section.
                                    </strong>

                                    <p>
                                        Examples: Main Floor, Upstairs, Basement, Garage or Exterior.
                                    </p>

                                </div>
                              `}

                </div>
            `;
        },
        levelCard(level) {
            return `
                <article class="ob-collection-card">

                    <div class="ob-collection-card-header">

                        <div>
                            <span class="ob-builder-label">
                                LEVEL
                            </span>

                            <h4>
                                ${this.escape(level.name)}
                            </h4>
                        </div>


                        <button
                            class="ob-remove"
                            type="button"
                            data-action="remove-level"
                            data-id="${this.attr(level.id)}"
                        >
                            Remove Level
                        </button>

                    </div>


                    <div class="ob-room-list">

                        ${level.rooms.length
                ? level.rooms
                    .map(room => `
                                            <span class="ob-room-pill">

                                                <span>
                                                    ${this.escape(room.name)}

                                                    <small>
                                                        ${this.escape(room.areaTypeLabel ||
                    this.pretty(room.roomType))}
                                                    </small>
                                                </span>

                                                <button
                                                    type="button"
                                                    data-action="remove-room"
                                                    data-level-id="${this.attr(level.id)}"
                                                    data-room-id="${this.attr(room.id)}"
                                                    aria-label="Remove ${this.attr(room.name)}"
                                                >
                                                    ×
                                                </button>

                                            </span>
                                        `)
                    .join("")
                : `
                                    <span class="ob-room-empty">
                                        No areas selected for this level yet.
                                    </span>
                                  `}

                    </div>


                    <div
                        class="ob-area-picker"
                        data-area-builder="${this.attr(level.id)}"
                    >

                        <label>

                            <span class="ob-builder-label">
                                1 · AREA CATEGORY
                            </span>

                            <select
                                data-room-category-for="${this.attr(level.id)}"
                            >

                                ${AREA_CATEGORIES.map(([value, label]) => `
                                        <option value="${this.attr(value)}">
                                            ${this.escape(label)}
                                        </option>
                                    `).join("")}

                            </select>

                        </label>


                        <label>

                            <span class="ob-builder-label">
                                2 · AREA TYPE
                            </span>

                            <select
                                data-room-type-choice-for="${this.attr(level.id)}"
                                disabled
                            >
                                <option value="">
                                    Choose a category first
                                </option>
                            </select>

                        </label>


                        <label
                            class="ob-custom-type-field"
                            data-custom-type-field-for="${this.attr(level.id)}"
                            hidden
                        >

                            <span class="ob-builder-label">
                                CUSTOM AREA TYPE
                            </span>

                            <input
                                type="text"
                                data-custom-room-type-for="${this.attr(level.id)}"
                                placeholder="Example: Music Studio"
                            >

                        </label>


                        <label>

                            <span class="ob-builder-label">
                                3 · NAME
                            </span>

                            <input
                                type="text"
                                data-room-name-for="${this.attr(level.id)}"
                                placeholder="Optional — example: Leo's Room"
                            >

                        </label>


                        <button
                            class="ob-small-button ob-builder-button"
                            type="button"
                            data-action="add-room-from-picker"
                            data-level-id="${this.attr(level.id)}"
                        >
                            Add Area
                        </button>

                    </div>


                    <p class="ob-picker-note">
                        Example: Bedroom → Kids Bedroom → “Leo's Room”. Leave the name blank to use the area type.
                    </p>

                </article>
            `;
        },
        syncLevelCustomField() {
            const key = this.value("newLevelPreset");
            const field = document
                .getElementById("customLevelField");
            if (!field) {
                return;
            }
            field.hidden =
                key !==
                    "custom";
            if (key ===
                "custom") {
                document
                    .getElementById("newLevelName")
                    ?.focus();
            }
        },
        areaTypesFor(category) {
            return (AREA_TYPES[category] ||
                []);
        },
        syncAreaBuilder(levelId) {
            const categoryInput = document
                .querySelector(`[data-room-category-for="${CSS.escape(levelId)}"]`);
            const typeInput = document
                .querySelector(`[data-room-type-choice-for="${CSS.escape(levelId)}"]`);
            const customField = document
                .querySelector(`[data-custom-type-field-for="${CSS.escape(levelId)}"]`);
            const customInput = document
                .querySelector(`[data-custom-room-type-for="${CSS.escape(levelId)}"]`);
            if (!categoryInput ||
                !typeInput) {
                return;
            }
            const category = categoryInput.value;
            const isOther = category ===
                "other";
            customField.hidden =
                !isOther;
            if (customInput) {
                customInput.required =
                    isOther;
            }
            if (!category) {
                typeInput.innerHTML = `
                    <option value="">
                        Choose a category first
                    </option>
                `;
                typeInput.disabled =
                    true;
                return;
            }
            if (isOther) {
                typeInput.innerHTML = `
                    <option value="custom">
                        Custom area
                    </option>
                `;
                typeInput.disabled =
                    true;
                customInput
                    ?.focus();
                return;
            }
            const options = this.areaTypesFor(category);
            typeInput.disabled =
                false;
            typeInput.innerHTML = `
                <option value="">
                    Choose an area type
                </option>

                ${options
                .map(([key, label]) => `
                                <option value="${this.attr(key)}">
                                    ${this.escape(label)}
                                </option>
                            `)
                .join("")}
            `;
        },
        addLevelFromPicker() {
            const key = this.value("newLevelPreset");
            if (!key) {
                this.alert("Choose a level first.");
                return;
            }
            const preset = LEVEL_PRESETS
                .find(item => item[0] ===
                key);
            if (!preset) {
                return;
            }
            const customName = this.value("newLevelName")
                .trim();
            const name = key ===
                "custom"
                ? customName
                : preset[1];
            if (!name) {
                this.alert("Type a name for the custom level.");
                return;
            }
            this.addLevel(name, key);
        },
        addLevel(name, levelType = "custom") {
            const clean = String(name ||
                "")
                .trim();
            if (!clean) {
                return;
            }
            if (this.draft
                .levels
                .some(level => level.name
                .toLowerCase() ===
                clean
                    .toLowerCase())) {
                this.alert(`${clean} is already in this home.`);
                return;
            }
            this.draft
                .levels
                .push({
                id: uid("level"),
                name: clean,
                levelType,
                sortOrder: this.draft
                    .levels
                    .length,
                rooms: []
            });
            this.renderStep();
        },
        nextAreaName(level, baseName) {
            const clean = String(baseName ||
                "Area")
                .trim();
            const names = new Set(level.rooms
                .map(room => room.name
                .toLowerCase()));
            if (!names.has(clean
                .toLowerCase())) {
                return clean;
            }
            let index = 2;
            while (names.has(`${clean} ${index}`
                .toLowerCase())) {
                index +=
                    1;
            }
            return `${clean} ${index}`;
        },
        addRoomFromPicker(levelId) {
            const level = this.draft
                .levels
                .find(item => item.id ===
                levelId);
            if (!level) {
                return;
            }
            const category = document
                .querySelector(`[data-room-category-for="${CSS.escape(levelId)}"]`)
                ?.value ||
                "";
            const typeKey = document
                .querySelector(`[data-room-type-choice-for="${CSS.escape(levelId)}"]`)
                ?.value ||
                "";
            const customType = document
                .querySelector(`[data-custom-room-type-for="${CSS.escape(levelId)}"]`)
                ?.value
                ?.trim() ||
                "";
            const typedName = document
                .querySelector(`[data-room-name-for="${CSS.escape(levelId)}"]`)
                ?.value
                ?.trim() ||
                "";
            if (!category) {
                this.alert("Choose an area category first.");
                return;
            }
            let name;
            let roomType;
            let protocolType;
            let areaTypeLabel;
            if (category ===
                "other") {
                if (!customType) {
                    this.alert("Type what kind of custom area this is.");
                    return;
                }
                if (!typedName) {
                    this.alert("Give the custom area a name.");
                    return;
                }
                areaTypeLabel =
                    customType;
                roomType =
                    this.slug(customType) ||
                        "other";
                protocolType =
                    "other";
                name =
                    typedName;
            }
            else {
                const type = this.areaTypesFor(category)
                    .find(item => item[0] ===
                    typeKey);
                if (!type) {
                    this.alert("Choose an area type.");
                    return;
                }
                areaTypeLabel =
                    type[1];
                roomType =
                    type[2] ||
                        "other";
                protocolType =
                    type[2] ||
                        "other";
                name =
                    typedName ||
                        this.nextAreaName(level, type[3] ||
                            type[1]);
            }
            level.rooms
                .push({
                id: uid("room"),
                name,
                roomType,
                protocolType,
                areaCategory: category,
                areaTypeKey: typeKey ||
                    "custom",
                areaTypeLabel,
                sortOrder: level.rooms
                    .length
            });
            this.renderStep();
        },
        // --- Cleaning Zones ---
        ensureZones() {
            const suppressed = new Set(this.draft
                .suppressedLevelZoneIds ||
                []);
            const assignedRoomIds = new Set(this.draft
                .zones
                .flatMap(zone => zone.roomIds ||
                []));
            this.draft
                .levels
                .filter(level => level.rooms
                .length)
                .forEach(level => {
                // Keep older saved setup drafts working.
                let zone = this.draft
                    .zones
                    .find(item => item.sourceLevelId ===
                    level.id);
                if (!zone) {
                    zone =
                        this.draft
                            .zones
                            .find(item => !item.sourceLevelId &&
                            String(item.name ||
                                "")
                                .trim()
                                .toLowerCase() ===
                                String(level.name ||
                                    "")
                                    .trim()
                                    .toLowerCase());
                    if (zone) {
                        zone.sourceLevelId =
                            level.id;
                    }
                }
                if (!zone &&
                    !suppressed.has(level.id)) {
                    zone = {
                        id: uid("zone"),
                        name: level.name,
                        description: "",
                        color: COLORS[this.draft
                            .zones
                            .length %
                            COLORS.length],
                        sortOrder: this.draft
                            .zones
                            .length,
                        roomIds: [],
                        sourceLevelId: level.id,
                        suggested: true
                    };
                    this.draft
                        .zones
                        .push(zone);
                }
                if (!zone) {
                    return;
                }
                // Only add rooms that are currently unassigned. If the user manually moved a room to another zone, HomeOS respects that choice.
                level.rooms
                    .forEach(room => {
                    if (zone.roomIds
                        .includes(room.id)) {
                        return;
                    }
                    if (!assignedRoomIds
                        .has(room.id)) {
                        zone.roomIds
                            .push(room.id);
                        assignedRoomIds
                            .add(room.id);
                    }
                });
            });
        },
        render_zones() {
            this.ensureZones();
            const rooms = this.allRooms();
            return `
                <div class="ob-section-heading">
                    <h3>Cleaning zones</h3>
                    <p>
                        HomeOS suggested groups from your layout. Rename them or click rooms to adjust each zone.
                    </p>
                </div>

                <div class="ob-collection">

                    ${this.draft.zones.map(zone => `
                        <article
                            class="ob-collection-card ob-zone-card"
                            style="--zone-color:${this.attr(zone.color)};"
                        >
                            <div class="ob-collection-card-header">

                                <input
                                    class="ob-zone-name"
                                    type="text"
                                    value="${this.attr(zone.name)}"
                                    data-zone-name="${this.attr(zone.id)}"
                                    aria-label="Zone name"
                                >

                                <button
                                    class="ob-remove"
                                    type="button"
                                    data-action="remove-zone"
                                    data-id="${this.attr(zone.id)}"
                                >
                                    Remove Zone
                                </button>
                            </div>

                            <div class="ob-zone-room-grid">

                                ${rooms.map(room => {
                const selected = zone.roomIds.includes(room.id);
                return `
                                        <button
                                            class="ob-zone-room
                                                ${selected ? "selected" : ""}"
                                            type="button"
                                            data-action="toggle-zone-room"
                                            data-zone-id="${this.attr(zone.id)}"
                                            data-room-id="${this.attr(room.id)}"
                                        >
                                            ${this.escape(room.name)}
                                        </button>
                                    `;
            }).join("")}

                            </div>
                        </article>
                    `).join("")}

                </div>

                <div class="ob-inline-form">
                    <input
                        id="newZoneName"
                        type="text"
                        placeholder="New cleaning zone"
                    >
                    <span></span>
                    <button
                        class="ob-small-button"
                        type="button"
                        data-action="add-zone"
                    >
                        Add Zone
                    </button>
                </div>
            `;
        },
        syncZoneNames() {
            document
                .querySelectorAll("[data-zone-name]")
                .forEach(input => {
                const zone = this.draft.zones.find(item => item.id === input.dataset.zoneName);
                if (zone && input.value.trim()) {
                    zone.name = input.value.trim();
                }
            });
        },
        // --- Inventory ---
        render_inventory() {
            return `
                <div class="ob-section-heading">
                    <h3>Inventory locations</h3>
                    <p>
                        Select only the food and household storage locations you actually use.
                    </p>
                </div>

                <div class="ob-select-grid">

                    ${INVENTORY.map(([key, name]) => {
                const selected = this.draft.inventory.some(item => item.key === key);
                return `
                            <button
                                class="ob-select-card
                                    ${selected ? "selected" : ""}"
                                type="button"
                                data-action="toggle-inventory"
                                data-key="${key}"
                            >
                                <strong>${this.escape(name)}</strong>
                                <span>
                                    ${selected ? "Included ✓" : "Add location"}
                                </span>
                            </button>
                        `;
            }).join("")}

                </div>

                <div class="ob-collection" style="margin-top:16px;">

                    ${this.draft.inventory
                .filter(item => item.custom)
                .map(item => `
                            <article class="ob-collection-card">
                                <div class="ob-collection-card-header">
                                    <h4>${this.escape(item.name)}</h4>
                                    <button
                                        class="ob-remove"
                                        type="button"
                                        data-action="remove-inventory"
                                        data-id="${this.attr(item.id)}"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </article>
                        `)
                .join("")}

                </div>

                <div class="ob-inline-form">

                    <input
                        id="customInventoryName"
                        type="text"
                        placeholder="Custom storage location"
                    >

                    <select id="customInventoryType">
                        <option value="storage">General Storage</option>
                        <option value="pantry">Pantry</option>
                        <option value="refrigerator">Refrigerator</option>
                        <option value="freezer">Freezer</option>
                        <option value="household_supplies">
                            Household Supplies
                        </option>
                    </select>

                    <button
                        class="ob-small-button"
                        type="button"
                        data-action="add-custom-inventory"
                    >
                        Add Location
                    </button>

                </div>
            `;
        },
        // --- Laundry ---
        render_laundry() {
            const profile = this.draft.laundryProfile || {
                mode: "color",
                customCategories: [],
                washMinutes: 45,
                dryMinutes: 60
            };
            const selected = this.laundrySystemDefinition(profile.mode);
            const previewGroups = this.laundryPreviewGroups(profile.mode);
            const editableGroups = ["hybrid", "custom"].includes(profile.mode);
            return `
                <div class="ob-laundry-console">

                    <section class="ob-laundry-module">
                        <div class="ob-module-heading">
                            <span class="ob-module-index">01 / LOCATION</span>
                            <div>
                                <h3>Where does laundry happen?</h3>
                                <p>Add every washer/dryer area HomeOS should know about.</p>
                            </div>
                            <span class="ob-module-status ${this.draft.laundry.length ? "is-ready" : ""}">
                                ${this.draft.laundry.length ? `${this.draft.laundry.length} ACTIVE` : "NOT SET"}
                            </span>
                        </div>

                        <div class="ob-laundry-area-grid">
                            ${this.draft.laundry.length
                ? this.draft.laundry.map(area => `
                                        <article class="ob-laundry-area-card">
                                            <div class="ob-laundry-area-icon" aria-hidden="true">◎</div>
                                            <div class="ob-laundry-area-copy">
                                                <span>LAUNDRY NODE</span>
                                                <h4>${this.escape(area.name)}</h4>
                                                <p>
                                                    ${area.hasWasher ? "Washer" : "No washer"}
                                                    ·
                                                    ${area.hasDryer ? "Dryer" : "No dryer"}
                                                </p>
                                            </div>
                                            <div class="ob-laundry-area-meta">
                                                <span>${this.escape(this.laundrySystemLabel(area.systemMode || profile.mode))}</span>
                                                <button
                                                    class="ob-remove"
                                                    type="button"
                                                    data-action="remove-laundry"
                                                    data-id="${this.attr(area.id)}"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </article>
                                    `).join("")
                : `
                                        <div class="ob-laundry-empty">
                                            <div class="ob-laundry-empty-mark" aria-hidden="true">＋</div>
                                            <div>
                                                <strong>No laundry area connected yet.</strong>
                                                <p>Add the room, closet, basement or shared area where laundry runs.</p>
                                            </div>
                                        </div>
                                      `}
                        </div>

                        <div class="ob-laundry-location-builder">
                            <label>
                                <span class="ob-builder-label">AREA TYPE</span>
                                <select id="laundryPreset">
                                    <option value="">Choose laundry area</option>
                                    ${LAUNDRY_PRESETS.map(([value, label]) => `
                                        <option value="${this.attr(value)}">${this.escape(label)}</option>
                                    `).join("")}
                                </select>
                            </label>

                            <label>
                                <span class="ob-builder-label">OPTIONAL NAME</span>
                                <input
                                    id="laundryAreaName"
                                    type="text"
                                    placeholder="Example: Upstairs Laundry"
                                >
                            </label>

                            <button
                                class="ob-small-button ob-builder-button"
                                type="button"
                                data-action="add-laundry-from-picker"
                            >
                                Add Area
                                <span aria-hidden="true">＋</span>
                            </button>
                        </div>
                    </section>

                    <section class="ob-laundry-module ob-laundry-system-module">
                        <div class="ob-module-heading">
                            <span class="ob-module-index">02 / LOAD LOGIC</span>
                            <div>
                                <h3>How does your household run loads?</h3>
                                <p>Choose the closest system. HomeOS will use it to organize the Laundry page.</p>
                            </div>
                            <span class="ob-module-status is-ready">SYSTEM READY</span>
                        </div>

                        <div class="ob-laundry-system-grid">
                            ${LAUNDRY_SYSTEMS.map(system => `
                                <button
                                    class="ob-laundry-system-card ${profile.mode === system.key ? "selected" : ""}"
                                    type="button"
                                    data-action="select-laundry-system"
                                    data-key="${this.attr(system.key)}"
                                    aria-pressed="${profile.mode === system.key ? "true" : "false"}"
                                >
                                    <span class="ob-system-code">${this.escape(system.code)}</span>
                                    <strong>${this.escape(system.title)}</strong>
                                    <span class="ob-system-copy">${this.escape(system.description)}</span>
                                    <span class="ob-system-select">
                                        ${profile.mode === system.key ? "✓ SELECTED" : "SELECT"}
                                    </span>
                                </button>
                            `).join("")}
                        </div>

                        <div class="ob-laundry-system-output">
                            <div class="ob-system-output-heading">
                                <div>
                                    <span class="ob-builder-label">CURRENT LOAD MAP</span>
                                    <strong>${this.escape(selected.title)}</strong>
                                </div>
                                <span>${previewGroups.length} ${previewGroups.length === 1 ? "GROUP" : "GROUPS"}</span>
                            </div>

                            <div class="ob-load-group-grid">
                                ${previewGroups.length
                ? previewGroups.map((group, index) => `
                                            <span class="ob-load-group-chip">
                                                <span class="ob-load-node" aria-hidden="true"></span>
                                                ${this.escape(group)}
                                                ${editableGroups ? `
                                                    <button
                                                        type="button"
                                                        data-action="remove-laundry-group"
                                                        data-index="${index}"
                                                        aria-label="Remove ${this.attr(group)}"
                                                    >×</button>
                                                ` : ""}
                                            </span>
                                        `).join("")
                : `<span class="ob-load-group-empty">Add the first load group below.</span>`}
                            </div>

                            ${editableGroups ? `
                                <div class="ob-load-group-builder">
                                    <label>
                                        <span class="ob-builder-label">ADD A LOAD GROUP</span>
                                        <input
                                            id="customLaundryGroup"
                                            type="text"
                                            maxlength="60"
                                            placeholder="Example: Sports uniforms"
                                        >
                                    </label>
                                    <button
                                        class="ob-small-button"
                                        type="button"
                                        data-action="add-laundry-group"
                                    >
                                        Add Group
                                    </button>
                                </div>
                                <p class="ob-picker-note">
                                    ${profile.mode === "hybrid"
                ? "Hybrid starts with suggested groups. Keep, remove or add anything so it matches your real household."
                : "Create only the groups you actually use. These become the load choices on the Laundry page."}
                                </p>
                            ` : `
                                <p class="ob-picker-note">
                                    This is only a starting structure. You can adjust the Laundry system later from Home Setup.
                                </p>
                            `}
                        </div>
                    </section>

                </div>
            `;
        },
        laundrySystemDefinition(key) {
            return LAUNDRY_SYSTEMS.find(item => item.key === key) || LAUNDRY_SYSTEMS[0];
        },
        laundrySystemLabel(key) {
            return this.laundrySystemDefinition(key).title;
        },
        householdLaundryPeople() {
            const owner = this.session?.user?.displayName || "Owner";
            const names = [owner, ...this.draft.people.map(person => person.name)]
                .map(name => String(name || "").trim())
                .filter(Boolean);
            return [...new Set(names)];
        },
        hybridLaundryGroups() {
            const kidNames = this.draft.people
                .filter(person => ["child", "teen", "dependent"].includes(person.memberType))
                .map(person => `${person.name}'s Clothes`)
                .filter(Boolean);
            return [
                "Adult Darks",
                "Adult Lights + Whites",
                ...(kidNames.length ? kidNames : ["Kids Clothes"]),
                "Towels",
                "Bedding + Linens",
                "Special Care"
            ];
        },
        laundryPreviewGroups(mode) {
            const system = this.laundrySystemDefinition(mode);
            if (mode === "by_person") {
                return [
                    ...this.householdLaundryPeople().map(name => `${name}'s Clothes`),
                    "Towels",
                    "Bedding + Linens",
                    "Mats + Rugs",
                    "Special Care"
                ];
            }
            if (["hybrid", "custom"].includes(mode)) {
                return Array.isArray(this.draft.laundryProfile?.customCategories)
                    ? this.draft.laundryProfile.customCategories
                    : [];
            }
            return [...(system.groups || [])];
        },
        syncLaundryAreasToProfile() {
            const profile = this.draft.laundryProfile;
            if (!profile)
                return;
            const system = this.laundrySystemDefinition(profile.mode);
            const customCategories = ["hybrid", "custom"].includes(profile.mode)
                ? [...(profile.customCategories || [])]
                : [];
            this.draft.laundry = this.draft.laundry.map(area => ({
                ...area,
                laundrySystem: system.dbKey,
                laundry_system: system.dbKey,
                systemMode: profile.mode,
                customCategories,
                custom_categories: [...customCategories],
                washMinutes: Math.max(1, Number(profile.washMinutes) || 45),
                wash_minutes: Math.max(1, Number(profile.washMinutes) || 45),
                dryMinutes: Math.max(1, Number(profile.dryMinutes) || 60),
                dry_minutes: Math.max(1, Number(profile.dryMinutes) || 60)
            }));
        },
        setLaundrySystem(key) {
            const system = this.laundrySystemDefinition(key);
            if (!system)
                return;
            const previousMode = this.draft.laundryProfile?.mode;
            let customCategories = [];
            if (key === "hybrid") {
                customCategories =
                    previousMode === "hybrid" && this.draft.laundryProfile?.customCategories?.length
                        ? [...this.draft.laundryProfile.customCategories]
                        : this.hybridLaundryGroups();
            }
            else if (key === "custom") {
                customCategories =
                    previousMode === "custom"
                        ? [...(this.draft.laundryProfile?.customCategories || [])]
                        : [];
            }
            this.draft.laundryProfile = {
                ...(this.draft.laundryProfile || {}),
                mode: key,
                customCategories,
                washMinutes: Math.max(1, Number(this.draft.laundryProfile?.washMinutes) || 45),
                dryMinutes: Math.max(1, Number(this.draft.laundryProfile?.dryMinutes) || 60)
            };
            this.syncLaundryAreasToProfile();
            this.renderStep();
        },
        addLaundryGroup() {
            const name = this.value("customLaundryGroup").trim();
            if (!name)
                return;
            const current = Array.isArray(this.draft.laundryProfile?.customCategories)
                ? this.draft.laundryProfile.customCategories
                : [];
            const exists = current.some(item => item.toLowerCase() === name.toLowerCase());
            if (exists) {
                this.alert("That load group is already in your laundry system.");
                return;
            }
            this.draft.laundryProfile.customCategories = [...current, name];
            this.syncLaundryAreasToProfile();
            this.renderStep();
        },
        removeLaundryGroup(index) {
            const current = Array.isArray(this.draft.laundryProfile?.customCategories)
                ? this.draft.laundryProfile.customCategories
                : [];
            this.draft.laundryProfile.customCategories = current.filter((_, i) => i !== index);
            this.syncLaundryAreasToProfile();
            this.renderStep();
        },
        addLaundryFromPicker() {
            const key = this.value("laundryPreset");
            const preset = LAUNDRY_PRESETS.find(item => item[0] === key);
            if (!preset) {
                this.alert("Choose a laundry area first.");
                return;
            }
            const override = this.value("laundryAreaName").trim();
            const name = preset[0] === "custom"
                ? override
                : override || preset[3];
            if (!name) {
                this.alert("Type a name for the custom laundry area.");
                return;
            }
            const duplicate = this.draft.laundry.some(area => String(area.name || "").trim().toLowerCase() === name.toLowerCase());
            if (duplicate) {
                this.alert(`${name} is already in your laundry setup.`);
                return;
            }
            const type = preset[2] || "washer_dryer";
            const profile = this.draft.laundryProfile || {
                mode: "color",
                customCategories: [],
                washMinutes: 45,
                dryMinutes: 60
            };
            const system = this.laundrySystemDefinition(profile.mode);
            this.draft.laundry.push({
                id: uid("laundry"),
                name,
                areaType: type,
                hasWasher: type !== "dryer_only",
                hasDryer: type !== "washer_only",
                laundrySystem: system.dbKey,
                laundry_system: system.dbKey,
                systemMode: profile.mode,
                customCategories: ["hybrid", "custom"].includes(profile.mode)
                    ? [...(profile.customCategories || [])]
                    : [],
                custom_categories: ["hybrid", "custom"].includes(profile.mode)
                    ? [...(profile.customCategories || [])]
                    : [],
                washMinutes: Math.max(1, Number(profile.washMinutes) || 45),
                wash_minutes: Math.max(1, Number(profile.washMinutes) || 45),
                dryMinutes: Math.max(1, Number(profile.dryMinutes) || 60),
                dry_minutes: Math.max(1, Number(profile.dryMinutes) || 60),
                sortOrder: this.draft.laundry.length
            });
            this.renderStep();
        },
        // --- Home Care ---
        render_features() {
            return `
                <div class="ob-section-heading">
                    <h3>Recurring home care</h3>
                    <p>
                        Select appliances and home features you want HomeOS to remember and maintain.
                    </p>
                </div>

                <div class="ob-select-grid">

                    ${FEATURES.map(([key, name, type]) => {
                const selected = this.draft.features.some(item => item.key === key);
                return `
                            <button
                                class="ob-select-card
                                    ${selected ? "selected" : ""}"
                                type="button"
                                data-action="toggle-feature"
                                data-key="${key}"
                                data-name="${this.attr(name)}"
                                data-type="${type}"
                            >
                                <strong>${this.escape(name)}</strong>
                                <span>
                                    ${selected
                    ? "Home Care enabled ✓"
                    : "Add to Home Care"}
                                </span>
                            </button>
                        `;
            }).join("")}

                </div>

                <div class="ob-inline-form">

                    <input
                        id="customFeatureName"
                        type="text"
                        placeholder="Custom appliance or home feature"
                    >

                    <select id="customFeatureType">
                        <option value="home_feature">Home Feature</option>
                        <option value="appliance">Appliance</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="exterior">Exterior</option>
                    </select>

                    <button
                        class="ob-small-button"
                        type="button"
                        data-action="add-custom-feature"
                    >
                        Add Feature
                    </button>

                </div>
            `;
        },
        // --- Review ---
        render_ready() {
            const rebuildNotice = this.draft.rebuildExistingHome
                ? `
                        <div class="ob-rebuild-review">
                            <span class="onboarding-kicker">
                                REBUILD REVIEW
                            </span>
                            <strong>
                                Your current home is still unchanged.
                            </strong>
                            <p>
                                Choosing <b>Build My HomeOS</b> is the point when this
                                reviewed setup replaces the current home layout.
                            </p>
                        </div>
                      `
                : "";
            return `
                ${rebuildNotice}

                <div class="ob-section-heading">
                    <h3>Check everything once</h3>
                    <p>
                        These selections become the shared structure used by Dashboard, Cleaning, Laundry, Inventory, Rhythm and Seasons.
                    </p>
                </div>

                <div class="ob-review-grid">
                    ${[
                ["PEOPLE", this.draft.people.length + 1],
                ["LEVELS", this.draft.levels.length],
                ["AREAS", this.allRooms().length],
                ["CLEANING ZONES", this.draft.zones.length],
                ["INVENTORY LOCATIONS", this.draft.inventory.length],
                ["LAUNDRY AREAS", this.draft.laundry.length],
                ["HOME CARE ITEMS", this.draft.features.length]
            ].map(([label, value]) => `
                        <article class="ob-review-stat">
                            <span>${label}</span>
                            <strong>${value}</strong>
                        </article>
                    `).join("")}
                </div>

                <article class="ob-ready-card">

                    <span class="onboarding-kicker">
                        ${this.escape(this.draft.household.name ||
                "YOUR HOUSEHOLD")}
                    </span>

                    <h3>Ready to build your HomeOS.</h3>

                    <p>
                        Build My HomeOS creates the live home from this setup.
                        You can make changes later from Account → Home Setup.
                    </p>

                </article>
            `;
        },
        // --- Validation + Persistence + Navigation ---
        validate() {
            if (this.step().key === "household") {
                this.captureHousehold();
            }
            if (this.step().key === "levels" &&
                (!this.draft.levels.length ||
                    !this.allRooms().length)) {
                throw new Error("Add at least one level and one area before continuing.");
            }
            if (this.step().key === "zones") {
                this.syncZoneNames();
                if (!this.draft.zones.length) {
                    throw new Error("Create at least one Cleaning zone.");
                }
            }
            if (this.step().key === "laundry") {
                const mode = this.draft.laundryProfile?.mode || "color";
                if (this.draft.laundry.length &&
                    ["hybrid", "custom"].includes(mode) &&
                    !this.draft.laundryProfile?.customCategories?.length) {
                    throw new Error("Add at least one load group for this laundry system.");
                }
                this.syncLaundryAreasToProfile();
            }
        },
        async next() {
            let saved = false;

            try {
                this.validate();
                this.clearAlert();

                const key = this.step().key;

                if (key === "ready") {
                    await this.finish();
                    saved = true;
                    return;
                }

                this.busy(true, "SAVING");

                if (key === "household" && !this.session.household?.id) {
                    const { error } = await service.createHousehold({
                        name: this.draft.household.name,
                        homeType: this.draft.household.homeType,
                        tagline: this.draft.household.tagline
                    });

                    if (error) {
                        throw error;
                    }

                    this.session = await window.HomeOS.session.refresh();
                }

                const nextStep = STEPS[this.stepIndex + 1];
                const completedSteps = this.completedSteps.includes(key)
                    ? [...this.completedSteps]
                    : [...this.completedSteps, key];

                const { error } = await service.saveDraft({
                    currentStep: nextStep.key,
                    completedSteps,
                    draft: this.draft
                });

                if (error) {
                    throw error;
                }

                this.completedSteps = completedSteps;
                this.stepIndex += 1;
                this.render();
                saved = true;
            } catch (error) {
                console.error(error);
                this.alert(
                    error.message || "HomeOS could not save this step."
                );
            } finally {
                this.busy(false, saved ? "Saved" : "Ready");
            }
        },
        async back() {
            if (this.stepIndex <= 0) {
                return;
            }

            if (this.step().key === "zones") {
                this.syncZoneNames();
            }

            const targetIndex = this.stepIndex - 1;
            const targetStep = STEPS[targetIndex];

            if (this.session.household?.id) {
                this.busy(true, "SAVING");

                const { error } = await service.saveDraft({
                    currentStep: targetStep.key,
                    completedSteps: this.completedSteps,
                    draft: this.draft
                });

                if (error) {
                    this.busy(false, "Ready");
                    this.alert(
                        error.message || "HomeOS could not save this step."
                    );
                    return;
                }
            }

            this.stepIndex = targetIndex;
            this.render();
            this.busy(false, "Saved");
        },
        async jump(index) {
            if (index < 0 || index >= STEPS.length) {
                return;
            }

            const allowed =
                index <= this.stepIndex ||
                this.completedSteps.includes(STEPS[index].key);

            if (!allowed || index === this.stepIndex) {
                return;
            }

            if (this.step().key === "zones") {
                this.syncZoneNames();
            }

            if (this.session.household?.id) {
                this.busy(true, "SAVING");

                const { error } = await service.saveDraft({
                    currentStep: STEPS[index].key,
                    completedSteps: this.completedSteps,
                    draft: this.draft
                });

                if (error) {
                    this.busy(false, "Ready");
                    this.alert(
                        error.message || "HomeOS could not save setup progress."
                    );
                    return;
                }
            }

            this.stepIndex = index;
            this.render();
            this.busy(false, "Saved");
        },
        markComplete(key) {
            if (!this.completedSteps.includes(key)) {
                this.completedSteps.push(key);
            }
        },
        async persistKidAgeSetup(householdId) {
            const ageService = window.HomeOS?.services?.kidAge;
            const supabase = window.HomeOS?.supabase;
            const draftKids = (this.draft.people || []).filter(person =>
                ["child", "teen", "dependent"].includes(person.memberType) &&
                Boolean(
                    window.HomeOS?.services?.kidAge?.normalizeDateKey?.(
                        person.birthDate || person.birth_date
                    )
                )
            );
            if (!ageService?.configureChild || !supabase || !householdId || !draftKids.length)
                return;
            const { data, error } = await supabase
                .from("family_members")
                .select("id,display_name,member_type,sort_order,active")
                .eq("household_id", householdId)
                .eq("active", true)
                .order("sort_order", { ascending: true });
            if (error)
                throw error;
            const used = new Set();
            for (const draftKid of draftKids) {
                const candidates = (data || []).filter(person => !used.has(person.id) &&
                    ["child", "teen", "dependent"].includes(String(person.member_type || "").toLowerCase()) &&
                    String(person.display_name || "").trim().toLowerCase() === String(draftKid.name || "").trim().toLowerCase());
                const liveKid = candidates.find(person => Number(person.sort_order) === Number(draftKid.sortOrder)) || candidates[0];
                if (!liveKid) {
                    throw new Error(
                        `HomeOS could not finish Kids Mode setup for ${draftKid.name}.`
                    );
                }
                used.add(liveKid.id);
                const result = await ageService.configureChild({
                    personId: liveKid.id,
                    birthDate:
                        ageService.normalizeDateKey(
                            draftKid.birthDate || draftKid.birth_date
                        ),
                    seedIfNeeded: true
                });
                if (result.error)
                    throw result.error;
            }
        },
        async finish() {
            if (
                !this.draft.household.name ||
                !this.draft.levels.length ||
                !this.allRooms().length
            ) {
                throw new Error(
                    "Household identity, one level, and one area are required."
                );
            }

            this.busy(true, "BUILDING HOMEOS");
            this.syncLaundryAreasToProfile();

            if (!this.committedHouseholdId) {
                const draftToCommit = {
                    ...this.draft,
                    rebuildExistingHome: false
                };

                const { householdId, error } = await service.complete(draftToCommit);

                if (error) {
                    throw error;
                }

                this.committedHouseholdId =
                    householdId ||
                    this.session.household?.id ||
                    null;
            }

            if (!this.committedHouseholdId) {
                throw new Error(
                    "HomeOS built the setup but could not identify the saved household."
                );
            }

            await this.persistLaundrySetup(this.committedHouseholdId);
            await this.persistKidAgeSetup(this.committedHouseholdId);

            await window.HomeOS.session.refresh();
            this.redirect(window.HomeOS.config.routes.home);
        },
        async persistLaundrySetup(householdId) {
            const homeSetup = window.HomeOS?.services?.homeSetup;
            if (!homeSetup || !householdId || !this.draft.laundry.length) {
                return;
            }
            const { data, error } = await homeSetup.getSetup(householdId);
            if (error)
                throw error;
            const liveAreas = Array.isArray(data?.laundry) ? data.laundry : [];
            const profile = this.draft.laundryProfile || {
                mode: "color",
                customCategories: [],
                washMinutes: 45,
                dryMinutes: 60
            };
            const system = this.laundrySystemDefinition(profile.mode);
            for (const area of this.draft.laundry) {
                const live = liveAreas.find(item => String(item.name || "").trim().toLowerCase() ===
                    String(area.name || "").trim().toLowerCase()) || liveAreas.find(item => Number(item.sort_order) === Number(area.sortOrder));
                if (!live) {
                    throw new Error(
                        `HomeOS could not finish Laundry setup for ${area.name || "this laundry area"}.`
                    );
                }
                const result = await homeSetup.upsertLaundryArea({
                    householdId,
                    id: live.id,
                    roomId: live.room_id || null,
                    name: live.name || area.name,
                    areaType: area.areaType || live.area_type || "washer_dryer",
                    hasWasher: area.hasWasher !== false,
                    hasDryer: area.hasDryer !== false,
                    laundrySystem: system.dbKey,
                    washMinutes: Math.max(1, Number(profile.washMinutes) || 45),
                    dryMinutes: Math.max(1, Number(profile.dryMinutes) || 60),
                    customCategories: ["hybrid", "custom"].includes(profile.mode)
                        ? [...(profile.customCategories || [])]
                        : [],
                    sortOrder: Number(live.sort_order ?? area.sortOrder ?? 0),
                    active: live.active !== false
                });
                if (result?.error)
                    throw result.error;
            }
        },
        // --- Action Router ---
        async handleAction(button) {
            const action = button.dataset.action;
            const id = button.dataset.id;
            if (action === "add-person") {
                this.addPerson();
            }
            if (action === "remove-person") {
                this.draft.people = this.draft.people.filter(person => person.id !== id);
                this.renderStep();
            }
            if (action === "add-level-from-picker") {
                this.addLevelFromPicker();
            }
            if (action === "add-room-from-picker") {
                this.addRoomFromPicker(button.dataset.levelId);
            }
            if (action === "remove-level") {
                const level = this.draft.levels.find(item => item.id === id);
                const roomIds = level?.rooms?.map(room => room.id) || [];
                this.draft.levels = this.draft.levels.filter(item => item.id !== id);
                this.draft.zones =
                    this.draft.zones
                        .filter(zone => zone.sourceLevelId !==
                        id)
                        .map(zone => ({
                        ...zone,
                        roomIds: zone.roomIds.filter(roomId => !roomIds.includes(roomId))
                    }));
                this.draft.suppressedLevelZoneIds =
                    (this.draft
                        .suppressedLevelZoneIds ||
                        [])
                        .filter(levelId => levelId !==
                        id);
                this.renderStep();
            }
            if (action === "remove-room") {
                const level = this.draft.levels.find(item => item.id === button.dataset.levelId);
                if (level) {
                    level.rooms = level.rooms.filter(room => room.id !== button.dataset.roomId);
                }
                this.draft.zones = this.draft.zones.map(zone => ({
                    ...zone,
                    roomIds: zone.roomIds.filter(roomId => roomId !== button.dataset.roomId)
                }));
                this.renderStep();
            }
            if (action === "add-zone") {
                const name = this.value("newZoneName").trim();
                if (name) {
                    this.draft.zones.push({
                        id: uid("zone"),
                        name,
                        description: "",
                        color: COLORS[this.draft.zones.length %
                            COLORS.length],
                        sortOrder: this.draft.zones.length,
                        roomIds: []
                    });
                    this.renderStep();
                }
            }
            if (action === "remove-zone") {
                const removed = this.draft
                    .zones
                    .find(zone => zone.id ===
                    id);
                if (removed
                    ?.sourceLevelId) {
                    this.draft
                        .suppressedLevelZoneIds =
                        [
                            ...new Set([
                                ...(this.draft
                                    .suppressedLevelZoneIds ||
                                    []),
                                removed
                                    .sourceLevelId
                            ])
                        ];
                }
                this.draft.zones =
                    this.draft.zones
                        .filter(zone => zone.id !==
                        id);
                this.renderStep();
            }
            if (action === "toggle-zone-room") {
                this.toggleZoneRoom(button.dataset.zoneId, button.dataset.roomId);
            }
            if (action === "toggle-inventory") {
                this.toggleInventory(button.dataset.key);
            }
            if (action === "add-custom-inventory") {
                const name = this.value("customInventoryName").trim();
                if (name) {
                    this.draft.inventory.push({
                        id: uid("inventory"),
                        key: uid("custom"),
                        name,
                        locationType: this.value("customInventoryType") ||
                            "storage",
                        custom: true,
                        sortOrder: this.draft.inventory.length
                    });
                    this.renderStep();
                }
            }
            if (action === "remove-inventory") {
                this.draft.inventory =
                    this.draft.inventory.filter(item => item.id !== id);
                this.renderStep();
            }
            if (action === "add-laundry-from-picker") {
                this.addLaundryFromPicker();
            }
            if (action === "select-laundry-system") {
                this.setLaundrySystem(button.dataset.key);
            }
            if (action === "add-laundry-group") {
                this.addLaundryGroup();
            }
            if (action === "remove-laundry-group") {
                this.removeLaundryGroup(Number(button.dataset.index));
            }
            if (action === "remove-laundry") {
                this.draft.laundry =
                    this.draft.laundry.filter(item => item.id !== id);
                this.renderStep();
            }
            if (action === "toggle-feature") {
                this.toggleFeature(button);
            }
            if (action === "add-custom-feature") {
                const name = this.value("customFeatureName").trim();
                if (name) {
                    this.draft.features.push({
                        id: uid("feature"),
                        key: this.slug(name),
                        name,
                        featureType: this.value("customFeatureType") ||
                            "home_feature",
                        custom: true
                    });
                    this.renderStep();
                }
            }
            if (action === "cancel-home-rebuild") {
                await this.cancelHomeRebuild();
            }
        },
        async cancelHomeRebuild() {
            if (!this.draft.rebuildExistingHome)
                return;
            const keep = window.confirm("Keep the current HomeOS home and cancel this rebuild?\n\nThe live home was never deleted, so it will become active again immediately.");
            if (!keep)
                return;
            this.busy(true, "KEEPING CURRENT HOME");
            const { error } = await service.cancelHomeRebuild();
            if (error) {
                this.busy(false);
                this.alert(error.message ||
                    "HomeOS could not cancel the rebuild.");
                return;
            }
            await window.HomeOS.session.refresh();
            this.redirect(window.HomeOS.config.routes.home);
        },
        toggleZoneRoom(zoneId, roomId) {
            const zone = this.draft.zones.find(item => item.id === zoneId);
            if (!zone)
                return;
            if (zone.roomIds.includes(roomId)) {
                zone.roomIds = zone.roomIds.filter(id => id !== roomId);
            }
            else {
                this.draft.zones = this.draft.zones.map(item => ({
                    ...item,
                    roomIds: item.roomIds.filter(id => id !== roomId)
                }));
                const refreshedZone = this.draft.zones.find(item => item.id === zoneId);
                refreshedZone.roomIds.push(roomId);
            }
            this.renderStep();
        },
        toggleInventory(key) {
            const preset = INVENTORY.find(item => item[0] === key);
            if (!preset)
                return;
            const exists = this.draft.inventory.some(item => item.key === key);
            if (exists) {
                this.draft.inventory =
                    this.draft.inventory.filter(item => item.key !== key);
            }
            else {
                this.draft.inventory.push({
                    id: uid("inventory"),
                    key: preset[0],
                    name: preset[1],
                    locationType: preset[2],
                    custom: false,
                    sortOrder: this.draft.inventory.length
                });
            }
            this.renderStep();
        },
        toggleFeature(button) {
            const key = button.dataset.key;
            const exists = this.draft.features.some(item => item.key === key);
            if (exists) {
                this.draft.features =
                    this.draft.features.filter(item => item.key !== key);
            }
            else {
                this.draft.features.push({
                    id: uid("feature"),
                    key,
                    name: button.dataset.name,
                    featureType: button.dataset.type ||
                        "home_feature",
                    custom: false
                });
            }
            this.renderStep();
        },
        // --- Shared Helpers ---
        allRooms() {
            return this.draft.levels.flatMap(level => level.rooms.map(room => ({
                ...room,
                levelId: level.id,
                levelName: level.name
            })));
        },
        pretty(value) {
            return String(value || "")
                .replace(/_/g, " ")
                .replace(/\b\w/g, char => char.toUpperCase());
        },
        slug(value) {
            return String(value || "")
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_+|_+$/g, "");
        },
        value(id) {
            return document.getElementById(id)?.value || "";
        },
        text(id, value) {
            const el = document.getElementById(id);
            if (el)
                el.textContent = String(value);
        },
        alert(message) {
            const el = document.getElementById("onboardingAlert");
            if (!el)
                return;
            el.textContent = message;
            el.hidden = false;
        },
        clearAlert() {
            const el = document.getElementById("onboardingAlert");
            if (el) {
                el.textContent = "";
                el.hidden = true;
            }
        },
        busy(isBusy, label) {
            const next = document.getElementById("onboardingNext");
            const back = document.getElementById("onboardingBack");
            if (next)
                next.disabled = isBusy;
            if (back)
                back.disabled = isBusy;

            document
                .querySelectorAll(
                    '[data-step-index], [data-action="cancel-home-rebuild"]'
                )
                .forEach(control => {
                    control.disabled = isBusy;
                });

            this.text("onboardingSaveState", label);
        },
        redirect(file) {
            window.location.replace(window.HomeOS.auth.pageUrl(file));
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
        // --- Event Binding ---
        bindEvents() {
            document
                .getElementById("onboardingNext")
                ?.addEventListener("click", async () => {
                    await this.next();
                });

            document
                .getElementById("onboardingBack")
                ?.addEventListener("click", async () => {
                    await this.back();
                });

            document
                .getElementById("onboardingProgress")
                ?.addEventListener("click", async event => {
                    const button = event.target.closest("[data-step-index]");

                    if (button && !button.disabled) {
                        await this.jump(Number(button.dataset.stepIndex));
                    }
                });

            document
                .querySelector(".onboarding-workspace")
                ?.addEventListener("click", async event => {
                    const button = event.target.closest(
                        '[data-action="cancel-home-rebuild"]'
                    );

                    if (button) {
                        await this.handleAction(button);
                    }
                });

            const stepRoot = document
                .getElementById("onboardingStep");

            stepRoot
                ?.addEventListener("click", async event => {
                    const button = event.target.closest("[data-action]");

                    if (button) {
                        await this.handleAction(button);
                    }
                });
            stepRoot
                ?.addEventListener("change", event => {
                if (event.target.matches("#newPersonType")) {
                    this.syncPersonAgeField();
                    return;
                }
                if (event.target
                    .matches("#newLevelPreset")) {
                    this.syncLevelCustomField();
                    return;
                }
                const category = event.target
                    .closest("[data-room-category-for]");
                if (category) {
                    this.syncAreaBuilder(category.dataset
                        .roomCategoryFor);
                }
            });
        }
    };
    // --- Bootstrap ---
    await App.init();
});
