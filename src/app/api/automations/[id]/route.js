import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { EMAIL_DELIVERY_SCENARIO_IDS } from "@/lib/workflow-automations"

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
  for (const key of [
    "name",
    "params",
    "env_overrides",
    "schedule_kind",
    "cron_expression",
    "enabled",
  ]) {
    if (body[key] !== undefined) updates[key] = body[key]
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
  return NextResponse.json({ automation: data })
})

export const DELETE = withAuth(async ({ supabase, user, params }) => {
  const { id } = await params
  const existing = await getOwnedAutomation(supabase, user.id, id)
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { error } = await supabase.from("automations").delete().eq("id", id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
})
