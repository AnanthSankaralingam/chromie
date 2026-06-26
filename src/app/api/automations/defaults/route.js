import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import {
  defaultParamsForScenario,
  DEFAULT_WORKFLOW_SCENARIO_ID,
} from "@/lib/workflow-automations"
import {
  getGovProfileForUser,
  mergeGovProfileIntoScenarioParams,
} from "@/lib/gov-profiles"

/** Default automation params, merged with linked gov profile when present. */
export const GET = withAuth(async ({ supabase, user, request }) => {
  const { searchParams } = new URL(request.url)
  const scenarioId = searchParams.get("scenario_id") || DEFAULT_WORKFLOW_SCENARIO_ID

  let govProfile = null
  try {
    govProfile = await getGovProfileForUser(supabase, user.id)
  } catch (err) {
    console.error("[automations/defaults GET]", err)
  }

  const params = govProfile
    ? mergeGovProfileIntoScenarioParams(govProfile, scenarioId, user.email || "")
    : defaultParamsForScenario(scenarioId, user.email || "")

  return NextResponse.json({
    params,
    gov_profile_id: govProfile?.id ?? null,
  })
})
