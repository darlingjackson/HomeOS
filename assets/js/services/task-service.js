/* ============================================================
   HOMEOS // TASK SERVICE

   Shared task creation, assignment, occurrences and completion.
============================================================ */

(function createHomeOSTaskService() {
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

    async function getAssignablePeople(householdId) {
        const { data, error } = await client()
            .from("family_members")
            .select(`
                id,
                household_id,
                display_name,
                member_type,
                relationship_label,
                auth_user_id,
                can_be_assigned,
                active,
                color,
                sort_order
            `)
            .eq("household_id", householdId)
            .eq("active", true)
            .eq("can_be_assigned", true)
            .order("sort_order", { ascending: true })
            .order("display_name", { ascending: true });

        return {
            data: data || [],
            error
        };
    }

    async function listTasks(
        householdId,
        {
            sourceType = null,
            sourceTypes = [],
            activeOnly = true
        } = {}
    ) {
        let query = client()
            .from("tasks")
            .select("*")
            .eq("household_id", householdId)
            .order("created_at", { ascending: false });

        const filteredSourceTypes = Array.isArray(sourceTypes)
            ? sourceTypes.filter(Boolean)
            : [];

        if (filteredSourceTypes.length) {
            query = query.in("source_type", filteredSourceTypes);
        } else if (sourceType) {
            query = query.eq("source_type", sourceType);
        }

        if (activeOnly) {
            query = query.eq("active", true);
        }

        const { data, error } = await query;

        return {
            data: data || [],
            error
        };
    }

    async function getAssignments(taskIds) {
        const ids = Array.isArray(taskIds)
            ? taskIds.filter(Boolean)
            : [];

        if (!ids.length) {
            return {
                data: [],
                error: null
            };
        }

        const { data, error } = await client()
            .from("task_assignments")
            .select(`
                id,
                household_id,
                task_id,
                family_member_id,
                assignment_role,
                completion_required,
                rotation_order,
                created_at
            `)
            .in("task_id", ids)
            .order("rotation_order", {
                ascending: true,
                nullsFirst: false
            });

        return {
            data: data || [],
            error
        };
    }

    async function getTaskBundle(taskId) {
        const taskResult = await client()
            .from("tasks")
            .select("*")
            .eq("id", taskId)
            .single();

        if (taskResult.error) {
            return {
                data: null,
                error: taskResult.error
            };
        }

        const assignmentResult = await getAssignments([taskId]);

        return {
            data: {
                task: taskResult.data,
                assignments: assignmentResult.data
            },
            error: assignmentResult.error
        };
    }

    async function saveTask(task) {
        const timezone =
            task.recurrenceTimezone ||
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            "UTC";

        const { data, error } = await client().rpc("homeos_save_task", {
            p_task_id: task.id || null,
            p_title: task.title,
            p_details: task.details || null,
            p_source_type: task.sourceType || "custom",
            p_source_record_id: task.sourceRecordId || null,
            p_target_type: task.targetType || null,
            p_room_id: task.roomId || null,
            p_zone_id: task.zoneId || null,
            p_laundry_area_id: task.laundryAreaId || null,
            p_household_feature_id: task.householdFeatureId || null,
            p_assignment_mode: task.assignmentMode || "anyone",
            p_priority: task.priority || "normal",
            p_due_date: task.dueDate || null,
            p_due_time: task.dueTime || null,
            p_recurrence_rule: task.recurrenceRule || null,
            p_recurrence_timezone: timezone,
            p_recurrence_end_date: task.recurrenceEndDate || null,
            p_active: task.active !== false,
            p_assignments: task.assignments || []
        });

        return {
            taskId: data || null,
            error
        };
    }

    async function archiveTask(task) {
        return saveTask({
            ...task,
            active: false
        });
    }

    async function ensureOccurrence(taskId, dueAt = null) {
        const { data, error } = await client().rpc(
            "homeos_ensure_task_occurrence",
            {
                p_task_id: taskId,
                p_due_at: dueAt
                    ? new Date(dueAt).toISOString()
                    : null
            }
        );

        return {
            occurrenceId: data || null,
            error
        };
    }

    async function setCompletion({
        occurrenceId,
        familyMemberId = null,
        complete = true,
        notes = null
    }) {
        const { data, error } = await client().rpc(
            "homeos_set_task_completion",
            {
                p_occurrence_id: occurrenceId,
                p_family_member_id: familyMemberId,
                p_complete: Boolean(complete),
                p_notes: notes || null
            }
        );

        return { data, error };
    }

    async function setOccurrenceStatus(occurrenceId, status) {
        const { data, error } = await client().rpc(
            "homeos_set_task_occurrence_status",
            {
                p_occurrence_id: occurrenceId,
                p_status: status
            }
        );

        return {
            status: data || null,
            error
        };
    }

    async function getOccurrences(
        householdId,
        {
            taskIds = [],
            start = null,
            end = null,
            statuses = []
        } = {}
    ) {
        let query = client()
            .from("task_occurrences")
            .select("*")
            .eq("household_id", householdId)
            .order("due_at", {
                ascending: true,
                nullsFirst: false
            });

        if (Array.isArray(taskIds) && taskIds.length) {
            query = query.in("task_id", taskIds);
        }

        if (start) {
            query = query.gte(
                "due_at",
                new Date(start).toISOString()
            );
        }

        if (end) {
            query = query.lt(
                "due_at",
                new Date(end).toISOString()
            );
        }

        if (Array.isArray(statuses) && statuses.length) {
            query = query.in("status", statuses);
        }

        const { data, error } = await query;

        return {
            data: data || [],
            error
        };
    }

    async function getCompletions(occurrenceIds) {
        const ids = Array.isArray(occurrenceIds)
            ? occurrenceIds.filter(Boolean)
            : [];

        if (!ids.length) {
            return {
                data: [],
                error: null
            };
        }

        const { data, error } = await client()
            .from("task_occurrence_completions")
            .select(`
                id,
                household_id,
                occurrence_id,
                family_member_id,
                completed_by_user_id,
                completed_at,
                notes
            `)
            .in("occurrence_id", ids)
            .order("completed_at", { ascending: true });

        return {
            data: data || [],
            error
        };
    }

    function groupAssignmentsByTask(assignments) {
        return (assignments || []).reduce((grouped, assignment) => {
            grouped[assignment.task_id] =
                grouped[assignment.task_id] || [];

            grouped[assignment.task_id].push(assignment);
            return grouped;
        }, {});
    }

    function assignmentModeLabel(mode) {
        return {
            anyone: "Anyone",
            shared: "Shared",
            individual: "Individual",
            owner_helpers: "Owner + Helpers",
            rotation: "Rotation"
        }[mode] || "Anyone";
    }

    window.HomeOS.services.tasks = {
        getAssignablePeople,
        listTasks,
        getAssignments,
        getTaskBundle,
        saveTask,
        archiveTask,
        ensureOccurrence,
        setCompletion,
        setOccurrenceStatus,
        getOccurrences,
        getCompletions,
        groupAssignmentsByTask,
        assignmentModeLabel
    };
})();
