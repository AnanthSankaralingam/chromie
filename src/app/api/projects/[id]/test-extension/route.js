import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
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
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Load existing extension files for this project
    const { data: files, error: filesError } = await supabase
      .from("code_files")
      .select("file_path, content")
      .eq("project_id", id)
      .order("file_path")

    if (filesError) {
      return NextResponse.json({ error: filesError.message }, { status: 500 })
    }

    const extensionFiles = (files || []).map((f) => ({ file_path: f.file_path, content: f.content }))

    // Extract stagehand script from extension files
    let stagehandScript = null
    let extensionConfig = {
      name: "Extension",
      description: "Chrome extension",
      type: "generic"
    }

    // Try to extract stagehand script from the generated files
    const stagehandScriptFile = files?.find(f => f.file_path === 'stagehand_script.js')
    if (stagehandScriptFile) {
      try {
        stagehandScript = stagehandScriptFile.content
        console.log("📋 Found stagehand script:", stagehandScript.length, "characters")
      } catch (e) {
        console.warn("Could not read stagehand script:", e.message)
      }
    }

    // Try to extract extension config from manifest
    const manifestFile = files?.find(f => f.file_path === 'manifest.json')
    if (manifestFile) {
      try {
        const manifest = JSON.parse(manifestFile.content)
        extensionConfig.name = manifest.name || "Extension"
        extensionConfig.description = manifest.description || "Chrome extension"
        
        // Determine extension type from manifest
        if (manifest.action?.default_popup) {
          extensionConfig.type = "popup"
        } else if (manifest.side_panel) {
          extensionConfig.type = "side_panel"
        } else if (manifest.content_scripts) {
          extensionConfig.type = "overlay"
        }
      } catch (e) {
        console.warn("Could not parse manifest.json:", e.message)
      }
    }

    // Add stagehand script to extension config
    extensionConfig.stagehandScript = stagehandScript

    console.log("Creating session with existing extension files count:", extensionFiles.length)
    console.log("📋 Extension config:", extensionConfig)
    console.log("🤖 Stagehand script:", stagehandScript ? stagehandScript.length + " characters" : "not found")
    
    const session = await browserBaseService.createTestSession(extensionFiles, process.env.BROWSERBASE_PROJECT_ID)

    return NextResponse.json({ 
      session,
      extensionConfig,
      stagehandScript 
    })
  } catch (error) {
    console.error("Error creating Browserbase test session:", error)
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
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }
    const ok = await browserBaseService.terminateSession(sessionId)
    if (!ok) {
      return NextResponse.json({ error: "Failed to terminate session" }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error terminating Browserbase session:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
} 