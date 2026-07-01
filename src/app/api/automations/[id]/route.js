import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import {
  resolveScheduleFieldsFromBody,
  syncAndPersistAutomationSchedule,
} from "@/lib/workflow/automation-schedule-sync"
import { deleteAutomationSchedules } from "@/lib/workflow/workflow-schedule"
import { EMAIL_DELIVERY_SCENARIO_IDS } from "@/lib/workflow/workflow-automations"

async function getOwnedAutomation(supabase, userId, id) {
  const { data, error } = await supabase
    .from("automations")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single()
  if (error || !data) return null
  return data
}

export const GET = withAuth(async ({ supabase, user, params }) => {
  const { id } = await params
  const row = await getOwnedAutomation(supabase, user.id, id)
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ automation: row })
})

export const PATCH = withAuth(async ({ request, supabase, user, params }) => {
  const { id } = await params
  const existing = await getOwnedAutomation(supabase, user.id, id)
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json()
  if (
    body.params !== undefined &&
    EMAIL_DELIVERY_SCENARIO_IDS.has(existing.scenario_id) &&
    !String(body.params.recipient_email || "").trim()
  ) {
    return NextResponse.json(
      { error: "recipient_email is required for this workflow" },
      { status: 400 },
    )
  }
  const updates = {}
  for (const key of ["name", "params", "env_overrides", "enabled"]) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  const scheduleTouched =
    body.schedule_kind !== undefined ||
    body.schedule_enabled !== undefined ||
    body.cron_expression !== undefined ||
    body.schedule_frequency !== undefined ||
    body.schedule_time !== undefined ||
    body.schedule_times !== undefined ||
    body.schedule_timezone !== undefined

  if (scheduleTouched) {
    try {
      Object.assign(updates, resolveScheduleFieldsFromBody(body, existing))
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
  } else if (body.enabled !== undefined && existing.schedule_kind === "cron") {
    updates.schedule_kind = existing.schedule_kind
    updates.cron_expression = existing.cron_expression
    updates.schedule_timezone = existing.schedule_timezone
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from("automations")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const shouldSyncSchedule =
    scheduleTouched ||
    (body.enabled !== undefined && data.schedule_kind === "cron")

  if (shouldSyncSchedule) {
    try {
      const synced = await syncAndPersistAutomationSchedule(supabase, data)
      return NextResponse.json({ automation: synced })
    } catch (err) {
      return NextResponse.json(
        { error: err.message || "Failed to update schedule" },
        { status: 500 },
      )
    }
  }

  return NextResponse.json({ automation: data })
})

export const DELETE = withAuth(async ({ supabase, user, params }) => {
  const { id } = await params
  const existing = await getOwnedAutomation(supabase, user.id, id)
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    await deleteAutomationSchedules(id)
  } catch (err) {
    console.error("[automations/delete] schedule cleanup:", err)
  }

  const { error } = await supabase.from("automations").delete().eq("id", id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
})
