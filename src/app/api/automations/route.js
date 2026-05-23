import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"

const ZILLOW_DEFAULT_PARAMS = {
  id: "zillow_listing_alert",
  zillow_base_url: "https://www.zillow.com",
  filters: {
    city: "Suwanee, GA",
    min_price: 400000,
    max_price: 650000,
    min_beds: 3,
    property_type: "houses",
    listing_type: "for_sale",
  },
  recipient_email: "",
  email_subject: "Zillow listings matching your filters",
  min_addresses: 3,
}

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
  const name = (body.name || "Zillow listing alert").trim()
  const scenario_id = body.scenario_id || "zillow_listing_alert"
  const params = body.params || { ...ZILLOW_DEFAULT_PARAMS, recipient_email: user.email || "" }
  const schedule_kind = body.schedule_kind === "cron" ? "cron" : "on_demand"
  const cron_expression = body.cron_expression || null

  if (!params.recipient_email) {
    params.recipient_email = user.email || ""
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
