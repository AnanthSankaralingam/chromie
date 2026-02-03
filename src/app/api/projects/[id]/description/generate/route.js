import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { validateProjectId } from "@/lib/validation"
import { llmService } from "@/lib/services/llm-service"
import { SUPPORTED_PROVIDERS, PLANNING_MODELS } from "@/lib/constants"
import { analyzeExtensionFiles, formatFileSummariesForPlanning } from "@/lib/codegen/file-analysis"
import { buildDescriptionPrompt } from "@/lib/prompts/description-generation"

// POST: Generate Chrome Web Store description using AI
export async function POST(request, { params }) {
  const supabase = createClient()
  const { id: projectId } = params

  const projectValidation = validateProjectId(projectId)
  if (!projectValidation.isValid) {
    return NextResponse.json({ error: projectValidation.error }, { status: 400 })
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // NO paid plan check - deployment assistance is FREE for all users

  try {
    // Verify project ownership and get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, description")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Get all code files for this project
    const { data: codeFiles, error: filesError } = await supabase
      .from("code_files")
      .select("file_path, content")
      .eq("project_id", projectId)

    if (filesError) {
      console.error("[description-generate] Error fetching code files:", filesError)
      return NextResponse.json({ error: "Failed to fetch project files" }, { status: 500 })
    }

    // Convert to files object for analysis
    const filesMap = {}
    for (const file of codeFiles || []) {
      filesMap[file.file_path] = file.content
    }

    console.log(
      `[description-generate] Analyzing ${Object.keys(filesMap).length} files for project ${projectId}`
    )

    // Analyze files to get extension summary
    const analysisResult = analyzeExtensionFiles(filesMap)
    const extensionSummary = formatFileSummariesForPlanning(analysisResult)

    console.log("[description-generate] File analysis complete, generating description...")

    // Build the prompt with project details and code analysis
    const prompt = buildDescriptionPrompt(project.name, project.description, extensionSummary)

    // Call LLM to generate description
    const response = await llmService.createResponse({
      provider: SUPPORTED_PROVIDERS.ANTHROPIC,
      model: PLANNING_MODELS.DEFAULT,
      input: [{ role: "user", content: prompt }],
      temperature: 0.2, // Slightly higher for creativity
      max_output_tokens: 500,
      store: false,
    })

    const description = response?.output_text || response?.choices?.[0]?.message?.content || ""

    if (!description || description.trim().length === 0) {
      console.error("[description-generate] Empty response from LLM")
      return NextResponse.json({ error: "Failed to generate description" }, { status: 500 })
    }

    // Trim and clean the description
    const cleanedDescription = description.trim().replace(/^["']|["']$/g, "")

    console.log("[description-generate] Description generated successfully")

    return NextResponse.json({
      success: true,
      description: cleanedDescription,
    })
  } catch (error) {
    console.error("[description-generate] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate description" },
      { status: 500 }
    )
  }
}
