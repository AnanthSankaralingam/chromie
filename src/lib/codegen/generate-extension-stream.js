import { REQUEST_TYPES } from "../prompts/request-types";
import { NEW_EXT_OVERLAY_PROMPT } from "../prompts/new-extension/overlay";
import { NEW_EXT_POPUP_PROMPT } from "../prompts/new-extension/popup";
import { NEW_EXT_SIDEPANEL_PROMPT } from "../prompts/new-extension/sidepanel";
import { NEW_EXT_NEW_TAB_PROMPT } from "../prompts/new-extension/new-tab";
import { NEW_EXT_CONTENT_SCRIPT_UI_PROMPT } from "../prompts/new-extension/content-injection";
import { UPDATE_EXT_PROMPT } from "../prompts/followup/generic-no-diffs";
import { batchScrapeWebpages } from "../webpage-scraper";
import { orchestratePlanning, formatPlanningOutputs } from "./planning-orchestrator";
import { generateExtensionCodeStream } from "./generate-extension-code-stream";
import {
  createExistingExtensionRequirements,
  checkUrlRequirement,
  checkApiRequirement,
  formatExternalApisContext,
  selectPrompt
} from "./requirements-helpers";

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
  userProvidedApis = null,
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
      yield {
        type: "phase",
        phase: "analyzing",
        content: "Understanding your requirements and constraints to scope the extension.",
      };

      // Use new planning orchestrator (non-streaming)
      console.log('🎯 [generate-extension-stream] Calling planning orchestrator...')
      const planningResult = await orchestratePlanning(featureRequest)

      // Map planning result to requirementsAnalysis structure
      requirementsAnalysis = {
        frontend_type: planningResult.frontendType,
        chromeAPIs: planningResult.useCaseResult.required_chrome_apis || [],
        webPageData: planningResult.externalResourcesResult.webpages_to_scrape || [],
        suggestedAPIs: planningResult.externalResourcesResult.external_apis || [],
        ext_name: planningResult.useCaseResult.matched_use_case?.name || "Chrome Extension",
        matchedUseCase: planningResult.useCaseResult.matched_use_case,
        codeSnippet: planningResult.codeSnippet,
        planningResult: planningResult, // Store original for later re-formatting with webpage data
        planningOutputs: formatPlanningOutputs(planningResult)
      }

      planningTokenUsage = planningResult.tokenUsage

      yield {
        type: "analysis_complete",
        content: requirementsAnalysis.frontend_type
      };

      // Provide analyzing summary
      const analyzingSummary = `Identified a ${requirementsAnalysis.frontend_type} UI with ${requirementsAnalysis.chromeAPIs.length} Chrome APIs and ${
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
      requirementsAnalysis = createExistingExtensionRequirements(existingFiles);

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

    // Check if URL is required but not provided
    const urlRequirement = checkUrlRequirement(requirementsAnalysis, userProvidedUrl, skipScraping);
    if (urlRequirement) {
      console.log('🚫 URL required for scraping but not provided - halting code generation (streaming)');
      console.log('📋 Detected sites:', urlRequirement.detectedSites);
      
      yield {
        type: "requires_url",
        content: "This extension would benefit from analyzing specific website structure. Please provide a URL or choose to skip.",
        ...urlRequirement,
        analysisData: {
          requirements: requirementsAnalysis,
          tokenUsage: planningTokenUsage,
        },
      };
      
      console.log('🛑 Returning from generator - should stop code generation');
      return;
    }
    
    console.log('✅ No URL required or URL already provided - continuing with code generation');

    // Check if external APIs are required but not provided
    const apiRequirement = checkApiRequirement(requirementsAnalysis, userProvidedApis);
    if (apiRequirement) {
      console.log('🔌 External APIs suggested but not provided - halting code generation (streaming)');
      console.log('📋 Suggested APIs:', apiRequirement.suggestedAPIs);

      yield {
        type: "requires_api",
        content: "This extension can be enhanced with external API endpoints. Please configure them or choose to skip.",
        ...apiRequirement,
        analysisData: {
          requirements: requirementsAnalysis,
          tokenUsage: planningTokenUsage,
        },
      };

      console.log('🛑 Returning from generator - should stop code generation for API input');
      return;
    }

    console.log('✅ No external APIs suggested or APIs already provided - continuing with code generation')

    // Step 2: Scrape webpages for analysis if needed (now with simplified logic)
    let scrapedWebpageAnalysis = null;
    let scrapeStatusCode = null;
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

        const scrapeResult = await batchScrapeWebpages(
          requirementsAnalysis.webPageData,
          userProvidedUrl
        );
        scrapedWebpageAnalysis = scrapeResult.data;
        scrapeStatusCode = scrapeResult.statusCode;

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
        scrapeStatusCode = 404; // Not found/skipped
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
      scrapeStatusCode = 404; // Not found/not needed
    }

    // Step 4: Select appropriate coding prompt based on request type and frontend type
    const prompts = {
      UPDATE_EXT_PROMPT,
      NEW_EXT_SIDEPANEL_PROMPT,
      NEW_EXT_POPUP_PROMPT,
      NEW_EXT_OVERLAY_PROMPT,
      NEW_EXT_NEW_TAB_PROMPT,
      NEW_EXT_CONTENT_SCRIPT_UI_PROMPT
    };
    const selectedCodingPrompt = selectPrompt(requestType, requirementsAnalysis.frontend_type, prompts);
    
    yield {
      type: "prompt_selected",
      content: "prompt_selected"
    };
    yield {
      type: "phase",
      phase: "planning",
      content: requestType === REQUEST_TYPES.ADD_TO_EXISTING 
        ? "Selected a generic modification plan based on existing files."
        : `Chose a ${requirementsAnalysis.frontend_type} implementation plan.`,
    };

    const finalUserPrompt = featureRequest;

    // Build replacements object based on request type
    let replacements;

    if (requestType === REQUEST_TYPES.ADD_TO_EXISTING) {
      // For modifications: use ext_name and existing_files
      replacements = {
        USER_REQUEST: finalUserPrompt,
        ext_name: requirementsAnalysis.ext_name || "Existing Extension"
      };

      // Add existing files context only if NOT using a previousResponseId
      if (!previousResponseId && Object.keys(existingFiles).length > 0) {
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
      } else if (previousResponseId) {
        console.log("[generateChromeExtensionStream] skipping existing files context due to previousResponseId");
      }
    } else {
      // For new extensions: use planning outputs
      // Re-format external resources with webpage scraping data if available
      const planningResult = requirementsAnalysis.planningResult;
      const updatedPlanningOutputs = formatPlanningOutputs(
        planningResult,
        scrapedWebpageAnalysis,
        scrapeStatusCode,
        userProvidedApis
      );
      
      console.log('📄 [generate-extension-stream] EXTERNAL_RESOURCES with webpage data and user APIs:', updatedPlanningOutputs.EXTERNAL_RESOURCES.substring(0, 150) + (updatedPlanningOutputs.EXTERNAL_RESOURCES.length > 150 ? '...' : ''));
      
      replacements = {
        USER_REQUEST: finalUserPrompt,
        USE_CASE_CHROME_APIS: updatedPlanningOutputs.USE_CASE_CHROME_APIS,
        EXTERNAL_RESOURCES: updatedPlanningOutputs.EXTERNAL_RESOURCES
      };
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
