/* ============================================================
   HOMEOS // CLEANING

   Builds the Cleaning page from its smaller page modules.
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";
    window.HomeOS =
        window.HomeOS || {};
    const modules = window.HomeOS.cleaningModules || {};
    const App = {
        state: null,
        data: null,
        mode: "room",
        selectedLevelId: null,
        selectedRoomId: null,
        selectedZoneId: null,
        pendingTarget: null,
        clockTimer: null,
        toastTimer: null,
        taskReactionTimer: null,
        careCelebrationTimer: null,
        careReactionTimer: null,
        careTasksAll: [],
        careOccurrences: [],
        careAutoEnsured: false,
        careCadenceNormalized: false,
        lastCleaningClick: {
            type: null,
            id: null,
            at: 0
        },
        changingLevelSessionId: null
    };
    Object.assign(App, modules.core || {}, modules.render || {}, modules.care || {}, modules.session || {}, modules.events || {}, modules.helpers || {}, modules.companion || {});
    if (typeof App.init !== "function") {
        console.error("HomeOS Cleaning modules did not load correctly.");
        return;
    }
    await App.init();
});
