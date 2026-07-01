import { getReplayMetadata, getSessionLogs } from "@/lib/browserbase"
import { getSessionRecording, stopSessionRecording } from "@/lib/session-recorder"

const MAX_ACTIVITY_ITEMS = 120

function safeTimestamp(log) {
  return log?.timestamp || log?.response?.timestamp || log?.request?.timestamp || null
}

function parseRawBody(rawBody) {
  if (!rawBody || typeof rawBody !== "string") return null
  try {
    return JSON.parse(rawBody)
  } catch {
    return null
  }
}

function logPayload(log) {
  const requestRaw = parseRawBody(log?.request?.rawBody)
  const responseRaw = parseRawBody(log?.response?.rawBody)
  return {
    ...(requestRaw?.params || {}),
    ...(log?.request?.params || {}),
    ...(responseRaw?.result || {}),
    ...(log?.response?.result || {}),
  }
}

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim())
}

function consoleArgsText(args) {
  if (!Array.isArray(args)) return null
  const text = args
    .map((arg) => arg?.value ?? arg?.description ?? arg?.unserializableValue)
    .filter((value) => value !== undefined && value !== null)
    .map(String)
    .join(" ")
  return text || null
}

function eventText(log) {
  const payload = logPayload(log)
  const method = log?.method || "Browser event"

  return (
    consoleArgsText(payload.args) ||
    firstString(
      payload.text,
      payload.message,
      payload.url,
      payload.request?.url,
      payload.response?.url,
      payload.frame?.url,
      payload.targetInfo?.url,
      payload.targetInfo?.title,
      payload.type,
    ) ||
    method
  )
}

function eventUrl(log) {
  const payload = logPayload(log)
  return firstString(
    payload.url,
    payload.request?.url,
    payload.response?.url,
    payload.frame?.url,
    payload.documentURL,
    payload.targetInfo?.url,
  )
}

function eventTitle(log) {
  const payload = logPayload(log)
  return firstString(payload.title, payload.targetInfo?.title, payload.frame?.name)
}

function coordinates(payload) {
  if (payload.x === undefined || payload.y === undefined) return null
  return `at ${Math.round(payload.x)}, ${Math.round(payload.y)}`
}

function keyDetail(payload) {
  return firstString(payload.text, payload.key, payload.code, payload.type)
}

function formatElapsedMs(ms) {
  if (typeof ms !== "number" || Number.isNaN(ms)) return null
  if (ms < 1000) return `${ms}ms`
  return `${Math.round(ms / 100) / 10}s`
}

function actionFromReplayPage(page, index) {
  const start = formatElapsedMs(page.startTimeMs)
  const end = formatElapsedMs(page.endTimeMs)
  const duration =
    typeof page.startTimeMs === "number" && typeof page.endTimeMs === "number"
      ? formatElapsedMs(Math.max(0, page.endTimeMs - page.startTimeMs))
      : null
  const timing = [
    duration ? `duration ${duration}` : null,
    start ? `started ${start}` : null,
    end ? `ended ${end}` : null,
  ]
    .filter(Boolean)
    .join(", ")

  return {
    index: `replay-${page.pageId ?? index}`,
    type: "replay-page",
    label: "Recorded tab",
    detail: `Tab ${page.pageId ?? index}${timing ? ` (${timing})` : ""}. Browserbase replay metadata does not include in-tab navigation URLs.`,
    pageId: page.pageId ?? null,
    timestamp: null,
  }
}

function actionFromLog(log, index) {
  const method = log?.method || ""
  const payload = logPayload(log)
  const timestamp = safeTimestamp(log)
  const url = eventUrl(log)
  const title = eventTitle(log)

  if (method === "Page.frameNavigated" && url) {
    return {
      index,
      type: "navigation",
      label: "Navigated",
      detail: title ? `${title} — ${url}` : url,
      url,
      pageId: log?.pageId ?? null,
      timestamp,
    }
  }

  if (method === "Network.requestWillBeSent" && url) {
    const resourceType = payload.type || payload.resourceType
    if (resourceType && resourceType !== "Document") return null
    return {
      index,
      type: "network",
      label: "Loaded page",
      detail: url,
      url,
      pageId: log?.pageId ?? null,
      timestamp,
    }
  }

  if (method === "Target.targetCreated" || method === "Target.targetInfoChanged") {
    if (!url && !title) return null
    return {
      index,
      type: "page",
      label: method === "Target.targetCreated" ? "Opened page" : "Updated page",
      detail: title && url ? `${title} — ${url}` : title || url,
      url,
      pageId: log?.pageId ?? null,
      timestamp,
    }
  }

  if (method.startsWith("Input.")) {
    const inputType = payload.type || method.replace("Input.", "")
    const label =
      method === "Input.dispatchMouseEvent"
        ? inputType === "mouseWheel"
          ? "Scrolled"
          : inputType === "mousePressed"
            ? "Clicked"
            : inputType === "mouseMoved"
              ? "Moved mouse"
              : "Mouse input"
        : method === "Input.dispatchKeyEvent"
          ? "Typed key"
          : method === "Input.insertText"
            ? "Typed text"
            : "User input"
    const detail =
      method === "Input.dispatchMouseEvent"
        ? [inputType, coordinates(payload)].filter(Boolean).join(" ")
        : method === "Input.dispatchKeyEvent"
          ? keyDetail(payload)
          : method === "Input.insertText"
            ? payload.text || "Inserted text"
            : inputType
    return {
      index,
      type: "input",
      label,
      detail,
      pageId: log?.pageId ?? null,
      timestamp,
    }
  }

  if (method === "Page.loadEventFired" || method === "Page.domContentEventFired") {
    return {
      index,
      type: "page",
      label: method === "Page.loadEventFired" ? "Page loaded" : "Page content ready",
      detail: method,
      pageId: log?.pageId ?? null,
      timestamp,
    }
  }

  if (method === "Runtime.consoleAPICalled") {
    return {
      index,
      type: "console",
      label: `Console ${payload.type || "message"}`,
      detail: eventText(log),
      pageId: log?.pageId ?? null,
      timestamp,
    }
  }

  if (method === "Log.entryAdded") {
    const entry = payload.entry || payload
    return {
      index,
      type: entry.level === "error" ? "error" : "console",
      label: entry.level ? `Browser ${entry.level}` : "Browser log",
      detail: firstString(entry.text, entry.url, eventText(log)),
      url: entry.url || null,
      pageId: log?.pageId ?? null,
      timestamp,
    }
  }

  if (/exception|error|failed/i.test(method)) {
    return {
      index,
      type: "error",
      label: "Browser event",
      detail: eventText(log),
      pageId: log?.pageId ?? null,
      timestamp,
    }
  }

  return null
}

function normalizeLogList(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== "object") return []

  for (const key of ["logs", "data", "items", "results"]) {
    if (Array.isArray(payload[key])) return payload[key]
  }

  return Object.values(payload).find(Array.isArray) || []
}

function compactLog(log, index) {
  return {
    index,
    method: log?.method || "unknown",
    pageId: log?.pageId ?? null,
    timestamp: safeTimestamp(log),
    text: String(eventText(log)).slice(0, 500),
  }
}

function recentActivityFromLogs(list) {
  const activity = []

  for (let index = list.length - 1; index >= 0; index -= 1) {
    const item = actionFromLog(list[index], index)
    if (!item) continue
    activity.push(item)
    if (activity.length >= MAX_ACTIVITY_ITEMS) break
  }

  return dedupeActivity(activity.reverse())
}

function dedupeActivity(items) {
  const next = []
  for (const item of items) {
    const previous = next[next.length - 1]
    if (
      previous &&
      previous.type === item.type &&
      previous.label === item.label &&
      previous.detail === item.detail
    ) {
      continue
    }
    next.push(item)
  }
  return next
}

async function loadReplayMetadataTranscript(sessionId) {
  try {
    const meta = await getReplayMetadata(sessionId)
    const pages = Array.isArray(meta?.pages) ? meta.pages : []
    return {
      replayPageCount: Number(meta?.pageCount ?? pages.length),
      replayPages: pages,
      replayActivity: pages.map(actionFromReplayPage),
      replayMetadataAvailable: true,
      replayMessage: pages.length
        ? null
        : "Browserbase replay metadata returned zero recorded pages.",
    }
  } catch (err) {
    console.error("[new-automation-sessions/replay-meta]", err)
    return {
      replayPageCount: 0,
      replayPages: [],
      replayActivity: [],
      replayMetadataAvailable: false,
      replayMessage: "Replay metadata is still processing. Try Retry transcript in a few seconds.",
    }
  }
}

function derivePagesVisited(activity) {
  const pages = []
  for (const item of activity) {
    if (item.type !== "navigation" || !item.url) continue
    const last = pages[pages.length - 1]
    if (last && last.url === item.url) continue
    pages.push({
      order: pages.length + 1,
      url: item.url,
      pageId: item.pageId ?? null,
      timestamp: item.timestamp ?? null,
    })
  }
  return pages
}

function reindexActivity(items) {
  return items.map((item, index) => ({ ...item, index }))
}

function transcriptMessage(activity, source, recorderStatus, recording) {
  if (activity.length && source === "replay") {
    return "Live action recorder returned no events; showing tab-level replay metadata only."
  }
  if (activity.length) return null
  if (recorderStatus === "recording" || recorderStatus === "connecting") {
    return "The action recorder is still connecting. Try Retry transcript in a few seconds."
  }
  if (recorderStatus === "error") {
    return `Action recorder could not attach (${recording?.error || "CDP connection failed"}).`
  }
  return "No navigations were captured. If you only opened blank tabs, navigate to a URL and record again."
}

export async function loadSessionTranscript(sessionId, { stopRecorder = false } = {}) {
  const recording = stopRecorder ? stopSessionRecording(sessionId) : getSessionRecording(sessionId)
  const recorderActivity = recording?.events || []
  const recorderStatus = recording?.status || "unavailable"

  let payload = []
  let list = []
  let eventsAvailable = true
  try {
    payload = await getSessionLogs(sessionId)
    list = normalizeLogList(payload)
  } catch (err) {
    eventsAvailable = false
    console.error("[new-automation-sessions/events]", err)
  }

  const logs = list.slice(-MAX_ACTIVITY_ITEMS).map(compactLog)
  const logActivity = recentActivityFromLogs(list)
  const replay = await loadReplayMetadataTranscript(sessionId)

  let source = "recorder"
  let activity
  if (recorderActivity.length) {
    activity = dedupeActivity(
      [...recorderActivity, ...logActivity].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)),
    )
    source = logActivity.length ? "recorder+logs" : "recorder"
  } else if (logActivity.length) {
    activity = logActivity
    source = "logs"
  } else {
    activity = replay.replayActivity
    source = "replay"
  }

  activity = reindexActivity(activity)
  const pagesVisited = derivePagesVisited(activity)

  if (process.env.NODE_ENV !== "production") {
    console.log("[new-automation-sessions/transcript-loaded]", {
      sessionId,
      source,
      recorderStatus,
      recorderEventCount: recorderActivity.length,
      recorderPageCount: recording?.pageCount ?? 0,
      pagesVisited: pagesVisited.length,
      logRawCount: list.length,
      logActivityCount: logActivity.length,
      transcriptActivityCount: activity.length,
      replayPageCount: replay.replayPageCount,
      eventsAvailable,
    })
  }

  return {
    logs,
    activity,
    pagesVisited,
    source,
    recorderStatus,
    recorderError: recording?.error || null,
    activityMessage: transcriptMessage(activity, source, recorderStatus, recording),
    rawCount: list.length,
    eventsAvailable,
    ...replay,
  }
}
