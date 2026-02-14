import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateChromeExtensionStream } from "@/lib/codegen/generate-extension-stream"
import { REQUEST_TYPES } from "@/lib/prompts/request-types"
import { checkLimit, formatLimitError } from "@/lib/limit-checker"
import { CREDIT_COSTS, INPUT_LIMITS } from "@/lib/constants"
import { llmService } from "@/lib/services/llm-service"
import { randomUUID } from "crypto"

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

/**
 * Upsert credit and token usage for the authenticated user
 */
async function upsertCreditUsage({ supabaseUserId, creditsThisRequest, tokensThisRequest, modelUsed, supabase }) {
  try {
    if (!Number.isFinite(creditsThisRequest) || creditsThisRequest < 0) return
    if (!Number.isFinite(tokensThisRequest) || tokensThisRequest < 0) tokensThisRequest = 0

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let db = supabase
    if (supabaseUrl && serviceKey) {
      const { createClient: createServiceClient } = await import('@supabase/supabase-js')
      db = createServiceClient(supabaseUrl, serviceKey)
    }

    // Fetch existing usage row
    const { data: existingUsage } = await db
      .from('token_usage')
      .select('id, total_credits, total_tokens, monthly_reset, browser_minutes')
      .eq('user_id', supabaseUserId)
      .maybeSingle()

    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    let newMonthlyResetISO = existingUsage?.monthly_reset || firstDayOfMonth.toISOString()

    // Determine if reset is due
    let isResetDue = false
    if (existingUsage?.monthly_reset) {
      const d = new Date(existingUsage.monthly_reset)
      const plusOne = new Date(d)
      plusOne.setMonth(plusOne.getMonth() + 1)
      isResetDue = now >= plusOne
    }

    let newTotalCredits
    let newTotalTokens
    if (!existingUsage || isResetDue) {
      newTotalCredits = creditsThisRequest
      newTotalTokens = tokensThisRequest
      newMonthlyResetISO = firstDayOfMonth.toISOString()
    } else {
      newTotalCredits = (existingUsage.total_credits || 0) + creditsThisRequest
      newTotalTokens = (existingUsage.total_tokens || 0) + tokensThisRequest
    }

    if (existingUsage?.id) {
      const { error: updateError } = await db
        .from('token_usage')
        .update({
          total_credits: newTotalCredits,
          total_tokens: newTotalTokens,
          monthly_reset: newMonthlyResetISO,
          model: typeof modelUsed === 'string' ? modelUsed : 'unknown',
        })
        .eq('id', existingUsage.id)
        .eq('user_id', supabaseUserId)
      if (updateError) console.error('[api/generate/stream] usage update failed:', updateError)
    } else {
      const newId = randomUUID()
      const { error: insertError } = await db
        .from('token_usage')
        .insert({
          id: newId,
          user_id: supabaseUserId,
          total_credits: newTotalCredits,
          total_tokens: newTotalTokens,
          monthly_reset: newMonthlyResetISO,
          model: typeof modelUsed === 'string' ? modelUsed : 'unknown',
        })
      if (insertError) console.error('[api/generate/stream] usage insert failed:', insertError)
    }
    console.log(`[api/generate/stream] ✅ usage upserted (+${creditsThisRequest} credits, +${tokensThisRequest} tokens)`)
  } catch (e) {
    console.error('[api/generate/stream] usage upsert error:', e)
  }
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
    const { prompt, projectId, requestType = REQUEST_TYPES.NEW_EXTENSION, userProvidedUrl, userProvidedApis, skipScraping, conversationTokenTotal, modelOverride, contextWindowMaxTokens, initialRequirementsAnalysis, initialPlanningTokenUsage, images, taggedFiles, userSelectedFrontendType } = await request.json()

    console.log('[api/generate/stream] received', {
      conversationTokenTotal_in: conversationTokenTotal ?? null,
      modelOverride: modelOverride || null,
      contextWindowMaxTokens: contextWindowMaxTokens || null,
      has_initialRequirementsAnalysis: Boolean(initialRequirementsAnalysis),
      has_initialPlanningTokenUsage: Boolean(initialPlanningTokenUsage),
      hasImages: Boolean(images && images.length > 0),
      hasTaggedFiles: Boolean(taggedFiles && taggedFiles.length > 0)
    })

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    if (typeof prompt === 'string' && prompt.length > INPUT_LIMITS.PROMPT) {
      return NextResponse.json(
        { error: `Prompt must be ${INPUT_LIMITS.PROMPT.toLocaleString()} characters or less` },
        { status: 400 }
      )
    }

    if (userProvidedUrl && typeof userProvidedUrl === 'string' && userProvidedUrl.length > INPUT_LIMITS.URL) {
      return NextResponse.json(
        { error: `URL must be ${INPUT_LIMITS.URL.toLocaleString()} characters or less` },
        { status: 400 }
      )
    }

    if (userProvidedApis && Array.isArray(userProvidedApis)) {
      if (userProvidedApis.length > INPUT_LIMITS.MAX_TOTAL_APIS) {
        return NextResponse.json(
          { error: `Maximum of ${INPUT_LIMITS.MAX_TOTAL_APIS} APIs allowed` },
          { status: 400 }
        )
      }
      for (const api of userProvidedApis) {
        if (!api?.name || !api.name.trim()) {
          return NextResponse.json(
            { error: "API name is required" },
            { status: 400 }
          )
        }
        if (api.name.length > INPUT_LIMITS.API_NAME) {
          return NextResponse.json(
            { error: `API name must be ${INPUT_LIMITS.API_NAME} characters or less` },
            { status: 400 }
          )
        }
        if (api?.endpoint && api.endpoint.length > INPUT_LIMITS.URL) {
          return NextResponse.json(
            { error: `API endpoint must be ${INPUT_LIMITS.URL.toLocaleString()} characters or less` },
            { status: 400 }
          )
        }
      }
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


    // Calculate credits based on request type
    const creditsForRequest = requestType === REQUEST_TYPES.NEW_EXTENSION 
      ? CREDIT_COSTS.INITIAL_GENERATION 
      : CREDIT_COSTS.FOLLOW_UP_GENERATION
    
    // Check credit limit using new limit checker
    const limitCheck = await checkLimit(user.id, 'credits', creditsForRequest, supabase)
    
    if (!limitCheck.allowed) {
      console.log(`[api/generate/stream] ❌ Credit limit exceeded: ${limitCheck.currentUsage}/${limitCheck.limit} on ${limitCheck.plan} plan`)
      return NextResponse.json(
        formatLimitError(limitCheck, 'credits'),
        { status: 403 }
      )
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

      // Also fetch project assets (custom icons, etc.) to inform the AI
      const { data: assets } = await supabase
        .from("project_assets")
        .select("file_path, file_type, mime_type, file_size")
        .eq("project_id", projectId)

      if (assets && assets.length > 0) {
        // Add asset metadata as special entries (not full content, just metadata)
        assets.forEach(asset => {
          existingFiles[asset.file_path] = `[Custom ${asset.file_type}: ${asset.mime_type}, ${Math.round(asset.file_size / 1024)}KB - Available for use]`
        })
        console.log(`🎨 Found ${assets.length} custom assets: ${assets.map(a => a.file_path).join(', ')}`)
      }
    } else if (requestType === REQUEST_TYPES.NEW_EXTENSION) {
      console.log("🆕 New extension request - no existing files needed")
    }

    // Get default provider for error handling
    const defaultProvider = getDefaultProvider()
    console.log(`🤖 Using default provider: ${defaultProvider}`)

    // Create a readable stream
    const encoder = new TextEncoder()
    let accumulatedTokens = 0
    let modelUsed = modelOverride || 'unknown'
    let requiresUrl = false
    let createdVersionId = null

    // Auto-create version snapshot before processing user message
    // Skip if resuming from a previous request (to avoid duplicate messages)
    const isResumingRequest = Boolean(initialRequirementsAnalysis && initialPlanningTokenUsage)

    if (projectId && !isResumingRequest) {
      try {
        console.log(`📸 Creating auto-version snapshot for project ${projectId}`)
        const { data: versionId, error: versionError } = await supabase
          .rpc("create_project_version", {
            p_project_id: projectId,
            p_version_name: `Before: ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}`,
            p_description: `Auto-snapshot before user message: "${prompt}"`,
          })

        if (versionError) {
          console.error("⚠️ Failed to create auto-version snapshot:", versionError)
        } else {
          createdVersionId = versionId
          console.log(`✅ Created auto-version snapshot: ${versionId}`)

          // Immediately store user message with version ID and images if present
          const { llmService } = await import('@/lib/services/llm-service')
          const userMessage = {
            role: 'user',
            content: prompt,
            versionId: versionId
          }

          // Include images if provided
          if (images && images.length > 0) {
            userMessage.images = images
            console.log(`📷 Including ${images.length} images in stored message`)
          }

          await llmService.chatMessages.addMessage(projectId, userMessage)
          console.log(`💾 Stored user message with version ID: ${versionId}`)
        }
      } catch (versionErr) {
        console.error("⚠️ Error creating auto-version snapshot:", versionErr)
      }
    } else if (isResumingRequest) {
      console.log(`♻️ Skipping version snapshot and message storage - resuming from previous request`)
    }
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send version ID first if available
          if (createdVersionId) {
            const versionData = JSON.stringify({ type: "version_created", versionId: createdVersionId })
            controller.enqueue(encoder.encode(`data: ${versionData}\n\n`))
          }
          
          // Send initial response
          const initialData = JSON.stringify({ type: "start", content: "Starting generation..." })
          controller.enqueue(encoder.encode(`data: ${initialData}\n\n`))

          // Use the streaming generation
          for await (const chunk of generateChromeExtensionStream({
            featureRequest: prompt,
            requestType,
            sessionId: projectId,
            existingFiles,
            userProvidedUrl: skipScraping ? null : (userProvidedUrl || null),
            userProvidedApis: userProvidedApis || null,
            skipScraping: !!skipScraping,
            conversationTokenTotal,
            modelOverride,
            contextWindowMaxTokens,
            initialRequirementsAnalysis: initialRequirementsAnalysis || null,
            initialPlanningTokenUsage: initialPlanningTokenUsage || null,
            images: images || null,
            taggedFiles: taggedFiles || null,
            supabase: supabase, // Pass authenticated supabase client
            userSelectedFrontendType: userSelectedFrontendType || null
          })) {
            const data = JSON.stringify(chunk)
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            
            // Track token usage from chunks
            if (chunk.type === "token_usage") {
              // Handle both formats: { total } and { usage: { total_tokens } }
              if (typeof chunk.total === 'number' && chunk.total > 0) {
                accumulatedTokens = chunk.total
              } else if (chunk.usage) {
                const total = chunk.usage.total_tokens || chunk.usage.total || 0
                if (total > 0) accumulatedTokens = total
                if (chunk.usage.model) modelUsed = chunk.usage.model
              }
            } else if (chunk.type === "usage_summary") {
              const thinking = chunk.thinking_tokens || 0
              const completion = chunk.completion_tokens || 0
              const total = thinking + completion
              if (total > 0) accumulatedTokens = total
            }
            
            // Check if URL is required or frontend type selection is needed
            if (chunk.type === "requires_url" || chunk.type === "requires_frontend_type") {
              console.log(`[api/generate/stream] 📋 Detected ${chunk.type} chunk - will halt after this`)
              requiresUrl = true
            }
          }

          console.log('[api/generate/stream] Stream completed. requiresUrl:', requiresUrl, 'credits:', creditsForRequest, 'tokens:', accumulatedTokens)
          
          // Only send completion signal and upsert credits/tokens if URL is not required
          if (!requiresUrl) {
            console.log('[api/generate/stream] Sending done signal')
            const completionData = JSON.stringify({ type: "done", content: "Generation complete" })
            controller.enqueue(encoder.encode(`data: ${completionData}\n\n`))
            
            // Upsert credit and token usage server-side after successful generation
            await upsertCreditUsage({
              supabaseUserId: user.id,
              creditsThisRequest: creditsForRequest,
              tokensThisRequest: accumulatedTokens,
              modelUsed,
              supabase,
            })
            
          } else {
            console.log('[api/generate/stream] Skipping done signal and usage upsert - URL required')
          }
          controller.close()
        } catch (error) {
          console.error("Error in streaming generation:", error)
          if (isContextLimitError(error, defaultProvider)) {
            // Clear conversation history to resolve context limit
            if (projectId) {
              await llmService.clearConversationHistory(projectId)
              console.log("[api/generate/stream] Cleared conversation history due to context limit")
            }
            const nextConversationTokenTotal = (conversationTokenTotal || 0)
            const cw = JSON.stringify({ type: 'context_window', content: 'Context limit reached. Conversation history has been cleared.', total: nextConversationTokenTotal })
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
