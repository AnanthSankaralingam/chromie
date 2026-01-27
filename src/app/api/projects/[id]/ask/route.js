import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { llmService } from "@/lib/services/llm-service"
import { CREDIT_COSTS, PLANNING_MODELS, SUPPORTED_PROVIDERS } from "@/lib/constants"
import { checkLimit, formatLimitError } from "@/lib/limit-checker"
import { formatFilesAsXml } from "@/lib/codegen/patching-handlers/requirements-helpers"

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

    // Build a compact, read-only code context
    let codeContext = ""
    if (Object.keys(existingFiles).length > 0) {
      codeContext = formatFilesAsXml(existingFiles)
    }

    const systemPrompt = [
      `You are an expert Chrome extension engineer helping the user understand and reason about an existing project called "${projectName}".`,
      "You are in **ASK MODE**.",
      "",
      "ASK MODE OBJECTIVE:",
      "Answer the user's question **only by reading and reasoning about the project's code files** provided in the context below.",
      "",
      "STRICT GROUNDING RULES:",
      "- The code files are your ONLY source of truth. You are not allowed to use outside knowledge or generic domain explanations.",
      "- Before answering, scan the code context and identify the most relevant files and functions.",
      "- In every answer, reference the specific files (and functions if obvious) you used, under a short `Sources:` section at the end.",
      "- If the answer cannot be supported by the provided code, explicitly say so and explain what is missing. Do NOT guess.",
      "- Prefer precise, implementation-aware explanations over generic advice.",
      "- When the user asks \"how does X work in this?\", interpret \"this\" as **this Chrome extension implementation** and walk through the relevant code paths (e.g., manifest, background scripts, content scripts, UI files).",
      "",
      "WHAT YOU MUST NOT DO:",
      "- Do NOT propose concrete code edits, refactors, or new features (no patches, no step-by-step edit instructions).",
      "- Do NOT describe multi-step editing plans or suggest specific line-level changes.",
      "- If the user asks for a change, explain how the current code works and what *conceptual* changes would be required, without giving editing instructions.",
      "",
      codeContext
        ? "PROJECT CODE CONTEXT (XML-FORMATTED CODE FILES):\n" + codeContext
        : "There is currently no code context loaded for this project. You must answer at a very high level and clearly state that you are not looking at the real code.",
    ]
      .filter(Boolean)
      .join("\n\n")

    // Log a concise summary of the prompt so we can verify that files are included
    try {
      const fileCount = Object.keys(existingFiles).length
      const preview = systemPrompt.slice(0, 600)
      console.log("[ask-mode] Built system prompt", {
        projectId,
        projectName,
        fileCount,
        preview,
      })
    } catch (e) {
      console.error("[ask-mode] Error logging system prompt preview:", e)
    }

    const response = await llmService.createResponse({
      // Use Claude Haiku (same default as planning) for ask-mode analysis
      provider: SUPPORTED_PROVIDERS.ANTHROPIC,
      model: PLANNING_MODELS.DEFAULT,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
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

