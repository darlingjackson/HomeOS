/* ============================================================
   HOMEOS // CLEANING SERVICE

   Cleaning data access and session storage.
============================================================ */

(function createCleaningService() {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    window.HomeOS.services = window.HomeOS.services || {};
    function db() {
        if (!window.HomeOS.supabase) {
            throw new Error("HomeOS Supabase client is not ready.");
        }
        return window.HomeOS.supabase;
    }
    async function list(table, householdId, orderBy = "sort_order") {
        let query = db()
            .from(table)
            .select("*")
            .eq("household_id", householdId);
        if (orderBy) {
            query =
                query.order(orderBy, {
                    ascending: true
                });
        }
        const { data, error } = await query;
        return {
            data: data || [],
            error
        };
    }
    async function getSessions(householdId) {
        const { data, error } = await db()
            .from("cleaning_sessions")
            .select("*")
            .eq("household_id", householdId)
            .order("started_at", {
            ascending: false
        })
            .limit(500);
        return {
            data: data || [],
            error
        };
    }
    async function getSessionTasks(sessionIds) {
        const ids = Array.isArray(sessionIds)
            ? sessionIds.filter(Boolean)
            : [];
        if (!ids.length) {
            return {
                data: [],
                error: null
            };
        }
        const { data, error } = await db()
            .from("cleaning_session_tasks")
            .select("*")
            .in("session_id", ids)
            .order("sort_order", {
            ascending: true
        });
        return {
            data: data || [],
            error
        };
    }
    async function load(householdId) {
        const [levels, rooms, zones, sessions, laundryAreas, features] = await Promise.all([
            list("home_levels", householdId),
            list("rooms", householdId),
            list("zones", householdId),
            getSessions(householdId),
            list("laundry_areas", householdId),
            list("household_features", householdId, "name")
        ]);
        const error = [
            levels,
            rooms,
            zones,
            sessions,
            laundryAreas,
            features
        ]
            .find(result => result.error)
            ?.error ||
            null;
        if (error) {
            return {
                data: null,
                error
            };
        }
        const openIds = sessions.data
            .filter(session => [
            "active",
            "paused"
        ]
            .includes(session.status))
            .map(session => session.id);
        const taskResult = await getSessionTasks(openIds);
        if (taskResult.error) {
            return {
                data: null,
                error: taskResult.error
            };
        }
        const bySession = taskResult.data
            .reduce((grouped, task) => {
            grouped[task.session_id] =
                grouped[task.session_id] ||
                    [];
            grouped[task.session_id]
                .push(task);
            return grouped;
        }, {});
        return {
            data: {
                levels: levels.data.filter(item => item.active !==
                    false),
                rooms: rooms.data.filter(item => item.active !==
                    false),
                zones: zones.data.filter(item => item.active !==
                    false),
                sessions: sessions.data.map(session => ({
                    ...session,
                    tasks: bySession[session.id] ||
                        []
                })),
                laundryAreas: laundryAreas.data.filter(item => item.active !==
                    false),
                features: features.data.filter(item => item.enabled !==
                    false)
            },
            error: null
        };
    }
    async function startSession({ targetType, targetId, level, pauseSessionId = null }) {
        const { data, error } = await db()
            .rpc("homeos_start_cleaning_session", {
            p_target_type: targetType,
            p_target_id: targetId,
            p_cleaning_level: level,
            p_pause_session_id: pauseSessionId
        });
        return {
            sessionId: data ||
                null,
            error
        };
    }
    async function setTask({ sessionTaskId, done, familyMemberId = null }) {
        const { data, error } = await db()
            .rpc("homeos_set_cleaning_session_task", {
            p_session_task_id: sessionTaskId,
            p_done: Boolean(done),
            p_family_member_id: familyMemberId
        });
        return {
            data,
            error
        };
    }
    async function addTask({ sessionId, title, roomId = null }) {
        const { data, error } = await db()
            .rpc("homeos_add_cleaning_session_task", {
            p_session_id: sessionId,
            p_title: title,
            p_room_id: roomId
        });
        return {
            sessionTaskId: data ||
                null,
            error
        };
    }
    async function removeTask(sessionTaskId) {
        const { data, error } = await db()
            .rpc("homeos_remove_cleaning_session_task", {
            p_session_task_id: sessionTaskId
        });
        return {
            removed: Boolean(data),
            error
        };
    }
    async function setSessionStatus(sessionId, status) {
        const { data, error } = await db()
            .rpc("homeos_set_cleaning_session_status", {
            p_session_id: sessionId,
            p_status: status
        });
        return {
            status: data ||
                null,
            error
        };
    }
    async function changeLevel(sessionId, level) {
        const { data, error } = await db()
            .rpc("homeos_change_cleaning_session_level", {
            p_session_id: sessionId,
            p_cleaning_level: level
        });
        return {
            sessionId: data ||
                null,
            error
        };
    }
    async function finishSession(sessionId, completeRemaining = false) {
        const { data, error } = await db()
            .rpc("homeos_finish_cleaning_session", {
            p_session_id: sessionId,
            p_complete_remaining: Boolean(completeRemaining)
        });
        return {
            data,
            error
        };
    }
    async function completeSession(sessionId) {
        return finishSession(sessionId, false);
    }
    window.HomeOS.services.cleaning = {
        load,
        startSession,
        setTask,
        addTask,
        removeTask,
        setSessionStatus,
        changeLevel,
        finishSession,
        completeSession
    };
})();
