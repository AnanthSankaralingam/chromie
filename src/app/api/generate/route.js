import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateChromeExtension } from "@/lib/codegen/generate-extension"
import { REQUEST_TYPES } from "@/lib/prompts/request-types"
import { checkLimit, formatLimitError } from "@/lib/limit-checker"
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
    const { prompt, projectId, requestType = REQUEST_TYPES.NEW_EXTENSION, userProvidedUrl, userProvidedApis, skipScraping, previousResponseId, conversationTokenTotal, modelOverride, contextWindowMaxTokens } = await request.json()

    console.log('[api/generate] received', {
      has_previousResponseId: Boolean(previousResponseId),
      conversationTokenTotal_in: conversationTokenTotal ?? null,
      modelOverride: modelOverride || null,
      contextWindowMaxTokens: contextWindowMaxTokens || null
    })

    // Context window precheck for follow-ups
    if (previousResponseId && contextWindowMaxTokens) {
      const nextConversationTokenTotal = (conversationTokenTotal || 0) 
      if (nextConversationTokenTotal > contextWindowMaxTokens) {
        return NextResponse.json({
          errorType: 'context_window',
          message: 'Context limit reached. Please start a new conversation.',
          nextConversationTokenTotal
        })
      }
    }

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


    // Use a minimal estimate for limit checking - actual tokens will be tracked exactly
    const estimatedTokens = Math.ceil(prompt.length / 2) // Conservative estimate for limit checking only
    
    // Check token limit using new limit checker
    const limitCheck = await checkLimit(user.id, 'tokens', estimatedTokens, supabase)
    
    if (!limitCheck.allowed) {
      console.log(`[api/generate] ❌ Token limit exceeded: ${limitCheck.currentUsage}/${limitCheck.limit} on ${limitCheck.plan} plan`)
      return NextResponse.json(
        formatLimitError(limitCheck, 'tokens'),
        { status: 403 }
      )
    }

    // Get existing files if this is an add-to-existing request
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
    
    // Generate extension code using unified service
    console.log(`🚀 Calling generateExtension with request type: ${requestType}`)
    console.log(`📝 Feature request: ${prompt}`)
    console.log(`📁 Existing files count: ${Object.keys(existingFiles).length}`)
    console.log(`🔗 User provided URL: ${userProvidedUrl || 'none'}`)
    console.log(`⏭️ Skip scraping: ${skipScraping || false}`)
    console.log(`🤖 Default provider: ${defaultProvider}`)
    
    let result
    try {
      result = await generateChromeExtension({
      featureRequest: prompt,
      requestType,
      sessionId: projectId,
      existingFiles,
      userProvidedUrl: skipScraping ? null : (userProvidedUrl || null),
      userProvidedApis: userProvidedApis || null,
      skipScraping: !!skipScraping,
      previousResponseId,
      conversationTokenTotal,
      modelOverride,
      contextWindowMaxTokens
    })
    } catch (err) {
      if (isContextLimitError(err, defaultProvider)) {
        const estimatedTokensThisRequest = 0 // No estimation - use exact values from response
        const nextConversationTokenTotal = (conversationTokenTotal || 0) + estimatedTokensThisRequest
        console.log('[api/generate] context-window error caught', { message: err?.message, nextConversationTokenTotal })
        return NextResponse.json({
          errorType: 'context_window',
          message: 'Context limit reached. Please start a new conversation.',
          nextConversationTokenTotal
        })
      }
      throw err
    }

    // Handle URL prompt requirement
    if (!result.success && result.requiresUrl) {
      return NextResponse.json({
        requiresUrl: true,
        message: result.message,
        detectedSites: result.detectedSites,
        detectedUrls: result.detectedUrls,
        featureRequest: result.featureRequest,
        requestType: result.requestType
      })
    }

    if (!result.success) {
      return NextResponse.json({ error: "Failed to generate extension code" }, { status: 500 })
    }

    // Save generated files to database - handle each file individually
    const savedFiles = []
    const errors = []

    // Icons are no longer persisted per project; they'll be materialized at packaging time
    console.log('[api/generate] Skipping per-project icon persistence; will materialize at packaging')
    const allFiles = { ...result.files }

    for (const [filePath, content] of Object.entries(allFiles)) {
      try {
        // First, try to update existing file
        const { data: existingFile } = await supabase
          .from("code_files")
          .select("id")
          .eq("project_id", projectId)
          .eq("file_path", filePath)
          .single()

        if (existingFile) {
          // Update existing file
          const { error: updateError } = await supabase
            .from("code_files")
            .update({
              content: content,
              last_used_at: new Date().toISOString(),
            })
            .eq("id", existingFile.id)

          if (updateError) {
            console.error(`Error updating file ${filePath}:`, updateError)
            errors.push({ filePath, error: updateError })
          } else {
            savedFiles.push(filePath)
          }
        } else {
          // Insert new file
          const { error: insertError } = await supabase
            .from("code_files")
            .insert({
              id: randomUUID(),
              project_id: projectId,
              file_path: filePath,
              content: content
            })

          if (insertError) {
            console.error(`Error inserting file ${filePath}:`, insertError)
            errors.push({ filePath, error: insertError })
          } else {
            savedFiles.push(filePath)
          }
        }
      } catch (fileError) {
        console.error(`Exception handling file ${filePath}:`, fileError)
        errors.push({ filePath, error: fileError })
      }
    }

    if (errors.length > 0) {
      console.error("Errors saving files:", errors)
      return NextResponse.json({ 
        error: "Failed to save some generated files", 
        details: errors,
        savedFiles 
      }, { status: 500 })
    }

    // Update project data
    let projectUpdateData = {
      last_used_at: new Date().toISOString(),
      has_generated_code: true, // Mark that code has been generated for this project
    }

    // Try to extract extension name from manifest.json
    if (allFiles['manifest.json']) {
      try {
        const manifestContent = allFiles['manifest.json']
        const manifest = JSON.parse(manifestContent)
        
        if (manifest.name && manifest.name.trim()) {
          projectUpdateData.name = manifest.name.trim()
          console.log(`Updating project name to: ${manifest.name}`)
        }
        
        if (manifest.description && manifest.description.trim()) {
          projectUpdateData.description = manifest.description.trim()
          console.log(`Updating project description to: ${manifest.description}`)
        }
      } catch (parseError) {
        console.warn('Could not parse manifest.json for project update:', parseError.message)
      }
    }

    // Update project with generation info and extension details
    const { error: projectUpdateError } = await supabase
      .from("projects")
      .update(projectUpdateData)
      .eq("id", projectId)

    if (projectUpdateError) {
      console.error('Error updating project with extension info:', projectUpdateError)
    } else {
      console.log('✅ Project updated successfully with extension info')
    }

    console.log(`✅ Code generation completed successfully. Generated ${savedFiles.length} files.`)
    
    // Compute tokens used this request if available
    const tokensUsedThisRequest = result?.tokensUsedThisRequest ?? result?.tokenUsage?.total_tokens ?? 0
    const nextResponseId = result?.nextResponseId || null

    console.log('[api/generate] responding', {
      conversationTokenTotal_out: (conversationTokenTotal || 0) + tokensUsedThisRequest,
      tokensUsedThisRequest,
      nextResponseId,
      apiUsed: nextResponseId ? 'responses' : 'chat_completions'
    })

    return NextResponse.json({
      success: true,
      explanation: result.explanation,
      thinkingSummary: result.thinkingSummary,
      files: savedFiles,
      filesGenerated: savedFiles.length,
      tokenUsage: result.tokenUsage || null,
      nextResponseId,
      tokensUsedThisRequest
    })
  } catch (error) {
    console.error("Error generating extension:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
