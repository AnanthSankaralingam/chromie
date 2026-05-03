import { createClient } from "@/lib/supabase/server"
import { MODEL_SELECTION, USER_SCRIPT_CODEGEN } from "@/lib/constants"
import {
  extensionCorsHeaders,
  extensionJson,
  extensionOptions,
} from "@/lib/api/extension-api"
import { buildSystemPrompt } from "@/lib/prompts/userscript/system-prompt"
import { formatExtensionUserscriptSkillContext, normalizeExtensionUserscriptSkillIds } from "@/lib/prompts/userscript/skills/catalog"
import { llmService } from "@/lib/services/llm-service"

export function OPTIONS(request) {
  return extensionOptions(request)
}

const MAX_MESSAGES = 48
const MAX_MESSAGE_CHARS = 120_000
const MAX_DOM_SKELETON_CHARS = 120_000
const MAX_DOM_PLANNING_CHARS = 120_000

function defaultModel() {
  return (
    process.env.CHROMIE_EXTENSION_CODEGEN_MODEL ||
    MODEL_SELECTION.EXTENSION_USERSCRIPT_CODEGEN
  )
}

function serverAiConfigured() {
  return Boolean(
    process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.IONROUTER_API_KEY
  )
}

/**
 * Forward only assistant-visible text; skip thinking / usage chunks from multi-provider streams.
 */
function extractCodegenDelta(chunk) {
  if (!chunk || typeof chunk !== "object") return ""
  if (chunk.type === "thinking_chunk" || chunk.type === "token_usage") {
    return ""
  }
  if (typeof chunk.content === "string" && chunk.content) return chunk.content
  if (typeof chunk.text === "string" && chunk.text) return chunk.text
  return ""
}

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

function normalizeDomPlanning(raw) {
  if (typeof raw !== "string" || !raw.trim()) return undefined
  let s = raw.trim()
  if (s.length > MAX_DOM_PLANNING_CHARS) {
    s =
      s.slice(0, MAX_DOM_PLANNING_CHARS) + "\n... [truncated by server]"
  }
  return s
}

function normalizeExtensionSkillIds(raw) {
  return normalizeExtensionUserscriptSkillIds(raw)
}

/** Max chars logged for `[extension/codegen] raw stream output` (avoid huge terminal spam). */
const MAX_RAW_STREAM_LOG_CHARS = 100_000

/** Max chars logged for `[extension/codegen] system prompt` (coding prompt). */
const MAX_SYSTEM_PROMPT_LOG_CHARS = 100_000

function normalizeMessages(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null
  if (raw.length > MAX_MESSAGES) return null
  const out = []
  for (const m of raw) {
    if (!m || typeof m !== "object") return null
    if (m.role !== "user" && m.role !== "assistant") return null
    const content =
      typeof m.content === "string"
        ? m.content.slice(0, MAX_MESSAGE_CHARS)
        : ""
    out.push({ role: m.role, content })
  }
  return out
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

    if (!serverAiConfigured()) {
      return extensionJson(
        request,
        { error: "Server AI is not configured" },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const messages = normalizeMessages(body.messages)
    if (!messages) {
      return extensionJson(
        request,
        {
          error: `messages must be a non-empty array (max ${MAX_MESSAGES}) of { role: user|assistant, content }`,
        },
        { status: 400 }
      )
    }

    const dom = normalizeDom(body.dom)
    const domPlanning = normalizeDomPlanning(body.domPlanning)
    const extensionSkillIds = normalizeExtensionSkillIds(body.extensionSkillIds)
    const systemPrompt = buildSystemPrompt({
      ...(domPlanning ? { domPlanning } : {}),
      ...(dom ? { dom } : {}),
      extensionSkillsContext: formatExtensionUserscriptSkillContext(
        extensionSkillIds
      ),
    })
    const systemPromptForLog =
      systemPrompt.length > MAX_SYSTEM_PROMPT_LOG_CHARS
        ? `${systemPrompt.slice(0, MAX_SYSTEM_PROMPT_LOG_CHARS)}\n... [truncated for log, ${systemPrompt.length} chars total]`
        : systemPrompt
    console.log("[extension/codegen] final coding system prompt:\n", systemPromptForLog)
    console.log("[extension/codegen] extensionSkillIds:", extensionSkillIds)
    const model = defaultModel()
    const provider = llmService.getProviderFromModel(model)

    const inputMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ]

    const cors = extensionCorsHeaders(request)

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        let rawStreamOutput = ""
        try {
          for await (const chunk of llmService.streamResponse({
            provider,
            model,
            input: inputMessages,
            temperature: USER_SCRIPT_CODEGEN.TEMPERATURE,
            max_output_tokens: USER_SCRIPT_CODEGEN.MAX_OUTPUT_TOKENS,
          })) {
            const delta = extractCodegenDelta(chunk)
            if (delta) {
              rawStreamOutput += delta
              controller.enqueue(encoder.encode(delta))
            }
          }
        } catch (err) {
          console.error("[extension/codegen] llmService stream error:", err)
          const msg =
            err?.status === 401
              ? "Upstream API rejected the request"
              : err?.message || "Upstream model error"
          controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`))
        } finally {
          const forLog =
            rawStreamOutput.length > MAX_RAW_STREAM_LOG_CHARS
              ? `${rawStreamOutput.slice(0, MAX_RAW_STREAM_LOG_CHARS)}\n... [truncated for log, ${rawStreamOutput.length} chars total]`
              : rawStreamOutput
          console.log("[extension/codegen] raw stream output:\n", forLog)
          controller.close()
        }
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        ...cors,
      },
    })
  } catch (error) {
    console.error("Error in extension codegen API:", error)
    return extensionJson(
      request,
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
