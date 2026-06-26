import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { getGovProfileForUser } from "@/lib/gov-profiles"

export const GET = withAuth(async ({ supabase, user }) => {
  try {
    const govProfile = await getGovProfileForUser(supabase, user.id)
    if (!govProfile) {
      return NextResponse.json({ error: "No gov profile linked" }, { status: 403 })
    }

    const { data, error } = await supabase
      .from("gov_runs")
      .select(
        "id, title, agency, customer_name, source, source_ref, source_url, contract_summary, published_date, response_date, fit_score, fit_rationale, profile_fit_verified, scenario_id, created_at, updated_at",
      )
      .eq("gov_profile_id", govProfile.id)
      .order("fit_score", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ runs: data ?? [], gov_profile: { id: govProfile.id, name: govProfile.name } })
  } catch (err) {
    console.error("[gov-runs GET]", err)
    return NextResponse.json({ error: err.message || "Failed to load opportunities" }, { status: 500 })
  }
})
