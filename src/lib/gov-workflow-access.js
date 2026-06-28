import {
  canonicalGovScenarioId,
  GOV_MATCH_SCENARIO_IDS,
  PRIMARY_GOV_SCENARIO_ID,
} from "@/lib/workflow-automations"

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

export async function getGovOrgTeammateIds(service, govProfileId) {
  const { data: teammates, error: teammateError } = await service
    .from("profiles")
    .select("id")
    .eq("gov_profile_id", govProfileId)

  if (teammateError) {
    throw new Error(teammateError.message)
  }

  return (teammates || []).map((row) => row.id).filter(Boolean)
}

export async function loadGovOrgAutomations(service, govProfileId) {
  const { data: automations, error: automationError } = await service
    .from("automations")
    .select("*")
    .eq("gov_profile_id", govProfileId)
    .in("scenario_id", GOV_MATCH_SCENARIO_IDS)
    .order("updated_at", { ascending: false })

  if (automationError) {
    throw new Error(automationError.message)
  }

  return automations || []
}

export async function findOrgScheduledSamAutomation(service, govProfileId) {
  const automations = await loadGovOrgAutomations(service, govProfileId)
  return (
    automations.find(
      (row) =>
        canonicalGovScenarioId(row.scenario_id) === PRIMARY_GOV_SCENARIO_ID &&
        row.schedule_kind === "cron" &&
        row.cron_expression?.trim() &&
        row.eventbridge_schedule_name?.trim(),
    ) || null
  )
}

export const GOV_PROFILE_DAILY_RUN_LIMIT = 5

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} service
 * @param {string} govProfileId
 * @param {string} timezone
 * @param {Date} [referenceDate]
 */
export async function countGovProfileRunsToday(
  service,
  govProfileId,
  timezone,
  referenceDate = new Date(),
) {
  const runs = await loadGovOrgAuditRuns(service, govProfileId, 50)
  const todayKey = calendarDayKey(referenceDate, timezone)

  return runs.filter((run) => {
    if (!run?.started_at) return false
    return calendarDayKey(new Date(run.started_at), timezone) === todayKey
  }).length
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} service
 * @param {string} govProfileId
 * @param {string} timezone
 * @param {number} [limit]
 * @param {Date} [referenceDate]
 */
export async function hasGovProfileReachedDailyRunLimit(
  service,
  govProfileId,
  timezone,
  limit = GOV_PROFILE_DAILY_RUN_LIMIT,
  referenceDate = new Date(),
) {
  const count = await countGovProfileRunsToday(service, govProfileId, timezone, referenceDate)
  return count >= limit
}

export function calendarDayKey(date, timezone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return formatter.format(date)
}

export async function loadGovOrgAuditRuns(service, govProfileId, limit) {
  const { data: automations, error: automationError } = await service
    .from("automations")
    .select("id")
    .eq("gov_profile_id", govProfileId)
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
