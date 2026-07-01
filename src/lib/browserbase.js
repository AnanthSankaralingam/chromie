/**
 * Browserbase API helpers (server-side only — uses BROWSERBASE_API_KEY).
 * @see https://docs.browserbase.com/reference/api/session-live-urls
 * @see https://docs.browserbase.com/platform/browser/observability/session-replay
 */

const API_BASE = "https://api.browserbase.com/v1"
const SESSION_TIMEOUT_SECONDS = 300

function requireApiKey() {
  const apiKey = process.env.BROWSERBASE_API_KEY
  if (!apiKey) {
    throw new Error("BROWSERBASE_API_KEY is not configured")
  }
  return apiKey
}

function cleanUserMetadata(userMetadata) {
  if (!userMetadata || typeof userMetadata !== "object") return null
  const entries = Object.entries(userMetadata).filter(([, value]) => {
    if (value === null || value === undefined) return false
    if (typeof value === "string") return value.trim().length > 0
    return true
  })
  return entries.length ? Object.fromEntries(entries) : null
}

/** Dashboard URLs require a Browserbase login — never embed these in Chromie. */
export function isBrowserbaseDashboardUrl(url) {
  if (!url || typeof url !== "string") return false
  try {
    const { hostname, pathname } = new URL(url)
    return (
      (hostname === "browserbase.com" || hostname === "www.browserbase.com") &&
      pathname.startsWith("/sessions/")
    )
  } catch {
    return false
  }
}

export async function getSessionLiveViewUrl(sessionId) {
  const apiKey = requireApiKey()
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/debug`, {
    headers: { "X-BB-API-Key": apiKey },
    cache: "no-store",
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Browserbase live view failed (${res.status}): ${detail}`)
  }

  const data = await res.json()
  return data.debuggerFullscreenUrl || data.debuggerUrl || null
}

export async function createBrowserbaseSession({ userMetadata } = {}) {
  const apiKey = requireApiKey()
  const projectId = process.env.BROWSERBASE_PROJECT_ID?.trim()
  const metadata = cleanUserMetadata(userMetadata)
  const body = {
    ...(projectId ? { projectId } : {}),
    timeout: SESSION_TIMEOUT_SECONDS,
    keepAlive: true,
    browserSettings: {
      recordSession: true,
      logSession: true,
      viewport: { width: 1440, height: 900 },
    },
    ...(metadata ? { userMetadata: metadata } : {}),
  }

  const res = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: {
      "X-BB-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Browserbase session create failed (${res.status}): ${detail}`)
  }

  const data = await res.json()
  if (!data?.id) {
    throw new Error("Browserbase session create returned no id")
  }
  return data
}

/**
 * CDP connect URL for a session. Prefers the value returned by session create;
 * otherwise builds the canonical `wss://connect.browserbase.com` endpoint.
 */
export function buildConnectUrl(session) {
  if (session?.connectUrl) return session.connectUrl
  const apiKey = process.env.BROWSERBASE_API_KEY
  const sessionId = typeof session === "string" ? session : session?.id
  if (!apiKey || !sessionId) return null
  return `wss://connect.browserbase.com?apiKey=${encodeURIComponent(apiKey)}&sessionId=${encodeURIComponent(sessionId)}`
}

export async function createBrowserbaseContext() {
  const apiKey = requireApiKey()
  const projectId = process.env.BROWSERBASE_PROJECT_ID?.trim()
  const body = projectId ? { projectId } : {}
  const res = await fetch(`${API_BASE}/contexts`, {
    method: "POST",
    headers: {
      "X-BB-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Browserbase context create failed (${res.status}): ${detail}`)
  }

  const data = await res.json()
  if (!data?.id) {
    throw new Error("Browserbase context create returned no id")
  }
  return data.id
}

export async function getReplayMetadata(sessionId) {
  const apiKey = requireApiKey()
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/replays`, {
    headers: { "X-BB-API-Key": apiKey },
    cache: "no-store",
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    const err = new Error(`Browserbase replay metadata failed (${res.status}): ${detail}`)
    err.status = res.status
    throw err
  }

  return res.json()
}

export async function getSessionLogs(sessionId) {
  const apiKey = requireApiKey()
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/logs`, {
    headers: { "X-BB-API-Key": apiKey },
    cache: "no-store",
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    const err = new Error(`Browserbase session logs failed (${res.status}): ${detail}`)
    err.status = res.status
    throw err
  }

  return res.json()
}

/** End an active Browserbase session (REQUEST_RELEASE). */
export async function terminateBrowserbaseSession(sessionId) {
  const apiKey = requireApiKey()
  const body = { status: "REQUEST_RELEASE" }
  const projectId = process.env.BROWSERBASE_PROJECT_ID?.trim()
  if (projectId) body.projectId = projectId

  const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    method: "POST",
    headers: {
      "X-BB-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Browserbase terminate failed (${res.status}): ${detail}`)
  }

  return true
}

export async function getReplayPlaylist(sessionId, pageId) {
  const apiKey = requireApiKey()
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/replays/${pageId}`, {
    headers: { "X-BB-API-Key": apiKey },
    cache: "no-store",
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    const err = new Error(`Browserbase replay playlist failed (${res.status}): ${detail}`)
    err.status = res.status
    throw err
  }

  return res.text()
}
