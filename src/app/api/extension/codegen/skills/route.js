// call skills route first to prevent vercel timeouts on DOM planning/codegen
import { createClient, getAuthUser } from "@/lib/supabase/server"
import { CREDIT_COSTS, MODEL_SELECTION, USER_SCRIPT_SKILL_SELECTION } from "@/lib/constants"
import { extensionJson, extensionOptions } from "@/lib/api/extension-api"
import { checkLimit, formatLimitError } from "@/lib/limit-checker"
import { normalizeExtensionUserscriptSkillIds } from "@/lib/prompts/userscript/skills/catalog"
import { buildUserscriptSkillSelectionPrompt } from "@/lib/prompts/userscript/skills/selection-prompt"
import { llmService } from "@/lib/services/llm-service"
import { applyTokenUsageDelta } from "@/lib/token-usage-apply"

export function OPTIONS(request) {
  return extensionOptions(request)
}

const MAX_USER_REQUEST_CHARS = 16_000
const MAX_RAW_STREAM_LOG_CHARS = 100_000

function geminiConfigured() {
  return Boolean(process.env.GOOGLE_AI_API_KEY)
}

function parseSkillIdsFromSelection(rawText) {
  if (typeof rawText !== "string" || !rawText.trim()) return []
  const txt = rawText.trim()
  const candidates = [txt]
  const jsonBlock = txt.match(/```json\s*([\s\S]*?)```/i)
  if (jsonBlock?.[1]) {
    candidates.push(jsonBlock[1].trim())
  }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      if (Array.isArray(parsed?.skillIds)) {
        return normalizeExtensionUserscriptSkillIds(parsed.skillIds)
      }
    } catch {
      // ignore parse failures and continue
    }
  }
  return []
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await getAuthUser(supabase)

    if (authError || !user) {
      return extensionJson(request, { error: "Unauthorized" }, { status: 401 })
    }

    if (!geminiConfigured()) {
      return extensionJson(
        request,
        { error: "Skills selection requires GOOGLE_AI_API_KEY" },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const rawRequest =
      typeof body.userRequest === "string" ? body.userRequest.trim() : ""
    if (!rawRequest) {
      return extensionJson(
        request,
        { error: "userRequest (non-empty string) is required" },
        { status: 400 }
      )
    }

    const userRequest = rawRequest.slice(0, MAX_USER_REQUEST_CHARS)
    const creditCheck = await checkLimit(
      user.id,
      "credits",
      CREDIT_COSTS.FOLLOW_UP_GENERATION,
      supabase
    )
    if (!creditCheck.allowed) {
      return extensionJson(
        request,
        formatLimitError(creditCheck, "credits"),
        { status: 429 }
      )
    }
    const input = buildUserscriptSkillSelectionPrompt({ userRequest })
    const model =
      process.env.CHROMIE_EXTENSION_SKILLS_MODEL ||
      MODEL_SELECTION.EXTENSION_USERSCRIPT_SKILLS

    let llmResponse
    try {
      llmResponse = await llmService.createResponse({
        provider: "gemini",
        model,
        input,
        temperature: USER_SCRIPT_SKILL_SELECTION.TEMPERATURE,
        max_output_tokens: USER_SCRIPT_SKILL_SELECTION.MAX_OUTPUT_TOKENS,
        store: false,
      })
    } catch (err) {
      console.error("[extension/codegen/skills] llmService error:", err)
      return extensionJson(
        request,
        {
          error: err?.message || "Skills selection failed",
        },
        { status: 502 }
      )
    }

    const rawText =
      llmResponse?.output_text || llmResponse?.choices?.[0]?.message?.content || ""
    const selectedSkillIds = parseSkillIdsFromSelection(rawText)
    const shouldScrapeDom = selectedSkillIds.includes("dom")

    const skillsRawForLog =
      rawText.length > MAX_RAW_STREAM_LOG_CHARS
        ? `${rawText.slice(0, MAX_RAW_STREAM_LOG_CHARS)}\n... [truncated for log, ${rawText.length} chars total]`
        : rawText
    console.log("[extension/codegen/skills] raw output:\n", skillsRawForLog)
    console.log("[extension/codegen/skills] parsed:", {
      model,
      selectedSkillIds,
      shouldScrapeDom,
    })
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let db = supabase
    if (supabaseUrl && serviceKey) {
      const { createClient: createServiceClient } = await import(
        "@supabase/supabase-js"
      )
      db = createServiceClient(supabaseUrl, serviceKey)
    }
    const billed = await applyTokenUsageDelta(db, user.id, {
      creditsThisRequest: CREDIT_COSTS.FOLLOW_UP_GENERATION,
    })
    if (!billed.ok) {
      console.error(
        "[extension/codegen/skills] Failed to persist credit usage:",
        billed.error
      )
    }

    return extensionJson(request, {
      selectedSkillIds,
      shouldScrapeDom,
      model,
    })
  } catch (error) {
    console.error("Error in extension codegen skills route:", error)
    return extensionJson(
      request,
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
