/* ============================================================
   HOMEOS // ACCOUNT EVENTS

   Click, change and form events for Account.
============================================================ */

(function registerAccountEventsModule() {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    window.HomeOS.accountPageModules =
        window.HomeOS.accountPageModules || {};
    window.HomeOS.accountPageModules.events = {
        // --- Events ---
        bindEvents() {
            document.addEventListener("click", event => {
                const tab = event.target.closest("[data-account-tab]");
                if (tab)
                    return this.openTab(tab.dataset.accountTab);
                const theme = event.target.closest("[data-account-theme]");
                if (theme)
                    return this.setTheme(theme.dataset.accountTheme);
                const homeTab = event.target.closest("[data-home-setup-tab]");
                if (homeTab)
                    return this.openHomeTab(homeTab.dataset.homeSetupTab);
                const openHomeReset = event.target.closest("#openHomeResetButton");
                if (openHomeReset)
                    return this.showHomeResetConfirm(true);
                const cancelHomeReset = event.target.closest("#cancelHomeResetButton");
                if (cancelHomeReset)
                    return this.showHomeResetConfirm(false);
                const confirmHomeReset = event.target.closest("#confirmHomeResetButton");
                if (confirmHomeReset)
                    return this.restartHomeSetup(confirmHomeReset);
                const taskPerson = event.target.closest("[data-task-person]");
                if (taskPerson)
                    return this.selectTaskPerson(taskPerson.dataset.taskPerson);
                const taskCategory = event.target.closest("[data-task-category-choice]");
                if (taskCategory)
                    return this.chooseSimpleTaskCategory(taskCategory.dataset.taskCategoryChoice);
                const taskRepeat = event.target.closest("[data-task-repeat-choice]");
                if (taskRepeat)
                    return this.chooseTaskRepeat(taskRepeat.dataset.taskRepeatChoice);
                const taskWeekday = event.target.closest("[data-task-weekday]");
                if (taskWeekday)
                    return this.toggleTaskWeekday(taskWeekday.dataset.taskWeekday);
                const person = event.target.closest("[data-person-row]");
                if (person)
                    return this.openPerson(person.dataset.personRow);
                const revoke = event.target.closest("[data-revoke-invite]");
                if (revoke)
                    return this.revokeInvite(revoke.dataset.revokeInvite);
                const missionFilter = event.target.closest("[data-kid-mission-filter]");
                if (missionFilter)
                    return this.setKidMissionEditorFilter(missionFilter.dataset.kidMissionFilter);
                const missionToggle = event.target.closest("[data-kid-mission-toggle]");
                if (missionToggle) {
                    return this.toggleKidMission(missionToggle.dataset.kidMissionToggle, missionToggle.dataset.kidMissionActive === "true", missionToggle);
                }
                const missionPicture = event.target.closest("[data-kid-mission-picture]");
                if (missionPicture)
                    return this.chooseKidMissionPicture(missionPicture.dataset.kidMissionPicture);
                const removeMissionPicture = event.target.closest("[data-kid-mission-picture-remove]");
                if (removeMissionPicture) {
                    return this.removeKidMissionPicture(removeMissionPicture.dataset.kidMissionPictureRemove, removeMissionPicture);
                }
                const actionMap = [
                    ["editLevel", "editLevel"], ["archiveLevel", "archiveLevel"],
                    ["editRoom", "editRoom"], ["archiveRoom", "archiveRoom"],
                    ["editZone", "editZone"], ["archiveZone", "archiveZone"],
                    ["editInventory", "editInventory"], ["archiveInventory", "archiveInventory"],
                    ["editLaundry", "editLaundry"], ["archiveLaundry", "archiveLaundry"],
                    ["editCare", "editCare"], ["toggleCare", "toggleCare"]
                ];
                for (const [datasetKey, method] of actionMap) {
                    const target = event.target.closest(`[data-${datasetKey.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}]`);
                    if (target)
                        return this[method](target.dataset[datasetKey]);
                }
            });
            document.addEventListener("keydown", event => {
                if (event.key === "Escape" && !document.getElementById("kidMissionEditorBackdrop")?.hidden) {
                    this.closeKidMissionEditor();
                    return;
                }
                const person = event.target.closest?.("[data-person-row]");
                if (!person ||
                    !["Enter", " "].includes(event.key)) {
                    return;
                }
                event.preventDefault();
                this.openPerson(person.dataset.personRow);
            });
            this.on("accountMobileSection", "change", event => this.openTab(event.target.value));
            this.on("personalAccountForm", "submit", event => this.saveProfile(event));
            this.on("householdIdentityForm", "submit", event => this.saveHousehold(event));
            this.on("accountPageSignOut", "click", () => this.signOut());
            this.on("addAdultButton", "click", () => this.openNewPerson("adult"));
            this.on("addChildButton", "click", () => this.openNewPerson("child"));
            this.on("closePersonEditor", "click", () => {
                this.selectedPersonId =
                    null;
                this.selectedPersonMode =
                    "adult";
                this.showPersonEditor(false);
                this.renderPeople();
            });
            this.on("personForm", "submit", event => this.savePerson(event));
            this.on("saveRoleButton", "click", () => this.saveRole());
            this.on("createInviteButton", "click", () => this.createInvite());
            this.on("linkMyAccountButton", "click", () => this.linkCurrentAccount());
            this.on("generateKidPinButton", "click", () => this.generateNewKidPin());
            this.on("copyKidLinkButton", "click", () => this.copyKidLink());
            this.on("copyHouseholdKidPortalButton", "click", () => this.copyHouseholdKidPortal());
            this.on("kidPinInput", "input", event => {
                const safe = this.sanitizeKidPin(event.target.value);
                event.target.value =
                    safe;
                this.draftKidPin =
                    safe;
                if (safe.length === 4 &&
                    this.selectedPersonId) {
                    this.rememberKidPin(this.selectedPersonId, safe);
                }
            });
            this.on("toggleKidPinButton", "click", () => this.toggleKidPinVisibility());
            [
                ["personBirthMonthInput", "month"],
                ["personBirthDayInput", "day"],
                ["personBirthYearInput", "year"]
            ].forEach(([id, part]) => {
                this.on(id, "change", () => this.handleKidBirthdayPickerChange(part));
            });
            this.on("reviewKidMissionsButton", "click", () => this.openKidMissionEditor());
            this.on("closeKidMissionEditorButton", "click", () => this.closeKidMissionEditor());
            this.on("doneKidMissionEditorButton", "click", () => this.closeKidMissionEditor());
            this.on("kidCustomMissionForm", "submit", event => this.addCustomKidMission(event));
            this.on("kidMissionImageInput", "change", event => this.handleKidMissionImageChange(event));
            const missionBackdrop = document.getElementById("kidMissionEditorBackdrop");
            missionBackdrop?.addEventListener("click", event => {
                if (event.target === missionBackdrop)
                    this.closeKidMissionEditor();
            });
            document
                .querySelectorAll('input[name="kidTheme"]')
                .forEach(input => input.addEventListener("change", event => {
                this.draftKidTheme =
                    event.target.value;
            }));
            this.on("accountThemeToggle", "click", () => {
                const next = document.body
                    .classList
                    .contains("dark")
                    ? "light"
                    : "dark";
                this.setTheme(next);
            });
            this.on("resetTaskFormButton", "click", () => this.clearSimpleTaskForm({ keepPerson: true }));
            this.on("taskAssignmentForm", "submit", event => this.saveTask(event));
            this.on("taskDueDateInput", "change", () => this.configureTaskSchedule());
            this.on("levelForm", "submit", event => this.saveLevel(event));
            this.on("clearLevelButton", "click", () => this.clearLevelForm());
            this.on("roomForm", "submit", event => this.saveRoom(event));
            this.on("clearRoomButton", "click", () => this.clearRoomForm());
            this.on("zoneForm", "submit", event => this.saveZone(event));
            this.on("clearZoneButton", "click", () => this.clearZoneForm());
            this.on("inventoryLocationForm", "submit", event => this.saveInventory(event));
            this.on("clearInventoryButton", "click", () => this.clearInventoryForm());
            this.on("laundrySystemForm", "submit", event => this.saveLaundrySystem(event));
            this.on("laundryAreaForm", "submit", event => this.saveLaundryArea(event));
            this.on("clearLaundryButton", "click", () => this.clearLaundryForm());
            this.on("homeCareFeatureForm", "submit", event => this.saveCareFeature(event));
            this.on("clearCareButton", "click", () => this.clearCareForm());
            window.addEventListener("hashchange", () => this.openTab(this.tabFromHash(), { updateHash: false }));
        },
    };
})();
