import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { BrowserBaseService } from "@/lib/browserbase-service"

export async function POST(request, { params }) {
  const supabase = createClient()
  const { id: projectId } = params

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    // Get project files
    const { data: files, error: filesError } = await supabase
      .from("code_files")
      .select("file_path, content")
      .eq("project_id", projectId)

    if (filesError) {
      console.error("Error fetching project files:", filesError)
      return NextResponse.json({ error: "Failed to fetch project files" }, { status: 500 })
    }

    // Convert files array to object format expected by BrowserBase service
    const extensionFiles = {}
    files?.forEach(file => {
      extensionFiles[file.file_path] = file.content
    })

    // Create test session using BrowserBase service
    const browserBaseService = new BrowserBaseService()
    const sessionData = await browserBaseService.createTestSession(extensionFiles, projectId)

    console.log("Test session created successfully:", sessionData.sessionId)

    return NextResponse.json({ 
      success: true,
      session: sessionData 
    })

  } catch (error) {
    console.error("Error creating test session:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to create test session" 
    }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const supabase = createClient()
  const { id: projectId } = params

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
    }

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Terminate session using BrowserBase service
    const browserBaseService = new BrowserBaseService()
    const success = await browserBaseService.terminateSession(sessionId)

    console.log("Test session terminated:", sessionId, success ? "successfully" : "with errors")

    return NextResponse.json({ 
      success,
      message: success ? "Session terminated successfully" : "Failed to terminate session"
    })

  } catch (error) {
    console.error("Error terminating test session:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to terminate test session" 
    }, { status: 500 })
  }
}