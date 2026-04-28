import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hyperbrowserService } from "@/lib/hyperbrowser-service"

/**
 * Get session status for a live test session
 * GET /api/projects/[id]/test-extension/status?sessionId=xxx
 */
export async function GET(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId parameter" }, { status: 400 })
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

    const status = await hyperbrowserService.getSessionStatus(sessionId)
    let chromeExtensionId = null
    try {
      const { data: extensionIdFile } = await supabase
        .from("code_files")
        .select("content")
        .eq("project_id", id)
        .eq("file_path", ".chromie/extension-id.json")
        .maybeSingle()

      if (extensionIdFile?.content) {
        const parsed = JSON.parse(extensionIdFile.content)
        chromeExtensionId = parsed?.chromeExtensionId || null
      }
    } catch (e) {
      // Non-fatal; status endpoint should still return session health info.
      console.warn("[test-extension/status] Could not load persisted extension ID:", e?.message || e)
    }

    return NextResponse.json({
      success: true,
      ...status,
      chromeExtensionId,
      extensionReady: Boolean(chromeExtensionId),
    })
  } catch (error) {
    console.error("[test-extension/status] Error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to get session status" },
      { status: 500 }
    )
  }
}

