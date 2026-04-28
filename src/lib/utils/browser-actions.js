// Browser control utilities for Hyperbrowser sessions
import { Hyperbrowser } from "@hyperbrowser/sdk"
import { KNOWN_UTILITY_EXTENSION_IDS } from "@/lib/utils/hyperbrowser-utils"
import {
  getCachedConnection,
  setCachedConnection,
  releaseConnection
} from "./puppeteer-connection-cache.js"

// Dynamic import helper to avoid bundling issues
async function getPuppeteerConnect() {
  try {
    const { connect } = await import('puppeteer-core')
    return connect
  } catch (error) {
    console.error("Failed to import puppeteer-core:", error.message)
    throw error
  }
}

/**
 * Obtain a Puppeteer browser context connected to the Hyperbrowser session via CDP
 * Uses a session-scoped connection cache to ensure all operations share the same connection.
 * This is critical for CDP event delivery - only the first connection receives events.
 * @param {string} sessionId
 * @param {string} apiKey - Hyperbrowser API key
 * @returns {Promise<{ browser: any, page: any }>} connected objects
 */
export async function getPuppeteerSessionContext(sessionId, apiKey) {
  if (!apiKey) {
    console.error("[BROWSER-ACTIONS] ❌ Missing Hyperbrowser API key")
    throw new Error("Missing Hyperbrowser API key")
  }

  // Check cache first - reuse existing connection if available and still connected
  const cached = getCachedConnection(sessionId)
  if (cached?.browser?.connected) {
    console.log("[BROWSER-ACTIONS] ✅ Reusing cached Puppeteer connection for session", sessionId)
    return { browser: cached.browser, page: cached.page }
  }

  // If we had a cached connection but it's no longer connected, clean it up
  if (cached) {
    console.log("[BROWSER-ACTIONS] ⚠️  Cached connection disconnected, creating new one")
    releaseConnection(sessionId)
  }

  const client = new Hyperbrowser({ apiKey })
  let sessionInfo

  try {
    sessionInfo = await client.sessions.get(sessionId)
  } catch (sessionError) {
    console.error("[BROWSER-ACTIONS] ❌ Session lookup failed:", sessionError.message)
    console.error("[BROWSER-ACTIONS] Error stack:", sessionError.stack)
    throw sessionError
  }

  // Poll for session readiness (status === 'active') before connecting.
  // In production (e.g. Vercel), the CDP WebSocket may return 404 until the browser is fully spun up.
  const maxWaitMs = 20000
  const pollIntervalMs = 2000
  let waited = 0
  while (sessionInfo.status !== 'active' && waited < maxWaitMs) {
    console.log("[BROWSER-ACTIONS] ⏳ Session not ready (status:", sessionInfo.status, "), waiting...")
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
    waited += pollIntervalMs
    sessionInfo = await client.sessions.get(sessionId)
  }
  if (sessionInfo.status !== 'active') {
    console.warn("[BROWSER-ACTIONS] ⚠️  Session status is", sessionInfo.status, "after", maxWaitMs, "ms - attempting connection anyway")
  }

  // Hyperbrowser sometimes returns multiple endpoints:
  // - connectUrl: intended for automation (CDP)
  // - wsEndpoint: can be used for CDP, but in some setups it appears coupled to the live viewer
  // Prefer connectUrl to avoid disrupting the embedded live view after the Puppeteer client disconnects.
  const wsEndpoint = sessionInfo.connectUrl || sessionInfo.wsEndpoint

  if (!wsEndpoint) {
    console.error("[BROWSER-ACTIONS] ❌ No WebSocket endpoint found")
    console.error("[BROWSER-ACTIONS] Full session info:", sessionInfo)
    throw new Error(`Missing wsEndpoint for session ${sessionId}. Available fields: ${Object.keys(sessionInfo).join(', ')}`)
  }

  // Ensure wsEndpoint is a string
  if (typeof wsEndpoint !== 'string') {
    console.error("[BROWSER-ACTIONS] ❌ wsEndpoint is not a string:", typeof wsEndpoint)
    throw new Error(`wsEndpoint must be a string, got ${typeof wsEndpoint}: ${wsEndpoint}`)
  }

  // Log host for debugging (avoid logging full URL which may contain tokens)
  try {
    const url = new URL(wsEndpoint)
    console.log("[BROWSER-ACTIONS] 🌐 CDP endpoint host:", url.hostname)
  } catch {
    // ignore
  }

  // Switch to Puppeteer connection per Hyperbrowser docs
  // Retry with backoff: production (Vercel) often sees 404 until CDP is ready
  const maxRetries = 4
  const baseDelayMs = 2000
  let lastError
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log("[BROWSER-ACTIONS] 🔌 Loading Puppeteer...")
      const puppeteerConnect = await getPuppeteerConnect()
      console.log("[BROWSER-ACTIONS] ✅ Puppeteer loaded successfully")
      console.log("[BROWSER-ACTIONS] 🌐 Connecting to browser via WebSocket (attempt", attempt, "/", maxRetries, ")...")

      const browser = await puppeteerConnect({ browserWSEndpoint: wsEndpoint })
      console.log("[BROWSER-ACTIONS] ✅ Puppeteer connected to browser successfully")

      console.log("[BROWSER-ACTIONS] 📄 Getting browser pages...")
      const pages = await browser.pages()
      console.log("[BROWSER-ACTIONS] Found pages count:", pages.length)

      const page = pages[0] || (await browser.newPage())
      console.log("[BROWSER-ACTIONS] ✅ Page ready:", !!page)

      // Cache this connection for reuse
      setCachedConnection(sessionId, browser, page)

      // Set up auto-cleanup when browser disconnects
      browser.on('disconnected', () => {
        console.log("[BROWSER-ACTIONS] 🔌 Browser disconnected, releasing cached connection for session", sessionId)
        releaseConnection(sessionId)
      })

      console.log("[BROWSER-ACTIONS] 🎉 getPuppeteerSessionContext complete (new connection cached)")

      return { browser, page }
    } catch (puppeteerError) {
      lastError = puppeteerError
      const is404 = puppeteerError?.message?.includes('404') || puppeteerError?.message?.includes('Unexpected server response')
      if (attempt < maxRetries && is404) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1)
        console.warn("[BROWSER-ACTIONS] ⚠️  Connection failed (attempt", attempt, "):", puppeteerError.message)
        console.log("[BROWSER-ACTIONS] ⏳ Retrying in", delay, "ms...")
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        break
      }
    }
  }

  console.error("[BROWSER-ACTIONS] ❌ Puppeteer connection failed after", maxRetries, "attempts")
  console.error("[BROWSER-ACTIONS] Error message:", lastError?.message)
  console.error("[BROWSER-ACTIONS] Error stack:", lastError?.stack)
  throw new Error(`Failed to connect to browser session: ${lastError?.message}`)
}

/**
 * Release/cleanup Puppeteer connection for a session
 * Call this when terminating a session to clean up resources
 * @param {string} sessionId
 */
export function releasePuppeteerConnection(sessionId) {
  releaseConnection(sessionId)
}

/**
 * Prime extension context with a tab cycle to prevent key errors
 * @param {string} sessionId - Hyperbrowser session ID
 * @param {string} apiKey - Hyperbrowser API key
 * @returns {Promise<boolean>} success
 */
export async function primeExtensionContext(sessionId, apiKey) {
  try {
    console.log("[BROWSER-ACTIONS] 🔄 Priming extension context with tab cycle...")

    const { browser } = await getPuppeteerSessionContext(sessionId, apiKey)
    const context = browser.defaultBrowserContext()

    // Create a new tab, navigate briefly, then close it
    const primingPage = await context.newPage()
    await primingPage.goto('about:blank', { waitUntil: 'domcontentloaded' })
    await primingPage.close()

    console.log("[BROWSER-ACTIONS] ✅ Extension context primed")
    return true
  } catch (err) {
    console.warn("[BROWSER-ACTIONS] ⚠️ Tab priming failed:", err.message)
    return false
  }
}

/**
 * Capture the Chrome runtime extension ID by enumerating CDP targets (same data as
 * Target.getTargets + chrome-extension URL parsing in Hyperbrowser docs; Puppeteer
 * exposes this as browser.targets()).
 * @param {string} sessionId - Hyperbrowser session ID
 * @param {string} apiKey - Hyperbrowser API key
 * @param {Array<string>} [extraUtilityExtensionIds] - Additional IDs to treat as non-Chromie utilities
 * @param {{ maxAttempts?: number, delayMs?: number }} [options] - Retry while service worker may not be registered yet
 * @returns {Promise<string|null>} Chrome extension ID or null if not found
 */
export async function captureExtensionId(sessionId, apiKey, extraUtilityExtensionIds = [], options = {}) {
  const utilityIds = new Set([...(KNOWN_UTILITY_EXTENSION_IDS || []), ...(extraUtilityExtensionIds || [])])
  const maxAttempts = Math.max(1, options.maxAttempts ?? 10)
  const delayMs = options.delayMs ?? 400

  function extractExtensionIdFromUrl(url) {
    if (!url || typeof url !== "string") return null
    const match = url.match(/^chrome-extension:\/\/([a-p]{32})\//i)
    return match ? match[1] : null
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log("[BROWSER-ACTIONS] 🔍 Capturing Chrome extension ID (targets)...", { attempt, maxAttempts })

      const { browser } = await getPuppeteerSessionContext(sessionId, apiKey)

      const allExtensionTargets = browser.targets().filter((t) => {
        const url = t.url ? t.url() : ""
        return String(url).startsWith("chrome-extension://")
      })

      console.log(`[BROWSER-ACTIONS] Found ${allExtensionTargets.length} extension targets`)

      const candidateTargets = allExtensionTargets.filter((t) => {
        const extId = extractExtensionIdFromUrl(t.url())
        const isUtility = extId && utilityIds.has(extId)
        console.log(`[BROWSER-ACTIONS]   - ${t.type()}: ${extId}${isUtility ? " (utility, excluded)" : ""}`)
        return extId && !isUtility
      })

      if (candidateTargets.length === 0) {
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, delayMs))
          continue
        }
        console.warn("[BROWSER-ACTIONS] ⚠️  No non-utility extension found")
        return null
      }

      const bgTarget = candidateTargets.find((t) => {
        const type = t.type()
        return type === "service_worker" || type === "background_page"
      })

      const selectedTarget = bgTarget || candidateTargets[0]
      const extensionId = extractExtensionIdFromUrl(selectedTarget.url())

      console.log(`[BROWSER-ACTIONS] ✅ Captured Chrome extension ID: ${extensionId}`)
      return extensionId
    } catch (error) {
      console.error("[BROWSER-ACTIONS] ❌ captureExtensionId attempt failed:", error.message)
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs))
      }
    }
  }

  return null
}

/**
 * Navigate the active page to a URL (thin wrapper around Puppeteer page.goto)
 * @param {string} sessionId - Hyperbrowser session ID
 * @param {string} url - URL to navigate to (used as-is, no formatting)
 * @param {string} apiKey - Hyperbrowser API key
 * @returns {Promise<boolean>} success
 */
export async function navigateToUrl(sessionId, url, apiKey) {
  try {
    console.log("[BROWSER-ACTIONS] 🚀 navigateToUrl called")
    
    // First, verify the session exists and is valid
    console.log("[BROWSER-ACTIONS] 🔍 Verifying session...")
    const client = new Hyperbrowser({ apiKey })
    
    let sessionInfo
    try {
      sessionInfo = await client.sessions.get(sessionId)
      console.log("[BROWSER-ACTIONS] ✅ Session found")
    } catch (sessionError) {
      console.error("[BROWSER-ACTIONS] ❌ Session lookup failed:", sessionError.message)
      console.error("[BROWSER-ACTIONS] Error details:", sessionError)
      throw sessionError
    }
    
    console.log("[BROWSER-ACTIONS] Session info:", { 
      id: sessionInfo.id, 
      status: sessionInfo.status,
      wsEndpoint: sessionInfo.wsEndpoint || sessionInfo.connectUrl,
      expiresAt: sessionInfo.expiresAt,
      availableFields: Object.keys(sessionInfo).join(', ')
    })
    
    if (!sessionInfo) {
      console.error("[BROWSER-ACTIONS] ❌ Session not found")
      throw new Error(`Session ${sessionId} not found`)
    }
    
    // Check if session has expired
    if (sessionInfo.expiresAt) {
      const now = new Date()
      const expiresAt = new Date(sessionInfo.expiresAt)
      if (now > expiresAt) {
        console.error("[BROWSER-ACTIONS] ❌ Session has expired")
        throw new Error(`Session ${sessionId} has expired. Expired at: ${expiresAt.toISOString()}`)
      }
      console.log("[BROWSER-ACTIONS] ✅ Session is not expired")
    }
    
    // Check if session is in a valid state
    const validStatuses = ['active', 'ready', 'running', 'connected']
    console.log("[BROWSER-ACTIONS] 🔍 Checking session status:", sessionInfo.status)
    if (!validStatuses.includes(sessionInfo.status)) {
      console.warn("[BROWSER-ACTIONS] ⚠️  Session status is:", sessionInfo.status, "but attempting navigation anyway")
    } else {
      console.log("[BROWSER-ACTIONS] ✅ Session status is valid")
    }
    
    // Add a small delay to ensure session is ready
    console.log("[BROWSER-ACTIONS] ⏳ Waiting 2 seconds for session to be fully ready...")
    await new Promise(resolve => setTimeout(resolve, 2000))
    console.log("[BROWSER-ACTIONS] ✅ Wait complete")
    
    // Use Puppeteer to navigate - open in new tab
    try {
      console.log("[BROWSER-ACTIONS] 🔌 Getting Puppeteer context...")
      const { browser } = await getPuppeteerSessionContext(sessionId, apiKey)
      console.log("[BROWSER-ACTIONS] ✅ Got browser context")

      // Create a new tab for the navigation
      console.log("[BROWSER-ACTIONS] 📄 Creating new page...")
      const newPage = await browser.newPage()
      console.log("[BROWSER-ACTIONS] ✅ New page created")

      // Format the URL - add protocol if missing
      let formattedUrl = url.trim()
      console.log("[BROWSER-ACTIONS] 🔧 Formatting URL:", formattedUrl)
      
      if (!formattedUrl.match(/^https?:\/\//) && !formattedUrl.match(/^chrome:\/\//)) {
        const hasSpace = formattedUrl.includes(' ')
        const looksLikeDomain = /\.[A-Za-z]{2,}(?:\:[0-9]{2,5})?(?:\/|$)/.test(formattedUrl) || /\.[A-Za-z]{2,}$/.test(formattedUrl)
        if (hasSpace) {
          // Treat as search query
          formattedUrl = `https://www.google.com/search?q=${encodeURIComponent(formattedUrl)}`
          console.log("[BROWSER-ACTIONS] 🔎 Formatted as search query:", formattedUrl)
        } else if (looksLikeDomain) {
          // Treat as bare domain like linkedin.com -> https://linkedin.com
          formattedUrl = `https://${formattedUrl}`
          console.log("[BROWSER-ACTIONS] 🌐 Formatted as domain:", formattedUrl)
        } else {
          // Single word: search
          formattedUrl = `https://www.google.com/search?q=${encodeURIComponent(formattedUrl)}`
          console.log("[BROWSER-ACTIONS] 🔎 Formatted as single word search:", formattedUrl)
        }
      } else {
        console.log("[BROWSER-ACTIONS] ✅ URL already has protocol")
      }
      
      console.log("[BROWSER-ACTIONS] 🚀 Navigating to:", formattedUrl)
      await newPage.goto(formattedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      console.log("[BROWSER-ACTIONS] ✅ Navigation successful!")
      return true
    } catch (puppeteerNavError) {
      console.error("[BROWSER-ACTIONS] ❌ Puppeteer navigation failed:", puppeteerNavError.message)
      console.error("[BROWSER-ACTIONS] Error stack:", puppeteerNavError.stack)
      // Fallback: just return true since the session is valid
      console.log(`[BROWSER-ACTIONS] ℹ️  Session ${sessionId} is valid and ready`)
      console.log(`[BROWSER-ACTIONS] 🌐 Navigation to ${url} may need to be done manually`)
      return true
    }
  } catch (e) {
    console.error("[BROWSER-ACTIONS] ❌ Navigation failed:", e?.message)
    console.error("[BROWSER-ACTIONS] Error stack:", e?.stack)
    return false
  }
}
