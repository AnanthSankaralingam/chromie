// Session-scoped Puppeteer connection cache
// Ensures all operations on a session share the same connection
// This fixes the issue where multiple independent connections cause CDP events
// to only be delivered to the first connection

const connectionCache = new Map()
// Map<sessionId, { browser, page, logCaptureActive, createdAt }>

/**
 * Get a cached connection for a session
 * @param {string} sessionId
 * @returns {{ browser: any, page: any, logCaptureActive: boolean, createdAt: Date } | undefined}
 */
export function getCachedConnection(sessionId) {
  return connectionCache.get(sessionId)
}

/**
 * Store a connection in the cache
 * @param {string} sessionId
 * @param {any} browser - Puppeteer browser instance
 * @param {any} page - Puppeteer page instance
 */
export function setCachedConnection(sessionId, browser, page) {
  connectionCache.set(sessionId, {
    browser,
    page,
    logCaptureActive: false,
    createdAt: new Date()
  })
  console.log(`[puppeteer-connection-cache] Cached connection for session ${sessionId}`)
}

/**
 * Mark that log capture has been set up for this session
 * @param {string} sessionId
 */
export function markLogCaptureActive(sessionId) {
  const entry = connectionCache.get(sessionId)
  if (entry) {
    entry.logCaptureActive = true
    console.log(`[puppeteer-connection-cache] Marked log capture active for session ${sessionId}`)
  }
}

/**
 * Check if log capture is already active for this session
 * @param {string} sessionId
 * @returns {boolean}
 */
export function isLogCaptureActive(sessionId) {
  const entry = connectionCache.get(sessionId)
  return entry?.logCaptureActive ?? false
}

/**
 * Release/remove a connection from the cache
 * @param {string} sessionId
 */
export function releaseConnection(sessionId) {
  const entry = connectionCache.get(sessionId)
  if (entry) {
    // Try to disconnect the browser if it's still connected
    try {
      if (entry.browser?.connected) {
        entry.browser.disconnect()
      }
    } catch (e) {
      // Ignore disconnect errors
    }
    connectionCache.delete(sessionId)
    console.log(`[puppeteer-connection-cache] Released connection for session ${sessionId}`)
  }
}

/**
 * Get cache stats for debugging
 * @returns {{ size: number, sessions: string[] }}
 */
export function getCacheStats() {
  return {
    size: connectionCache.size,
    sessions: Array.from(connectionCache.keys())
  }
}
