/** Format workflow run records for the dashboard audit log. */

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

export function statusTone(status) {
  if (status === "success") return "success"
  if (status === "failed") return "failed"
  if (status === "cancelled") return "cancelled"
  return "running"
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
  return /^agent=\w+,?\s*dry_tools=(?:True|False)$/i.test(trimmed)
}

export function executionLogLines(run) {
  const lines = []
  const evaluation = run.evaluation || {}

  if (run.error_message) {
    lines.push({ level: "error", text: run.error_message })
  }

  if (evaluation.notes && !isInternalRunNote(evaluation.notes)) {
    lines.push({ level: "info", text: evaluation.notes })
  }

  for (const err of evaluation.validation_errors || []) {
    lines.push({ level: "error", text: err })
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

  const email = evaluation.email_delivery
  if (email?.sent) {
    lines.push({ level: "info", text: `Email sent to ${email.recipient || "recipient"}` })
  } else if (email?.error) {
    lines.push({ level: "error", text: `Email failed: ${email.error}` })
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

export function normalizeAuditRun(row) {
  const automation = Array.isArray(row.automations) ? row.automations[0] : row.automations
  return {
    ...row,
    automation_name: automation?.name || "Deleted automation",
  }
}
