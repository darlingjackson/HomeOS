/* ============================================================
   HOMEOS // SEASONAL SERVICE

   Seasonal resets, tasks, rooms, zones and shopping data.
============================================================ */

(function createHomeOSSeasonalService() {
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

    function currentHouseholdId() {
        return window.HomeOS.session?.getState?.().household?.id || null;
    }

    function resolveHouseholdId(requestedId = null) {
        const activeId = currentHouseholdId();

        if (!activeId) {
            return {
                householdId: null,
                error: new Error(
                    "HomeOS household context is required for Seasonal Care."
                )
            };
        }

        if (requestedId && String(requestedId) !== String(activeId)) {
            return {
                householdId: null,
                error: new Error(
                    "Seasonal Care household does not match the signed-in household."
                )
            };
        }

        return {
            householdId: activeId,
            error: null
        };
    }

    async function ensureReset(season, year) {
        const { data, error } = await client().rpc(
            "homeos_ensure_seasonal_reset",
            {
                p_season: season,
                p_year: year
            }
        );

        return {
            resetId: data || null,
            error
        };
    }

    async function load(householdId, season, year) {
        const resolved = resolveHouseholdId(householdId);

        if (resolved.error) {
            return {
                data: null,
                error: resolved.error
            };
        }

        householdId = resolved.householdId;

        const ensured = await ensureReset(season, year);

        if (ensured.error) {
            return {
                data: null,
                error: ensured.error
            };
        }

        const [
            reset,
            seasonalTasks,
            rooms,
            zones,
            levels,
            shopping
        ] = await Promise.all([
            client()
                .from("seasonal_resets")
                .select("*")
                .eq("household_id", householdId)
                .eq("id", ensured.resetId)
                .single(),

            client()
                .from("seasonal_reset_tasks")
                .select("*")
                .eq("household_id", householdId)
                .eq("seasonal_reset_id", ensured.resetId)
                .order("sort_order", { ascending: true }),

            client()
                .from("rooms")
                .select("*")
                .eq("household_id", householdId)
                .eq("active", true)
                .order("sort_order", { ascending: true })
                .order("name", { ascending: true }),

            client()
                .from("zones")
                .select("*")
                .eq("household_id", householdId)
                .eq("active", true)
                .order("sort_order", { ascending: true })
                .order("name", { ascending: true }),

            client()
                .from("home_levels")
                .select("*")
                .eq("household_id", householdId)
                .eq("active", true)
                .order("sort_order", { ascending: true })
                .order("name", { ascending: true }),

            client()
                .from("shopping_list")
                .select("*")
                .eq("household_id", householdId)
                .eq("completed", false)
                .eq("source_type", `seasonal:${season}:${year}`)
                .order("created_at", { ascending: false })
        ]);

        const firstError =
            [reset, seasonalTasks, rooms, zones, levels, shopping].find(
                result => result.error
            )?.error || null;

        if (firstError) {
            return {
                data: null,
                error: firstError
            };
        }

        const taskIds = (seasonalTasks.data || [])
            .map(task => task.task_id)
            .filter(Boolean);

        let universal = [];

        if (taskIds.length) {
            const result = await client()
                .from("tasks")
                .select(`
                    id,
                    details,
                    source_type,
                    source_record_id,
                    assignment_mode,
                    active
                `)
                .eq("household_id", householdId)
                .in("id", taskIds);

            if (result.error) {
                return {
                    data: null,
                    error: result.error
                };
            }

            universal = result.data || [];
        }

        const universalMap = new Map(
            universal.map(item => [item.id, item])
        );

        return {
            data: {
                reset: reset.data,
                tasks: (seasonalTasks.data || []).map(task => ({
                    ...task,
                    universalTask:
                        universalMap.get(task.task_id) || null
                })),
                rooms: rooms.data || [],
                zones: zones.data || [],
                levels: levels.data || [],
                shopping: shopping.data || []
            },
            error: null
        };
    }

    async function begin(resetId) {
        const { data, error } = await client().rpc(
            "homeos_begin_seasonal_reset",
            {
                p_seasonal_reset_id: resetId
            }
        );

        return { data, error };
    }

    async function setTask(resetTaskId, done) {
        const { data, error } = await client().rpc(
            "homeos_set_seasonal_task",
            {
                p_seasonal_reset_task_id: resetTaskId,
                p_done: Boolean(done)
            }
        );

        return { data, error };
    }

    async function addTask({
        resetId,
        title,
        roomId = null,
        zoneId = null,
        placement = "custom",
        seasonName = null
    }) {
        const resolved = resolveHouseholdId();

        if (resolved.error) {
            return {
                resetTaskId: null,
                error: resolved.error,
                placementError: null
            };
        }

        const titleValue = String(title || "").trim();

        if (!titleValue) {
            return {
                resetTaskId: null,
                error: new Error("Give this Seasonal task a name."),
                placementError: null
            };
        }

        const { data, error } = await client().rpc(
            "homeos_add_seasonal_task",
            {
                p_seasonal_reset_id: resetId,
                p_title: titleValue,
                p_room_id: roomId,
                p_zone_id: zoneId
            }
        );

        if (error || !data || placement === "custom") {
            return {
                resetTaskId: data || null,
                error,
                placementError: null
            };
        }

        const link = await client()
            .from("seasonal_reset_tasks")
            .select("task_id")
            .eq("household_id", resolved.householdId)
            .eq("id", data)
            .single();

        if (link.error || !link.data?.task_id) {
            const placementError =
                link.error ||
                new Error(
                    "HomeOS could not resolve the new Seasonal task."
                );
            const rollback = await removeTask(data);

            return {
                resetTaskId: rollback.error ? data : null,
                error: rollback.error || placementError,
                placementError
            };
        }

        let placementValues;

        if (placement === "core") {
            placementValues = {
                details: "CORE DEEP RESET",
                source_type: "seasonal_custom_core"
            };
        } else if (placement === "declutter") {
            placementValues = {
                details: "DECLUTTER & EDIT",
                source_type: "seasonal_declutter"
            };
        } else {
            placementValues = {
                details: `${String(
                    seasonName || "SEASONAL"
                ).toUpperCase()} LAYER`,
                source_type: "seasonal_custom_layer"
            };
        }

        const placed = await client()
            .from("tasks")
            .update(placementValues)
            .eq("household_id", resolved.householdId)
            .eq("id", link.data.task_id);

        if (placed.error) {
            const rollback = await removeTask(data);

            return {
                resetTaskId: rollback.error ? data : null,
                error: rollback.error || placed.error,
                placementError: placed.error
            };
        }

        return {
            resetTaskId: data,
            error: null,
            placementError: null
        };
    }

    async function removeTask(resetTaskId) {
        const { data, error } = await client().rpc(
            "homeos_remove_seasonal_task",
            {
                p_seasonal_reset_task_id: resetTaskId
            }
        );

        if (error) {
            return {
                removed: false,
                error
            };
        }

        if (!data) {
            return {
                removed: false,
                error: new Error(
                    "That Seasonal task could not be removed."
                )
            };
        }

        return {
            removed: true,
            error: null
        };
    }

    async function complete(resetId) {
        const { data, error } = await client().rpc(
            "homeos_complete_seasonal_reset",
            {
                p_seasonal_reset_id: resetId
            }
        );

        return { data, error };
    }

    async function addShopping(
        householdId,
        season,
        year,
        name,
        quantity,
        scope
    ) {
        const resolved = resolveHouseholdId(householdId);

        if (resolved.error) {
            return {
                data: null,
                error: resolved.error
            };
        }

        const itemName = String(name || "").trim();

        if (!itemName) {
            return {
                data: null,
                error: new Error("Type a shopping item first.")
            };
        }

        const { data, error } = await client()
            .from("shopping_list")
            .insert({
                household_id: resolved.householdId,
                name: itemName,
                quantity: Math.max(1, Number(quantity) || 1),
                category: scope || "Seasonal Home",
                source_type: `seasonal:${season}:${year}`,
                completed: false,
                created_by:
                    window.HomeOS.session.getState()?.user?.id || null
            })
            .select("*")
            .single();

        return { data, error };
    }

    async function removeShopping(householdId, shoppingId) {
        const resolved = resolveHouseholdId(householdId);

        if (resolved.error) {
            return { error: resolved.error };
        }

        const { data, error } = await client()
            .from("shopping_list")
            .delete()
            .eq("household_id", resolved.householdId)
            .eq("id", shoppingId)
            .select("id")
            .maybeSingle();

        if (error) {
            return { error };
        }

        if (!data?.id) {
            return {
                error: new Error(
                    "That Seasonal shopping item could not be removed."
                )
            };
        }

        return { error: null };
    }

    window.HomeOS.services.seasonal = {
        ensureReset,
        load,
        begin,
        setTask,
        addTask,
        removeTask,
        complete,
        addShopping,
        removeShopping
    };
})();
