/* ============================================================
   HOMEOS // PERMISSIONS

   Small role helpers for the current household session.
============================================================ */

(function createHomeOSPermissions() {
    "use strict";

    window.HomeOS = window.HomeOS || {};

    // Return the signed-in household role from the shared session.
    function role() {
        return window.HomeOS.session?.getState?.().role || null;
    }

    // Check whether the current household member is the owner.
    function isOwner() {
        return role() === "owner";
    }

    // Owners and admins can manage shared household settings.
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
