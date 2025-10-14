import { REQUEST_TYPES } from "../prompts/request-types";
import { NEW_EXT_GENERIC_PROMPT } from "../prompts/new-extension/generic";
import { NEW_EXT_OVERLAY_PROMPT } from "../prompts/new-extension/overlay";
import { NEW_EXT_POPUP_PROMPT } from "../prompts/new-extension/popup";
import { NEW_EXT_SIDEPANEL_PROMPT } from "../prompts/new-extension/sidepanel";
import { UPDATE_EXT_PROMPT } from "../prompts/followup/generic-no-diffs";
import { batchScrapeWebpages } from "../webpage-scraper";
import { analyzeExtensionRequirementsStream } from "./preprocessing";
import { generateExtensionCodeStream } from "./generate-extension-code-stream";

const chromeApisData = require('../chrome_extension_apis.json');
const workspaceApisData = require('../google_workspace_apis.json');

function searchChromeExtensionAPI(apiName) {
  if (!apiName || typeof apiName !== "string") {
    return {
      error: "Invalid API name provided. Please provide a valid string.",
      available_apis: chromeApisData.chrome_extension_apis.apis.map((api) => api.name),
    };
  }

  const searchTerm = apiName.toLowerCase().trim();

  // Search for exact match first
  let api = chromeApisData.chrome_extension_apis.apis.find((api) => api.name.toLowerCase() === searchTerm);

  // If no exact match, search for partial matches
  if (!api) {
    api = chromeApisData.chrome_extension_apis.apis.find(
      (api) => api.name.toLowerCase().includes(searchTerm) || api.namespace.toLowerCase().includes(searchTerm),
    );
  }

  if (!api) {
    return {
      error: `API "${apiName}" not found.`,
      available_apis: chromeApisData.chrome_extension_apis.apis.map((api) => api.name),
      total_apis: chromeApisData.chrome_extension_apis.metadata.total_apis,
      categories: chromeApisData.chrome_extension_apis.metadata.categories,
    };
  }

  return {
    name: api.name,
    namespace: api.namespace,
    description: api.description,
    code_example: api.code_example,
    compatibility: api.compatibility,
  };
}

function searchGoogleWorkspaceAPI(apiName) {
  if (!apiName || typeof apiName !== "string") {
    return {
      error: "Invalid API name provided. Please provide a valid string.",
      available_apis: workspaceApisData.google_workspace_apis.apis.map((api) => api.service),
    };
  }

  const searchTerm = apiName.toLowerCase().trim();

  // Search for exact match by service name first
  let api = workspaceApisData.google_workspace_apis.apis.find((api) => api.service.toLowerCase() === searchTerm);

  // If no exact match, search by name
  if (!api) {
    api = workspaceApisData.google_workspace_apis.apis.find((api) => api.name.toLowerCase().includes(searchTerm));
  }

  if (!api) {
    return {
      error: `Google Workspace API "${apiName}" not found.`,
      available_apis: workspaceApisData.google_workspace_apis.apis.map((api) => api.service),
      total_apis: workspaceApisData.google_workspace_apis.metadata.total_apis,
      categories: workspaceApisData.google_workspace_apis.metadata.categories,
    };
  }

  return {
    name: api.name,
    service: api.service,
    description: api.description,
    authentication: api.authentication,
    common_use_cases: api.common_use_cases,
    code_example: api.code_example,
    key_methods: api.key_methods,
  };
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
  initialRequirementsAnalysis = null, // New parameter to preserve state
  initialPlanningTokenUsage = null, // New parameter to preserve state
}) {
  try {
    let requirementsAnalysis = initialRequirementsAnalysis; // Use initial if provided
    let planningTokenUsage = initialPlanningTokenUsage; // Use initial if provided

    // Step 1: Analyze requirements based on request type
    if (initialRequirementsAnalysis && initialPlanningTokenUsage) {
      // If initial analysis is provided, we're resuming after a URL prompt
      requirementsAnalysis = initialRequirementsAnalysis;
      planningTokenUsage = initialPlanningTokenUsage;
      yield {
        type: "analyzing",
        content: "resuming_analysis"
      }; // Indicate we're continuing
      yield {
        type: "phase",
        phase: "analyzing",
        content: "Resuming generation with prior analysis."
      };
      yield {
        type: "analysis_complete",
        content: requirementsAnalysis.frontend_type
      };
      const analyzingSummary = `Resumed: Identified a ${requirementsAnalysis.frontend_type} UI with ${(requirementsAnalysis.docAPIs || []).length} Chrome APIs and ${
        requirementsAnalysis.webPageData && requirementsAnalysis.webPageData.length > 0
          ? "site analysis required"
          : "no site analysis needed"
      }.`;
      yield {
        type: "phase",
        phase: "analyzing",
        content: analyzingSummary
      };
    } else if (requestType === REQUEST_TYPES.NEW_EXTENSION) {
      yield {
        type: "analyzing",
        content: "analyzing"
      };
      // Emit an analyzing phase summary stub; UI can show/update as details emerge
      yield {
        type: "phase",
        phase: "analyzing",
        content: "Understanding your requirements and constraints to scope the extension.",
      };

      // Use streaming analysis to get both thinking content and requirements
      for await (const chunk of analyzeExtensionRequirementsStream({
        featureRequest
      })) {
        if (chunk.type === "thinking" || chunk.type === "thinking_complete") {
          // Forward the thinking content directly from the planning stream
          yield chunk;
        } else if (chunk.type === "planning_progress") {
          // Forward planning progress updates to the UI
          yield chunk;
        } else if (chunk.type === "analysis_complete") {
          requirementsAnalysis = chunk.requirements;
          planningTokenUsage = chunk.tokenUsage;
          yield {
            type: "analysis_complete",
            content: requirementsAnalysis.frontend_type
          };
        } else if (chunk.type === "error") {
          yield chunk;
          return;
        }
      }

      // Provide a more specific analyzing summary now that analysis is complete
      const analyzingSummary = `Identified a ${requirementsAnalysis.frontend_type} UI with ${(requirementsAnalysis.docAPIs || []).length} Chrome APIs and ${
        requirementsAnalysis.webPageData && requirementsAnalysis.webPageData.length > 0
          ? "site analysis required"
          : "no site analysis needed"
      }.`;
      yield {
        type: "phase",
        phase: "analyzing",
        content: analyzingSummary
      };
    } else if (requestType === REQUEST_TYPES.ADD_TO_EXISTING) {
      console.log("🔧 Add to existing extension request - analyzing existing code...");
      yield {
        type: "analyzing",
        content: "analyzing"
      };
      yield {
        type: "phase",
        phase: "analyzing",
        content: "Reviewing current extension files to determine safe changes.",
      };

      // For existing extensions, create a simplified requirements analysis
      requirementsAnalysis = {
        frontend_type: "generic", // Will be determined from existing files
        docAPIs: [], // Will be determined from existing code
        webPageData: null, // Usually not needed for modifications
        ext_name: "Existing Extension", // Will be updated from manifest
      };

      // Extract extension info from existing manifest if available
      if (existingFiles['manifest.json']) {
        try {
          const manifest = JSON.parse(existingFiles['manifest.json']);
          if (manifest.name) requirementsAnalysis.ext_name = manifest.name;
        } catch (e) {
          console.warn('Could not parse existing manifest.json:', e.message);
        }
      }

      // No planning tokens for modifications
      planningTokenUsage = {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        model: "none"
      };
      yield {
        type: "analysis_complete",
        content: requirementsAnalysis.ext_name
      };
      const analyzingSummaryExisting = `Will modify "${requirementsAnalysis.ext_name}".`;
      yield {
        type: "phase",
        phase: "analyzing",
        content: analyzingSummaryExisting
      };
    } else {
      throw new Error(`Request type ${requestType} not yet implemented`);
    }

    // Halt code generation if a URL is required for scraping but hasn't been provided.
    // The UI will use this signal to prompt the user for a URL.
    if (
      requirementsAnalysis.webPageData &&
      requirementsAnalysis.webPageData.length > 0 &&
      !userProvidedUrl &&
      !skipScraping
    ) {
      console.log('🚫 URL required for scraping but not provided - halting code generation (streaming)')
      console.log('📋 Detected sites:', requirementsAnalysis.webPageData)
      console.log('📋 userProvidedUrl:', userProvidedUrl)
      console.log('📋 skipScraping:', skipScraping)
      
      yield {
        type: "requires_url",
        content: "This extension would benefit from analyzing specific website structure. Please provide a URL or choose to skip.",
        detectedSites: requirementsAnalysis.webPageData,
        detectedUrls: requirementsAnalysis.webPageData.map((site) => `https://${site}`),
        // Pass back analysis data for subsequent calls
        analysisData: {
          requirements: requirementsAnalysis,
          tokenUsage: planningTokenUsage,
        },
      };
      
      console.log('🛑 Returning from generator - should stop code generation')
      return; // Stop the generator until the user provides a URL.
    }
    
    console.log('✅ No URL required or URL already provided - continuing with code generation')

    // Step 2: Fetch Chrome API documentation for required APIs
    let chromeApiDocumentation = "";
    if (requirementsAnalysis.chromeAPIs && requirementsAnalysis.chromeAPIs.length > 0) {
      yield {
        type: "fetching_apis",
        content: "fetching_apis"
      };
      yield {
        type: "phase",
        phase: "planning",
        content: `Gathering docs for: ${requirementsAnalysis.chromeAPIs.join(", ")}`,
      };
      yield {
        type: "planning_progress",
        phase: "documentation",
        content: `Fetching documentation for ${requirementsAnalysis.chromeAPIs.length} Chrome APIs...`,
      };

      const apiDocs = [];

      for (let i = 0; i < requirementsAnalysis.chromeAPIs.length; i++) {
        const apiName = requirementsAnalysis.chromeAPIs[i];
        yield {
          type: "planning_progress",
          phase: "documentation",
          content: `Fetching documentation for chrome.${apiName} API...`,
        };

        const apiResult = searchChromeExtensionAPI(apiName);
        if (!apiResult.error) {
          apiDocs.push(`
## ${apiResult.name} API
Namespace: ${apiResult.namespace || "Unknown"}
Description: ${apiResult.description || "No description available"}
Permissions: ${
            Array.isArray(apiResult.permissions)
              ? apiResult.permissions.join(", ")
              : apiResult.permissions || "None required"
          }
Code Example:
\`\`\`javascript
${apiResult.code_example?.code || apiResult.code_example || "No example provided"}
\`\`\`
`);
        } else {
          apiDocs.push(`
## ${apiName} API
Error: ${apiResult.error}
Available APIs: ${apiResult.available_apis?.slice(0, 10).join(", ")}...
`);
        }
      }

      chromeApiDocumentation = apiDocs.join("\n\n");
      yield {
        type: "apis_ready",
        content: "apis_ready"
      };
      yield {
        type: "phase",
        phase: "planning",
        content: "Chrome API references ready for prompt conditioning.",
      };
      yield {
        type: "planning_progress",
        phase: "documentation",
        content: "Chrome API documentation gathered successfully.",
      };
    }

    // Step 2b: Fetch Google Workspace API documentation for required APIs
    let workspaceApiDocumentation = "";
    if (requirementsAnalysis.workspaceAPIs && requirementsAnalysis.workspaceAPIs.length > 0) {
      yield {
        type: "fetching_apis",
        content: "fetching_workspace_apis"
      };
      yield {
        type: "phase",
        phase: "planning",
        content: `Gathering Google Workspace API docs for: ${requirementsAnalysis.workspaceAPIs.join(", ")}`,
      };
      yield {
        type: "planning_progress",
        phase: "documentation",
        content: `Fetching documentation for ${requirementsAnalysis.workspaceAPIs.length} Google Workspace APIs...`,
      };

      const workspaceApiDocs = [];

      for (let i = 0; i < requirementsAnalysis.workspaceAPIs.length; i++) {
        const apiName = requirementsAnalysis.workspaceAPIs[i];
        yield {
          type: "planning_progress",
          phase: "documentation",
          content: `Fetching documentation for Google ${apiName} API...`,
        };

        const apiResult = searchGoogleWorkspaceAPI(apiName);
        if (!apiResult.error) {
          workspaceApiDocs.push(`
## ${apiResult.name}
Service: ${apiResult.service}
Description: ${apiResult.description || "No description available"}

Authentication: ${apiResult.authentication?.method || "OAuth 2.0"}
Required Scopes:
${apiResult.authentication?.scopes?.map(scope => `- ${scope}`).join("\n") || "- No scopes required"}

Common Use Cases:
${apiResult.common_use_cases?.map(useCase => `- ${useCase}`).join("\n") || "- General API access"}

Key Methods:
${apiResult.key_methods?.map(method => `- ${method}`).join("\n") || "- See documentation"}

Code Example:
\`\`\`javascript
${apiResult.code_example?.code || "No example provided"}
\`\`\`

Note: This API requires OAuth 2.0 authentication using chrome.identity API.
Include "identity" in Chrome API permissions and configure OAuth in manifest.json.
`);
        } else {
          workspaceApiDocs.push(`
## ${apiName} API
Error: ${apiResult.error}
Available APIs: ${apiResult.available_apis?.join(", ")}...
`);
        }
      }

      // Add OAuth configuration instructions at the beginning
      const oauthClientId = process.env.CHROMIE_OAUTH_CLIENT_ID || "CHROMIE_SHARED_CLIENT_ID.apps.googleusercontent.com";
      const oauthSetupInstructions = `
## 🔐 OAuth Configuration for Google Workspace APIs

**IMPORTANT: Use Chromie's Shared OAuth Client ID**

For the manifest.json, configure OAuth as follows:

\`\`\`json
{
  "oauth2": {
    "client_id": "${oauthClientId}",
    "scopes": [/* include required scopes below */]
  },
  "permissions": ["identity"],
  "host_permissions": ["https://www.googleapis.com/*"]
}
\`\`\`

This extension is pre-configured with Chromie's shared OAuth credentials and will work immediately for users!
Users just need to load the extension and click "Sign in with Google" - no setup required.

Required Scopes (include all that apply):
${workspaceApiDocs.map(doc => {
  const apiMatch = doc.match(/Service: (\w+)/);
  const scopesMatch = doc.match(/Required Scopes:\n((?:- https:\/\/[^\n]+\n?)+)/);
  if (apiMatch && scopesMatch) {
    return `\n// For ${apiMatch[1]} API:\n${scopesMatch[1]}`;
  }
  return '';
}).filter(Boolean).join('\n')}

`;

      workspaceApiDocumentation = oauthSetupInstructions + "\n\n---\n\n" + workspaceApiDocs.join("\n\n");
      yield {
        type: "workspace_apis_ready",
        content: "workspace_apis_ready"
      };
      yield {
        type: "phase",
        phase: "planning",
        content: "Google Workspace API references ready for prompt conditioning.",
      };
      yield {
        type: "planning_progress",
        phase: "documentation",
        content: "Google Workspace API documentation gathered successfully.",
      };
    }

    // Step 3: Scrape webpages for analysis if needed (now with simplified logic)
    let scrapedWebpageAnalysis = null;
    if (requirementsAnalysis.webPageData && requirementsAnalysis.webPageData.length > 0) {
      if (userProvidedUrl && !skipScraping) {
        // Condition to perform scraping is met
        yield {
          type: "scraping",
          content: "scraping"
        };
        yield {
          type: "phase",
          phase: "planning",
          content: `Analyzing page structure at ${userProvidedUrl} for selectors and actions.`,
        };
        yield {
          type: "planning_progress",
          phase: "scraping",
          content: `Scraping web structure for ${userProvidedUrl}...`,
        };

        scrapedWebpageAnalysis = await batchScrapeWebpages(
          requirementsAnalysis.webPageData,
          userProvidedUrl
        );

        yield {
          type: "scraping_complete",
          content: "scraping_complete"
        };
        yield {
          type: "phase",
          phase: "planning",
          content: "Website structure analysis ready for code generation.",
        };
        yield {
          type: "planning_progress",
          phase: "scraping",
          content: "Website analysis complete - extracted page structure and selectors.",
        };
      } else {
        // This block is reached if scraping is skipped
        scrapedWebpageAnalysis = '<!-- Website analysis skipped by user -->';
        yield {
          type: "scraping_skipped",
          content: "scraping_skipped"
        };
        yield {
          type: "phase",
          phase: "planning",
          content: "Skipping website analysis; proceeding with available context.",
        };
        yield {
          type: "planning_progress",
          phase: "scraping",
          content: "Skipping website analysis as requested.",
        };
      }
    } else {
      // No website analysis was ever needed
      scrapedWebpageAnalysis = '<!-- No specific websites targeted -->';
    }

    // Step 4: Select appropriate coding prompt based on request type and frontend type
    let selectedCodingPrompt = "";

    if (requestType === REQUEST_TYPES.ADD_TO_EXISTING) {
      // For modifications, use the specialized follow-up prompt with tool integration
      selectedCodingPrompt = UPDATE_EXT_PROMPT;
      console.log("🔧 Using specialized follow-up prompt for extension modification");
      yield {
        type: "prompt_selected",
        content: "prompt_selected"
      };
      yield {
        type: "phase",
        phase: "planning",
        content: "Selected a generic modification plan based on existing files.",
      };
    } else {
      // For new extensions, select based on frontend type
      switch (requirementsAnalysis.frontend_type) {
        case "side_panel":
          selectedCodingPrompt = NEW_EXT_SIDEPANEL_PROMPT;
          break;
        case "popup":
          selectedCodingPrompt = NEW_EXT_POPUP_PROMPT;
          break;
        case "overlay":
          selectedCodingPrompt = NEW_EXT_OVERLAY_PROMPT;
          break;
        case "generic":
          selectedCodingPrompt = NEW_EXT_GENERIC_PROMPT;
          break;
        default:
          selectedCodingPrompt = NEW_EXT_GENERIC_PROMPT;
          break;
      }
      yield {
        type: "prompt_selected",
        content: "prompt_selected"
      };
      yield {
        type: "phase",
        phase: "planning",
        content: `Chose a ${requirementsAnalysis.frontend_type} implementation plan.`,
      };
    }

    // Step 5: Generate extension code with streaming
    // Conditional prompt replacement: use enhanced_prompt if user prompt < 300 chars, otherwise use original
    const shouldUseEnhancedPrompt = featureRequest.length < 300 && requirementsAnalysis.enhanced_prompt;
    const finalUserPrompt = shouldUseEnhancedPrompt ? requirementsAnalysis.enhanced_prompt : featureRequest;
    console.log(
      `🎯 Using ${shouldUseEnhancedPrompt ? "enhanced" : "original"} prompt: ${finalUserPrompt.substring(
        0,
        150
      )}...`
    );

    const replacements = {
      user_feature_request: finalUserPrompt,
      ext_name: requirementsAnalysis.ext_name,
      chrome_api_documentation: chromeApiDocumentation || "",
      workspace_api_documentation: workspaceApiDocumentation || "",
      scraped_webpage_analysis: scrapedWebpageAnalysis,
    };

    // Add existing files context only if NOT using a previousResponseId
    if (!previousResponseId) {
      if (
        requestType === REQUEST_TYPES.ADD_TO_EXISTING &&
        Object.keys(existingFiles).length > 0
      ) {
        console.log("📁 Including existing files context for modification");
        const filteredFiles = {};
        for (const [filename, content] of Object.entries(existingFiles)) {
          if (!filename.match(/\.(png|jpg|jpeg|gif|svg|ico)$/i) && !filename.startsWith("icons/")) {
            filteredFiles[filename] = content;
          }
        }
        replacements.existing_files = JSON.stringify(filteredFiles, null, 2);
        console.log(
          `📋 Context includes ${
            Object.keys(filteredFiles).length
          } existing files (excluding icons): ${Object.keys(filteredFiles).join(", ")}`
        );
        yield {
          type: "context_ready",
          content: "context_ready"
        };
      } else {
        console.log("[generateChromeExtensionStream] no existing files context needed");
      }
    } else {
      console.log("[generateChromeExtensionStream] skipping existing files context due to previousResponseId");
    }

    console.log("🚀 Starting streaming code generation...");
    yield {
      type: "generation_starting",
      content: "generation_starting"
    };
    // Emit implementing phase start
    yield {
      type: "phase",
      phase: "implementing",
      content: "Generating extension files and applying project updates.",
    };

    // Use the streaming code generation (skip thinking phase since it was done in planning)
    for await (const chunk of generateExtensionCodeStream(
        selectedCodingPrompt,
        replacements,
        sessionId,
        true, {
          previousResponseId,
          conversationTokenTotal,
          modelOverride,
          contextWindowMaxTokens,
          frontendType: requirementsAnalysis.frontend_type,
          requestType: requestType,
        }
      )) {
      // If Gemini thinking stream is used upstream, chunk.type may be 'thinking'
      if (chunk?.type === "thinking") {
        // Pass through as-is to UI which already handles thinking buffer
        yield chunk;
      } else if (chunk?.type === "answer_chunk" || chunk?.type === "thinking_chunk") {
        // Normalize to existing types for UI: forward thinking_chunk as 'thinking_chunk'
        if (chunk.type === "thinking_chunk") {
          yield {
            type: "thinking_chunk",
            content: chunk.content
          };
        } else {
          // answer chunks will be concatenated in downstream parser
          yield {
            type: "phase",
            phase: "implementing",
            content: ""
          };
        }
      } else {
        yield chunk;
      }
    }

    yield {
      type: "generation_complete",
      content: "generation_complete"
    };
  } catch (error) {
    console.error("Error in streaming extension generation:", error);
    yield {
      type: "error",
      content: `Error: ${error.message}`
    };
  }
}
