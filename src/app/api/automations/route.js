import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import {
  resolveScheduleFieldsFromBody,
  syncAndPersistAutomationSchedule,
} from "@/lib/automation-schedule-sync"
import {
  EMAIL_DELIVERY_SCENARIO_IDS,
  defaultParamsForScenario,
} from "@/lib/workflow-automations"

export const GET = withAuth(async ({ supabase, user }) => {
  const { data, error } = await supabase
    .from("automations")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ automations: data || [] })
})

export const POST = withAuth(async ({ request, supabase, user }) => {
  const body = await request.json()
  const scenario_id = body.scenario_id || "zillow_listing_alert"
  const name = (body.name || "Workflow automation").trim()
  const params =
    body.params || defaultParamsForScenario(scenario_id, user.email || "")
  let scheduleFields
  try {
    scheduleFields = resolveScheduleFieldsFromBody(body)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  if (EMAIL_DELIVERY_SCENARIO_IDS.has(scenario_id)) {
    const email = String(params.recipient_email || user.email || "").trim()
    if (!email) {
      return NextResponse.json(
        { error: "recipient_email is required for this workflow" },
        { status: 400 },
      )
    }
    params.recipient_email = email
  }

  const { data, error } = await supabase
    .from("automations")
    .insert({
      user_id: user.id,
      name,
      scenario_id,
      params,
      env_overrides: body.env_overrides || {},
      ...scheduleFields,
      enabled: body.enabled !== false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  try {
    const synced = await syncAndPersistAutomationSchedule(supabase, data)
    return NextResponse.json({ automation: synced })
  } catch (err) {
    await supabase.from("automations").delete().eq("id", data.id)
    return NextResponse.json(
      { error: err.message || "Failed to configure schedule" },
      { status: 500 },
    )
  }
})
