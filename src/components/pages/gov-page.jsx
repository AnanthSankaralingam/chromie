"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/components/SessionProviderClient"
import { LABEL_CLASS } from "@/components/ui/app-dashboard-theme"
import { GovForbiddenState } from "@/components/ui/gov/gov-gate-cards"
import GovLoadingState from "@/components/ui/gov/gov-loading-state"
import GovPageHeader from "@/components/ui/gov/gov-page-header"
import GovPageShell from "@/components/ui/gov/gov-page-shell"
import OpportunityEmptyState from "@/components/ui/gov/opportunity-empty-state"
import OpportunityRow from "@/components/ui/gov/opportunity-row"
import OpportunityStats from "@/components/ui/gov/opportunity-stats"
import { isOpenOpportunity, sortOpportunityRuns } from "@/components/ui/gov/opportunity-utils"

const SORT_OPTIONS = [
  { id: "fit", label: "Best fit" },
  { id: "due", label: "Due soon" },
  { id: "newest", label: "Newest" },
]

export default function GovPage() {
  const { user, isLoading: sessionLoading } = useSession()
  const router = useRouter()
  const [showAuth, setShowAuth] = useState(false)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [runs, setRuns] = useState([])
  const [profileName, setProfileName] = useState("")
  const [sortBy, setSortBy] = useState("fit")
  const [expandedId, setExpandedId] = useState(null)
  const [error, setError] = useState("")

  const loadRuns = useCallback(async () => {
    setError("")
    const res = await fetch("/api/gov-runs")
    if (res.status === 401) {
      setShowAuth(true)
      setLoading(false)
      return
    }
    if (res.status === 403) {
      setForbidden(true)
      setLoading(false)
      return
    }
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(json.error || "Failed to load opportunities")
      setLoading(false)
      return
    }
    setRuns(json.runs || [])
    setProfileName(json.gov_profile?.name || "")
    setLoading(false)
  }, [])

  useEffect(() => {
    if (sessionLoading) return
    if (!user) {
      setShowAuth(true)
      setLoading(false)
      return
    }
    loadRuns()
  }, [user, sessionLoading, loadRuns])

  const sortedRuns = useMemo(() => sortOpportunityRuns(runs, sortBy), [runs, sortBy])
  const withDeadline = useMemo(() => runs.filter((run) => isOpenOpportunity(run)).length, [runs])
  const highFitCount = useMemo(
    () => runs.filter((run) => Number(run.fit_score) >= 0.9).length,
    [runs],
  )

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
    <GovPageShell authOpen={showAuth} onAuthClose={() => setShowAuth(false)} authRedirect="/gov">
      <GovPageHeader
        label="Government contracting"
        title={profileName ? `${profileName} opportunities` : "Opportunities"}
        description="Contract opportunities discovered by your SAM.gov automations, ranked by profile fit."
        actions={
          <div className="flex items-center gap-2">
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

      <OpportunityStats total={runs.length} openDeadlines={withDeadline} highFitCount={highFitCount} />

      {error ? (
        <p className="mt-8 text-sm text-red-400">{error}</p>
      ) : sortedRuns.length === 0 ? (
        <OpportunityEmptyState onGoToDashboard={() => router.push("/gov/dashboard")} />
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
    </GovPageShell>
  )
}
