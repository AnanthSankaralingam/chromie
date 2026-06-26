"use client"

import AutomationScheduleFields from "@/components/automations/automation-schedule-fields"
import {
  BTN_OUTLINE,
  BTN_PRIMARY,
  CARD_CLASS,
  SECTION_LABEL,
} from "@/components/ui/app-dashboard-theme"
import GovAlertBanner from "@/components/ui/gov/gov-alert-banner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarClock, Play, Save, Square } from "lucide-react"

export default function SamMonitorScheduleCard({
  error,
  scheduleSummary,
  schedule,
  onScheduleChange,
  onSave,
  saving,
  automationId,
  initializing = false,
  onRunNow,
  running,
  activeRun,
  onStopRun,
  stopping,
}) {
  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="border-b border-white/10 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={SECTION_LABEL}>Schedule</p>
            <CardTitle className="mt-1 text-base font-bold text-white">
              Contract opportunity monitor
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Your monitor is created automatically. Adjust the cadence or run it on demand.
            </CardDescription>
          </div>
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center border border-white/10 bg-white/[0.03] sm:flex">
            <CalendarClock className="h-5 w-5 text-cyan-300" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {error ? <GovAlertBanner>{error}</GovAlertBanner> : null}

        <div className="border border-white/10 bg-black/30 px-3 py-2">
          <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">Current cadence</p>
          <p className="mt-1 text-sm text-zinc-200">{scheduleSummary}</p>
        </div>

        <AutomationScheduleFields
          scheduleEnabled={schedule.scheduleEnabled}
          scheduleFrequency={schedule.scheduleFrequency}
          scheduleTimes={schedule.scheduleTimes}
          scheduleWeekday={schedule.scheduleWeekday}
          scheduleTimezone={schedule.scheduleTimezone}
          onChange={onScheduleChange}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            className={BTN_PRIMARY}
            disabled={saving || initializing || !automationId}
            onClick={onSave}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save schedule"}
          </Button>
          <Button
            className={BTN_OUTLINE}
            disabled={running || initializing || !automationId}
            onClick={onRunNow}
          >
            <Play className="mr-2 h-4 w-4" />
            {running ? "Starting..." : "Run now"}
          </Button>
          {activeRun ? (
            <Button className={BTN_OUTLINE} disabled={stopping} onClick={onStopRun}>
              <Square className="mr-2 h-4 w-4" />
              {stopping ? "Stopping..." : "Stop run"}
            </Button>
          ) : null}
        </div>

        {initializing || !automationId ? (
          <p className="text-xs leading-relaxed text-zinc-500">
            Chromie is initializing the managed contract search monitor for this profile.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
