import { REQUEST_TYPES } from "../prompts/request-types"
import { NEW_EXT_GENERIC_PROMPT } from "../prompts/new-extension/generic"
import { NEW_EXT_OVERLAY_PROMPT } from "../prompts/new-extension/overlay"
import { NEW_EXT_SIDEPANEL_PROMPT } from "../prompts/new-extension/sidepanel"
import { NEW_EXT_POPUP_PROMPT } from "../prompts/new-extension/popup"
import { UPDATE_EXT_PROMPT } from "../prompts/followup/generic-no-diffs"
import { batchScrapeWebpages } from "../webpage-scraper"
import { analyzeExtensionRequirementsStream } from "./preprocessing"
import { generateExtensionCodeStream } from "./generate-extension-code-stream"

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
  previousResponseId,
  conversationTokenTotal,
  modelOverride,
  contextWindowMaxTokens,
}) {

  try {
    let requirementsAnalysis
    let planningTokenUsage

    // Step 1: Analyze requirements based on request type
    if (requestType === REQUEST_TYPES.NEW_EXTENSION) {
      yield { type: "analyzing", content: "analyzing" }
      // Emit an analyzing phase summary stub; UI can show/update as details emerge
      yield { type: "phase", phase: "analyzing", content: "Understanding your requirements and constraints to scope the extension." }
      
      // Use streaming analysis to get both thinking content and requirements
      for await (const chunk of analyzeExtensionRequirementsStream({ featureRequest })) {
        if (chunk.type === "thinking" || chunk.type === "thinking_complete") {
          // Forward the thinking content directly from the planning stream
          yield chunk
        } else if (chunk.type === "analysis_complete") {
          requirementsAnalysis = chunk.requirements
          planningTokenUsage = chunk.tokenUsage
          yield { type: "analysis_complete", content: requirementsAnalysis.frontend_type }
        } else if (chunk.type === "error") {
          yield chunk
          return
        }
      }
      
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
    if (requirementsAnalysis.chromeAPIs && requirementsAnalysis.chromeAPIs.length > 0) {
      yield { type: "fetching_apis", content: "fetching_apis" }
      yield { type: "phase", phase: "planning", content: `Gathering docs for: ${requirementsAnalysis.chromeAPIs.join(', ')}` }
      
      const apiDocs = []
      
      for (const apiName of requirementsAnalysis.chromeAPIs) {
        const apiResult = searchChromeExtensionAPI(apiName)
        if (!apiResult.error) {
          apiDocs.push(`
## ${apiResult.name} API
Namespace: ${apiResult.namespace || 'Unknown'}
Description: ${apiResult.description || 'No description available'}
Permissions: ${Array.isArray(apiResult.permissions) ? apiResult.permissions.join(', ') : (apiResult.permissions || 'None required')}
Code Example:
\`\`\`javascript
${apiResult.code_example?.code || apiResult.code_example || 'No example provided'}
\`\`\`
          `)
        } else {
          apiDocs.push(`
## ${apiName} API
Error: ${apiResult.error}
Available APIs: ${apiResult.available_apis?.slice(0, 10).join(', ')}...
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
    // Conditional prompt replacement: use enhanced_prompt if user prompt < 300 chars, otherwise use original
    const shouldUseEnhancedPrompt = featureRequest.length < 300 && requirementsAnalysis.enhanced_prompt
    const finalUserPrompt = shouldUseEnhancedPrompt ? requirementsAnalysis.enhanced_prompt : featureRequest
    console.log(`🎯 Using ${shouldUseEnhancedPrompt ? 'enhanced' : 'original'} prompt: ${finalUserPrompt.substring(0, 150)}...`)
    
    const replacements = {
      user_feature_request: finalUserPrompt,
      ext_name: requirementsAnalysis.ext_name,
      chrome_api_documentation: chromeApiDocumentation || '',
      scraped_webpage_analysis: scrapedWebpageAnalysis
    }
    
    // Add existing files context only if NOT using a previousResponseId
    if (!previousResponseId) {
      if (requestType === REQUEST_TYPES.ADD_TO_EXISTING && Object.keys(existingFiles).length > 0) {
        console.log("📁 Including existing files context for modification")
        const filteredFiles = {}
        for (const [filename, content] of Object.entries(existingFiles)) {
          if (!filename.match(/\.(png|jpg|jpeg|gif|svg|ico)$/i) && !filename.startsWith('icons/')) {
            filteredFiles[filename] = content
          }
        }
        replacements.existing_files = JSON.stringify(filteredFiles, null, 2)
        console.log(`📋 Context includes ${Object.keys(filteredFiles).length} existing files (excluding icons): ${Object.keys(filteredFiles).join(', ')}`)
        yield { type: "context_ready", content: "context_ready" }
      } else {
        console.log('[generateChromeExtensionStream] no existing files context needed')
      }
    } else {
      console.log('[generateChromeExtensionStream] skipping existing files context due to previousResponseId')
    }
    
    console.log("🚀 Starting streaming code generation...")
    yield { type: "generation_starting", content: "generation_starting" }
    // Emit implementing phase start
    yield { type: "phase", phase: "implementing", content: "Generating extension files and applying project updates." }

    // Use the streaming code generation (skip thinking phase since it was done in planning)
    for await (const chunk of generateExtensionCodeStream(
      selectedCodingPrompt,
      replacements,
      sessionId,
      true,
      { 
        previousResponseId, 
        conversationTokenTotal, 
        modelOverride, 
        contextWindowMaxTokens,
        frontendType: requirementsAnalysis.frontend_type,
        requestType: requestType
      }
    )) {
      yield chunk
    }

    yield { type: "generation_complete", content: "generation_complete" }

  } catch (error) {
    console.error("Error in streaming extension generation:", error)
    yield { type: "error", content: `Error: ${error.message}` }
  }
}
