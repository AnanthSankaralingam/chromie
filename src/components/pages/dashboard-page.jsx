"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSession } from "@/components/SessionProviderClient"
import AutomationAuditSection from "@/components/automations/automation-audit-section"
import AutomationScheduleFields, {
  scheduleStateFromAutomation,
} from "@/components/automations/automation-schedule-fields"
import AppBarDashboard from "@/components/ui/app-bars/app-bar-dashboard"
import {
  ACCENT,
  APP_PAGE,
  BTN_OUTLINE,
  BTN_PRIMARY,
  CARD_CLASS,
  LIST_ITEM,
  LIST_ITEM_SELECTED,
  SECTION_LABEL,
} from "@/components/ui/app-dashboard-theme"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FilmGrain } from "@/components/ui/landing/landing-motion"
import AuthModal from "@/components/ui/modals/modal-auth"
import { WORKFLOW_SCENARIOS } from "@/lib/workflow/workflow-automations"
import { RefreshCw, Save } from "lucide-react"

function schedulePayload(schedule) {
  return {
    schedule_enabled: schedule.scheduleEnabled,
    schedule_kind: schedule.scheduleEnabled ? "cron" : "on_demand",
    schedule_frequency: schedule.scheduleFrequency,
    schedule_times: schedule.scheduleTimes,
    schedule_weekday: schedule.scheduleWeekday,
    schedule_timezone: schedule.scheduleTimezone,
  }
}

function applySchedulePatch(prev, patch) {
  return {
    ...prev,
    ...(patch.schedule_enabled !== undefined
      ? { scheduleEnabled: patch.schedule_enabled }
      : {}),
    ...(patch.schedule_frequency !== undefined
      ? { scheduleFrequency: patch.schedule_frequency }
      : {}),
    ...(patch.schedule_times !== undefined ? { scheduleTimes: patch.schedule_times } : {}),
    ...(patch.schedule_weekday !== undefined
      ? { scheduleWeekday: patch.schedule_weekday }
      : {}),
    ...(patch.schedule_timezone !== undefined
      ? { scheduleTimezone: patch.schedule_timezone }
      : {}),
  }
}

function scenarioLabel(automation) {
  return (
    WORKFLOW_SCENARIOS.find((scenario) => scenario.id === automation.scenario_id)?.label ||
    automation.scenario_id
  )
}

function scheduleSummary(automation) {
  const schedule = scheduleStateFromAutomation(automation)
  if (!schedule.scheduleEnabled) return "On demand"

  const times = schedule.scheduleTimes.join(", ")
  if (schedule.scheduleFrequency === "weekly") {
    return `${schedule.scheduleWeekday} at ${times}`
  }
  return `Daily at ${times}`
}

function AutomationRow({ automation, selected, onSelect }) {
  const scheduled = automation.schedule_kind === "cron"
  return (
    <button
      type="button"
      onClick={() => onSelect(automation.id)}
      className={`w-full border px-3 py-3 text-left text-sm transition-colors ${
        selected ? LIST_ITEM_SELECTED : LIST_ITEM
      } ${scheduled ? "" : "opacity-75"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium text-zinc-100">{automation.name}</div>
          <div className="mt-1 truncate text-xs text-zinc-500">{scenarioLabel(automation)}</div>
        </div>
        <span className={`shrink-0 text-xs ${scheduled ? ACCENT : "text-zinc-500"}`}>
          {scheduled ? "scheduled" : "on demand"}
        </span>
      </div>
      <div className="mt-2 text-xs text-zinc-400">{scheduleSummary(automation)}</div>
      <div className="mt-1 text-xs text-zinc-600">
        {automation.schedule_timezone || "America/New_York"}
      </div>
    </button>
  )
}

export default function DashboardPage() {
  const { user, isLoading: sessionLoading } = useSession()
  const [automations, setAutomations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedRunId, setSelectedRunId] = useState(null)
  const [schedule, setSchedule] = useState(() => scheduleStateFromAutomation(null))
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [showAuth, setShowAuth] = useState(false)
  const auditRef = useRef(null)

  const loadAutomations = useCallback(async () => {
    setError("")
    const res = await fetch("/api/automations")
    if (res.status === 401) {
      setShowAuth(true)
      setAutomations([])
      return []
    }

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(json.error || "Failed to load automations.")
      return []
    }

    const next = json.automations || []
    setAutomations(next)
    setSelectedId((current) => {
      if (current && next.some((automation) => automation.id === current)) return current
      return next.find((automation) => automation.schedule_kind === "cron")?.id || next[0]?.id || null
    })
    return next
  }, [])

  useEffect(() => {
    if (sessionLoading) return
    if (!user) {
      setShowAuth(true)
      setLoading(false)
      return
    }

    loadAutomations().finally(() => setLoading(false))
  }, [user, sessionLoading, loadAutomations])

  const selectedAutomation = automations.find((automation) => automation.id === selectedId) || null

  useEffect(() => {
    setSchedule(scheduleStateFromAutomation(selectedAutomation))
  }, [selectedAutomation])

  const scheduledAutomations = useMemo(
    () => automations.filter((automation) => automation.schedule_kind === "cron"),
    [automations],
  )
  const onDemandAutomations = useMemo(
    () => automations.filter((automation) => automation.schedule_kind !== "cron"),
    [automations],
  )

  async function refreshDashboard() {
    setRefreshing(true)
    setMessage("")
    try {
      await Promise.all([
        loadAutomations(),
        auditRef.current?.refresh?.() || Promise.resolve(),
      ])
    } finally {
      setRefreshing(false)
    }
  }

  async function saveSchedule() {
    if (!selectedAutomation) return
    setSaving(true)
    setError("")
    setMessage("")

    const res = await fetch(`/api/automations/${selectedAutomation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(schedulePayload(schedule)),
    })
    const json = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) {
      setError(json.error || "Failed to save schedule.")
      return
    }

    if (json.automation) {
      setAutomations((current) =>
        current.map((automation) =>
          automation.id === json.automation.id ? json.automation : automation,
        ),
      )
    }
    setMessage(schedule.scheduleEnabled ? "Schedule saved." : "Schedule disabled.")
    await auditRef.current?.refresh?.()
  }

  function selectAuditRun(run) {
    if (run.automation_id) {
      setSelectedId(run.automation_id)
    }
    setSelectedRunId(run.id)
  }

  return (
    <div className={APP_PAGE}>
      <FilmGrain />
      <AppBarDashboard />
      <main className="relative z-[1] mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className={SECTION_LABEL}>Dashboard</p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Automation schedules
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Review scheduled automations, adjust cadence, and inspect recent audit activity
              across your account.
            </p>
          </div>
          <Button
            type="button"
            className={BTN_OUTLINE}
            disabled={loading || refreshing}
            onClick={refreshDashboard}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error ? (
          <div className="mt-6 border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="mt-6 border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
            {message}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Card className={CARD_CLASS}>
            <CardHeader className="border-b border-white/10 pb-4">
              <CardTitle className="text-base font-bold text-white">Your automations</CardTitle>
              <CardDescription className="text-zinc-400">
                Scheduled automations appear first. Select any automation to edit its schedule.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading || sessionLoading ? (
                <p className="text-sm text-zinc-500">Loading automations...</p>
              ) : automations.length === 0 ? (
                <p className="text-sm text-zinc-500">No automations found for this account.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <p className={SECTION_LABEL}>Scheduled</p>
                    {scheduledAutomations.length ? (
                      scheduledAutomations.map((automation) => (
                        <AutomationRow
                          key={automation.id}
                          automation={automation}
                          selected={selectedId === automation.id}
                          onSelect={setSelectedId}
                        />
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500">No scheduled automations yet.</p>
                    )}
                  </div>

                  {onDemandAutomations.length ? (
                    <div className="space-y-2 border-t border-white/10 pt-4">
                      <p className={SECTION_LABEL}>On demand</p>
                      {onDemandAutomations.map((automation) => (
                        <AutomationRow
                          key={automation.id}
                          automation={automation}
                          selected={selectedId === automation.id}
                          onSelect={setSelectedId}
                        />
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card className={CARD_CLASS}>
            <CardHeader className="border-b border-white/10 pb-4">
              <CardTitle className="text-base font-bold text-white">Schedule</CardTitle>
              <CardDescription className="text-zinc-400">
                {selectedAutomation
                  ? `Editing ${selectedAutomation.name}`
                  : "Select an automation to modify its schedule."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedAutomation ? (
                <>
                  <AutomationScheduleFields
                    scheduleEnabled={schedule.scheduleEnabled}
                    scheduleFrequency={schedule.scheduleFrequency}
                    scheduleTimes={schedule.scheduleTimes}
                    scheduleWeekday={schedule.scheduleWeekday}
                    scheduleTimezone={schedule.scheduleTimezone}
                    onChange={(patch) =>
                      setSchedule((current) => applySchedulePatch(current, patch))
                    }
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      className={BTN_PRIMARY}
                      disabled={saving}
                      onClick={saveSchedule}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Saving..." : "Save schedule"}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-zinc-500">
                  Choose an automation from the list to enable or update scheduling.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <AutomationAuditSection
          ref={auditRef}
          user={user}
          selectedAutomationId={selectedId}
          selectedRunId={selectedRunId}
          title="Account audit"
          description="Recent runs across all automations on your account."
          emptyMessage="No automation runs have been recorded yet."
          onSelectRun={selectAuditRun}
          onRefresh={refreshDashboard}
          className="mt-8"
        />
      </main>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  )
}
