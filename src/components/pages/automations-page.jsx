"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "@/components/SessionProviderClient"
import AutomationParamFields from "@/components/automations/automation-param-fields"
import AutomationScheduleFields, {
  scheduleStateFromAutomation,
} from "@/components/automations/automation-schedule-fields"
import AppBar from "@/components/ui/app-bars/app-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/forms-and-input/input"
import AuthModal from "@/components/ui/modals/modal-auth"
import WorkflowSessionViewer from "@/components/ui/workflow-session-viewer"
import {
  defaultParamsForScenario,
  WORKFLOW_SCENARIOS,
  ZILLOW_DEFAULT_FILTERS,
} from "@/lib/workflow-automations"
import { Play, Plus, RefreshCw, Save, Square } from "lucide-react"

const CARD_CLASS = "border-zinc-800 bg-zinc-900 text-zinc-100 shadow-none"
const INPUT_CLASS =
  "mt-1 bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:ring-violet-500/50"
const BTN_OUTLINE_CLASS =
  "border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 hover:text-zinc-100"

function FilterField({ label, children }) {
  return (
    <div className="min-w-0">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      {children}
    </div>
  )
}

function formatDuration(ms) {
  if (ms == null) return null
  if (ms < 1000) return `${ms}ms`
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec}s`
  return `${Math.floor(sec / 60)}m ${sec % 60}s`
}

function runFailureHint(run) {
  if (run.status === "cancelled") return null
  if (run.status !== "failed") return null
  const eval_ = run.evaluation || {}
  const addrCount = eval_.addresses_extracted?.length ?? 0
  const minAddr = eval_.min_addresses_required ?? 3
  const parts = ["The workflow ran on Browserbase but did not pass validation."]
  if (addrCount < minAddr) {
    parts.push(
      `Returned ${addrCount} result(s) (need ${minAddr}). Common causes: captcha, login wall, or incomplete extraction.`,
    )
  }
  if (run.browserbase_session_id || run.browserbase_debug_url) {
    parts.push("Open the session replay below to see what the browser did.")
  }
  return parts.join(" ")
}

export default function AutomationsPage() {
  const { user } = useSession()
  const [automations, setAutomations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [createScenarioId, setCreateScenarioId] = useState("zillow_listing_alert")
  const [createName, setCreateName] = useState("")
  const [draftParams, setDraftParams] = useState(() =>
    defaultParamsForScenario("zillow_listing_alert", ""),
  )
  const [editParams, setEditParams] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [viewingRunId, setViewingRunId] = useState(null)
  const [pollingRuns, setPollingRuns] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [createSchedule, setCreateSchedule] = useState(() => scheduleStateFromAutomation(null))
  const [editSchedule, setEditSchedule] = useState(() => scheduleStateFromAutomation(null))

  const loadAutomations = useCallback(async () => {
    const res = await fetch("/api/automations")
    if (res.status === 401) {
      setShowAuth(true)
      return
    }
    const json = await res.json()
    setAutomations(json.automations || [])
    if (json.automations?.length && !selectedId) {
      setSelectedId(json.automations[0].id)
    }
  }, [selectedId])

  const loadRuns = useCallback(async (id) => {
    if (!id) return []
    const res = await fetch(`/api/automations/${id}/runs`)
    if (!res.ok) return []
    const json = await res.json()
    const next = json.runs || []
    setRuns(next)
    return next
  }, [])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    loadAutomations().finally(() => setLoading(false))
  }, [user, loadAutomations])

  useEffect(() => {
    if (selectedId) loadRuns(selectedId)
  }, [selectedId, loadRuns])

  useEffect(() => {
    if (!user?.email) return
    setDraftParams((prev) =>
      prev.recipient_email ? prev : { ...prev, recipient_email: user.email },
    )
  }, [user?.email])

  useEffect(() => {
    setDraftParams(defaultParamsForScenario(createScenarioId, user?.email || ""))
  }, [createScenarioId, user?.email])

  const selected = automations.find((a) => a.id === selectedId)

  useEffect(() => {
    if (selected?.params) {
      setEditParams(structuredClone(selected.params))
    } else {
      setEditParams(null)
    }
    setEditSchedule(scheduleStateFromAutomation(selected))
  }, [selected?.id, selected?.params, selected?.schedule_kind, selected?.cron_expression, selected?.schedule_timezone])

  const hasRunningRun = runs.some((r) => r.status === "running")
  const activeRun = runs.find((r) => r.status === "running")
  const viewingRun = runs.find((r) => r.id === viewingRunId)

  useEffect(() => {
    if (!hasRunningRun && !pollingRuns) return
    if (!selectedId) return
    const interval = setInterval(() => loadRuns(selectedId), 2500)
    return () => clearInterval(interval)
  }, [hasRunningRun, pollingRuns, selectedId, loadRuns])

  useEffect(() => {
    if (!hasRunningRun) setPollingRuns(false)
  }, [hasRunningRun])

  useEffect(() => {
    if (!viewingRunId && runs.length) {
      const active =
        runs.find((r) => r.status === "running") ||
        (runs[0]?.browserbase_session_id ? runs[0] : null)
      if (active) setViewingRunId(active.id)
    }
  }, [runs, viewingRunId])

  function updateDraftFilter(key, value) {
    setDraftParams((prev) => ({
      ...prev,
      filters: { ...prev.filters, [key]: value },
    }))
  }

  function updateEditFilter(key, value) {
    setEditParams((prev) => ({
      ...prev,
      filters: { ...prev.filters, [key]: value },
    }))
  }

  function schedulePayload(schedule) {
    return {
      schedule_enabled: schedule.scheduleEnabled,
      schedule_kind: schedule.scheduleEnabled ? "cron" : "on_demand",
      schedule_frequency: schedule.scheduleFrequency,
      schedule_time: schedule.scheduleTime,
      schedule_weekday: schedule.scheduleWeekday,
      schedule_timezone: schedule.scheduleTimezone,
      cron_expression: schedule.cronExpression,
    }
  }

  async function createAutomation() {
    setCreating(true)
    try {
      const scenario = WORKFLOW_SCENARIOS.find((s) => s.id === createScenarioId)
      const defaultName =
        createScenarioId === "morphworks_sam_gov"
          ? "SAM.gov — MorphWorks"
          : `Zillow — ${draftParams.filters?.city || "search"}`
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: (createName || defaultName).trim(),
          scenario_id: createScenarioId,
          params: draftParams,
          ...schedulePayload(createSchedule),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error || "Failed to create automation")
        return
      }
      if (json.automation) {
        await loadAutomations()
        setSelectedId(json.automation.id)
        setCreateName("")
      }
    } finally {
      setCreating(false)
    }
  }

  async function saveAutomation() {
    if (!selectedId || !editParams) return
    setSaving(true)
    try {
      const res = await fetch(`/api/automations/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          params: editParams,
          ...schedulePayload(editSchedule),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error || "Failed to save")
        return
      }
      await loadAutomations()
    } finally {
      setSaving(false)
    }
  }

  async function runNow() {
    if (!selectedId) return
    setRunning(true)
    setPollingRuns(true)
    setViewingRunId(null)
    try {
      await fetch(`/api/automations/${selectedId}/run`, { method: "POST" })
      const next = await loadRuns(selectedId)
      if (next[0]?.id) setViewingRunId(next[0].id)
    } finally {
      setRunning(false)
    }
  }

  function selectRun(run) {
    setViewingRunId(run.id)
  }

  async function stopActiveRun() {
    if (!selectedId || !activeRun) return
    setStopping(true)
    try {
      const res = await fetch(
        `/api/automations/${selectedId}/runs/${activeRun.id}/stop`,
        { method: "POST" },
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(json.error || "Failed to stop run")
        return
      }
      await loadRuns(selectedId)
      setPollingRuns(false)
    } finally {
      setStopping(false)
    }
  }

  const draftFilters = draftParams.filters || ZILLOW_DEFAULT_FILTERS
  const editFilters = editParams?.filters || {}

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <AppBar />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-white">chromie.dev semi-deterministic automations</h1>
        <p className="mt-2 text-sm text-zinc-400">        </p>

        {!user && (
          <Card className={`mt-8 ${CARD_CLASS}`}>
            <CardContent className="pt-6">
              <p className="text-sm text-zinc-400">Sign in to manage automations.</p>
              <Button
                className="mt-4 bg-violet-600 text-white hover:bg-violet-500"
                onClick={() => setShowAuth(true)}
              >
                Sign in
              </Button>
            </CardContent>
          </Card>
        )}

        {user && (
          <>
            <Card className={`mt-8 ${CARD_CLASS}`}>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium text-zinc-100">
                  New automation
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  Choose a workflow, set parameters, then create.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <FilterField label="Workflow">
                  <select
                    value={createScenarioId}
                    onChange={(e) => setCreateScenarioId(e.target.value)}
                    className={`${INPUT_CLASS} w-full rounded-md px-3 py-2 text-sm`}
                  >
                    {WORKFLOW_SCENARIOS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </FilterField>

                <FilterField label="Name (optional)">
                  <Input
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Auto-generated if empty"
                    className={INPUT_CLASS}
                  />
                </FilterField>

                <AutomationParamFields
                  scenarioId={createScenarioId}
                  params={draftParams}
                  onParamsChange={setDraftParams}
                />

                {createScenarioId === "zillow_listing_alert" && (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <FilterField label="City">
                      <Input
                        value={draftFilters.city}
                        onChange={(e) => updateDraftFilter("city", e.target.value)}
                        className={INPUT_CLASS}
                      />
                    </FilterField>
                    <FilterField label="Min price">
                      <Input
                        type="number"
                        min={0}
                        step={1000}
                        value={draftFilters.min_price}
                        onChange={(e) =>
                          updateDraftFilter("min_price", Number(e.target.value))
                        }
                        className={INPUT_CLASS}
                      />
                    </FilterField>
                    <FilterField label="Max price">
                      <Input
                        type="number"
                        min={0}
                        step={1000}
                        value={draftFilters.max_price}
                        onChange={(e) =>
                          updateDraftFilter("max_price", Number(e.target.value))
                        }
                        className={INPUT_CLASS}
                      />
                    </FilterField>
                    <FilterField label="Min beds">
                      <Input
                        type="number"
                        min={0}
                        value={draftFilters.min_beds}
                        onChange={(e) =>
                          updateDraftFilter("min_beds", Number(e.target.value))
                        }
                        className={INPUT_CLASS}
                      />
                    </FilterField>
                  </div>
                )}

                {createScenarioId === "morphworks_sam_gov" && (
                  <FilterField label="Search keywords (one per line)">
                    <textarea
                      rows={5}
                      value={(draftParams.search_keywords || []).join("\n")}
                      onChange={(e) =>
                        setDraftParams((prev) => ({
                          ...prev,
                          search_keywords: e.target.value
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }))
                      }
                      className={`${INPUT_CLASS} w-full rounded-md px-3 py-2 text-sm font-mono`}
                    />
                  </FilterField>
                )}

                <AutomationScheduleFields
                  scheduleEnabled={createSchedule.scheduleEnabled}
                  scheduleFrequency={createSchedule.scheduleFrequency}
                  scheduleTime={createSchedule.scheduleTime}
                  scheduleWeekday={createSchedule.scheduleWeekday}
                  scheduleTimezone={createSchedule.scheduleTimezone}
                  cronExpression={createSchedule.cronExpression}
                  onChange={(patch) =>
                    setCreateSchedule((prev) => ({
                      ...prev,
                      ...(patch.schedule_enabled !== undefined
                        ? { scheduleEnabled: patch.schedule_enabled }
                        : {}),
                      ...(patch.schedule_frequency !== undefined
                        ? { scheduleFrequency: patch.schedule_frequency }
                        : {}),
                      ...(patch.schedule_time !== undefined
                        ? { scheduleTime: patch.schedule_time }
                        : {}),
                      ...(patch.schedule_weekday !== undefined
                        ? { scheduleWeekday: patch.schedule_weekday }
                        : {}),
                      ...(patch.schedule_timezone !== undefined
                        ? { scheduleTimezone: patch.schedule_timezone }
                        : {}),
                      ...(patch.cron_expression !== undefined
                        ? { cronExpression: patch.cron_expression }
                        : {}),
                    }))
                  }
                />

                <Button
                  type="button"
                  disabled={
                    creating ||
                    !String(draftParams.recipient_email || "").trim() ||
                    (createScenarioId === "zillow_listing_alert" &&
                      !draftFilters.city?.trim())
                  }
                  onClick={createAutomation}
                  className="bg-violet-600 text-white hover:bg-violet-500 focus-visible:ring-violet-500"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {creating ? "Creating…" : "Create automation"}
                </Button>
              </CardContent>
            </Card>

            {viewingRun && selectedId && (
              <Card className={`mt-8 ${CARD_CLASS}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium text-zinc-100">
                    {viewingRun.status === "running" ? "Live session" : "Session recording"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <WorkflowSessionViewer
                    automationId={selectedId}
                    runId={viewingRun.id}
                    runStatus={viewingRun.status}
                  />
                </CardContent>
              </Card>
            )}

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <Card className={CARD_CLASS}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-medium text-zinc-100">
                    Your automations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {loading && <p className="text-sm text-zinc-500">Loading…</p>}
                  {!loading && automations.length === 0 && (
                    <p className="text-sm text-zinc-500">No automations yet.</p>
                  )}
                  {automations.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedId(a.id)}
                      className={`w-full text-left rounded-lg px-3 py-2 text-sm border transition-colors ${
                        selectedId === a.id
                          ? "border-violet-500/80 bg-violet-500/15 text-zinc-100"
                          : "border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50"
                      }`}
                    >
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-zinc-500">
                        {a.scenario_id}
                        {a.schedule_kind === "cron" && (
                          <span className="ml-2 text-violet-400">scheduled</span>
                        )}
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className={CARD_CLASS}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-base font-medium text-zinc-100">Runs</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className={BTN_OUTLINE_CLASS}
                      disabled={!selectedId}
                      onClick={() => loadRuns(selectedId)}
                      aria-label="Refresh runs"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                    {hasRunningRun && activeRun && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={stopping}
                        onClick={stopActiveRun}
                        className="border-red-500/50 text-red-300 hover:bg-red-500/10 hover:border-red-500/70 hover:text-red-200"
                      >
                        <Square className="h-3 w-3 mr-1 fill-current" />
                        {stopping ? "Stopping…" : "Stop"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      disabled={!selectedId || running || hasRunningRun}
                      onClick={runNow}
                      className="bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      {running ? "Starting…" : "Run now"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[28rem] overflow-y-auto">
                  {selected && editParams && (
                    <div className="space-y-4 pb-4 border-b border-zinc-800">
                      <p className="text-xs font-medium text-zinc-500">Edit automation</p>
                      <AutomationParamFields
                        scenarioId={selected.scenario_id}
                        params={editParams}
                        onParamsChange={setEditParams}
                      />
                      {selected.scenario_id === "zillow_listing_alert" && (
                        <FilterField label="City">
                          <Input
                            value={editFilters.city || ""}
                            onChange={(e) => updateEditFilter("city", e.target.value)}
                            className={INPUT_CLASS}
                          />
                        </FilterField>
                      )}
                      {selected.scenario_id === "morphworks_sam_gov" && (
                        <FilterField label="Search keywords">
                          <textarea
                            rows={4}
                            value={(editParams.search_keywords || []).join("\n")}
                            onChange={(e) =>
                              setEditParams((prev) => ({
                                ...prev,
                                search_keywords: e.target.value
                                  .split("\n")
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              }))
                            }
                            className={`${INPUT_CLASS} w-full rounded-md px-3 py-2 text-sm font-mono`}
                          />
                        </FilterField>
                      )}
                      <AutomationScheduleFields
                        scheduleEnabled={editSchedule.scheduleEnabled}
                        scheduleFrequency={editSchedule.scheduleFrequency}
                        scheduleTime={editSchedule.scheduleTime}
                        scheduleWeekday={editSchedule.scheduleWeekday}
                        scheduleTimezone={editSchedule.scheduleTimezone}
                        cronExpression={editSchedule.cronExpression}
                        onChange={(patch) =>
                          setEditSchedule((prev) => ({
                            ...prev,
                            ...(patch.schedule_enabled !== undefined
                              ? { scheduleEnabled: patch.schedule_enabled }
                              : {}),
                            ...(patch.schedule_frequency !== undefined
                              ? { scheduleFrequency: patch.schedule_frequency }
                              : {}),
                            ...(patch.schedule_time !== undefined
                              ? { scheduleTime: patch.schedule_time }
                              : {}),
                            ...(patch.schedule_weekday !== undefined
                              ? { scheduleWeekday: patch.schedule_weekday }
                              : {}),
                            ...(patch.schedule_timezone !== undefined
                              ? { scheduleTimezone: patch.schedule_timezone }
                              : {}),
                            ...(patch.cron_expression !== undefined
                              ? { cronExpression: patch.cron_expression }
                              : {}),
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        disabled={saving || !String(editParams.recipient_email || "").trim()}
                        onClick={saveAutomation}
                        className="bg-violet-600 text-white hover:bg-violet-500"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        {saving ? "Saving…" : "Save changes"}
                      </Button>
                    </div>
                  )}
                  {!selected && (
                    <p className="text-sm text-zinc-500">Select an automation to view runs.</p>
                  )}
                  {selected && runs.length === 0 && (
                    <p className="text-sm text-zinc-500">No runs yet.</p>
                  )}
                  {runs.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => selectRun(r)}
                      className={`w-full text-left rounded-lg px-3 py-2 text-sm border transition-colors ${
                        viewingRunId === r.id
                          ? "border-violet-500/80 bg-violet-500/10"
                          : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex justify-between gap-2">
                        <span
                          className={
                            r.status === "success"
                              ? "text-emerald-400"
                              : r.status === "failed"
                                ? "text-red-400"
                                : r.status === "cancelled"
                                  ? "text-zinc-400"
                                  : "text-amber-400"
                          }
                        >
                          {r.status}
                          {r.status === "running" && (
                            <span className="ml-2 text-zinc-500 font-normal">live</span>
                          )}
                        </span>
                        <span className="text-xs text-zinc-500 shrink-0 text-right">
                          {r.started_at ? new Date(r.started_at).toLocaleString() : ""}
                          {r.duration_ms != null && (
                            <span className="block">{formatDuration(r.duration_ms)}</span>
                          )}
                        </span>
                      </div>
                      {(r.browserbase_debug_url || r.browserbase_session_id) && (
                        <span className="text-xs text-violet-400 mt-1 inline-block">
                          {viewingRunId === r.id ? "Viewing session" : "View session replay"}
                        </span>
                      )}
                      {r.error_message && (
                        <p className="text-xs text-red-300/90 mt-1.5 font-medium">
                          {r.error_message}
                        </p>
                      )}
                      {runFailureHint(r) && (
                        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                          {runFailureHint(r)}
                        </p>
                      )}
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
      <AuthModal open={showAuth} onOpenChange={setShowAuth} />
    </div>
  )
}
