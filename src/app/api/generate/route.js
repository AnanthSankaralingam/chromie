import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateExtensionCode } from "@/lib/openai-service"
import { REQUEST_TYPES } from "@/lib/prompts"

export async function POST(request) {
  const supabase = createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { prompt, projectId, requestType = REQUEST_TYPES.NEW_EXTENSION } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    console.log("Generating extension code for:", prompt)

    // Get existing files if this is an add-to-existing request
    let existingFiles = {}
    if (requestType === REQUEST_TYPES.ADD_TO_EXISTING && projectId) {
      const { data: files } = await supabase.from("code_files").select("file_path, content").eq("project_id", projectId)

      if (files) {
        existingFiles = files.reduce((acc, file) => {
          acc[file.file_path] = file.content
          return acc
        }, {})
      }
    }

    // Generate extension code using OpenAI
    const result = await generateExtensionCode({
      featureRequest: prompt,
      requestType,
      sessionId: projectId,
      existingFiles,
    })

    if (!result.success) {
      return NextResponse.json({ error: "Failed to generate extension code" }, { status: 500 })
    }

    // Save generated files to database
    const filesToSave = []
    for (const [filePath, content] of Object.entries(result.files)) {
      filesToSave.push({
        project_id: projectId,
        file_path: filePath,
        content: content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    // Use upsert to handle both new and existing files
    const { error: saveError } = await supabase.from("code_files").upsert(filesToSave, {
      onConflict: "project_id,file_path",
    })

    if (saveError) {
      console.error("Error saving files to database:", saveError)
      return NextResponse.json({ error: "Failed to save generated files" }, { status: 500 })
    }

    // Update project with generation info
    await supabase
      .from("projects")
      .update({
        last_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)

    return NextResponse.json({
      success: true,
      message: "Extension generated successfully",
      explanation: result.explanation,
      files: Object.keys(result.files),
      filesGenerated: Object.keys(result.files).length,
    })
  } catch (error) {
    console.error("Error generating extension:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
