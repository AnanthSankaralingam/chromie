import { createClient } from "@/lib/supabase/server"
import { MODEL_SELECTION } from "@/lib/constants"
import { extensionJson, extensionOptions } from "@/lib/api/extension-api"
import { GeminiAdapter } from "@/lib/services/adapters/gemini-adapter"
import { getUserLimits } from "@/lib/limit-checker"
import { applyTokenUsageDelta } from "@/lib/token-usage-apply"

const MAX_OUTPUT_CAP = 8192
const DEFAULT_TEMPERATURE = 0.2
const DEFAULT_MAX_OUTPUT = 4096

export function OPTIONS(request) {
  return extensionOptions(request)
}

/**
 * @param {unknown} body
 * @returns {{ error: string } | { input: string, conversation_history: Array<{ role: string, content: string }>, temperature: number, max_output_tokens: number }}
 */
function parseLlmBody(body) {
  if (!body || typeof body !== "object") {
    return { error: "JSON body required" }
  }

  const temperature =
    typeof body.temperature === "number" && Number.isFinite(body.temperature)
      ? Math.min(2, Math.max(0, body.temperature))
      : DEFAULT_TEMPERATURE

  const maxRaw = body.max_output_tokens ?? body.max_tokens
  const max_output_tokens =
    typeof maxRaw === "number" && Number.isFinite(maxRaw)
      ? Math.min(MAX_OUTPUT_CAP, Math.max(1, Math.floor(maxRaw)))
      : Math.min(DEFAULT_MAX_OUTPUT, MAX_OUTPUT_CAP)

  if (Array.isArray(body.messages) && body.messages.length > 0) {
    const messages = body.messages
    const last = messages[messages.length - 1]
    if (
      !last ||
      last.role !== "user" ||
      typeof last.content !== "string"
    ) {
      return {
        error:
          "messages must end with a user message with string content",
      }
    }
    const conversation_history = []
    for (let i = 0; i < messages.length - 1; i++) {
      const m = messages[i]
      if (!m || typeof m.content !== "string") {
        return { error: "each message must have string content" }
      }
      if (m.role === "user") {
        conversation_history.push({ role: "user", content: m.content })
      } else if (m.role === "assistant") {
        conversation_history.push({
          role: "assistant",
          content: m.content,
        })
      } else {
        return { error: "message role must be user or assistant" }
      }
    }
    return {
      input: last.content,
      conversation_history,
      temperature,
      max_output_tokens,
    }
  }

  const prompt =
    typeof body.prompt === "string"
      ? body.prompt
      : typeof body.input === "string"
        ? body.input
        : ""
  if (!prompt.trim()) {
    return {
      error: "prompt, input, or non-empty messages array required",
    }
  }

  return {
    input: prompt,
    conversation_history: [],
    temperature,
    max_output_tokens,
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return extensionJson(request, { error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.GOOGLE_AI_API_KEY) {
      return extensionJson(
        request,
        { error: "LLM proxy requires GOOGLE_AI_API_KEY" },
        { status: 503 }
      )
    }

    const userLimits = await getUserLimits(user.id, supabase)
    if (
      userLimits.usage.extensionProxyTokens >=
      userLimits.limits.extensionProxyTokens
    ) {
      return extensionJson(
        request,
        {
          error: "Extension LLM token limit reached",
          extension_proxy_tokens: userLimits.usage.extensionProxyTokens,
          limit: userLimits.limits.extensionProxyTokens,
        },
        { status: 429 }
      )
    }

    const body = await request.json().catch(() => null)
    const parsed = parseLlmBody(body)
    if ("error" in parsed && parsed.error) {
      return extensionJson(request, { error: parsed.error }, { status: 400 })
    }

    const adapter = new GeminiAdapter()
    const result = await adapter.createResponse({
      model: MODEL_SELECTION.EXTENSION_LLM_PROXY,
      input: parsed.input,
      conversation_history: parsed.conversation_history,
      temperature: parsed.temperature,
      max_output_tokens: parsed.max_output_tokens,
    })

    console.log("[extension/llm]", {
      userId: user.id,
      outputText: result.output_text,
      usage: result.usage,
    })

    const billTokens = Math.max(
      0,
      Math.floor(
        Number(result.usage?.total_tokens ?? result.usage?.total ?? 0) || 0
      )
    )
    if (billTokens > 0) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      let db = supabase
      if (supabaseUrl && serviceKey) {
        const { createClient: createServiceClient } = await import(
          "@supabase/supabase-js"
        )
        db = createServiceClient(supabaseUrl, serviceKey)
      }
      const applied = await applyTokenUsageDelta(db, user.id, {
        extensionProxyTokensThisRequest: billTokens,
        modelUsed: MODEL_SELECTION.EXTENSION_LLM_PROXY,
      })
      if (!applied.ok) {
        console.error("[extension/llm] Failed to persist proxy token usage:", applied.error)
      }
    }

    return extensionJson(request, {
      text: result.output_text,
      usage: result.usage,
    })
  } catch (err) {
    console.error("[extension/llm] Gemini error:", err?.message || err)
    return extensionJson(
      request,
      { error: "LLM request failed" },
      { status: 502 }
    )
  }
}
