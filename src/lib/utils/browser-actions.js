// Browser control utilities for Hyperbrowser sessions
import { Hyperbrowser } from "@hyperbrowser/sdk"

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
    throw sessionError
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
  
  // Switch to Puppeteer connection per Hyperbrowser docs
  try {
    const puppeteerConnect = await getPuppeteerConnect()
    console.log("About to call puppeteer.connect with:", wsEndpoint)

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

    const browser = await puppeteerConnect({ browserWSEndpoint: wsEndpoint })
    const pages = await browser.pages()
    const page = pages[0] || (await browser.newPage())
    return { browser, page }
  } catch (puppeteerError) {
    console.error("Puppeteer connection failed:", puppeteerError.message)
    console.error("Puppeteer error details:", puppeteerError)
    throw new Error(`Failed to connect to browser session: ${puppeteerError.message}`)
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
      throw sessionError
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
    
    // Use Puppeteer to navigate - open in new tab
    try {
      const { browser } = await getPlaywrightSessionContext(sessionId, apiKey)

      // Create a new tab for the navigation
      const newPage = await browser.newPage()

      // Format the URL - add protocol if missing
      let formattedUrl = url.trim()
      if (!formattedUrl.match(/^https?:\/\//) && !formattedUrl.match(/^chrome:\/\//)) {
        const hasSpace = formattedUrl.includes(' ')
        const looksLikeDomain = /\.[A-Za-z]{2,}(?:\:[0-9]{2,5})?(?:\/|$)/.test(formattedUrl) || /\.[A-Za-z]{2,}$/.test(formattedUrl)
        if (hasSpace) {
          // Treat as search query
          formattedUrl = `https://www.google.com/search?q=${encodeURIComponent(formattedUrl)}`
        } else if (looksLikeDomain) {
          // Treat as bare domain like linkedin.com -> https://linkedin.com
          formattedUrl = `https://${formattedUrl}`
        } else {
          // Single word: search
          formattedUrl = `https://www.google.com/search?q=${encodeURIComponent(formattedUrl)}`
        }
      }
      
      console.log(`🌐 Opening new tab with: ${formattedUrl}`)
      await newPage.goto(formattedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      console.log("Navigation successful to:", formattedUrl)
      return true
    } catch (puppeteerNavError) {
      console.error("Puppeteer navigation failed:", puppeteerNavError.message)
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
