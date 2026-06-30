/** Format workflow run records for the dashboard audit log. */

import { GOV_PROFILE_SCENARIO_IDS } from "@/lib/workflow-automations"

/** Dashboard URLs require Browserbase login — never embed in Chromie. */
export function isBrowserbaseDashboardUrl(url) {
  if (!url || typeof url !== "string") return false
  try {
    const { hostname, pathname } = new URL(url)
    return (
      (hostname === "browserbase.com" || hostname === "www.browserbase.com") &&
      pathname.startsWith("/sessions/")
    )
  } catch {
    return false
  }
}

export function embeddableBrowserbaseUrl(run) {
  if (run.browserbase_debug_url && !isBrowserbaseDashboardUrl(run.browserbase_debug_url)) {
    return run.browserbase_debug_url
  }
  return null
}

export function browserSessionsForRun(run) {
  const sessions = run.evaluation?.browser_sessions
  if (Array.isArray(sessions) && sessions.length > 0) {
    return sessions.filter((session) => session?.browserbase_session_id)
  }
  if (run.browserbase_session_id) {
    return [
      {
        label: "Live session",
        browserbase_session_id: run.browserbase_session_id,
        browserbase_debug_url: run.browserbase_debug_url,
      },
    ]
  }
  return []
}

/** Resolve which Browserbase session ID to use for a run (supports multi-session workflows). */
export function resolveBrowserSessionId(run, requestedSessionId) {
  const sessions = browserSessionsForRun(run)
  const matchedSession =
    sessions.find((session) => session.browserbase_session_id === requestedSessionId) ||
    sessions[0]
  return matchedSession?.browserbase_session_id || run.browserbase_session_id || null
}

export function statusTone(status) {
  if (status === "success") return "success"
  if (status === "no_matches") return "no_matches"
  if (status === "failed") return "failed"
  if (status === "cancelled") return "cancelled"
  return "running"
}

function isNoOpportunitiesEmailError(text) {
  if (!text) return false
  return String(text).includes("No opportunities to send")
}

function isIcpMatchEmptyValidationError(text) {
  if (!text) return false
  const value = String(text)
  return /Expected at least \d+ ICP-matched opportunity/i.test(value) && /\bgot 0\b/.test(value)
}

function isNoProfileVerifiedReason(text) {
  if (!text) return false
  return /no profile-verified opportunities/i.test(String(text))
}

/** Soft gov outcomes: search ran but nothing matched the company profile. */
function isSoftGovFailureText(text) {
  if (!text || !String(text).trim()) return false
  const value = String(text)
  if (isNoOpportunitiesEmailError(value)) return true
  if (isIcpMatchEmptyValidationError(value)) return true
  if (/Email delivery failed:/i.test(value) && isNoOpportunitiesEmailError(value)) return true
  if (isNoProfileVerifiedReason(value)) return true
  return false
}

function splitErrorSegments(text) {
  return String(text)
    .split(/;\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function isInternalEmailDeliveryFailureSegment(text) {
  return /Email delivery failed:/i.test(String(text || "").trim())
}

function shouldStripDiagnosticSegment(text) {
  if (!text) return false
  return isInternalEmailDeliveryFailureSegment(text) || isSoftGovFailureText(text)
}

/** True when an error string is internal-only and should never reach the client. */
function shouldStripDiagnosticText(text) {
  if (!text || !String(text).trim()) return false
  const segments = splitErrorSegments(text)
  if (segments.length === 0) return false
  return segments.every(shouldStripDiagnosticSegment)
}

function userFacingErrorText(text) {
  if (!text) return null
  const kept = splitErrorSegments(text).filter((segment) => !shouldStripDiagnosticSegment(segment))
  if (kept.length === 0) return null
  return kept.join("; ")
}

function logStrippedDiagnostic(log, runId, field, value) {
  if (!log) return
  console.log("[workflow-run] internal run diagnostic (not shown to user)", { runId, field, value })
}

function isGovWorkflowRun(run) {
  if (GOV_PROFILE_SCENARIO_IDS.has(run.scenario_id)) return true
  const evaluation = run.evaluation || {}
  if (evaluation.email_delivery?.gov_runs_delivery) return true
  if (/gov_dual_source=true/i.test(String(evaluation.notes || ""))) return true
  if (browserSessionsForRun(run).length > 1) return true
  return false
}

function cleanEvaluationForClient(evaluation, runId, log) {
  if (!evaluation) return evaluation
  const next = { ...evaluation }

  if (Array.isArray(next.validation_errors)) {
    for (const err of evaluation.validation_errors) {
      if (shouldStripDiagnosticText(err)) {
        logStrippedDiagnostic(log, runId, "validation_errors", err)
      }
    }
    next.validation_errors = next.validation_errors
      .map((err) => userFacingErrorText(err))
      .filter(Boolean)
    if (next.validation_errors.length === 0) {
      delete next.validation_errors
    }
  }

  if (next.email_delivery?.error && isNoOpportunitiesEmailError(next.email_delivery.error)) {
    logStrippedDiagnostic(log, runId, "email_delivery.error", next.email_delivery.error)
    next.email_delivery = { ...next.email_delivery, error: undefined }
  }

  return next
}

/** Remove internal email-delivery diagnostic blobs from stored run errors. */
export function stripInternalEmailDeliveryFailures(errorMessage) {
  return userFacingErrorText(errorMessage)
}

export function sanitizeRunForClient(run, { log = false } = {}) {
  if (!run) return run

  const emptyResult = isGovEmptyResultRun(run)
  const evaluation = cleanEvaluationForClient(run.evaluation, run.id, log)

  if (emptyResult) {
    if (run.error_message) {
      logStrippedDiagnostic(log, run.id, "error_message", run.error_message)
    }
    return { ...run, error_message: null, evaluation, display_outcome: "no_matches" }
  }

  let error_message = run.error_message
  if (error_message && shouldStripDiagnosticText(error_message)) {
    logStrippedDiagnostic(log, run.id, "error_message", error_message)
    error_message = null
  } else if (error_message) {
    const sanitizedMessage = userFacingErrorText(error_message)
    if (sanitizedMessage !== error_message) {
      logStrippedDiagnostic(log, run.id, "error_message", error_message)
      error_message = sanitizedMessage
    }
  }

  return { ...run, error_message, evaluation }
}

function userFacingErrorMessage(run) {
  return userFacingErrorText(run.error_message)
}

function collectRunErrorTexts(run) {
  const evaluation = run.evaluation || {}
  const email = evaluation.email_delivery || {}
  const texts = []

  if (run.error_message) texts.push(run.error_message)
  for (const err of evaluation.validation_errors || []) texts.push(err)
  if (email?.error) texts.push(String(email.error))

  const govRuns = govRunsDeliverySummary(email)
  if (govRuns?.error) texts.push(String(govRuns.error))

  return texts.filter(Boolean)
}

function hasGovEmptyResultSignal(run) {
  const email = run.evaluation?.email_delivery
  const texts = collectRunErrorTexts(run)
  const govRuns = govRunsDeliverySummary(email)

  if (texts.some(isSoftGovFailureText)) return true
  if (govRuns?.skippedReason && isNoProfileVerifiedReason(govRuns.skippedReason)) return true
  if (isGovWorkflowRun(run) && run.error_message && shouldStripDiagnosticText(run.error_message)) {
    return true
  }
  return false
}

function hasHardRunFailure(run) {
  const segments = collectRunErrorTexts(run).flatMap(splitErrorSegments)
  if (segments.length === 0) return false
  return segments.some((segment) => !isSoftGovFailureText(segment))
}

function hasIcpMatchEmptySignal(run) {
  const evaluation = run.evaluation || {}
  if (isIcpMatchEmptyValidationError(run.error_message)) return true
  return (evaluation.validation_errors || []).some(isIcpMatchEmptyValidationError)
}

export function isGovEmptyResultRun(run) {
  if (run.display_outcome === "no_matches") return true
  if (!isGovWorkflowRun(run)) return false
  if (run.status !== "failed") return false
  if (!hasGovEmptyResultSignal(run)) return false
  if (hasHardRunFailure(run)) return false
  return true
}

export function govEmptyResultSummary(run) {
  if (hasIcpMatchEmptySignal(run)) {
    return "Search completed. No opportunities met your profile fit criteria this run."
  }
  return "Search completed. No matching contract opportunities were found this run."
}

export function resolveRunPresentation(run) {
  if (isGovEmptyResultRun(run)) {
    return {
      tone: "no_matches",
      label: "No matches",
      summary: govEmptyResultSummary(run),
      isEmptyResult: true,
    }
  }

  return {
    tone: statusTone(run.status),
    label: run.status,
    summary: null,
    isEmptyResult: false,
  }
}

export function runStatusTone(run) {
  return resolveRunPresentation(run).tone
}

export function runStatusLabel(run) {
  return resolveRunPresentation(run).label
}

export function formatDuration(ms) {
  if (ms == null) return null
  if (ms < 1000) return `${ms}ms`
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec}s`
  return `${Math.floor(sec / 60)}m ${sec % 60}s`
}

/** Orchestration metadata stored in evaluation.notes — not user-facing. */
function isInternalRunNote(text) {
  const trimmed = String(text || "").trim()
  if (!trimmed) return true
  if (/^agent=\w+/i.test(trimmed) && /dry_tools=/i.test(trimmed)) return true
  return false
}

/** Summarize gov_runs persistence from email_delivery metadata. */
function govRunsDeliverySummary(email) {
  if (!email?.gov_runs_delivery) return null
  const delivery = email.gov_runs_delivery
  if (Array.isArray(delivery.branches)) {
    const inserted = delivery.branches.reduce((total, branch) => total + (branch.inserted || 0), 0)
    const error = delivery.branches.find((branch) => branch.error)?.error
    const skippedReason = delivery.branches.find((branch) => branch.skipped && branch.reason)?.reason
    return { inserted, error, skippedReason }
  }
  return {
    inserted: delivery.inserted || 0,
    error: delivery.error,
    skippedReason: delivery.skipped ? delivery.reason : null,
  }
}

export function executionLogLines(run) {
  const emptyResult = isGovEmptyResultRun(run)
  if (emptyResult) {
    return [{ level: "info", text: govEmptyResultSummary(run) }]
  }

  const lines = []
  const evaluation = run.evaluation || {}

  const errorMessage = userFacingErrorMessage(run)
  if (errorMessage) {
    lines.push({ level: "error", text: errorMessage })
  }

  if (evaluation.notes && !isInternalRunNote(evaluation.notes)) {
    lines.push({ level: "info", text: evaluation.notes })
  }

  for (const err of evaluation.validation_errors || []) {
    const message = userFacingErrorText(err)
    if (message) {
      lines.push({ level: "error", text: message })
    }
  }

  const metrics = []
  if (evaluation.step_count != null) metrics.push(`${evaluation.step_count} steps`)
  if (evaluation.tool_calls != null) metrics.push(`${evaluation.tool_calls} tool calls`)
  if (metrics.length) {
    lines.push({ level: "meta", text: metrics.join(" · ") })
  }

  const addrCount = evaluation.addresses_extracted?.length ?? 0
  if (addrCount > 0) {
    lines.push({ level: "info", text: `Extracted ${addrCount} listing address(es)` })
  }

  const oppCount = evaluation.opportunities_extracted?.length ?? 0
  if (oppCount > 0) {
    lines.push({ level: "info", text: `Found ${oppCount} government contract opportunit${oppCount === 1 ? "y" : "ies"}` })
  }

  const eviivoCounts = evaluation.eviivo_records_extracted?.counts || evaluation.eviivo_records_extracted || {}
  const eviivoTotal = Number(eviivoCounts.total_records || 0)
  if (eviivoTotal > 0) {
    const calendar = Number(eviivoCounts.calendar_records || 0)
    const housekeeping = Number(eviivoCounts.housekeeping_rows || 0)
    const reports = Number(eviivoCounts.report_entries || 0)
    lines.push({
      level: "info",
      text: `Saved ${eviivoTotal} eviivo record${eviivoTotal === 1 ? "" : "s"} (${calendar} calendar, ${housekeeping} housekeeping, ${reports} reports).`,
    })
  }

  const email = evaluation.email_delivery
  if (email?.sent) {
    lines.push({ level: "info", text: `Email sent to ${email.recipient || "recipient"}` })
  } else if (email?.error && !isNoOpportunitiesEmailError(email.error)) {
    lines.push({ level: "error", text: `Email failed: ${email.error}` })
  }

  const govRuns = govRunsDeliverySummary(email)
  if (govRuns?.inserted > 0) {
    lines.push({
      level: "info",
      text: `Saved ${govRuns.inserted} opportunit${govRuns.inserted === 1 ? "y" : "ies"} to gov runs`,
    })
  } else if (govRuns?.error && !shouldStripDiagnosticText(String(govRuns.error))) {
    lines.push({ level: "error", text: `Gov runs save failed: ${govRuns.error}` })
  } else if (govRuns?.skippedReason && !isNoProfileVerifiedReason(govRuns.skippedReason)) {
    lines.push({ level: "meta", text: `Gov runs not saved: ${govRuns.skippedReason}` })
  }

  if (lines.length === 0 && run.status === "success") {
    lines.push({ level: "info", text: "Completed successfully." })
  }

  if (lines.length === 0 && run.status === "running") {
    lines.push({ level: "meta", text: "Run in progress…" })
  }

  if (lines.length === 0 && run.status === "cancelled") {
    lines.push({ level: "meta", text: "Run was cancelled." })
  }

  return lines
}

export function normalizeAuditRun(row, options = {}) {
  const automation = Array.isArray(row.automations) ? row.automations[0] : row.automations
  return sanitizeRunForClient(
    {
      ...row,
      automation_name: automation?.name || "Deleted automation",
    },
    options,
  )
}
