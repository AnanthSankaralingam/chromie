import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { BrowserBaseService } from "@/lib/browserbase-service"

export async function GET(request, { params }) {
  const supabase = createClient()
  const { id: projectId } = params
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
  }

  try {
    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
    }

    // Get debug information from BrowserBase service
    const browserBaseService = new BrowserBaseService()
    const debugInfo = await browserBaseService.getSessionDebugInfo(sessionId)

    // Get session status as well
    const sessionStatus = await browserBaseService.getSessionStatus(sessionId)

    return NextResponse.json({ 
      success: true,
      project: {
        id: project.id,
        name: project.name
      },
      debug: debugInfo,
      status: sessionStatus,
      troubleshooting: {
        extensionTips: [
          "Ensure your manifest.json has the correct permissions",
          "Check that icon files are present in the icons/ directory",
          "Verify that your content scripts have proper match patterns",
          "Make sure your popup.html file exists if declared in manifest",
          "Check browser console for extension loading errors"
        ],
        commonIssues: [
          "Missing activeTab permission prevents content script injection",
          "Invalid manifest.json structure prevents extension loading",
          "Missing icon files cause extension to be invisible",
          "Incorrect file paths in manifest prevent proper loading"
        ]
      }
    })

  } catch (error) {
    console.error("Error getting debug info:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to get debug information" 
    }, { status: 500 })
  }
}