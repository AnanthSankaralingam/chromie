/**
 * Apply schedule fields from API request body and sync EventBridge Scheduler.
 */

import { buildCronExpression } from "@/lib/workflow-schedule-cron"
import { syncAutomationSchedule, deleteAutomationSchedule } from "@/lib/workflow-schedule"

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

  let cron_expression =
    body.cron_expression !== undefined ? body.cron_expression : existing.cron_expression

  if (body.schedule_enabled === false || schedule_kind === "on_demand") {
    return {
      schedule_kind: "on_demand",
      cron_expression: null,
      schedule_timezone,
    }
  }

  if (body.schedule_enabled === true || schedule_kind === "cron") {
    if (body.schedule_frequency && body.schedule_time) {
      cron_expression = buildCronExpression({
        frequency: body.schedule_frequency === "weekly" ? "weekly" : "daily",
        time: body.schedule_time,
        weekday: body.schedule_weekday,
        weekdays: body.schedule_weekdays,
      })
    }
    if (!cron_expression) {
      throw new Error("A schedule time is required when scheduling is enabled")
    }
    return {
      schedule_kind: "cron",
      cron_expression,
      schedule_timezone,
    }
  }

  return {
    schedule_kind,
    cron_expression: cron_expression || null,
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
      await deleteAutomationSchedule(
        automation.id,
        automation.eventbridge_schedule_name || undefined,
      )
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
