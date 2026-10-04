/* ============================================================
   HOMEOS // KIDS SERVICE

   Kids Mode access, profiles, missions and completion data.
============================================================ */

(function createHomeOSKidsService() {
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

    function normalizeTasks(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.tasks)) return data.tasks;
        return [];
    }

    function taskKey(task) {
        return String(
            task?.occurrence_id ||
            `${task?.task_engine || "kid"}:${task?.task_id || ""}:${task?.title || ""}`
        );
    }

    function rpcMissing(error, functionName) {
        const message = String(error?.message || "").toLowerCase();

        return (
            message.includes(functionName.toLowerCase()) ||
            message.includes("could not find the function")
        );
    }

    async function lockAdultSession() {
        return { error: null };
    }

    async function getAdultPortalState() {
        const { data: authData } = await client().auth.getSession();

        if (!authData?.session) {
            return { data: null, error: null };
        }

        const { data, error } = await client().rpc("homeos_get_kid_admin_state");
        return { data: data || null, error };
    }

    async function getAdultAuthSession() {
        const { data, error } = await client().auth.getSession();
        return { data: data?.session || null, error };
    }

    async function listProfiles(portalToken) {
        const { data, error } = await client().rpc("homeos_kid_portal_profiles", {
            p_portal_token: portalToken
        });

        return { data: data || null, error };
    }

    async function login(portalToken, personId, pin) {
        const { data, error } = await client().rpc("homeos_kid_login", {
            p_portal_token: portalToken,
            p_family_member_id: personId,
            p_pin: String(pin || "")
        });

        return { data: data || null, error };
    }

    async function getSession(sessionToken) {
        const { data, error } = await client().rpc("homeos_kid_get_session", {
            p_session_token: sessionToken
        });

        return { data: data || null, error };
    }

    async function getTaskVisuals(taskIds = []) {
        const ids = [...new Set((taskIds || []).filter(Boolean))];

        if (!ids.length) {
            return new Map();
        }

        try {
            const { data, error } = await client()
                .from("kid_task_visuals")
                .select("task_id,image_url,alt_text")
                .in("task_id", ids);

            if (error) {
                console.warn("[HomeOS] Kid mission pictures are not available.", error);
                return new Map();
            }

            return new Map(
                (data || []).map(row => [String(row.task_id), row])
            );
        } catch (error) {
            console.warn("[HomeOS] Kid mission pictures could not load.", error);
            return new Map();
        }
    }

    async function loadAssignedTasks(sessionToken, dateKey) {
        let result = await client().rpc("homeos_kid_assigned_tasks_v3", {
            p_session_token: sessionToken,
            p_on_date: dateKey
        });

        if (result.error && rpcMissing(result.error, "homeos_kid_assigned_tasks_v3")) {
            result = await client().rpc("homeos_kid_assigned_tasks_v2", {
                p_session_token: sessionToken,
                p_on_date: dateKey
            });
        }

        if (result.error && rpcMissing(result.error, "homeos_kid_assigned_tasks_v2")) {
            result = await client().rpc("homeos_kid_assigned_tasks", {
                p_session_token: sessionToken,
                p_on_date: dateKey
            });
        }

        return result;
    }

    async function getTasks(sessionToken, dateKey) {
        const primary = await client().rpc("homeos_kid_tasks", {
            p_session_token: sessionToken,
            p_on_date: dateKey
        });

        let assigned;

        try {
            assigned = await loadAssignedTasks(sessionToken, dateKey);
        } catch (error) {
            assigned = { data: null, error };
        }

        const primaryTasks = primary.error ? [] : normalizeTasks(primary.data);
        const assignedTasks = assigned.error ? [] : normalizeTasks(assigned.data);

        if (primary.error) {
            console.warn(
                "[HomeOS] Automatic child missions could not load; manual assignments will still be shown when available.",
                primary.error
            );
        }

        if (assigned.error) {
            console.warn(
                "[HomeOS] Manual child assignments could not sync into Kids Mode.",
                assigned.error
            );
        }

        if (primary.error && assigned.error) {
            return { data: null, error: primary.error || assigned.error };
        }

        const unique = new Map();

        [...primaryTasks, ...assignedTasks].forEach(task => {
            const normalized = {
                ...task,
                task_engine: task?.task_engine || "kid"
            };

            unique.set(taskKey(normalized), normalized);
        });

        const byMission = new Map();

        Array.from(unique.values()).forEach(task => {
            const signature = [
                String(task?.title || "").trim().toLowerCase(),
                String(task?.routine_type || "general").trim().toLowerCase()
            ].join("|");

            byMission.set(signature || taskKey(task), task);
        });

        let finalTasks = Array.from(byMission.values());

        const visualMap = await getTaskVisuals(
            finalTasks.map(task => task?.task_id)
        );

        const allowedRoutines = new Set([
            "morning",
            "backpack",
            "after_school",
            "after_school_program",
            "sports",
            "weekend",
            "night",
            "general"
        ]);

        finalTasks = finalTasks.map(task => {
            const visual = visualMap.get(String(task?.task_id || "")) || null;
            const source = String(task?.source_type || "").toLowerCase();
            let routine = String(task?.routine_type || "").trim().toLowerCase();

            if (source.startsWith("kid_custom_")) {
                routine = source.replace(/^kid_custom_/, "");
            } else if (source.startsWith("kid_age_")) {
                routine = source.replace(/^kid_age_/, "");
            }

            if (!allowedRoutines.has(routine)) {
                routine = "general";
            }

            return {
                ...task,
                routine_type: routine,
                image_url: visual?.image_url || task?.image_url || null,
                image_alt: visual?.alt_text || null
            };
        });

        const primaryEnvelope =
            !primary.error && !Array.isArray(primary.data)
                ? primary.data || {}
                : {};

        return {
            data: {
                ...primaryEnvelope,
                tasks: finalTasks
            },
            error: null
        };
    }

    async function setUniversalCompletion(sessionToken, occurrenceId, complete) {
        let result = await client().rpc(
            "homeos_kid_set_assigned_task_completion_v3",
            {
                p_session_token: sessionToken,
                p_occurrence_id: occurrenceId,
                p_complete: Boolean(complete)
            }
        );

        if (
            result.error &&
            rpcMissing(result.error, "homeos_kid_set_assigned_task_completion_v3")
        ) {
            result = await client().rpc(
                "homeos_kid_set_assigned_task_completion_v2",
                {
                    p_session_token: sessionToken,
                    p_occurrence_id: occurrenceId,
                    p_complete: Boolean(complete)
                }
            );
        }

        if (
            result.error &&
            rpcMissing(result.error, "homeos_kid_set_assigned_task_completion_v2")
        ) {
            result = await client().rpc(
                "homeos_kid_set_assigned_task_completion",
                {
                    p_session_token: sessionToken,
                    p_occurrence_id: occurrenceId,
                    p_complete: Boolean(complete)
                }
            );
        }

        return result;
    }

    async function setCompletion(
        sessionToken,
        occurrenceId,
        complete,
        taskEngine = "kid"
    ) {
        if (taskEngine !== "universal") {
            const { data, error } = await client().rpc(
                "homeos_kid_set_task_completion",
                {
                    p_session_token: sessionToken,
                    p_occurrence_id: occurrenceId,
                    p_complete: Boolean(complete)
                }
            );

            return { data: data || null, error };
        }

        const result = await setUniversalCompletion(
            sessionToken,
            occurrenceId,
            complete
        );

        return {
            data: result.data || null,
            error: result.error
        };
    }

    async function logout(sessionToken) {
        if (!sessionToken) {
            return { error: null };
        }

        const { error } = await client().rpc("homeos_kid_logout", {
            p_session_token: sessionToken
        });

        return { error };
    }

    window.HomeOS.services.kids = {
        lockAdultSession,
        getAdultPortalState,
        getAdultAuthSession,
        listProfiles,
        login,
        getSession,
        getTasks,
        setCompletion,
        logout
    };
})();
