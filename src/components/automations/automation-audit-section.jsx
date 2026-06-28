"use client"

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react"
import {
  BTN_OUTLINE,
  CARD_CLASS,
  DIVIDER,
  LIST_ITEM,
  LIST_ITEM_SELECTED,
  SECTION_LABEL,
} from "@/components/ui/app-dashboard-theme"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import WorkflowSessionViewer from "@/components/ui/workflow-session-viewer"
import {
  browserSessionsForRun,
  embeddableBrowserbaseUrl,
  executionLogLines,
  formatDuration,
  runStatusLabel,
  runStatusTone,
  sanitizeRunForClient,
} from "@/lib/workflow-audit"
import { ChevronDown, RefreshCw } from "lucide-react"

const STATUS_CLASS = {
  success: "text-emerald-400",
  no_matches: "text-sky-300",
  failed: "text-red-400",
  cancelled: "text-zinc-400",
  running: "text-amber-400",
}

const LOG_CLASS = {
  error: "text-red-300/90",
  info: "text-zinc-300",
  meta: "text-zinc-500 font-mono text-[11px]",
}

const SESSION_FRAME_CLASS =
  "w-full rounded-none border border-white/10 bg-black"
const SESSION_FRAME_STYLE = { height: "min(50vh, 480px)" }

const SCENARIO_DISPLAY_NAMES = {
  morphworks_sam_gov: "Government contract monitor",
  morphworks_sbir_tech_marketplace: "SBIR Tech Marketplace",
  gov_contract_sam_gov: "Government contract monitor",
  gov_contract_sbir_tech_marketplace: "SBIR Tech Marketplace",
}

function runDisplayName(run) {
  const sessions = browserSessionsForRun(run)
  if (sessions.length > 1) {
    return "Government contract monitor"
  }
  return SCENARIO_DISPLAY_NAMES[run.scenario_id] || run.automation_name || "Deleted automation"
}

function AuditSessionPanel({ run, session }) {
  const directUrl = embeddableBrowserbaseUrl({
    browserbase_debug_url: session.browserbase_debug_url,
  })

  return (
    <div className="space-y-2">
      <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">{session.label || "Live session"}</p>
      {directUrl ? (
        <iframe
          src={directUrl}
          title={`${session.label || "Session"} — ${runDisplayName(run)}`}
          className={SESSION_FRAME_CLASS}
          style={SESSION_FRAME_STYLE}
          sandbox="allow-same-origin allow-scripts"
          allow="clipboard-read; clipboard-write"
        />
      ) : session.browserbase_session_id && run.automation_id ? (
        <WorkflowSessionViewer
          automationId={run.automation_id}
          runId={run.id}
          runStatus={run.status}
          sessionId={session.browserbase_session_id}
          poll={run.status === "running"}
        />
      ) : null}
    </div>
  )
}

function AuditSessionEmbed({ run }) {
  const sessions = browserSessionsForRun(run)
  if (sessions.length > 1) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {sessions.map((session) => (
          <AuditSessionPanel
            key={session.browserbase_session_id || session.label}
            run={run}
            session={session}
          />
        ))}
      </div>
    )
  }

  const session = sessions[0]
  if (!session) return null

  const directUrl = embeddableBrowserbaseUrl({
    browserbase_debug_url: session.browserbase_debug_url,
    browserbase_session_id: session.browserbase_session_id,
  })

  if (directUrl) {
    return (
      <iframe
        src={directUrl}
        title={`Session replay — ${runDisplayName(run)}`}
        className={SESSION_FRAME_CLASS}
        style={SESSION_FRAME_STYLE}
        sandbox="allow-same-origin allow-scripts"
        allow="clipboard-read; clipboard-write"
      />
    )
  }

  if (session.browserbase_session_id && run.automation_id) {
    return (
      <WorkflowSessionViewer
        automationId={run.automation_id}
        runId={run.id}
        runStatus={run.status}
        sessionId={session.browserbase_session_id}
        poll={run.status === "running"}
      />
    )
  }

  return null
}

function AuditRunRow({ run, expanded, onToggle, onSelect, selected }) {
  const logs = executionLogLines(run)
  const tone = runStatusTone(run)
  const hasSession = browserSessionsForRun(run).length > 0

  return (
    <div
      className={`border text-sm transition-colors ${
        selected ? LIST_ITEM_SELECTED : LIST_ITEM
      }`}
    >
      <div className="flex items-stretch gap-px">
        <button
          type="button"
          onClick={() => onSelect?.(run)}
          className="flex-1 min-w-0 px-3 py-2.5 text-left"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <div className="font-medium text-zinc-100 truncate">{runDisplayName(run)}</div>
              <div className="text-xs text-zinc-500 truncate">
                {SCENARIO_DISPLAY_NAMES[run.scenario_id] || run.scenario_id}
                <span className={`ml-2 ${STATUS_CLASS[tone]}`}>{runStatusLabel(run)}</span>
              </div>
            </div>
            <div className="text-xs text-zinc-500 shrink-0 text-right">
              {run.started_at ? new Date(run.started_at).toLocaleString() : "—"}
              {run.duration_ms != null && (
                <span className="block">{formatDuration(run.duration_ms)}</span>
              )}
            </div>
          </div>
          {!expanded && logs[0] && (
            <p className={`mt-1.5 text-xs truncate ${LOG_CLASS[logs[0].level]}`}>{logs[0].text}</p>
          )}
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? "Hide execution log" : "Show execution log"}
          className="shrink-0 px-3 text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03]"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      {expanded && (
        <div className={`border-t px-3 py-2.5 space-y-3 ${DIVIDER}`}>
          {logs.map((line, i) => (
            <p key={i} className={`text-xs leading-relaxed ${LOG_CLASS[line.level]}`}>
              {line.text}
            </p>
          ))}
          {hasSession && run.automation_id && (
            <AuditSessionEmbed run={run} />
          )}
        </div>
      )}
    </div>
  )
}

export default forwardRef(function AutomationAuditSection(
  {
    user,
    selectedAutomationId,
    selectedAutomationIds,
    selectedRunId,
    scenarioId,
    scenarioIds,
    title = "Recent executions",
    description = "Runs across all automations, with status and execution details.",
    emptyMessage = "No executions yet. Run an automation to see history here.",
    onSelectRun,
    onRefresh,
    pollWhileRunning = true,
    autoExpandRunning = true,
    defaultCollapsed = false,
  },
  ref,
) {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [sectionExpanded, setSectionExpanded] = useState(!defaultCollapsed)

  const loadAudit = useCallback(async () => {
    const res = await fetch("/api/automations/audit?limit=40")
    if (!res.ok) return []
    const json = await res.json()
    const scenarioFilter = scenarioIds || (scenarioId ? [scenarioId] : null)
    const next = scenarioFilter
      ? (json.runs || []).filter((run) => scenarioFilter.includes(run.scenario_id))
      : json.runs || []
    setRuns(next.map((run) => sanitizeRunForClient(run)))
    return next
  }, [scenarioId, scenarioIds])

  useImperativeHandle(ref, () => ({ refresh: loadAudit }), [loadAudit])

  useEffect(() => {
    if (!user) {
      setRuns([])
      setLoading(false)
      return
    }
    loadAudit().finally(() => setLoading(false))
  }, [user, loadAudit])

  useEffect(() => {
    if (!autoExpandRunning) return
    const running = runs.find((run) => run.status === "running")
    if (running) {
      setExpandedId(running.id)
    }
  }, [autoExpandRunning, runs])

  useEffect(() => {
    if (!pollWhileRunning || !user) return
    const hasRunning = runs.some((run) => run.status === "running")
    if (!hasRunning) return
    const interval = window.setInterval(() => {
      loadAudit()
    }, 3000)
    return () => window.clearInterval(interval)
  }, [loadAudit, pollWhileRunning, runs, user])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      if (onRefresh) {
        await onRefresh()
      } else {
        await loadAudit()
      }
    } finally {
      setRefreshing(false)
    }
  }

  if (!user) return null

  return (
    <Card className={`mt-8 ${CARD_CLASS}`}>
      <CardHeader
        className={`flex flex-row items-center justify-between space-y-0 pb-4 ${
          sectionExpanded ? "border-b border-white/10" : ""
        }`}
      >
        <button
          type="button"
          onClick={() => setSectionExpanded((prev) => !prev)}
          aria-expanded={sectionExpanded}
          className="min-w-0 flex-1 text-left"
        >
          <p className={SECTION_LABEL}>Audit</p>
          <CardTitle className="mt-1 flex items-center gap-2 text-base font-bold text-white">
            {title}
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${
                sectionExpanded ? "rotate-180" : ""
              }`}
            />
          </CardTitle>
          <CardDescription className="text-zinc-400">{description}</CardDescription>
        </button>
        <Button
          size="sm"
          variant="outline"
          className={`${BTN_OUTLINE} shrink-0`}
          disabled={refreshing}
          onClick={handleRefresh}
          aria-label="Refresh audit log"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      {sectionExpanded && (
      <CardContent className="space-y-2 pt-4 max-h-[32rem] overflow-y-auto">
        {loading && <p className="text-sm text-zinc-500">Loading audit log…</p>}
        {!loading && runs.length === 0 && (
          <p className="text-sm text-zinc-500">{emptyMessage}</p>
        )}
        {runs.map((run) => (
          <AuditRunRow
            key={run.id}
            run={run}
            expanded={expandedId === run.id}
            onToggle={() => setExpandedId((prev) => (prev === run.id ? null : run.id))}
            onSelect={onSelectRun}
            selected={
              selectedRunId === run.id &&
              ((selectedAutomationIds || (selectedAutomationId ? [selectedAutomationId] : [])).includes(
                run.automation_id,
              ))
            }
          />
        ))}
      </CardContent>
      )}
    </Card>
  )
})
