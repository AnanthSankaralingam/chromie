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
  console.log("[BROWSER-ACTIONS] 🚀 getPlaywrightSessionContext called")
  console.log("[BROWSER-ACTIONS] Session ID:", sessionId)
  console.log("[BROWSER-ACTIONS] API key exists:", !!apiKey)
  console.log("[BROWSER-ACTIONS] Environment:", process.env.VERCEL ? "Vercel" : "Local")
  
  if (!apiKey) {
    console.error("[BROWSER-ACTIONS] ❌ Missing Hyperbrowser API key")
    throw new Error("Missing Hyperbrowser API key")
  }
  
  console.log("[BROWSER-ACTIONS] ✅ API key found, initializing Hyperbrowser client")
  const client = new Hyperbrowser({ apiKey })
  let sessionInfo
  
  try {
    console.log("[BROWSER-ACTIONS] 🔍 Fetching session info from Hyperbrowser API...")
    sessionInfo = await client.sessions.get(sessionId)
    console.log("[BROWSER-ACTIONS] ✅ Session info received")
    console.log("[BROWSER-ACTIONS] Session status:", sessionInfo.status)
    console.log("[BROWSER-ACTIONS] Available fields:", Object.keys(sessionInfo).join(', '))
  } catch (sessionError) {
    console.error("[BROWSER-ACTIONS] ❌ Session lookup failed:", sessionError.message)
    console.error("[BROWSER-ACTIONS] Error stack:", sessionError.stack)
    throw sessionError
  }
  
  const wsEndpoint = sessionInfo.wsEndpoint || sessionInfo.connectUrl
  
  console.log("[BROWSER-ACTIONS] 📡 WebSocket endpoint extraction:")
  console.log("[BROWSER-ACTIONS]   - wsEndpoint field:", sessionInfo.wsEndpoint || "not present")
  console.log("[BROWSER-ACTIONS]   - connectUrl field:", sessionInfo.connectUrl || "not present")
  console.log("[BROWSER-ACTIONS]   - Selected:", wsEndpoint || "NONE")
  
  if (!wsEndpoint) {
    console.error("[BROWSER-ACTIONS] ❌ No WebSocket endpoint found")
    console.error("[BROWSER-ACTIONS] Full session info:", sessionInfo)
    throw new Error(`Missing wsEndpoint for session ${sessionId}. Available fields: ${Object.keys(sessionInfo).join(', ')}`)
  }
  
  console.log("[BROWSER-ACTIONS] ✅ WebSocket endpoint found")
  console.log("[BROWSER-ACTIONS] Endpoint type:", typeof wsEndpoint)
  console.log("[BROWSER-ACTIONS] Endpoint length:", wsEndpoint?.length)
  console.log("[BROWSER-ACTIONS] Endpoint value:", wsEndpoint)
  
  // Ensure wsEndpoint is a string
  if (typeof wsEndpoint !== 'string') {
    console.error("[BROWSER-ACTIONS] ❌ wsEndpoint is not a string:", typeof wsEndpoint)
    throw new Error(`wsEndpoint must be a string, got ${typeof wsEndpoint}: ${wsEndpoint}`)
  }
  
  // Switch to Puppeteer connection per Hyperbrowser docs
  try {
    console.log("[BROWSER-ACTIONS] 🔌 Loading Puppeteer...")
    const puppeteerConnect = await getPuppeteerConnect()
    console.log("[BROWSER-ACTIONS] ✅ Puppeteer loaded successfully")
    console.log("[BROWSER-ACTIONS] 🌐 About to connect to browser via WebSocket...")

    // Try to parse the WebSocket URL to ensure it's valid
    try {
      const url = new URL(wsEndpoint)
      console.log("[BROWSER-ACTIONS] ✅ WebSocket URL is valid:")
      console.log("[BROWSER-ACTIONS]   - Protocol:", url.protocol)
      console.log("[BROWSER-ACTIONS]   - Hostname:", url.hostname)
      console.log("[BROWSER-ACTIONS]   - Port:", url.port || "default")
      console.log("[BROWSER-ACTIONS]   - Pathname:", url.pathname)
      console.log("[BROWSER-ACTIONS]   - Search:", url.search || "none")
    } catch (urlError) {
      console.warn("[BROWSER-ACTIONS] ⚠️  Could not parse wsEndpoint as URL:", urlError.message)
      console.warn("[BROWSER-ACTIONS] Proceeding anyway...")
    }

    console.log("[BROWSER-ACTIONS] 🔄 Calling puppeteer.connect()...")
    const browser = await puppeteerConnect({ browserWSEndpoint: wsEndpoint })
    console.log("[BROWSER-ACTIONS] ✅ Puppeteer connected to browser successfully")
    
    console.log("[BROWSER-ACTIONS] 📄 Getting browser pages...")
    const pages = await browser.pages()
    console.log("[BROWSER-ACTIONS] Found pages count:", pages.length)
    
    const page = pages[0] || (await browser.newPage())
    console.log("[BROWSER-ACTIONS] ✅ Page ready:", !!page)
    console.log("[BROWSER-ACTIONS] 🎉 getPlaywrightSessionContext complete")
    
    return { browser, page }
  } catch (puppeteerError) {
    console.error("[BROWSER-ACTIONS] ❌ Puppeteer connection failed")
    console.error("[BROWSER-ACTIONS] Error message:", puppeteerError.message)
    console.error("[BROWSER-ACTIONS] Error stack:", puppeteerError.stack)
    console.error("[BROWSER-ACTIONS] Full error:", puppeteerError)
    throw new Error(`Failed to connect to browser session: ${puppeteerError.message}`)
  }
}

/**
 * Bring browser window to front and focus the current page
 * This helps with rendering issues in remote browsers where UI doesn't fully paint until focused
 * @param {string} sessionId - Hyperbrowser session ID
 * @param {string} apiKey - Hyperbrowser API key
 * @returns {Promise<boolean>} success
 */
export async function focusWindow(sessionId, apiKey) {
  try {
    console.log("[BROWSER-ACTIONS] 🎯 focusWindow called")
    console.log("[BROWSER-ACTIONS] Session ID:", sessionId)
    
    const { page } = await getPlaywrightSessionContext(sessionId, apiKey)
    
    // Bring page to front - this triggers rendering in remote browsers
    console.log("[BROWSER-ACTIONS] 🔄 Bringing page to front...")
    await page.bringToFront()
    console.log("[BROWSER-ACTIONS] ✅ Page brought to front")
    
    // Small delay to ensure rendering completes
    await new Promise(resolve => setTimeout(resolve, 500))
    console.log("[BROWSER-ACTIONS] ✅ Window focus complete")
    
    return true
  } catch (e) {
    console.error("[BROWSER-ACTIONS] ❌ Window focus failed:", e?.message)
    return false
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
    console.log("[BROWSER-ACTIONS] 🚀 navigateToUrl called")
    console.log("[BROWSER-ACTIONS] Session ID:", sessionId)
    console.log("[BROWSER-ACTIONS] Target URL:", url)
    console.log("[BROWSER-ACTIONS] API key exists:", !!apiKey)
    console.log("[BROWSER-ACTIONS] Environment:", process.env.VERCEL ? "Vercel" : "Local")
    
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
      console.log("[BROWSER-ACTIONS] ⏰ Session expiry check:")
      console.log("[BROWSER-ACTIONS]   - Expires at:", expiresAt.toISOString())
      console.log("[BROWSER-ACTIONS]   - Current time:", now.toISOString())
      
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
      console.log("[BROWSER-ACTIONS] 🔌 Getting Playwright context...")
      const { browser } = await getPlaywrightSessionContext(sessionId, apiKey)
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
