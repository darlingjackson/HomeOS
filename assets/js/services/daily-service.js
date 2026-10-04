/* ============================================================
   HOMEOS // DAILY SERVICE

   Daily Rhythm data access and task state.
============================================================ */

(function createHomeOSDailyService() {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    window.HomeOS.services = window.HomeOS.services || {};
    const tasks = () => window.HomeOS.services.tasks;
    let dailyRhythmEnsured = false;
    function client() {
        if (!window.HomeOS.supabase) {
            throw new Error("HomeOS Supabase client is not ready.");
        }
        return window.HomeOS.supabase;
    }
    function localDateKey(date = new Date()) {
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }
    function dateFromKey(key) {
        const [year, month, day] = String(key || "").split("-").map(Number);
        return new Date(year, Math.max(0, month - 1), day);
    }
    function visibleToday(task, todayKey) {
        if (task.recurrence_end_date && todayKey > task.recurrence_end_date) {
            return false;
        }
        const rule = String(task.recurrence_rule || "").toUpperCase();
        if (!rule) {
            return task.due_date ? task.due_date === todayKey : true;
        }
        const anchorKey = task.due_date || localDateKey(new Date(task.created_at));
        const today = dateFromKey(todayKey);
        const anchor = dateFromKey(anchorKey);
        if (today < anchor)
            return false;
        if (rule.includes("FREQ=DAILY"))
            return true;
        if (rule.includes("FREQ=WEEKLY")) {
            const jsDayToRrule = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
            const byDay = rule.match(/(?:^|;)BYDAY=([^;]+)/)?.[1]
                ?.split(",")
                .map(day => day.trim())
                .filter(Boolean) || [];
            const allowedDays = byDay.length
                ? byDay
                : [jsDayToRrule[anchor.getDay()]];
            if (!allowedDays.includes(jsDayToRrule[today.getDay()]))
                return false;
            const interval = Number(rule.match(/(?:^|;)INTERVAL=(\d+)/)?.[1] || 1);
            if (interval <= 1)
                return true;
            const startOfWeek = date => {
                const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                const mondayOffset = (copy.getDay() + 6) % 7;
                copy.setDate(copy.getDate() - mondayOffset);
                copy.setHours(0, 0, 0, 0);
                return copy;
            };
            const weeksApart = Math.floor((startOfWeek(today) - startOfWeek(anchor)) / (7 * 24 * 60 * 60 * 1000));
            return weeksApart >= 0 && weeksApart % interval === 0;
        }
        if (rule.includes("FREQ=MONTHLY"))
            return today.getDate() === anchor.getDate();
        return true;
    }
    function dueAt(task, todayKey) {
        const key = task.recurrence_rule ? todayKey : (task.due_date || todayKey);
        const time = String(task.due_time || "12:00").slice(0, 5);
        return new Date(`${key}T${time}:00`).toISOString();
    }
    function dedupeDailyTasks(rows) {
        const unique = new Map();
        (rows || [])
            .forEach(task => {
            const normalizedTitle = String(task.title ||
                "")
                .trim()
                .replace(/\s+/g, " ")
                .toLowerCase();
            const key = [
                task.source_type ||
                    "daily",
                task.room_id ||
                    "WHOLE_HOME",
                normalizedTitle
            ]
                .join("|");
            const current = unique.get(key);
            // Keep the earliest copy so any older completion history remains attached to the visible definition.
            if (!current) {
                unique.set(key, task);
                return;
            }
            const currentTime = new Date(current.created_at ||
                0)
                .getTime();
            const candidateTime = new Date(task.created_at ||
                0)
                .getTime();
            if (candidateTime <
                currentTime) {
                unique.set(key, task);
            }
        });
        return Array.from(unique.values());
    }
    async function tableList(table, householdId, orderBy = "sort_order") {
        let query = client().from(table).select("*").eq("household_id", householdId);
        if (orderBy)
            query = query.order(orderBy, { ascending: true });
        const { data, error } = await query;
        return { data: data || [], error };
    }
    async function ensureDailyRhythm() {
        if (dailyRhythmEnsured) {
            return { data: true, error: null };
        }
        const { data, error } = await client()
            .rpc("homeos_ensure_daily_rhythm");
        if (!error)
            dailyRhythmEnsured = true;
        return { data, error };
    }
    async function getShopping(householdId) {
        const { data, error } = await client()
            .from("shopping_list")
            .select("*")
            .eq("household_id", householdId)
            .order("completed", { ascending: true })
            .order("created_at", { ascending: false });
        return { data: data || [], error };
    }
    async function addShoppingItem(householdId, name) {
        const { data, error } = await client()
            .from("shopping_list")
            .insert({
            household_id: householdId,
            name: String(name || "").trim(),
            quantity: 1,
            source_type: "daily_quick",
            completed: false,
            created_by: window.HomeOS.session.getState()?.user?.id || null
        })
            .select("*")
            .single();
        return { data, error };
    }
    async function setShoppingComplete(householdId, itemId, complete) {
        const { data, error } = await client()
            .from("shopping_list")
            .update({
            completed: Boolean(complete),
            completed_at: complete ? new Date().toISOString() : null
        })
            .eq("household_id", householdId)
            .eq("id", itemId)
            .select("*")
            .single();
        return { data, error };
    }
    async function removeShoppingItem(householdId, itemId) {
        const { error } = await client()
            .from("shopping_list")
            .delete()
            .eq("household_id", householdId)
            .eq("id", itemId);
        return { error };
    }
    async function getLaundry(householdId) {
        const [areas, loads] = await Promise.all([
            client().from("laundry_areas").select("*")
                .eq("household_id", householdId)
                .eq("active", true)
                .order("sort_order", { ascending: true }),
            client().from("laundry_loads").select("*")
                .eq("household_id", householdId)
                .neq("stage", "complete")
                .order("started_at", { ascending: true, nullsFirst: false })
                .order("created_at", { ascending: true })
        ]);
        return {
            data: { areas: areas.data || [], loads: loads.data || [] },
            error: areas.error || loads.error || null
        };
    }
    async function startLaundryLoad(householdId, name, laundryAreaId = null) {
        const now = new Date().toISOString();
        const { data, error } = await client()
            .from("laundry_loads")
            .insert({
            household_id: householdId,
            laundry_area_id: laundryAreaId,
            name: String(name || "").trim(),
            stage: "washing",
            started_at: now,
            metadata: { stage_updated_at: now, source: "daily" }
        })
            .select("*")
            .single();
        return { data, error };
    }
    async function advanceLaundryLoad(householdId, load) {
        const stages = ["washing", "drying", "folding", "put_away", "complete"];
        const index = stages.indexOf(load.stage);
        const next = stages[index + 1] || "complete";
        const now = new Date().toISOString();
        const metadata = { ...(load.metadata || {}), stage_updated_at: now };
        const { data, error } = await client()
            .from("laundry_loads")
            .update({
            stage: next,
            completed_at: next === "complete" ? now : null,
            metadata
        })
            .eq("household_id", householdId)
            .eq("id", load.id)
            .select("*")
            .single();
        return { data, error };
    }
    async function createQuickDailyTask({ title, shift, roomId, recurring, familyMemberId = null }) {
        const today = localDateKey();
        const personal = Boolean(familyMemberId);
        return tasks().saveTask({
            title,
            sourceType: shift === "closing" ? "daily_closing" : "daily_opening",
            targetType: roomId ? "room" : null,
            roomId: roomId || null,
            assignmentMode: personal ? "individual" : "anyone",
            priority: "normal",
            dueDate: today,
            recurrenceRule: recurring ? "FREQ=DAILY" : null,
            active: true,
            assignments: personal ? [{
                    family_member_id: familyMemberId,
                    assignment_role: "assignee",
                    completion_required: true,
                    rotation_order: 1
                }] : []
        });
    }
    function rpcUnavailable(error) {
        const code = String(error?.code || "");
        const message = String(error?.message || "");
        return code === "PGRST202" || code === "42883" || /schema cache|could not find the function|does not exist/i.test(message);
    }
    async function createMyDailyTask({ title, shift, roomId, recurring, familyMemberId = null }) {
        const sourceType = shift === "closing" ? "daily_closing" : "daily_opening";
        const today = localDateKey();
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        const { data, error } = await client().rpc("homeos_create_my_daily_task", {
            p_title: String(title || "").trim(),
            p_source_type: sourceType,
            p_room_id: roomId || null,
            p_due_date: today,
            p_recurring: Boolean(recurring),
            p_timezone: timezone
        });
        if (!error)
            return { taskId: data || null, error: null };
        // Owners and admins can use the direct save path if the RPC is not
        // available yet. Regular members still use the secure RPC.
        if (rpcUnavailable(error) && window.HomeOS.permissions?.isAdmin?.() && familyMemberId) {
            return createQuickDailyTask({
                title,
                shift,
                roomId,
                recurring,
                familyMemberId
            });
        }
        return { taskId: null, error };
    }
    async function archiveMyDailyTask(taskId) {
        const { data, error } = await client().rpc("homeos_archive_my_daily_task", {
            p_task_id: taskId
        });
        return { data, error };
    }
    async function hasDailyRhythmHistory(householdId) {
        const result = await tasks().listTasks(householdId, {
            sourceTypes: ["daily_opening", "daily_closing"],
            activeOnly: false
        });
        return {
            data: Boolean(result.data?.length),
            error: result.error || null
        };
    }
    function starterDefinitions(rooms) {
        const active = (rooms || []).filter(room => room.active !== false);
        const first = (...types) => active.find(room => types.includes(room.room_type));
        const kitchen = first("kitchen");
        const living = first("living_room", "den", "family_room");
        const laundry = first("laundry", "laundry_room");
        const bathroom = first("bathroom", "powder_room");
        return [
            { shift: "opening", title: "Open curtains or blinds", roomId: null },
            { shift: "opening", title: "Make the beds", roomId: null },
            kitchen && { shift: "opening", title: "Unload the dishwasher", roomId: kitchen.id },
            kitchen && { shift: "opening", title: "Clear breakfast dishes", roomId: kitchen.id },
            bathroom && { shift: "opening", title: "Quick bathroom reset", roomId: bathroom.id },
            living && { shift: "opening", title: "Quick reset of the main living space", roomId: living.id },
            laundry && { shift: "opening", title: "Start one laundry load", roomId: laundry.id },
            living && { shift: "closing", title: "Put the living space back in place", roomId: living.id },
            kitchen && { shift: "closing", title: "Clear and wipe kitchen counters", roomId: kitchen.id },
            kitchen && { shift: "closing", title: "Load or run the dishwasher", roomId: kitchen.id },
            { shift: "closing", title: "Take out trash if needed", roomId: kitchen?.id || null },
            { shift: "closing", title: "Set out what you need for tomorrow", roomId: null },
            { shift: "closing", title: "Turn off lights and settle the home", roomId: null }
        ].filter(Boolean);
    }
    async function buildStarterRhythm(householdId, rooms, familyMemberId = null) {
        const existingResult = await tasks().listTasks(householdId, {
            sourceTypes: ["daily_opening", "daily_closing"],
            activeOnly: false
        });
        if (existingResult.error) {
            return { data: [], error: existingResult.error };
        }
        const existingKeys = new Set((existingResult.data || []).map(task => [
            task.source_type,
            task.room_id || "WHOLE_HOME",
            String(task.title || "").trim().replace(/\s+/g, " ").toLowerCase()
        ].join("|")));
        const definitions = starterDefinitions(rooms).filter(item => {
            const source = item.shift === "closing" ? "daily_closing" : "daily_opening";
            const key = [
                source,
                item.roomId || "WHOLE_HOME",
                String(item.title || "").trim().replace(/\s+/g, " ").toLowerCase()
            ].join("|");
            return !existingKeys.has(key);
        });
        if (!definitions.length) {
            return { data: [], error: null };
        }
        const results = await Promise.all(definitions.map(item => createQuickDailyTask({ ...item, recurring: true, familyMemberId })));
        const failed = results.find(result => result.error);
        return {
            data: results.map(result => result.taskId).filter(Boolean),
            error: failed?.error || null
        };
    }
    async function ensureStarterRhythm(householdId, rooms, familyMemberId = null) {
        const history = await hasDailyRhythmHistory(householdId);
        if (history.error)
            return { created: false, count: 0, error: history.error };
        if (history.data)
            return { created: false, count: 0, error: null };
        const result = await buildStarterRhythm(householdId, rooms, familyMemberId);
        return {
            created: !result.error && Boolean(result.data?.length),
            count: result.data?.length || 0,
            error: result.error || null
        };
    }
    async function load(householdId) {
        const today = localDateKey();
        const [bootstrap, levels, rooms, taskResult, people, shopping, laundry] = await Promise.all([
            ensureDailyRhythm(),
            tableList("home_levels", householdId),
            tableList("rooms", householdId),
            tasks().listTasks(householdId, {
                sourceTypes: ["daily_opening", "daily_closing"],
                activeOnly: true
            }),
            tasks().getAssignablePeople(householdId),
            getShopping(householdId),
            getLaundry(householdId)
        ]);
        const error = [bootstrap, levels, rooms, taskResult, people, shopping, laundry]
            .find(result => result.error)?.error || null;
        if (error)
            return { data: null, error };
        const todayTasks = dedupeDailyTasks(taskResult.data
            .filter(task => visibleToday(task, today)));
        const taskIds = todayTasks.map(task => task.id);
        const assignmentResult = await tasks().getAssignments(taskIds);
        if (assignmentResult.error)
            return { data: null, error: assignmentResult.error };
        const occurrenceResults = await Promise.all(todayTasks.map(task => tasks().ensureOccurrence(task.id, dueAt(task, today))));
        const occurrenceFailure = occurrenceResults.find(result => result.error);
        if (occurrenceFailure?.error) {
            return { data: null, error: occurrenceFailure.error };
        }
        const occurrenceIds = occurrenceResults
            .map(result => result.occurrenceId)
            .filter(Boolean);
        const allOccurrences = await tasks().getOccurrences(householdId, { taskIds });
        if (allOccurrences.error)
            return { data: null, error: allOccurrences.error };
        const completions = await tasks().getCompletions(occurrenceIds);
        if (completions.error)
            return { data: null, error: completions.error };
        const assignmentsByTask = tasks().groupAssignmentsByTask(assignmentResult.data);
        const completionsByOccurrence = completions.data.reduce((grouped, row) => {
            (grouped[row.occurrence_id] ||= []).push(row);
            return grouped;
        }, {});
        const occurrencesByTask = allOccurrences.data.reduce((grouped, row) => {
            (grouped[row.task_id] ||= []).push(row);
            return grouped;
        }, {});
        const runtimeTasks = todayTasks.map((task, index) => {
            const occurrenceId = occurrenceResults[index]?.occurrenceId || null;
            const occurrence = allOccurrences.data.find(row => row.id === occurrenceId);
            const assignments = assignmentsByTask[task.id] || [];
            let expectedRotationPersonId = null;
            if (task.assignment_mode === "rotation" && assignments.length && occurrence) {
                const history = (occurrencesByTask[task.id] || []).slice().sort((a, b) => new Date(a.due_at || a.created_at) - new Date(b.due_at || b.created_at));
                const occurrenceIndex = Math.max(0, history.findIndex(row => row.id === occurrence.id));
                const ordered = assignments.slice().sort((a, b) => (a.rotation_order ?? 999999) - (b.rotation_order ?? 999999));
                expectedRotationPersonId = ordered[occurrenceIndex % ordered.length]?.family_member_id || null;
            }
            return {
                task,
                occurrence,
                assignments,
                completions: completionsByOccurrence[occurrenceId] || [],
                expectedRotationPersonId
            };
        });
        return {
            data: {
                today,
                levels: levels.data,
                rooms: rooms.data,
                people: people.data,
                tasks: runtimeTasks,
                shopping: shopping.data,
                laundry: laundry.data
            },
            error: null
        };
    }
    window.HomeOS.services.daily = {
        load,
        ensureDailyRhythm,
        localDateKey,
        addShoppingItem,
        setShoppingComplete,
        removeShoppingItem,
        startLaundryLoad,
        advanceLaundryLoad,
        createQuickDailyTask,
        createMyDailyTask,
        archiveMyDailyTask,
        buildStarterRhythm,
        ensureStarterRhythm,
        hasDailyRhythmHistory
    };
})();
