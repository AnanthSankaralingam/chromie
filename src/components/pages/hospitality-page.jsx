"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "@/components/SessionProviderClient"
import AutomationAuditSection from "@/components/automations/automation-audit-section"
import AutomationScheduleFields, {
  scheduleStateFromAutomation,
} from "@/components/automations/automation-schedule-fields"
import AppBarDashboard from "@/components/ui/app-bars/app-bar-dashboard"
import {
  APP_PAGE,
  BTN_OUTLINE,
  BTN_PRIMARY,
  CARD_CLASS,
  INPUT_CLASS,
  LABEL_CLASS,
  SECTION_LABEL,
} from "@/components/ui/app-dashboard-theme"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/forms-and-input/input"
import { FilmGrain } from "@/components/ui/landing/landing-motion"
import AuthModal from "@/components/ui/modals/modal-auth"
import { EVIIVO_DATA_PULL_SCENARIO_ID } from "@/lib/workflow/workflow-automations"
import { Play, RefreshCw, Save } from "lucide-react"

function countLabel(counts, key) {
  const value = Number(counts?.[key] || 0)
  return Number.isFinite(value) ? value : 0
}

function StatCard({ label, value }) {
  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="p-4 pb-2">
        <p className={SECTION_LABEL}>{label}</p>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  )
}

function SetupForm({ initial, onSubmit, saving }) {
  const [draft, setDraft] = useState(() => ({
    name: initial?.name || "",
    property_name: initial?.property_name || "",
    eviivo_base_url: initial?.eviivo_base_url || "https://on.eviivo.com",
    timezone: initial?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  }))

  function update(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Card className={CARD_CLASS}>
      <CardHeader>
        <CardTitle className="text-white">Hospitality profile</CardTitle>
        <p className="text-sm leading-6 text-zinc-400">
          Link this account to the eviivo property that the automation should manage.
        </p>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(draft)
          }}
        >
          <div>
            <label className={LABEL_CLASS}>Profile name</label>
            <Input
              className={INPUT_CLASS}
              value={draft.name}
              placeholder="Museum Lodge operations"
              onChange={(event) => update("name", event.target.value)}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Property name</label>
            <Input
              className={INPUT_CLASS}
              value={draft.property_name}
              placeholder="Museum Lodge"
              onChange={(event) => update("property_name", event.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS}>eviivo base URL</label>
              <Input
                className={INPUT_CLASS}
                value={draft.eviivo_base_url}
                onChange={(event) => update("eviivo_base_url", event.target.value)}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Timezone</label>
              <Input
                className={INPUT_CLASS}
                value={draft.timezone}
                onChange={(event) => update("timezone", event.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" className={BTN_PRIMARY} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function RecordsPanel({ title, rows, renderRow }) {
  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="p-4">
        <CardTitle className="text-base text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        {rows.length ? (
          rows.slice(0, 6).map((row, index) => (
            <div key={`${title}-${index}`} className="border border-white/10 bg-white/[0.02] p-3">
              {renderRow(row)}
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-500">No records captured yet.</p>
        )}
      </CardContent>
    </Card>
  )
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

export default function HospitalityPage() {
  const { user, isLoading: sessionLoading } = useSession()
  const [showAuth, setShowAuth] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [profile, setProfile] = useState(null)
  const [automation, setAutomation] = useState(null)
  const [runs, setRuns] = useState([])
  const [schedule, setSchedule] = useState(() => scheduleStateFromAutomation(null))
  const auditRef = useRef(null)

  const loadDashboard = useCallback(async () => {
    setError("")
    const res = await fetch("/api/hospitality")
    if (res.status === 401) {
      setShowAuth(true)
      setLoading(false)
      return
    }
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(json.error || "Failed to load hospitality dashboard.")
      setLoading(false)
      return
    }
    setProfile(json.hospitality_profile || null)
    setAutomation(json.automation || null)
    setRuns(json.runs || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    setSchedule(scheduleStateFromAutomation(automation))
  }, [automation])

  useEffect(() => {
    if (sessionLoading) return
    if (!user) {
      setShowAuth(true)
      setLoading(false)
      return
    }
    loadDashboard()
  }, [user, sessionLoading, loadDashboard])

  const latestRun = runs[0] || null
  const latestCounts = latestRun?.counts || {}
  const hasRunningWorkflow = runs.some((run) => run.status === "running")

  const refreshDashboard = useCallback(async () => {
    await Promise.all([
      loadDashboard(),
      auditRef.current?.refresh?.() || Promise.resolve(),
    ])
  }, [loadDashboard])

  async function saveProfile(draft) {
    setSaving(true)
    setError("")
    setMessage("")
    const res = await fetch("/api/hospitality", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setError(json.error || "Failed to save hospitality profile.")
      return
    }
    setProfile(json.hospitality_profile || null)
    setAutomation(json.automation || null)
    setRuns(json.runs || [])
    setMessage("Hospitality profile saved and eviivo automation is ready.")
    await auditRef.current?.refresh?.()
  }

  async function startRun() {
    setRunning(true)
    setError("")
    setMessage("")
    const res = await fetch("/api/hospitality/run", { method: "POST" })
    const json = await res.json().catch(() => ({}))
    setRunning(false)
    if (!res.ok) {
      setError(json.error || "Failed to start eviivo data pull.")
      return
    }
    setMessage(json.message || "eviivo data pull started.")
    await refreshDashboard()
  }

  async function saveSchedule() {
    setScheduleSaving(true)
    setError("")
    setMessage("")
    const res = await fetch("/api/hospitality/schedule", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(schedulePayload(schedule)),
    })
    const json = await res.json().catch(() => ({}))
    setScheduleSaving(false)
    if (!res.ok) {
      setError(json.error || "Failed to update hospitality schedule.")
      return
    }
    setAutomation(json.automation || null)
    setMessage(
      schedule.scheduleEnabled
        ? "Hospitality automation schedule saved."
        : "Hospitality automation schedule disabled.",
    )
    await auditRef.current?.refresh?.()
  }

  if (loading || sessionLoading) {
    return (
      <div className={APP_PAGE}>
        <FilmGrain />
        <AppBarDashboard />
        <main className="relative z-[1] mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <p className="text-sm text-zinc-400">Loading hospitality dashboard...</p>
        </main>
      </div>
    )
  }

  return (
    <div className={APP_PAGE}>
      <FilmGrain />
      <AppBarDashboard />
      <main className="relative z-[1] mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className={SECTION_LABEL}>Hospitality</p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              eviivo operations dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Manage the eviivo data pull automation and review the latest calendar, housekeeping,
              report, and count payloads saved from each run.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className={BTN_OUTLINE} disabled={loading} onClick={refreshDashboard}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button className={BTN_PRIMARY} disabled={!profile || running || hasRunningWorkflow} onClick={startRun}>
              <Play className="mr-2 h-4 w-4" />
              {running ? "Starting..." : "Run eviivo pull"}
            </Button>
          </div>
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

        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          <StatCard label="Calendar" value={countLabel(latestCounts, "calendar_records")} />
          <StatCard label="Housekeeping" value={countLabel(latestCounts, "housekeeping_rows")} />
          <StatCard label="Reports" value={countLabel(latestCounts, "report_entries")} />
          <StatCard label="Total" value={countLabel(latestCounts, "total_records")} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-6">
            <SetupForm initial={profile} onSubmit={saveProfile} saving={saving} />
          </div>

          <div className="space-y-6">
            <RecordsPanel
              title="Calendar records"
              rows={latestRun?.calendar_records || []}
              renderRow={(row) => (
                <>
                  <p className="text-sm font-medium text-white">{row.guest_name || row.raw_text || "Calendar item"}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {row.room || "No room"} · {row.status || "unknown"} · {row.start_date || "no date"}
                  </p>
                </>
              )}
            />
            <RecordsPanel
              title="Housekeeping rows"
              rows={latestRun?.housekeeping_rows || []}
              renderRow={(row) => (
                <>
                  <p className="text-sm font-medium text-white">{row.room || row.accommodation || "Housekeeping row"}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {row.unit_status || "unknown"} · {row.cleaning_plan || "no plan"} · {row.assigned_to || "unassigned"}
                  </p>
                </>
              )}
            />
            <RecordsPanel
              title="Report entries"
              rows={latestRun?.report_entries || []}
              renderRow={(row) => (
                <>
                  <p className="text-sm font-medium text-white">{row.name || "Report entry"}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {row.section || "reports"} · {row.category || row.action_label || "no category"}
                  </p>
                </>
              )}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card className={CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-white">Run schedule</CardTitle>
              <p className="text-sm leading-6 text-zinc-400">
                Configure the cadence for automatic eviivo pulls.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <AutomationScheduleFields
                scheduleEnabled={schedule.scheduleEnabled}
                scheduleFrequency={schedule.scheduleFrequency}
                scheduleTimes={schedule.scheduleTimes}
                scheduleWeekday={schedule.scheduleWeekday}
                scheduleTimezone={schedule.scheduleTimezone}
                onChange={(patch) =>
                  setSchedule((prev) => applySchedulePatch(prev, patch))
                }
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  className={BTN_PRIMARY}
                  disabled={!profile || scheduleSaving}
                  onClick={saveSchedule}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {scheduleSaving ? "Saving..." : "Save schedule"}
                </Button>
              </div>
            </CardContent>
          </Card>
          <AutomationAuditSection
            ref={auditRef}
            user={user}
            selectedAutomationId={automation?.id || null}
            scenarioId={EVIIVO_DATA_PULL_SCENARIO_ID}
            title="eviivo automation audit"
            description="Workflow runs from the shared runner."
            emptyMessage="No eviivo workflow runs yet. Run the eviivo pull to see history here."
            onRefresh={refreshDashboard}
            requireUser={false}
            className="mt-0"
          />
        </div>
      </main>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} redirectUrl="/hospitality" />
    </div>
  )
}
