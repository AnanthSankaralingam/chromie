import OpenAI from "openai"
import { CODEGEN_SYSTEM_PROMPT, ADD_TO_EXISTING_SYSTEM_PROMPT, REQUEST_TYPES } from "./prompts"
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
    permissions: api.permissions,
    code_example: api.code_example,
    compatibility: api.compatibility,
    manifest_version: api.manifest_version,
  }
}

// Import the real scraper implementation
const { scrapeWebsitesForExtension: realScrapeWebsitesForExtension } = require('./webpage-scraper')

async function scrapeWebsitesForExtension(featureRequest, userProvidedUrl = null) {
  // Use the real Playwright-based scraper
  console.log("Using real scraper for:", featureRequest, userProvidedUrl)
  
  try {
    const result = await realScrapeWebsitesForExtension(featureRequest, userProvidedUrl)
    
    // Only log completion stats if scraping was actually completed
    if (result.requiresUrlPrompt) {
      console.log("URL prompt required for scraping")
    } else {
      console.log(`Real scraping completed: ${result.successfulScrapes}/${result.totalSites} sites scraped successfully`)
    }
    
    return result
  } catch (error) {
    console.error("Real scraping failed, falling back to basic response:", error.message)
    
    // Fallback response if scraping fails completely
    return {
      analysis: `Scraping failed: ${error.message}. Using generic selectors for extension development.`,
      totalSites: 1,
      successfulScrapes: 0,
      websites: [
        {
          siteName: userProvidedUrl ? new URL(userProvidedUrl).hostname : "target-site",
          url: userProvidedUrl || "https://example.com",
          title: "Scraping Failed",
          description: "Unable to analyze website structure. Extension will use generic selectors.",
          success: false,
          source: "fallback",
          analysis: {
            cssSelectors: {
              recommendedSelectors: ["body", "main", ".content", "#main"],
              qualityScore: 30,
              recommendation: "Use generic selectors due to scraping failure",
            },
            actionableElements: {
              totalFound: 0,
              types: [],
              elements: [],
            },
            scrapeability: {
              confidence: "low",
              hasReliableSelectors: false,
              hasActionableElements: false,
            },
          },
        },
      ],
    }
  }
}

function buildDirectCodingPrompt({ extensionFiles, featureRequest, requestType, contextMessage }) {
  let prompt = `${contextMessage}\n\n`

  if (requestType === REQUEST_TYPES.ADD_TO_EXISTING && Object.keys(extensionFiles).length > 0) {
    prompt += `EXISTING EXTENSION FILES:\n`
    for (const [filename, content] of Object.entries(extensionFiles)) {
      prompt += `\n--- ${filename} ---\n${content}\n`
    }
    prompt += `\nEND OF EXISTING FILES\n\n`
  }

  prompt += `FEATURE REQUEST: ${featureRequest}\n\n`
  prompt += `Please implement this feature ${requestType === REQUEST_TYPES.ADD_TO_EXISTING ? "while preserving all existing functionality" : "as a new Chrome extension"}.`

  return prompt
}

export async function generateExtensionCode({
  featureRequest,
  requestType = REQUEST_TYPES.NEW_EXTENSION,
  sessionId,
  existingFiles = {},
  userProvidedUrl = null,
}) {
  console.log(`Starting code generation for feature: ${featureRequest}`)
  console.log(`Request type: ${requestType}`)

  try {
    // Handle new vs. existing extension
    let extensionFiles = {}
    let contextMessage = ""

    switch (requestType) {
      case REQUEST_TYPES.NEW_EXTENSION:
        console.log("Creating new extension from empty template...")
        extensionFiles = {}
        contextMessage = "Creating a new Chrome extension from scratch"
        break

      case REQUEST_TYPES.ADD_TO_EXISTING:
        console.log("Adding to existing extension...")
        extensionFiles = existingFiles
        contextMessage = "Adding new features to the existing Chrome extension while preserving current functionality"
        break

      default:
        extensionFiles = existingFiles
        contextMessage = "Processing feature request for Chrome extension"
        break
    }

    // Build the prompt
    const directPrompt = buildDirectCodingPrompt({
      extensionFiles,
      featureRequest,
      requestType,
      contextMessage,
    })

    // Choose the appropriate system prompt based on request type and existing files
    const hasExistingFiles = Object.keys(existingFiles).length > 0
    const systemPrompt =
      (requestType === REQUEST_TYPES.ADD_TO_EXISTING || hasExistingFiles) ? ADD_TO_EXISTING_SYSTEM_PROMPT : CODEGEN_SYSTEM_PROMPT

    console.log(`Using ${(requestType === REQUEST_TYPES.ADD_TO_EXISTING || hasExistingFiles) ? "ADD_TO_EXISTING" : "CODEGEN"} system prompt`)

    // Call OpenAI for direct implementation
    const codingCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: directPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "searchChromeExtensionAPI",
            description: "Search for Chrome Extension API documentation, permissions, and code examples by API name",
            parameters: {
              type: "object",
              properties: {
                apiName: {
                  type: "string",
                  description:
                    'The name of the Chrome Extension API to search for (e.g., "storage", "tabs", "notifications", "bookmarks")',
                },
              },
              required: ["apiName"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "scrapeWebsitesForExtension",
            description:
              "Scrape webpage content and structure to understand target websites for Chrome extension development",
            parameters: {
              type: "object",
              properties: {
                featureRequest: {
                  type: "string",
                  description:
                    "The feature request that may contain website references or require understanding of specific webpage structures",
                },
              },
              required: ["featureRequest"],
            },
          },
        },
      ],
      tool_choice: "auto",
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

    console.log("Direct code generation completed")

    // Extract token usage from first completion
    const firstUsage = codingCompletion.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }

    // Handle function calls if any
    let finalResult = codingCompletion.choices[0].message
    let toolCallsMade = false
    let messages = null
    let secondUsage = null

    // If there are tool calls, process them
    if (finalResult.tool_calls && finalResult.tool_calls.length > 0) {
      toolCallsMade = true
      console.log("Processing tool calls...")
      messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: directPrompt },
      ]

      // Add the assistant's message with tool calls
      messages.push(finalResult)

      // Process each tool call
      for (const toolCall of finalResult.tool_calls) {
        if (toolCall.function.name === "searchChromeExtensionAPI") {
          const args = JSON.parse(toolCall.function.arguments)
          console.log("Processing searchChromeExtensionAPI tool call for ", args.apiName)
          const apiResult = searchChromeExtensionAPI(args.apiName)

          // Add the tool result to messages
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(apiResult),
          })
        } else if (toolCall.function.name === "scrapeWebsitesForExtension") {
          const args = JSON.parse(toolCall.function.arguments)
          console.log("Processing scrapeWebsitesForExtension tool call...")
          const scrapingResult = await scrapeWebsitesForExtension(args.featureRequest, userProvidedUrl)

          // Check if URL prompting is required
          if (scrapingResult.requiresUrlPrompt) {
            console.log('URL prompting required - pausing generation');
            // Return a response asking the user for a URL
            return {
              success: false,
              requiresUrl: true,
              sessionId: sessionId,
              message: scrapingResult.message,
              detectedSites: scrapingResult.detectedSites || [],
              detectedUrls: scrapingResult.detectedUrls || [],
              featureRequest: featureRequest,
              requestType: requestType,
              // Store the current state for continuation
              toolCallState: {
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: directPrompt }
                ],
                pendingToolCall: toolCall
              }
            };
          }

          // Only log analysis if scraping was actually completed
          if (!scrapingResult.requiresUrlPrompt) {
            console.log('\n🔍 ===== SCRAPING CONTENT ANALYSIS =====');
            console.log(`📊 Summary: ${scrapingResult.successfulScrapes}/${scrapingResult.totalSites} sites scraped successfully`);
            
            scrapingResult.websites?.forEach((site, index) => {
              console.log(`\n📄 WEBSITE ${index + 1}: ${site.siteName}`);
              console.log(`🔗 URL: ${site.url}`);
              console.log(`✅ Success: ${site.success}`);
              console.log(`📏 Source: ${site.source}`);
              console.log(`📝 Title: ${site.title}`);
              console.log(`📄 Description: ${site.description?.substring(0, 100)}...`);
              
              if (site.success && site.analysis) {
                console.log(`\n🎯 CSS SELECTORS FOUND:`);
                console.log(`   - Recommended: [${site.analysis.cssSelectors.recommendedSelectors?.slice(0, 8).join(', ') || 'none'}]`);
                console.log(`   - Generic fallbacks: [${site.analysis.cssSelectors.genericSelectors?.slice(0, 5).join(', ') || 'none'}]`);
                console.log(`   - Quality score: ${site.analysis.cssSelectors.qualityScore}/100`);
                console.log(`   - Recommendation: ${site.analysis.cssSelectors.recommendation}`);
                
                console.log(`\n🎪 ACTIONABLE ELEMENTS:`);
                console.log(`   - Total found: ${site.analysis.actionableElements.totalFound}`);
                console.log(`   - Types: [${site.analysis.actionableElements.types?.join(', ') || 'none'}]`);
                site.analysis.actionableElements.elements?.slice(0, 5).forEach((element, i) => {
                  console.log(`   - ${i+1}. ${element.type}: "${element.text}" (confidence: ${element.confidence || 'medium'})`);
                });
                
                console.log(`\n🔧 INJECTION STRATEGY:`);
                console.log(`   - Primary method: ${site.analysis.injectionStrategy?.primaryMethod}`);
                console.log(`   - Fallback method: ${site.analysis.injectionStrategy?.fallbackMethod}`);
                console.log(`   - Confidence: ${site.analysis.injectionStrategy?.confidence}`);
                console.log(`   - Mutation observer needed: ${site.analysis.injectionStrategy?.mutationObserverRequired}`);
                
                console.log(`\n📊 SCRAPEABILITY ASSESSMENT:`);
                console.log(`   - Overall confidence: ${site.analysis.scrapeability.confidence}`);
                console.log(`   - Reliable selectors: ${site.analysis.scrapeability.hasReliableSelectors}`);
                console.log(`   - Actionable elements: ${site.analysis.scrapeability.hasActionableElements}`);
                console.log(`   - Overlay fallback available: ${site.analysis.scrapeability.overlayFallbackAvailable}`);
                
                // Show original content size if available
                if (site.originalContentLength) {
                  console.log(`\n📏 CONTENT SIZE: ${site.originalContentLength} characters of markdown extracted`);
                }
              } else {
                console.log(`\n❌ SCRAPING FAILED: ${site.description}`);
              }
            });
            
            console.log('\n🤖 SENDING TO LLM:');
            console.log(`📤 Full scraping data object size: ${JSON.stringify(scrapingResult).length} characters`);
            console.log('=====================================\n');
          }

          // Add the tool result to messages
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(scrapingResult),
          })
        }
      }
    }

    // Only make a second API call if a tool was actually called
    if (toolCallsMade) {
      // Log the exact content being sent to LLM
      console.log('\n📨 ===== CONTENT SENT TO LLM =====');
      messages.forEach((msg, index) => {
        if (msg.role === 'tool') {
          console.log(`\n🔧 TOOL RESPONSE ${index}:`);
          try {
            const toolContent = JSON.parse(msg.content);
            if (toolContent.websites) {
              console.log(`🌐 Website data for ${toolContent.websites.length} sites:`);
              toolContent.websites.forEach((site, siteIndex) => {
                console.log(`   ${siteIndex + 1}. ${site.siteName} (${site.url})`);
                if (site.analysis) {
                  console.log(`      - ${site.analysis.cssSelectors?.recommendedSelectors?.length || 0} CSS selectors`);
                  console.log(`      - ${site.analysis.actionableElements?.totalFound || 0} actionable elements`);
                  console.log(`      - Quality: ${site.analysis.cssSelectors?.qualityScore || 0}/100`);
                }
              });
            }
            console.log(`📏 Tool response size: ${msg.content.length} characters`);
          } catch (e) {
            console.log(`📦 Raw tool content: ${msg.content.substring(0, 200)}...`);
          }
        } else if (msg.role === 'system') {
          console.log(`🤖 System prompt: ${msg.content.substring(0, 100)}...`);
        } else if (msg.role === 'user') {
          console.log(`👤 User prompt: ${msg.content.substring(0, 100)}...`);
        }
      });
      console.log('================================\n');
      
      // Make a second API call with the updated context
      console.log("Making second API call with tool context...")
      const secondCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
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
      finalResult = secondCompletion.choices[0].message
      secondUsage = secondCompletion.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    }

    const implementationResult = JSON.parse(finalResult.content)

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
      prompt_tokens: firstUsage.prompt_tokens + (secondUsage?.prompt_tokens || 0),
      completion_tokens: firstUsage.completion_tokens + (secondUsage?.completion_tokens || 0),
      total_tokens: firstUsage.total_tokens + (secondUsage?.total_tokens || 0),
      model: "gpt-4o"
    }

    console.log("Token usage:", totalUsage)

    return {
      success: true,
      explanation: implementationResult.explanation,
      files: filesOnly,
      sessionId,
      tokenUsage: totalUsage
    }
  } catch (error) {
    console.error("Error in code generation:", error)
    throw error
  }
}
