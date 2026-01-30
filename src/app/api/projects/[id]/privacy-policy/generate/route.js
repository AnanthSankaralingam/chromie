import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { validateProjectId, checkPaidPlan } from "@/lib/validation"
import { llmService } from "@/lib/services/llm-service"
import { SUPPORTED_PROVIDERS, PLANNING_MODELS } from "@/lib/constants"
import { analyzeExtensionFiles, formatFileSummariesForPlanning } from "@/lib/codegen/file-analysis"
import { buildPrivacyPolicyPrompt } from "@/lib/prompts/followup/workflows/privacy-policy-creation"

// POST: Generate privacy policy using AI
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

  // Check if user has paid plan
  const { isPaid } = await checkPaidPlan(supabase, user.id)
  if (!isPaid) {
    return NextResponse.json({
      error: "Privacy policy generation is a paid feature. Please upgrade to access this feature."
    }, { status: 403 })
  }

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
      console.error("[privacy-policy-generate] Error fetching code files:", filesError)
      return NextResponse.json({ error: "Failed to fetch project files" }, { status: 500 })
    }

    // Convert to files object for analysis
    const filesMap = {}
    for (const file of codeFiles || []) {
      filesMap[file.file_path] = file.content
    }

    console.log(`[privacy-policy-generate] Analyzing ${Object.keys(filesMap).length} files for project ${projectId}`)

    // Analyze files to get extension summary
    const analysisResult = analyzeExtensionFiles(filesMap)
    const extensionSummary = formatFileSummariesForPlanning(analysisResult)

    console.log("[privacy-policy-generate] File analysis complete, generating privacy policy...")

    // Build the prompt with project details and code analysis
    const prompt = buildPrivacyPolicyPrompt(
      project.name,
      project.description,
      extensionSummary
    )

    // Call LLM to generate privacy policy
    const response = await llmService.createResponse({
      provider: SUPPORTED_PROVIDERS.ANTHROPIC,
      model: PLANNING_MODELS.DEFAULT,
      input: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_output_tokens: 2000,
      store: false,
    })

    const privacyPolicy = response?.output_text || response?.choices?.[0]?.message?.content || ""

    if (!privacyPolicy || privacyPolicy.trim().length === 0) {
      console.error("[privacy-policy-generate] Empty response from LLM")
      return NextResponse.json({ error: "Failed to generate privacy policy" }, { status: 500 })
    }

    console.log("[privacy-policy-generate] Privacy policy generated successfully")

    return NextResponse.json({
      success: true,
      privacy_policy: privacyPolicy.trim()
    })

  } catch (error) {
    console.error("[privacy-policy-generate] Error generating privacy policy:", error)
    return NextResponse.json({
      error: "Failed to generate privacy policy",
      details: error.message
    }, { status: 500 })
  }
}
