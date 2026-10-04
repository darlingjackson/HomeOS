/* ============================================================
   HOMEOS // SEASONAL SERVICE

   Seasonal task, zone and shopping data access.
============================================================ */

(function createSeasonalService() {
    "use strict";
    window.HomeOS =
        window.HomeOS ||
            {};
    window.HomeOS.services =
        window.HomeOS.services ||
            {};
    function db() {
        if (!window.HomeOS
            .supabase) {
            throw new Error("HomeOS Supabase client is not ready.");
        }
        return window.HomeOS.supabase;
    }
    async function ensureReset(season, year) {
        const { data, error } = await db()
            .rpc("homeos_ensure_seasonal_reset", {
            p_season: season,
            p_year: year
        });
        return {
            resetId: data ||
                null,
            error
        };
    }
    async function load(householdId, season, year) {
        const ensured = await ensureReset(season, year);
        if (ensured.error) {
            return {
                data: null,
                error: ensured.error
            };
        }
        const [reset, seasonalTasks, rooms, zones, levels, shopping] = await Promise.all([
            db()
                .from("seasonal_resets")
                .select("*")
                .eq("household_id", householdId)
                .eq("id", ensured.resetId)
                .single(),
            db()
                .from("seasonal_reset_tasks")
                .select("*")
                .eq("household_id", householdId)
                .eq("seasonal_reset_id", ensured.resetId)
                .order("sort_order", {
                ascending: true
            }),
            db()
                .from("rooms")
                .select("*")
                .eq("household_id", householdId)
                .eq("active", true)
                .order("sort_order", {
                ascending: true
            })
                .order("name", {
                ascending: true
            }),
            db()
                .from("zones")
                .select("*")
                .eq("household_id", householdId)
                .eq("active", true)
                .order("sort_order", {
                ascending: true
            })
                .order("name", {
                ascending: true
            }),
            db()
                .from("home_levels")
                .select("*")
                .eq("household_id", householdId)
                .eq("active", true)
                .order("sort_order", {
                ascending: true
            })
                .order("name", {
                ascending: true
            }),
            db()
                .from("shopping_list")
                .select("*")
                .eq("household_id", householdId)
                .eq("completed", false)
                .eq("source_type", `seasonal:${season}:${year}`)
                .order("created_at", {
                ascending: false
            })
        ]);
        const firstError = [
            reset,
            seasonalTasks,
            rooms,
            zones,
            levels,
            shopping
        ]
            .find(result => result.error)
            ?.error ||
            null;
        if (firstError) {
            return {
                data: null,
                error: firstError
            };
        }
        const taskIds = (seasonalTasks.data ||
            [])
            .map(task => task.task_id)
            .filter(Boolean);
        let universal = [];
        if (taskIds.length) {
            const result = await db()
                .from("tasks")
                .select(`
                        id,
                        details,
                        source_type,
                        source_record_id,
                        assignment_mode,
                        active
                    `)
                .in("id", taskIds);
            if (result.error) {
                return {
                    data: null,
                    error: result.error
                };
            }
            universal =
                result.data ||
                    [];
        }
        const universalMap = new Map(universal
            .map(item => [
            item.id,
            item
        ]));
        return {
            data: {
                reset: reset.data,
                tasks: (seasonalTasks.data ||
                    [])
                    .map(task => ({
                    ...task,
                    universalTask: universalMap
                        .get(task.task_id) ||
                        null
                })),
                rooms: rooms.data ||
                    [],
                zones: zones.data ||
                    [],
                levels: levels.data ||
                    [],
                shopping: shopping.data ||
                    []
            },
            error: null
        };
    }
    async function begin(resetId) {
        const { data, error } = await db()
            .rpc("homeos_begin_seasonal_reset", {
            p_seasonal_reset_id: resetId
        });
        return {
            data,
            error
        };
    }
    async function setTask(resetTaskId, done) {
        const { data, error } = await db()
            .rpc("homeos_set_seasonal_task", {
            p_seasonal_reset_task_id: resetTaskId,
            p_done: Boolean(done)
        });
        return {
            data,
            error
        };
    }
    async function addTask({ resetId, title, roomId = null, zoneId = null, placement = "custom", seasonName = null }) {
        const { data, error } = await db()
            .rpc("homeos_add_seasonal_task", {
            p_seasonal_reset_id: resetId,
            p_title: title,
            p_room_id: roomId,
            p_zone_id: zoneId
        });
        if (error ||
            !data ||
            placement ===
                "custom") {
            return {
                resetTaskId: data ||
                    null,
                error,
                placementError: null
            };
        }
        const link = await db()
            .from("seasonal_reset_tasks")
            .select("task_id")
            .eq("id", data)
            .single();
        if (link.error ||
            !link.data
                ?.task_id) {
            return {
                resetTaskId: data,
                error: null,
                placementError: link.error ||
                    new Error("HomeOS could not resolve the new Seasonal task.")
            };
        }
        const placementValues = placement ===
            "core"
            ? {
                details: "CORE DEEP RESET",
                source_type: "seasonal_custom_core"
            }
            : placement ===
                "declutter"
                ? {
                    details: "DECLUTTER & EDIT",
                    source_type: "seasonal_declutter"
                }
                : {
                    details: `${String(seasonName ||
                        "SEASONAL").toUpperCase()} LAYER`,
                    source_type: "seasonal_custom_layer"
                };
        const placed = await db()
            .from("tasks")
            .update(placementValues)
            .eq("id", link.data.task_id);
        return {
            resetTaskId: data,
            error: null,
            placementError: placed.error ||
                null
        };
    }
    async function removeTask(resetTaskId) {
        const { data, error } = await db()
            .rpc("homeos_remove_seasonal_task", {
            p_seasonal_reset_task_id: resetTaskId
        });
        return {
            removed: Boolean(data),
            error
        };
    }
    async function complete(resetId) {
        const { data, error } = await db()
            .rpc("homeos_complete_seasonal_reset", {
            p_seasonal_reset_id: resetId
        });
        return {
            data,
            error
        };
    }
    async function addShopping(householdId, season, year, name, quantity, scope) {
        const { data, error } = await db()
            .from("shopping_list")
            .insert({
            household_id: householdId,
            name: String(name ||
                "")
                .trim(),
            quantity: Math.max(1, Number(quantity) ||
                1),
            category: scope ||
                "Seasonal Home",
            source_type: `seasonal:${season}:${year}`,
            completed: false,
            created_by: window.HomeOS
                .session
                .getState()
                ?.user
                ?.id ||
                null
        })
            .select("*")
            .single();
        return {
            data,
            error
        };
    }
    async function removeShopping(householdId, shoppingId) {
        const { error } = await db()
            .from("shopping_list")
            .delete()
            .eq("household_id", householdId)
            .eq("id", shoppingId);
        return {
            error
        };
    }
    window.HomeOS.services
        .seasonal = {
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
