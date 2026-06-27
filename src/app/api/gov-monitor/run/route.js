import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { getGovProfileForUser, mergeGovProfileIntoScenarioParams } from "@/lib/gov-profiles"
import { invokeWorkflowLambda } from "@/lib/workflow-lambda"
import { GOV_WORKFLOW_SCENARIOS } from "@/lib/workflow-automations"

const GOV_MONITOR_SCENARIOS = GOV_WORKFLOW_SCENARIOS.map(({ id, label }) => ({
  id,
  name: label,
}))

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
    const ensured = await Promise.allSettled(
      GOV_MONITOR_SCENARIOS.map((scenario) =>
        ensureAutomation({ supabase, user, govProfile, scenario }),
      ),
    )

    const automations = ensured
      .filter((outcome) => outcome.status === "fulfilled")
      .map((outcome) => outcome.value)
    const ensureFailures = ensured
      .map((outcome, index) => ({
        outcome,
        scenario_id: GOV_WORKFLOW_SCENARIOS[index]?.id,
      }))
      .filter(({ outcome }) => outcome.status === "rejected")
      .map(({ outcome, scenario_id }) => ({
        scenario_id,
        error: outcome.reason?.message || String(outcome.reason),
      }))

    const samAutomation =
      automations.find((automation) => automation.scenario_id === "morphworks_sam_gov") || null
    const sbirAutomation =
      automations.find((automation) => automation.scenario_id === "morphworks_sbir_tech_marketplace") ||
      null

    if (!samAutomation) {
      return NextResponse.json(
        {
          error:
            ensureFailures.find((failure) => failure.scenario_id === "morphworks_sam_gov")?.error ||
            "Failed to initialize the SAM.gov monitor automation",
          ensureFailures,
        },
        { status: 500 },
      )
    }

    if (!sbirAutomation) {
      return NextResponse.json(
        {
          error:
            ensureFailures.find(
              (failure) => failure.scenario_id === "morphworks_sbir_tech_marketplace",
            )?.error || "Failed to initialize the SBIR Tech Marketplace monitor automation",
          ensureFailures,
        },
        { status: 500 },
      )
    }

    const result = await invokeWorkflowLambda({
      automation_id: samAutomation.id,
      gov_dual_source: true,
      sbir_automation_id: sbirAutomation.id,
    })

    return NextResponse.json({
      ok: true,
      automations,
      ensureFailures,
      invocation: {
        automation_id: samAutomation.id,
        scenario_id: samAutomation.scenario_id,
        gov_dual_source: true,
        sbir_automation_id: sbirAutomation.id,
        ...result,
      },
      message:
        "Government contract monitor started on Lambda (SAM.gov + SBIR in one run). Runs usually take 1-5 minutes.",
    })
  } catch (err) {
    console.error("[gov-monitor/run]", err)
    return NextResponse.json(
      { error: err.message || "Failed to start government monitor workflow" },
      { status: 500 },
    )
  }
})
