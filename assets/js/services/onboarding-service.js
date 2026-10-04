/* ============================================================
   HOMEOS // ONBOARDING SERVICE

   Onboarding draft, load and completion calls.
============================================================ */

(function createHomeOSOnboardingService() {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    window.HomeOS.services = window.HomeOS.services || {};
    // --- Supabase Client ---
    function client() {
        const supabase = window.HomeOS.supabase;
        if (!supabase) {
            throw new Error("HomeOS Supabase client is not ready.");
        }
        return supabase;
    }
    // --- Load / Create Setup Context ---
    async function getState() {
        const { data, error } = await client().rpc("homeos_get_onboarding_state");
        return { data, error };
    }
    async function createHousehold({ name, homeType, tagline }) {
        const { data, error } = await client().rpc("homeos_create_household", {
            p_name: name,
            p_home_type: homeType || null,
            p_tagline: tagline || null
        });
        return {
            householdId: data || null,
            error
        };
    }
    // --- Draft Persistence ---
    async function saveDraft({ currentStep, completedSteps, draft }) {
        const { data, error } = await client().rpc("homeos_save_onboarding_draft", {
            p_current_step: currentStep,
            p_completed_steps: completedSteps,
            p_draft: draft
        });
        return { data, error };
    }
    // --- Commit / Rebuild Control ---
    async function complete(draft) {
        const { data, error } = await client().rpc("homeos_commit_onboarding", {
            p_draft: draft
        });
        return {
            householdId: data || null,
            error
        };
    }
    async function cancelHomeRebuild() {
        const { data, error } = await client().rpc("homeos_cancel_home_layout_restart");
        return { data, error };
    }
    // --- Public Service Api ---
    window.HomeOS.services.onboarding = {
        getState,
        createHousehold,
        saveDraft,
        complete,
        cancelHomeRebuild
    };
})();
