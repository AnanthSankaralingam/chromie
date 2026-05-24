import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
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
  const schedule_kind = body.schedule_kind === "cron" ? "cron" : "on_demand"
  const cron_expression = body.cron_expression || null

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
      schedule_kind,
      cron_expression,
      enabled: body.enabled !== false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ automation: data })
})
