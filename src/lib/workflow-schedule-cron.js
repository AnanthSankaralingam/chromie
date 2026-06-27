/**
 * Build and parse EventBridge Scheduler cron expressions for the dashboard.
 * Format: cron(minutes hours day-of-month month day-of-week year)
 */

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

/** @typedef {'daily' | 'weekly'} ScheduleFrequency */

/**
 * @param {string} time
 * @returns {{ hour: number, minute: number }}
 */
export function parseTimeString(time) {
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
  return { hour, minute }
}

/**
 * @param {string[]} times
 * @returns {string[]}
 */
export function normalizeTimes(times) {
  const seen = new Set()
  const out = []
  for (const raw of times || []) {
    const { hour, minute } = parseTimeString(raw)
    const key = `${hour}:${minute}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`)
  }
  out.sort((a, b) => {
    const pa = parseTimeString(a)
    const pb = parseTimeString(b)
    return pa.hour - pb.hour || pa.minute - pb.minute
  })
  if (out.length === 0) {
    throw new Error("Add at least one run time")
  }
  return out
}

/**
 * @param {{ hour: number, minute: number }[]} slots
 * @returns {string[]}
 */
function dailyCronExpressions(slots) {
  const byMinute = new Map()
  for (const slot of slots) {
    const list = byMinute.get(slot.minute) || []
    list.push(slot)
    byMinute.set(slot.minute, list)
  }
  if (byMinute.size === 1) {
    const minute = [...byMinute.keys()][0]
    const hours = [...byMinute.values()][0].map((s) => s.hour).sort((a, b) => a - b)
    return [`cron(${minute} ${hours.join(",")} * * ? *)`]
  }

  const byHour = new Map()
  for (const slot of slots) {
    const list = byHour.get(slot.hour) || []
    list.push(slot)
    byHour.set(slot.hour, list)
  }
  if (byHour.size === 1) {
    const hour = [...byHour.keys()][0]
    const minutes = [...byHour.values()][0].map((s) => s.minute).sort((a, b) => a - b)
    return [`cron(${minutes.join(",")} ${hour} * * ? *)`]
  }

  return slots.map((s) => `cron(${s.minute} ${s.hour} * * ? *)`)
}

/**
 * @param {{ frequency: ScheduleFrequency, times: string[], weekday?: string, weekdays?: string[] }} opts
 * @returns {string[]} One or more cron expressions (multiple when times cannot merge safely).
 */
export function buildCronExpressions({ frequency, times, weekday, weekdays }) {
  const normalized = normalizeTimes(times)
  const slots = normalized.map(parseTimeString)

  if (frequency === "daily") {
    return dailyCronExpressions(slots)
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
  const dayField = days.join(",")

  return dailyCronExpressions(slots).map((expr) => {
    const inner = expr.slice(5, -1)
    const parts = inner.split(" ")
    parts[3] = "?"
    parts[4] = dayField
    return `cron(${parts.join(" ")})`
  })
}

/**
 * @param {{ frequency: ScheduleFrequency, time: string, times?: string[], weekday?: string, weekdays?: string[] }} opts
 * @returns {string}
 */
export function buildCronExpression(opts) {
  const times = opts.times?.length ? opts.times : opts.time ? [opts.time] : []
  const expressions = buildCronExpressions({ ...opts, times })
  return expressions[0]
}

/**
 * @param {string | null | undefined} cron
 * @returns {{ frequency: ScheduleFrequency, times: string[], weekday: string, weekdays: string[] } | null}
 */
export function parseCronExpression(cron) {
  if (!cron || typeof cron !== "string") return null
  const trimmed = cron.trim()

  const dailyMultiHour = /^cron\((\d{1,2}) ([\d,]+) \* \* \? \*\)$/.exec(trimmed)
  if (dailyMultiHour) {
    const minute = dailyMultiHour[1]
    const hours = dailyMultiHour[2].split(",").map((h) => h.trim())
    return {
      frequency: "daily",
      times: hours.map((h) => `${h.padStart(2, "0")}:${minute.padStart(2, "0")}`),
      weekday: "MON",
      weekdays: [],
    }
  }

  const dailyMultiMinute = /^cron\(([\d,]+) (\d{1,2}) \* \* \? \*\)$/.exec(trimmed)
  if (dailyMultiMinute) {
    const minutes = dailyMultiMinute[1].split(",").map((m) => m.trim())
    const hour = dailyMultiMinute[2]
    return {
      frequency: "daily",
      times: minutes.map((m) => `${hour.padStart(2, "0")}:${m.padStart(2, "0")}`),
      weekday: "MON",
      weekdays: [],
    }
  }

  const daily = /^cron\((\d{1,2}) (\d{1,2}) \* \* \? \*\)$/.exec(trimmed)
  if (daily) {
    const minute = daily[1].padStart(2, "0")
    const hour = daily[2].padStart(2, "0")
    return {
      frequency: "daily",
      times: [`${hour}:${minute}`],
      weekday: "MON",
      weekdays: [],
    }
  }

  const weeklyMultiHour = /^cron\((\d{1,2}) ([\d,]+) \? \* ([A-Z,]+) \*\)$/.exec(trimmed)
  if (weeklyMultiHour) {
    const minute = weeklyMultiHour[1]
    const hours = weeklyMultiHour[2].split(",").map((h) => h.trim())
    const weekdays = weeklyMultiHour[3].split(",").filter(Boolean)
    return {
      frequency: "weekly",
      times: hours.map((h) => `${h.padStart(2, "0")}:${minute.padStart(2, "0")}`),
      weekday: weekdays[0] || "MON",
      weekdays,
    }
  }

  const weekly = /^cron\((\d{1,2}) (\d{1,2}) \? \* ([A-Z,]+) \*\)$/.exec(trimmed)
  if (weekly) {
    const minute = weekly[1].padStart(2, "0")
    const hour = weekly[2].padStart(2, "0")
    const weekdays = weekly[3].split(",").filter(Boolean)
    return {
      frequency: "weekly",
      times: [`${hour}:${minute}`],
      weekday: weekdays[0] || "MON",
      weekdays,
    }
  }

  return null
}

function getDatePartsInTimezone(date, timezone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const get = (type) => parts.find((part) => part.type === type)?.value || "0"
  const hourRaw = get("hour")
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(hourRaw === "24" ? "0" : hourRaw),
    minute: Number(get("minute")),
  }
}

function localTimeInZoneToUtc(year, month, day, hour, minute, timeZone) {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0)
  for (let i = 0; i < 4; i += 1) {
    const parts = getDatePartsInTimezone(new Date(utcMs), timeZone)
    const wantMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0)
    const gotMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0)
    utcMs += wantMs - gotMs
  }
  return new Date(utcMs)
}

function addCalendarDays(year, month, day, days) {
  const shifted = new Date(Date.UTC(year, month - 1, day + days))
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  }
}

/**
 * @param {string | null | undefined} cronExpression
 * @param {string} scheduleTimezone
 * @param {Date} [fromDate]
 * @returns {string | null} ISO timestamp of the next scheduled run
 */
export function computeNextScheduledRun(cronExpression, scheduleTimezone, fromDate = new Date()) {
  if (!cronExpression?.trim()) return null

  const firstExpr = cronExpression.split("|").map((part) => part.trim()).find(Boolean)
  if (!firstExpr) return null

  const parsed = parseCronExpression(firstExpr)
  if (!parsed?.times?.length) return null

  const timezone = scheduleTimezone || "UTC"
  const { hour, minute } = parseTimeString(parsed.times[0])
  const nowParts = getDatePartsInTimezone(fromDate, timezone)

  let candidate = localTimeInZoneToUtc(
    nowParts.year,
    nowParts.month,
    nowParts.day,
    hour,
    minute,
    timezone,
  )

  if (candidate <= fromDate) {
    const nextDay = addCalendarDays(nowParts.year, nowParts.month, nowParts.day, 1)
    candidate = localTimeInZoneToUtc(
      nextDay.year,
      nextDay.month,
      nextDay.day,
      hour,
      minute,
      timezone,
    )
  }

  if (parsed.frequency === "weekly" && parsed.weekdays?.length) {
    const weekdayIndex = {
      SUN: 0,
      MON: 1,
      TUE: 2,
      WED: 3,
      THU: 4,
      FRI: 5,
      SAT: 6,
    }
    const allowed = new Set(parsed.weekdays.map((day) => weekdayIndex[day]).filter((n) => n !== undefined))
    let guard = 0
    while (guard < 8) {
      const candidateParts = getDatePartsInTimezone(candidate, timezone)
      const dow = new Date(Date.UTC(candidateParts.year, candidateParts.month - 1, candidateParts.day)).getUTCDay()
      if (allowed.has(dow) && candidate > fromDate) break
      const nextDay = addCalendarDays(candidateParts.year, candidateParts.month, candidateParts.day, 1)
      candidate = localTimeInZoneToUtc(nextDay.year, nextDay.month, nextDay.day, hour, minute, timezone)
      guard += 1
    }
  }

  return candidate.toISOString()
}

/**
 * @param {Date} [date]
 * @param {string} [timezone]
 */
export function currentTimeHHMMInTimezone(timezone, date = new Date()) {
  const parts = getDatePartsInTimezone(date, timezone || "UTC")
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`
}

export { WEEKDAYS }
