import { REQUEST_TYPES } from "../prompts/request-types"
import { NEW_EXT_GENERIC_PROMPT } from "../prompts/new-extension/generic"
import { NEW_EXT_OVERLAY_PROMPT } from "../prompts/new-extension/overlay"
import { NEW_EXT_SIDEPANEL_PROMPT } from "../prompts/new-extension/sidepanel"
import { NEW_EXT_POPUP_PROMPT } from "../prompts/new-extension/popup"
import { UPDATE_EXT_PROMPT } from "../prompts/followup/generic-no-diffs"
import { batchScrapeWebpages } from "../webpage-scraper"
import { createClient } from "../supabase/server"
import { analyzeExtensionRequirements } from "./preprocessing"
import { generateExtensionCode, generateExtensionCodeStream } from "./generate-extension-code"

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
}) {
  try {
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
    if (requirementsAnalysis.docAPIs && requirementsAnalysis.docAPIs.length > 0) {
      const apiDocs = []
      
      for (const apiName of requirementsAnalysis.docAPIs) {
        const apiResult = searchChromeExtensionAPI(apiName)
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
    const replacements = {
      user_feature_request: featureRequest,
      ext_name: requirementsAnalysis.ext_name,
      chrome_api_documentation: chromeApiDocumentation || '',
      scraped_webpage_analysis: scrapedWebpageAnalysis
    }
    
    // Add existing files context for modifications
    if (requestType === REQUEST_TYPES.ADD_TO_EXISTING && Object.keys(existingFiles).length > 0) {
      replacements.existing_files = JSON.stringify(existingFiles, null, 2)
    }
    
    const codingCompletion = await generateExtensionCode(selectedCodingPrompt, replacements)

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
    if (!filesOnly["hyperagent_test_script.js"]) {
      const fallbackScript = `// Fallback HyperAgent test script for Chrome extension testing
// This is a minimal placeholder script that will be used when no specific
// HyperAgent script is generated by the AI

// Basic test task - click extension icon and verify it loads
const testTask = "Test the Chrome extension by clicking the extension icon and verifying it loads correctly"

// This is a placeholder script - the actual HyperAgent execution will be handled
// by the Hyperbrowser service using this basic test task

// Export the test task for use by the HyperAgent service
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testTask }
}`
      filesOnly["hyperagent_test_script.js"] = fallbackScript
    }

    // Validate file contents are strings (except for special non-string keys)
    for (const [filename, content] of Object.entries(filesOnly)) {
      if (filename === "manifest.json" && typeof content === "object") {
        // Convert manifest.json object to JSON string
        filesOnly[filename] = JSON.stringify(content, null, 2)
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
      model: "gpt-4o", // Use the primary model for tracking
      models: {
        planning: "gpt-oss-20b",
        coding: "gpt-4o"
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
      tokenUsage: totalUsage
    }

  } catch (error) {
    console.error("Error in extension generation:", error)
    throw error
  }
}

/**
 * Streaming version of generateChromeExtension that yields thinking and code generation in real-time
 * @param {Object} params - Function parameters
 * @param {string} params.featureRequest - User's feature request description
 * @param {string} params.requestType - Type of request (new extension, add to existing, etc.)
 * @param {string} params.sessionId - Session/project identifier
 * @param {Object} params.existingFiles - Existing extension files (for add-to-existing requests)
 * @param {string} params.userProvidedUrl - User-provided URL for website analysis
 * @returns {AsyncGenerator} Stream of thinking and code generation
 */
export async function* generateChromeExtensionStream({
  featureRequest,
  requestType = REQUEST_TYPES.NEW_EXTENSION,
  sessionId,
  existingFiles = {},
  userProvidedUrl = null,
  skipScraping = false,
}) {

  try {
    let requirementsAnalysis
    let planningTokenUsage

    // Step 1: Analyze requirements based on request type
    if (requestType === REQUEST_TYPES.NEW_EXTENSION) {
      yield { type: "analyzing", content: "analyzing" }
      // Emit an analyzing phase summary stub; UI can show/update as details emerge
      yield { type: "phase", phase: "analyzing", content: "Understanding your requirements and constraints to scope the extension." }
      
      const analysisResult = await analyzeExtensionRequirements({ featureRequest })
      requirementsAnalysis = analysisResult.requirements
      planningTokenUsage = analysisResult.tokenUsage
      
      yield { type: "analysis_complete", content: requirementsAnalysis.frontend_type }
      // Provide a more specific analyzing summary now that analysis is complete
      const analyzingSummary = `Identified a ${requirementsAnalysis.frontend_type} UI with ${
        (requirementsAnalysis.docAPIs||[]).length
      } Chrome APIs and ${
        requirementsAnalysis.webPageData && requirementsAnalysis.webPageData.length > 0 ? 'site analysis required' : 'no site analysis needed'
      }.`
      yield { type: "phase", phase: "analyzing", content: analyzingSummary }
    } else if (requestType === REQUEST_TYPES.ADD_TO_EXISTING) {
      console.log("🔧 Add to existing extension request - analyzing existing code...")
      yield { type: "analyzing", content: "analyzing" }
      yield { type: "phase", phase: "analyzing", content: "Reviewing current extension files to determine safe changes." }
      
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
      yield { type: "analysis_complete", content: requirementsAnalysis.ext_name }
      const analyzingSummaryExisting = `Will modify "${requirementsAnalysis.ext_name}".`
      yield { type: "phase", phase: "analyzing", content: analyzingSummaryExisting }
    } else {
      throw new Error(`Request type ${requestType} not yet implemented`)
    }

    // Check if URL is required but not provided
    if (requirementsAnalysis.webPageData && requirementsAnalysis.webPageData.length > 0 && !userProvidedUrl && !skipScraping) {
      yield { type: "requires_url", content: "This extension would benefit from analyzing specific website structure. Please choose how you'd like to proceed." }
      return
    }

    // Step 2: Fetch Chrome API documentation for required APIs
    let chromeApiDocumentation = ""
    if (requirementsAnalysis.docAPIs && requirementsAnalysis.docAPIs.length > 0) {
      yield { type: "fetching_apis", content: "fetching_apis" }
      yield { type: "phase", phase: "planning", content: `Gathering docs for: ${requirementsAnalysis.docAPIs.join(', ')}` }
      
      const apiDocs = []
      
      for (const apiName of requirementsAnalysis.docAPIs) {
        const apiResult = searchChromeExtensionAPI(apiName)
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
      yield { type: "apis_ready", content: "apis_ready" }
      yield { type: "phase", phase: "planning", content: "Chrome API references ready for prompt conditioning." }
    }

    // Step 3: Scrape webpages for analysis if needed and URL is provided
    let scrapedWebpageAnalysis = null
    if (requirementsAnalysis.webPageData && requirementsAnalysis.webPageData.length > 0 && userProvidedUrl && !skipScraping) {
      yield { type: "scraping", content: "scraping" }
      yield { type: "phase", phase: "planning", content: `Analyzing page structure at ${userProvidedUrl} for selectors and actions.` }
      
      scrapedWebpageAnalysis = await batchScrapeWebpages(
        requirementsAnalysis.webPageData, 
        userProvidedUrl
      )
      yield { type: "scraping_complete", content: "scraping_complete" }
      yield { type: "phase", phase: "planning", content: "Website structure analysis ready for code generation." }
    } else if (requirementsAnalysis.webPageData && requirementsAnalysis.webPageData.length > 0 && (skipScraping || !userProvidedUrl)) {
      scrapedWebpageAnalysis = '<!-- Website analysis skipped by user -->'
      yield { type: "scraping_skipped", content: "scraping_skipped" }
      yield { type: "phase", phase: "planning", content: "Skipping website analysis; proceeding with available context." }
    } else {
      scrapedWebpageAnalysis = '<!-- No specific websites targeted -->'
    }

    // Step 4: Select appropriate coding prompt based on request type and frontend type
    let selectedCodingPrompt = ""
    
    if (requestType === REQUEST_TYPES.ADD_TO_EXISTING) {
      // For modifications, use the specialized follow-up prompt with tool integration
      selectedCodingPrompt = UPDATE_EXT_PROMPT
      console.log("🔧 Using specialized follow-up prompt for extension modification")
      yield { type: "prompt_selected", content: "prompt_selected" }
      yield { type: "phase", phase: "planning", content: "Selected a generic modification plan based on existing files." }
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
      yield { type: "prompt_selected", content: "prompt_selected" }
      yield { type: "phase", phase: "planning", content: `Chose a ${requirementsAnalysis.frontend_type} implementation plan.` }
    }

    // Step 5: Generate extension code with streaming
    const replacements = {
      user_feature_request: featureRequest,
      ext_name: requirementsAnalysis.ext_name,
      chrome_api_documentation: chromeApiDocumentation || '',
      scraped_webpage_analysis: scrapedWebpageAnalysis
    }
    
    // Add existing files context for modifications
    if (requestType === REQUEST_TYPES.ADD_TO_EXISTING && Object.keys(existingFiles).length > 0) {
      console.log("📁 Including existing files context for modification")
      replacements.existing_files = JSON.stringify(existingFiles, null, 2)
      console.log(`📋 Context includes ${Object.keys(existingFiles).length} existing files: ${Object.keys(existingFiles).join(', ')}`)
      yield { type: "context_ready", content: "context_ready" }
    }
    
    console.log("🚀 Starting streaming code generation...")
    yield { type: "generation_starting", content: "generation_starting" }
    // Emit implementing phase start
    yield { type: "phase", phase: "implementing", content: "Generating extension files and applying project updates." }

    // Use the streaming code generation
    for await (const chunk of generateExtensionCodeStream(selectedCodingPrompt, replacements, sessionId)) {
      yield chunk
    }

    yield { type: "generation_complete", content: "generation_complete" }

  } catch (error) {
    console.error("Error in streaming extension generation:", error)
    yield { type: "error", content: `Error: ${error.message}` }
  }
}
