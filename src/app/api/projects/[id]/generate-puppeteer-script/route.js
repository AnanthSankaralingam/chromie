import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generatePlaywrightTestScript } from "@/lib/codegen/generate-puppeteer-script"

export async function POST(request, { params }) {
  const supabase = createClient()
  const projectId = params.id

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    console.log("🤖 Generating Puppeteer test script for project:", projectId)

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, description")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
    }

    // Get the generated extension files to understand what was built
    const { data: extensionFiles, error: filesError } = await supabase
      .from("code_files")
      .select("file_path, content")
      .eq("project_id", projectId)
      .in("file_path", ["manifest.json", "background.js", "content.js", "popup.js", "sidepanel.js", "popup.html", "sidepanel.html"])

    if (filesError) {
      console.error("Error fetching extension files:", filesError)
      return NextResponse.json({ error: "Failed to fetch extension files" }, { status: 500 })
    }

    if (!extensionFiles || extensionFiles.length === 0) {
      return NextResponse.json({ 
        error: "No extension files found. Please generate the extension first." 
      }, { status: 404 })
    }

    // Generate the Playwright test script using a separate LLM call
    // Use project description as fallback if initial_prompt is not available
    const testScript = await generatePlaywrightTestScript({
      projectId,
      projectName: project.name,
      userPrompt: project.description || `Test the ${project.name} extension`,
      extensionFiles,
    })

    console.log("✅ Puppeteer test script generated successfully")

    // Save the test script to the database
    const { error: saveError } = await supabase
      .from("code_files")
      .upsert({
        project_id: projectId,
        file_path: "puppeteer_test_script.js",
        content: testScript,
        last_used_at: new Date().toISOString(),
      }, {
        onConflict: "project_id,file_path",
      })

    if (saveError) {
      console.error("Error saving Puppeteer test script:", saveError)
      return NextResponse.json({ error: "Failed to save test script" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Puppeteer test script generated successfully",
      script: testScript,
    })

  } catch (error) {
    console.error("❌ Puppeteer test script generation failed:", error)
    
    return NextResponse.json({
      success: false,
      error: error.message || "Puppeteer test script generation failed",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 })
  }
}

