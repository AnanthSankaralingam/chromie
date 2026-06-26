"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "@/components/SessionProviderClient"
import { scheduleStateFromAutomation } from "@/components/automations/automation-schedule-fields"
import { BTN_OUTLINE, CARD_CLASS, SECTION_LABEL } from "@/components/ui/app-dashboard-theme"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  GovProfileRequiredGate,
  GovSignInGate,
} from "@/components/ui/gov/gov-gate-cards"
import GovPageHeader from "@/components/ui/gov/gov-page-header"
import GovPageShell from "@/components/ui/gov/gov-page-shell"
import SamMonitorScheduleCard from "@/components/ui/gov/sam-monitor-schedule-card"

const GOV_MATCH_SCENARIO_ID = "morphworks_sam_gov"

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
    ...(patch.schedule_enabled !== undefined ? { scheduleEnabled: patch.schedule_enabled } : {}),
    ...(patch.schedule_frequency !== undefined
      ? { scheduleFrequency: patch.schedule_frequency }
      : {}),
    ...(patch.schedule_times !== undefined ? { scheduleTimes: patch.schedule_times } : {}),
    ...(patch.schedule_weekday !== undefined ? { scheduleWeekday: patch.schedule_weekday } : {}),
    ...(patch.schedule_timezone !== undefined ? { scheduleTimezone: patch.schedule_timezone } : {}),
  }
}

export default function GovDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, supabase, isLoading: sessionLoading } = useSession()
  const [showAuth, setShowAuth] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [monitorLoading, setMonitorLoading] = useState(false)
  const [govProfileLinked, setGovProfileLinked] = useState(null)
  const [automation, setAutomation] = useState(null)
  const [schedule, setSchedule] = useState(() => scheduleStateFromAutomation(null))
  const [runs, setRuns] = useState([])
  const [selectedRunId, setSelectedRunId] = useState(null)
  const [auditRefreshKey, setAuditRefreshKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [error, setError] = useState("")
  const provisionAttemptedRef = useRef(false)

  const activeRun = runs.find((run) => run.status === "running")
  const automationId = automation?.id
  const defaultSchedule = useMemo(() => scheduleStateFromAutomation(null), [])

  const loadRuns = useCallback(async (id) => {
    if (!id) {
      setRuns([])
      return []
    }
    const res = await fetch(`/api/automations/${id}/runs`)
    if (!res.ok) return []
    const json = await res.json()
    const next = json.runs || []
    setRuns(next)
    if (next.length) {
      setSelectedRunId((prev) => (prev && next.some((run) => run.id === prev) ? prev : next[0].id))
    }
    return next
  }, [])

  const loadDefaults = useCallback(async () => {
    const res = await fetch(
      `/api/automations/defaults?scenario_id=${encodeURIComponent(GOV_MATCH_SCENARIO_ID)}`,
    )
    if (res.status === 401) {
      setShowAuth(true)
      return null
    }
    if (!res.ok) return null
    const json = await res.json()
    setGovProfileLinked(Boolean(json.gov_profile_id))
    return json
  }, [])

  const createBaseAutomation = useCallback(async (params) => {
    const res = await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Contract opportunity search",
        scenario_id: GOV_MATCH_SCENARIO_ID,
        params: params || undefined,
        ensure_singleton: true,
        ...schedulePayload(defaultSchedule),
      }),
    })

    if (res.status === 401) {
      setShowAuth(true)
      return null
    }

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(json.error || "Could not initialize your contract search monitor.")
      return null
    }

    return json.automation || null
  }, [defaultSchedule])

  const loadAutomation = useCallback(async ({ createIfMissing = false, params } = {}) => {
    const res = await fetch("/api/automations")
    if (res.status === 401) {
      setShowAuth(true)
      return null
    }
    if (!res.ok) {
      setError("Could not load your contract search monitor.")
      return null
    }
    const json = await res.json()
    let govAutomation =
      (json.automations || []).find((item) => item.scenario_id === GOV_MATCH_SCENARIO_ID) || null

    if (!govAutomation && createIfMissing) {
      govAutomation = await createBaseAutomation(params)
    }

    setAutomation(govAutomation)
    setSchedule(scheduleStateFromAutomation(govAutomation))
    if (govAutomation?.id) {
      await loadRuns(govAutomation.id)
    } else {
      setRuns([])
      setSelectedRunId(null)
    }
    return govAutomation
  }, [createBaseAutomation, loadRuns])

  useEffect(() => {
    if (sessionLoading) return

    if (!user || !supabase) {
      setProfileLoading(false)
      setMonitorLoading(false)
      setGovProfileLinked(false)
      setAutomation(null)
      setRuns([])
      return
    }

    let cancelled = false
    async function loadPage() {
      setProfileLoading(true)
      setMonitorLoading(false)
      setError("")

      if (searchParams.get("provision") === "try" && !provisionAttemptedRef.current) {
        provisionAttemptedRef.current = true
        const provisionRes = await fetch("/api/gov-try", { method: "POST" })
        const provisionJson = await provisionRes.json().catch(() => ({}))
        if (!provisionRes.ok) {
          if (!cancelled) {
            setError(provisionJson.error || "Could not set up your government profile.")
            setProfileLoading(false)
          }
          return
        }
        console.log("[gov-dashboard] provisioned try profile", provisionJson.gov_profile?.id)
        router.replace("/gov/dashboard")
      }

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
        await loadAutomation({
          createIfMissing: true,
          params: defaults?.params,
        })
        if (!cancelled) setMonitorLoading(false)
      }
    }

    loadPage().catch((err) => {
      console.error("[gov-dashboard] load failed", err)
      if (!cancelled) {
        setError("Could not load your government dashboard.")
        setProfileLoading(false)
        setMonitorLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [loadAutomation, loadDefaults, router, searchParams, sessionLoading, supabase, user])

  const scheduleSummary = useMemo(() => {
    if (!schedule.scheduleEnabled) return "On demand only"
    const times = schedule.scheduleTimes.join(", ")
    if (schedule.scheduleFrequency === "weekly") {
      return `Weekly on ${schedule.scheduleWeekday} at ${times} (${schedule.scheduleTimezone})`
    }
    return `Daily at ${times} (${schedule.scheduleTimezone})`
  }, [schedule])

  async function refreshProgress(id = automationId) {
    await (id ? loadRuns(id) : Promise.resolve([]))
    setAuditRefreshKey((key) => key + 1)
  }

  async function saveSchedule() {
    if (!govProfileLinked) return
    if (!automationId) {
      setError("Chromie is still initializing your contract search monitor. Refresh and try again.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const body = { ...schedulePayload(schedule) }
      const res = await fetch(`/api/automations/${automationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || "Could not save the contract search schedule.")
        return
      }
      const next = json.automation
      if (next) {
        setAutomation(next)
        setSchedule(scheduleStateFromAutomation(next))
        await refreshProgress(next.id)
      }
    } finally {
      setSaving(false)
    }
  }

  async function runNow() {
    if (!automationId) {
      setError("Chromie is still initializing your contract search monitor. Refresh and try again.")
      return
    }
    setRunning(true)
    setError("")
    try {
      const res = await fetch(`/api/automations/${automationId}/run`, { method: "POST" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || "Could not start the contract search run.")
        return
      }
      await refreshProgress(automationId)
    } finally {
      setRunning(false)
    }
  }

  async function stopActiveRun() {
    if (!automationId || !activeRun) return
    setStopping(true)
    setError("")
    try {
      const res = await fetch(`/api/automations/${automationId}/runs/${activeRun.id}/stop`, {
        method: "POST",
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || "Could not stop the active run.")
        return
      }
      await refreshProgress(automationId)
    } finally {
      setStopping(false)
    }
  }

  function selectAuditRun(run) {
    if (run.automation_id === automationId) {
      loadRuns(run.automation_id)
    }
    setSelectedRunId(run.id)
  }

  return (
    <GovPageShell
      maxWidth="5xl"
      authOpen={showAuth}
      onAuthClose={() => setShowAuth(false)}
      authRedirect="/gov/dashboard"
    >
      <GovPageHeader
        label="Government dashboard"
        title="Government contract monitoring"
        description="Set when Chromie should search government contract sources, run it on demand, and review execution audits. Your company profile controls the search terms and opportunity fit."
        actions={
          <>
            <Button asChild className={BTN_OUTLINE}>
              <Link href="/gov">View opportunities</Link>
            </Button>
            <Button asChild className={BTN_OUTLINE}>
              <Link href="/profile">Company profile</Link>
            </Button>
          </>
        }
      />

      {sessionLoading ? (
        <Card className={`mt-8 ${CARD_CLASS}`}>
          <CardContent className="px-5 py-6">
            <p className="text-sm text-zinc-500">Checking your session...</p>
          </CardContent>
        </Card>
      ) : !user ? (
        <GovSignInGate
          message="Sign in to manage your government monitoring schedule."
          onSignIn={() => setShowAuth(true)}
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
              schedule={schedule}
              onScheduleChange={(patch) => setSchedule((prev) => applySchedulePatch(prev, patch))}
              onSave={saveSchedule}
              saving={saving}
              automationId={automationId}
              initializing={monitorLoading}
              onRunNow={runNow}
              running={running}
              activeRun={activeRun}
              onStopRun={stopActiveRun}
              stopping={stopping}
            />
          </div>

          <AutomationAuditSection
            key={auditRefreshKey}
            user={user}
            scenarioId={GOV_MATCH_SCENARIO_ID}
            selectedAutomationId={automationId}
            selectedRunId={selectedRunId}
            title="Government contract execution audit"
            description="Status, validation notes, and session details for search runs."
            emptyMessage="No contract search executions yet. Run the monitor to see audit history here."
            onSelectRun={selectAuditRun}
            onRefresh={() => refreshProgress(automationId)}
          />
        </>
      )}
    </GovPageShell>
  )
}
