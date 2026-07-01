/**
 * Passive, read-only CDP observer for a live Browserbase session.
 *
 * Browserbase's `/sessions/{id}/logs` endpoint is best-effort and frequently
 * returns `[]` even with `logSession: true`, so it cannot be relied on for a
 * structured action history. The source of truth is the live CDP event stream.
 *
 * A Chrome DevTools target accepts multiple concurrent CDP clients. The live
 * view iframe is one client; this recorder attaches a second client that only
 * enables observation domains (Page / Runtime / Log) and NEVER sends action
 * commands (no `Input.*`, no `Runtime.evaluate`), so it cannot perturb the run.
 *
 * What a passive observer CAN capture reliably: page navigations
 * (`Page.frameNavigated`), in-page/SPA navigations, new/closed tabs, dialogs,
 * and console output — because those are broadcast events. It CANNOT see the
 * human's individual clicks/keystrokes, because those are `Input.dispatch*`
 * commands issued by the live-view client and are not broadcast to observers.
 *
 * NOTE: State is kept in-process (module-level Map). This works for a
 * long-lived Node server (`next dev` / `next start`). In an ephemeral
 * serverless runtime the buffer would not survive between requests; callers
 * degrade gracefully to the `/logs` + replay-metadata fallbacks.
 */

import WebSocket from "ws"

const MAX_EVENTS = 2000
const CLEANUP_DELAY_MS = 10 * 60 * 1000

// Survive Next.js dev HMR by hanging the store off globalThis.
const store = globalThis.__chromieSessionRecorders || new Map()
globalThis.__chromieSessionRecorders = store

function nowMs() {
  return Date.now()
}

function pushEvent(rec, event) {
  if (rec.events.length >= MAX_EVENTS) return
  const previous = rec.events[rec.events.length - 1]
  if (
    previous &&
    previous.type === event.type &&
    previous.label === event.label &&
    previous.detail === event.detail
  ) {
    return
  }
  rec.events.push({
    type: event.type,
    label: event.label,
    detail: event.detail ?? null,
    url: event.url ?? null,
    title: event.title ?? null,
    pageId: event.pageId ?? null,
    timestamp: event.timestamp ?? nowMs(),
  })
}

function send(rec, method, params, cdpSessionId) {
  if (!rec.ws || rec.ws.readyState !== WebSocket.OPEN) return
  const message = { id: rec.nextCmdId++, method, params: params || {} }
  if (cdpSessionId) message.sessionId = cdpSessionId
  try {
    rec.ws.send(JSON.stringify(message))
  } catch {
    // Connection may have dropped between the readyState check and send.
  }
}

function registerPage(rec, cdpSessionId, targetInfo) {
  let page = rec.pages.get(cdpSessionId)
  if (!page) {
    page = { index: rec.pageCounter++, url: targetInfo?.url || null, title: targetInfo?.title || null }
    rec.pages.set(cdpSessionId, page)
    pushEvent(rec, {
      type: "tab",
      label: "Opened tab",
      detail: `Tab ${page.index}${targetInfo?.url ? ` — ${targetInfo.url}` : ""}`,
      url: targetInfo?.url || null,
      title: targetInfo?.title || null,
      pageId: page.index,
    })
  }
  return page
}

function pageIndexFor(rec, cdpSessionId) {
  const page = rec.pages.get(cdpSessionId)
  return page ? page.index : null
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

function handleCdpEvent(rec, msg) {
  const { method, params = {}, sessionId: cdpSessionId } = msg

  switch (method) {
    case "Target.attachedToTarget": {
      const info = params.targetInfo || {}
      if (info.type !== "page") return
      registerPage(rec, params.sessionId, info)
      // Enable read-only observation domains on the freshly attached page.
      send(rec, "Page.enable", {}, params.sessionId)
      send(rec, "Runtime.enable", {}, params.sessionId)
      send(rec, "Log.enable", {}, params.sessionId)
      return
    }

    case "Target.detachedFromTarget": {
      const page = rec.pages.get(params.sessionId)
      if (!page) return
      pushEvent(rec, {
        type: "tab",
        label: "Closed tab",
        detail: `Tab ${page.index} closed${page.url ? ` — ${page.url}` : ""}`,
        url: page.url,
        pageId: page.index,
      })
      return
    }

    case "Target.targetInfoChanged": {
      const info = params.targetInfo || {}
      if (info.type !== "page") return
      // targetInfoChanged is not session-scoped; match by targetId is not tracked,
      // so record title changes only when they carry a URL we can attribute.
      return
    }

    case "Page.frameNavigated": {
      const frame = params.frame || {}
      if (frame.parentId) return // only top-level navigations define a "page"
      if (!frame.url || frame.url === "about:blank") return
      const page = rec.pages.get(cdpSessionId)
      if (page) {
        page.url = frame.url
        page.title = frame.name || page.title
      }
      pushEvent(rec, {
        type: "navigation",
        label: "Navigated",
        detail: frame.url,
        url: frame.url,
        pageId: pageIndexFor(rec, cdpSessionId),
      })
      return
    }

    case "Page.navigatedWithinDocument": {
      if (!params.url) return
      pushEvent(rec, {
        type: "navigation",
        label: "In-page navigation",
        detail: params.url,
        url: params.url,
        pageId: pageIndexFor(rec, cdpSessionId),
      })
      return
    }

    case "Page.frameRequestedNavigation": {
      if (!params.url) return
      pushEvent(rec, {
        type: "navigation-intent",
        label: "Requested navigation",
        detail: `${params.url}${params.reason ? ` (${params.reason})` : ""}`,
        url: params.url,
        pageId: pageIndexFor(rec, cdpSessionId),
      })
      return
    }

    case "Page.javascriptDialogOpening": {
      pushEvent(rec, {
        type: "dialog",
        label: "Dialog opened",
        detail: `${params.type || "dialog"}${params.message ? `: ${params.message}` : ""}`,
        url: params.url || null,
        pageId: pageIndexFor(rec, cdpSessionId),
      })
      return
    }

    case "Page.fileChooserOpened": {
      pushEvent(rec, {
        type: "input",
        label: "File chooser opened",
        detail: "User prompted to choose a file",
        pageId: pageIndexFor(rec, cdpSessionId),
      })
      return
    }

    case "Runtime.consoleAPICalled": {
      const text = consoleArgsText(params.args)
      if (!text) return
      pushEvent(rec, {
        type: "console",
        label: `Console ${params.type || "log"}`,
        detail: text.slice(0, 500),
        pageId: pageIndexFor(rec, cdpSessionId),
      })
      return
    }

    case "Log.entryAdded": {
      const entry = params.entry || {}
      if (!entry.text) return
      pushEvent(rec, {
        type: entry.level === "error" ? "error" : "console",
        label: entry.level ? `Browser ${entry.level}` : "Browser log",
        detail: String(entry.text).slice(0, 500),
        url: entry.url || null,
        pageId: pageIndexFor(rec, cdpSessionId),
      })
      return
    }

    default:
      return
  }
}

/**
 * Start observing a session. Fire-and-forget: never throws to the caller.
 * Safe to call multiple times for the same session (subsequent calls no-op).
 */
export function startSessionRecording({ sessionId, connectUrl }) {
  if (!sessionId || !connectUrl) return null
  const existing = store.get(sessionId)
  if (existing && existing.status !== "ended" && existing.status !== "error") {
    return existing
  }

  const rec = {
    sessionId,
    status: "connecting",
    startedAt: nowMs(),
    events: [],
    ws: null,
    nextCmdId: 1,
    pages: new Map(),
    pageCounter: 0,
    error: null,
    cleanupTimer: null,
  }
  store.set(sessionId, rec)

  try {
    const ws = new WebSocket(connectUrl, { perMessageDeflate: false })
    rec.ws = ws

    ws.on("open", () => {
      rec.status = "recording"
      // Auto-attach (flatten) surfaces every page target with a session id, and
      // discover keeps us informed of tab open/close.
      send(rec, "Target.setDiscoverTargets", { discover: true })
      send(rec, "Target.setAutoAttach", {
        autoAttach: true,
        waitForDebuggerOnStart: false,
        flatten: true,
      })
    })

    ws.on("message", (data) => {
      let msg
      try {
        msg = JSON.parse(data.toString())
      } catch {
        return
      }
      if (!msg || !msg.method) return // ignore command results
      try {
        handleCdpEvent(rec, msg)
      } catch (err) {
        console.error("[session-recorder/handle]", sessionId, err?.message)
      }
    })

    ws.on("error", (err) => {
      rec.error = err?.message || "CDP connection error"
      if (rec.status === "connecting") rec.status = "error"
      console.error("[session-recorder/ws-error]", sessionId, rec.error)
    })

    ws.on("close", () => {
      if (rec.status !== "error") rec.status = "ended"
    })
  } catch (err) {
    rec.status = "error"
    rec.error = err?.message || "Failed to open CDP connection"
    console.error("[session-recorder/start]", sessionId, rec.error)
  }

  return rec
}

/** Snapshot of the current recording buffer (safe to call any time). */
export function getSessionRecording(sessionId) {
  const rec = store.get(sessionId)
  if (!rec) return null
  return {
    status: rec.status,
    startedAt: rec.startedAt,
    error: rec.error,
    pageCount: rec.pages.size,
    events: rec.events.map((event, index) => ({ index: `rec-${index}`, ...event })),
  }
}

/**
 * Stop observing and return the final snapshot. Closes the CDP connection
 * (the session itself is terminated separately via REQUEST_RELEASE) and
 * schedules the buffer for cleanup so a later "Retry transcript" still works.
 */
export function stopSessionRecording(sessionId) {
  const rec = store.get(sessionId)
  if (!rec) return null

  const snapshot = getSessionRecording(sessionId)

  try {
    if (rec.ws && rec.ws.readyState === WebSocket.OPEN) {
      rec.ws.close()
    }
  } catch {
    // ignore
  }
  rec.status = "ended"

  if (!rec.cleanupTimer) {
    rec.cleanupTimer = setTimeout(() => store.delete(sessionId), CLEANUP_DELAY_MS)
    if (typeof rec.cleanupTimer.unref === "function") rec.cleanupTimer.unref()
  }

  return snapshot
}
