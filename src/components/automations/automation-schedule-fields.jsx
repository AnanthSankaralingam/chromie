"use client"

import { parseCronExpression, WEEKDAYS } from "@/lib/workflow/workflow-schedule-cron"
import { Plus, X } from "lucide-react"
import {
  ACCENT,
  INPUT_CLASS,
  LABEL_CLASS,
  PANEL_INSET,
} from "@/components/ui/app-dashboard-theme"

function FilterField({ label, children }) {
  return (
    <div className="min-w-0">
      <label className={LABEL_CLASS}>{label}</label>
      {children}
    </div>
  )
}

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
]

/**
 * @param {{
 *   scheduleEnabled: boolean,
 *   scheduleFrequency: string,
 *   scheduleTimes: string[],
 *   scheduleWeekday: string,
 *   scheduleTimezone: string,
 *   onChange: (patch: object) => void,
 * }} props
 */
export default function AutomationScheduleFields({
  scheduleEnabled,
  scheduleFrequency,
  scheduleTimes,
  scheduleWeekday,
  scheduleTimezone,
  onChange,
}) {
  function updateTime(index, value) {
    const next = [...scheduleTimes]
    next[index] = value
    onChange({ schedule_times: next })
  }

  function addTime() {
    onChange({ schedule_times: [...scheduleTimes, "12:00"] })
  }

  function removeTime(index) {
    if (scheduleTimes.length <= 1) return
    onChange({ schedule_times: scheduleTimes.filter((_, i) => i !== index) })
  }

  return (
    <div className={`space-y-4 ${PANEL_INSET}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Schedule</p>
        </div>
        <label className="flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
          <input
            type="checkbox"
            checked={scheduleEnabled}
            onChange={(e) =>
              onChange({
                schedule_enabled: e.target.checked,
                schedule_kind: e.target.checked ? "cron" : "on_demand",
              })
            }
            className="rounded-none border-white/20 bg-black text-cyan-400 focus:ring-cyan-400/40"
          />
          Enabled
        </label>
      </div>

      {scheduleEnabled && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FilterField label="Frequency">
              <select
                value={scheduleFrequency}
                onChange={(e) =>
                  onChange({
                    schedule_frequency: e.target.value,
                  })
                }
                className={`${INPUT_CLASS} w-full rounded-md px-3 py-2 text-sm`}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </FilterField>
            <FilterField label="Timezone">
              <select
                value={scheduleTimezone}
                onChange={(e) => onChange({ schedule_timezone: e.target.value })}
                className={`${INPUT_CLASS} w-full rounded-md px-3 py-2 text-sm`}
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </FilterField>
            {scheduleFrequency === "weekly" && (
              <FilterField label="Day of week">
                <select
                  value={scheduleWeekday}
                  onChange={(e) =>
                    onChange({
                      schedule_weekday: e.target.value,
                    })
                  }
                  className={`${INPUT_CLASS} w-full rounded-md px-3 py-2 text-sm`}
                >
                  {WEEKDAYS.filter((d) => d !== "SUN").concat(["SUN"]).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </FilterField>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={LABEL_CLASS}>Run times</label>
              <button
                type="button"
                onClick={addTime}
                className={`inline-flex items-center gap-1 text-xs ${ACCENT} hover:text-cyan-300`}
              >
                <Plus className="h-3 w-3" />
                Add time
              </button>
            </div>
            <p className="text-xs text-zinc-600">
              Add multiple times to run more than once per day.
            </p>
            <div className="space-y-2">
              {scheduleTimes.map((time, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => updateTime(index, e.target.value)}
                    className={`${INPUT_CLASS} flex-1 rounded-md px-3 py-2 text-sm`}
                  />
                  {scheduleTimes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTime(index)}
                      className="shrink-0 rounded-md p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                      aria-label="Remove time"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/** @param {object | null | undefined} automation */
export function scheduleStateFromAutomation(automation) {
  if (!automation) {
    return {
      scheduleEnabled: false,
      scheduleFrequency: "daily",
      scheduleTimes: ["09:00"],
      scheduleWeekday: "MON",
      scheduleTimezone: "America/New_York",
    }
  }

  let parsed = null
  const cron = automation.cron_expression
  if (cron?.includes("|")) {
    const allTimes = []
    let frequency = "daily"
    let weekday = "MON"
    let weekdays = []
    for (const part of cron.split("|")) {
      const p = parseCronExpression(part.trim())
      if (p) {
        allTimes.push(...p.times)
        frequency = p.frequency
        weekday = p.weekday
        weekdays = p.weekdays
      }
    }
    if (allTimes.length) {
      parsed = {
        frequency,
        times: [...new Set(allTimes)].sort(),
        weekday,
        weekdays,
      }
    }
  } else {
    parsed = parseCronExpression(cron)
  }

  return {
    scheduleEnabled: automation.schedule_kind === "cron",
    scheduleFrequency: parsed?.frequency || "daily",
    scheduleTimes: parsed?.times?.length ? parsed.times : ["09:00"],
    scheduleWeekday: parsed?.weekday || "MON",
    scheduleTimezone: automation.schedule_timezone || "America/New_York",
  }
}
