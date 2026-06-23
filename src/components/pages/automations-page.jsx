"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "@/components/SessionProviderClient"
import AutomationAuditSection from "@/components/automations/automation-audit-section"
import AutomationParamFields from "@/components/automations/automation-param-fields"
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
  DIVIDER,
  INPUT_CLASS,
  LABEL_CLASS,
  LIST_ITEM,
  LIST_ITEM_SELECTED,
  SECTION_LABEL,
} from "@/components/ui/app-dashboard-theme"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/forms-and-input/input"
import { FilmGrain } from "@/components/ui/landing/landing-motion"
import AuthModal from "@/components/ui/modals/modal-auth"
import { formatDuration } from "@/lib/workflow-audit"
import {
  defaultParamsForScenario,
  DEFAULT_WORKFLOW_SCENARIO_ID,
  WORKFLOW_SCENARIOS,
  ZILLOW_DEFAULT_FILTERS,
} from "@/lib/workflow-automations"
import { Play, Plus, RefreshCw, Save, Square, Trash2 } from "lucide-react"

function FilterField({ label, children }) {
  return (
    <div className="min-w-0">
      <label className={LABEL_CLASS}>{label}</label>
      {children}
    </div>
  )
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
  const [createScenarioId, setCreateScenarioId] = useState(DEFAULT_WORKFLOW_SCENARIO_ID)
  const [createName, setCreateName] = useState("")
  const [draftParams, setDraftParams] = useState(() =>
    defaultParamsForScenario(DEFAULT_WORKFLOW_SCENARIO_ID, ""),
  )
  const [editParams, setEditParams] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [viewingRunId, setViewingRunId] = useState(null)
  const [stopping, setStopping] = useState(false)
  const [createSchedule, setCreateSchedule] = useState(() => scheduleStateFromAutomation(null))
  const [editSchedule, setEditSchedule] = useState(() => scheduleStateFromAutomation(null))
  const [deletingId, setDeletingId] = useState(null)
  const [refreshingRuns, setRefreshingRuns] = useState(false)
  const auditRef = useRef(null)

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

  const refreshProgress = useCallback(
    async (automationId = selectedId) => {
      await Promise.all([
        automationId ? loadRuns(automationId) : Promise.resolve(),
        auditRef.current?.refresh?.(),
      ])
    },
    [selectedId, loadRuns],
  )

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

  async function deleteAutomation(id, name) {
    if (
      !window.confirm(
        `Delete "${name}"? This removes the automation and its EventBridge schedule.`,
      )
    ) {
      return
    }
    setDeletingId(id)
    try {
      const res = await fetch(`/api/automations/${id}`, { method: "DELETE" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(json.error || "Failed to delete automation")
        return
      }
      const remaining = automations.filter((a) => a.id !== id)
      setAutomations(remaining)
      if (selectedId === id) {
        setSelectedId(remaining[0]?.id ?? null)
        setRuns([])
        setViewingRunId(null)
      }
      await loadAutomations()
    } finally {
      setDeletingId(null)
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
    try {
      await fetch(`/api/automations/${selectedId}/run`, { method: "POST" })
      await refreshProgress(selectedId)
    } finally {
      setRunning(false)
    }
  }

  async function refreshRuns() {
    if (!selectedId) return
    setRefreshingRuns(true)
    try {
      await refreshProgress(selectedId)
    } finally {
      setRefreshingRuns(false)
    }
  }

  function selectRun(run) {
    setViewingRunId(run.id)
  }

  function selectAuditRun(run) {
    if (run.automation_id) {
      setSelectedId(run.automation_id)
      loadRuns(run.automation_id)
    }
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
      await auditRef.current?.refresh?.()
    } finally {
      setStopping(false)
    }
  }

  const draftFilters = draftParams.filters || ZILLOW_DEFAULT_FILTERS
  const editFilters = editParams?.filters || {}

  return (
    <div className={APP_PAGE}>
      <FilmGrain />
      <AppBarDashboard />
      <main className="relative z-[1] mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <p className={SECTION_LABEL}>Dashboard</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Automations</h1>
        <p className="mt-2 max-w-xl text-sm text-zinc-400">
          Schedule and run browser workflows with deterministic tools.
        </p>

        {!user && (
          <Card className={`mt-8 ${CARD_CLASS}`}>
            <CardContent className="pt-6">
              <p className="text-sm text-zinc-400">Sign in to manage automations.</p>
              <Button className={`mt-4 ${BTN_PRIMARY}`} onClick={() => setShowAuth(true)}>
                Sign in
              </Button>
            </CardContent>
          </Card>
        )}

        {user && (
          <>
            <Card className={`mt-8 ${CARD_CLASS}`}>
              <CardHeader className="border-b border-white/10 pb-4">
                <CardTitle className="text-base font-bold text-white">Configure automation</CardTitle>
                <CardDescription className="text-zinc-400">
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
                  scheduleTimes={createSchedule.scheduleTimes}
                  scheduleWeekday={createSchedule.scheduleWeekday}
                  scheduleTimezone={createSchedule.scheduleTimezone}
                  onChange={(patch) => setCreateSchedule((prev) => applySchedulePatch(prev, patch))}
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
                  className={BTN_PRIMARY}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {creating ? "Creating…" : "Create automation"}
                </Button>
              </CardContent>
            </Card>

            <div className="mt-8 grid gap-px bg-white/10 md:grid-cols-2">
              <Card className={`${CARD_CLASS} md:border-r-0`}>
                <CardHeader className="border-b border-white/10 pb-4">
                  <CardTitle className="text-base font-bold text-white">Your automations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {loading && <p className="text-sm text-zinc-500">Loading…</p>}
                  {!loading && automations.length === 0 && (
                    <p className="text-sm text-zinc-500">No automations yet.</p>
                  )}
                  {automations.map((a) => (
                    <div
                      key={a.id}
                      className={`flex items-stretch gap-px border text-sm ${
                        selectedId === a.id ? LIST_ITEM_SELECTED : LIST_ITEM
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(a.id)}
                        className="flex-1 min-w-0 text-left px-3 py-2 text-zinc-300"
                      >
                        <div className="font-medium text-zinc-100 truncate">{a.name}</div>
                        <div className="text-xs text-zinc-500">
                          {a.scenario_id}
                          {a.schedule_kind === "cron" && (
                            <span className={`ml-2 ${ACCENT}`}>scheduled</span>
                          )}
                        </div>
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === a.id}
                        onClick={() => deleteAutomation(a.id, a.name)}
                        className="shrink-0 px-3 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-r-lg disabled:opacity-40"
                        aria-label={`Delete ${a.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className={CARD_CLASS}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-white/10 pb-4">
                  <CardTitle className="text-base font-bold text-white">Runs</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className={BTN_OUTLINE}
                      disabled={!selectedId || refreshingRuns}
                      onClick={refreshRuns}
                      aria-label="Refresh runs"
                    >
                      <RefreshCw className={`h-3 w-3 ${refreshingRuns ? "animate-spin" : ""}`} />
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
                      className={`${BTN_PRIMARY} disabled:opacity-40`}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      {running ? "Starting…" : "Run now"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[28rem] overflow-y-auto">
                  {selected && editParams && (
                    <div className={`space-y-4 border-b pb-4 ${DIVIDER}`}>
                      <p className={SECTION_LABEL}>Edit automation</p>
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
                        scheduleTimes={editSchedule.scheduleTimes}
                        scheduleWeekday={editSchedule.scheduleWeekday}
                        scheduleTimezone={editSchedule.scheduleTimezone}
                        onChange={(patch) =>
                          setEditSchedule((prev) => applySchedulePatch(prev, patch))
                        }
                      />
                      <Button
                        size="sm"
                        disabled={saving || !String(editParams.recipient_email || "").trim()}
                        onClick={saveAutomation}
                        className={BTN_PRIMARY}
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
                      className={`w-full rounded-none px-3 py-2 text-left text-sm border transition-colors ${
                        viewingRunId === r.id
                          ? LIST_ITEM_SELECTED
                          : `${LIST_ITEM} bg-[#0a0a0a]`
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

            <AutomationAuditSection
              ref={auditRef}
              user={user}
              selectedAutomationId={selectedId}
              selectedRunId={viewingRunId}
              onSelectRun={selectAuditRun}
              onRefresh={refreshProgress}
            />
          </>
        )}
      </main>
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        redirectUrl="/dashboard"
      />
    </div>
  )
}
