/* ============================================================
   HOMEOS // ACCOUNT PEOPLE

   People, access, invites and Kids Mode settings inside Account.
============================================================ */

(function registerAccountPeopleModule() {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    window.HomeOS.accountPageModules =
        window.HomeOS.accountPageModules || {};
    window.HomeOS.accountPageModules.people = {
        // --- People + Access ---
        async loadPeople() {
            try {
                const { data, error } = await this.supabase
                    .rpc("homeos_get_people_workspace");
                if (error) {
                    throw error;
                }
                this.people =
                    Array.isArray(data?.people)
                        ? data.people
                        : [];
                this.memberships =
                    Array.isArray(data?.memberships)
                        ? data.memberships
                        : [];
                this.invites =
                    Array.isArray(data?.invites)
                        ? data.invites
                        : [];
            }
            catch (rpcError) {
                console.warn("[HOME OS] People workspace RPC unavailable; using table fallback.", rpcError);
                const householdId = this.householdId();
                const [peopleResult, membershipsResult, invitesResult] = await Promise.all([
                    this.supabase
                        .from("family_members")
                        .select("*")
                        .eq("household_id", householdId)
                        .eq("active", true)
                        .order("sort_order"),
                    this.supabase
                        .from("household_members")
                        .select("*")
                        .eq("household_id", householdId)
                        .eq("status", "active"),
                    this.isAdmin()
                        ? this.supabase
                            .from("household_invites")
                            .select("*")
                            .eq("household_id", householdId)
                            .eq("status", "pending")
                            .order("created_at", { ascending: false })
                        : Promise.resolve({
                            data: [],
                            error: null
                        })
                ]);
                const fallbackError = [
                    peopleResult,
                    membershipsResult,
                    invitesResult
                ].find(result => result.error)?.error || null;

                if (fallbackError) {
                    throw fallbackError;
                }

                this.people =
                    peopleResult.data || [];
                this.memberships =
                    membershipsResult.data || [];
                this.invites =
                    invitesResult.data || [];
            }
            this.people =
                this.people.filter(person => person.active !== false);
            if (this.isAdmin()) {
                let kidsResult;
                if (this.peopleService?.getKidsAdminState) {
                    kidsResult =
                        await this.peopleService.getKidsAdminState();
                }
                else {
                    const { data, error } = await this.supabase.rpc("homeos_get_kid_admin_state");
                    kidsResult = {
                        data: data || null,
                        error
                    };
                }
                if (kidsResult.error) {
                    console.error("[HOME OS] Kids Mode admin state could not load.", kidsResult.error);
                    this.kidsAdmin = null;
                }
                else {
                    this.kidsAdmin =
                        kidsResult.data || null;
                }
            }
            else {
                this.kidsAdmin = null;
            }
        },
        membershipForPerson(person) {
            return this.memberships.find(row => row.family_member_id ===
                person.id) ||
                this.memberships.find(row => person.auth_user_id &&
                    row.user_id ===
                        person.auth_user_id) ||
                null;
        },
        personName(person) {
            return (person?.display_name?.trim() ||
                "Household Person");
        },
        isChildPerson(person) {
            return [
                "child",
                "teen"
            ].includes(String(person?.member_type ||
                "").toLowerCase());
        },
        adultPeople() {
            return this.people.filter(person => !this.isChildPerson(person));
        },
        childPeople() {
            return this.people.filter(person => this.isChildPerson(person));
        },
        pendingInviteForPerson(personId) {
            return this.invites.find(invite => invite.family_member_id ===
                personId &&
                (!invite.status ||
                    invite.status ===
                        "pending")) || null;
        },
        kidsSettingsRoot() {
            return (this.home.settings?.kidsProfiles &&
                typeof this.home.settings.kidsProfiles ===
                    "object")
                ? this.home.settings.kidsProfiles
                : {};
        },
        kidAdminProfileForPerson(personId) {
            return (this.kidsAdmin?.profiles || []).find(profile => String(profile.family_member_id) ===
                String(personId)) || null;
        },
        kidSettingsForPerson(personId) {
            const profile = this.kidAdminProfileForPerson(personId);
            if (!profile) {
                return null;
            }
            return {
                pin: profile.pin_set
                    ? "set"
                    : "",
                pinSet: Boolean(profile.pin_set),
                theme: profile.theme || "",
                accessToken: this.kidsAdmin?.portal_token || "",
                enabled: profile.enabled !== false,
                profile
            };
        },
        async loadKidRoutineState(personId, { force = false } = {}) {
            if (!personId || !this.kidAgeService?.getState)
                return null;
            if (!force && this.kidRoutineStates.has(personId)) {
                return this.kidRoutineStates.get(personId);
            }
            const result = await this.kidAgeService.getState(personId);
            if (result.error) {
                console.warn("[HOME OS] Child birthday / mission state could not load.", result.error);
                return null;
            }
            let bundle = result.data || null;
            const birthDate = this.kidAgeService?.normalizeDateKey?.(bundle?.profile?.birth_date) || "";
            const currentAge = this.kidAgeService?.ageFromBirthDate?.(birthDate) ?? null;
            const currentBand = currentAge !== null
                ? this.kidAgeService?.bandForAge?.(currentAge)
                : null;
            const savedBand = String(bundle?.profile?.age_band || "").toLowerCase();
            const starterCount = (bundle?.tasks || []).filter(task => task?.starter_key && task?.active !== false).length;
            if (birthDate && currentBand && this.kidAgeService?.configureChild &&
                (!starterCount || savedBand !== currentBand)) {
                const repair = await this.kidAgeService.configureChild({
                    personId,
                    birthDate,
                    seedIfNeeded: true
                });
                if (!repair.error && repair.data) {
                    bundle = repair.data;
                }
            }
            this.kidRoutineStates.set(personId, bundle);
            if (String(this.selectedPersonId || "") === String(personId)) {
                this.draftKidBirthDate = this.kidAgeService?.normalizeDateKey?.(bundle?.profile?.birth_date) || "";
                this.renderKidBirthdayProfile();
            }
            return bundle;
        },
        kidBirthdaySummary(dateValue = this.value("personBirthDateInput")) {
            const service = this.kidAgeService;
            const birthDate = service?.normalizeDateKey?.(dateValue) || "";
            if (!birthDate)
                return null;
            const age = service?.ageFromBirthDate?.(birthDate);
            if (age === null || age === undefined || age < 1 || age > 18)
                return null;
            const band = service.bandForAge(age);
            if (!band)
                return null;
            return {
                birthDate,
                age,
                band,
                label: service.bandLabel(band),
                displayMode: service.displayModeForBand(band)
            };
        },
        formatKidBirthday(value) {
            const key = this.kidAgeService?.normalizeDateKey?.(value) || "";
            if (!key)
                return "";
            const [year, month, day] = key.split("-").map(Number);
            const date = new Date(year, month - 1, day, 12, 0, 0, 0);
            if (Number.isNaN(date.getTime()))
                return key;
            return date.toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric"
            });
        },
        ensureKidBirthdayYearOptions() {
            const select = document.getElementById("personBirthYearInput");
            if (!select || select.dataset.ready === "true")
                return;
            const currentYear = new Date().getFullYear();
            const years = [];
            // Kids Mode supports ages 1–18. Include one extra year on each
            // edge because whether the birthday has happened yet changes age.
            for (let year = currentYear; year >= currentYear - 20; year -= 1) {
                years.push(`<option value="${year}">${year}</option>`);
            }
            select.insertAdjacentHTML("beforeend", years.join(""));
            select.dataset.ready = "true";
        },
        updateKidBirthdayDayOptions(preferredDay = null) {
            const monthSelect = document.getElementById("personBirthMonthInput");
            const daySelect = document.getElementById("personBirthDayInput");
            const yearSelect = document.getElementById("personBirthYearInput");
            if (!monthSelect || !daySelect || !yearSelect)
                return;
            const month = Number(monthSelect.value || 0);
            const year = Number(yearSelect.value || new Date().getFullYear());
            const currentDay = Number(preferredDay || daySelect.value || 0);
            let maxDay = 31;
            if (month >= 1 && month <= 12) {
                maxDay = new Date(year, month, 0).getDate();
            }
            daySelect.innerHTML = '<option value="">Day</option>' +
                Array.from({ length: maxDay }, (_, index) => {
                    const day = index + 1;
                    return `<option value="${day}">${day}</option>`;
                }).join("");
            if (currentDay >= 1 && currentDay <= maxDay) {
                daySelect.value = String(currentDay);
            }
        },
        kidBirthdayFromPicker() {
            const month = Number(this.value("personBirthMonthInput") || 0);
            const day = Number(this.value("personBirthDayInput") || 0);
            const year = Number(this.value("personBirthYearInput") || 0);
            if (!month || !day || !year)
                return "";
            const candidate = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            return this.kidAgeService?.normalizeDateKey?.(candidate) || "";
        },
        syncKidBirthdayPickerFromDraft() {
            const monthSelect = document.getElementById("personBirthMonthInput");
            const daySelect = document.getElementById("personBirthDayInput");
            const yearSelect = document.getElementById("personBirthYearInput");
            const hiddenInput = document.getElementById("personBirthDateInput");
            if (!monthSelect || !daySelect || !yearSelect || !hiddenInput)
                return;
            this.ensureKidBirthdayYearOptions();
            const key = this.kidAgeService?.normalizeDateKey?.(this.draftKidBirthDate) || "";
            hiddenInput.value = key;
            if (!key) {
                monthSelect.value = "";
                yearSelect.value = "";
                this.updateKidBirthdayDayOptions();
                daySelect.value = "";
                return;
            }
            const [year, month, day] = key.split("-").map(Number);
            monthSelect.value = String(month);
            yearSelect.value = String(year);
            this.updateKidBirthdayDayOptions(day);
            daySelect.value = String(day);
        },
        handleKidBirthdayPickerChange(changedPart = "") {
            if (changedPart === "month" || changedPart === "year") {
                this.updateKidBirthdayDayOptions();
            }
            const hiddenInput = document.getElementById("personBirthDateInput");
            const readout = document.getElementById("kidAgeBandReadout");
            const birthDate = this.kidBirthdayFromPicker();
            if (!birthDate) {
                if (hiddenInput)
                    hiddenInput.value = "";
                this.draftKidBirthDate = "";
                if (readout) {
                    readout.textContent = "Choose the month, day and year. HOME OS will calculate the age automatically.";
                }
                return;
            }
            if (hiddenInput)
                hiddenInput.value = birthDate;
            this.draftKidBirthDate = birthDate;
            this.renderKidBirthdayProfile();
        },
        renderKidBirthdayProfile() {
            const isChild = this.selectedPersonMode === "child";
            const field = document.getElementById("personBirthDateField");
            const input = document.getElementById("personBirthDateInput");
            const monthInput = document.getElementById("personBirthMonthInput");
            const dayInput = document.getElementById("personBirthDayInput");
            const yearInput = document.getElementById("personBirthYearInput");
            const readout = document.getElementById("kidAgeBandReadout");
            const status = document.getElementById("kidMissionSeedStatus");
            const copy = document.getElementById("kidMissionSeedCopy");
            const reviewButton = document.getElementById("reviewKidMissionsButton");
            if (field)
                field.hidden = !isChild;
            if (input)
                input.disabled = !isChild || !this.isAdmin();
            [monthInput, dayInput, yearInput].forEach(control => {
                if (control)
                    control.disabled = !isChild || !this.isAdmin();
            });
            if (isChild)
                this.syncKidBirthdayPickerFromDraft();
            if (!isChild)
                return;
            const summary = this.kidBirthdaySummary(this.draftKidBirthDate);
            const bundle = this.selectedPersonId
                ? this.kidRoutineStates.get(this.selectedPersonId)
                : null;
            const starterCount = (bundle?.tasks || []).filter(task => task?.starter_key && task?.active !== false).length;
            if (readout) {
                readout.textContent = summary
                    ? `${this.formatKidBirthday(summary.birthDate)} · Age ${summary.age} today · ${summary.label}. HOME OS recalculates this automatically on every birthday.`
                    : "Enter the child's birthday. HOME OS will calculate their age and choose Ages 1–4, 5–10 or 11–18 automatically.";
            }
            if (status) {
                status.textContent = !summary
                    ? "Birthday needed"
                    : starterCount
                        ? `${summary.label} · ${starterCount} missions active`
                        : `${summary.label} missions will load on save`;
            }
            if (copy) {
                copy.textContent = !summary
                    ? "Enter the child's birthday and HOME OS will build the right mission set automatically."
                    : starterCount
                        ? `The recommended ${summary.label} mission pack is active. Review it anytime, remove what does not fit, add your own missions, or attach pictures for visual learning.`
                        : `Save this child and HOME OS will create the recommended ${summary.label} missions automatically.`;
            }
            if (reviewButton) {
                const canReview = Boolean(this.selectedPersonId && summary && this.isAdmin());
                reviewButton.disabled = !canReview;
                reviewButton.title = canReview
                    ? "See and customize this child's automatic missions"
                    : "Save this child and birthday first";
            }
        },
        async persistKidBirthdayProfile(personId, birthDate) {
            if (!this.kidAgeService?.configureChild) {
                return { ok: false, seeded: false, error: new Error("Kids birthday setup service is unavailable.") };
            }
            const result = await this.kidAgeService.configureChild({
                personId,
                birthDate,
                seedIfNeeded: true
            });
            if (result.error) {
                return { ok: false, seeded: false, error: result.error };
            }
            if (result.data) {
                this.kidRoutineStates.set(personId, result.data);
            }
            this.draftKidBirthDate = String(result.birthDate || birthDate || "");
            this.renderKidBirthdayProfile();
            return { ok: true, seeded: Boolean(result.seeded), result };
        },
        generateKidPin() {
            const used = new Set(Object.values(this.kidsSettingsRoot())
                .map(value => String(value?.pin ||
                ""))
                .filter(Boolean));
            let pin = "";
            do {
                if (window.crypto
                    ?.getRandomValues) {
                    const values = new Uint32Array(1);
                    window.crypto
                        .getRandomValues(values);
                    pin =
                        String(1000 +
                            (values[0] %
                                9000));
                }
                else {
                    pin =
                        String(Math.floor(1000 +
                            Math.random() *
                                9000));
                }
            } while (used.has(pin));
            return pin;
        },
        buildHouseholdKidPortalUrl(token) {
            if (!token) {
                return "";
            }
            const url = new URL("kids.html", window.location.href);
            url.searchParams.set("home", token);
            return url.href;
        },
        buildKidAccessUrl(personId, token) {
            if (!token || !personId) {
                return "";
            }
            const url = new URL("kids.html", window.location.href);
            url.searchParams.set("home", token);
            url.searchParams.set("kid", personId);
            return url.href;
        },
        renderPeople() {
            const adults = this.adultPeople();
            const children = this.childPeople();
            const adultLoginCount = adults.filter(person => Boolean(this.membershipForPerson(person) ||
                person.auth_user_id)).length;
            const pendingCount = this.invites.filter(invite => !invite.status ||
                invite.status ===
                    "pending").length;
            this.setText("peopleAdultCount", adults.length);
            this.setText("peopleChildCount", children.length);
            this.setText("peopleLoginCount", adultLoginCount);
            this.setText("peopleInviteCount", pendingCount);
            this.setText("navPeopleCount", this.people.length);
            const adultList = document.getElementById("adultPeopleList");
            const childList = document.getElementById("childPeopleList");
            if (adultList) {
                adultList.innerHTML =
                    adults.length
                        ? adults
                            .map(person => this.personRowMarkup(person, "adult"))
                            .join("")
                        : '<div class="record-empty">No adults added yet.</div>';
            }
            if (childList) {
                childList.innerHTML =
                    children.length
                        ? children
                            .map(person => this.personRowMarkup(person, "child"))
                            .join("")
                        : '<div class="record-empty">No children added yet.</div>';
            }
            this.renderPendingInvites();
            if (this.selectedPersonId) {
                this.renderPersonEditor();
            }
        },
        personRowMarkup(person, mode) {
            const membership = this.membershipForPerson(person);
            const selected = person.id ===
                this.selectedPersonId;
            const relationship = this.pretty(person.relationship_label ||
                (mode === "child"
                    ? "Child"
                    : "Adult"));
            let status = "";
            let statusClass = "";
            if (mode ===
                "child") {
                const kid = this.kidSettingsForPerson(person.id);
                status =
                    kid?.pin &&
                        kid?.theme
                        ? `${this.pretty(kid.theme)} theme · PIN ready`
                        : "Kids Mode setup";
                statusClass =
                    kid?.pin &&
                        kid?.theme
                        ? "success"
                        : "attention";
            }
            else {
                const pending = this.pendingInviteForPerson(person.id);
                status =
                    membership
                        ? String(membership.role ||
                            "member").toUpperCase()
                        : pending
                            ? "INVITE PENDING"
                            : "NO LOGIN";
                statusClass =
                    membership
                        ? "success"
                        : pending
                            ? "attention"
                            : "";
            }
            return `
                <div
                    class="record-row person-record-row ${selected ? "is-selected" : ""}"
                    data-person-row="${this.escape(person.id)}"
                    role="button"
                    tabindex="0"
                    aria-label="Manage ${this.escape(this.personName(person))}"
                >
                    <div class="record-main">
                        <strong>${this.escape(this.personName(person))}</strong>
                        <span>${this.escape(relationship)}</span>
                    </div>

                    <div class="record-meta">
                        <span class="record-pill ${statusClass}">
                            ${this.escape(status)}
                        </span>
                        <span class="person-row-chevron" aria-hidden="true">›</span>
                    </div>
                </div>
            `;
        },
        renderPendingInvites() {
            const section = document.getElementById("pendingInvitesSection");
            const list = document.getElementById("pendingInvitesList");
            if (!section ||
                !list) {
                return;
            }
            const pending = this.invites.filter(invite => !invite.status ||
                invite.status ===
                    "pending");
            section.hidden =
                !this.isAdmin() ||
                    !pending.length;
            if (section.hidden) {
                return;
            }
            list.innerHTML =
                pending.map(invite => {
                    const person = this.people.find(item => item.id ===
                        invite.family_member_id);
                    return `
                            <div class="record-row">
                                <div class="record-main">
                                    <strong>
                                        ${this.escape(person ? this.personName(person) : invite.email)}
                                    </strong>
                                    <span>
                                        ${this.escape(invite.email)}
                                        ·
                                        ${this.escape(this.pretty(invite.role || "member"))}
                                    </span>
                                </div>

                                <div class="record-meta">
                                    <span class="record-pill attention">
                                        Pending
                                    </span>

                                    <button
                                        class="record-action danger"
                                        type="button"
                                        data-revoke-invite="${this.escape(invite.id)}"
                                    >
                                        Revoke
                                    </button>
                                </div>
                            </div>
                        `;
                })
                    .join("");
        },
        openNewPerson(mode = "adult") {
            if (!this.requireAdmin()) {
                return;
            }
            this.selectedPersonId =
                null;
            this.selectedPersonMode =
                mode === "child"
                    ? "child"
                    : "adult";
            this.showPersonEditor(true);
            document.getElementById("personForm")
                ?.reset();
            this.setValue("personIdInput", "");
            this.setValue("personTypeInput", this.selectedPersonMode);
            this.setChecked("personAssignableInput", true);
            this.setText("personEditorKicker", this.selectedPersonMode ===
                "child"
                ? "NEW CHILD PROFILE"
                : "NEW ADULT");
            this.setText("personEditorTitle", this.selectedPersonMode ===
                "child"
                ? "Add Child"
                : "Add Adult");
            this.draftKidPin =
                this.selectedPersonMode ===
                    "child"
                    ? this.generateKidPin()
                    : "";
            this.draftKidTheme =
                "";
            this.draftKidBirthDate =
                "";
            this.renderPersonAccessMode();
        },
        openPerson(personId) {
            const person = this.people.find(item => item.id ===
                personId);
            if (!person) {
                return;
            }
            this.selectedPersonId =
                personId;
            this.selectedPersonMode =
                this.isChildPerson(person)
                    ? "child"
                    : "adult";
            this.draftKidPin = "";
            this.draftKidTheme = "";
            this.draftKidBirthDate = "";
            this.renderPeople();
            this.renderPersonEditor();
            if (this.selectedPersonMode === "child") {
                this.loadKidRoutineState(personId).catch(error => console.warn("[HOME OS] Child mission profile could not load.", error));
            }
        },
        showPersonEditor(show) {
            const placeholder = document.getElementById("personEditorPlaceholder");
            const content = document.getElementById("personEditorContent");
            if (placeholder) {
                placeholder.hidden =
                    show;
            }
            if (content) {
                content.hidden =
                    !show;
            }
        },
        renderPersonEditor() {
            const person = this.people.find(item => item.id ===
                this.selectedPersonId);
            if (!person) {
                if (this.selectedPersonId) {
                    this.showPersonEditor(false);
                }
                else {
                    this.renderPersonAccessMode();
                }
                return;
            }
            this.selectedPersonMode =
                this.isChildPerson(person)
                    ? "child"
                    : "adult";
            this.showPersonEditor(true);
            this.setText("personEditorKicker", this.selectedPersonMode ===
                "child"
                ? "CHILD PROFILE"
                : "ADULT HOUSEHOLD MEMBER");
            this.setText("personEditorTitle", this.personName(person));
            this.setValue("personIdInput", person.id);
            this.setValue("personNameInput", this.personName(person));
            this.setValue("personTypeInput", this.selectedPersonMode);
            this.setValue("personRelationshipInput", person.relationship_label ||
                "");
            this.setChecked("personAssignableInput", person.can_be_assigned !==
                false);
            [
                "personNameInput",
                "personRelationshipInput",
                "personAssignableInput",
                "personBirthDateInput"
            ].forEach(id => {
                const field = document.getElementById(id);
                if (field) {
                    field.disabled =
                        !this.isAdmin();
                }
            });
            this.syncPersonSaveActions();
            this.renderPersonAccessMode();
            this.renderKidBirthdayProfile();
        },
        syncPersonSaveActions() {
            const isChild = this.selectedPersonMode ===
                "child";
            const adultSave = document.getElementById("personProfileSaveButton");
            const childSave = document.getElementById("saveChildButton");
            if (adultSave) {
                adultSave.hidden =
                    isChild ||
                        !this.isAdmin();
                adultSave.disabled =
                    !this.isAdmin();
                adultSave.textContent =
                    "Save Adult";
            }
            if (childSave) {
                childSave.hidden =
                    !isChild ||
                        !this.isAdmin();
                childSave.disabled =
                    !this.isAdmin();
            }
        },
        renderPersonAccessMode() {
            this.syncPersonSaveActions();
            const adult = document.getElementById("adultAccessEditor");
            const child = document.getElementById("childAccessEditor");
            const isChild = this.selectedPersonMode ===
                "child";
            if (adult) {
                adult.hidden =
                    isChild;
            }
            if (child) {
                child.hidden =
                    !isChild;
            }
            this.renderKidBirthdayProfile();
            if (isChild) {
                this.renderChildAccess();
            }
            else {
                this.renderAdultAccess();
            }
        },
        renderAdultAccess() {
            const person = this.people.find(item => item.id ===
                this.selectedPersonId);
            const connected = document.getElementById("connectedAccessControls");
            const invite = document.getElementById("inviteAccessControls");
            const linkButton = document.getElementById("linkMyAccountButton");
            if (!person) {
                document.getElementById("ownerRoleLock")?.setAttribute("hidden", "");
                document.getElementById("editableRoleControls")?.setAttribute("hidden", "");
                this.setText("personLoginStatus", "SAVE FIRST");
                this.setText("personLoginCopy", "Save the adult first, then send an email invitation or connect an existing account.");
                if (connected) {
                    connected.hidden =
                        true;
                }
                if (invite) {
                    invite.hidden =
                        true;
                }
                return;
            }
            const membership = this.membershipForPerson(person);
            if (membership) {
                this.setText("personLoginStatus", String(membership.role ||
                    "member").toUpperCase());
                this.setText("personLoginCopy", "This adult has a HOME OS login connected to the household.");
                const role = String(membership.role ||
                    "member")
                    .toLowerCase();
                const isOwner = role ===
                    "owner";
                const canManageRole = this.isAdmin() &&
                    !isOwner;
                if (connected) {
                    connected.hidden =
                        !this.isAdmin();
                }
                if (invite) {
                    invite.hidden =
                        true;
                }
                const ownerLock = document.getElementById("ownerRoleLock");
                const editableRole = document.getElementById("editableRoleControls");
                if (ownerLock) {
                    ownerLock.hidden =
                        !(this.isAdmin() &&
                            isOwner);
                }
                if (editableRole) {
                    editableRole.hidden =
                        !canManageRole;
                }
                this.setValue("personRoleInput", isOwner
                    ? "member"
                    : role);
                const roleInput = document.getElementById("personRoleInput");
                const roleButton = document.getElementById("saveRoleButton");
                if (roleInput) {
                    roleInput.disabled =
                        !canManageRole;
                }
                if (roleButton) {
                    roleButton.hidden =
                        !canManageRole;
                }
            }
            else {
                document.getElementById("ownerRoleLock")?.setAttribute("hidden", "");
                document.getElementById("editableRoleControls")?.setAttribute("hidden", "");
                const pending = this.pendingInviteForPerson(person.id);
                this.setText("personLoginStatus", pending
                    ? "INVITE PENDING"
                    : "NO LOGIN");
                this.setText("personLoginCopy", pending
                    ? `An invitation is waiting for ${pending.email}.`
                    : "Adults can receive tasks without a login, or you can invite them to their own HOME OS account.");
                if (connected) {
                    connected.hidden =
                        true;
                }
                if (invite) {
                    invite.hidden =
                        !this.isAdmin() ||
                            Boolean(pending);
                }
                if (linkButton) {
                    linkButton.hidden =
                        !(this.isAdmin() &&
                            !this.state.person?.id);
                }
            }
        },
        renderChildAccess() {
            const person = this.people.find(item => item.id ===
                this.selectedPersonId);
            const saved = person
                ? this.kidSettingsForPerson(person.id)
                : null;
            const pin = this.draftKidPin || "";
            const theme = saved?.theme ||
                this.draftKidTheme ||
                "";
            const token = this.kidsAdmin?.portal_token ||
                "";
            this.draftKidTheme =
                theme;
            this.setValue("kidPinInput", pin);
            const pinInput = document.getElementById("kidPinInput");
            if (pinInput) {
                pinInput.placeholder =
                    saved?.pinSet
                        ? "••••"
                        : "0000";
                pinInput.dataset.pinAvailable =
                    pin.length === 4
                        ? "true"
                        : "false";
            }
            this.setKidPinVisibility(false);
            document
                .querySelectorAll('input[name="kidTheme"]')
                .forEach(input => {
                input.checked =
                    input.value ===
                        theme;
                input.disabled =
                    !this.isAdmin();
            });
            const householdPortalUrl = this.buildHouseholdKidPortalUrl(token);
            const accessUrl = person
                ? this.buildKidAccessUrl(person.id, token)
                : "";
            this.setValue("householdKidPortalUrl", householdPortalUrl);
            this.setValue("kidAccessUrl", accessUrl);
            this.setText("kidAccessStatus", saved?.enabled &&
                saved?.pinSet &&
                saved?.theme &&
                token
                ? "READY"
                : person
                    ? "SETUP NEEDED"
                    : "SAVE CHILD FIRST");
            if (pinInput) {
                pinInput.disabled =
                    !this.isAdmin();
            }
            const save = document.getElementById("saveChildButton");
            const generate = document.getElementById("generateKidPinButton");
            const copy = document.getElementById("copyKidLinkButton");
            const copyPortal = document.getElementById("copyHouseholdKidPortalButton");
            if (save) {
                save.disabled =
                    !this.isAdmin();
            }
            if (generate) {
                generate.disabled =
                    !this.isAdmin();
            }
            if (copy) {
                copy.disabled =
                    !accessUrl;
            }
            if (copyPortal) {
                copyPortal.disabled =
                    !householdPortalUrl;
            }
            this.renderKidBirthdayProfile();
        },
        setKidPinVisibility(visible = false) {
            const input = document.getElementById("kidPinInput");
            const button = document.getElementById("toggleKidPinButton");
            if (input) {
                input.type =
                    visible
                        ? "text"
                        : "password";
            }
            if (button) {
                button.setAttribute("aria-pressed", String(visible));
                button.setAttribute("aria-label", visible
                    ? "Hide PIN"
                    : "Show PIN");
                button.title =
                    visible
                        ? "Hide PIN"
                        : "Show PIN";
                button.classList.toggle("is-visible", visible);
            }
        },
        toggleKidPinVisibility() {
            const input = document.getElementById("kidPinInput");
            if (!input) {
                return;
            }
            this.setKidPinVisibility(input.type ===
                "password");
        },
        selectedKidTheme() {
            return (document.querySelector('input[name="kidTheme"]:checked')
                ?.value ||
                "");
        },
        sanitizeKidPin(value) {
            return String(value ||
                "")
                .replace(/\D/g, "")
                .slice(0, 4);
        },
        async savePerson(event) {
            event.preventDefault();
            if (!this.requireAdmin()) {
                return;
            }
            const displayName = this.value("personNameInput")
                .trim();
            if (!displayName) {
                return this.notify("Enter the person's name.", {
                    tone: "attention",
                    title: "People"
                });
            }
            const mode = this.selectedPersonMode ===
                "child"
                ? "child"
                : "adult";
            const childBirthDate = mode === "child"
                ? (this.kidBirthdayFromPicker() || this.value("personBirthDateInput").trim())
                : "";
            if (mode === "child") {
                const summary = this.kidBirthdaySummary(childBirthDate);
                if (!summary) {
                    return this.notify("Enter this child's birthday. Kids Mode currently supports ages 1 through 18.", { tone: "attention", title: "Child birthday" });
                }
            }
            if (mode === "child" &&
                !this.selectedKidTheme()) {
                return this.notify("Choose a Girl Theme or Boy Theme for this child's Kids Mode page.", {
                    tone: "attention",
                    title: "Kids Mode"
                });
            }
            const existingId = this.value("personIdInput") ||
                null;
            const button = event.submitter;
            await this.withBusy(button, async () => {
                const { data: savedPersonId, error } = await this.supabase
                    .rpc("homeos_save_person", {
                    p_person_id: existingId,
                    p_display_name: displayName,
                    p_member_type: mode,
                    p_relationship_label: this.value("personRelationshipInput")
                        .trim() ||
                        null,
                    p_can_be_assigned: this.checked("personAssignableInput"),
                    p_active: true,
                    p_color: mode === "child"
                        ? this.selectedKidTheme()
                        : null
                });
                if (error) {
                    throw error;
                }
                await this.loadPeople();
                this.selectedPersonId =
                    savedPersonId ||
                    existingId ||
                    null;
                this.selectedPersonMode =
                    mode;
                let kidAccessSaved = true;
                let kidAgeSaved = true;
                let kidAgeSeeded = false;
                let kidAgeError = null;
                if (mode === "child" &&
                    this.selectedPersonId) {
                    kidAccessSaved =
                        await this.persistKidAccess(this.selectedPersonId, { quiet: true });
                    const birthdayResult = await this.persistKidBirthdayProfile(this.selectedPersonId, childBirthDate);
                    kidAgeSaved = birthdayResult.ok;
                    kidAgeSeeded = birthdayResult.seeded;
                    kidAgeError = birthdayResult.error || null;
                }
                if (mode === "child" && this.selectedPersonId) {
                    await this.loadKidRoutineState(this.selectedPersonId, { force: true });
                }
                this.renderAll();
                this.renderPersonEditor();
                if (mode === "child" &&
                    !kidAccessSaved) {
                    // persistKidAccess already shows the specific reason the Kids Mode save failed. Do not replace that useful message with a generic second toast.
                    return;
                }
                if (mode === "child" && !kidAgeSaved) {
                    this.notify(kidAgeError?.message || "The child saved, but HOME OS could not create the birthday-based mission profile.", { tone: "attention", title: "Birthday-based missions need attention" });
                    return;
                }
                this.notify(mode === "child"
                    ? (kidAgeSeeded
                        ? "Child saved. HOME OS calculated their age from the birthday and created the recommended missions."
                        : "Child profile, birthday, Kids Mode and automatic missions saved together.")
                    : "Adult household member saved.", {
                    tone: "success",
                    title: "People & Access"
                });
            })
                .catch(error => this.handleError("This household person could not be saved.", error));
        },
        async persistKidAccess(personId = this.selectedPersonId, { quiet = false } = {}) {
            if (!this.requireAdmin() ||
                !personId) {
                return false;
            }
            const service = this.peopleService;
            const current = this.kidAdminProfileForPerson(personId);
            const pin = this.sanitizeKidPin(this.value("kidPinInput") ||
                this.draftKidPin);
            const theme = this.selectedKidTheme() ||
                this.draftKidTheme ||
                current?.theme ||
                "";
            if (pin &&
                pin.length !== 4) {
                this.notify("Kids Mode PIN must be exactly 4 digits.", {
                    tone: "attention",
                    title: "Kids Mode"
                });
                return false;
            }
            if (!pin &&
                !current?.pin_set) {
                this.notify("Generate or enter a 4-digit PIN before saving Kids Mode.", {
                    tone: "attention",
                    title: "Kids Mode"
                });
                return false;
            }
            if (!theme) {
                this.notify("Choose a Girl Theme or Boy Theme.", {
                    tone: "attention",
                    title: "Kids Mode"
                });
                return false;
            }
            let result;
            if (service?.saveAndVerifyKidAccess) {
                result =
                    await service.saveAndVerifyKidAccess({
                        personId,
                        enabled: true,
                        theme,
                        pin
                    });
            }
            else if (service?.setKidAccess) {
                result =
                    await service.setKidAccess({
                        personId,
                        enabled: true,
                        theme,
                        pin
                    });
            }
            else {
                const { data, error } = await this.supabase.rpc("homeos_set_kid_access", {
                    p_family_member_id: personId,
                    p_enabled: true,
                    p_theme: theme,
                    p_pin: String(pin || "").trim() || null
                });
                result = {
                    data: data || null,
                    error,
                    adminState: null
                };
                if (!error) {
                    const stateResult = await this.supabase.rpc("homeos_get_kid_admin_state");
                    if (stateResult.error) {
                        result.error =
                            stateResult.error;
                    }
                    else {
                        result.adminState =
                            stateResult.data || null;
                    }
                }
            }
            if (result.error) {
                const message = String(result.error?.message ||
                    result.error ||
                    "");
                if (message
                    .toLowerCase()
                    .includes("permission denied for function homeos_set_kid_access")) {
                    this.notify("Supabase is blocking the Kids Mode save function. Run supabase/11-kids-mode-permission-fix.sql once in the Supabase SQL Editor, then press Save Child again.", {
                        tone: "attention",
                        title: "Kids Mode permission"
                    });
                }
                else {
                    this.handleError("Kids Mode access could not be saved.", result.error);
                }
                return false;
            }
            if (result.adminState) {
                this.kidsAdmin =
                    result.adminState;
            }
            else {
                let stateResult;
                if (service?.getKidsAdminState) {
                    stateResult =
                        await service.getKidsAdminState();
                }
                else {
                    const { data, error } = await this.supabase.rpc("homeos_get_kid_admin_state");
                    stateResult = {
                        data: data || null,
                        error
                    };
                }
                if (stateResult.error) {
                    this.handleError("Kids Mode saved, but HOME OS could not verify it.", stateResult.error);
                    return false;
                }
                this.kidsAdmin =
                    stateResult.data || null;
            }
            const savedProfile = this.kidAdminProfileForPerson(personId);
            if (!savedProfile ||
                savedProfile.enabled === false ||
                !savedProfile.pin_set) {
                this.notify("Kids Mode did not finish saving the PIN. Please save it again.", {
                    tone: "attention",
                    title: "Kids Mode"
                });
                return false;
            }
            this.draftKidPin =
                pin ||
                    this.draftKidPin;
            this.draftKidTheme =
                savedProfile.theme ||
                    theme;
            this.renderPeople();
            this.renderChildAccess();
            if (!quiet) {
                this.notify(pin
                    ? "Kids Mode PIN and access saved."
                    : "Kids Mode access saved.", {
                    tone: "success",
                    title: "Child access"
                });
            }
            return true;
        },
        generateNewKidPin() {
            this.draftKidPin =
                this.generateKidPin();
            this.setValue("kidPinInput", this.draftKidPin);
            this.notify("New PIN generated. Click Save Child to activate the new PIN.", {
                tone: "attention",
                title: "Kids Mode"
            });
        },
        async copyLinkFromInput(inputId, successMessage, title = "Kids Mode") {
            const link = this.value(inputId);
            if (!link)
                return;
            try {
                await navigator.clipboard.writeText(link);
            }
            catch (error) {
                const input = document.getElementById(inputId);
                input?.select();
                document.execCommand?.("copy");
            }
            this.notify(successMessage, {
                tone: "success",
                title
            });
        },
        async copyHouseholdKidPortal() {
            return this.copyLinkFromInput("householdKidPortalUrl", "Household Kids Portal link copied.", "Kids Mode");
        },
        async copyKidLink() {
            return this.copyLinkFromInput("kidAccessUrl", "Kid shortcut link copied.", "Child access");
        },
        async saveRole() {
            if (!this.requireAdmin() ||
                !this.selectedPersonId) {
                return;
            }
            const person = this.people.find(item => item.id ===
                this.selectedPersonId);
            if (!person ||
                this.isChildPerson(person)) {
                return;
            }
            const membership = this.membershipForPerson(person);
            if (!membership) {
                return;
            }
            const button = document.getElementById("saveRoleButton");
            await this.withBusy(button, async () => {
                const { error } = await this.supabase
                    .rpc("homeos_set_member_role", {
                    p_membership_id: membership.id,
                    p_role: this.value("personRoleInput") ||
                        "member"
                });
                if (error) {
                    throw error;
                }
                await this.loadPeople();
                this.renderAll();
                this.renderPersonEditor();
                this.notify("Household role updated.", {
                    tone: "success",
                    title: "Access saved"
                });
            })
                .catch(error => this.handleError("The household role could not be changed.", error));
        },
        async createInvite() {
            if (!this.requireAdmin() ||
                !this.selectedPersonId) {
                return;
            }
            const person = this.people.find(item => item.id ===
                this.selectedPersonId);
            if (!person ||
                this.isChildPerson(person)) {
                return;
            }
            const email = this.value("inviteEmailInput")
                .trim()
                .toLowerCase();
            if (!email ||
                !email.includes("@")) {
                return this.notify("Enter a valid email address.", {
                    tone: "attention",
                    title: "Invitation"
                });
            }
            const button = document.getElementById("createInviteButton");
            await this.withBusy(button, async () => {
                const { error } = await this.supabase
                    .rpc("homeos_create_household_invite", {
                    p_family_member_id: this.selectedPersonId,
                    p_email: email,
                    p_role: this.value("inviteRoleInput") ||
                        "member"
                });
                if (error) {
                    throw error;
                }
                this.setValue("inviteEmailInput", "");
                await this.loadPeople();
                this.renderAll();
                this.renderPersonEditor();
                this.notify("Adult HOME OS invitation prepared.", {
                    tone: "success",
                    title: "Invitation"
                });
            })
                .catch(error => this.handleError("The invitation could not be created.", error));
        },
        async linkCurrentAccount() {
            if (!this.requireAdmin() ||
                !this.selectedPersonId) {
                return;
            }
            const person = this.people.find(item => item.id ===
                this.selectedPersonId);
            if (!person ||
                this.isChildPerson(person)) {
                return;
            }
            const button = document.getElementById("linkMyAccountButton");
            await this.withBusy(button, async () => {
                const { error } = await this.supabase
                    .rpc("homeos_link_current_person", {
                    p_person_id: this.selectedPersonId
                });
                if (error) {
                    throw error;
                }
                this.state =
                    await window.HomeOS
                        .session
                        .refresh();
                await this.loadPeople();
                this.renderIdentity();
                this.renderAll();
                this.renderPersonEditor();
                this.notify("Your account is linked to this adult household member.", {
                    tone: "success",
                    title: "Account linked"
                });
            })
                .catch(error => this.handleError("The account could not be linked.", error));
        },
        async revokeInvite(inviteId) {
            if (!this.requireAdmin()) {
                return;
            }
            const { error } = await this.supabase
                .from("household_invites")
                .update({
                status: "revoked"
            })
                .eq("id", inviteId)
                .eq("household_id", this.householdId());
            if (error) {
                return this.handleError("The invitation could not be revoked.", error);
            }
            await this.loadPeople();
            this.renderAll();
            this.notify("Invitation revoked.", {
                tone: "success",
                title: "People & Access"
            });
        },
    };
})();
