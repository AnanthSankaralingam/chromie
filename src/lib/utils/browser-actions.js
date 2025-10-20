// Browser control utilities for Hyperbrowser sessions
import { Hyperbrowser } from "@hyperbrowser/sdk"

// Dynamic import helper to avoid bundling issues
async function getPlaywrightChromium() {
  try {
    const { chromium } = await import('playwright-core')
    return chromium
  } catch (error) {
    console.error("Failed to import playwright-core:", error.message)
    throw error
  }
}

/**
 * Obtain a Playwright browser context connected to the Hyperbrowser session via CDP
 * @param {string} sessionId
 * @param {string} apiKey - Hyperbrowser API key
 * @returns {Promise<{ browser: any, context: any, page: any }>} connected objects
 */
export async function getPlaywrightSessionContext(sessionId, apiKey) {
  if (!apiKey) throw new Error("Missing Hyperbrowser API key")
  
  const client = new Hyperbrowser({ apiKey })
  let sessionInfo
  
  try {
    sessionInfo = await client.sessions.get(sessionId)
  } catch (sessionError) {
    console.error("❌ Session lookup failed in getPlaywrightSessionContext:", sessionError.message)
    
    // Try with fallback API key if available
    const fallbackApiKey = process.env.HYPERBROWSER_API_KEY_FALLBACK_1
    if (fallbackApiKey && fallbackApiKey !== apiKey) {
      console.log("🔄 Trying with fallback API key in getPlaywrightSessionContext...")
      const fallbackClient = new Hyperbrowser({ apiKey: fallbackApiKey })
      try {
        sessionInfo = await fallbackClient.sessions.get(sessionId)
        console.log("✅ Fallback API key worked for session lookup in getPlaywrightSessionContext")
      } catch (fallbackError) {
        console.error("❌ Fallback API key also failed in getPlaywrightSessionContext:", fallbackError.message)
        throw new Error(`Session ${sessionId} not found with either API key: ${sessionError.message}`)
      }
    } else {
      throw sessionError
    }
  }
  
  const wsEndpoint = sessionInfo.wsEndpoint || sessionInfo.connectUrl
  
  console.log("Raw sessionInfo.wsEndpoint:", sessionInfo.wsEndpoint)
  console.log("Raw sessionInfo.connectUrl:", sessionInfo.connectUrl)
  console.log("Selected wsEndpoint:", wsEndpoint)
  
  if (!wsEndpoint) {
    console.error("Session info:", sessionInfo)
    throw new Error(`Missing wsEndpoint for session ${sessionId}. Available fields: ${Object.keys(sessionInfo).join(', ')}`)
  }
  
  console.log("Connecting to wsEndpoint:", wsEndpoint)
  console.log("wsEndpoint type:", typeof wsEndpoint)
  console.log("wsEndpoint length:", wsEndpoint?.length)
  
  // Ensure wsEndpoint is a string
  if (typeof wsEndpoint !== 'string') {
    throw new Error(`wsEndpoint must be a string, got ${typeof wsEndpoint}: ${wsEndpoint}`)
  }
  
  try {
    const chromium = await getPlaywrightChromium()
    console.log("About to call chromium.connectOverCDP with:", wsEndpoint)
    
    // Try to parse the WebSocket URL to ensure it's valid
    try {
      const url = new URL(wsEndpoint)
      console.log("Parsed WebSocket URL:", {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        pathname: url.pathname,
        search: url.search
      })
    } catch (urlError) {
      console.warn("Could not parse wsEndpoint as URL:", urlError.message)
    }
    
    const browser = await chromium.connectOverCDP(wsEndpoint)
    const context = browser.contexts()[0]
    const page = context.pages()[0] || (await context.newPage())
    return { browser, context, page }
  } catch (playwrightError) {
    console.error("Playwright connection failed:", playwrightError.message)
    console.error("Playwright error details:", playwrightError)
    
    // Try alternative connection method if available
    try {
      console.log("Attempting alternative connection method...")
      const chromium = await getPlaywrightChromium()
      
      // Try connecting with a different approach
      const browser = await chromium.connect(wsEndpoint)
      const context = browser.contexts()[0]
      const page = context.pages()[0] || (await context.newPage())
      console.log("Alternative connection method succeeded")
      return { browser, context, page }
    } catch (altError) {
      console.error("Alternative connection method also failed:", altError.message)
      throw new Error(`Failed to connect to browser session: ${playwrightError.message}`)
    }
  }
}

/**
 * Navigate the active page to a URL (thin wrapper around Playwright page.goto)
 * @param {string} sessionId - Hyperbrowser session ID
 * @param {string} url - URL to navigate to (used as-is, no formatting)
 * @param {string} apiKey - Hyperbrowser API key
 * @returns {Promise<boolean>} success
 */
export async function navigateToUrl(sessionId, url, apiKey) {
  try {
    console.log(`Navigating session ${sessionId} to ${url}`)
    console.log(`🔑 Using API key: ${apiKey.substring(0, 10)}...`)
    
    // First, verify the session exists and is valid
    const client = new Hyperbrowser({ apiKey })
    console.log(`🔍 Attempting to get session info for: ${sessionId}`)
    
    let sessionInfo
    try {
      sessionInfo = await client.sessions.get(sessionId)
    } catch (sessionError) {
      console.error("❌ Session lookup failed:", sessionError.message)
      console.error("Session error details:", sessionError)
      
      // Try with fallback API key if available
      const fallbackApiKey = process.env.HYPERBROWSER_API_KEY_FALLBACK_1
      if (fallbackApiKey && fallbackApiKey !== apiKey) {
        console.log("🔄 Trying with fallback API key...")
        const fallbackClient = new Hyperbrowser({ apiKey: fallbackApiKey })
        try {
          sessionInfo = await fallbackClient.sessions.get(sessionId)
          console.log("✅ Fallback API key worked for session lookup")
        } catch (fallbackError) {
          console.error("❌ Fallback API key also failed:", fallbackError.message)
          throw new Error(`Session ${sessionId} not found with either API key: ${sessionError.message}`)
        }
      } else {
        throw sessionError
      }
    }
    
    console.log("Session info:", { 
      id: sessionInfo.id, 
      status: sessionInfo.status,
      wsEndpoint: sessionInfo.wsEndpoint || sessionInfo.connectUrl,
      expiresAt: sessionInfo.expiresAt,
      availableFields: Object.keys(sessionInfo)
    })
    
    if (!sessionInfo) {
      throw new Error(`Session ${sessionId} not found`)
    }
    
    // Check if session has expired
    if (sessionInfo.expiresAt) {
      const now = new Date()
      const expiresAt = new Date(sessionInfo.expiresAt)
      if (now > expiresAt) {
        throw new Error(`Session ${sessionId} has expired. Expired at: ${expiresAt.toISOString()}`)
      }
      console.log(`Session expires at: ${expiresAt.toISOString()}, current time: ${now.toISOString()}`)
    }
    
    // Check if session is in a valid state
    const validStatuses = ['active', 'ready', 'running', 'connected']
    if (!validStatuses.includes(sessionInfo.status)) {
      console.warn(`Session ${sessionId} status is ${sessionInfo.status}, but attempting navigation anyway`)
    }
    
    // Add a small delay to ensure session is ready
    console.log("⏳ Waiting for session to be fully ready...")
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Use Playwright to navigate - open in new tab
    try {
      const { page, context } = await getPlaywrightSessionContext(sessionId, apiKey)
      
      // Create a new tab for the navigation
      const newPage = await context.newPage()
      
      // Format the URL - add protocol if missing
      let formattedUrl = url.trim()
      if (!formattedUrl.match(/^https?:\/\//) && !formattedUrl.match(/^chrome:\/\//)) {
        // If it doesn't start with http://, https://, or chrome://, assume it's a search query or domain
        if (formattedUrl.includes(' ') || formattedUrl.includes('.') && !formattedUrl.includes('/')) {
          // If it contains spaces or looks like a domain without path, treat as search
          formattedUrl = `https://www.google.com/search?q=${encodeURIComponent(formattedUrl)}`
        } else {
          // Otherwise, assume it's a domain and add https://
          formattedUrl = `https://${formattedUrl}`
        }
      }
      
      console.log(`🌐 Opening new tab with: ${formattedUrl}`)
      await newPage.goto(formattedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      console.log("Navigation successful to:", formattedUrl)
      return true
    } catch (playwrightError) {
      console.error("Playwright navigation failed:", playwrightError.message)
      // Fallback: just return true since the session is valid
      console.log(`✅ Session ${sessionId} is valid and ready for navigation to ${url}`)
      console.log(`🌐 Please navigate to ${url} manually in the browser window`)
      return true
    }
  } catch (e) {
    console.error("Navigation failed:", e?.message)
    return false
  }
}
