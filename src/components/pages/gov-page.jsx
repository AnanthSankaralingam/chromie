"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/components/SessionProviderClient"
import { BTN_OUTLINE, LABEL_CLASS } from "@/components/ui/app-dashboard-theme"
import { Button } from "@/components/ui/button"
import { GovForbiddenState } from "@/components/ui/gov/gov-gate-cards"
import GovLoadingState from "@/components/ui/gov/gov-loading-state"
import GovMonitorSection from "@/components/ui/gov/gov-monitor-section"
import GovPageHeader from "@/components/ui/gov/gov-page-header"
import GovPageShell from "@/components/ui/gov/gov-page-shell"
import OpportunityEmptyState from "@/components/ui/gov/opportunity-empty-state"
import OpportunityRow from "@/components/ui/gov/opportunity-row"
import OpportunityStats from "@/components/ui/gov/opportunity-stats"
import { formatNextRunLabel } from "@/components/ui/gov/sam-monitor-schedule-card"
import { isOpenOpportunity, boostFitScore, sortOpportunityRuns } from "@/components/ui/gov/opportunity-utils"

const SORT_OPTIONS = [
  { id: "fit", label: "Best fit" },
  { id: "due", label: "Due soon" },
  { id: "newest", label: "Newest" },
]

function runsDataKey(runs) {
  return runs
    .map((run) =>
      [
        run.id,
        run.updated_at,
        run.fit_score,
        run.title,
        run.response_date,
        run.profile_fit_verified,
      ].join(":"),
    )
    .join("|")
}

export default function GovPage() {
  const { user, isLoading: sessionLoading } = useSession()
  const router = useRouter()
  const [showAuth, setShowAuth] = useState(false)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [runs, setRuns] = useState([])
  const [monitorStatus, setMonitorStatus] = useState(null)
  const [sortBy, setSortBy] = useState("fit")
  const [expandedId, setExpandedId] = useState(null)
  const [error, setError] = useState("")

  const handleRequireAuth = useCallback(() => setShowAuth(true), [])

  const loadPageData = useCallback(async () => {
    setError("")
    const [runsRes, statusRes] = await Promise.all([
      fetch("/api/gov-runs"),
      fetch("/api/gov-monitor/status"),
    ])

    if (runsRes.status === 401 || statusRes.status === 401) {
      setShowAuth(true)
      setLoading(false)
      return
    }
    if (runsRes.status === 403) {
      setForbidden(true)
      setLoading(false)
      return
    }

    const runsJson = await runsRes.json().catch(() => ({}))
    if (!runsRes.ok) {
      setError(runsJson.error || "Failed to load opportunities")
      setLoading(false)
      return
    }

    if (statusRes.ok) {
      const statusJson = await statusRes.json().catch(() => ({}))
      setMonitorStatus((prev) => {
        const next = statusJson
        if (prev && JSON.stringify(prev) === JSON.stringify(next)) return prev
        return next
      })
    }

    const nextRuns = runsJson.runs || []
    setRuns((prev) => (runsDataKey(prev) === runsDataKey(nextRuns) ? prev : nextRuns))
    setLoading(false)
  }, [])

  useEffect(() => {
    if (sessionLoading) return
    if (!user) {
      setShowAuth(true)
      setLoading(false)
      return
    }
    loadPageData()
  }, [user, sessionLoading, loadPageData])

  const activeRunId = monitorStatus?.active_run?.id ?? null

  useEffect(() => {
    if (!activeRunId || loading) return
    const interval = window.setInterval(() => {
      loadPageData().catch((err) => {
        console.error("[gov-page] refresh while running failed", err)
      })
    }, 8000)
    return () => window.clearInterval(interval)
  }, [activeRunId, loading, loadPageData])

  const sortedRuns = useMemo(() => sortOpportunityRuns(runs, sortBy), [runs, sortBy])
  const withDeadline = useMemo(() => runs.filter((run) => isOpenOpportunity(run)).length, [runs])
  const highFitCount = useMemo(
    () => runs.filter((run) => boostFitScore(run.fit_score) >= 0.9).length,
    [runs],
  )

  const statusBanner = useMemo(() => {
    if (!monitorStatus) return null
    if (monitorStatus.active_run) {
      return {
        tone: "active",
        message:
          "Searching SAM.gov and the SBIR Tech Marketplace now. Results usually appear within 1–5 minutes.",
      }
    }
    if (monitorStatus.schedule?.enabled && monitorStatus.next_run_at) {
      return {
        tone: "scheduled",
        message: `Next automatic search: ${formatNextRunLabel(
          monitorStatus.next_run_at,
          monitorStatus.schedule.timezone,
        )}.`,
      }
    }
    return {
      tone: "idle",
      message: "Automatic daily contract searches will appear here once monitoring is configured.",
    }
  }, [monitorStatus])

  if (loading || sessionLoading) {
    return <GovLoadingState message="Loading opportunities…" />
  }

  if (forbidden) {
    return (
      <GovPageShell
        maxWidth="lg"
        authOpen={showAuth}
        onAuthClose={() => setShowAuth(false)}
        authRedirect="/gov"
      >
        <GovForbiddenState
          title="Government opportunities unavailable"
          description="Your account is not linked to a government contractor profile yet. Set up your company profile to start finding opportunities."
          actionLabel="Set up company profile"
          onAction={() => router.push("/gov/onboarding")}
        />
      </GovPageShell>
    )
  }

  return (
    <GovPageShell
      maxWidth="5xl"
      authOpen={showAuth}
      onAuthClose={() => setShowAuth(false)}
      authRedirect="/gov"
    >
      <GovPageHeader
        label="Government contracting"
        title="Opportunity search"
        description="Contract opportunities discovered by your daily contract searches, ranked by profile fit."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild className={BTN_OUTLINE}>
              <Link href="/profile">Company profile</Link>
            </Button>
            <label htmlFor="gov-sort" className={`${LABEL_CLASS} sr-only`}>
              Sort by
            </label>
            <select
              id="gov-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-none border border-white/15 bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:border-cyan-400/45 focus:outline-none focus:ring-1 focus:ring-cyan-400/25"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {statusBanner ? (
        <div
          className={
            statusBanner.tone === "active"
              ? "mt-6 border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100"
              : "mt-6 border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-300"
          }
        >
          {statusBanner.message}
        </div>
      ) : null}

      <OpportunityStats total={runs.length} openDeadlines={withDeadline} highFitCount={highFitCount} />

      {error ? (
        <p className="mt-8 text-sm text-red-400">{error}</p>
      ) : sortedRuns.length === 0 ? (
        <OpportunityEmptyState
          monitorStatus={monitorStatus}
          onScrollToMonitor={() =>
            document.getElementById("gov-monitor")?.scrollIntoView({ behavior: "smooth" })
          }
        />
      ) : (
        <div className="mt-8 space-y-2">
          {sortedRuns.map((run) => (
            <OpportunityRow
              key={run.id}
              run={run}
              expanded={expandedId === run.id}
              onToggle={() => setExpandedId((id) => (id === run.id ? null : run.id))}
            />
          ))}
        </div>
      )}

      <GovMonitorSection onRequireAuth={handleRequireAuth} />
    </GovPageShell>
  )
}
