import { NextResponse } from "next/server"
export const runtime = "nodejs"
import { createClient } from "@/lib/supabase/server"
import { navigateToUrl } from "@/lib/utils/browser-actions"

export async function POST(request, { params }) {
  const supabase = createClient()
  const { id } = params

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { sessionId, url } = body

    if (!sessionId || !url) {
      return NextResponse.json({ error: "Missing sessionId or url" }, { status: 400 })
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Normalize URL: domain-like inputs should become https://domain; spaces -> search
    const inputRaw = (url || '').trim()
    let normalizedUrl = inputRaw
    if (!/^https?:\/\//.test(inputRaw) && !/^chrome:\/\//.test(inputRaw)) {
      const hasSpace = inputRaw.includes(' ')
      const looksLikeDomain = /\.[A-Za-z]{2,}(?:\:[0-9]{2,5})?(?:\/|$)/.test(inputRaw) || /\.[A-Za-z]{2,}$/.test(inputRaw)
      if (hasSpace) {
        normalizedUrl = `https://www.google.com/search?q=${encodeURIComponent(inputRaw)}`
      } else if (looksLikeDomain) {
        normalizedUrl = `https://${inputRaw}`
      } else {
        normalizedUrl = `https://www.google.com/search?q=${encodeURIComponent(inputRaw)}`
      }
    }

    console.log("📥 API: Navigating session:", sessionId, "to URL:", normalizedUrl, "(input:", url, ")")

    // Get Hyperbrowser API key - use the same logic as the service
    const apiKey = process.env.HYPERBROWSER_API_KEY || process.env.HYPERBROWSER_API_KEY_FALLBACK_1
    if (!apiKey) {
      return NextResponse.json({ error: "Hyperbrowser not configured" }, { status: 500 })
    }

    console.log("🔑 Using API key for navigation:", apiKey.substring(0, 10) + "...")

    // Add a small delay to ensure session is ready
    console.log("⏳ Waiting for session to be ready...")
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Debug: Check session status before navigation
    try {
      const { Hyperbrowser } = await import("@hyperbrowser/sdk")
      const client = new Hyperbrowser({ apiKey })
      const sessionInfo = await client.sessions.get(sessionId)
      console.log("🔍 Pre-navigation session debug:", {
        id: sessionInfo.id,
        status: sessionInfo.status,
        wsEndpoint: sessionInfo.wsEndpoint || sessionInfo.connectUrl,
        expiresAt: sessionInfo.expiresAt,
        endTime: sessionInfo.endTime,
        closeReason: sessionInfo.closeReason,
        availableFields: Object.keys(sessionInfo)
      })
      
      // Check if session is already closed
      if (sessionInfo.closeReason) {
        console.warn(`⚠️ Session is already closed. Reason: ${sessionInfo.closeReason}`)
        return NextResponse.json({ 
          success: false,
          error: `Session has been closed: ${sessionInfo.closeReason}`,
          url: url,
          sessionId: sessionId
        }, { status: 400 })
      }
    } catch (debugError) {
      console.warn("⚠️ Could not get session debug info:", debugError.message)
      
      // Try with fallback API key if available
      const fallbackApiKey = process.env.HYPERBROWSER_API_KEY_FALLBACK_1
      if (fallbackApiKey && fallbackApiKey !== apiKey) {
        console.log("🔄 Trying debug with fallback API key...")
        try {
          const { Hyperbrowser } = await import("@hyperbrowser/sdk")
          const fallbackClient = new Hyperbrowser({ apiKey: fallbackApiKey })
          const sessionInfo = await fallbackClient.sessions.get(sessionId)
          console.log("✅ Fallback API key worked for debug session lookup")
          console.log("🔍 Pre-navigation session debug (fallback):", {
            id: sessionInfo.id,
            status: sessionInfo.status,
            wsEndpoint: sessionInfo.wsEndpoint || sessionInfo.connectUrl,
            expiresAt: sessionInfo.expiresAt,
            endTime: sessionInfo.endTime,
            closeReason: sessionInfo.closeReason,
            availableFields: Object.keys(sessionInfo)
          })
        } catch (fallbackDebugError) {
          console.warn("⚠️ Fallback API key also failed for debug:", fallbackDebugError.message)
        }
      }
    }

    // Navigate to the URL using the browser actions utility
    const success = await navigateToUrl(sessionId, normalizedUrl, apiKey)

    if (success) {
      console.log("✅ API: Session validated successfully")
      return NextResponse.json({ 
        success: true,
        message: "Content opened in new tab successfully.",
        url: normalizedUrl,
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        note: "The content has been opened in a new tab in the browser window."
      })
    } else {
      console.log("❌ API: Session validation failed")
      return NextResponse.json({ 
        success: false,
        error: "Session validation failed",
        url: normalizedUrl,
        sessionId: sessionId
      }, { status: 500 })
    }

  } catch (error) {
    console.error("💥 API: Error navigating to URL:", error)
    return NextResponse.json({ 
      error: error.message || "Internal server error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
