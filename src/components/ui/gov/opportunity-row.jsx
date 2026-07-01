"use client"

import { useEffect, useState } from "react"
import {
  ACCENT,
  LABEL_CLASS,
  LIST_ITEM,
} from "@/components/ui/app-dashboard-theme"
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react"
import {
  daysUntil,
  formatFitScore,
  formatOpportunityDate,
  fitScoreTone,
  getComplianceChecklist,
} from "@/components/ui/gov/opportunity-utils"

function normalizeTypicalWinners(value) {
  if (!value || typeof value !== "object") return null
  return {
    ...value,
    winners: Array.isArray(value.winners) ? value.winners : [],
  }
}

function formatMoney(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return "$0"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    notation: n >= 1_000_000 ? "compact" : "standard",
  }).format(n)
}

function confidenceTone(confidence) {
  if (confidence === "strong") return "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
  if (confidence === "medium") return "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
  return "border-white/15 bg-white/[0.03] text-zinc-400"
}

function confidenceLabel(confidence) {
  if (confidence === "strong") return "Strong match"
  if (confidence === "medium") return "Likely adjacent"
  if (confidence === "broad") return "Broad market"
  return "Unverified"
}

function SourceBadge({ source }) {
  const label = source === "sam_gov" ? "SAM.gov" : source.replace(/_/g, " ")
  return (
    <span className="inline-flex shrink-0 border border-white/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
      {label}
    </span>
  )
}

function TypicalWinnersPanel({ run, expanded, allowFetch }) {
  const [typicalWinners, setTypicalWinners] = useState(() =>
    normalizeTypicalWinners(run.analysis_payload?.typical_winners),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setTypicalWinners(normalizeTypicalWinners(run.analysis_payload?.typical_winners))
    setError("")
  }, [run.id, run.analysis_payload?.typical_winners])

  useEffect(() => {
    if (!expanded || !allowFetch || typicalWinners || loading || error) return

    let cancelled = false
    async function loadTypicalWinners() {
      setLoading(true)
      setError("")
      try {
        const res = await fetch(`/api/gov-runs/${encodeURIComponent(run.id)}/typical-winners`)
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setError(json.error || "Could not load historical winners.")
          return
        }
        setTypicalWinners(normalizeTypicalWinners(json.typical_winners))
      } catch (err) {
        console.error("[opportunity-row] typical winners failed", err)
        if (!cancelled) setError("Could not load historical winners.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadTypicalWinners()
    return () => {
      cancelled = true
    }
  }, [allowFetch, error, expanded, loading, run.id, typicalWinners])

  if (!allowFetch && !typicalWinners) return null

  const winners = typicalWinners?.winners || []

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className={LABEL_CLASS}>Likely competitors</p>
        {typicalWinners?.lookback_years ? (
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            Last {typicalWinners.lookback_years} years
          </span>
        ) : null}
        {typicalWinners?.confidence ? (
          <span
            className={`inline-flex border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${confidenceTone(typicalWinners.confidence)}`}
          >
            {confidenceLabel(typicalWinners.confidence)}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs leading-5 text-zinc-500">
        Historical federal award winners from USASpending/FPDS records matched against this
        opportunity&apos;s PSC, NAICS, agency, and keyword signals.
      </p>
      {typicalWinners?.match_basis?.length ? (
        <p className="mt-1 text-xs text-zinc-600">
          Match basis: {typicalWinners.match_basis.join(" · ")}
        </p>
      ) : null}

      {loading ? <p className="mt-2 text-xs text-zinc-500">Loading winner history…</p> : null}
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}

      {!loading && !error && typicalWinners && winners.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-500">
          {typicalWinners.reason || "No matching award history found."}
        </p>
      ) : null}

      {winners.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {winners.map((winner) => (
            <div key={winner.recipient_name} className="border border-white/10 bg-white/[0.03] p-3">
              <p className="truncate text-sm font-semibold text-white">{winner.recipient_name}</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-zinc-500">
                <span>{formatMoney(winner.total_award_amount)} won</span>
                <span>{winner.award_count} awards</span>
                <span>{formatMoney(winner.average_award_amount)} avg</span>
              </div>
              {winner.agencies?.length ? (
                <p className="mt-2 text-xs text-zinc-500">
                  Common agencies: {winner.agencies.map((agency) => agency.name).join(", ")}
                </p>
              ) : null}
              {winner.sample_awards?.[0] ? (
                <p className="mt-2 line-clamp-2 text-xs text-zinc-600">
                  Sample award: {winner.sample_awards[0].award_id || "unknown"}{" "}
                  {winner.sample_awards[0].psc_code ? `· PSC ${winner.sample_awards[0].psc_code}` : ""}
                  {winner.sample_awards[0].naics_code
                    ? ` · NAICS ${winner.sample_awards[0].naics_code}`
                    : ""}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default function OpportunityRow({ run, expanded, onToggle, allowWinnerFetch = true }) {
  const fitLabel = formatFitScore(run.fit_score)
  const complianceChecklist = getComplianceChecklist(run.analysis_payload)
  const responseFormatted = formatOpportunityDate(run.response_date)
  const publishedFormatted = formatOpportunityDate(run.published_date)
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
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
              No score
            </span>
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

          {complianceChecklist.length > 0 ? (
            <div className="mb-4">
              <p className={LABEL_CLASS}>Compliance matrix</p>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-zinc-400">
                {complianceChecklist.map((item, index) => (
                  <li key={index} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <TypicalWinnersPanel run={run} expanded={expanded} allowFetch={allowWinnerFetch} />

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
