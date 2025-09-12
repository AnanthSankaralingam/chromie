import OpenAI from "openai"
import { REQUEST_TYPES } from "./prompts/old-prompts"
import { NEW_EXT_PLANNING_PROMPT } from "./prompts/planning"
import { 
  NEW_EXT_SIDEPANEL_PROMPT, 
  NEW_EXT_POPUP_PROMPT, 
  NEW_EXT_OVERLAY_PROMPT,
  NEW_EXT_GENERIC_PROMPT
} from "./prompts/new-coding"
import { batchScrapeWebpages } from "./webpage-scraper"
import { createClient } from "./supabase/server"
const chromeApisData = require('./chrome_extension_apis.json');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
 * Analyzes Chrome extension feature requests and creates structured implementation plans.
 * This function ONLY handles the planning phase and returns requirements analysis.
 * 
 * @param {Object} params - Function parameters
 * @param {string} params.featureRequest - User's feature request description
 * @returns {Object} Requirements analysis with structured plan
 */
export async function analyzeExtensionRequirements({ featureRequest }) {
  console.log(`Starting requirements analysis for feature: ${featureRequest}`)

  try {
    // Call the planning prompt to analyze the request
    const planningPrompt = NEW_EXT_PLANNING_PROMPT.replace('{USER_REQUEST}', featureRequest)
    
    console.log("Calling planning prompt to analyze extension requirements...")
    
    const planningResponse = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.FIREWORKS_API_KEY}`
      },
      body: JSON.stringify({
        model: "accounts/fireworks/models/gpt-oss-20b",
        max_tokens: 2000,
        top_p: 1,
        top_k: 40,
        presence_penalty: 0,
        frequency_penalty: 0,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: planningPrompt
          }
        ]
      })
    });

    if (!planningResponse.ok) {
      throw new Error(`Fireworks API error: ${planningResponse.status} ${planningResponse.statusText}`);
    }

    const planningCompletion = await planningResponse.json();
    
    // Preprocess the planning response to handle markdown-formatted JSON
    let planningContent = planningCompletion.choices[0].message.content
    console.log('🔍 Raw planning response:', planningContent.substring(0, 200) + '...')
    console.log('🔍 Raw planning response contains ```json:', planningContent.includes('```json'))
    console.log('🔍 Raw planning response contains ```:', planningContent.includes('```'))
    
    // Remove markdown code blocks if present
    if (planningContent.includes('```json')) {
      console.log('🔄 Detected markdown-formatted JSON in planning response, extracting content...')
      const jsonMatch = planningContent.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        planningContent = jsonMatch[1].trim()
        console.log('✅ Extracted JSON from markdown code block in planning response')
      } else {
        console.log('⚠️ Could not extract JSON from markdown, trying fallback...')
        const fallbackMatch = planningContent.match(/```\s*([\s\S]*?)\s*```/)
        if (fallbackMatch) {
          planningContent = fallbackMatch[1].trim()
          console.log('✅ Extracted content from generic code block in planning response')
        }
      }
    } else if (planningContent.includes('```')) {
      console.log('🔄 Detected generic markdown code block in planning response, extracting content...')
      const fallbackMatch = planningContent.match(/```\s*([\s\S]*?)\s*```/)
      if (fallbackMatch) {
        planningContent = fallbackMatch[1].trim()
        console.log('✅ Extracted content from generic code block in planning response')
      }
    }
    
    console.log('🔍 Processed planning response:', planningContent.substring(0, 200) + '...')
    
    let requirementsAnalysis
    try {
      requirementsAnalysis = JSON.parse(planningContent)
    } catch (parseError) {
      console.error('❌ JSON parsing failed for planning response:', parseError.message)
      console.error('❌ Failed to parse this content:', planningContent.substring(0, 500) + '...')
      throw parseError
    }
    
    // Extract token usage from Fireworks API response
    const tokenUsage = {
      prompt_tokens: planningCompletion.usage?.prompt_tokens || 0,
      completion_tokens: planningCompletion.usage?.completion_tokens || 0,
      total_tokens: planningCompletion.usage?.total_tokens || 0,
      model: "gpt-oss-20b"
    }
    
    console.log("Requirements analysis completed:", {
      frontend_type: requirementsAnalysis.frontend_type,
      docAPIs: requirementsAnalysis.docAPIs,
      webPageData: requirementsAnalysis.webPageData,
      ext_name: requirementsAnalysis.ext_name,
      ext_description: requirementsAnalysis.ext_description
    })

    return {
      success: true,
      requirements: requirementsAnalysis,
      tokenUsage: tokenUsage
    }

  } catch (error) {
    console.error("Error in requirements analysis:", error)
    throw error
  }
}

/**
 * Generates Chrome extension code using the specified coding prompt
 * @param {string} codingPrompt - The coding prompt to use
 * @param {Object} replacements - Object containing placeholder replacements
 * @param {boolean} stream - Whether to stream the response
 * @returns {Promise<Object>} Generated extension code and metadata
 */
async function generateExtensionCode(codingPrompt, replacements, stream = false) {
  console.log("Generating extension code using coding prompt...")
  
  // Replace placeholders in the coding prompt
  let finalPrompt = codingPrompt
  for (const [placeholder, value] of Object.entries(replacements)) {
    console.log(`Replacing ${placeholder} with ${value}`)
    finalPrompt = finalPrompt.replace(new RegExp(`{${placeholder}}`, 'g'), value)
  }

  const requestConfig = {
    model: "gpt-4o",
    messages: [
      { role: "user", content: finalPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "extension_implementation",
        schema: {
          type: "object",
          properties: {
            explanation: { type: "string" },
            "manifest.json": {
              oneOf: [{ type: "string" }, { type: "object" }],
            },
            "background.js": { type: "string" },
            "content.js": { type: "string" },
            "popup.html": { type: "string" },
            "popup.js": { type: "string" },
            "sidepanel.html": { type: "string" },
            "sidepanel.js": { type: "string" },
            "styles.css": { type: "string" },
            "stagehand_script": { type: "string" }
          },
          required: ["explanation"],
        },
      },
    },
    temperature: 0.2,
    max_tokens: 15000,
  }

  if (stream) {
    requestConfig.stream = true
  }

  const codingCompletion = await openai.chat.completions.create(requestConfig)

  return codingCompletion
}

/**
 * Generates Chrome extension code with streaming support
 * @param {string} codingPrompt - The coding prompt to use
 * @param {Object} replacements - Object containing placeholder replacements
 * @returns {AsyncGenerator} Stream of thinking and code generation
 */
async function* generateExtensionCodeStream(codingPrompt, replacements) {
  console.log("Generating extension code with streaming...")
  
  // Replace placeholders in the coding prompt
  let finalPrompt = codingPrompt
  for (const [placeholder, value] of Object.entries(replacements)) {
    console.log(`Replacing ${placeholder} with ${value}`)
    finalPrompt = finalPrompt.replace(new RegExp(`{${placeholder}}`, 'g'), value)
  }

  // First, generate thinking/explanation using OpenAI and stream it
  const thinkingStream = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { 
        role: "system", 
        content: "You are an expert Chrome extension developer. Think through the user's request step by step, explaining your approach and reasoning. Be concise but thorough in your thinking process." 
      },
      { role: "user", content: `Think through this request: ${finalPrompt}` },
    ],
    stream: true,
    temperature: 0.3,
    max_tokens: 1000,
  })

  let thinkingContent = ""
  for await (const chunk of thinkingStream) {
    const content = chunk.choices[0]?.delta?.content || ""
    if (content) {
      thinkingContent += content
      // Stream the actual thinking content as it comes from OpenAI
      yield { type: "thinking", content: content }
    }
  }

  // Generate a quick summary using Fireworks API (gpt-oss-20b)
  let thinkingSummary = ""
  try {
    const summaryResponse = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.FIREWORKS_API_KEY}`
      },
      body: JSON.stringify({
        model: "accounts/fireworks/models/gpt-oss-20b",
        max_tokens: 400,
        top_p: 1,
        top_k: 40,
        presence_penalty: 0,
        frequency_penalty: 0,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: "You are a Chrome extension development assistant. Provide a brief, clear summary of the development approach and key decisions in 1-2 sentences. Keep it concise and user-friendly. Always complete your sentences."
          },
          {
            role: "user",
            content: `Summarize this development thinking in 1-2 sentences: ${thinkingContent}`
          }
        ]
      })
    });

    if (summaryResponse.ok) {
      const summaryCompletion = await summaryResponse.json();
      thinkingSummary = summaryCompletion.choices[0]?.message?.content || "Planning complete"
      console.log("🔥 Fireworks summary generated:", thinkingSummary)
    } else {
      console.error("❌ Fireworks API error:", summaryResponse.status, summaryResponse.statusText)
      thinkingSummary = "Planning complete"
    }
  } catch (error) {
    console.error("Error generating thinking summary:", error)
    thinkingSummary = "Planning complete"
  }

  // Stream the summary when thinking is complete
  yield { type: "thinking_complete", content: thinkingSummary }
  // Also emit a planning phase summary for the UI phases view
  yield { type: "phase", phase: "planning", content: thinkingSummary }
  yield { type: "generating_code", content: "Now generating the extension code..." }

  const codeStream = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "user", content: finalPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "extension_implementation",
        schema: {
          type: "object",
          properties: {
            explanation: { type: "string" },
            "manifest.json": {
              oneOf: [{ type: "string" }, { type: "object" }],
            },
            "background.js": { type: "string" },
            "content.js": { type: "string" },
            "popup.html": { type: "string" },
            "popup.js": { type: "string" },
            "sidepanel.html": { type: "string" },
            "sidepanel.js": { type: "string" },
            "styles.css": { type: "string" },
            "stagehand_script": { type: "string" }
          },
          required: ["explanation"],
        },
      },
    },
    stream: true,
    temperature: 0.2,
    max_tokens: 15000,
  })

  let codeContent = ""
  for await (const chunk of codeStream) {
    const content = chunk.choices[0]?.delta?.content || ""
    if (content) {
      codeContent += content
      yield { type: "code", content: content }
    }
  }

  yield { type: "complete", content: codeContent }
  // Emit implementing phase completion summary
  yield { type: "phase", phase: "implementing", content: "Implementation complete: generated extension artifacts and updated the project." }
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
export async function generateExtension({
  featureRequest,
  requestType = REQUEST_TYPES.NEW_EXTENSION,
  sessionId,
  existingFiles = {},
  userProvidedUrl = null,
  skipScraping = false,
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
      console.log("📁 Including existing files context for modification")
      replacements.existing_files = JSON.stringify(existingFiles, null, 2)
      console.log(`📋 Context includes ${Object.keys(existingFiles).length} existing files: ${Object.keys(existingFiles).join(', ')}`)
      console.log("🔍 LLM will receive full existing code context for modification")
    }
    
    console.log("🚀 Starting code generation with selected prompt...")
    const codingCompletion = await generateExtensionCode(selectedCodingPrompt, replacements)

    console.log("Code generation completed")

    // Preprocess the AI response to handle markdown-formatted JSON
    let aiResponse = codingCompletion.choices[0].message.content
    console.log('🔍 Raw AI response:', aiResponse.substring(0, 200) + '...')
    console.log('🔍 Raw AI response contains ```json:', aiResponse.includes('```json'))
    console.log('🔍 Raw AI response contains ```:', aiResponse.includes('```'))
    console.log('🔍 Raw AI response starts with:', aiResponse.substring(0, 50))
    
    // Remove markdown code blocks if present
    if (aiResponse.includes('```json')) {
      console.log('🔄 Detected markdown-formatted JSON, extracting content...')
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        aiResponse = jsonMatch[1].trim()
        console.log('✅ Extracted JSON from markdown code block')
      } else {
        console.log('⚠️ Could not extract JSON from markdown, trying fallback...')
        // Fallback: try to find JSON between ``` blocks
        const fallbackMatch = aiResponse.match(/```\s*([\s\S]*?)\s*```/)
        if (fallbackMatch) {
          aiResponse = fallbackMatch[1].trim()
          console.log('✅ Extracted content from generic code block')
        }
      }
    } else if (aiResponse.includes('```')) {
      console.log('🔄 Detected generic markdown code block, extracting content...')
      const fallbackMatch = aiResponse.match(/```\s*([\s\S]*?)\s*```/)
      if (fallbackMatch) {
        aiResponse = fallbackMatch[1].trim()
        console.log('✅ Extracted content from generic code block')
      }
    }
    
    console.log('🔍 Processed AI response:', aiResponse.substring(0, 200) + '...')
    
    let implementationResult
    try {
      implementationResult = JSON.parse(aiResponse)
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError.message)
      console.error('❌ Failed to parse this content:', aiResponse.substring(0, 500) + '...')
      throw parseError
    }

    console.log("Implementation result received:", {
      allKeys: Object.keys(implementationResult),
      files: Object.keys(implementationResult).filter((key) => key !== "explanation"),
    })

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

    // Validate file contents are strings (except for special non-string keys)
    for (const [filename, content] of Object.entries(filesOnly)) {
      if (filename === "manifest.json" && typeof content === "object") {
        // Convert manifest.json object to JSON string
        filesOnly[filename] = JSON.stringify(content, null, 2)
        console.log(`Converted manifest.json from object to JSON string`)
      } else if (nonStringKeys.includes(filename)) {
        // Skip validation for non-string keys like stagehand_commands
        console.log(`Skipping string validation for ${filename} (expected ${typeof content})`)
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
    console.log('Coding completion usage:', codingCompletion.usage)
    
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

    // Update project's has_generated_code flag in Supabase
    try {
      if (sessionId) {
        console.log(`🔧 Updating project ${sessionId} has_generated_code = true`)
        const supabase = createClient()
        
        const { error: updateError } = await supabase
          .from('projects')
          .update({ has_generated_code: true })
          .eq('id', sessionId)
        
        if (updateError) {
          console.error('❌ Error updating project has_generated_code:', updateError)
        } else {
          console.log('✅ Project has_generated_code updated successfully')
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
 * Streaming version of generateExtension that yields thinking and code generation in real-time
 * @param {Object} params - Function parameters
 * @param {string} params.featureRequest - User's feature request description
 * @param {string} params.requestType - Type of request (new extension, add to existing, etc.)
 * @param {string} params.sessionId - Session/project identifier
 * @param {Object} params.existingFiles - Existing extension files (for add-to-existing requests)
 * @param {string} params.userProvidedUrl - User-provided URL for website analysis
 * @returns {AsyncGenerator} Stream of thinking and code generation
 */
export async function* generateExtensionStream({
  featureRequest,
  requestType = REQUEST_TYPES.NEW_EXTENSION,
  sessionId,
  existingFiles = {},
  userProvidedUrl = null,
  skipScraping = false,
}) {
  console.log(`Streaming request type: ${requestType}`)

  try {
    let requirementsAnalysis
    let planningTokenUsage

    // Step 1: Analyze requirements based on request type
    if (requestType === REQUEST_TYPES.NEW_EXTENSION) {
      console.log("🆕 New extension request - analyzing requirements...")
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
      yield { type: "analysis_complete", content: requirementsAnalysis.ext_name }
      const analyzingSummaryExisting = `Will modify "${requirementsAnalysis.ext_name}" (${requirementsAnalysis.ext_description}).`
      yield { type: "phase", phase: "analyzing", content: analyzingSummaryExisting }
    } else {
      throw new Error(`Request type ${requestType} not yet implemented`)
    }

    // Check if URL is required but not provided
    if (requirementsAnalysis.webPageData && requirementsAnalysis.webPageData.length > 0 && !userProvidedUrl && !skipScraping) {
      console.log("🔗 URL required for scraping - showing modal to user")
      yield { type: "requires_url", content: "This extension would benefit from analyzing specific website structure. Please choose how you'd like to proceed." }
      return
    }

    // Step 2: Fetch Chrome API documentation for required APIs
    let chromeApiDocumentation = ""
    if (requirementsAnalysis.docAPIs && requirementsAnalysis.docAPIs.length > 0) {
      console.log("Fetching Chrome API documentation for:", requirementsAnalysis.docAPIs)
      yield { type: "fetching_apis", content: "fetching_apis" }
      yield { type: "phase", phase: "planning", content: `Gathering docs for: ${requirementsAnalysis.docAPIs.join(', ')}` }
      
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
      yield { type: "apis_ready", content: "apis_ready" }
      yield { type: "phase", phase: "planning", content: "Chrome API references ready for prompt conditioning." }
    }

    // Step 3: Scrape webpages for analysis if needed and URL is provided
    let scrapedWebpageAnalysis = null
    if (requirementsAnalysis.webPageData && requirementsAnalysis.webPageData.length > 0 && userProvidedUrl && !skipScraping) {
      console.log("🌐 Scraping webpage with user-provided URL:", userProvidedUrl)
      yield { type: "scraping", content: "scraping" }
      yield { type: "phase", phase: "planning", content: `Analyzing page structure at ${userProvidedUrl} for selectors and actions.` }
      
      scrapedWebpageAnalysis = await batchScrapeWebpages(
        requirementsAnalysis.webPageData, 
        userProvidedUrl
      )
      yield { type: "scraping_complete", content: "scraping_complete" }
      yield { type: "phase", phase: "planning", content: "Website structure analysis ready for code generation." }
    } else if (requirementsAnalysis.webPageData && requirementsAnalysis.webPageData.length > 0 && (skipScraping || !userProvidedUrl)) {
      console.log("⏸️ Skipping webpage scraping -", skipScraping ? "user opted out" : "no URL provided by user")
      scrapedWebpageAnalysis = '<!-- Website analysis skipped by user -->'
      yield { type: "scraping_skipped", content: "scraping_skipped" }
      yield { type: "phase", phase: "planning", content: "Skipping website analysis; proceeding with available context." }
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
      console.log(`🆕 Using ${requirementsAnalysis.frontend_type} coding prompt for new extension`)
      yield { type: "prompt_selected", content: "prompt_selected" }
      yield { type: "phase", phase: "planning", content: `Chose a ${requirementsAnalysis.frontend_type} implementation plan.` }
    }

    // Step 5: Generate extension code with streaming
    const replacements = {
      user_feature_request: featureRequest,
      ext_name: requirementsAnalysis.ext_name,
      ext_description: requirementsAnalysis.ext_description,
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
    for await (const chunk of generateExtensionCodeStream(selectedCodingPrompt, replacements)) {
      yield chunk
    }

    yield { type: "generation_complete", content: "generation_complete" }

  } catch (error) {
    console.error("Error in streaming extension generation:", error)
    yield { type: "error", content: `Error: ${error.message}` }
  }
}