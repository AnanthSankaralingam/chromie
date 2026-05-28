/**
 * Build and parse EventBridge Scheduler cron expressions for the dashboard.
 * Format: cron(minutes hours day-of-month month day-of-week year)
 */

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

/** @typedef {'daily' | 'weekly'} ScheduleFrequency */

/**
 * @param {{ frequency: ScheduleFrequency, time: string, weekday?: string, weekdays?: string[] }} opts
 * @returns {string}
 */
export function buildCronExpression({ frequency, time, weekday, weekdays }) {
  const normalized = String(time || "").trim().slice(0, 5)
  const match = /^(\d{1,2}):(\d{2})$/.exec(normalized)
  if (!match) {
    throw new Error("Time must be HH:MM (24-hour)")
  }
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) {
    throw new Error("Time must be a valid clock time")
  }

  if (frequency === "daily") {
    return `cron(${minute} ${hour} * * ? *)`
  }

  const days =
    weekdays?.length > 0
      ? weekdays
      : weekday
        ? [weekday]
        : ["MON"]
  for (const d of days) {
    if (!WEEKDAYS.includes(d)) {
      throw new Error(`Invalid weekday: ${d}`)
    }
  }
  return `cron(${minute} ${hour} ? * ${days.join(",")} *)`
}

/**
 * Best-effort parse of expressions produced by buildCronExpression.
 * @param {string | null | undefined} cron
 * @returns {{ frequency: ScheduleFrequency, time: string, weekday: string, weekdays: string[] } | null}
 */
export function parseCronExpression(cron) {
  if (!cron || typeof cron !== "string") return null
  const trimmed = cron.trim()

  const daily = /^cron\((\d{1,2}) (\d{1,2}) \* \* \? \*\)$/.exec(trimmed)
  if (daily) {
    const minute = daily[1].padStart(2, "0")
    const hour = daily[2].padStart(2, "0")
    return {
      frequency: "daily",
      time: `${hour}:${minute}`,
      weekday: "MON",
      weekdays: [],
    }
  }

  const weekly = /^cron\((\d{1,2}) (\d{1,2}) \? \* ([A-Z,]+) \*\)$/.exec(trimmed)
  if (weekly) {
    const minute = weekly[1].padStart(2, "0")
    const hour = weekly[2].padStart(2, "0")
    const weekdays = weekly[3].split(",").filter(Boolean)
    return {
      frequency: "weekly",
      time: `${hour}:${minute}`,
      weekday: weekdays[0] || "MON",
      weekdays,
    }
  }

  return null
}

export { WEEKDAYS }
