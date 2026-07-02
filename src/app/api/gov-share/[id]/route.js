import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PAGE_SIZE = 1000

function notFoundResponse() {
  return NextResponse.json({ error: "Share page not found" }, { status: 404 })
}

async function fetchAllGovRuns(service, govProfileId) {
  const runs = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1
    const { data, error } = await service
      .from("gov_runs")
      .select(
        "id, title, agency, customer_name, source, source_ref, source_url, contract_summary, published_date, response_date, fit_score, fit_rationale, profile_fit_verified, analysis_payload, likely_competitors, created_at, updated_at",
      )
      .eq("gov_profile_id", govProfileId)
      .order("fit_score", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) {
      throw new Error(error.message)
    }

    const page = data ?? []
    runs.push(...page)
    if (page.length < PAGE_SIZE) break
  }

  return runs
}

export async function GET(_request, context) {
  try {
    const { id } = await context.params
    if (!UUID_RE.test(String(id || ""))) {
      return notFoundResponse()
    }

    const service = createServiceClient()
    if (!service) {
      return NextResponse.json(
        { error: "Server is missing Supabase service credentials." },
        { status: 500 },
      )
    }

    const { data: govProfile, error: profileError } = await service
      .from("gov_profiles")
      .select("id, name, company_domain, corporate_overview")
      .eq("id", id)
      .eq("share_enabled", true)
      .maybeSingle()

    if (profileError) {
      throw new Error(profileError.message)
    }
    if (!govProfile) {
      return notFoundResponse()
    }

    const runs = await fetchAllGovRuns(service, govProfile.id)
    console.log("[gov-share GET] loaded public share runs", {
      gov_profile_id: govProfile.id,
      run_count: runs.length,
    })

    return NextResponse.json({ gov_profile: govProfile, runs })
  } catch (err) {
    console.error("[gov-share GET]", err)
    return NextResponse.json(
      { error: err.message || "Failed to load shared opportunities" },
      { status: 500 },
    )
  }
}
