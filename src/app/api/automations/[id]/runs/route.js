import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { getUserGovProfileId } from "@/lib/gov-workflow-access"
import { createServiceClient } from "@/lib/supabase/service"
import { sanitizeRunForClient } from "@/lib/workflow-audit"
import { GOV_PROFILE_SCENARIO_IDS } from "@/lib/workflow-automations"

export const GET = withAuth(async ({ supabase, user, params }) => {
  const { id } = await params
  let runClient = supabase

  let { data: automation } = await supabase
    .from("automations")
    .select("id, scenario_id, gov_profile_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!automation) {
    const service = createServiceClient()
    const govProfileId = service ? await getUserGovProfileId(supabase, user.id).catch(() => null) : null

    if (service && govProfileId) {
      const { data: orgAutomation } = await service
        .from("automations")
        .select("id, scenario_id, gov_profile_id")
        .eq("id", id)
        .eq("gov_profile_id", govProfileId)
        .maybeSingle()

      if (orgAutomation && GOV_PROFILE_SCENARIO_IDS.has(orgAutomation.scenario_id)) {
        automation = orgAutomation
        runClient = service
      }
    }
  }

  if (!automation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { data: runs, error } = await runClient
    .from("workflow_runs")
    .select(
      "id, scenario_id, status, success, started_at, finished_at, duration_ms, browserbase_session_id, browserbase_debug_url, error_message, evaluation"
    )
    .eq("automation_id", id)
    .order("started_at", { ascending: false })
    .limit(30)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    runs: (runs || []).map((run) =>
      sanitizeRunForClient(
        {
          ...run,
          scenario_id: run.scenario_id || automation.scenario_id || null,
        },
        { log: true },
      ),
    ),
  })
})
