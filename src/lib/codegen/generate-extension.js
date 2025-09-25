import { REQUEST_TYPES } from "../prompts/request-types"
import { NEW_EXT_GENERIC_PROMPT } from "../prompts/new-extension/generic"
import { NEW_EXT_OVERLAY_PROMPT } from "../prompts/new-extension/overlay"
import { NEW_EXT_SIDEPANEL_PROMPT } from "../prompts/new-extension/sidepanel"
import { NEW_EXT_POPUP_PROMPT } from "../prompts/new-extension/popup"
import { UPDATE_EXT_PROMPT } from "../prompts/followup/generic-no-diffs"
import { batchScrapeWebpages } from "../webpage-scraper"
import { createClient } from "../supabase/server"
import { analyzeExtensionRequirements } from "./preprocessing"
import { generateExtensionCode } from "./generate-extension-code"
import { generateChromeExtensionStream } from "./generate-extension-stream"
import { formatManifestJson, formatJsonFile } from "../utils/json-formatter"

const chromeApisData = require('../chrome_extension_apis.json');

function searchChromeExtensionAPI(apiName) {
  if (!apiName || typeof apiName !== "string") {
    return {
      error: "Invalid API name provided. Please provide a valid string.",
      available_apis: chromeApisData.chrome_extension_apis.apis.map((api) => api.name),
    }
  }

  const searchTerm = apiName.toLowerCase().trim()

  // Search for exact match first
  let api = chromeApisData.chrome_extension_apis.apis.find((api) => api.name.toLowerCase() === searchTerm)

  // If no exact match, search for partial matches
  if (!api) {
    api = chromeApisData.chrome_extension_apis.apis.find(
      (api) => api.name.toLowerCase().includes(searchTerm) || api.namespace.toLowerCase().includes(searchTerm),
    )
  }

  if (!api) {
    return {
      error: `API "${apiName}" not found.`,
      available_apis: chromeApisData.chrome_extension_apis.apis.map((api) => api.name),
      total_apis: chromeApisData.chrome_extension_apis.metadata.total_apis,
      categories: chromeApisData.chrome_extension_apis.metadata.categories,
    }
  }

  return {
    name: api.name,
    namespace: api.namespace,
    description: api.description,
    code_example: api.code_example,
    compatibility: api.compatibility,
  }
}

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
 * @returns {Object} Generated extension code and metadata
 */
export async function generateChromeExtension({
  featureRequest,
  requestType = REQUEST_TYPES.NEW_EXTENSION,
  sessionId,
  existingFiles = {},
  userProvidedUrl = null,
  skipScraping = false,
  previousResponseId,
  conversationTokenTotal,
  modelOverride,
  contextWindowMaxTokens,
}) {
  try {
    console.log('[generateChromeExtension] params', {
      has_previousResponseId: Boolean(previousResponseId),
      conversationTokenTotal,
      modelOverride,
      contextWindowMaxTokens
    })
    let requirementsAnalysis
    let planningTokenUsage

    // Step 1: Analyze requirements based on request type
    if (requestType === REQUEST_TYPES.NEW_EXTENSION) {
      const analysisResult = await analyzeExtensionRequirements({ featureRequest })
      requirementsAnalysis = analysisResult.requirements
      planningTokenUsage = analysisResult.tokenUsage
    } else if (requestType === REQUEST_TYPES.ADD_TO_EXISTING) {
      
      // For existing extensions, create a simplified requirements analysis
      requirementsAnalysis = {
        frontend_type: "generic", // Will be determined from existing files
        docAPIs: [], // Will be determined from existing code
        webPageData: null, // Usually not needed for modifications
        ext_name: "Existing Extension" // Will be updated from manifest
      }
      
      // Extract extension info from existing manifest if available
      if (existingFiles['manifest.json']) {
        try {
          const manifest = JSON.parse(existingFiles['manifest.json'])
          if (manifest.name) requirementsAnalysis.ext_name = manifest.name
        } catch (e) {
          console.warn('Could not parse existing manifest.json:', e.message)
        }
      }
      
      // No planning tokens for modifications
      planningTokenUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, model: "none" }
    } else {
      throw new Error(`Request type ${requestType} not yet implemented`)
    }

    // Check if URL is required but not provided
    if (requirementsAnalysis.webPageData && requirementsAnalysis.webPageData.length > 0 && !userProvidedUrl && !skipScraping) {
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
    if (requirementsAnalysis.chromeAPIs && requirementsAnalysis.chromeAPIs.length > 0) {
      const apiDocs = []
      
      for (const apiName of requirementsAnalysis.chromeAPIs) {
        const apiResult = searchChromeExtensionAPI(apiName)
        if (!apiResult.error) {
          apiDocs.push(`
## ${apiResult.name} API
**Namespace:** ${apiResult.namespace || 'Unknown'}
**Description:** ${apiResult.description || 'No description available'}
**Permissions:** ${Array.isArray(apiResult.permissions) ? apiResult.permissions.join(', ') : (apiResult.permissions || 'None required')}
**Code Example:**
\`\`\`javascript
${apiResult.code_example?.code || apiResult.code_example || 'No example provided'}
\`\`\`
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
    }

    // Step 3: Scrape webpages for analysis if needed and URL is provided
    let scrapedWebpageAnalysis = null
    if (requirementsAnalysis.webPageData && requirementsAnalysis.webPageData.length > 0 && userProvidedUrl && !skipScraping) {
      scrapedWebpageAnalysis = await batchScrapeWebpages(
        requirementsAnalysis.webPageData, 
        userProvidedUrl
      )
    } else if (requirementsAnalysis.webPageData && requirementsAnalysis.webPageData.length > 0 && (skipScraping || !userProvidedUrl)) {
      scrapedWebpageAnalysis = '<!-- Website analysis skipped by user -->'
    } else {
      scrapedWebpageAnalysis = '<!-- No specific websites targeted -->'
    }

    // Step 4: Select appropriate coding prompt based on request type and frontend type
    let selectedCodingPrompt = ""
    
    if (requestType === REQUEST_TYPES.ADD_TO_EXISTING) {
      // For modifications, use the specialized follow-up prompt with tool integration
      selectedCodingPrompt = UPDATE_EXT_PROMPT
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
    }

    // Step 5: Generate extension code
    // Conditional prompt replacement: use enhanced_prompt if user prompt < 300 chars, otherwise use original
    const shouldUseEnhancedPrompt = featureRequest.length < 300 && requirementsAnalysis.enhanced_prompt
    const finalUserPrompt = shouldUseEnhancedPrompt ? requirementsAnalysis.enhanced_prompt : featureRequest
    
    const replacements = {
      user_feature_request: finalUserPrompt,
      ext_name: requirementsAnalysis.ext_name,
      chrome_api_documentation: chromeApiDocumentation || '',
      scraped_webpage_analysis: scrapedWebpageAnalysis
    }
    
    // Add existing files context only if NOT using a previousResponseId
    if (!previousResponseId) {
      // Add existing files context for modifications (excluding icon files)
      if (requestType === REQUEST_TYPES.ADD_TO_EXISTING && Object.keys(existingFiles).length > 0) {
        // Filter out icon files from the context
        const filteredFiles = {}
        for (const [filename, content] of Object.entries(existingFiles)) {
          // Skip icon files (png, jpg, jpeg, gif, svg, ico files)
          if (!filename.match(/\.(png|jpg|jpeg|gif|svg|ico)$/i) && !filename.startsWith('icons/')) {
            filteredFiles[filename] = content
          }
        }
        replacements.existing_files = JSON.stringify(filteredFiles, null, 2)
        console.log('[generateChromeExtension] included existing files context', { count: Object.keys(filteredFiles).length })
      } else {
        console.log('[generateChromeExtension] no existing files context needed')
      }
    } else {
      console.log('[generateChromeExtension] skipping existing files context due to previousResponseId')
    }
    
    const codingCompletion = await generateExtensionCode(
      selectedCodingPrompt,
      replacements,
      false,
      { 
        previousResponseId, 
        conversationTokenTotal, 
        modelOverride, 
        contextWindowMaxTokens,
        frontendType: requirementsAnalysis.frontend_type,
        requestType: requestType
      }
    )

    // Preprocess the AI response to handle markdown-formatted JSON
    let aiResponse = codingCompletion.choices[0].message.content
    
    // Remove markdown code blocks if present
    if (aiResponse.includes('```json')) {
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        aiResponse = jsonMatch[1].trim()
      } else {
        // Fallback: try to find JSON between ``` blocks
        const fallbackMatch = aiResponse.match(/```\s*([\s\S]*?)\s*```/)
        if (fallbackMatch) {
          aiResponse = fallbackMatch[1].trim()
        }
      }
    } else if (aiResponse.includes('```')) {
      const fallbackMatch = aiResponse.match(/```\s*([\s\S]*?)\s*```/)
      if (fallbackMatch) {
        aiResponse = fallbackMatch[1].trim()
      }
    }
    
    let implementationResult
    try {
      implementationResult = JSON.parse(aiResponse)
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError.message)
      console.error('❌ Failed to parse this content:', aiResponse.substring(0, 500) + '...')
      throw parseError
    }


    // Extract file contents and metadata separately
    const filesOnly = {}
    const excludedKeys = ["explanation", "properties", "required", "type", "schema"]
    const nonStringKeys = [] // No special handling needed for stagehand_script
    let stagehandScript = null

    for (const [key, value] of Object.entries(implementationResult)) {
      if (key === "stagehand_script") {
        stagehandScript = value
      } else if (!excludedKeys.includes(key)) {
        filesOnly[key] = value
      }
    }

    // Add fallback HyperAgent script if not provided
    // COMMENTED OUT: HyperAgent test script generation
    // if (!filesOnly["hyperagent_test_script.js"]) {
    //   const fallbackScript = `// Fallback HyperAgent test script for Chrome extension testing
    // // This is a minimal placeholder script that will be used when no specific
    // // HyperAgent script is generated by the AI
    // 
    // // Basic test task - click extension icon and verify it loads
    // const testTask = "Test the Chrome extension by clicking the extension icon and verifying it loads correctly"
    // 
    // // This is a placeholder script - the actual HyperAgent execution will be handled
    // // by the Hyperbrowser service using this basic test task
    // 
    // // Export the test task for use by the HyperAgent service
    // if (typeof module !== 'undefined' && module.exports) {
    //   module.exports = { testTask }
    // }`
    //   filesOnly["hyperagent_test_script.js"] = fallbackScript
    // }

    // Validate file contents are strings (except for special non-string keys)
    for (const [filename, content] of Object.entries(filesOnly)) {
      if (filename === "manifest.json") {
        // Use the specialized manifest formatter to ensure proper formatting
        try {
          filesOnly[filename] = formatManifestJson(content)
        } catch (error) {
          console.error(`Error formatting manifest.json: ${error.message}`)
          // Fallback to basic JSON formatting
          if (typeof content === "object") {
            filesOnly[filename] = JSON.stringify(content, null, 2)
          } else {
            filesOnly[filename] = content
          }
        }
      } else if (nonStringKeys.includes(filename)) {
        // Skip validation for non-string keys like stagehand_commands
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
    const totalUsage = {
      prompt_tokens: (planningTokenUsage?.prompt_tokens || 0) + (codingCompletion.usage?.prompt_tokens || 0),
      completion_tokens: (planningTokenUsage?.completion_tokens || 0) + (codingCompletion.usage?.completion_tokens || 0),
      total_tokens: (planningTokenUsage?.total_tokens || 0) + (codingCompletion.usage?.total_tokens || 0),
      model: codingCompletion?.tokenUsage?.model || "gpt-4o", // Use the model used for coding
      models: {
        planning: "gpt-oss-20b",
        coding: codingCompletion?.tokenUsage?.model || "gpt-4o"
      }
    }

    // Update token usage in Supabase
    try {
      // Import both clients - one for auth, one for admin operations
      const { createClient: createServerClient } = await import('@/lib/supabase/server')
      const { createClient: createDirectClient } = await import('@supabase/supabase-js')
      
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      // Use server client for authentication
      const authClient = createServerClient()
      
      // Get the current user
      const { data: { user }, error: userError } = await authClient.auth.getUser()
      
      if (userError || !user) {
        console.error('❌ User not authenticated for token usage update:', userError)
        return
      }
      
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
        } else if (isResetDue) {
          // New monthly period started; reset total to current request
          newTotalTokens = totalUsage.total_tokens
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          newMonthlyReset = firstDayOfMonth.toISOString()
        } else {
          // Same monthly period; accumulate
          newTotalTokens = (existingUsage.total_tokens || 0) + totalUsage.total_tokens
        }
        
        if (existingUsage?.id) {
          // Update existing record
          
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
          
          // If no rows were updated, let's check if the record exists and what the current user can see
          if (!updatedRows || updatedRows.length === 0) {
            const { data: checkRecord, error: checkError } = await supabase
              .from('token_usage')
              .select('*')
              .eq('id', existingUsage.id)
            
            // Also try to see all records for this user
            const { data: allUserRecords, error: allUserError } = await supabase
              .from('token_usage')
              .select('*')
              .eq('user_id', user.id)
          }
          
          if (updateError) {
            console.error('❌ Error updating token usage:', updateError)
          } else {
            // Verify the update by fetching the record again
            const { data: verifyData, error: verifyError } = await supabase
              .from('token_usage')
              .select('id, total_tokens, monthly_reset, model')
              .eq('id', existingUsage.id)
              .single()
            
            if (verifyError) {
              console.error('❌ Error verifying update:', verifyError)
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
          }
        }
      }
    } catch (error) {
      console.error('💥 Exception during token usage update:', error)
    }

    // Update project's has_generated_code flag in Supabase
    try {
      if (sessionId) {
        const supabase = createClient()
        
        const { error: updateError } = await supabase
          .from('projects')
          .update({ has_generated_code: true })
          .eq('id', sessionId)
        
        if (updateError) {
          console.error('❌ Error updating project has_generated_code:', updateError)
        }
      }
    } catch (error) {
      console.error('💥 Exception during project update:', error)
    }

    return {
      success: true,
      explanation: implementationResult.explanation,
      files: filesOnly,
      stagehandScript: stagehandScript,
      sessionId,
      tokenUsage: totalUsage,
      nextResponseId: codingCompletion?.nextResponseId || null,
      tokensUsedThisRequest: codingCompletion?.tokensUsedThisRequest || codingCompletion?.usage?.total_tokens || 0
    }

  } catch (error) {
    console.error("Error in extension generation:", error)
    throw error
  }
}

