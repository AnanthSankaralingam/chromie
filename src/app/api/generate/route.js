import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateExtensionCode } from "@/lib/openai-service"
import { REQUEST_TYPES } from "@/lib/prompts"
import { randomUUID } from "crypto"

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
    console.log("Generating extension code for:", request)
    const { prompt, projectId, requestType = REQUEST_TYPES.NEW_EXTENSION } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
    }

    // Verify project ownership
    if (projectId) {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single()

      if (projectError || !project) {
        return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
      }
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

    // Debug: Log auth context
    console.log("Auth context - User ID:", user.id)
    console.log("Project ID:", projectId)

    // Save generated files to database - handle each file individually
    const savedFiles = []
    const errors = []

    for (const [filePath, content] of Object.entries(result.files)) {
      try {
        // First, try to update existing file
        const { data: existingFile } = await supabase
          .from("code_files")
          .select("id")
          .eq("project_id", projectId)
          .eq("file_path", filePath)
          .single()

        if (existingFile) {
          // Update existing file
          const { error: updateError } = await supabase
            .from("code_files")
            .update({
              content: content,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingFile.id)

          if (updateError) {
            console.error(`Error updating file ${filePath}:`, updateError)
            errors.push({ filePath, error: updateError })
          } else {
            savedFiles.push(filePath)
          }
        } else {
          // Insert new file
          const { error: insertError } = await supabase
            .from("code_files")
            .insert({
              id: randomUUID(),
              project_id: projectId,
              file_path: filePath,
              content: content,
              updated_at: new Date().toISOString(),
            })

          if (insertError) {
            console.error(`Error inserting file ${filePath}:`, insertError)
            errors.push({ filePath, error: insertError })
          } else {
            savedFiles.push(filePath)
          }
        }
      } catch (fileError) {
        console.error(`Exception handling file ${filePath}:`, fileError)
        errors.push({ filePath, error: fileError })
      }
    }

    if (errors.length > 0) {
      console.error("Errors saving files:", errors)
      return NextResponse.json({ 
        error: "Failed to save some generated files", 
        details: errors,
        savedFiles 
      }, { status: 500 })
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
      files: savedFiles,
      filesGenerated: savedFiles.length,
    })
  } catch (error) {
    console.error("Error generating extension:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
