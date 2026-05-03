import { createClient } from "@/lib/supabase/server"
import {
  MODEL_SELECTION,
  USER_SCRIPT_DOM_PLANNING,
} from "@/lib/constants"
import {
  extensionJson,
  extensionOptions,
} from "@/lib/api/extension-api"
import { buildDomPlanningPrompt } from "@/lib/prompts/userscript/dom-planning-prompt"
import { formatDomSkeletonBlock } from "@/lib/prompts/userscript/system-prompt"
import { llmService } from "@/lib/services/llm-service"

export function OPTIONS(request) {
  return extensionOptions(request)
}

const MAX_DOM_SKELETON_CHARS = 120_000
const MAX_USER_REQUEST_CHARS = 16_000

/** Max chars logged for `[extension/codegen/dom] raw output` (avoid huge terminal spam). */
const MAX_RAW_STREAM_LOG_CHARS = 100_000

function normalizeDom(dom) {
  if (!dom || typeof dom !== "object") return undefined
  let skeleton =
    typeof dom.skeleton === "string" ? dom.skeleton : ""
  if (skeleton.length > MAX_DOM_SKELETON_CHARS) {
    skeleton =
      skeleton.slice(0, MAX_DOM_SKELETON_CHARS) +
      "\n... [truncated by server]"
  }
  return {
    url: typeof dom.url === "string" ? dom.url.slice(0, 8192) : "",
    title: typeof dom.title === "string" ? dom.title.slice(0, 8192) : "",
    skeleton,
  }
}

function geminiConfigured() {
  return Boolean(process.env.GOOGLE_AI_API_KEY)
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return extensionJson(request, { error: "Unauthorized" }, { status: 401 })
    }

    if (!geminiConfigured()) {
      return extensionJson(
        request,
        { error: "DOM planning requires GOOGLE_AI_API_KEY" },
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

    const dom = normalizeDom(body.dom)
    const domOutline = dom ? formatDomSkeletonBlock(dom) : "NOT_PROVIDED"

    const input = buildDomPlanningPrompt({ domOutline, userRequest })
    const model =
      process.env.CHROMIE_EXTENSION_DOM_PLANNING_MODEL ||
      MODEL_SELECTION.EXTENSION_USERSCRIPT_DOM_PLANNING

    let llmResponse
    try {
      llmResponse = await llmService.createResponse({
        provider: "gemini",
        model,
        input,
        temperature: USER_SCRIPT_DOM_PLANNING.TEMPERATURE,
        max_output_tokens: USER_SCRIPT_DOM_PLANNING.MAX_OUTPUT_TOKENS,
        store: false,
      })
    } catch (err) {
      console.error("[extension/codegen/dom] llmService error:", err)
      return extensionJson(
        request,
        {
          error:
            err?.message ||
            "DOM planning failed",
        },
        { status: 502 }
      )
    }

    const planning =
      llmResponse?.output_text ||
      llmResponse?.choices?.[0]?.message?.content ||
      ""

    const planningForLog =
      planning.length > MAX_RAW_STREAM_LOG_CHARS
        ? `${planning.slice(0, MAX_RAW_STREAM_LOG_CHARS)}\n... [truncated for log, ${planning.length} chars total]`
        : planning
    console.log("[extension/codegen/dom] raw output:\n", planningForLog)

    return extensionJson(request, {
      planning,
      model,
    })
  } catch (error) {
    console.error("Error in extension codegen DOM route:", error)
    return extensionJson(
      request,
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
