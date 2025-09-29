import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateChromeExtensionStream } from "@/lib/codegen/generate-extension-stream"
import { REQUEST_TYPES } from "@/lib/prompts/request-types"
import { PLAN_LIMITS, DEFAULT_PLAN } from "@/lib/constants"
import { isContextLimitError } from "@/lib/services/google-ai"

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


    // Check user's plan and token usage limits
    const { data: billing, error: billingError } = await supabase
      .from("billing")
      .select("plan")
      .eq("user_id", user.id)
      .single()

    if (billingError) {
      console.error("Error fetching billing info:", billingError)
    }

    const userPlan = billing?.plan || DEFAULT_PLAN
    const planLimits = PLAN_LIMITS[userPlan]

    // Check token usage
    const { data: tokenUsage, error: tokenError } = await supabase
      .from("token_usage")
      .select("total_tokens, monthly_reset")
      .eq("user_id", user.id)
      .single()

    if (tokenError && tokenError.code !== 'PGRST116') {
      console.error("Error fetching token usage:", tokenError)
    }

    const currentUsage = tokenUsage?.total_tokens || 0
    const monthlyReset = tokenUsage?.monthly_reset || new Date().toISOString().split('T')[0]

    // Check if monthly reset is needed
    const today = new Date().toISOString().split('T')[0]
    const shouldReset = monthlyReset !== today

    if (shouldReset) {
      console.log("🔄 Monthly token usage reset needed")
      
      // Reset token usage
      const { error: tokenResetError } = await supabase
        .from('token_usage')
        .update({
          total_tokens: 0,
          monthly_reset: today
        })
        .eq('user_id', user.id)

      if (tokenResetError) {
        console.error("Error resetting token usage:", tokenResetError)
        return NextResponse.json({ error: "Failed to reset token usage" }, { status: 500 })
      }

      // Update billing valid_until to next month (aligned with token reset)
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      
      const { error: billingUpdateError } = await supabase
        .from('billing')
        .update({
          valid_until: nextMonth.toISOString()
        })
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (billingUpdateError) {
        console.error("Error updating billing valid_until:", billingUpdateError)
        // Don't fail the request, just log the error
      }

      console.log("✅ Monthly reset completed successfully")
    }

    const effectiveUsage = shouldReset ? 0 : currentUsage

    if (effectiveUsage >= planLimits.monthly_tokens) {
      console.log(`❌ Token limit exceeded: ${effectiveUsage}/${planLimits.monthly_tokens}`)
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
          if (isContextLimitError(error)) {
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
