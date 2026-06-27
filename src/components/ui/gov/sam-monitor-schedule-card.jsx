"use client"

import {
  BTN_OUTLINE,
  CARD_CLASS,
  SECTION_LABEL,
} from "@/components/ui/app-dashboard-theme"
import GovAlertBanner from "@/components/ui/gov/gov-alert-banner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarClock, Square } from "lucide-react"

function formatTimestamp(value, timezone) {
  if (!value) return "Not yet"
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone || undefined,
    }).format(new Date(value))
  } catch {
    return new Date(value).toLocaleString()
  }
}

function formatNextRunLabel(nextRunAt, timezone) {
  if (!nextRunAt) return "Schedule pending"
  const target = new Date(nextRunAt)
  const now = new Date()
  const sameDay =
    target.toLocaleDateString(undefined, { timeZone: timezone || undefined }) ===
    now.toLocaleDateString(undefined, { timeZone: timezone || undefined })
  const timeLabel = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone || undefined,
  }).format(target)
  return sameDay ? `Today at ${timeLabel}` : `Tomorrow at ${timeLabel}`
}

export default function SamMonitorScheduleCard({
  error,
  scheduleSummary,
  nextRunAt,
  lastRunAt,
  scheduleTimezone,
  activeRun,
  onStopRun,
  stopping,
  initializing = false,
}) {
  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="border-b border-white/10 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={SECTION_LABEL}>Automatic search</p>
            <CardTitle className="mt-1 text-base font-bold text-white">
              Contract opportunity monitor
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Chromie searches SAM.gov and the SBIR Tech Marketplace daily for your company profile.
            </CardDescription>
          </div>
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center border border-white/10 bg-white/[0.03] sm:flex">
            <CalendarClock className="h-5 w-5 text-cyan-300" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {error ? <GovAlertBanner>{error}</GovAlertBanner> : null}

        {activeRun ? (
          <div className="border border-cyan-400/20 bg-cyan-400/10 px-3 py-3">
            <p className="text-sm font-medium text-cyan-100">Search in progress</p>
            <p className="mt-1 text-sm text-cyan-100/80">
              Chromie is searching government sources now. Results usually appear within 1–5 minutes.
            </p>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border border-white/10 bg-black/30 px-3 py-2">
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">Next search</p>
            <p className="mt-1 text-sm text-zinc-200">
              {initializing ? "Loading..." : formatNextRunLabel(nextRunAt, scheduleTimezone)}
            </p>
          </div>
          <div className="border border-white/10 bg-black/30 px-3 py-2">
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">Last search</p>
            <p className="mt-1 text-sm text-zinc-200">
              {initializing
                ? "Loading..."
                : formatTimestamp(lastRunAt, scheduleTimezone)}
            </p>
          </div>
        </div>

        <div className="border border-white/10 bg-black/30 px-3 py-2">
          <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">Daily schedule</p>
          <p className="mt-1 text-sm text-zinc-200">
            {initializing ? "Loading..." : scheduleSummary}
          </p>
        </div>

        {activeRun ? (
          <div className="flex flex-wrap gap-2">
            <Button className={BTN_OUTLINE} disabled={stopping} onClick={onStopRun}>
              <Square className="mr-2 h-4 w-4" />
              {stopping ? "Stopping..." : "Stop run"}
            </Button>
          </div>
        ) : null}

        {initializing ? (
          <p className="text-xs leading-relaxed text-zinc-500">
            Loading your organization&apos;s contract search schedule.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export { formatNextRunLabel, formatTimestamp }
