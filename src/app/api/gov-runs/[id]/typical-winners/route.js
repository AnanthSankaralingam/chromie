import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { getGovProfileForUser } from "@/lib/gov/gov-profiles"
import {
  findTypicalContractWinners,
  TYPICAL_WINNERS_MATCH_VERSION,
} from "@/lib/gov/usaspending-typical-winners"

export const runtime = "nodejs"

export const GET = withAuth(async ({ supabase, user, params }) => {
  try {
    const { id } = await params
    const govProfile = await getGovProfileForUser(supabase, user.id)
    if (!govProfile) {
      return NextResponse.json({ error: "No gov profile linked" }, { status: 403 })
    }

    const { data: run, error: runError } = await supabase
      .from("gov_runs")
      .select(
        "id, gov_profile_id, title, agency, source, source_ref, contract_summary, source_payload, analysis_payload",
      )
      .eq("id", id)
      .eq("gov_profile_id", govProfile.id)
      .maybeSingle()

    if (runError) {
      return NextResponse.json({ error: runError.message }, { status: 500 })
    }
    if (!run) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 })
    }

    const cached = run.analysis_payload?.typical_winners
    if (
      cached?.generated_at &&
      Array.isArray(cached?.winners) &&
      Number(cached?.match_version || 0) >= TYPICAL_WINNERS_MATCH_VERSION
    ) {
      return NextResponse.json({ typical_winners: cached, cached: true })
    }

    const typicalWinners = await findTypicalContractWinners({ run, govProfile })
    const nextPayload = {
      ...(run.analysis_payload && typeof run.analysis_payload === "object" ? run.analysis_payload : {}),
      typical_winners: typicalWinners,
    }

    const { error: updateError } = await supabase
      .from("gov_runs")
      .update({ analysis_payload: nextPayload })
      .eq("id", run.id)
      .eq("gov_profile_id", govProfile.id)

    if (updateError) {
      console.error("[gov-runs typical-winners] cache update failed", updateError)
    }

    return NextResponse.json({
      typical_winners: typicalWinners,
      cached: false,
      cache_error: updateError?.message || null,
    })
  } catch (err) {
    console.error("[gov-runs typical-winners GET]", err)
    return NextResponse.json(
      { error: err.message || "Failed to load typical winners" },
      { status: 500 },
    )
  }
})
