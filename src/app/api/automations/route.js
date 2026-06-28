import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import {
  resolveScheduleFieldsFromBody,
  syncAndPersistAutomationSchedule,
} from "@/lib/automation-schedule-sync"
import {
  EMAIL_DELIVERY_SCENARIO_IDS,
  GOV_PROFILE_SCENARIO_IDS,
  DEFAULT_WORKFLOW_SCENARIO_ID,
} from "@/lib/workflow-automations"
import { syncedGovAutomationParams } from "@/lib/gov-automation-sync"
import {
  getGovProfileForUser,
  mergeGovProfileIntoScenarioParams,
} from "@/lib/gov-profiles"
import { createServiceClient } from "@/lib/supabase/service"

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
  const scenario_id = body.scenario_id || DEFAULT_WORKFLOW_SCENARIO_ID
  const name = (body.name || "Workflow automation").trim()
  const isGovScenario = GOV_PROFILE_SCENARIO_IDS.has(scenario_id)

  let govProfile = null
  try {
    govProfile = await getGovProfileForUser(supabase, user.id)
  } catch (err) {
    console.error("[automations POST] gov profile lookup failed:", err)
  }
  const service = isGovScenario && govProfile ? createServiceClient() : null
  const automationClient = service || supabase

  const defaults = mergeGovProfileIntoScenarioParams(
    govProfile,
    scenario_id,
    user.email || "",
  )
  const params = body.params
    ? govProfile
      ? syncedGovAutomationParams(body.params, govProfile, scenario_id, user.email || "")
      : body.params
    : defaults
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

  if (body.ensure_singleton) {
    let existingQuery = automationClient
      .from("automations")
      .select("*")
      .eq("scenario_id", scenario_id)
      .order("updated_at", { ascending: false })
      .limit(1)

    existingQuery = isGovScenario && govProfile
      ? existingQuery.eq("gov_profile_id", govProfile.id)
      : existingQuery.eq("user_id", user.id)

    const { data: existing, error: existingError } = await existingQuery.maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }
    if (existing) {
      return NextResponse.json({ automation: existing })
    }
  }

  const { data, error } = await automationClient
    .from("automations")
    .insert({
      user_id: user.id,
      gov_profile_id: isGovScenario && govProfile ? govProfile.id : null,
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
    const synced = await syncAndPersistAutomationSchedule(automationClient, data)
    return NextResponse.json({ automation: synced })
  } catch (err) {
    await automationClient.from("automations").delete().eq("id", data.id)
    return NextResponse.json(
      { error: err.message || "Failed to configure schedule" },
      { status: 500 },
    )
  }
})
