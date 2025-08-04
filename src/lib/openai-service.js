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

async function scrapeWebsitesForExtension(featureRequest, userProvidedUrl = null) {
  // FIXME Mock implementation - in production this would scrape actual websites
  console.log("Mock scraping for:", featureRequest, userProvidedUrl)

  return {
    analysis: "Mock website analysis",
    totalSites: 1,
    successfulScrapes: 1,
    websites: [
      {
        siteName: "Example Site",
        url: userProvidedUrl || "https://example.com",
        title: "Example Website",
        description: "Mock website for testing",
        success: true,
        source: "mock",
        analysis: {
          cssSelectors: {
            recommendedSelectors: [".main-content", "#header", ".sidebar"],
            qualityScore: 85,
            recommendation: "Use .main-content for primary injection",
          },
          actionableElements: {
            totalFound: 5,
            types: ["button", "input", "link"],
            elements: [
              {
                type: "button",
                text: "Click me",
                suggested_selectors: [".btn-primary", 'button[type="submit"]'],
              },
            ],
          },
          scrapeability: {
            confidence: "high",
            hasReliableSelectors: true,
            hasActionableElements: true,
          },
        },
      },
    ],
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

    // Choose the appropriate system prompt based on request type
    const systemPrompt =
      requestType === REQUEST_TYPES.ADD_TO_EXISTING ? ADD_TO_EXISTING_SYSTEM_PROMPT : CODEGEN_SYSTEM_PROMPT

    console.log(`Using ${requestType === REQUEST_TYPES.ADD_TO_EXISTING ? "ADD_TO_EXISTING" : "CODEGEN"} system prompt`)

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

    // Handle function calls if any
    let finalResult = codingCompletion.choices[0].message
    let toolCallsMade = false
    let messages = null

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
          console.log("Processing searchChromeExtensionAPI tool call for ", args.apiName)
          const args = JSON.parse(toolCall.function.arguments)
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
          const scrapingResult = await scrapeWebsitesForExtension(args.featureRequest)

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

    return {
      success: true,
      explanation: implementationResult.explanation,
      files: filesOnly,
      sessionId,
    }
  } catch (error) {
    console.error("Error in code generation:", error)
    throw error
  }
}
