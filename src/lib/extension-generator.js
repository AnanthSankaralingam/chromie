"use strict";

import { REQUEST_TYPES } from "./constants.js";
import {
  NEW_EXT_SIDEPANEL_PROMPT,
  NEW_EXT_POPUP_PROMPT,
  NEW_EXT_OVERLAY_PROMPT,
  NEW_EXT_GENERIC_PROMPT
} from "./prompts/new-coding.js";
import { batchScrapeWebpages } from "./webpage-scraper.js";
import { searchChromeExtensionAPI } from "./chrome-api-service.js";
import { generateExtensionCode, analyzeExtensionRequirements } from "./openai-service.js";

/**
 * Main method for generating Chrome extension code.
 * Orchestrates the entire process from requirements analysis to code generation.
 *
 * @param {Object} params - Function parameters
 * @param {string} params.featureRequest - User's feature request description
 * @param {string} params.requestType - Type of request (new extension, add to existing, etc.)
 * @param {string} params.sessionId - Session/project identifier
 * @param {Object} params.existingFiles - Existing extension files (for add-to-existing requests)
 * @param {string} params.userProvidedUrl - User-provided URL for website analysis
 * @param {string} [params.previousResponseId] - Previous response ID for conversation chaining
 * @returns {Object} Generated extension code and metadata
 */
export async function generateExtension({
  featureRequest,
  requestType = REQUEST_TYPES.NEW_EXTENSION,
  sessionId,
  existingFiles = {},
  userProvidedUrl = null,
  skipScraping = false,
  previousResponseId = null,
}) {
  console.log(`Request type: ${requestType}`)

  try {
    let requirementsAnalysis
    let planningTokenUsage

    // Step 1: Analyze requirements based on request type
    if (requestType === REQUEST_TYPES.NEW_EXTENSION) {
      console.log("🆕 New extension request - analyzing requirements...")
      const analysisResult = await analyzeExtensionRequirements({ featureRequest })
      requirementsAnalysis = analysisResult.requirements
      planningTokenUsage = analysisResult.tokenUsage
    } else if (requestType === REQUEST_TYPES.ADD_TO_EXISTING) {
      console.log("🔧 Add to existing extension request - analyzing existing code...")

      // For existing extensions, create a simplified requirements analysis
      requirementsAnalysis = {
        frontend_type: "generic", // Will be determined from existing files
        docAPIs: [], // Will be determined from existing code
        webPageData: null, // Usually not needed for modifications
        ext_name: "Existing Extension", // Will be updated from manifest
        ext_description: "Extension modification" // Will be updated from manifest
      }

      // Extract extension info from existing manifest if available
      if (existingFiles['manifest.json']) {
        try {
          const manifest = JSON.parse(existingFiles['manifest.json'])
          if (manifest.name) requirementsAnalysis.ext_name = manifest.name
          if (manifest.description) requirementsAnalysis.ext_description = manifest.description
          console.log(`📋 Using existing manifest: ${manifest.name}`)
        } catch (e) {
          console.warn('Could not parse existing manifest.json:', e.message)
        }
      }

      // No planning tokens for modifications
      planningTokenUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, model: "none" }
      console.log("✅ Requirements analysis completed for existing extension modification")
    } else {
      throw new Error(`Request type ${requestType} not yet implemented`)
    }

    // Check if URL is required but not provided
    if (requirementsAnalysis.webPageData && requirementsAnalysis.webPageData.length > 0 && !userProvidedUrl && !skipScraping) {
      console.log("🔗 URL required for scraping - showing modal to user")
      return {
        success: false,
        requiresUrl: true,
        message: `This extension would benefit from analyzing specific website structure. Please choose how you'd like to proceed.`,
        detectedSites: requirementsAnalysis.webPageData,
        detectedUrls: [],
        featureRequest: featureRequest,
        requestType: requestType
      }
    }

    // Step 2: Fetch Chrome API documentation for required APIs
    let chromeApiDocumentation = ""
    if (requirementsAnalysis.docAPIs && requirementsAnalysis.docAPIs.length > 0) {
      console.log("Fetching Chrome API documentation for:", requirementsAnalysis.docAPIs)
      const apiDocs = []

      for (const apiName of requirementsAnalysis.docAPIs) {
        const apiResult = searchChromeExtensionAPI(apiName)
        console.log(`API result for ${apiName}:`, JSON.stringify(apiResult, null, 2))
        if (!apiResult.error) {
          apiDocs.push(`
## ${apiResult.name} API
**Namespace:** ${apiResult.namespace || 'Unknown'}
**Description:** ${apiResult.description || 'No description available'}
**Permissions:** ${Array.isArray(apiResult.permissions) ? apiResult.permissions.join(', ') : (apiResult.permissions || 'None required')}
**Code Example:**
\`\`\`javascript
${apiResult.code_example || 'No example provided'}
\`\`\`
**Compatibility:** ${apiResult.compatibility || 'Chrome 88+'}
**Manifest Version:** ${apiResult.manifest_version || 'V3'}
          `)
        } else {
          apiDocs.push(`
## ${apiName} API
**Error:** ${apiResult.error}
**Available APIs:** ${apiResult.available_apis?.slice(0, 10).join(', ')}...
          `)
        }
      }

      chromeApiDocumentation = apiDocs.join('\n\n')
      console.log("Chrome API documentation compiled")
    }

    // Step 3: Scrape webpages for analysis if needed and URL is provided
    let scrapedWebpageAnalysis = null
    if (requirementsAnalysis.webPageData && requirementsAnalysis.webPageData.length > 0 && userProvidedUrl && !skipScraping) {
      console.log("🌐 Scraping webpage with user-provided URL:", userProvidedUrl)
      scrapedWebpageAnalysis = await batchScrapeWebpages(
        requirementsAnalysis.webPageData,
        userProvidedUrl
      )
    } else if (requirementsAnalysis.webPageData && requirementsAnalysis.webPageData.length > 0 && (skipScraping || !userProvidedUrl)) {
      console.log("⏸️ Skipping webpage scraping -", skipScraping ? "user opted out" : "no URL provided by user")
      scrapedWebpageAnalysis = '<!-- Website analysis skipped by user -->'
    } else {
      console.log("📝 No website analysis required for this extension")
      scrapedWebpageAnalysis = '<!-- No specific websites targeted -->'
    }

    // Step 4: Select appropriate coding prompt based on request type and frontend type
    let selectedCodingPrompt = ""

    if (requestType === REQUEST_TYPES.ADD_TO_EXISTING) {
      // For modifications, always use the generic prompt to handle any type of extension
      selectedCodingPrompt = NEW_EXT_GENERIC_PROMPT
      console.log("🔧 Using generic coding prompt for extension modification")
      console.log("📝 This prompt will handle modifications to any existing extension type")
    } else {
      // For new extensions, select based on frontend type
      switch (requirementsAnalysis.frontend_type) {
        case "side_panel":
          selectedCodingPrompt = NEW_EXT_SIDEPANEL_PROMPT
          break
        case "popup":
          selectedCodingPrompt = NEW_EXT_POPUP_PROMPT
          break
        case "overlay":
          selectedCodingPrompt = NEW_EXT_OVERLAY_PROMPT
          break
        case "generic":
          selectedCodingPrompt = NEW_EXT_GENERIC_PROMPT
          break
        default:
          selectedCodingPrompt = NEW_EXT_GENERIC_PROMPT
          break
      }
      console.log(`🆕 Using ${requirementsAnalysis.frontend_type} coding prompt for new extension`)
    }

    // Step 5: Generate extension code
    const replacements = {
      user_feature_request: featureRequest,
      ext_name: requirementsAnalysis.ext_name,
      ext_description: requirementsAnalysis.ext_description,
      chrome_api_documentation: chromeApiDocumentation || '',
      scraped_webpage_analysis: scrapedWebpageAnalysis
    }

    // Add existing files context for modifications
    if (requestType === REQUEST_TYPES.ADD_TO_EXISTING && Object.keys(existingFiles).length > 0) {
      console.log(`📁 Including existing files context for modification (${Object.keys(existingFiles).length} files)`)
      replacements.existing_files = JSON.stringify(existingFiles, null, 2)
      console.log("🔍 LLM will receive existing code context for modification")
    }

    console.log("🚀 Starting code generation with selected prompt...")
    const isFollowUp = requestType === REQUEST_TYPES.ADD_TO_EXISTING
    const codingResult = await generateExtensionCode(selectedCodingPrompt, replacements, previousResponseId, isFollowUp)
    console.log('🧩 Coding response id:', codingResult?.responseId)

    console.log("Code generation completed")

    // Handle response based on format (JSON for new, unified diff for follow-up)
    let aiResponse = codingResult.rawText

    if (isFollowUp) {
      console.log('🔍 Follow-up request - processing unified diff response')
      console.log(`📄 Git diff response length: ${aiResponse.length} characters`)
      console.log('📄 Git diff response first 200 chars:', aiResponse.substring(0, 200))
      console.log('📄 Git diff response first 5 lines:')
      aiResponse.split('\n').slice(0, 5).forEach((line, i) => {
        console.log(`  Line ${i + 1}: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`)
      })

      // Check for common issues
      const hasDiffHeaders = aiResponse.includes('--- a/') && aiResponse.includes('+++ b/')
      const hasHunkHeaders = aiResponse.includes('@@ ')
      const hasMarkdownCodeBlock = aiResponse.includes('```')
      console.log('📊 Diff format analysis:', {
        hasDiffHeaders,
        hasHunkHeaders,
        hasMarkdownCodeBlock,
        containsJSON: aiResponse.includes('{') && aiResponse.includes('}'),
        containsHTML: aiResponse.includes('<') && aiResponse.includes('>')
      })
    } else {
      console.log('🔍 New request - processing JSON response')
      console.log('🔍 Raw AI response preview:', aiResponse.substring(0, 100) + '...')
    }

    let implementationResult

    if (isFollowUp) {
      // Check for common issues (define variables for both new and follow-up cases)
      const hasDiffHeadersCheck = aiResponse.includes('--- a/') && aiResponse.includes('+++ b/')
      const hasHunkHeadersCheck = aiResponse.includes('@@ ')

      // Check if OpenAI returned JSON instead of a unified diff
      // More robust detection: check for JSON structure AND absence of diff markers
      const startsWithJson = aiResponse.trim().startsWith('{') || aiResponse.trim().startsWith('```json')
      const hasJsonStructure = aiResponse.includes('"manifest.json"') || aiResponse.includes('"explanation"')
      const isJsonResponse = (startsWithJson || hasJsonStructure) && !hasDiffHeadersCheck && !hasHunkHeadersCheck

      console.log('🔍 JSON detection analysis:', {
        startsWithJson,
        hasJsonStructure,
        hasDiffHeadersCheck,
        hasHunkHeadersCheck,
        isJsonResponse,
        firstLine: aiResponse.split('\n')[0].substring(0, 50)
      })

      if (isJsonResponse) {
        console.log('🔄 OpenAI returned JSON for follow-up request, processing as JSON instead of diff')
        console.log('🔧 Processing follow-up request as JSON response')

        // Remove markdown code blocks if present
        let jsonResponse = aiResponse
        if (jsonResponse.includes('```json')) {
          console.log('🔄 Extracting JSON from markdown code block')
          const jsonMatch = jsonResponse.match(/```json\s*([\s\S]*?)\s*```/)
          if (jsonMatch) {
            jsonResponse = jsonMatch[1].trim()
          } else {
            const fallbackMatch = jsonResponse.match(/```\s*([\s\S]*?)\s*```/)
            if (fallbackMatch) {
              jsonResponse = fallbackMatch[1].trim()
            }
          }
        }

        try {
          implementationResult = JSON.parse(jsonResponse)
          console.log('✅ Successfully parsed JSON response for follow-up request')
        } catch (parseError) {
          console.error('❌ JSON parsing failed for follow-up response:', parseError.message)
          console.error('❌ Failed to parse this content:', jsonResponse.substring(0, 500) + '...')
          console.log('🔄 Falling back to unified diff processing...')

          // Fallback: try to process as unified diff anyway
          const { DiffProcessingService } = await import('./diff-processing-service.js')
          const diffService = new DiffProcessingService()
          diffService.setFiles(existingFiles)

          const diffResult = diffService.processFollowUpResponse({
            responseText: aiResponse,
            defaultFilePath: 'manifest.json'
          })

          if (diffResult.errors.length > 0) {
            console.error('❌ Fallback diff processing also failed:', diffResult.errors)
            throw new Error(`Both JSON and diff processing failed. JSON error: ${parseError.message}. Diff errors: ${diffResult.errors.map(e => e.error.message).join(', ')}`)
          }

          console.log('✅ Fallback diff processing successful')
          implementationResult = {
            explanation: 'Extension updated successfully (fallback processing)',
            ...diffService.getFilesSnapshot()
          }
        }
      } else {
        // For follow-up requests, use diff processing service instead of JSON parsing
        console.log('🔧 Processing follow-up request with unified diff')

        // Import the diff processing service
        const { DiffProcessingService } = await import('./diff-processing-service.js')
        const diffService = new DiffProcessingService()

        // Set the existing files as the current state
        diffService.setFiles(existingFiles)

        // Process the diff response
        const diffResult = diffService.processFollowUpResponse({
          responseText: aiResponse,
          defaultFilePath: 'manifest.json' // fallback if no file headers
        })

        if (diffResult.errors.length > 0) {
          console.error('❌ Diff processing failed:', diffResult.errors)
          throw new Error(`Diff processing failed: ${diffResult.errors.map(e => e.error.message).join(', ')}`)
        }

        console.log('✅ Diff processing successful, updated files:', diffResult.updated)

        // Convert the diff result to the expected format
        implementationResult = {
          explanation: 'Extension updated successfully',
          ...diffService.getFilesSnapshot()
        }
      }

    } else {
      // For new requests, use JSON parsing as before
      console.log('🔧 Processing new request with JSON response')

      // Remove markdown code blocks if present
      if (aiResponse.includes('```json')) {
        console.log('🔄 Extracting JSON from markdown code block')
        const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/)
        if (jsonMatch) {
          aiResponse = jsonMatch[1].trim()
        } else {
          const fallbackMatch = aiResponse.match(/```\s*([\s\S]*?)\s*```/)
          if (fallbackMatch) {
            aiResponse = fallbackMatch[1].trim()
          }
        }
      } else if (aiResponse.includes('```')) {
        console.log('🔄 Extracting content from markdown code block')
        const fallbackMatch = aiResponse.match(/```\s*([\s\S]*?)\s*```/)
        if (fallbackMatch) {
          aiResponse = fallbackMatch[1].trim()
        }
      }

      try {
        implementationResult = JSON.parse(aiResponse)
      } catch (parseError) {
        console.error('❌ JSON parsing failed:', parseError.message)
        console.error('❌ Failed to parse this content:', aiResponse.substring(0, 500) + '...')
        throw parseError
      }
    }

    console.log("Implementation result received:", {
      allKeys: Object.keys(implementationResult),
      files: Object.keys(implementationResult).filter((key) => key !== "explanation"),
    })

    // Extract file contents and metadata separately
    const filesOnly = {}
    const excludedKeys = ["explanation", "properties", "required", "type", "schema"]

    for (const [key, value] of Object.entries(implementationResult)) {
      if (!excludedKeys.includes(key)) {
        filesOnly[key] = value
      }
    }

    // Validate file contents are strings (except for special non-string keys)
    for (const [filename, content] of Object.entries(filesOnly)) {
      if (filename === "manifest.json" && typeof content === "object") {
        // Convert manifest.json object to JSON string
        filesOnly[filename] = JSON.stringify(content, null, 2)
        console.log(`Converted manifest.json from object to JSON string`)
      } else if (typeof content !== "string") {
        console.error(`Schema validation failed: ${filename} is ${typeof content}, expected string`)
        throw new Error(`Schema validation failed: ${filename} should be a string but got ${typeof content}`)
      }
    }

    // Final check to ensure we have at least one file to write
    if (Object.keys(filesOnly).length === 0) {
      console.error("No valid files found after all parsing attempts")
      throw new Error("No valid extension files generated")
    }

    // Calculate total token usage
    console.log('Planning token usage:', planningTokenUsage)
    console.log('Coding response usage:', codingResult.usage)

    const codingUsage = codingResult?.usage || {}
    const codingPromptTokens = codingUsage.input_tokens || codingUsage.prompt_tokens || 0
    const codingCompletionTokens = codingUsage.output_tokens || codingUsage.completion_tokens || 0
    const codingTotalTokens = codingUsage.total_tokens || (codingPromptTokens + codingCompletionTokens)

    const totalUsage = {
      prompt_tokens: (planningTokenUsage?.prompt_tokens || 0) + codingPromptTokens,
      completion_tokens: (planningTokenUsage?.completion_tokens || 0) + codingCompletionTokens,
      total_tokens: (planningTokenUsage?.total_tokens || 0) + codingTotalTokens,
      model: "gpt-4o", // Use the primary model for tracking
      models: {
        planning: "gpt-oss-20b",
        coding: "gpt-4o"
      }
    }

    console.log("Total token usage calculated:", totalUsage)

    // Update token usage in Supabase
    try {
      console.log('🔍 Updating token usage in Supabase for session:', sessionId)

      // Import both clients - one for auth, one for admin operations
      const { createClient: createServerClient } = await import('@/lib/supabase/server')
      const { createClient: createDirectClient } = await import('@supabase/supabase-js')

      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      console.log('🔑 Service role key available:', !!serviceRoleKey)
      console.log('🔑 Anon key available:', !!anonKey)

      // Use server client for authentication
      const authClient = createServerClient()

      // Get the current user
      const { data: { user }, error: userError } = await authClient.auth.getUser()

      if (userError || !user) {
        console.error('❌ User not authenticated for token usage update:', userError)
        return
      }

      console.log('👤 User authenticated for token usage update:', user.id)

      // Use direct client with service role for admin operations
      const supabase = createDirectClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey || anonKey
      )

      // Fetch existing usage for this user
      const { data: existingUsage, error: fetchError } = await supabase
        .from('token_usage')
        .select('id, total_tokens, monthly_reset, model')
        .eq('user_id', user.id)
        .maybeSingle()

      if (fetchError) {
        console.error('❌ Error fetching existing token usage:', fetchError)
      } else {
        console.log('📊 Existing token usage found:', existingUsage)

        const now = new Date()
        let effectiveMonthlyReset = existingUsage?.monthly_reset
        if (!effectiveMonthlyReset) {
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          effectiveMonthlyReset = firstDayOfMonth.toISOString()
        }

        const monthlyResetDate = effectiveMonthlyReset ? new Date(effectiveMonthlyReset) : null
        let resetDatePlusOneMonth = null
        if (monthlyResetDate) {
          resetDatePlusOneMonth = new Date(monthlyResetDate)
          resetDatePlusOneMonth.setMonth(resetDatePlusOneMonth.getMonth() + 1)
        }

        const isResetDue = monthlyResetDate ? now >= resetDatePlusOneMonth : false

        // Calculate new totals
        let newTotalTokens
        let newMonthlyReset = existingUsage?.monthly_reset

        if (!existingUsage) {
          // First-ever usage record for this user
          newTotalTokens = totalUsage.total_tokens
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          newMonthlyReset = firstDayOfMonth.toISOString()
          console.log('🆕 Creating first token usage record')
        } else if (isResetDue) {
          // New monthly period started; reset total to current request
          newTotalTokens = totalUsage.total_tokens
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          newMonthlyReset = firstDayOfMonth.toISOString()
          console.log('🔄 Monthly reset due, resetting total')
        } else {
          // Same monthly period; accumulate
          newTotalTokens = (existingUsage.total_tokens || 0) + totalUsage.total_tokens
          console.log('📈 Accumulating tokens in same monthly period')
        }

        console.log(`📊 Token calculation: existing=${existingUsage?.total_tokens || 0}, adding=${totalUsage.total_tokens}, new total=${newTotalTokens}`)

        if (existingUsage?.id) {
          // Update existing record
          console.log('🔄 Attempting to update token usage record with ID:', existingUsage.id)
          console.log('🔄 Update payload:', {
            total_tokens: newTotalTokens,
            monthly_reset: newMonthlyReset,
            model: totalUsage.model,
          })

          // Try update with just the ID first
          const { data: updatedRows, error: updateError } = await supabase
            .from('token_usage')
            .update({
              total_tokens: newTotalTokens,
              monthly_reset: newMonthlyReset,
              model: totalUsage.model,
            })
            .eq('id', existingUsage.id)
            .select('id, total_tokens, monthly_reset')

          console.log('🔄 Supabase update response:', { data: updatedRows, error: updateError })

          // If no rows were updated, let's check if the record exists and what the current user can see
          if (!updatedRows || updatedRows.length === 0) {
            console.log('⚠️ No rows updated, checking record visibility...')

            const { data: checkRecord, error: checkError } = await supabase
              .from('token_usage')
              .select('*')
              .eq('id', existingUsage.id)

            console.log('🔍 Record visibility check:', { data: checkRecord, error: checkError })

            // Also try to see all records for this user
            const { data: allUserRecords, error: allUserError } = await supabase
              .from('token_usage')
              .select('*')
              .eq('user_id', user.id)

            console.log('🔍 All user records:', { data: allUserRecords, error: allUserError })
          }

          if (updateError) {
            console.error('❌ Error updating token usage:', updateError)
          } else {
            console.log('✅ Token usage updated successfully:', updatedRows?.[0])

            // Verify the update by fetching the record again
            const { data: verifyData, error: verifyError } = await supabase
              .from('token_usage')
              .select('id, total_tokens, monthly_reset, model')
              .eq('id', existingUsage.id)
              .single()

            if (verifyError) {
              console.error('❌ Error verifying update:', verifyError)
            } else {
              console.log('🔍 Verification - record after update:', verifyData)
            }
          }
        } else {
          // Create new record
          const { error: insertError } = await supabase
            .from('token_usage')
            .insert({
              user_id: user.id,
              total_tokens: newTotalTokens,
              model: totalUsage.model,
              monthly_reset: newMonthlyReset,
            })

          if (insertError) {
            console.error('❌ Error inserting token usage:', insertError)
          } else {
            console.log('✅ Token usage record created successfully')
          }
        }
      }
    } catch (error) {
      console.error('💥 Exception during token usage update:', error)
    }

    return {
      success: true,
      explanation: implementationResult.explanation,
      files: filesOnly,
      sessionId,
      tokenUsage: totalUsage,
      responseId: codingResult?.responseId
    }

  } catch (error) {
    console.error("Error in extension generation:", error)
    throw error
  }
}
