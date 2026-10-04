/* ============================================================
   HOMEOS // PEOPLE SERVICE

   Household invitations and Kids Mode access settings.
============================================================ */

(function createHomeOSPeopleService() {
    "use strict";

    window.HomeOS = window.HomeOS || {};
    window.HomeOS.services = window.HomeOS.services || {};

    function client() {
        const supabase = window.HomeOS.supabase;

        if (!supabase) {
            throw new Error("HomeOS Supabase client is not ready.");
        }

        return supabase;
    }

    async function acceptInvite(token) {
        const normalized = String(token || "").trim();

        if (!normalized) {
            return {
                householdId: null,
                error: new Error("A HomeOS invitation code is required.")
            };
        }

        const { data, error } = await client().rpc("homeos_accept_invite", {
            p_token: normalized
        });

        return {
            householdId: data || null,
            error
        };
    }

    async function getKidsAdminState() {
        const { data, error } = await client().rpc(
            "homeos_get_kid_admin_state"
        );

        return {
            data: data || null,
            error
        };
    }

    async function setKidAccess({ personId, enabled, theme, pin }) {
        const { data, error } = await client().rpc("homeos_set_kid_access", {
            p_family_member_id: personId,
            p_enabled: Boolean(enabled),
            p_theme: theme || "girl",
            p_pin: String(pin || "").trim() || null
        });

        return {
            data: data || null,
            error
        };
    }

    async function saveAndVerifyKidAccess({
        personId,
        enabled,
        theme,
        pin
    }) {
        const saveResult = await setKidAccess({
            personId,
            enabled,
            theme,
            pin
        });

        if (saveResult.error) {
            return {
                data: null,
                profile: null,
                adminState: null,
                error: saveResult.error
            };
        }

        const stateResult = await getKidsAdminState();

        if (stateResult.error) {
            return {
                data: saveResult.data,
                profile: null,
                adminState: null,
                error: stateResult.error
            };
        }

        const profile =
            (stateResult.data?.profiles || []).find(
                item =>
                    String(item.family_member_id) === String(personId)
            ) || null;

        if (!profile) {
            return {
                data: saveResult.data,
                profile: null,
                adminState: stateResult.data,
                error: new Error(
                    "Kids Mode could not be verified after saving. Please try again."
                )
            };
        }

        if (Boolean(profile.enabled) !== Boolean(enabled)) {
            return {
                data: saveResult.data,
                profile,
                adminState: stateResult.data,
                error: new Error(
                    "Kids Mode saved, but the enabled setting could not be verified."
                )
            };
        }

        const expectedTheme = String(theme || "girl");
        const savedTheme = String(profile.theme || "girl");

        if (savedTheme !== expectedTheme) {
            return {
                data: saveResult.data,
                profile,
                adminState: stateResult.data,
                error: new Error(
                    "Kids Mode saved, but the selected theme could not be verified."
                )
            };
        }

        if (enabled && !profile.pin_set) {
            return {
                data: saveResult.data,
                profile,
                adminState: stateResult.data,
                error: new Error(
                    "Kids Mode was enabled, but the PIN could not be verified."
                )
            };
        }

        return {
            data: saveResult.data,
            profile,
            adminState: stateResult.data,
            error: null
        };
    }

    window.HomeOS.services.people = {
        acceptInvite,
        getKidsAdminState,
        setKidAccess,
        saveAndVerifyKidAccess
    };
})();
