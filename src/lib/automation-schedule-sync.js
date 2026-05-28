/**
 * Apply schedule fields from API request body and sync EventBridge Scheduler.
 */

import {
  cronExpressionFromScheduleInput,
  syncAutomationSchedule,
  deleteAutomationSchedules,
} from "@/lib/workflow-schedule"
import { normalizeTimes } from "@/lib/workflow-schedule-cron"

/**
 * @param {object} body - Request JSON
 * @param {object} [existing] - Existing automation row on PATCH
 */
export function resolveScheduleFieldsFromBody(body, existing = {}) {
  const schedule_kind =
    body.schedule_kind !== undefined
      ? body.schedule_kind === "cron"
        ? "cron"
        : "on_demand"
      : existing.schedule_kind || "on_demand"

  const schedule_timezone =
    body.schedule_timezone !== undefined
      ? String(body.schedule_timezone || "UTC").trim() || "UTC"
      : existing.schedule_timezone || "UTC"

  if (body.schedule_enabled === false || schedule_kind === "on_demand") {
    return {
      schedule_kind: "on_demand",
      cron_expression: null,
      schedule_timezone,
    }
  }

  if (body.schedule_enabled === true || schedule_kind === "cron") {
    const times =
      body.schedule_times?.length > 0
        ? body.schedule_times
        : body.schedule_time
          ? [body.schedule_time]
          : existing.cron_expression
            ? undefined
            : null

    if (!times) {
      throw new Error("Add at least one run time when scheduling is enabled")
    }

    const normalized = normalizeTimes(times)
    const cron_expression = cronExpressionFromScheduleInput({
      frequency: body.schedule_frequency === "weekly" ? "weekly" : "daily",
      times: normalized,
      weekday: body.schedule_weekday,
      weekdays: body.schedule_weekdays,
    })

    return {
      schedule_kind: "cron",
      cron_expression,
      schedule_timezone,
    }
  }

  return {
    schedule_kind,
    cron_expression: existing.cron_expression || null,
    schedule_timezone,
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} automation
 */
export async function syncAndPersistAutomationSchedule(supabase, automation) {
  try {
    if (automation.schedule_kind === "cron" && automation.cron_expression) {
      const { eventbridge_schedule_name } = await syncAutomationSchedule(automation)
      if (eventbridge_schedule_name !== automation.eventbridge_schedule_name) {
        const { data, error } = await supabase
          .from("automations")
          .update({
            eventbridge_schedule_name,
            updated_at: new Date().toISOString(),
          })
          .eq("id", automation.id)
          .select()
          .single()
        if (error) throw error
        return data
      }
    } else {
      await deleteAutomationSchedules(automation.id)
      if (automation.eventbridge_schedule_name) {
        const { data, error } = await supabase
          .from("automations")
          .update({
            eventbridge_schedule_name: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", automation.id)
          .select()
          .single()
        if (error) throw error
        return data
      }
    }
  } catch (err) {
    console.error("[automation-schedule-sync]", err)
    throw err
  }
  return automation
}
