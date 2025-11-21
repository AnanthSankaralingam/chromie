import { NextResponse } from "next/server"
export const runtime = "nodejs"
import { createClient } from "@/lib/supabase/server"
import { focusWindow } from "@/lib/utils/browser-actions"

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
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
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

    console.log("🎯 API: Focusing window for session:", sessionId)

    // Get Hyperbrowser API key
    const apiKey = process.env.HYPERBROWSER_API_KEY || process.env.HYPERBROWSER_API_KEY_FALLBACK_1
    if (!apiKey) {
      return NextResponse.json({ error: "Hyperbrowser not configured" }, { status: 500 })
    }

    // Focus the window - this helps with popup/sidepanel rendering in remote browsers
    const success = await focusWindow(sessionId, apiKey)

    if (success) {
      console.log("✅ API: Window focused successfully")
      return NextResponse.json({ 
        success: true,
        message: "Window brought to front successfully. This should help render popup/sidepanel UI.",
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      })
    } else {
      console.log("❌ API: Window focus failed")
      return NextResponse.json({ 
        success: false,
        error: "Window focus failed",
        sessionId: sessionId
      }, { status: 500 })
    }

  } catch (error) {
    console.error("💥 API: Error focusing window:", error)
    return NextResponse.json({ 
      error: error.message || "Internal server error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

