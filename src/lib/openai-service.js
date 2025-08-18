import OpenAI from "openai"
import { REQUEST_TYPES } from "./prompts/old-prompts"
import { NEW_EXT_PLANNING_PROMPT } from "./prompts/planning"
import { 
  NEW_EXT_SIDEPANEL_PROMPT, 
  NEW_EXT_POPUP_PROMPT, 
  NEW_EXT_OVERLAY_PROMPT 
} from "./prompts/new-coding"
import { batchScrapeWebpages } from "./webpage-scraper"
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
 * Generates Chrome extension code using the specified coding prompt
 * @param {string} codingPrompt - The coding prompt to use
 * @param {Object} replacements - Object containing placeholder replacements
 * @returns {Promise<Object>} Generated extension code and metadata
 */
async function generateExtensionCode(codingPrompt, replacements) {
  console.log("Generating extension code using coding prompt...")
  
  // Replace placeholders in the coding prompt
  let finalPrompt = codingPrompt
  for (const [placeholder, value] of Object.entries(replacements)) {
    finalPrompt = finalPrompt.replace(new RegExp(`{${placeholder}}`, 'g'), value)
  }

  const codingCompletion = await openai.chat.completions.create({
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
          },
          additionalProperties: { type: "string" },
          required: ["explanation"],
        },
      },
    },
    temperature: 0.2,
    max_tokens: 15000,
  })

  console.log("Code generation completed")
  return codingCompletion
}

/**
 * Analyzes Chrome extension feature requests and creates structured implementation plans.
 * 
 * This function replaces the previous code generation approach with a planning-first approach
 * that analyzes requirements before implementation. It returns a structured plan including:
 * - Frontend type recommendation
 * - Required Chrome APIs
 * - Website analysis requirements  
 * - Extension naming and description
 * 
 * @param {Object} params - Function parameters
 * @param {string} params.featureRequest - User's feature request description
 * @param {string} params.requestType - Type of request (new extension, add to existing, etc.)
 * @param {string} params.sessionId - Session/project identifier
 * @param {Object} params.existingFiles - Existing extension files (for add-to-existing requests)
 * @param {string} params.userProvidedUrl - User-provided URL for website analysis
 * @returns {Object} Requirements analysis with structured plan
 */
export async function analyzeExtensionRequirements({
  featureRequest,
  requestType = REQUEST_TYPES.NEW_EXTENSION,
  sessionId,
  existingFiles = {},
  userProvidedUrl = null,
}) {
  console.log(`Starting requirements analysis for feature: ${featureRequest}`)
  console.log(`Request type: ${requestType}`)

  try {
    // First, call the planning prompt to analyze the request
    const planningPrompt = NEW_EXT_PLANNING_PROMPT.replace('{USER_REQUEST}', featureRequest)
    
    console.log("Calling planning prompt to analyze extension requirements...")
    
    const planningCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "user", content: planningPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "extension_planning",
          schema: {
            type: "object",
            properties: {
              frontend_type: { 
                type: "string", 
                enum: ["popup", "side_panel", "overlay"] 
              },
              docAPIs: { 
                type: "array", 
                items: { type: "string" } 
              },
              webPageData: { 
                type: "array", 
                items: { type: "string" }
              },
              ext_name: { type: "string" },
              ext_description: { type: "string" }
            },
            required: ["frontend_type", "docAPIs", "webPageData", "ext_name", "ext_description"],
          },
        },
      },
      temperature: 0.2,
      max_tokens: 2000,
    })

    const requirementsAnalysis = JSON.parse(planningCompletion.choices[0].message.content)
    
    console.log("Requirements analysis completed:", {
      frontend_type: requirementsAnalysis.frontend_type,
      docAPIs: requirementsAnalysis.docAPIs,
      webPageData: requirementsAnalysis.webPageData,
      ext_name: requirementsAnalysis.ext_name,
      ext_description: requirementsAnalysis.ext_description
    })

    // Step 1: Call searchChromeExtensionAPI for each of the APIs listed
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

    // Step 2: Call batchScrapeWebpages for webpage analysis
    const scrapedWebpageAnalysis = await batchScrapeWebpages(
      requirementsAnalysis.webPageData, 
      userProvidedUrl
    )

    // Step 3: Route to appropriate coding prompt based on frontend_type
    let selectedCodingPrompt = ""
    switch (requirementsAnalysis.frontend_type) {
      case "side_panel":
        selectedCodingPrompt = NEW_EXT_SIDEPANEL_PROMPT
        break
      case "popup":
        selectedCodingPrompt = NEW_EXT_POPUP_PROMPT
        break
      case "overlay":
      default:
        selectedCodingPrompt = NEW_EXT_OVERLAY_PROMPT
        break
    }

    // Step 4: Generate extension code using the dedicated method
    const codingCompletion = await generateExtensionCode(selectedCodingPrompt, {
      user_feature_request: featureRequest,
      ext_name: requirementsAnalysis.ext_name,
      ext_description: requirementsAnalysis.ext_description,
      chrome_api_documentation: chromeApiDocumentation || '<!-- No Chrome APIs required -->',
      scraped_webpage_analysis: scrapedWebpageAnalysis
    })

    console.log("Code generation completed")

    const implementationResult = JSON.parse(codingCompletion.choices[0].message.content)

    console.log("Implementation result received:", {
      explanation: implementationResult.explanation,
      allKeys: Object.keys(implementationResult),
      files: Object.keys(implementationResult).filter((key) => key !== "explanation"),
    })

    // Extract only the file contents, excluding explanation and any metadata
    const filesOnly = {}
    const excludedKeys = ["explanation", "properties", "required", "type", "schema"]

    for (const [key, value] of Object.entries(implementationResult)) {
      if (!excludedKeys.includes(key)) {
        filesOnly[key] = value
      }
    }

    console.log("Files to generate:", Object.keys(filesOnly))

    // Validate file contents are strings
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
    const totalUsage = {
      prompt_tokens: (planningCompletion.usage?.prompt_tokens || 0) + (codingCompletion.usage?.prompt_tokens || 0),
      completion_tokens: (planningCompletion.usage?.completion_tokens || 0) + (codingCompletion.usage?.completion_tokens || 0),
      total_tokens: (planningCompletion.usage?.total_tokens || 0) + (codingCompletion.usage?.total_tokens || 0),
      model: "gpt-4o"
    }

    console.log("Total token usage:", totalUsage)

    return {
      success: true,
      explanation: implementationResult.explanation,
      files: filesOnly,
      sessionId,
      tokenUsage: totalUsage
    }

  } catch (error) {
    console.error("Error in requirements analysis:", error)
    throw error
  }
}