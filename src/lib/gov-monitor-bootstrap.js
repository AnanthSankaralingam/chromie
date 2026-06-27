import {
  resolveScheduleFieldsFromBody,
  syncAndPersistAutomationSchedule,
} from "@/lib/automation-schedule-sync"
import { syncedGovAutomationParams } from "@/lib/gov-automation-sync"
import { mergeGovProfileIntoScenarioParams } from "@/lib/gov-profiles"
import {
  findOrgScheduledSamAutomation,
  hasGovProfileRunToday,
  loadGovOrgAuditRuns,
  loadGovOrgAutomations,
} from "@/lib/gov-workflow-access"
import { hasWorkflowAwsCredentials } from "@/lib/workflow-aws-config"
import { invokeWorkflowLambda } from "@/lib/workflow-lambda"
import {
  GOV_WORKFLOW_SCENARIOS,
  PRIMARY_GOV_SCENARIO_ID,
} from "@/lib/workflow-automations"
import {
  computeNextScheduledRun,
  currentTimeHHMMInTimezone,
  parseCronExpression,
} from "@/lib/workflow-schedule-cron"

export const DEFAULT_GOV_SCHEDULE_TIMEZONE = "America/New_York"

const SBIR_SCENARIO_ID = "morphworks_sbir_tech_marketplace"

const GOV_MONITOR_SCENARIOS = GOV_WORKFLOW_SCENARIOS.map(({ id, label }) => ({
  id,
  name: label,
}))

export function normalizeGovScheduleTimezone(value) {
  const timezone = String(value || "").trim()
  if (!timezone) return DEFAULT_GOV_SCHEDULE_TIMEZONE
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return timezone
  } catch {
    return DEFAULT_GOV_SCHEDULE_TIMEZONE
  }
}

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
    const params = syncedGovAutomationParams(
      existing.params,
      govProfile,
      scenario.id,
      user.email || "",
    )
    const { data, error } = await supabase
      .from("automations")
      .update({ params, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }
    return data
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
      schedule_kind: "on_demand",
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }
  return data
}

export async function ensureUserGovAutomations({ supabase, user, govProfile }) {
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
    automations.find((automation) => automation.scenario_id === PRIMARY_GOV_SCENARIO_ID) || null
  const sbirAutomation =
    automations.find((automation) => automation.scenario_id === SBIR_SCENARIO_ID) || null

  return { automations, samAutomation, sbirAutomation, ensureFailures }
}

function findSbirAutomationForSamOwner(orgAutomations, samAutomation) {
  if (!samAutomation) return null
  return (
    orgAutomations.find(
      (row) =>
        row.user_id === samAutomation.user_id && row.scenario_id === SBIR_SCENARIO_ID,
    ) || null
  )
}

export async function ensureOrgDailySchedule({
  service,
  supabase,
  user,
  govProfile,
  timezone,
  samAutomation,
}) {
  const existing = await findOrgScheduledSamAutomation(service, govProfile.id)
  if (existing) {
    return { scheduleAutomation: existing, created: false }
  }

  if (!samAutomation) {
    throw new Error("SAM.gov monitor automation is not initialized")
  }

  const scheduleTime = currentTimeHHMMInTimezone(timezone)
  const scheduleFields = resolveScheduleFieldsFromBody({
    schedule_enabled: true,
    schedule_kind: "cron",
    schedule_frequency: "daily",
    schedule_times: [scheduleTime],
    schedule_timezone: timezone,
  })

  const { data: updated, error } = await supabase
    .from("automations")
    .update({
      ...scheduleFields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", samAutomation.id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  let scheduleAutomation = updated
  if (hasWorkflowAwsCredentials()) {
    scheduleAutomation = await syncAndPersistAutomationSchedule(supabase, updated)
  } else {
    console.warn(
      "[gov-monitor-bootstrap] Skipping EventBridge schedule sync — AWS credentials not configured",
    )
  }

  console.log(
    "[gov-monitor-bootstrap] created org daily schedule",
    govProfile.id,
    scheduleTime,
    timezone,
    scheduleAutomation.id,
  )

  return { scheduleAutomation, created: true }
}

export async function invokeGovDualSourceIfAllowed({
  service,
  govProfile,
  samAutomation,
  sbirAutomation,
  timezone,
}) {
  if (!samAutomation || !sbirAutomation) {
    return { invoked: false, skipped_reason: "missing_automation" }
  }

  const alreadyRanToday = await hasGovProfileRunToday(service, govProfile.id, timezone)
  if (alreadyRanToday) {
    console.log("[gov-monitor-bootstrap] skipped invoke — org already ran today", govProfile.id)
    return { invoked: false, skipped_reason: "already_ran_today" }
  }

  if (!hasWorkflowAwsCredentials()) {
    console.warn(
      "[gov-monitor-bootstrap] Skipping workflow invoke — AWS credentials not configured",
    )
    return { invoked: false, skipped_reason: "aws_not_configured" }
  }

  const result = await invokeWorkflowLambda({
    automation_id: samAutomation.id,
    gov_dual_source: true,
    sbir_automation_id: sbirAutomation.id,
  })

  console.log(
    "[gov-monitor-bootstrap] invoked gov dual-source monitor",
    govProfile.id,
    samAutomation.id,
    sbirAutomation.id,
  )

  return { invoked: true, skipped_reason: null, invocation: result }
}

export function buildGovScheduleSummary(automation) {
  if (!automation || automation.schedule_kind !== "cron" || !automation.cron_expression) {
    return {
      enabled: false,
      time: null,
      timezone: automation?.schedule_timezone || DEFAULT_GOV_SCHEDULE_TIMEZONE,
      summary: "Not scheduled",
    }
  }

  const timezone = automation.schedule_timezone || DEFAULT_GOV_SCHEDULE_TIMEZONE
  const firstExpr = automation.cron_expression.split("|")[0]?.trim()
  const parsed = parseCronExpression(firstExpr)
  const time = parsed?.times?.[0] || null
  const summary = time ? `Daily at ${time} (${timezone})` : `Daily (${timezone})`

  return {
    enabled: true,
    time,
    timezone,
    summary,
  }
}

export async function getGovMonitorStatus({ service, govProfileId }) {
  const scheduleAutomation = await findOrgScheduledSamAutomation(service, govProfileId)
  const orgAutomations = await loadGovOrgAutomations(service, govProfileId)
  const runs = await loadGovOrgAuditRuns(service, govProfileId, 40)
  const schedule = buildGovScheduleSummary(scheduleAutomation)
  const timezone = schedule.timezone
  const next_run_at =
    scheduleAutomation?.cron_expression && schedule.enabled
      ? computeNextScheduledRun(scheduleAutomation.cron_expression, timezone)
      : null
  const lastRun = runs[0] || null
  const activeRun = runs.find((run) => run.status === "running") || null
  const automationReady =
    orgAutomations.some((row) => row.scenario_id === PRIMARY_GOV_SCENARIO_ID) &&
    orgAutomations.some((row) => row.scenario_id === SBIR_SCENARIO_ID)

  return {
    gov_profile_id: govProfileId,
    schedule,
    next_run_at,
    last_run_at: lastRun?.started_at || null,
    active_run: activeRun
      ? {
          id: activeRun.id,
          status: activeRun.status,
          started_at: activeRun.started_at,
          automation_id: activeRun.automation_id,
        }
      : null,
    automation_ready: automationReady,
  }
}

/**
 * @param {{
 *   supabase: import('@supabase/supabase-js').SupabaseClient,
 *   service: import('@supabase/supabase-js').SupabaseClient,
 *   user: object,
 *   govProfile: object,
 *   timezone?: string,
 *   mode?: 'onboarding' | 'manual',
 * }} opts
 */
export async function bootstrapGovMonitor({
  supabase,
  service,
  user,
  govProfile,
  timezone: timezoneInput,
  mode = "onboarding",
}) {
  const timezone = normalizeGovScheduleTimezone(timezoneInput)
  const { automations, samAutomation, sbirAutomation, ensureFailures } =
    await ensureUserGovAutomations({ supabase, user, govProfile })

  if (!samAutomation) {
    throw new Error(
      ensureFailures.find((failure) => failure.scenario_id === PRIMARY_GOV_SCENARIO_ID)?.error ||
        "Failed to initialize the SAM.gov monitor automation",
    )
  }

  if (!sbirAutomation) {
    throw new Error(
      ensureFailures.find((failure) => failure.scenario_id === SBIR_SCENARIO_ID)?.error ||
        "Failed to initialize the SBIR Tech Marketplace monitor automation",
    )
  }

  let scheduleAutomation = await findOrgScheduledSamAutomation(service, govProfile.id)
  let scheduled = false

  if (mode === "onboarding" && !scheduleAutomation) {
    const scheduleResult = await ensureOrgDailySchedule({
      service,
      supabase,
      user,
      govProfile,
      timezone,
      samAutomation,
    })
    scheduleAutomation = scheduleResult.scheduleAutomation
    scheduled = scheduleResult.created
  }

  const orgAutomations = await loadGovOrgAutomations(service, govProfile.id)
  const invokeSam = scheduleAutomation || samAutomation
  const invokeSbir = findSbirAutomationForSamOwner(orgAutomations, invokeSam) || sbirAutomation

  const invokeResult = await invokeGovDualSourceIfAllowed({
    service,
    govProfile,
    samAutomation: invokeSam,
    sbirAutomation: invokeSbir,
    timezone: scheduleAutomation?.schedule_timezone || timezone,
  })

  const statusSchedule = buildGovScheduleSummary(scheduleAutomation)
  const next_run_at =
    scheduleAutomation?.cron_expression && statusSchedule.enabled
      ? computeNextScheduledRun(
          scheduleAutomation.cron_expression,
          statusSchedule.timezone,
        )
      : null

  return {
    automations,
    ensureFailures,
    scheduled,
    scheduleAutomation,
    next_run_at,
    invoked: invokeResult.invoked,
    skipped_reason: invokeResult.skipped_reason,
    invocation: invokeResult.invocation || null,
  }
}
