import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { getGovProfileForUser, mergeGovProfileIntoScenarioParams } from "@/lib/gov-profiles"
import { invokeWorkflowLambda } from "@/lib/workflow-lambda"

const GOV_WORKFLOW_SCENARIOS = [
  {
    id: "morphworks_sam_gov",
    name: "SAM.gov opportunity search",
  },
  {
    id: "morphworks_sbir_tech_marketplace",
    name: "SBIR Tech Marketplace search",
  },
]

async function ensureAutomation({ supabase, user, govProfile, scenario }) {
  const { data: existing, error: existingError } = await supabase
    .from("automations")
    .select("*")
    .eq("user_id", user.id)
    .eq("scenario_id", scenario.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }
  if (existing) {
    return existing
  }

  const params = mergeGovProfileIntoScenarioParams(govProfile, scenario.id, user.email || "")
  const { data, error } = await supabase
    .from("automations")
    .insert({
      user_id: user.id,
      name: scenario.name,
      scenario_id: scenario.id,
      params,
      env_overrides: {},
      enabled: true,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }
  return data
}

export const POST = withAuth(async ({ supabase, user }) => {
  let govProfile = null
  try {
    govProfile = await getGovProfileForUser(supabase, user.id)
  } catch (err) {
    console.error("[gov-monitor/run] gov profile lookup failed:", err)
  }

  if (!govProfile) {
    return NextResponse.json({ error: "No gov profile linked" }, { status: 403 })
  }

  try {
    const automations = await Promise.all(
      GOV_WORKFLOW_SCENARIOS.map((scenario) =>
        ensureAutomation({ supabase, user, govProfile, scenario }),
      ),
    )

    const invocations = await Promise.all(
      automations.map(async (automation) => {
        const result = await invokeWorkflowLambda({ automation_id: automation.id })
        return {
          automation_id: automation.id,
          scenario_id: automation.scenario_id,
          ...result,
        }
      }),
    )

    return NextResponse.json({
      ok: true,
      automations,
      invocations,
      message:
        "SAM.gov and SBIR Tech Marketplace workflows started on Lambda. Runs usually take 1-5 minutes.",
    })
  } catch (err) {
    console.error("[gov-monitor/run]", err)
    return NextResponse.json(
      { error: err.message || "Failed to start government monitor workflows" },
      { status: 500 },
    )
  }
})
