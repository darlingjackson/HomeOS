/* ============================================================
   HOMEOS // LAUNDRY SERVICE

   Laundry areas, active loads, timers and history.
============================================================ */

(function createHomeOSLaundryService() {
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

    async function load(householdId) {
        const [areas, loads, people] = await Promise.all([
            client()
                .from("laundry_areas")
                .select("*")
                .eq("household_id", householdId)
                .eq("active", true)
                .order("sort_order")
                .order("name"),

            client()
                .from("laundry_loads")
                .select("*")
                .eq("household_id", householdId)
                .order("created_at", { ascending: false })
                .limit(500),

            client()
                .from("family_members")
                .select(
                    "id,household_id,display_name,member_type,relationship_label,auth_user_id,can_be_assigned,active,color,sort_order"
                )
                .eq("household_id", householdId)
                .eq("active", true)
                .order("sort_order")
                .order("display_name")
        ]);

        const error = [areas, loads, people].find(result => result.error)?.error || null;

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                areas: areas.data || [],
                loads: loads.data || [],
                people: people.data || []
            },
            error: null
        };
    }

    async function startLoad({
        name,
        laundryAreaId = null,
        assignedFamilyMemberId = null,
        categoryKey = null,
        laundrySystem = "color",
        washMinutes = 45,
        dryMinutes = 60
    }) {
        const { data: loadId, error } = await client().rpc(
            "homeos_start_laundry_load",
            {
                p_name: name,
                p_laundry_area_id: laundryAreaId,
                p_assigned_family_member_id: assignedFamilyMemberId,
                p_schedule_task_id: null
            }
        );

        if (error || !loadId) {
            return { data: null, error };
        }

        const now = new Date();
        const safeWash = Math.max(1, Number(washMinutes) || 45);
        const safeDry = Math.max(1, Number(dryMinutes) || 60);
        const timerEnds = new Date(
            now.getTime() + safeWash * 60000
        ).toISOString();

        const current = await client()
            .from("laundry_loads")
            .select("*")
            .eq("id", loadId)
            .single();

        if (current.error) {
            return { data: null, error: current.error };
        }

        const metadata = {
            ...(current.data?.metadata || {}),
            source: "laundry_v1",
            stage_updated_at: now.toISOString(),
            timer_ends_at: timerEnds,
            wash_minutes: safeWash,
            dry_minutes: safeDry,
            category_key: categoryKey || null,
            laundry_system: laundrySystem || "color"
        };

        const updated = await client()
            .from("laundry_loads")
            .update({ metadata })
            .eq("id", loadId)
            .select("*")
            .single();

        return {
            data: updated.data || current.data,
            error: updated.error || null
        };
    }

    async function markCategoryCompleted({
        name,
        laundryAreaId = null,
        assignedFamilyMemberId = null,
        categoryKey = null,
        laundrySystem = "color"
    }) {
        const started = await startLoad({
            name,
            laundryAreaId,
            assignedFamilyMemberId,
            categoryKey,
            laundrySystem,
            washMinutes: 1,
            dryMinutes: 1
        });

        if (started.error || !started.data?.id) {
            return started;
        }

        const loadId = started.data.id;
        let row = started.data;
        let guard = 0;

        while (row?.stage !== "complete" && guard < 6) {
            const moved = await client().rpc("homeos_advance_laundry_load", {
                p_load_id: loadId
            });

            if (moved.error) {
                return { data: null, error: moved.error };
            }

            const current = await client()
                .from("laundry_loads")
                .select("*")
                .eq("id", loadId)
                .single();

            if (current.error) {
                return { data: null, error: current.error };
            }

            row = current.data;
            guard += 1;
        }

        const metadata = {
            ...(row?.metadata || {}),
            source: "laundry_v2_quick_checkoff",
            quick_checkoff: true,
            category_key: categoryKey || row?.metadata?.category_key || null,
            laundry_system:
                laundrySystem || row?.metadata?.laundry_system || "color",
            stage_updated_at: new Date().toISOString()
        };

        delete metadata.timer_ends_at;

        const updated = await client()
            .from("laundry_loads")
            .update({ metadata })
            .eq("id", loadId)
            .select("*")
            .single();

        return {
            data: updated.data || row,
            error: updated.error || null
        };
    }

    async function advanceLoad(loadId) {
        const advanced = await client().rpc("homeos_advance_laundry_load", {
            p_load_id: loadId
        });

        if (advanced.error) {
            return { data: null, error: advanced.error };
        }

        const current = await client()
            .from("laundry_loads")
            .select("*")
            .eq("id", loadId)
            .single();

        if (current.error) {
            return { data: null, error: current.error };
        }

        const now = new Date();
        const row = current.data;
        const metadata = {
            ...(row.metadata || {}),
            stage_updated_at: now.toISOString()
        };

        if (row.stage === "drying") {
            const dryMinutes = Math.max(
                1,
                Number(metadata.dry_minutes) || 60
            );

            metadata.timer_ends_at = new Date(
                now.getTime() + dryMinutes * 60000
            ).toISOString();
        } else {
            delete metadata.timer_ends_at;
        }

        const updated = await client()
            .from("laundry_loads")
            .update({ metadata })
            .eq("id", loadId)
            .select("*")
            .single();

        return {
            data: updated.data || row,
            error: updated.error || null
        };
    }

    async function extendTimer(loadId, minutes) {
        const current = await client()
            .from("laundry_loads")
            .select("*")
            .eq("id", loadId)
            .single();

        if (current.error) {
            return { data: null, error: current.error };
        }

        const row = current.data;
        const metadata = { ...(row.metadata || {}) };
        const base = metadata.timer_ends_at
            ? new Date(metadata.timer_ends_at)
            : new Date();

        const safeBase = Number.isNaN(base.getTime()) ? new Date() : base;

        metadata.timer_ends_at = new Date(
            safeBase.getTime() + (Number(minutes) || 0) * 60000
        ).toISOString();

        const updated = await client()
            .from("laundry_loads")
            .update({ metadata })
            .eq("id", loadId)
            .select("*")
            .single();

        return {
            data: updated.data,
            error: updated.error || null
        };
    }

    async function removeLoad(householdId, loadId) {
        const { error } = await client()
            .from("laundry_loads")
            .delete()
            .eq("household_id", householdId)
            .eq("id", loadId)
            .neq("stage", "complete");

        return { error };
    }

    window.HomeOS.services.laundry = {
        load,
        startLoad,
        markCategoryCompleted,
        advanceLoad,
        extendTimer,
        removeLoad
    };
})();
