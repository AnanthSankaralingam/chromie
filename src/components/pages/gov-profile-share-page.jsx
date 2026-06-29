"use client"

import { useEffect, useMemo, useState } from "react"
import { BTN_OUTLINE, BTN_PRIMARY, LABEL_CLASS } from "@/components/ui/app-dashboard-theme"
import { Button } from "@/components/ui/button"
import GovLoadingState from "@/components/ui/gov/gov-loading-state"
import GovPageHeader from "@/components/ui/gov/gov-page-header"
import GovPageShell from "@/components/ui/gov/gov-page-shell"
import OpportunityRow from "@/components/ui/gov/opportunity-row"
import OpportunityStats from "@/components/ui/gov/opportunity-stats"
import { CAL_URL } from "@/components/ui/landing/landing-content"
import { boostFitScore, isOpenOpportunity, sortOpportunityRuns } from "@/components/ui/gov/opportunity-utils"
import { ArrowRight } from "lucide-react"

const SORT_OPTIONS = [
  { id: "fit", label: "Best fit" },
  { id: "due", label: "Due soon" },
  { id: "newest", label: "Newest" },
]

const PUBLIC_VISIBLE_RUN_LIMIT = 5

function buildOnboardingPath(govProfile) {
  const companyDomain = govProfile?.company_domain
  return companyDomain ? `/gov/onboarding?company=${encodeURIComponent(companyDomain)}` : "/gov/onboarding"
}

export default function GovProfileSharePage({ govProfileId }) {
  const [loading, setLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [sortBy, setSortBy] = useState("fit")
  const [expandedId, setExpandedId] = useState(null)
  const [govProfile, setGovProfile] = useState(null)
  const [runs, setRuns] = useState([])
  const [error, setError] = useState("")
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadShare() {
      setLoading(true)
      setError("")
      setNotFound(false)

      try {
        const res = await fetch(`/api/gov-share/${encodeURIComponent(govProfileId)}`)
        const json = await res.json().catch(() => ({}))
        if (cancelled) return

        if (res.status === 404) {
          setNotFound(true)
          setLoading(false)
          return
        }

        if (!res.ok) {
          setError(json.error || "Failed to load shared opportunities.")
          setLoading(false)
          return
        }

        setGovProfile(json.gov_profile || null)
        setRuns(Array.isArray(json.runs) ? json.runs : [])
      } catch (err) {
        console.error("[gov-profile-share-page] failed to load share", err)
        if (!cancelled) {
          setError("Failed to load shared opportunities.")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadShare()
    return () => {
      cancelled = true
    }
  }, [govProfileId])

  const sortedRuns = useMemo(() => sortOpportunityRuns(runs, sortBy), [runs, sortBy])
  const visibleRuns = useMemo(() => sortedRuns.slice(0, PUBLIC_VISIBLE_RUN_LIMIT), [sortedRuns])
  const lockedRuns = useMemo(() => sortedRuns.slice(PUBLIC_VISIBLE_RUN_LIMIT), [sortedRuns])
  const openDeadlines = useMemo(() => runs.filter((run) => isOpenOpportunity(run)).length, [runs])
  const highFitCount = useMemo(
    () => runs.filter((run) => boostFitScore(run.fit_score) >= 0.9).length,
    [runs],
  )
  const onboardingPath = useMemo(() => buildOnboardingPath(govProfile), [govProfile])

  if (loading) {
    return <GovLoadingState message="Loading shared opportunities…" />
  }

  if (notFound) {
    return (
      <GovPageShell maxWidth="lg" showOpportunities={false}>
        <div className="py-10 text-center sm:py-20">
          <h1 className="text-xl font-bold">Share page unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            This share page is no longer active. Book a demo to see how Chromie can find
            government contract opportunities for your company.
          </p>
          <Button asChild className={`mt-6 ${BTN_PRIMARY}`}>
            <a href={CAL_URL} target="_blank" rel="noopener noreferrer">
              Book a demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </GovPageShell>
    )
  }

  return (
    <GovPageShell
      maxWidth="5xl"
      showOpportunities={false}
      authOpen={showAuth}
      onAuthClose={() => setShowAuth(false)}
      authRedirect={onboardingPath}
    >
      <GovPageHeader
        label="Government contracting"
        title={`Contract opportunities for ${govProfile?.name || "this company"}`}
        description="A no-login preview of contract opportunities discovered by Chromie, ranked by profile fit."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button className={BTN_PRIMARY} onClick={() => setShowAuth(true)}>
              Create full dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <label htmlFor="gov-public-sort" className={`${LABEL_CLASS} sr-only`}>
              Sort by
            </label>
            <select
              id="gov-public-sort"
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

      {govProfile?.corporate_overview ? (
        <div className="mt-6 border border-white/10 bg-black/30 px-4 py-4 text-sm leading-6 text-zinc-300">
          <p className={LABEL_CLASS}>Company context</p>
          <p className="mt-2 whitespace-pre-wrap text-zinc-400">{govProfile.corporate_overview}</p>
        </div>
      ) : null}

      <OpportunityStats total={runs.length} openDeadlines={openDeadlines} highFitCount={highFitCount} />

      {error ? (
        <p className="mt-8 text-sm text-red-400">{error}</p>
      ) : sortedRuns.length === 0 ? (
        <div className="mt-8 border border-white/10 bg-black/30 px-4 py-8 text-center">
          <p className="font-semibold text-white">No opportunities yet</p>
          <p className="mt-2 text-sm text-zinc-400">
            New matches will appear here after the next government contract search finishes.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-2">
          {visibleRuns.map((run) => (
            <OpportunityRow
              key={run.id}
              run={run}
              expanded={expandedId === run.id}
              onToggle={() => setExpandedId((id) => (id === run.id ? null : run.id))}
            />
          ))}
          {lockedRuns.length > 0 ? (
            <div className="relative pt-2">
              <div className="pointer-events-none space-y-2 select-none blur-sm">
                {lockedRuns.map((run) => (
                  <OpportunityRow
                    key={run.id}
                    run={run}
                    expanded={false}
                    onToggle={() => {}}
                  />
                ))}
              </div>
              <div className="absolute inset-0 flex items-start justify-center bg-gradient-to-b from-black/10 via-black/60 to-black/90 px-4 pt-10">
                <div className="max-w-md border border-cyan-400/20 bg-black/90 px-6 py-6 text-center">
                  <p className="text-lg font-semibold text-white">
                    {lockedRuns.length} more opportunities available
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Book a demo or create a full dashboard to see every matched opportunity,
                    fit rationale, and compliance detail.
                  </p>
                  <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                    <Button asChild className={BTN_PRIMARY}>
                      <a href={CAL_URL} target="_blank" rel="noopener noreferrer">
                        Book a demo
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                    <Button className={BTN_OUTLINE} onClick={() => setShowAuth(true)}>
                      Sign up to see more
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </GovPageShell>
  )
}
