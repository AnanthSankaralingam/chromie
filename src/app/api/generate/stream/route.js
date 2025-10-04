import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateChromeExtensionStream } from "@/lib/codegen/generate-extension-stream"
import { REQUEST_TYPES } from "@/lib/prompts/request-types"
import { PLAN_LIMITS, DEFAULT_PLAN } from "@/lib/constants"
import { llmService } from "@/lib/services/llm-service"

/**
 * Get the default provider based on environment variables
 * Priority: GOOGLE_AI_API_KEY > OPENAI_API_KEY > ANTHROPIC_API_KEY
 * @returns {string} Provider name
 */
function getDefaultProvider() {
  if (process.env.GOOGLE_AI_API_KEY) return 'gemini'
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  return 'gemini' // fallback to gemini
}

/**
 * Check if an error is a context limit error using the unified service
 * @param {Error} error - Error to check
 * @param {string} provider - Provider name
 * @returns {boolean} Whether it's a context limit error
 */
function isContextLimitError(error, provider) {
  const adapter = llmService.providerRegistry.getAdapter(provider)
  return adapter && adapter.isContextLimitError && adapter.isContextLimitError(error)
}

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
    const { prompt, projectId, requestType = REQUEST_TYPES.NEW_EXTENSION, userProvidedUrl, skipScraping, previousResponseId, conversationTokenTotal, modelOverride, contextWindowMaxTokens } = await request.json()

    console.log('[api/generate/stream] received', {
      has_previousResponseId: Boolean(previousResponseId),
      conversationTokenTotal_in: conversationTokenTotal ?? null,
      modelOverride: modelOverride || null,
      contextWindowMaxTokens: contextWindowMaxTokens || null
    })

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


    // Check user's plan and token usage limits (aggregated, monthly window)
    const { data: billing } = await supabase
      .from('billing')
      .select('plan')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const userPlan = billing?.plan || DEFAULT_PLAN
    const planLimit = PLAN_LIMITS[userPlan] || PLAN_LIMITS[DEFAULT_PLAN]

    // Fetch all token usage rows and aggregate within monthly window
    const { data: usageRows } = await supabase
      .from('token_usage')
      .select('id, total_tokens, monthly_reset, model')
      .eq('user_id', user.id)

    const now = new Date()
    let effectiveTokensUsed = 0
    let debugRows = []
    if (Array.isArray(usageRows) && usageRows.length > 0) {
      for (const row of usageRows) {
        let monthlyResetIso = row?.monthly_reset
        if (!monthlyResetIso) {
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          monthlyResetIso = firstDayOfMonth.toISOString()
        }
        const monthlyResetDate = new Date(monthlyResetIso)
        const resetDatePlusOneMonth = new Date(monthlyResetDate)
        resetDatePlusOneMonth.setMonth(resetDatePlusOneMonth.getMonth() + 1)
        const isResetDue = now >= resetDatePlusOneMonth
        const counted = isResetDue ? 0 : (row?.total_tokens || 0)
        effectiveTokensUsed += counted
        debugRows.push({ id: row.id, model: row.model || null, monthly_reset: monthlyResetIso, isResetDue, total_tokens: row.total_tokens || 0, counted })
      }
    }
    console.log(`[api/generate/stream] token usage rows considered:`, debugRows)
    console.log(`User plan: ${userPlan}, Limit: ${planLimit.monthly_tokens}, Used (effective aggregate): ${effectiveTokensUsed}`)

    if (planLimit.monthly_tokens !== -1 && effectiveTokensUsed >= planLimit.monthly_tokens) {
      console.log(`❌ Token limit exceeded: ${effectiveTokensUsed}/${planLimit.monthly_tokens}`)
      return NextResponse.json({
        error: "Token usage limit exceeded for your plan. Please upgrade to continue generating extensions."
      }, { status: 403 })
    }

    // Get existing files for add-to-existing requests
    let existingFiles = {}
    if (requestType === REQUEST_TYPES.ADD_TO_EXISTING && projectId) {
      console.log("🔧 Add-to-existing request - fetching existing project files...")
      const { data: files } = await supabase.from("code_files").select("file_path, content").eq("project_id", projectId)

      if (files) {
        existingFiles = files.reduce((acc, file) => {
          acc[file.file_path] = file.content
          return acc
        }, {})
        console.log(`📁 Found ${Object.keys(existingFiles).length} existing files: ${Object.keys(existingFiles).join(', ')}`)
      } else {
        console.log("⚠️ No existing files found for add-to-existing request")
      }
    } else if (requestType === REQUEST_TYPES.NEW_EXTENSION) {
      console.log("🆕 New extension request - no existing files needed")
    }

    // Get default provider for error handling
    const defaultProvider = getDefaultProvider()
    console.log(`🤖 Using default provider: ${defaultProvider}`)

    // Create a readable stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial response
          const initialData = JSON.stringify({ type: "start", content: "Starting generation..." })
          controller.enqueue(encoder.encode(`data: ${initialData}\n\n`))

          // Use the streaming generation
          let requiresUrl = false
          for await (const chunk of generateChromeExtensionStream({
            featureRequest: prompt,
            requestType,
            sessionId: projectId,
            existingFiles,
            userProvidedUrl: skipScraping ? null : (userProvidedUrl || null),
            skipScraping: !!skipScraping,
            previousResponseId,
            conversationTokenTotal,
            modelOverride,
            contextWindowMaxTokens
          })) {
            const data = JSON.stringify(chunk)
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            
            // Check if URL is required
            if (chunk.type === "requires_url") {
              requiresUrl = true
            }
          }

          // Only send completion signal if URL is not required
          if (!requiresUrl) {
            const completionData = JSON.stringify({ type: "done", content: "Generation complete" })
            controller.enqueue(encoder.encode(`data: ${completionData}\n\n`))
          }
          controller.close()
        } catch (error) {
          console.error("Error in streaming generation:", error)
          if (isContextLimitError(error, defaultProvider)) {
            const estimatedTokensThisRequest = Math.ceil((prompt || '').length / 4)
            const nextConversationTokenTotal = (conversationTokenTotal || 0) + estimatedTokensThisRequest
            const cw = JSON.stringify({ type: 'context_window', content: 'Context limit reached. Please start a new conversation.', total: nextConversationTokenTotal })
            controller.enqueue(encoder.encode(`data: ${cw}\n\n`))
            controller.close()
            return
          }
          const errorData = JSON.stringify({ type: "error", content: error.message })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })

  } catch (error) {
    console.error("Error in streaming generate route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
