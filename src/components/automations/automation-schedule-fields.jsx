"use client"

import { useEffect, useState } from "react"
import { parseCronExpression, WEEKDAYS } from "@/lib/workflow-schedule-cron"

const INPUT_CLASS =
  "mt-1 bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:ring-violet-500/50"

function FilterField({ label, children }) {
  return (
    <div className="min-w-0">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
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
 *   scheduleTime: string,
 *   scheduleWeekday: string,
 *   scheduleTimezone: string,
 *   cronExpression?: string | null,
 *   onChange: (patch: object) => void,
 * }} props
 */
export default function AutomationScheduleFields({
  scheduleEnabled,
  scheduleFrequency,
  scheduleTime,
  scheduleWeekday,
  scheduleTimezone,
  cronExpression,
  onChange,
}) {
  const [showCustomCron, setShowCustomCron] = useState(false)
  const parsed = parseCronExpression(cronExpression)

  useEffect(() => {
    if (cronExpression && !parsed) {
      setShowCustomCron(true)
    }
  }, [cronExpression, parsed])

  return (
    <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-200">Schedule</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Runs automatically via EventBridge Scheduler (same Lambda as Run now).
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-300 shrink-0">
          <input
            type="checkbox"
            checked={scheduleEnabled}
            onChange={(e) =>
              onChange({
                schedule_enabled: e.target.checked,
                schedule_kind: e.target.checked ? "cron" : "on_demand",
              })
            }
            className="rounded border-zinc-600 bg-zinc-900 text-violet-500 focus:ring-violet-500"
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
            <FilterField label="Time">
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => onChange({ schedule_time: e.target.value })}
                className={`${INPUT_CLASS} w-full rounded-md px-3 py-2 text-sm`}
              />
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
          </div>

          <div>
            <button
              type="button"
              className="text-xs text-violet-400 hover:text-violet-300"
              onClick={() => setShowCustomCron((v) => !v)}
            >
              {showCustomCron ? "Hide" : "Show"} advanced cron expression
            </button>
            {showCustomCron && (
              <FilterField label="Cron expression">
                <input
                  type="text"
                  value={cronExpression || ""}
                  onChange={(e) =>
                    onChange({
                      cron_expression: e.target.value,
                      schedule_kind: "cron",
                    })
                  }
                  placeholder="cron(0 9 * * ? *)"
                  className={`${INPUT_CLASS} w-full rounded-md px-3 py-2 text-sm font-mono`}
                />
              </FilterField>
            )}
            {!showCustomCron && cronExpression && (
              <p className="text-xs text-zinc-500 mt-2 font-mono">{cronExpression}</p>
            )}
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
      scheduleTime: "09:00",
      scheduleWeekday: "MON",
      scheduleTimezone: "America/New_York",
      cronExpression: null,
    }
  }
  const parsed = parseCronExpression(automation.cron_expression)
  return {
    scheduleEnabled: automation.schedule_kind === "cron",
    scheduleFrequency: parsed?.frequency || "daily",
    scheduleTime: parsed?.time || "09:00",
    scheduleWeekday: parsed?.weekday || "MON",
    scheduleTimezone: automation.schedule_timezone || "America/New_York",
    cronExpression: automation.cron_expression,
  }
}
