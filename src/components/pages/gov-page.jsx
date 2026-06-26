"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/components/SessionProviderClient"
import AppBarDashboard from "@/components/ui/app-bars/app-bar-dashboard"
import {
  ACCENT,
  APP_PAGE,
  BTN_OUTLINE,
  CARD_CLASS,
  LABEL_CLASS,
  LIST_ITEM,
  SECTION_LABEL,
} from "@/components/ui/app-dashboard-theme"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FilmGrain } from "@/components/ui/landing/landing-motion"
import AuthModal from "@/components/ui/modals/modal-auth"
import { Calendar, ChevronDown, ChevronUp, ExternalLink } from "lucide-react"

const SORT_OPTIONS = [
  { id: "fit", label: "Best fit" },
  { id: "due", label: "Due soon" },
  { id: "newest", label: "Newest" },
]

function formatDate(value) {
  if (!value) return null
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatFitScore(score) {
  if (score == null || Number.isNaN(Number(score))) return null
  return `${Math.round(Number(score) * 100)}%`
}

function fitScoreTone(score) {
  if (score == null) return "text-zinc-500 border-zinc-700/60 bg-zinc-900/40"
  const n = Number(score)
  if (n >= 0.75) return "text-cyan-300 border-cyan-500/35 bg-cyan-500/10"
  if (n >= 0.5) return "text-amber-200 border-amber-500/30 bg-amber-500/10"
  return "text-zinc-400 border-white/15 bg-white/[0.03]"
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const target = new Date(`${dateStr}T12:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
}

function isOpenOpportunity(run) {
  if (!run.response_date) return true
  const dueIn = daysUntil(run.response_date)
  return dueIn != null && dueIn >= 0
}

function sortRuns(runs, sortBy) {
  const copy = [...runs]
  if (sortBy === "due") {
    return copy.sort((a, b) => {
      const aDue = a.response_date ? new Date(`${a.response_date}T12:00:00`).getTime() : Infinity
      const bDue = b.response_date ? new Date(`${b.response_date}T12:00:00`).getTime() : Infinity
      if (aDue !== bDue) return aDue - bDue
      return (Number(b.fit_score) || -1) - (Number(a.fit_score) || -1)
    })
  }
  if (sortBy === "newest") {
    return copy.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
  }
  return copy.sort((a, b) => {
    const aFit = a.fit_score == null ? -1 : Number(a.fit_score)
    const bFit = b.fit_score == null ? -1 : Number(b.fit_score)
    if (bFit !== aFit) return bFit - aFit
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

function SourceBadge({ source }) {
  const label = source === "sam_gov" ? "SAM.gov" : source.replace(/_/g, " ")
  return (
    <span className="inline-flex shrink-0 border border-white/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
      {label}
    </span>
  )
}

function OpportunityRow({ run, expanded, onToggle }) {
  const fitLabel = formatFitScore(run.fit_score)
  const responseFormatted = formatDate(run.response_date)
  const publishedFormatted = formatDate(run.published_date)
  const dueIn = daysUntil(run.response_date)

  return (
    <article className={`${LIST_ITEM} overflow-hidden`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-4 px-4 py-4 text-left"
      >
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
            <h2 className="text-[15px] font-semibold leading-snug text-white">{run.title}</h2>
            {run.profile_fit_verified ? (
              <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400/90">
                Verified fit
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
            {run.agency ? <span>{run.agency}</span> : null}
            {run.agency ? <span className="text-zinc-700">·</span> : null}
            <SourceBadge source={run.source} />
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
            {publishedFormatted ? <span>Published {publishedFormatted}</span> : null}
            {responseFormatted ? (
              <span className={dueIn != null && dueIn <= 14 ? "text-amber-300/90" : undefined}>
                Response {responseFormatted}
                {dueIn != null && dueIn >= 0 ? ` (${dueIn}d)` : dueIn != null ? " (past due)" : ""}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {fitLabel ? (
            <span
              className={`inline-flex min-w-[3rem] justify-center border px-2 py-1 font-mono text-xs font-medium ${fitScoreTone(run.fit_score)}`}
            >
              {fitLabel}
            </span>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">No score</span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          )}
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-white/10 bg-black/40 px-4 py-4 text-sm leading-relaxed text-zinc-300">
          {run.contract_summary ? (
            <div className="mb-4">
              <p className={LABEL_CLASS}>Summary</p>
              <p className="mt-2 whitespace-pre-wrap text-zinc-300">{run.contract_summary}</p>
            </div>
          ) : null}

          {run.fit_rationale ? (
            <div className="mb-4">
              <p className={LABEL_CLASS}>Fit rationale</p>
              <p className="mt-2 whitespace-pre-wrap text-zinc-400">{run.fit_rationale}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {run.source_url ? (
              <a
                href={run.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 ${ACCENT} hover:underline`}
                onClick={(e) => e.stopPropagation()}
              >
                View on {run.source === "sam_gov" ? "SAM.gov" : "source"}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
            {run.source_ref ? (
              <span className="font-mono text-[11px] text-zinc-600">Ref {run.source_ref}</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  )
}

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

  const sortedRuns = useMemo(() => sortRuns(runs, sortBy), [runs, sortBy])

  const withDeadline = useMemo(
    () => runs.filter((run) => isOpenOpportunity(run)).length,
    [runs],
  )

  if (loading || sessionLoading) {
    return (
      <div className={`${APP_PAGE} flex items-center justify-center`}>
        <p className="text-sm text-zinc-500">Loading opportunities…</p>
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className={APP_PAGE}>
        <FilmGrain />
        <AppBarDashboard />
        <main className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="text-xl font-bold">Government opportunities unavailable</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Your account is not linked to a government contractor profile yet. Set up your company
            profile to start finding opportunities.
          </p>
          <Button className={`mt-6 ${BTN_OUTLINE}`} onClick={() => router.push("/gov/onboarding")}>
            Set up company profile
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className={APP_PAGE}>
      <FilmGrain />
      <AppBarDashboard />
      <main className="relative z-[1] mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={SECTION_LABEL}>Government contracting</p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              {profileName ? `${profileName} opportunities` : "Opportunities"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Contract opportunities discovered by your SAM.gov automations, ranked by profile fit.
            </p>
          </div>

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
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Card className={CARD_CLASS}>
            <CardContent className="px-4 py-3">
              <p className={LABEL_CLASS}>Total</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{runs.length}</p>
            </CardContent>
          </Card>
          <Card className={CARD_CLASS}>
            <CardContent className="px-4 py-3">
              <p className={LABEL_CLASS}>Open deadlines</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-bold tabular-nums">
                <Calendar className="h-5 w-5 text-zinc-500" />
                {withDeadline}
              </p>
            </CardContent>
          </Card>
          <Card className={CARD_CLASS}>
            <CardContent className="px-4 py-3">
              <p className={LABEL_CLASS}>High fit (90%+)</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${ACCENT}`}>
                {runs.filter((r) => Number(r.fit_score) >= 0.9).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {error ? (
          <p className="mt-8 text-sm text-red-400">{error}</p>
        ) : sortedRuns.length === 0 ? (
          <div className="mt-10 border border-white/10 bg-black/30 px-6 py-14 text-center">
            <p className="text-base font-medium text-zinc-300">No opportunities yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
              Run a SAM.gov automation from the dashboard. Matching contracts will appear here after
              each successful run.
            </p>
            <Button className={`mt-6 ${BTN_OUTLINE}`} onClick={() => router.push("/dashboard")}>
              Go to dashboard
            </Button>
          </div>
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
      </main>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} redirectUrl="/gov" />
    </div>
  )
}
