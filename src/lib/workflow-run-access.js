/** Verify the user owns an automation run before proxying Browserbase APIs. */

import { createServiceClient } from "@/lib/supabase/service"
import { GOV_PROFILE_SCENARIO_IDS } from "@/lib/workflow-automations"
import { getUserGovProfileId } from "@/lib/gov-workflow-access"

const WORKFLOW_RUN_ACCESS_SELECT =
  "id, status, browserbase_session_id, browserbase_debug_url, evaluation"

export async function getOwnedWorkflowRun(supabase, userId, automationId, runId) {
  const { data: automation } = await supabase
    .from("automations")
    .select("id")
    .eq("id", automationId)
    .eq("user_id", userId)
    .single()

  if (!automation) return null

  const { data: run, error } = await supabase
    .from("workflow_runs")
    .select(WORKFLOW_RUN_ACCESS_SELECT)
    .eq("id", runId)
    .eq("automation_id", automationId)
    .single()

  if (error || !run) return null
  return run
}

/** Owner access, or gov teammates viewing shared government monitor runs. */
export async function getAccessibleWorkflowRun(supabase, userId, automationId, runId) {
  const owned = await getOwnedWorkflowRun(supabase, userId, automationId, runId)
  if (owned) return owned

  const service = createServiceClient()
  if (!service) return null

  let govProfileId
  try {
    govProfileId = await getUserGovProfileId(supabase, userId)
  } catch {
    return null
  }
  if (!govProfileId) return null

  const { data: automation } = await service
    .from("automations")
    .select("id, user_id, scenario_id, gov_profile_id")
    .eq("id", automationId)
    .maybeSingle()

  if (!automation || !GOV_PROFILE_SCENARIO_IDS.has(automation.scenario_id)) {
    return null
  }

  if (automation.gov_profile_id === govProfileId) {
    const { data: run, error } = await service
      .from("workflow_runs")
      .select(WORKFLOW_RUN_ACCESS_SELECT)
      .eq("id", runId)
      .eq("automation_id", automationId)
      .maybeSingle()

    if (error || !run) return null
    return run
  }

  if (!automation.user_id) {
    return null
  }

  const { data: ownerProfile } = await service
    .from("profiles")
    .select("gov_profile_id")
    .eq("id", automation.user_id)
    .maybeSingle()

  if (ownerProfile?.gov_profile_id !== govProfileId) {
    return null
  }

  const { data: run, error } = await service
    .from("workflow_runs")
    .select(WORKFLOW_RUN_ACCESS_SELECT)
    .eq("id", runId)
    .eq("automation_id", automationId)
    .maybeSingle()

  if (error || !run) return null
  return run
}
