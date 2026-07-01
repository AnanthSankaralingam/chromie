/**
 * Passive, read-only CDP observer for a live Browserbase session.
 *
 * Browserbase's `/sessions/{id}/logs` endpoint is best-effort and frequently
 * returns `[]` even with `logSession: true`, so it cannot be relied on for a
 * structured action history. The source of truth is the live CDP event stream.
 *
 * A Chrome DevTools target accepts multiple concurrent CDP clients. The live
 * view iframe is one client; this recorder attaches a second client that only
 * enables observation domains (Page / Runtime / Log) and injects passive DOM
 * listeners for text-only interaction telemetry. It NEVER sends action commands
 * (no `Input.*`), so it cannot drive or perturb the run.
 *
 * What CDP broadcasts reliably: page navigations (`Page.frameNavigated`),
 * in-page/SPA navigations, new/closed tabs, dialogs, and console output. Human
 * clicks/keystrokes are not broadcast CDP events, so each page gets a tiny
 * capture-phase listener that reports those interactions back through a
 * `Runtime.addBinding` callback.
 *
 * NOTE: State is kept in-process (module-level Map). This works for a
 * long-lived Node server (`next dev` / `next start`). In an ephemeral
 * serverless runtime the buffer would not survive between requests; callers
 * degrade gracefully to the `/logs` + replay-metadata fallbacks.
 */

import WebSocket from "ws"
import { CHROMIE_INTERACTION_LISTENER_SOURCE } from "@/lib/new-automation/session-interaction-listener-source"

const MAX_EVENTS = 2000
const CLEANUP_DELAY_MS = 10 * 60 * 1000
const INTERACTION_DEDUPE_WINDOW_MS = 400
const INTERACTION_TYPES = new Set(["click", "input", "key", "submit"])
const CHROMIE_BINDING_NAME = "__chromieEmit"

// Survive Next.js dev HMR by hanging the store off globalThis.
const store = globalThis.__chromieSessionRecorders || new Map()
globalThis.__chromieSessionRecorders = store

function nowMs() {
  return Date.now()
}

function pushEvent(rec, event) {
  if (rec.events.length >= MAX_EVENTS) return
  const timestamp = event.timestamp ?? nowMs()
  const previous = rec.events[rec.events.length - 1]
  if (
    previous &&
    previous.type === event.type &&
    previous.label === event.label &&
    previous.detail === event.detail &&
    (!INTERACTION_TYPES.has(event.type) ||
      timestamp - (previous.timestamp || 0) < INTERACTION_DEDUPE_WINDOW_MS)
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
    timestamp,
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
    if (targetInfo?.url && targetInfo.url !== "about:blank") {
      pushEvent(rec, {
        type: "tab",
        label: "Opened tab",
        detail: `Tab ${page.index} - ${targetInfo.url}`,
        url: targetInfo.url,
        title: targetInfo?.title || null,
        pageId: page.index,
      })
    }
  }
  return page
}

function pageIndexFor(rec, cdpSessionId) {
  const page = rec.pages.get(cdpSessionId)
  return page ? page.index : null
}

function detailTargetSuffix(payload) {
  return payload.target ? ` in ${payload.target}` : ""
}

function interactionEventFromPayload(payload, cdpSessionId, rec) {
  if (!payload || typeof payload !== "object") return null
  const timestamp = typeof payload.timestamp === "number" ? payload.timestamp : nowMs()
  const base = {
    url: typeof payload.href === "string" ? payload.href : null,
    title: typeof payload.title === "string" ? payload.title : null,
    pageId: pageIndexFor(rec, cdpSessionId),
    timestamp,
  }

  if (payload.kind === "click") {
    const elementHtml = typeof payload.elementHtml === "string" ? payload.elementHtml : null
    const target = payload.target || "page"
    return {
      ...base,
      type: "click",
      label: "Clicked",
      detail: elementHtml ? `${target} at ${elementHtml}` : target,
    }
  }

  if (payload.kind === "type") {
    const value = typeof payload.value === "string" ? payload.value : ""
    if (!value) return null
    return {
      ...base,
      type: "input",
      label: "Typed",
      detail: `"${value}"${detailTargetSuffix(payload)}`,
    }
  }

  if (payload.kind === "key") {
    const key = typeof payload.key === "string" ? payload.key : "key"
    return {
      ...base,
      type: "key",
      label: `Pressed ${key}`,
      detail: payload.target ? `in ${payload.target}` : key,
    }
  }

  if (payload.kind === "submit") {
    return {
      ...base,
      type: "submit",
      label: "Submitted form",
      detail: payload.target || "form",
    }
  }

  return null
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
      send(rec, "Runtime.addBinding", { name: CHROMIE_BINDING_NAME }, params.sessionId)
      send(
        rec,
        "Page.addScriptToEvaluateOnNewDocument",
        { source: CHROMIE_INTERACTION_LISTENER_SOURCE },
        params.sessionId,
      )
      send(
        rec,
        "Runtime.evaluate",
        {
          expression: CHROMIE_INTERACTION_LISTENER_SOURCE,
          awaitPromise: false,
          returnByValue: false,
        },
        params.sessionId,
      )
      return
    }

    case "Target.detachedFromTarget": {
      const page = rec.pages.get(params.sessionId)
      if (!page) return
      if (!page.url || page.url === "about:blank") return
      pushEvent(rec, {
        type: "tab",
        label: "Closed tab",
        detail: `Tab ${page.index} closed - ${page.url}`,
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

    case "Runtime.consoleAPICalled":
      return

    case "Runtime.bindingCalled": {
      if (params.name !== CHROMIE_BINDING_NAME || typeof params.payload !== "string") return
      let payload
      try {
        payload = JSON.parse(params.payload)
      } catch {
        return
      }
      const event = interactionEventFromPayload(payload, cdpSessionId, rec)
      if (event) pushEvent(rec, event)
      return
    }

    case "Log.entryAdded": {
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
