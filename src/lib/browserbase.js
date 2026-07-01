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

function envFlag(name, fallback) {
  const raw = String(process.env[name] ?? "").trim().toLowerCase()
  if (!raw) return fallback
  return ["1", "true", "yes", "on"].includes(raw)
}

function envInt(name, fallback) {
  const raw = Number.parseInt(process.env[name] ?? "", 10)
  return Number.isFinite(raw) && raw > 0 ? raw : fallback
}

/**
 * Egress pin for the account-level browser identity used by the `/new` recorder
 * (and shared with eviivo runs on the runner). The cookies a user creates while
 * logging into a third-party site are minted under this region + Browserbase proxy
 * + viewport; the runner MUST reuse the same egress when it replays a run for that
 * identity, or the login-bound site rejects the restored context. Keep these
 * `BROWSERBASE_IDENTITY_*` values in lockstep with the runner's
 * `resolve_session_pinning` identity pin (which also reads `BROWSERBASE_EVIIVO_*`
 * as a fallback — see chromie-runner). Defaults match on both sides.
 */
export function resolveIdentitySessionPinning() {
  const region =
    process.env.BROWSERBASE_IDENTITY_REGION?.trim() ||
    process.env.BROWSERBASE_REGION?.trim() ||
    "us-east-1"

  const viewport = {
    width: envInt("BROWSERBASE_IDENTITY_VIEWPORT_WIDTH", 1920),
    height: envInt("BROWSERBASE_IDENTITY_VIEWPORT_HEIGHT", 1080),
  }

  let proxies
  if (envFlag("BROWSERBASE_IDENTITY_PROXIES", true)) {
    const country = process.env.BROWSERBASE_IDENTITY_PROXY_COUNTRY?.trim()
    if (country) {
      const geolocation = { country: country.toUpperCase() }
      const state = process.env.BROWSERBASE_IDENTITY_PROXY_STATE?.trim()
      const city = process.env.BROWSERBASE_IDENTITY_PROXY_CITY?.trim()
      if (state) geolocation.state = state.toUpperCase()
      if (city) geolocation.city = city.toUpperCase()
      proxies = [{ type: "browserbase", geolocation }]
    } else {
      proxies = true
    }
  }

  return { region, proxies, viewport }
}

export async function createBrowserbaseSession({
  userMetadata,
  contextId,
  persist = true,
  region,
  proxies,
  viewport,
  solveCaptchas,
} = {}) {
  const apiKey = requireApiKey()
  const projectId = process.env.BROWSERBASE_PROJECT_ID?.trim()
  const metadata = cleanUserMetadata(userMetadata)
  const context = String(contextId || "").trim()
  const resolvedRegion = String(region || "").trim()
  const resolvedViewport =
    viewport && Number(viewport.width) > 0 && Number(viewport.height) > 0
      ? { width: Number(viewport.width), height: Number(viewport.height) }
      : { width: 1440, height: 900 }
  const body = {
    ...(projectId ? { projectId } : {}),
    timeout: SESSION_TIMEOUT_SECONDS,
    keepAlive: true,
    // Egress pinning (region + proxy) is top-level on the session; the viewport
    // lives in browserSettings. Pin them so a restored context's cookies aren't
    // rejected by login-bound sites that bind sessions to IP/fingerprint.
    ...(resolvedRegion ? { region: resolvedRegion } : {}),
    ...(proxies ? { proxies } : {}),
    browserSettings: {
      recordSession: true,
      logSession: true,
      viewport: resolvedViewport,
      // Captcha handling is split by path (matches chromie-runner): a human-driven
      // login session passes solveCaptchas:false so the real challenge renders for
      // the person to solve — auto-solving a login Turnstile submits a token the
      // site rejects. Automated runs leave it at the Browserbase default (on) to
      // clear the bot-check unattended. Omitted => Browserbase default.
      ...(typeof solveCaptchas === "boolean" ? { solveCaptchas } : {}),
      // Persisted login: restore cookies/localStorage from the context and, with
      // persist:true, save whatever the user logs into back to it for next time.
      ...(context ? { context: { id: context, persist: Boolean(persist) } } : {}),
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
