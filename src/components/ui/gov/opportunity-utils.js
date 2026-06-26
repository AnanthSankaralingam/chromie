export function formatOpportunityDate(value) {
  if (!value) return null
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function formatFitScore(score) {
  if (score == null || Number.isNaN(Number(score))) return null
  return `${Math.round(Number(score) * 100)}%`
}

export function fitScoreTone(score) {
  if (score == null) return "text-zinc-500 border-zinc-700/60 bg-zinc-900/40"
  const n = Number(score)
  if (n >= 0.75) return "text-cyan-300 border-cyan-500/35 bg-cyan-500/10"
  if (n >= 0.5) return "text-amber-200 border-amber-500/30 bg-amber-500/10"
  return "text-zinc-400 border-white/15 bg-white/[0.03]"
}

export function daysUntil(dateStr) {
  if (!dateStr) return null
  const target = new Date(`${dateStr}T12:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
}

export function isOpenOpportunity(run) {
  if (!run.response_date) return true
  const dueIn = daysUntil(run.response_date)
  return dueIn != null && dueIn >= 0
}

export function sortOpportunityRuns(runs, sortBy) {
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
