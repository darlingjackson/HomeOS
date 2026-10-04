/* ============================================================
   HOMEOS // ACCOUNT

   Builds the Account workspace from its smaller page modules.
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    const AccountSettings = {
        state: null,
        people: [],
        memberships: [],
        invites: [],
        kidsAdmin: null,
        kidRoutineStates: new Map(),
        draftKidBirthDate: "",
        tasks: [],
        taskAssignments: [],
        home: {
            levels: [],
            rooms: [],
            zones: [],
            inventory: [],
            laundry: [],
            features: [],
            settings: {}
        },
        selectedPersonId: null,
        selectedPersonMode: "adult",
        draftKidPin: "",
        draftKidTheme: "",
        kidMissionEditorPersonId: null,
        kidMissionEditorState: null,
        kidMissionEditorPendingTaskId: null,
        kidMissionEditorFilter: "active",
        selectedTaskPersonId: null,
        selectedTaskPersonTasks: [],
        taskPersonTasksLoadedFor: null,
        taskPersonTasksLoading: false,
        selectedTaskPersonToday: new Map(),
        taskLiveChannel: null,
        taskLivePollTimer: null,
        taskLiveRefreshTimer: null,
        taskLiveListenersBound: false,
        pendingActions: new Set(),
        validTabs: new Set(["profile", "household", "people", "tasks", "home", "session"]),
        validHomeTabs: new Set(["layout", "zones", "inventory", "laundry", "care"]),
        get supabase() {
            return window.HomeOS.supabase;
        },
        get peopleService() {
            return window.HomeOS?.services?.people || null;
        },
        get kidAgeService() {
            return window.HomeOS?.services?.kidAge || null;
        },
        isAdmin() {
            return ["owner", "admin"].includes(String(this.state?.role || "").toLowerCase());
        },
        async init() {
            if (!window.HomeOS.session?.guard) {
                console.error("[HOME OS] Account settings cannot start because session.js is unavailable.");
                return;
            }
            this.state = await window.HomeOS.session.guard();
            if (!this.state?.authenticated || !this.state?.household?.id)
                return;
            this.bindEvents();
            this.renderIdentity();
            this.renderHousehold();
            this.openInitialTab();
            this.syncAppearanceControls();
            await Promise.all([
                this.loadPeople(),
                this.loadHomeData()
            ]);
            this.renderAll();
            this.applyPermissionState();
            this.startTaskLiveSync();
            window.addEventListener("homeos:shellready", () => this.syncAppearanceControls());
        },
        householdId() {
            return this.state?.household?.id || null;
        },
        notify(message, options = {}) {
            if (window.HomeOS.ui?.notify) {
                window.HomeOS.ui.notify(message, options);
                return;
            }
            window.dispatchEvent(new CustomEvent("homeos:notify", {
                detail: { message, ...options }
            }));
        },
        async withBusy(button, work, busyLabel = "Saving…") {
            if (!button)
                return work();
            const original = button.textContent;
            button.disabled = true;
            button.textContent = busyLabel;
            try {
                return await work();
            }
            finally {
                button.disabled = false;
                button.textContent = original;
            }
        },
        async runAccountMutation(key, work) {
            const mutationKey = String(key || "account");

            if (this.pendingActions.has(mutationKey)) {
                return null;
            }

            this.pendingActions.add(mutationKey);

            try {
                return await work();
            }
            catch (error) {
                console.error("[HOME OS] Account update failed.", error);
                this.notify(error?.message || "HOME OS could not save that change.", {
                    tone: "attention",
                    title: "Save failed"
                });
                return null;
            }
            finally {
                this.pendingActions.delete(mutationKey);
            }
        },
    };
    // --- Account Page Modules ---
    const modules = window.HomeOS?.accountPageModules || {};
    [
        "account",
        "people",
        "kidMissions",
        "tasks",
        "home",
        "render",
        "events",
        "utilities"
    ].forEach(moduleName => {
        if (!modules[moduleName]) {
            throw new Error(`HOME OS Account module failed to load: ${moduleName}`);
        }
        Object.assign(AccountSettings, modules[moduleName]);
    });
    try {
        await AccountSettings.init();
    }
    catch (error) {
        console.error("[HOME OS] Account settings failed to initialize.", error);
        AccountSettings.notify(error.message || "Account settings could not load.", { tone: "attention", title: "Account" });
    }
});
