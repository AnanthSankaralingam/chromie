"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/components/SessionProviderClient"
import { CARD_CLASS, SECTION_LABEL } from "@/components/ui/app-dashboard-theme"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  GovProfileRequiredGate,
  GovSignInGate,
} from "@/components/ui/gov/gov-gate-cards"
import {
  GOV_MATCH_SCENARIO_IDS,
  PRIMARY_GOV_SCENARIO_ID,
} from "@/lib/workflow-automations"
import SamMonitorScheduleCard from "@/components/ui/gov/sam-monitor-schedule-card"

const AutomationAuditSection = dynamic(
  () => import("@/components/automations/automation-audit-section"),
  {
    ssr: false,
    loading: () => (
      <Card className={`mt-8 ${CARD_CLASS}`}>
        <CardHeader className="border-b border-white/10 pb-4">
          <p className={SECTION_LABEL}>Audit</p>
          <CardTitle className="mt-1 text-base font-bold text-white">
            Government contract execution audit
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Loading audit history in the background.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-zinc-500">Loading audit log...</p>
        </CardContent>
      </Card>
    ),
  },
)

export default function GovMonitorSection({ onRequireAuth, auditDefaultCollapsed = false }) {
  const router = useRouter()
  const { user, supabase, isLoading: sessionLoading } = useSession()
  const auditRef = useRef(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [monitorLoading, setMonitorLoading] = useState(false)
  const [govProfileLinked, setGovProfileLinked] = useState(null)
  const [automations, setAutomations] = useState([])
  const [monitorStatus, setMonitorStatus] = useState(null)
  const [runs, setRuns] = useState([])
  const [selectedRunId, setSelectedRunId] = useState(null)
  const [stopping, setStopping] = useState(false)
  const [error, setError] = useState("")

  const activeRun =
    runs.find((run) => run.status === "running") || monitorStatus?.active_run || null
  const automationIds = useMemo(() => automations.map((item) => item.id).filter(Boolean), [automations])
  const scheduleSummary = monitorStatus?.schedule?.summary || "Not scheduled yet"
  const scheduleTimezone = monitorStatus?.schedule?.timezone || "America/New_York"

  const loadRuns = useCallback(async (items) => {
    const list = Array.isArray(items) ? items.filter(Boolean) : items ? [items] : []
    if (!list.length) {
      setRuns([])
      return []
    }
    const results = await Promise.all(
      list.map(async (item) => {
        const automation = typeof item === "string" ? { id: item } : item
        const res = await fetch(`/api/automations/${automation.id}/runs`)
        if (!res.ok) return []
        const json = await res.json()
        return (json.runs || []).map((run) => ({
          ...run,
          automation_id: automation.id,
          scenario_id: automation.scenario_id || run.scenario_id,
        }))
      }),
    )
    const next = results
      .flat()
      .sort((a, b) => new Date(b.started_at || 0).getTime() - new Date(a.started_at || 0).getTime())
    setRuns(next)
    if (next.length) {
      setSelectedRunId((prev) => (prev && next.some((run) => run.id === prev) ? prev : next[0].id))
    }
    return next
  }, [])

  const loadMonitorStatus = useCallback(async () => {
    const res = await fetch("/api/gov-monitor/status")
    if (res.status === 401) {
      onRequireAuth?.()
      return null
    }
    if (res.status === 403) {
      setGovProfileLinked(false)
      return null
    }
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(json.error || "Could not load contract search status.")
      return null
    }
    setMonitorStatus(json)
    return json
  }, [onRequireAuth])

  const loadDefaults = useCallback(async () => {
    const results = await Promise.all(
      GOV_MATCH_SCENARIO_IDS.map(async (scenarioId) => {
        const res = await fetch(
          `/api/automations/defaults?scenario_id=${encodeURIComponent(scenarioId)}`,
        )
        if (res.status === 401) {
          return { scenarioId, unauthorized: true }
        }
        if (!res.ok) {
          return { scenarioId, json: null }
        }
        return { scenarioId, json: await res.json() }
      }),
    )
    if (results.some((result) => result.unauthorized)) {
      onRequireAuth?.()
      return null
    }
    const paramsByScenario = Object.fromEntries(
      results
        .filter((result) => result.json?.params)
        .map((result) => [result.scenarioId, result.json.params]),
    )
    const govProfileId = results.find((result) => result.json?.gov_profile_id)?.json?.gov_profile_id
    setGovProfileLinked(Boolean(govProfileId))
    return { paramsByScenario, gov_profile_id: govProfileId || null }
  }, [onRequireAuth])

  const createBaseAutomation = useCallback(async (scenarioId, params) => {
    const res = await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Contract opportunity search",
        scenario_id: scenarioId,
        params: params || undefined,
        ensure_singleton: true,
        schedule_enabled: false,
        schedule_kind: "on_demand",
      }),
    })

    if (res.status === 401) {
      onRequireAuth?.()
      return null
    }

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(json.error || "Could not initialize your contract search monitor.")
      return null
    }

    return json.automation || null
  }, [onRequireAuth])

  const loadAutomation = useCallback(async ({ createIfMissing = false, params } = {}) => {
    const res = await fetch("/api/automations")
    if (res.status === 401) {
      onRequireAuth?.()
      return null
    }
    if (!res.ok) {
      setError("Could not load your contract search monitor.")
      return null
    }
    const json = await res.json()
    const existing = json.automations || []
    const paramsByScenario = params?.paramsByScenario || params || {}
    const govAutomations = []

    for (const scenarioId of GOV_MATCH_SCENARIO_IDS) {
      let govAutomation = existing.find((item) => item.scenario_id === scenarioId) || null
      if (!govAutomation && createIfMissing) {
        govAutomation = await createBaseAutomation(scenarioId, paramsByScenario[scenarioId])
      }
      if (govAutomation) {
        govAutomations.push(govAutomation)
      }
    }

    setAutomations(govAutomations)
    if (govAutomations.length) {
      await loadRuns(govAutomations)
    } else {
      setRuns([])
      setSelectedRunId(null)
    }
    return govAutomations
  }, [createBaseAutomation, loadRuns, onRequireAuth])

  useEffect(() => {
    if (sessionLoading) return

    if (!user || !supabase) {
      setProfileLoading(false)
      setMonitorLoading(false)
      setGovProfileLinked(false)
      setAutomations([])
      setRuns([])
      setMonitorStatus(null)
      return
    }

    let cancelled = false
    async function loadPage() {
      setProfileLoading(true)
      setMonitorLoading(false)
      setError("")

      const [{ data: profile }, defaults] = await Promise.all([
        supabase.from("profiles").select("gov_profile_id").eq("id", user.id).maybeSingle(),
        loadDefaults(),
      ])
      if (cancelled) return
      const linked = Boolean(profile?.gov_profile_id || defaults?.gov_profile_id)
      setGovProfileLinked(linked)
      setProfileLoading(false)
      if (linked) {
        setMonitorLoading(true)
        await Promise.all([
          loadMonitorStatus(),
          loadAutomation({
            createIfMissing: true,
            params: defaults,
          }),
        ])
        if (!cancelled) setMonitorLoading(false)
      }
    }

    loadPage().catch((err) => {
      console.error("[gov-monitor] load failed", err)
      if (!cancelled) {
        setError("Could not load contract monitoring.")
        setProfileLoading(false)
        setMonitorLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [loadAutomation, loadDefaults, loadMonitorStatus, sessionLoading, supabase, user])

  async function refreshProgress(items = automations) {
    await Promise.all([
      loadMonitorStatus(),
      items?.length ? loadRuns(items) : Promise.resolve([]),
      auditRef.current?.refresh?.(),
    ])
  }

  async function stopActiveRun() {
    const runAutomationId = activeRun?.automation_id
    const runId = activeRun?.id
    if (!runAutomationId || !runId) return
    setStopping(true)
    setError("")
    try {
      const res = await fetch(`/api/automations/${runAutomationId}/runs/${runId}/stop`, {
        method: "POST",
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || "Could not stop the active run.")
        return
      }
      await refreshProgress(automations)
    } finally {
      setStopping(false)
    }
  }

  function selectAuditRun(run) {
    if (automationIds.includes(run.automation_id)) {
      loadRuns(automations)
    }
    setSelectedRunId(run.id)
  }

  return (
    <section id="gov-monitor" className="mt-12 border-t border-white/10 pt-12">
      <div>
        <p className={SECTION_LABEL}>Contract monitoring</p>
        <h2 className="mt-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
          Government contract monitoring
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
          Chromie searches government contract sources automatically each day. Review execution
          audits below for run history and session details.
        </p>
      </div>

      {sessionLoading ? (
        <Card className={`mt-8 ${CARD_CLASS}`}>
          <CardContent className="px-5 py-6">
            <p className="text-sm text-zinc-500">Checking your session...</p>
          </CardContent>
        </Card>
      ) : !user ? (
        <GovSignInGate
          message="Sign in to view your government monitoring schedule."
          onSignIn={() => onRequireAuth?.()}
        />
      ) : profileLoading ? (
        <Card className={`mt-8 ${CARD_CLASS}`}>
          <CardContent className="px-5 py-6">
            <p className="text-sm text-zinc-500">Checking your government profile...</p>
          </CardContent>
        </Card>
      ) : !govProfileLinked ? (
        <GovProfileRequiredGate
          description="Chromie uses your profile to configure government contract searches and rank matching opportunities."
          onSetup={() => router.push("/gov/onboarding")}
        />
      ) : (
        <>
          <div className="mt-8">
            <SamMonitorScheduleCard
              error={error}
              scheduleSummary={scheduleSummary}
              nextRunAt={monitorStatus?.next_run_at}
              lastRunAt={monitorStatus?.last_run_at}
              scheduleTimezone={scheduleTimezone}
              initializing={monitorLoading}
              activeRun={activeRun}
              onStopRun={stopActiveRun}
              stopping={stopping}
            />
          </div>

          <AutomationAuditSection
            ref={auditRef}
            user={user}
            scenarioIds={[PRIMARY_GOV_SCENARIO_ID]}
            selectedAutomationIds={automationIds}
            selectedRunId={selectedRunId}
            title="Government contract execution audit"
            description="Status, validation notes, and session details for search runs across your organization."
            emptyMessage="No contract search executions yet. Your first automatic search will appear here once it starts."
            onSelectRun={selectAuditRun}
            onRefresh={() => refreshProgress(automations)}
            pollWhileRunning
            autoExpandRunning={false}
            defaultCollapsed={auditDefaultCollapsed}
          />
        </>
      )}
    </section>
  )
}
