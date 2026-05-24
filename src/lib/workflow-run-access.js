/** Verify the user owns an automation run before proxying Browserbase APIs. */

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
    .select("id, status, browserbase_session_id, browserbase_debug_url")
    .eq("id", runId)
    .eq("automation_id", automationId)
    .single()

  if (error || !run) return null
  return run
}
