import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { llmService } from "@/lib/services/llm-service"
import { CREDIT_COSTS, PLANNING_MODELS, SUPPORTED_PROVIDERS } from "@/lib/constants"
import { checkLimit, formatLimitError } from "@/lib/limit-checker"
import { formatFilesAsXml } from "@/lib/codegen/patching-handlers/requirements-helpers"
import { ASK_MODE_PROMPT } from "@/lib/prompts/ask/ask-mode-prompt"
import { ASK_PLANNING_PROMPT } from "@/lib/prompts/ask/ask-planning"
import { analyzeExtensionFiles, formatFileSummariesForPlanning } from "@/lib/codegen/file-analysis"

/**
 * Calls the planning agent to determine which files are relevant to answer the question
 * @param {string} question - The user's question
 * @param {Object} existingFiles - Map of file paths to contents
 * @returns {Promise<Object>} - Planning result with files and success flag
 */
async function callAskPlanning(question, existingFiles) {
  console.log("[ask-mode] Starting ask planning...")

  // Analyze files for summaries
  const analysisResult = analyzeExtensionFiles(existingFiles)
  const fileSummaries = formatFileSummariesForPlanning(analysisResult)

  console.log("[ask-mode] File summaries generated")

  // Build planning prompt
  const prompt = ASK_PLANNING_PROMPT.replace("{USER_QUESTION}", question).replace(
    "{FILE_SUMMARIES}",
    fileSummaries
  )

  // Call LLM for planning
  console.log("[ask-mode] Calling ask planning agent...")
  const response = await llmService.createResponse({
    provider: SUPPORTED_PROVIDERS.ANTHROPIC,
    model: PLANNING_MODELS.DEFAULT,
    input: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_output_tokens: 1000,
    store: false,
  })

  const responseText =
    response?.output_text || response?.choices?.[0]?.message?.content || ""

  // Parse JSON response
  try {
    // Extract JSON from response (handle potential markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn("[ask-mode] No JSON found in planning response, using all files")
      return {
        success: false,
        justification: "Could not parse planning response",
        files: Object.keys(existingFiles),
      }
    }

    const planningResult = JSON.parse(jsonMatch[0])
    console.log("[ask-mode] Planning complete:", JSON.stringify(planningResult, null, 2))

    return {
      success: true,
      justification: planningResult.justification || "",
      files: planningResult.files || Object.keys(existingFiles),
    }
  } catch (error) {
    console.error("[ask-mode] Failed to parse planning response:", error)
    return {
      success: false,
      justification: "Planning response parsing failed",
      files: Object.keys(existingFiles),
    }
  }
}

/**
 * Filter existing files to only include relevant ones
 * @param {Object} existingFiles - All existing files
 * @param {Array<string>} relevantPaths - Paths to include
 * @returns {Object} - Filtered files
 */
function filterRelevantFiles(existingFiles, relevantPaths) {
  if (!relevantPaths || relevantPaths.length === 0) {
    return existingFiles
  }

  const filtered = {}
  for (const path of relevantPaths) {
    if (existingFiles[path]) {
      filtered[path] = existingFiles[path]
    }
  }

  // Always include manifest.json if it exists
  if (existingFiles["manifest.json"] && !filtered["manifest.json"]) {
    filtered["manifest.json"] = existingFiles["manifest.json"]
  }

  console.log(`[ask-mode] Filtered to ${Object.keys(filtered).length} relevant files`)
  return filtered
}

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
    const { question } = await request.json()

    if (!question || !question.trim()) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 })
    }

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

    // Treat ask as a lightweight follow-up for credit purposes
    const creditsForRequest = CREDIT_COSTS.FOLLOW_UP_GENERATION
    const limitCheck = await checkLimit(user.id, "credits", creditsForRequest, supabase)

    if (!limitCheck.allowed) {
      return NextResponse.json(formatLimitError(limitCheck, "credits"), { status: 403 })
    }

    // Load existing project files for context (read-only)
    let existingFiles = {}
    const { data: files } = await supabase
      .from("code_files")
      .select("file_path, content")
      .eq("project_id", projectId)

    if (files && files.length > 0) {
      existingFiles = files.reduce((acc, file) => {
        acc[file.file_path] = file.content
        return acc
      }, {})
    }

    const projectName = project.name || "Chrome Extension"

    // Run planning to determine relevant files
    const planningResult = await callAskPlanning(question, existingFiles)

    // Filter files based on planning result
    const relevantFiles = planningResult.success
      ? filterRelevantFiles(existingFiles, planningResult.files)
      : existingFiles

    // Build code context with relevant files only
    let codeContext = ""
    if (Object.keys(relevantFiles).length > 0) {
      codeContext = formatFilesAsXml(relevantFiles)
    } else {
      codeContext = "There is currently no code context loaded for this project."
    }

    // Build prompt using the new template
    const prompt = ASK_MODE_PROMPT.replace("{USER_QUESTION}", question)
      .replace("{PROJECT_NAME}", projectName)
      .replace("{EXISTING_FILES}", codeContext)

    // Log a concise summary of the prompt
    try {
      const fileCount = Object.keys(relevantFiles).length
      const preview = prompt.slice(0, 600)
      console.log("[ask-mode] Built ask prompt", {
        projectId,
        projectName,
        totalFiles: Object.keys(existingFiles).length,
        relevantFiles: fileCount,
        planningSuccess: planningResult.success,
        preview,
      })
    } catch (e) {
      console.error("[ask-mode] Error logging prompt preview:", e)
    }

    const response = await llmService.createResponse({
      // Use Claude Haiku (same default as planning) for ask-mode analysis
      provider: SUPPORTED_PROVIDERS.ANTHROPIC,
      model: PLANNING_MODELS.DEFAULT,
      input: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_output_tokens: 3000,
      // Ask mode is read-only and should NOT pollute the main project chat history.
      // We avoid passing session_id and disable internal storage so the big system
      // + code payload isn't saved as a user message.
      store: false,
    })

    const answer =
      response?.output_text ||
      response?.choices?.[0]?.message?.content ||
      "I wasn't able to generate an answer. Please try asking in a different way."

    return NextResponse.json({ answer })
  } catch (error) {
    console.error("[api/projects/[id]/ask] Error handling ask request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

