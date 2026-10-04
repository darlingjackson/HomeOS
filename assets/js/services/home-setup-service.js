/* ============================================================
   HOMEOS // HOME SETUP SERVICE

   Home Setup data used after onboarding.
============================================================ */

(function createHomeOSHomeSetupService() {
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
    // --- Onboarding Laundry Readback ---
    async function getSetup(householdId) {
        if (!householdId) {
            return {
                data: { laundry: [] },
                error: new Error("HomeOS household is required for home setup.")
            };
        }
        const { data, error } = await client()
            .from("laundry_areas")
            .select("*")
            .eq("household_id", householdId)
            .order("sort_order", { ascending: true });
        return {
            data: {
                laundry: data || []
            },
            error
        };
    }
    // --- Onboarding Laundry Profile Sync ---
    async function upsertLaundryArea({ householdId, id, roomId, name, areaType, hasWasher, hasDryer, laundrySystem, washMinutes, dryMinutes, customCategories, sortOrder, active }) {
        if (!householdId || !id) {
            return {
                data: null,
                error: new Error("A saved laundry area is required before syncing setup.")
            };
        }
        const record = {
            household_id: householdId,
            room_id: roomId || null,
            name: String(name || "Laundry Area").trim() || "Laundry Area",
            area_type: areaType || "washer_dryer",
            has_washer: Boolean(hasWasher),
            has_dryer: Boolean(hasDryer),
            laundry_system: laundrySystem || "color",
            wash_minutes: Math.max(1, Number(washMinutes) || 45),
            dry_minutes: Math.max(1, Number(dryMinutes) || 60),
            custom_categories: Array.isArray(customCategories)
                ? customCategories
                : [],
            sort_order: Number(sortOrder) || 0,
            active: active !== false
        };
        const { data, error } = await client()
            .from("laundry_areas")
            .update(record)
            .eq("id", id)
            .eq("household_id", householdId)
            .select("*")
            .single();
        return {
            data: data || null,
            error
        };
    }
    // --- Public Service Api ---
    window.HomeOS.services.homeSetup = {
        getSetup,
        upsertLaundryArea
    };
})();
