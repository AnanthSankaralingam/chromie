import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { getGovProfileForUser } from "@/lib/gov-profiles"

export const GET = withAuth(async ({ request, supabase, user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "", 10)
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 50)
      : null

    const govProfile = await getGovProfileForUser(supabase, user.id)
    if (!govProfile) {
      return NextResponse.json({ error: "No gov profile linked" }, { status: 403 })
    }

    let query = supabase
      .from("gov_runs")
      .select(
        "id, title, agency, customer_name, source, source_ref, source_url, contract_summary, published_date, response_date, fit_score, fit_rationale, profile_fit_verified, scenario_id, created_at, updated_at",
      )
      .eq("gov_profile_id", govProfile.id)
      .order("fit_score", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ runs: data ?? [], gov_profile: { id: govProfile.id, name: govProfile.name } })
  } catch (err) {
    console.error("[gov-runs GET]", err)
    return NextResponse.json({ error: err.message || "Failed to load opportunities" }, { status: 500 })
  }
})
