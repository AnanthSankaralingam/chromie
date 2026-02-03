import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { validateProjectId } from "@/lib/validation"
import { llmService } from "@/lib/services/llm-service"
import { SUPPORTED_PROVIDERS, PLANNING_MODELS } from "@/lib/constants"
import { analyzeExtensionFiles, formatFileSummariesForPlanning } from "@/lib/codegen/file-analysis"
import { analyzeManifest } from "@/lib/codegen/file-analysis/analyzers/manifest-analyzer"
import { buildPermissionJustificationPrompt } from "@/lib/prompts/followup/workflows/permission-justification"
import chromeApiDocs from "@/lib/data/chrome_extension_apis.json"

// POST: Generate permission justifications using AI
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
      console.error("[permissions-justify] Error fetching code files:", filesError)
      return NextResponse.json({ error: "Failed to fetch project files" }, { status: 500 })
    }

    // Convert to files object for analysis
    const filesMap = {}
    for (const file of codeFiles || []) {
      filesMap[file.file_path] = file.content
    }

    console.log(
      `[permissions-justify] Analyzing ${Object.keys(filesMap).length} files for project ${projectId}`
    )

    // Find and parse manifest.json
    const manifestFile = codeFiles.find((f) => f.file_path === "manifest.json")
    if (!manifestFile) {
      return NextResponse.json({ error: "manifest.json not found" }, { status: 404 })
    }

    const manifestAnalysis = analyzeManifest(manifestFile.content, "manifest.json")

    if (manifestAnalysis.parseError) {
      return NextResponse.json({ error: "Invalid manifest.json" }, { status: 400 })
    }

    // Extract all permissions (both permissions and host_permissions)
    const allPermissions = [
      ...(manifestAnalysis.permissions || []),
      ...(manifestAnalysis.hostPermissions || []),
    ]

    if (allPermissions.length === 0) {
      return NextResponse.json({
        success: true,
        justifications: [],
        message: "No permissions found in manifest",
      })
    }

    console.log(`[permissions-justify] Found ${allPermissions.length} permissions:`, allPermissions)

    // Analyze files to get extension summary
    const analysisResult = analyzeExtensionFiles(filesMap)
    const extensionSummary = formatFileSummariesForPlanning(analysisResult)

    // Filter Chrome API docs for relevant permissions
    const relevantApiDocs = filterRelevantApiDocs(allPermissions, chromeApiDocs)

    console.log("[permissions-justify] Generating justifications...")

    // Build the prompt with permissions and code analysis
    const prompt = buildPermissionJustificationPrompt(
      allPermissions,
      relevantApiDocs,
      extensionSummary
    )

    // Call LLM to generate justifications
    const response = await llmService.createResponse({
      provider: SUPPORTED_PROVIDERS.ANTHROPIC,
      model: PLANNING_MODELS.DEFAULT,
      input: [{ role: "user", content: prompt }],
      temperature: 0.1, // Low temperature for accuracy
      max_output_tokens: 1500,
      store: false,
    })

    let justificationsText = response?.output_text || response?.choices?.[0]?.message?.content || ""

    if (!justificationsText || justificationsText.trim().length === 0) {
      console.error("[permissions-justify] Empty response from LLM")
      return NextResponse.json({ error: "Failed to generate justifications" }, { status: 500 })
    }

    // Parse JSON response
    let justifications = []
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = justificationsText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/)
      if (jsonMatch) {
        justificationsText = jsonMatch[1]
      }

      justifications = JSON.parse(justificationsText.trim())

      if (!Array.isArray(justifications)) {
        throw new Error("Response is not an array")
      }
    } catch (parseError) {
      console.error("[permissions-justify] Failed to parse LLM response as JSON:", parseError)
      console.error("[permissions-justify] Raw response:", justificationsText)

      // Fallback: create basic justifications
      justifications = allPermissions.map((perm) => ({
        permission: perm,
        justification: `Required for ${perm} functionality in the extension.`,
      }))
    }

    console.log("[permissions-justify] Justifications generated successfully")

    return NextResponse.json({
      success: true,
      justifications,
    })
  } catch (error) {
    console.error("[permissions-justify] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate justifications" },
      { status: 500 }
    )
  }
}

/**
 * Filter Chrome API docs to only include relevant permissions
 */
function filterRelevantApiDocs(permissions, apiDocs) {
  if (!apiDocs || !Array.isArray(apiDocs)) {
    return []
  }

  const permissionSet = new Set(permissions.map((p) => p.toLowerCase()))
  const filtered = []

  for (const api of apiDocs) {
    // Check if any permission matches this API namespace
    const apiName = api.namespace?.toLowerCase() || ""
    const apiPerms = api.permissions?.map((p) => p.toLowerCase()) || []

    const isRelevant =
      permissionSet.has(apiName) || apiPerms.some((p) => permissionSet.has(p))

    if (isRelevant) {
      filtered.push({
        namespace: api.namespace,
        description: api.description,
        permissions: api.permissions,
      })
    }
  }

  return filtered
}
