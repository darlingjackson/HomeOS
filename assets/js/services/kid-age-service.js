/* ============================================================
   HOMEOS // KID AGE SERVICE

   Kid age, birthday and automatic mission rules.
============================================================ */

(function createHomeOSKidAgeService() {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    window.HomeOS.services = window.HomeOS.services || {};
    // --- Constants + Automatic Mission Packs ---
    const DEFAULT_SCHOOL_DAYS = Object.freeze([1, 2, 3, 4, 5]);
    const KID_IMAGE_BUCKET = "kid-task-images";
    const PACKS = {
        little: [
            ["morning_potty", "Use potty / toilet", "morning", "toilet"],
            ["morning_brush_teeth", "Brush teeth", "morning", "toothbrush"],
            ["morning_wash_face", "Wash face", "morning", "wash-face"],
            ["morning_get_dressed", "Get dressed", "morning", "clothes"],
            ["morning_breakfast", "Eat breakfast", "morning", "breakfast"],
            ["morning_dish_sink", "Put cup or plate in sink", "morning", "dishes"],
            ["after_toys", "Put toys in toy bin", "after_school", "toy-bin"],
            ["after_books", "Put books back", "after_school", "books"],
            ["after_hamper", "Put dirty clothes in hamper", "after_school", "hamper"],
            ["night_bath", "Bath", "night", "bath"],
            ["night_pajamas", "Put on pajamas", "night", "pajamas"],
            ["night_brush_teeth", "Brush teeth", "night", "toothbrush"],
            ["night_book", "Choose bedtime book", "night", "bedtime-book"],
            ["night_prayer", "Bedtime prayer / quiet moment", "night", "prayer"],
            ["night_bed", "Get into bed", "night", "bed"],
            ["weekend_match_socks", "Match socks", "weekend", "socks"],
            ["weekend_set_table", "Put napkins on the table", "weekend", "table"],
            ["weekend_water_plants", "Help water plants", "weekend", "plant"]
        ],
        school_age: [
            // Morning Routine
            ["morning_bathroom", "Use the bathroom", "morning", "toilet"],
            ["morning_brush_teeth", "Brush teeth", "morning", "toothbrush"],
            ["morning_wash_face", "Wash face", "morning", "wash-face"],
            ["morning_lotion", "Apply lotion / moisturizer", "morning", "lotion"],
            ["morning_hair", "Brush / style hair", "morning", "hair"],
            ["morning_get_dressed", "Get dressed", "morning", "clothes"],
            ["morning_make_bed", "Make bed", "morning", "bed"],
            ["morning_pajamas", "Put pajamas away", "morning", "pajamas"],
            ["morning_breakfast", "Eat breakfast", "morning", "breakfast"],
            ["morning_shoes", "Put on shoes", "morning", "shoes"],
            // Backpack / School Ready
            ["backpack_school_folder", "Pack school folder / binder", "backpack", "school-folder"],
            ["backpack_homework", "Pack homework", "backpack", "homework"],
            ["backpack_reading_book", "Pack reading book", "backpack", "books"],
            ["backpack_snack", "Pack snack", "backpack", "snack"],
            ["backpack_lunch", "Pack lunch", "backpack", "lunch"],
            ["backpack_water", "Fill water bottle", "backpack", "water-bottle"],
            ["backpack_device", "Pack school device / charger", "backpack", "tablet"],
            // After School
            ["after_backpack_away", "Put backpack away", "after_school", "backpack"],
            ["after_shoes", "Put shoes away", "after_school", "shoes"],
            ["after_snack", "Have a snack", "after_school", "snack"],
            ["after_homework", "Do homework", "after_school", "homework"],
            ["after_reading", "Read for 20 minutes", "after_school", "books"],
            ["after_outside", "Play outside / move your body", "after_school", "outdoor-play"],
            ["after_free_time", "Free / screen time", "after_school", "screen-time"],
            ["after_dinner", "Eat dinner", "after_school", "dinner"],
            ["after_pet", "Check / feed pet", "after_school", "pet"],
            // Weekend
            ["weekend_activity", "Sports / activity time", "weekend", "sports"],
            ["weekend_outfits", "Choose outfits for the week", "weekend", "clothes"],
            ["weekend_bedroom_reset", "Clean your room", "weekend", "room-reset"],
            ["weekend_gear", "Organize school / sports gear", "weekend", "sports"],
            ["weekend_faith", "Church / faith time", "weekend", "prayer"],
            ["weekend_family_time", "Family time", "weekend", "family"],
            ["weekend_pet_walk", "Walk / exercise pet", "weekend", "pet"],
            ["weekend_pet_cleanup", "Clean up after pet", "weekend", "pet-cleanup"],
            ["weekend_laundry_away", "Put laundry away", "weekend", "laundry-basket"],
            ["weekend_small_trash", "Empty bedroom trash", "weekend", "trash"],
            // Night Routine
            ["night_room_reset", "Quick room reset", "night", "room-reset"],
            ["night_bathroom", "Use the bathroom", "night", "toilet"],
            ["night_bath", "Take a bath / shower", "night", "bath"],
            ["night_pajamas", "Put on pajamas", "night", "pajamas"],
            ["night_brush_teeth", "Brush teeth", "night", "toothbrush"],
            ["night_reading", "Read a book / Bible", "night", "books"],
            ["night_prayer", "Pray / quiet time", "night", "prayer"],
            ["night_clothes_tomorrow", "Set out clothes for tomorrow", "night", "clothes"],
            ["night_backpack_tomorrow", "Get backpack ready for tomorrow", "night", "backpack"],
            ["night_pet", "Check on pet", "night", "pet"]
        ],
        teen: [
            ["morning_make_bed", "Make bed", "morning", "bed"],
            ["morning_hygiene", "Morning hygiene", "morning", "toothbrush"],
            ["morning_breakfast", "Breakfast", "morning", "breakfast"],
            ["morning_clear_dishes", "Clear breakfast dishes", "morning", "dishes"],
            ["backpack_school_bag", "School bag ready", "backpack", "backpack"],
            ["backpack_device", "Laptop / Chromebook", "backpack", "tablet"],
            ["backpack_charger", "Charger", "backpack", "charger"],
            ["after_belongings", "Put belongings away", "after_school", "backpack"],
            ["after_study", "Homework / study block", "after_school", "homework"],
            ["night_room_reset", "Room reset", "night", "room-reset"],
            ["night_laundry_check", "Laundry check", "night", "laundry-basket"],
            ["night_next_day", "Prep for tomorrow", "night", "calendar"],
            ["night_hygiene", "Night hygiene", "night", "toothbrush"],
            ["weekend_laundry", "Wash, fold and put away laundry", "weekend", "laundry-basket"],
            ["weekend_trash", "Take out trash / recycling", "weekend", "trash"],
            ["weekend_kitchen", "Kitchen reset / dishes", "weekend", "dishes"],
            ["weekend_bathroom", "Bathroom reset", "weekend", "room-reset"],
            ["weekend_bedroom", "Bedroom reset", "weekend", "bed"]
        ]
    };
    // --- Supabase Client + Kid Profile Persistence ---
    function client() {
        const supabase = window.HomeOS?.supabase;
        if (!supabase)
            throw new Error("HomeOS Supabase client is not ready.");
        return supabase;
    }
    async function getProfileState(personId) {
        if (!personId)
            return { data: null, error: null };
        const { data, error } = await client().rpc("homeos_kid_routine_admin_state", { p_family_member_id: personId });
        return { data: data || null, error };
    }
    async function saveProfile({ personId, birthDate, ageBand, displayMode, schoolDays, morningEnabled, backpackEnabled, afterSchoolEnabled, nightEnabled, weekendEnabled }) {
        const { data, error } = await client().rpc("homeos_save_kid_routine_profile", {
            p_family_member_id: personId,
            p_birth_date: birthDate || null,
            p_age_band: ageBand || "auto",
            p_display_mode: displayMode || "auto",
            p_school_days: schoolDays || [],
            p_morning_enabled: Boolean(morningEnabled),
            p_backpack_enabled: Boolean(backpackEnabled),
            p_after_school_enabled: Boolean(afterSchoolEnabled),
            p_night_enabled: Boolean(nightEnabled),
            p_weekend_enabled: Boolean(weekendEnabled)
        });
        return { data: data || null, error };
    }
    // --- Birthday + Age Helpers ---
    function normalizeAge(value) {
        if (value === "" || value === null || value === undefined)
            return null;
        const age = Number.parseInt(String(value), 10);
        if (!Number.isFinite(age) || age < 1 || age > 18)
            return null;
        return age;
    }
    function normalizeDateKey(value) {
        const raw = String(value || "").trim();
        return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
    }
    function localTodayKey(date = new Date()) {
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }
    function ageFromBirthDate(value, today = new Date()) {
        const key = normalizeDateKey(value);
        if (!key)
            return null;
        const [year, month, day] = key.split("-").map(Number);
        if (!year || !month || !day)
            return null;
        const birth = new Date(year, month - 1, day, 12, 0, 0, 0);
        if (Number.isNaN(birth.getTime()) || birth > today)
            return null;
        let age = today.getFullYear() - year;
        const monthDelta = today.getMonth() - (month - 1);
        if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < day))
            age -= 1;
        return Math.max(0, age);
    }
    function storageDateForAge(age, existingDate = "", today = new Date()) {
        const safeAge = normalizeAge(age);
        if (safeAge === null)
            return null;
        if (existingDate && ageFromBirthDate(existingDate, today) === safeAge) {
            return normalizeDateKey(existingDate);
        }
        const year = today.getFullYear() - safeAge;
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }
    function bandForAge(age) {
        const safeAge = normalizeAge(age);
        if (safeAge === null)
            return null;
        if (safeAge <= 4)
            return "little";
        if (safeAge <= 10)
            return "school_age";
        return "teen";
    }
    function bandLabel(band) {
        return ({
            little: "Ages 1–4",
            school_age: "Ages 5–10",
            teen: "Ages 11–18"
        })[band] || "Ages 5–10";
    }
    function displayModeForBand(band) {
        return ({
            little: "picture",
            school_age: "picture_text",
            teen: "text"
        })[band] || "picture_text";
    }
    function ageFromProfile(profile) {
        if (!profile)
            return null;
        const stored = ageFromBirthDate(profile.birth_date);
        return stored !== null && stored >= 1 && stored <= 18 ? stored : null;
    }
    // --- Recurrence + Starter-pack Helpers ---
    function dayRule(days) {
        const codeByDay = { 1: "MO", 2: "TU", 3: "WE", 4: "TH", 5: "FR", 6: "SA", 7: "SU" };
        const codes = [...new Set((days || []).map(Number))]
            .filter(day => codeByDay[day])
            .sort((a, b) => a - b)
            .map(day => codeByDay[day]);
        if (!codes.length)
            return null;
        if (codes.length === 7)
            return "FREQ=DAILY";
        return `FREQ=WEEKLY;BYDAY=${codes.join(",")}`;
    }
    function ruleForRoutine(routine, schoolDays) {
        if (["morning", "night"].includes(routine))
            return "FREQ=DAILY";
        if (["backpack", "after_school"].includes(routine))
            return dayRule(schoolDays || DEFAULT_SCHOOL_DAYS);
        if (routine === "weekend")
            return "FREQ=WEEKLY;BYDAY=SA,SU";
        return "FREQ=DAILY";
    }
    function starterPack(band, schoolDays = DEFAULT_SCHOOL_DAYS) {
        return (PACKS[band] || PACKS.school_age).map((item, index) => {
            const [starterKey, title, routineType, iconKey] = item;
            return {
                starter_key: starterKey,
                title,
                details: null,
                routine_type: routineType,
                icon_key: iconKey,
                sort_order: index,
                recurrence_rule: ruleForRoutine(routineType, schoolDays),
                due_time: null,
                program_id: null,
                program_name: null
            };
        });
    }
    // --- Mission Metadata Helpers ---
    function sourceTypeForMission(item) {
        const routine = String(item?.routine_type || "general").toLowerCase().replace(/[^a-z0-9_]+/g, "_");
        return `kid_age_${routine}`;
    }
    function starterMarker(item) {
        return `HOMEOS_KID_AGE:${String(item?.starter_key || "mission")}`;
    }
    function customMarker(key) {
        return `HOMEOS_KID_CUSTOM:${String(key || "mission")}`;
    }
    function missionMarker(details, sourceType = "") {
        const raw = String(details || "");
        const ageMatch = raw.match(/^HOMEOS_KID_AGE:([^\n\r]+)/);
        if (ageMatch) {
            return { kind: "auto", key: ageMatch[1].trim() };
        }
        const customMatch = raw.match(/^HOMEOS_KID_CUSTOM:([^\n\r]+)/);
        if (customMatch) {
            return { kind: "custom", key: customMatch[1].trim() };
        }
        const source = String(sourceType || "").toLowerCase();
        if (source.startsWith("kid_custom_")) {
            return { kind: "custom", key: source };
        }
        return { kind: "auto", key: raw || source || "mission" };
    }
    function starterDefinition(key) {
        for (const pack of Object.values(PACKS)) {
            const found = pack.find(item => item[0] === key);
            if (found) {
                return {
                    starter_key: found[0],
                    title: found[1],
                    routine_type: found[2],
                    icon_key: found[3]
                };
            }
        }
        return null;
    }
    function routineLabel(routine) {
        return ({
            morning: "Morning Routine",
            backpack: "Backpack",
            after_school: "After School",
            night: "Night Routine",
            weekend: "Weekend",
            general: "My Jobs"
        })[String(routine || "general").toLowerCase()] || "My Jobs";
    }
    // --- Universal Mission Reads + Writes ---
    async function householdForPerson(personId) {
        const { data, error } = await client()
            .from("family_members")
            .select("id,household_id")
            .eq("id", personId)
            .maybeSingle();
        return { data: data || null, error };
    }
    async function missionVisualState(taskIds = []) {
        const ids = [...new Set((taskIds || []).filter(Boolean))];
        if (!ids.length)
            return { data: new Map(), error: null };
        const { data, error } = await client()
            .from("kid_task_visuals")
            .select("task_id,image_url,storage_path,alt_text")
            .in("task_id", ids);
        if (error) {
            // Keep missions usable before the optional visuals migration is installed.
            return { data: new Map(), error };
        }
        return {
            data: new Map((data || []).map(row => [String(row.task_id), row])),
            error: null
        };
    }
    async function universalMissionState(personId) {
        if (!personId)
            return { data: [], error: null };
        const assignmentResult = await client()
            .from("task_assignments")
            .select("task_id")
            .eq("family_member_id", personId);
        if (assignmentResult.error)
            return { data: [], error: assignmentResult.error };
        const ids = [...new Set((assignmentResult.data || []).map(row => row.task_id).filter(Boolean))];
        if (!ids.length)
            return { data: [], error: null };
        const taskResult = await client()
            .from("tasks")
            .select("*")
            .in("id", ids)
            .or("source_type.like.kid_age_%,source_type.like.kid_custom_%")
            .order("created_at", { ascending: true });
        if (taskResult.error)
            return { data: [], error: taskResult.error };
        const visuals = await missionVisualState((taskResult.data || []).map(task => task.id));
        const visualMap = visuals.data || new Map();
        const tasks = (taskResult.data || []).map(task => {
            const marker = missionMarker(task.details, task.source_type);
            const source = String(task.source_type || "").toLowerCase();
            const routineType = source
                .replace(/^kid_age_/, "")
                .replace(/^kid_custom_/, "") || "general";
            const definition = marker.kind === "auto" ? starterDefinition(marker.key) : null;
            const visual = visualMap.get(String(task.id)) || null;
            return {
                ...task,
                starter_key: marker.key,
                mission_kind: marker.kind,
                is_custom: marker.kind === "custom",
                routine_type: routineType,
                routine_label: routineLabel(routineType),
                icon_key: definition?.icon_key || "home-job",
                image_url: visual?.image_url || null,
                image_storage_path: visual?.storage_path || null,
                image_alt: visual?.alt_text || null
            };
        });
        return { data: tasks, error: null, visualError: visuals.error || null };
    }
    async function saveUniversalMission({ personId, task = null, item, active = true }) {
        const householdResult = await householdForPerson(personId);
        if (householdResult.error || !householdResult.data?.household_id) {
            return { taskId: null, error: householdResult.error || new Error("Child household could not be resolved.") };
        }
        const dueDate = item?.recurrence_rule?.includes("FREQ=WEEKLY") ? localTodayKey() : null;
        const { data, error } = await client().rpc("homeos_save_task", {
            p_task_id: task?.id || null,
            p_title: item.title,
            p_details: starterMarker(item),
            p_source_type: sourceTypeForMission(item),
            p_source_record_id: null,
            p_target_type: null,
            p_room_id: null,
            p_zone_id: null,
            p_laundry_area_id: null,
            p_household_feature_id: null,
            p_assignment_mode: "individual",
            p_priority: "normal",
            p_due_date: dueDate,
            p_due_time: item.due_time || null,
            p_recurrence_rule: item.recurrence_rule || "FREQ=DAILY",
            p_recurrence_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
            p_recurrence_end_date: null,
            p_active: Boolean(active),
            p_assignments: [{
                    family_member_id: personId,
                    assignment_role: "assignee",
                    completion_required: true,
                    rotation_order: null
                }]
        });
        return { taskId: data || task?.id || null, error };
    }
    function starterPackNeedsSync(tasks, band, schoolDays = DEFAULT_SCHOOL_DAYS) {
        const desired = starterPack(band, schoolDays);
        const currentAuto = (tasks || []).filter(task => !task?.is_custom);
        const byKey = new Map(currentAuto.map(task => [String(task.starter_key || ""), task]));
        const desiredKeys = new Set(desired.map(item => String(item.starter_key)));
        if (currentAuto.length < desired.length)
            return true;
        for (const item of desired) {
            const existing = byKey.get(String(item.starter_key));
            if (!existing)
                return true;
            const existingRoutine = String(existing.routine_type || "general");
            if (String(existing.title || "") !== String(item.title || ""))
                return true;
            if (existingRoutine !== String(item.routine_type || "general"))
                return true;
            if (String(existing.recurrence_rule || "") !== String(item.recurrence_rule || ""))
                return true;
        }
        return currentAuto.some(task => !desiredKeys.has(String(task.starter_key || "")) && task.active !== false);
    }
    async function syncUniversalAgeMissions(personId, band, schoolDays = DEFAULT_SCHOOL_DAYS) {
        const desired = starterPack(band, schoolDays);
        const currentResult = await universalMissionState(personId);
        if (currentResult.error)
            return { data: currentResult.data || [], created: 0, error: currentResult.error };
        const current = currentResult.data || [];
        const currentAuto = current.filter(task => !task.is_custom);
        const byMarker = new Map(currentAuto.map(task => [String(task.starter_key || ""), task]));
        const desiredKeys = new Set(desired.map(item => item.starter_key));
        let created = 0;
        for (const item of desired) {
            const existing = byMarker.get(item.starter_key) || null;
            const active = existing ? existing.active !== false : true;
            const result = await saveUniversalMission({ personId, task: existing, item, active });
            if (result.error)
                return { data: current, created, error: result.error };
            if (!existing)
                created += 1;
        }
        for (const task of currentAuto) {
            if (desiredKeys.has(task.starter_key) || task.active === false)
                continue;
            const item = {
                starter_key: task.starter_key,
                title: task.title,
                routine_type: task.routine_type || String(task.source_type || "kid_age_general").replace(/^kid_age_/, ""),
                recurrence_rule: task.recurrence_rule || "FREQ=DAILY",
                due_time: task.due_time || null
            };
            const result = await saveUniversalMission({ personId, task, item, active: false });
            if (result.error)
                return { data: current, created, error: result.error };
        }
        const refreshed = await universalMissionState(personId);
        return { data: refreshed.data || [], created, error: refreshed.error || null };
    }
    // --- Mission Activation + Parent-created Missions ---
    async function setMissionActive(personId, taskId, active) {
        const state = await universalMissionState(personId);
        if (state.error)
            return { data: null, error: state.error };
        const task = (state.data || []).find(item => String(item.id) === String(taskId));
        if (!task)
            return { data: null, error: new Error("Mission could not be found.") };
        const householdResult = await householdForPerson(personId);
        if (householdResult.error || !householdResult.data?.household_id) {
            return { data: null, error: householdResult.error || new Error("Child household could not be resolved.") };
        }
        const { data, error } = await client().rpc("homeos_save_task", {
            p_task_id: task.id,
            p_title: task.title,
            p_details: task.details || (task.is_custom ? customMarker(task.starter_key) : starterMarker(task)),
            p_source_type: task.source_type,
            p_source_record_id: task.source_record_id || null,
            p_target_type: task.target_type || null,
            p_room_id: task.room_id || null,
            p_zone_id: task.zone_id || null,
            p_laundry_area_id: task.laundry_area_id || null,
            p_household_feature_id: task.household_feature_id || null,
            p_assignment_mode: "individual",
            p_priority: task.priority || "normal",
            p_due_date: task.due_date || null,
            p_due_time: task.due_time || null,
            p_recurrence_rule: task.recurrence_rule || "FREQ=DAILY",
            p_recurrence_timezone: task.recurrence_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
            p_recurrence_end_date: task.recurrence_end_date || null,
            p_active: Boolean(active),
            p_assignments: [{
                    family_member_id: personId,
                    assignment_role: "assignee",
                    completion_required: true,
                    rotation_order: null
                }]
        });
        return { data: data || task.id, error };
    }
    async function createCustomMission({ personId, title, routineType = "general" }) {
        const safeTitle = String(title || "").trim();
        if (!personId || !safeTitle) {
            return { data: null, error: new Error("Add a mission name first.") };
        }
        const routine = ["morning", "backpack", "after_school", "night", "weekend", "general"].includes(String(routineType))
            ? String(routineType)
            : "general";
        const key = (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`).replace(/[^a-zA-Z0-9-]/g, "");
        const item = {
            starter_key: key,
            title: safeTitle,
            routine_type: routine,
            recurrence_rule: ruleForRoutine(routine, DEFAULT_SCHOOL_DAYS),
            due_time: null
        };
        const householdResult = await householdForPerson(personId);
        if (householdResult.error || !householdResult.data?.household_id) {
            return { data: null, error: householdResult.error || new Error("Child household could not be resolved.") };
        }
        const dueDate = item.recurrence_rule?.includes("FREQ=WEEKLY") ? localTodayKey() : null;
        const { data, error } = await client().rpc("homeos_save_task", {
            p_task_id: null,
            p_title: item.title,
            p_details: customMarker(key),
            p_source_type: `kid_custom_${routine}`,
            p_source_record_id: null,
            p_target_type: null,
            p_room_id: null,
            p_zone_id: null,
            p_laundry_area_id: null,
            p_household_feature_id: null,
            p_assignment_mode: "individual",
            p_priority: "normal",
            p_due_date: dueDate,
            p_due_time: null,
            p_recurrence_rule: item.recurrence_rule || "FREQ=DAILY",
            p_recurrence_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
            p_recurrence_end_date: null,
            p_active: true,
            p_assignments: [{
                    family_member_id: personId,
                    assignment_role: "assignee",
                    completion_required: true,
                    rotation_order: null
                }]
        });
        if (error)
            return { data: null, error };
        const taskId = data || null;
        return {
            data: {
                id: taskId,
                title: item.title,
                details: customMarker(key),
                source_type: `kid_custom_${routine}`,
                source_record_id: null,
                active: true,
                recurrence_rule: item.recurrence_rule || "FREQ=DAILY",
                due_date: dueDate,
                due_time: null,
                starter_key: key,
                mission_kind: "custom",
                is_custom: true,
                routine_type: routine,
                routine_label: routineLabel(routine),
                icon_key: "home-job",
                image_url: null,
                image_storage_path: null,
                image_alt: null
            },
            error: null
        };
    }
    // --- Custom Mission Images ---
    async function uploadMissionImage({ personId, taskId, file }) {
        if (!personId || !taskId || !file) {
            return { data: null, error: new Error("Choose a mission picture first.") };
        }
        const householdResult = await householdForPerson(personId);
        if (householdResult.error || !householdResult.data?.household_id) {
            return { data: null, error: householdResult.error || new Error("Child household could not be resolved.") };
        }
        const householdId = householdResult.data.household_id;
        const safeName = String(file.name || "mission.jpg")
            .toLowerCase()
            .replace(/[^a-z0-9._-]+/g, "-")
            .replace(/^-+|-+$/g, "") || "mission.jpg";
        const path = `${householdId}/${personId}/${taskId}/${Date.now()}-${safeName}`;
        const upload = await client().storage
            .from(KID_IMAGE_BUCKET)
            .upload(path, file, { upsert: false, contentType: file.type || "image/jpeg" });
        if (upload.error)
            return { data: null, error: upload.error };
        const publicResult = client().storage.from(KID_IMAGE_BUCKET).getPublicUrl(path);
        const imageUrl = publicResult?.data?.publicUrl || "";
        if (!imageUrl)
            return { data: null, error: new Error("HOME OS could not create the mission image URL.") };
        const existing = await client()
            .from("kid_task_visuals")
            .select("storage_path")
            .eq("task_id", taskId)
            .maybeSingle();
        const upsert = await client()
            .from("kid_task_visuals")
            .upsert({
            task_id: taskId,
            household_id: householdId,
            family_member_id: personId,
            image_url: imageUrl,
            storage_path: path,
            alt_text: "Parent-selected mission picture",
            updated_at: new Date().toISOString()
        }, { onConflict: "task_id" });
        if (upsert.error) {
            await client().storage.from(KID_IMAGE_BUCKET).remove([path]);
            return { data: null, error: upsert.error };
        }
        const oldPath = existing?.data?.storage_path;
        if (oldPath && oldPath !== path) {
            await client().storage.from(KID_IMAGE_BUCKET).remove([oldPath]);
        }
        return { data: { image_url: imageUrl, storage_path: path }, error: null };
    }
    async function removeMissionImage(taskId) {
        if (!taskId)
            return { data: null, error: null };
        const existing = await client()
            .from("kid_task_visuals")
            .select("storage_path")
            .eq("task_id", taskId)
            .maybeSingle();
        if (existing.error)
            return { data: null, error: existing.error };
        const deleted = await client()
            .from("kid_task_visuals")
            .delete()
            .eq("task_id", taskId);
        if (deleted.error)
            return { data: null, error: deleted.error };
        if (existing.data?.storage_path) {
            await client().storage.from(KID_IMAGE_BUCKET).remove([existing.data.storage_path]);
        }
        return { data: true, error: null };
    }
    // --- Child State + Automatic Age-band Synchronization ---
    async function getState(personId) {
        if (!personId)
            return { data: null, error: null };
        const profileBundle = await getProfileState(personId);
        if (profileBundle.error && !profileBundle.data) {
            return { data: null, error: profileBundle.error };
        }
        let base = profileBundle.data || {};
        let profile = base.profile || null;
        const birthDate = normalizeDateKey(profile?.birth_date);
        const currentAge = birthDate ? ageFromBirthDate(birthDate) : null;
        const currentBand = currentAge !== null ? bandForAge(currentAge) : null;
        const savedBand = String(profile?.age_band || "").toLowerCase();
        const bandChanged = Boolean(currentBand && savedBand !== currentBand);
        if (birthDate && currentBand && bandChanged) {
            const schoolDays = Array.isArray(profile?.school_days) && profile.school_days.length
                ? profile.school_days
                : DEFAULT_SCHOOL_DAYS;
            const updated = await saveProfile({
                personId,
                birthDate,
                ageBand: currentBand,
                displayMode: displayModeForBand(currentBand),
                schoolDays,
                morningEnabled: profile?.morning_enabled !== false,
                backpackEnabled: profile?.backpack_enabled !== false,
                afterSchoolEnabled: profile?.after_school_enabled !== false,
                nightEnabled: profile?.night_enabled !== false,
                weekendEnabled: profile?.weekend_enabled !== false
            });
            if (!updated.error && updated.data) {
                base = updated.data;
                profile = base.profile || profile;
            }
        }
        let auto = await universalMissionState(personId);
        if (auto.error && profileBundle.error) {
            return { data: null, error: auto.error || profileBundle.error };
        }
        if (birthDate && currentBand) {
            const schoolDays = Array.isArray(profile?.school_days) && profile.school_days.length
                ? profile.school_days
                : DEFAULT_SCHOOL_DAYS;
            if (bandChanged || starterPackNeedsSync(auto.data || [], currentBand, schoolDays)) {
                const synced = await syncUniversalAgeMissions(personId, currentBand, schoolDays);
                if (!synced.error)
                    auto = synced;
            }
        }
        return {
            data: {
                ...base,
                profile: profile || base.profile || null,
                tasks: auto.data || []
            },
            error: profileBundle.error && !profile ? profileBundle.error : null
        };
    }
    async function configureChild({ personId, birthDate = "", age = null, seedIfNeeded = true }) {
        if (!personId) {
            return { data: null, seeded: false, error: new Error("Choose a child before saving Kids Mode.") };
        }
        const before = await getProfileState(personId);
        if (before.error && !before.data) {
            return { data: null, seeded: false, error: before.error };
        }
        const current = before.data || {};
        const currentProfile = current.profile || {};
        const exactBirthDate = normalizeDateKey(birthDate) ||
            (age !== null && age !== undefined ? storageDateForAge(age, currentProfile.birth_date) : "");
        const safeAge = ageFromBirthDate(exactBirthDate);
        if (!exactBirthDate || safeAge === null || safeAge < 1 || safeAge > 18) {
            return { data: null, seeded: false, error: new Error("Enter this child's birthday. Kids Mode currently supports ages 1 through 18.") };
        }
        const schoolDays = Array.isArray(currentProfile.school_days) && currentProfile.school_days.length
            ? currentProfile.school_days
            : DEFAULT_SCHOOL_DAYS;
        const newBand = bandForAge(safeAge);
        let profileData = current;
        const profileResult = await saveProfile({
            personId,
            birthDate: exactBirthDate,
            ageBand: newBand,
            displayMode: displayModeForBand(newBand),
            schoolDays,
            morningEnabled: currentProfile.morning_enabled !== false,
            backpackEnabled: currentProfile.backpack_enabled !== false,
            afterSchoolEnabled: currentProfile.after_school_enabled !== false,
            nightEnabled: currentProfile.night_enabled !== false,
            weekendEnabled: currentProfile.weekend_enabled !== false
        });
        if (profileResult.error) {
            return { data: null, seeded: false, error: profileResult.error };
        }
        profileData = profileResult.data || current;
        const missionResult = await syncUniversalAgeMissions(personId, newBand, schoolDays);
        if (missionResult.error) {
            return { data: profileData, seeded: false, error: missionResult.error };
        }
        const bundle = {
            ...(profileData || {}),
            profile: profileData?.profile || {
                ...currentProfile,
                birth_date: exactBirthDate,
                age_band: newBand,
                display_mode: displayModeForBand(newBand),
                school_days: schoolDays
            },
            tasks: missionResult.data || []
        };
        return {
            data: bundle,
            seeded: Boolean(seedIfNeeded && missionResult.created > 0),
            birthDate: exactBirthDate,
            age: safeAge,
            ageBand: newBand,
            ageBandLabel: bandLabel(newBand),
            displayMode: displayModeForBand(newBand),
            error: null
        };
    }
    // --- Public Service Api ---
    window.HomeOS.services.kidAge = {
        normalizeAge,
        normalizeDateKey,
        localTodayKey,
        ageFromBirthDate,
        ageFromProfile,
        bandForAge,
        bandLabel,
        displayModeForBand,
        routineLabel,
        getState,
        configureChild,
        setMissionActive,
        createCustomMission,
        uploadMissionImage,
        removeMissionImage
    };
})();
