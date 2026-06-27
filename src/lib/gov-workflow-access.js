import { GOV_MATCH_SCENARIO_IDS } from "@/lib/workflow-automations"

export const AUDIT_RUN_SELECT = `
  id,
  automation_id,
  scenario_id,
  status,
  success,
  started_at,
  finished_at,
  duration_ms,
  error_message,
  evaluation,
  browserbase_session_id,
  browserbase_debug_url,
  automations(name)
`

export async function getUserGovProfileId(supabase, userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("gov_profile_id")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data?.gov_profile_id || null
}

export async function loadGovOrgAuditRuns(service, govProfileId, limit) {
  const { data: teammates, error: teammateError } = await service
    .from("profiles")
    .select("id")
    .eq("gov_profile_id", govProfileId)

  if (teammateError) {
    throw new Error(teammateError.message)
  }

  const teammateIds = (teammates || []).map((row) => row.id).filter(Boolean)
  if (!teammateIds.length) return []

  const { data: automations, error: automationError } = await service
    .from("automations")
    .select("id")
    .in("user_id", teammateIds)
    .in("scenario_id", GOV_MATCH_SCENARIO_IDS)

  if (automationError) {
    throw new Error(automationError.message)
  }

  const automationIds = (automations || []).map((row) => row.id).filter(Boolean)
  if (!automationIds.length) return []

  const { data: runs, error } = await service
    .from("workflow_runs")
    .select(AUDIT_RUN_SELECT)
    .in("automation_id", automationIds)
    .not("automation_id", "is", null)
    .order("started_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return runs || []
}

export function mergeAuditRuns(primary, supplemental, limit) {
  const seen = new Set()
  const merged = []

  for (const run of [...primary, ...supplemental]) {
    if (!run?.id || seen.has(run.id)) continue
    seen.add(run.id)
    merged.push(run)
  }

  merged.sort(
    (a, b) => new Date(b.started_at || 0).getTime() - new Date(a.started_at || 0).getTime(),
  )

  return merged.slice(0, limit)
}
