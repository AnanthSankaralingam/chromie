import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { browserBaseService } from "@/lib/browserbase-service"

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
    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Get all files for this project
    const { data: files, error: filesError } = await supabase
      .from("code_files")
      .select("file_path, content")
      .eq("project_id", id)

    if (filesError) {
      return NextResponse.json({ error: filesError.message }, { status: 500 })
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No extension files found. Generate code first." }, { status: 400 })
    }

    // Convert files array to object
    const extensionFiles = files.reduce((acc, file) => {
      acc[file.file_path] = file.content
      return acc
    }, {})

    // Validate that we have essential files
    if (!extensionFiles["manifest.json"]) {
      return NextResponse.json({ error: "manifest.json is required for testing" }, { status: 400 })
    }

    // Create BrowserBase test session
    const sessionData = await browserBaseService.createTestSession(extensionFiles, id)

    if (!sessionData.success) {
      return NextResponse.json({ error: "Failed to create test session" }, { status: 500 })
    }

    // Log test session creation
    await supabase
      .from("projects")
      .update({
        last_tested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    return NextResponse.json({
      success: true,
      session: sessionData,
      projectName: project.name,
      filesCount: files.length,
    })
  } catch (error) {
    console.error("Error creating test session:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
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
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Terminate the BrowserBase session
    const success = await browserBaseService.terminateSession(sessionId)

    return NextResponse.json({
      success,
      message: success ? "Test session terminated" : "Failed to terminate session",
    })
  } catch (error) {
    console.error("Error terminating test session:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
