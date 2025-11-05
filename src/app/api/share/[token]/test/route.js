import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hyperbrowserService } from "@/lib/hyperbrowser-service"
import { BROWSER_SESSION_CONFIG } from "@/lib/constants"

export async function POST(request, { params }) {
  const { token } = params

  try {
    // Get shared project details (check if not expired)
    const supabase = createClient()
    const { data: sharedProject, error: shareError } = await supabase
      .from("shared_links")
      .select(`
        id,
        project_id,
        created_at,
        download_count,
        is_active,
        expires_at
      `)
      .eq("share_token", token)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (shareError || !sharedProject) {
      return NextResponse.json({ error: "Share link not found or expired" }, { status: 404 })
    }

    // Check if share has expired
    if (sharedProject.expires_at && new Date() > new Date(sharedProject.expires_at)) {
      return NextResponse.json({ error: "Share link has expired" }, { status: 410 })
    }

    // Get project files (using service role to bypass RLS)
    const serviceSupabase = createClient()
    const { data: files, error: filesError } = await serviceSupabase
      .from("code_files")
      .select("file_path, content")
      .eq("project_id", sharedProject.project_id)
      .order("file_path")

    if (filesError) {
      console.error("Error fetching project files:", filesError)
      return NextResponse.json({ error: "Failed to fetch project files" }, { status: 500 })
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No extension files found" }, { status: 404 })
    }

    const extensionFiles = files.map((f) => ({ file_path: f.file_path, content: f.content }))

    // Calculate session expiry - enforce 1 minute maximum for shared extension testing
    const now = new Date()
    const sessionStartTime = now.toISOString()
    const remainingMinutes = BROWSER_SESSION_CONFIG.SESSION_DURATION_MINUTES
    const sessionExpiryTime = new Date(now.getTime() + (remainingMinutes * 60 * 1000))

    console.log("Creating shared extension test session with files count:", extensionFiles.length)
    const session = await hyperbrowserService.createTestSession(extensionFiles, sharedProject.project_id)

    // Debug: Log session details after creation
    console.log("🔍 Shared extension test session created successfully:", {
      sessionId: session.sessionId,
      status: session.status,
      liveViewUrl: session.liveViewUrl,
      connectUrl: session.connectUrl
    })

    console.log(`Shared extension test session starts at: ${sessionStartTime}, expires at: ${sessionExpiryTime.toISOString()}, remaining minutes: ${remainingMinutes}`)

    return NextResponse.json({
      session: {
        ...session,
        startedAt: sessionStartTime,
        expiresAt: sessionExpiryTime.toISOString(),
        remainingMinutes: remainingMinutes,
        plan: 'shared' // Mark as shared extension test
      }
    })
  } catch (error) {
    console.error("Error creating shared extension test session:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const { token } = params

  try {
    const { sessionId, startedAt } = await request.json()
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }

    // Verify the share token is still valid
    const supabase = createClient()
    const { data: sharedProject, error: shareError } = await supabase
      .from("shared_links")
      .select("id")
      .eq("share_token", token)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (shareError || !sharedProject) {
      return NextResponse.json({ error: "Share link not found or expired" }, { status: 404 })
    }

    // Log session duration for shared extensions (but don't charge since not logged in)
    if (startedAt) {
      const startTime = new Date(startedAt)
      const endTime = new Date()
      const elapsedMs = endTime.getTime() - startTime.getTime()
      const elapsedMinutes = elapsedMs / (60 * 1000)
      console.log(`📊 Shared session duration: ${elapsedMinutes.toFixed(2)} minutes (not charged)`)
    }

    // Terminate the session
    const ok = await hyperbrowserService.terminateSession(sessionId)
    if (!ok) {
      return NextResponse.json({ error: "Failed to terminate session" }, { status: 500 })
    }

    console.log(`Shared extension test session terminated: ${sessionId}`)

    return NextResponse.json({ 
      success: true,
      message: "Session terminated successfully"
    })
  } catch (error) {
    console.error("Error terminating shared extension test session:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
