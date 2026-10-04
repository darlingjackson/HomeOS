/* ============================================================
   HOMEOS // PERMISSIONS

   Small role helpers for the current household.
============================================================ */

(function createHomeOSPermissions() {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    function role() {
        return window.HomeOS.session?.getState?.().role || null;
    }
    function isOwner() {
        return role() === "owner";
    }
    function isAdmin() {
        const currentRole = role();
        return currentRole === "owner" || currentRole === "admin";
    }
    window.HomeOS.permissions = {
        role,
        isOwner,
        isAdmin
    };
})();
