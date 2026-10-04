/* ============================================================
   HOMEOS // CALENDAR SERVICE

   Calendar data access and event storage.
============================================================ */

(function createHomeOSCalendarService() {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    window.HomeOS.services = window.HomeOS.services || {};
    const DAY_MS = 24 * 60 * 60 * 1000;
    function client() {
        if (!window.HomeOS.supabase) {
            throw new Error("HomeOS Supabase client is not ready.");
        }
        return window.HomeOS.supabase;
    }

    function currentHouseholdId() {
        return window.HomeOS.session?.getState?.().household?.id || null;
    }

    function resolveHouseholdId(requestedId = null) {
        const activeId = currentHouseholdId();

        if (!activeId) {
            return {
                householdId: null,
                error: new Error("HomeOS household context is required for Calendar data.")
            };
        }

        if (requestedId && String(requestedId) !== String(activeId)) {
            return {
                householdId: null,
                error: new Error("Calendar household does not match the signed-in household.")
            };
        }

        return {
            householdId: activeId,
            error: null
        };
    }

    async function validateFamilyMember(householdId, familyMemberId) {
        if (!familyMemberId) {
            return { valid: true, error: null };
        }

        const { data, error } = await client()
            .from("family_members")
            .select("id")
            .eq("household_id", householdId)
            .eq("id", familyMemberId)
            .eq("active", true)
            .maybeSingle();

        if (error) {
            return { valid: false, error };
        }

        if (!data?.id) {
            return {
                valid: false,
                error: new Error("That calendar person is not part of the current household.")
            };
        }

        return { valid: true, error: null };
    }
    function dateKey(date) {
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }
    function fromDateKey(key) {
        const [year, month, day] = String(key || "").split("-").map(Number);
        return new Date(year, Math.max(0, month - 1), day || 1, 12, 0, 0, 0);
    }
    function startOfDay(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    }
    function combineLocal(date, time) {
        const copy = startOfDay(date);
        const [hours, minutes] = String(time || "00:00").split(":").map(Number);
        copy.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
        return copy;
    }
    function parseRule(rule) {
        const value = String(rule || "").trim().toUpperCase();
        if (!value)
            return null;
        const parts = Object.fromEntries(value
            .split(";")
            .map(part => part.split("="))
            .filter(pair => pair.length === 2)
            .map(([key, val]) => [key.trim(), val.trim()]));
        return {
            raw: value,
            freq: parts.FREQ || null,
            interval: Math.max(1, Number(parts.INTERVAL || 1) || 1)
        };
    }
    function mondayOf(date) {
        const copy = startOfDay(date);
        const offset = (copy.getDay() + 6) % 7;
        copy.setDate(copy.getDate() - offset);
        return copy;
    }
    function happensOnDate({ anchor, candidate, rule, endDate = null }) {
        const parsed = parseRule(rule);
        const day = startOfDay(candidate);
        const anchorDay = startOfDay(anchor);
        if (day < anchorDay)
            return false;
        if (endDate && dateKey(day) > String(endDate))
            return false;
        if (!parsed)
            return dateKey(day) === dateKey(anchorDay);
        if (parsed.freq === "DAILY") {
            const daysApart = Math.floor((day - anchorDay) / DAY_MS);
            return daysApart >= 0 && daysApart % parsed.interval === 0;
        }
        if (parsed.freq === "WEEKLY") {
            if (day.getDay() !== anchorDay.getDay())
                return false;
            const weeksApart = Math.floor((mondayOf(day) - mondayOf(anchorDay)) / (7 * DAY_MS));
            return weeksApart >= 0 && weeksApart % parsed.interval === 0;
        }
        if (parsed.freq === "MONTHLY") {
            if (day.getDate() !== anchorDay.getDate())
                return false;
            const monthsApart = (day.getFullYear() - anchorDay.getFullYear()) * 12 +
                (day.getMonth() - anchorDay.getMonth());
            return monthsApart >= 0 && monthsApart % parsed.interval === 0;
        }
        if (parsed.freq === "YEARLY") {
            if (day.getMonth() !== anchorDay.getMonth() || day.getDate() !== anchorDay.getDate()) {
                return false;
            }
            const yearsApart = day.getFullYear() - anchorDay.getFullYear();
            return yearsApart >= 0 && yearsApart % parsed.interval === 0;
        }
        return dateKey(day) === dateKey(anchorDay);
    }
    function eventDurationMs(start, end) {
        const duration = end instanceof Date && !Number.isNaN(end.getTime())
            ? end.getTime() - start.getTime()
            : 0;
        return Math.max(0, duration);
    }
    function expandManualEvent(row, rangeStart, rangeEnd) {
        const anchorStart = new Date(row.starts_at);
        if (Number.isNaN(anchorStart.getTime()))
            return [];
        const anchorEnd = row.ends_at ? new Date(row.ends_at) : null;
        const duration = eventDurationMs(anchorStart, anchorEnd);
        const recurring = Boolean(row.recurrence_rule);
        const results = [];
        const firstDay = startOfDay(rangeStart);
        const finalDay = startOfDay(new Date(rangeEnd.getTime() - 1));
        for (let day = new Date(firstDay); day <= finalDay; day.setDate(day.getDate() + 1)) {
            if (!happensOnDate({
                anchor: anchorStart,
                candidate: day,
                rule: row.recurrence_rule,
                endDate: row.recurrence_end_date
            }))
                continue;
            const time = row.all_day
                ? "00:00"
                : `${String(anchorStart.getHours()).padStart(2, "0")}:${String(anchorStart.getMinutes()).padStart(2, "0")}`;
            const start = combineLocal(day, time);
            const end = duration ? new Date(start.getTime() + duration) : null;
            results.push({
                id: `event:${row.id}:${dateKey(day)}`,
                recordId: row.id,
                title: row.title,
                category: row.category || "family",
                start,
                end,
                allDay: Boolean(row.all_day),
                recurrenceRule: row.recurrence_rule || null,
                recurrenceEndDate: row.recurrence_end_date || null,
                familyMemberId: row.family_member_id || null,
                eventColor: row.event_color || null,
                location: row.location || "",
                notes: row.notes || "",
                source: "calendar",
                sourceType: "calendar_event",
                sourceHref: null,
                recurring,
                editable: true,
                raw: row
            });
        }
        return results;
    }
    async function getPeople(householdId) {
        const { data, error } = await client()
            .from("family_members")
            .select("id,display_name,member_type,relationship_label,can_login,auth_user_id,color,active,sort_order")
            .eq("household_id", householdId)
            .eq("active", true)
            .order("sort_order", { ascending: true })
            .order("display_name", { ascending: true });
        return { data: data || [], error };
    }
    async function getKidBirthdayProfiles() {
        const { data, error } = await client().rpc("homeos_get_kid_admin_state");
        if (error)
            return { data: [], error };
        return {
            data: Array.isArray(data?.profiles) ? data.profiles : [],
            error: null
        };
    }
    function birthdayForYear(birthDate, year) {
        const raw = String(birthDate || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(raw))
            return null;
        const [, monthText, dayText] = raw.split("-");
        const month = Number(monthText);
        const day = Number(dayText);
        if (!month || !day)
            return null;
        const lastDay = new Date(year, month, 0, 12, 0, 0, 0).getDate();
        const safeDay = Math.min(day, lastDay);
        const date = new Date(year, month - 1, safeDay, 0, 0, 0, 0);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    function expandKidBirthday(profile, person, rangeStart, rangeEnd) {
        if (!profile?.birth_date || !person?.id)
            return [];
        const firstName = String(person.display_name || "Child").trim().split(/\s+/)[0] || "Child";
        const events = [];
        const firstYear = rangeStart.getFullYear() - 1;
        const lastYear = rangeEnd.getFullYear() + 1;
        for (let year = firstYear; year <= lastYear; year += 1) {
            const start = birthdayForYear(profile.birth_date, year);
            if (!start || start < rangeStart || start >= rangeEnd)
                continue;
            events.push({
                id: `kid-birthday:${person.id}:${year}`,
                recordId: `kid-birthday:${person.id}`,
                title: `${firstName}'s Birthday`,
                category: "birthday",
                start,
                end: null,
                allDay: true,
                recurrenceRule: "FREQ=YEARLY",
                recurrenceEndDate: null,
                familyMemberId: person.id,
                eventColor: "#d4af37",
                location: "",
                notes: "Birthday saved in People & Access.",
                source: "people",
                sourceType: "kid_profile_birthday",
                sourceHref: "account.html#people",
                recurring: true,
                editable: false,
                personNames: [person.display_name],
                raw: profile
            });
        }
        return events;
    }
    function seasonForDate(date = new Date()) {
        const month = date.getMonth();
        if ([11, 0, 1].includes(month))
            return "winter";
        if ([2, 3, 4].includes(month))
            return "spring";
        if ([5, 6, 7].includes(month))
            return "summer";
        return "fall";
    }
    async function getSeasonalSnapshot(householdId, date = new Date()) {
        const season = seasonForDate(date);
        const year = date.getFullYear();
        const empty = {
            season,
            year,
            resetId: null,
            status: "ready",
            total: 0,
            completed: 0,
            percent: 0
        };
        const ensured = await client().rpc("homeos_ensure_seasonal_reset", {
            p_season: season,
            p_year: year
        });
        if (ensured.error || !ensured.data) {
            return { data: empty, error: ensured.error || null };
        }
        const resetId = ensured.data;
        const [resetResult, tasksResult] = await Promise.all([
            client()
                .from("seasonal_resets")
                .select("*")
                .eq("household_id", householdId)
                .eq("id", resetId)
                .single(),
            client()
                .from("seasonal_reset_tasks")
                .select("id,done")
                .eq("household_id", householdId)
                .eq("seasonal_reset_id", resetId)
        ]);
        const error = resetResult.error || tasksResult.error || null;
        if (error)
            return { data: { ...empty, resetId }, error };
        const tasks = tasksResult.data || [];
        const total = tasks.length;
        const completed = tasks.filter(task => Boolean(task.done)).length;
        return {
            data: {
                season,
                year,
                resetId,
                status: resetResult.data?.status || (completed ? "in_progress" : "ready"),
                total,
                completed,
                percent: total ? Math.round((completed / total) * 100) : 0
            },
            error: null
        };
    }
    function percent(completed, total) {
        return total ? Math.round((completed / total) * 100) : 0;
    }
    function dailyTaskApplies(runtime, personId) {
        if (!runtime)
            return false;
        const mode = runtime.task?.assignment_mode || "anyone";
        if (mode === "anyone")
            return true;
        if (!personId)
            return false;
        if (mode === "rotation") {
            return String(runtime.expectedRotationPersonId || "") === String(personId);
        }
        return (runtime.assignments || []).some(row => String(row.family_member_id || "") === String(personId));
    }
    function dailyTaskDone(runtime, personId) {
        if (!runtime)
            return true;
        const mode = runtime.task?.assignment_mode || "anyone";
        if (["individual", "owner_helpers"].includes(mode) && personId) {
            return (runtime.completions || []).some(row => String(row.family_member_id || "") === String(personId));
        }
        return runtime.occurrence?.status === "complete";
    }
    async function getRhythmSnapshot(householdId, personId = null) {
        const daily = window.HomeOS?.services?.daily;
        const empty = {
            available: false,
            completed: 0,
            total: 0,
            percent: 0,
            opening: { completed: 0, total: 0, percent: 0 },
            closing: { completed: 0, total: 0, percent: 0 }
        };
        if (!daily?.load)
            return { data: empty, error: null };
        const result = await daily.load(householdId);
        if (result.error || !result.data) {
            return { data: empty, error: result.error || null };
        }
        const visible = (result.data.tasks || []).filter(runtime => dailyTaskApplies(runtime, personId));
        const build = list => {
            const total = list.length;
            const completed = list.filter(runtime => dailyTaskDone(runtime, personId)).length;
            return { completed, total, percent: percent(completed, total) };
        };
        const opening = build(visible.filter(runtime => runtime.task?.source_type === "daily_opening"));
        const closing = build(visible.filter(runtime => runtime.task?.source_type === "daily_closing"));
        const overall = build(visible);
        return {
            data: {
                available: true,
                ...overall,
                opening,
                closing
            },
            error: null
        };
    }
    function daysSince(value) {
        if (!value)
            return Number.POSITIVE_INFINITY;
        const date = new Date(value);
        if (Number.isNaN(date.getTime()))
            return Number.POSITIVE_INFINITY;
        return Math.max(0, Math.floor((Date.now() - date.getTime()) / DAY_MS));
    }
    function cleaningSessionProgress(session) {
        const tasks = session?.tasks || [];
        const total = tasks.length;
        const completed = tasks.filter(task => Boolean(task.done)).length;
        return {
            total,
            completed,
            percent: total ? Math.round((completed / total) * 100) : 0
        };
    }
    function cleaningMemoryForRoom(room, completedSessions) {
        const sessions = completedSessions
            .filter(session => session.room_id === room.id ||
            (room.zone_id && !session.room_id && session.zone_id === room.zone_id))
            .slice()
            .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
        const latest = sessions[0] || null;
        const lastQuickAt = sessions.find(session => ["quick", "standard", "deep"].includes(session.cleaning_level))?.completed_at || null;
        const lastStandardAt = sessions.find(session => ["standard", "deep"].includes(session.cleaning_level))?.completed_at || null;
        const lastDeepAt = sessions.find(session => session.cleaning_level === "deep")?.completed_at || null;
        return {
            hasHistory: Boolean(latest),
            latestAt: latest?.completed_at || null,
            lastQuickAt,
            lastStandardAt,
            lastDeepAt
        };
    }
    function cleaningSuggestedLevel(memory) {
        if (!memory.lastQuickAt && !memory.lastStandardAt && !memory.lastDeepAt)
            return "standard";
        if (memory.lastDeepAt && daysSince(memory.lastDeepAt) >= 60)
            return "deep";
        if (!memory.lastStandardAt || daysSince(memory.lastStandardAt) >= 10)
            return "standard";
        return "quick";
    }
    async function getCleaningSnapshot(householdId) {
        const cleaning = window.HomeOS?.services?.cleaning;
        const empty = {
            available: false,
            percent: 0,
            cared: 0,
            total: 0,
            attention: 0,
            never: 0,
            activePercent: 0,
            activeLabel: "None"
        };
        if (!cleaning?.load)
            return { data: empty, error: null };
        const result = await cleaning.load(householdId);
        if (result.error || !result.data) {
            return { data: empty, error: result.error || null };
        }
        const rooms = (result.data.rooms || []).filter(room => room.active !== false);
        const sessions = result.data.sessions || [];
        const completedSessions = sessions.filter(session => session.status === "complete" && session.completed_at);
        const active = sessions.find(session => ["active", "paused"].includes(session.status)) || null;
        const activeProgress = active ? cleaningSessionProgress(active) : null;
        const roomStates = rooms.map(room => {
            const memory = cleaningMemoryForRoom(room, completedSessions);
            let activeFraction = 0;
            if (active?.room_id === room.id) {
                activeFraction = activeProgress?.total
                    ? activeProgress.completed / activeProgress.total
                    : 0;
            }
            else if (active && !active.room_id && active.zone_id && active.zone_id === room.zone_id) {
                const roomTasks = (active.tasks || []).filter(task => {
                    const taskRoomName = task.metadata?.room_name || null;
                    return task.room_id === room.id || taskRoomName === room.name;
                });
                if (roomTasks.length) {
                    activeFraction = roomTasks.filter(task => Boolean(task.done)).length / roomTasks.length;
                }
            }
            const activeComplete = activeFraction >= 1;
            const cared = memory.hasHistory || activeComplete;
            const suggestedLevel = cleaningSuggestedLevel(memory);
            const attention = !activeComplete && (!memory.hasHistory || suggestedLevel !== "quick");
            return { memory, activeFraction, cared, attention };
        });
        const weightedCare = roomStates.reduce((sum, room) => sum + (room.memory.hasHistory ? 1 : room.activeFraction), 0);
        const cared = roomStates.filter(room => room.cared).length;
        const attention = roomStates.filter(room => room.attention).length;
        const never = roomStates.filter(room => !room.memory.hasHistory && room.activeFraction < 1).length;
        const coverage = rooms.length ? Math.round((weightedCare / rooms.length) * 100) : 0;
        let activeLabel = "None";
        if (active) {
            const target = active.room_id
                ? rooms.find(room => room.id === active.room_id)?.name
                : (result.data.zones || []).find(zone => zone.id === active.zone_id)?.name;
            activeLabel = `${target || "Active clean"} · ${activeProgress?.percent || 0}%`;
        }
        return {
            data: {
                available: true,
                percent: coverage,
                cared,
                total: rooms.length,
                attention,
                never,
                activePercent: activeProgress?.percent || 0,
                activeLabel
            },
            error: null
        };
    }
    async function getHomeHealthSnapshot(householdId, personId = null) {
        const [rhythm, cleaning] = await Promise.all([
            getRhythmSnapshot(householdId, personId),
            getCleaningSnapshot(householdId)
        ]);
        return {
            data: {
                rhythm: rhythm.data,
                cleaning: cleaning.data
            },
            errors: [rhythm.error, cleaning.error].filter(Boolean)
        };
    }
    async function getManualEvents(householdId) {
        const { data, error } = await client()
            .from("home_calendar_events")
            .select("*")
            .eq("household_id", householdId)
            .eq("active", true)
            .order("starts_at", { ascending: true });
        return { data: data || [], error };
    }
    function dedupeEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = [
                event.recordId,
                dateKey(event.start),
                event.allDay ? "all-day" : event.start.toISOString()
            ].join("|");
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    async function getCalendarRange(householdId, rangeStart, rangeEnd, personId = null) {
        const resolved = resolveHouseholdId(householdId);

        if (resolved.error) {
            return {
                data: {
                    events: [],
                    people: [],
                    seasonal: null,
                    rhythm: null,
                    cleaning: null
                },
                errors: [resolved.error],
                seasonalError: null,
                manualTableUnavailable: false
            };
        }

        householdId = resolved.householdId;

        const [manualResult, peopleResult, birthdayProfilesResult, seasonalResult, homeHealthResult] = await Promise.all([
            getManualEvents(householdId),
            getPeople(householdId),
            getKidBirthdayProfiles(),
            getSeasonalSnapshot(householdId, new Date()),
            getHomeHealthSnapshot(householdId, personId)
        ]);
        const errors = [manualResult.error, peopleResult.error].filter(Boolean);
        const people = peopleResult.data || [];
        const peopleById = Object.fromEntries(people.map(person => [person.id, person]));
        const manualEvents = (manualResult.data || [])
            .flatMap(row => expandManualEvent(row, rangeStart, rangeEnd))
            .map(event => ({
            ...event,
            personNames: event.familyMemberId && peopleById[event.familyMemberId]
                ? [peopleById[event.familyMemberId].display_name]
                : []
        }));
        const birthdayEvents = (birthdayProfilesResult.data || [])
            .flatMap(profile => {
            const person = peopleById[profile.family_member_id];
            return person ? expandKidBirthday(profile, person, rangeStart, rangeEnd) : [];
        })
            .filter(autoBirthday => {
            const person = peopleById[autoBirthday.familyMemberId];
            const firstName = String(person?.display_name || "").trim().split(/\s+/)[0].toLowerCase();
            return !manualEvents.some(manual => {
                if (manual.category !== "birthday" || dateKey(manual.start) !== dateKey(autoBirthday.start))
                    return false;
                if (manual.familyMemberId && String(manual.familyMemberId) === String(autoBirthday.familyMemberId))
                    return true;
                return firstName && String(manual.title || "").toLowerCase().includes(firstName);
            });
        });
        const events = dedupeEvents([...manualEvents, ...birthdayEvents]
            .filter(event => event.start >= rangeStart && event.start < rangeEnd)
            .sort((a, b) => a.start - b.start || a.title.localeCompare(b.title)));
        return {
            data: {
                events,
                people,
                seasonal: seasonalResult.data || null,
                rhythm: homeHealthResult.data?.rhythm || null,
                cleaning: homeHealthResult.data?.cleaning || null
            },
            errors: [...errors, ...(homeHealthResult.errors || [])],
            seasonalError: seasonalResult.error || null,
            manualTableUnavailable: Boolean(manualResult.error &&
                /home_calendar_events|relation .* does not exist|could not find the table/i.test(String(manualResult.error.message || manualResult.error)))
        };
    }
    async function saveManualEvent(event) {
        const resolved = resolveHouseholdId(event.householdId);

        if (resolved.error) {
            return {
                data: null,
                error: resolved.error
            };
        }

        const householdId = resolved.householdId;
        const title = String(event.title || "").trim();

        if (!title) {
            return {
                data: null,
                error: new Error("Calendar event title is required.")
            };
        }

        const start = new Date(event.startsAt);
        if (Number.isNaN(start.getTime())) {
            return {
                data: null,
                error: new Error("Calendar event start time is invalid.")
            };
        }

        if (
            event.recurrenceRule &&
            event.recurrenceEndDate &&
            String(event.recurrenceEndDate) < dateKey(start)
        ) {
            return {
                data: null,
                error: new Error("Repeat until cannot be before the event date.")
            };
        }

        const personCheck = await validateFamilyMember(
            householdId,
            event.familyMemberId || null
        );

        if (!personCheck.valid) {
            return {
                data: null,
                error: personCheck.error
            };
        }

        const payload = {
            household_id: householdId,
            title,
            category: event.category || "family",
            starts_at: event.startsAt,
            ends_at: event.endsAt || null,
            all_day: Boolean(event.allDay),
            recurrence_rule: event.recurrenceRule || null,
            recurrence_end_date: event.recurrenceEndDate || null,
            family_member_id: event.familyMemberId || null,
            event_color: event.eventColor || null,
            location: String(event.location || "").trim() || null,
            notes: String(event.notes || "").trim() || null,
            active: true,
            updated_at: new Date().toISOString()
        };

        if (event.id) {
            const { data, error } = await client()
                .from("home_calendar_events")
                .update(payload)
                .eq("household_id", householdId)
                .eq("id", event.id)
                .select("*")
                .single();

            return { data, error };
        }

        const { data, error } = await client()
            .from("home_calendar_events")
            .insert(payload)
            .select("*")
            .single();

        return { data, error };
    }
    async function savePersonCalendarColor(householdId, familyMemberId, color) {
        const resolved = resolveHouseholdId(householdId);

        if (resolved.error) {
            return { data: null, error: resolved.error };
        }

        const validColor = /^#[0-9a-f]{6}$/i.test(String(color || "").trim())
            ? String(color).trim()
            : null;

        if (!validColor) {
            return {
                data: null,
                error: new Error("Choose a valid calendar color.")
            };
        }

        const personCheck = await validateFamilyMember(
            resolved.householdId,
            familyMemberId
        );

        if (!personCheck.valid) {
            return {
                data: null,
                error: personCheck.error
            };
        }

        const { data, error } = await client().rpc(
            "homeos_set_family_member_calendar_color",
            {
                p_household_id: resolved.householdId,
                p_family_member_id: familyMemberId,
                p_color: validColor
            }
        );

        return { data, error };
    }
    async function deleteManualEvent(eventId) {
        const resolved = resolveHouseholdId();

        if (resolved.error) {
            return {
                error: resolved.error
            };
        }

        const { error } = await client()
            .from("home_calendar_events")
            .delete()
            .eq("household_id", resolved.householdId)
            .eq("id", eventId);

        return { error };
    }
    window.HomeOS.services.calendar = {
        dateKey,
        fromDateKey,
        getCalendarRange,
        saveManualEvent,
        savePersonCalendarColor,
        deleteManualEvent,
        getSeasonalSnapshot,
        getHomeHealthSnapshot,
        getRhythmSnapshot,
        getCleaningSnapshot
    };
})();
