import { REQUEST_TYPES } from "@/lib/prompts/request-types";
import { NEW_EXT_OVERLAY_PROMPT } from "@/lib/prompts/new-extension/one-shot/overlay";
import { NEW_EXT_POPUP_PROMPT } from "@/lib/prompts/new-extension/one-shot/popup";
import { NEW_EXT_SIDEPANEL_PROMPT } from "@/lib/prompts/new-extension/one-shot/sidepanel";
import { NEW_EXT_NEW_TAB_PROMPT } from "@/lib/prompts/new-extension/one-shot/new-tab";
import { NEW_EXT_CONTENT_SCRIPT_UI_PROMPT } from "@/lib/prompts/new-extension/one-shot/content-injection";
import { FOLLOW_UP_FILE_REPLACEMENT_PROMPT } from "@/lib/prompts/followup/follow-up-file-replacement";
import { FOLLOW_UP_PATCH_PROMPT } from "@/lib/prompts/followup/follow-up-patching";
import { FOLLOW_UP_PATCH_PROMPT_WITH_TOOLS } from "@/lib/prompts/followup/follow-up-patching-with-tools";
import { TEMPLATE_PATCH_PROMPT } from "@/lib/prompts/new-extension/template/template-patch";
import { batchScrapeWebpages } from "@/lib/webpage-scraper";
import { orchestratePlanning, orchestratePlanningStream, formatPlanningOutputs } from "@/lib/codegen/planning-handlers/planning-orchestrator";
import { generateExtensionCodeStream } from "@/lib/codegen/generate-extension-code-stream";
import {
  createExistingExtensionRequirements,
  checkUrlRequirement,
  checkApiRequirement,
  formatExternalApisContext,
  formatFilesAsXml,
  selectPrompt
} from "@/lib/codegen/patching-handlers/requirements-helpers";
import {
  shouldUsePatchingMode,
  prepareFilesForPatching,
  buildPatchPromptReplacements
} from "@/lib/codegen/patching-handlers/patch-mode-handler";
import { loadTemplateFiles, formatTemplateFilesAsXml } from "@/lib/codegen/planning-handlers/template-loader";
import { analyzeExtensionFiles, formatFileSummariesForPlanning } from "@/lib/codegen/file-analysis";
import { callFollowUpPlanning, selectFollowUpPrompt, filterRelevantFiles } from "@/lib/codegen/followup-handlers/followup-orchestrator";
import { llmService } from "@/lib/services/llm-service";
import { DEFAULT_MODEL, DEFAULT_PROVIDER, FRONTEND_CONFIDENCE_THRESHOLD, FOLLOWUP_DIFFICULTY_THRESHOLD } from "@/lib/constants";
import { formatPlanningSummaryForMetaPlanner, callMetaPlanner } from '@/lib/codegen/planning-handlers/meta-planner-bridge.js'
import { executeTaskGraph } from '@/lib/codegen/task-graph-executor.js'
import { callFollowupMetaPlanner } from '@/lib/codegen/followup-handlers/followup-meta-planner-bridge.js'
import { executeFollowupTaskGraph } from '@/lib/codegen/followup-handlers/followup-task-graph-executor.js'

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
  conversationTokenTotal,
  modelOverride,
  contextWindowMaxTokens,
  initialRequirementsAnalysis = null, // New parameter to preserve state
  initialPlanningTokenUsage = null, // New parameter to preserve state
  images = null, // Image attachments for vision-enabled requests
  taggedFiles = null, // User-tagged files that bypass planner selection
  supabase = null, // Supabase client for authenticated database access
  userSelectedFrontendType = null, // User-selected frontend type when confidence was low
  userConfirmedWorkspaceIntegration = null, // true = yes, false = no, null = not yet asked
  prebuiltMetaPlan = null, // Phase 2: pre-built meta plan from a prior plan_ready event
}) {
  try {
    // Phase 2: a meta plan was already built in a prior request — skip straight to execution.
    if (prebuiltMetaPlan) {
      console.log('⚡ [generate-extension-stream] Phase 2: executing pre-built task graph')
      yield { type: 'generation_starting', content: 'generation_starting' }
      yield { type: 'phase', phase: 'implementing', content: 'Generating extension files from task graph.' }
      for await (const event of executeTaskGraph(prebuiltMetaPlan.metaPlan, {
        metaPlan: prebuiltMetaPlan.metaPlan,
        formattedPlanningOutputs: prebuiltMetaPlan.formattedPlanningOutputs,
        scrapedWebpageAnalysis: prebuiltMetaPlan.scrapedWebpageAnalysis,
        frontendType: prebuiltMetaPlan.frontendType,
        featureRequest,
        modelOverride,
        sessionId,
      })) {
        yield event
      }
      yield { type: 'generation_complete', content: 'generation_complete' }
      return
    }
    let requirementsAnalysis = initialRequirementsAnalysis; // Use initial if provided
    let planningTokenUsage = initialPlanningTokenUsage; // Use initial if provided

    // Step 1: Analyze requirements based on request type
    if (initialRequirementsAnalysis && initialPlanningTokenUsage) {
      // If initial analysis is provided, we're resuming after a URL/frontend-type prompt
      console.log('♻️ [generate-extension-stream] SKIPPING planning orchestrator - reusing previous analysis results')
      console.log('📊 Previous planning tokens:', planningTokenUsage)
      requirementsAnalysis = initialRequirementsAnalysis;
      planningTokenUsage = initialPlanningTokenUsage;

      // If user declined workspace integration, strip workspace APIs from requirements
      if (userConfirmedWorkspaceIntegration === false && requirementsAnalysis.usesWorkspaceAPIs) {
        const { isWorkspaceAPI } = await import('@/lib/utils/google-workspace-scopes.js')
        requirementsAnalysis.usesWorkspaceAPIs = false
        requirementsAnalysis.workspaceAPIs = []
        requirementsAnalysis.workspaceScopes = []
        if (requirementsAnalysis.suggestedAPIs && Array.isArray(requirementsAnalysis.suggestedAPIs)) {
          requirementsAnalysis.suggestedAPIs = requirementsAnalysis.suggestedAPIs.filter(api => !isWorkspaceAPI(api.name))
        }
        if (requirementsAnalysis.planningResult?.externalResourcesResult?.external_apis) {
          requirementsAnalysis.planningResult.externalResourcesResult.external_apis =
            requirementsAnalysis.planningResult.externalResourcesResult.external_apis.filter(api => !isWorkspaceAPI(api.name))
        }
        if (requirementsAnalysis.planningResult) {
          requirementsAnalysis.planningResult.usesWorkspaceAPIs = false
          requirementsAnalysis.planningResult.workspaceAPIs = []
          requirementsAnalysis.planningResult.workspaceScopes = []
        }
        // Re-format planning outputs so WORKSPACE_AUTH is empty
        if (requirementsAnalysis.planningResult) {
          requirementsAnalysis.planningOutputs = await formatPlanningOutputs(
            requirementsAnalysis.planningResult, null, null, null, featureRequest
          )
        }
        console.log('🔐 [generate-extension-stream] User declined - stripped workspace APIs from plan')
      }

      // If user selected a frontend type (from low-confidence prompt), apply the override
      if (userSelectedFrontendType) {
        const originalType = requirementsAnalysis.frontend_type
        console.log(`🎨 [generate-extension-stream] User selected frontend type: ${userSelectedFrontendType} (was: ${originalType})`)
        requirementsAnalysis.frontend_type = userSelectedFrontendType

        // If the type changed, invalidate the matched template since it was selected for the old type
        if (userSelectedFrontendType !== originalType) {
          console.log('⚠️ [generate-extension-stream] Frontend type changed - invalidating matched template')
          requirementsAnalysis.matchedTemplate = { name: null, confidence: 0 }
        }

        // Update the planning result's frontendType to match
        if (requirementsAnalysis.planningResult) {
          requirementsAnalysis.planningResult.frontendType = userSelectedFrontendType
          // Re-format planning outputs with the updated frontend type
          requirementsAnalysis.planningOutputs = await formatPlanningOutputs(
            requirementsAnalysis.planningResult, null, null, null, featureRequest
          )
        }
      }

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

      // Use new planning orchestrator (streaming — forwards planning_progress events in real time)
      console.log('🎯 [generate-extension-stream] CALLING planning orchestrator (fresh analysis)...')
      let planningResult
      for await (const event of orchestratePlanningStream(featureRequest)) {
        if (event.type === '__planning_result__') {
          planningResult = event.result
        } else {
          yield event // forward planning_progress events to the SSE stream
        }
      }

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
        planningOutputs: formatPlanningOutputs(planningResult, null, null, null, featureRequest),
        workspaceAPIs: planningResult.workspaceAPIs || [],
        usesWorkspaceAPIs: planningResult.usesWorkspaceAPIs || false,
        workspaceScopes: planningResult.workspaceScopes || [],
        matchedTemplate: planningResult.templateMatchResult?.matched_template || null,
        scrapingIntent: planningResult.externalResourcesResult?.scraping_intent || null
      }

      planningTokenUsage = planningResult.tokenUsage

      // Check if frontend type confidence is low — prompt user to confirm/override
      const frontendConfidence = planningResult.frontendConfidence
      console.log(`🎯 [generate-extension-stream] Frontend confidence: ${frontendConfidence} (threshold: ${FRONTEND_CONFIDENCE_THRESHOLD})`)

      if (frontendConfidence < FRONTEND_CONFIDENCE_THRESHOLD) {
        console.log('🤔 [generate-extension-stream] Low frontend confidence - requesting user selection')
        yield {
          type: "requires_frontend_type",
          content: "I'm not fully confident about the best UI type for your extension. Please select the frontend type that best fits your needs.",
          suggestedType: requirementsAnalysis.frontend_type,
          confidence: frontendConfidence,
          analysisData: {
            requirements: requirementsAnalysis,
            tokenUsage: planningTokenUsage,
          },
        }
        return
      }

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

      // Analyze existing files for structured summary
      const fileAnalysis = analyzeExtensionFiles(existingFiles);
      const fileSummaries = formatFileSummariesForPlanning(fileAnalysis);
      console.log("📊 [File Analysis]:", fileSummaries);

      // Create callLLM wrapper for follow-up planning (same default model and fallback as new extension gen)
      const planningModel = modelOverride || DEFAULT_MODEL;
      const planningProvider = llmService.getProviderFromModel(planningModel);
      const callLLM = async (prompt) => {
        const response = await llmService.createResponse({
          provider: planningProvider,
          model: planningModel,
          input: prompt,
          temperature: 0.2,
          max_output_tokens: 500,
          store: false
        });
        return response?.output_text || '';
      };

      // Call follow-up planning agent to determine tools and files needed
      console.log('📋 [generate-extension-stream] Calling follow-up planning agent...');
      yield {
        type: "planning_progress",
        phase: "analyzing",
        content: "Determining optimal approach for modifications..."
      };

      const planningResult = await callFollowUpPlanning(featureRequest, existingFiles, callLLM);
      console.log('📊 [generate-extension-stream] Planning result:', JSON.stringify(planningResult, null, 2));

      // Select appropriate prompt based on planning result
      const promptSelection = selectFollowUpPrompt(planningResult);
      console.log(`🎯 [generate-extension-stream] Selected prompt: ${promptSelection.enabledTools.length > 0 ? 'with tools' : 'standard'}, useAllFiles: ${promptSelection.useAllFiles}`);

      // Store results in requirements analysis
      requirementsAnalysis.fileSummaries = fileAnalysis;
      requirementsAnalysis.enabledTools = promptSelection.enabledTools;
      requirementsAnalysis.relevantFiles = promptSelection.useAllFiles
        ? existingFiles
        : filterRelevantFiles(existingFiles, planningResult.files, taggedFiles);
      requirementsAnalysis.selectedPrompt = promptSelection.prompt;
      requirementsAnalysis.planningJustification = planningResult.justification;
      requirementsAnalysis.planningDifficulty = planningResult.difficulty || 0;

      // Track planning tokens
      planningTokenUsage = {
        prompt_tokens: 0, // TODO: Track actual tokens from planning call
        completion_tokens: 0,
        total_tokens: 0,
        model: planningModel
      };

      yield {
        type: "analysis_complete",
        content: requirementsAnalysis.ext_name
      };

      const toolsInfo = promptSelection.enabledTools.length > 0
        ? ` with tools: [${promptSelection.enabledTools.join(', ')}]`
        : '';
      const filesInfo = Object.keys(requirementsAnalysis.relevantFiles).length;
      const analyzingSummaryExisting = `Will modify "${requirementsAnalysis.ext_name}"${toolsInfo} (${filesInfo} files).`;
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

    // Check if Google Workspace APIs detected — prompt user to confirm BEFORE showing API form
    if (requirementsAnalysis.usesWorkspaceAPIs && (userConfirmedWorkspaceIntegration == null)) {
      console.log('🔐 [generate-extension-stream] Workspace APIs detected - requesting user confirmation')
      yield {
        type: "requires_workspace_api_confirmation",
        content: "I detected that your extension might use Google Workspace APIs (e.g. Drive, Gmail, Calendar). Do you want to integrate with Google APIs? This will add OAuth setup and the required permissions.",
        workspaceNames: (requirementsAnalysis.workspaceAPIs || []).map(a => a.name),
        analysisData: {
          requirements: requirementsAnalysis,
          tokenUsage: planningTokenUsage,
        },
      }
      return
    }

    // Check if external APIs are suggested but not yet provided — halt for user validation
    const apiRequirement = checkApiRequirement(requirementsAnalysis, userProvidedApis);
    if (apiRequirement) {
      console.log('🔌 External APIs suggested - requesting user validation before Meta Planner');
      console.log('📋 Suggested APIs:', apiRequirement.suggestedAPIs);
      yield {
        type: "requires_api",
        content: "Your extension needs to connect to external APIs. Please review the suggested APIs below, customize endpoints if needed, or skip to continue without them.",
        suggestedAPIs: apiRequirement.suggestedAPIs.map(api => ({
          name: api.name,
          endpoint: api.endpoint_url || api.endpoint || '',
          endpoint_url: api.endpoint_url || api.endpoint || '',
          doc_link: api.doc_link || null,
          doc_description: api.doc_description || null,
        })),
        analysisData: {
          requirements: requirementsAnalysis,
          tokenUsage: planningTokenUsage,
        },
      };
      return;
    }

    console.log('✅ APIs resolved - continuing with code generation')

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

        let scrapeOptions = {};
        if (sessionId && supabase) {
          try {
            const { data: project } = await supabase
              .from('projects')
              .select('user_id')
              .eq('id', sessionId)
              .maybeSingle();
            if (project?.user_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('hyperbrowser_profile_id')
                .eq('id', project.user_id)
                .maybeSingle();
              if (profile?.hyperbrowser_profile_id) {
                scrapeOptions.profile_id = profile.hyperbrowser_profile_id;
                console.log('🌐 [generate-extension-stream] Using user Hyperbrowser profile for initial scrape');
              }
            }
          } catch (err) {
            console.warn('⚠️ [generate-extension-stream] Could not fetch profile for scrape:', err?.message);
          }
        }
        if (requirementsAnalysis.scrapingIntent) {
          scrapeOptions.intent = requirementsAnalysis.scrapingIntent;
          console.log('🌐 [generate-extension-stream] Using scraping intent for niche use case');
        }

        const scrapeResult = await batchScrapeWebpages(
          requirementsAnalysis.webPageData,
          userProvidedUrl,
          scrapeOptions
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

    // Step 4: Check for template match and select appropriate coding prompt
    // Determine if we should use patching mode for modifications or template matching
    let usePatchingMode = shouldUsePatchingMode(requestType, existingFiles)
    let templateFiles = {}
    let usingTemplate = false
    let useTaskGraph = false
    
    // Check if template was matched with high confidence (>= 0.7)
    if (requestType === REQUEST_TYPES.NEW_EXTENSION && 
        requirementsAnalysis.matchedTemplate && 
        requirementsAnalysis.matchedTemplate.name &&
        requirementsAnalysis.matchedTemplate.confidence >= 0.8) {
      console.log(`🎯 [generate-extension-stream] Template matched: ${requirementsAnalysis.matchedTemplate.name} (confidence: ${requirementsAnalysis.matchedTemplate.confidence})`)
      
      // Load template files
      templateFiles = await loadTemplateFiles(
        requirementsAnalysis.matchedTemplate.name,
        requirementsAnalysis.frontend_type,
        supabase
      )
      
      if (Object.keys(templateFiles).length > 0) {
        usingTemplate = true
        usePatchingMode = true // Use patching mode with template files
        console.log(`✅ [generate-extension-stream] Loaded ${Object.keys(templateFiles).length} template files`)
      } else {
        console.warn(`⚠️ [generate-extension-stream] Template matched but files not found, falling back to NEW_EXT`)
        usingTemplate = false
      }
    }
    
    // For ADD_TO_EXISTING, use the prompt selected by the planning agent
    // For new extensions, use standard prompt selection
    let selectedCodingPrompt;

    if (requestType === REQUEST_TYPES.ADD_TO_EXISTING && requirementsAnalysis.selectedPrompt) {
      if (requirementsAnalysis.planningDifficulty >= FOLLOWUP_DIFFICULTY_THRESHOLD) {
        console.log(`🧠 [generate-extension-stream] High difficulty (${requirementsAnalysis.planningDifficulty}) — routing to followup meta planner flow`)
        yield { type: 'planning_progress', phase: 'planning', content: 'Complex change detected — building structured patch plan...' }
        yield* runFollowupMetaPlannerBranch({ featureRequest, requirementsAnalysis, sessionId, modelOverride, supabase })
        return
      }
      // Use the prompt determined by follow-up planning
      selectedCodingPrompt = requirementsAnalysis.selectedPrompt;
      console.log(`🔧 [generate-extension-stream] Using planning-selected prompt (tools: ${requirementsAnalysis.enabledTools?.length > 0 ? 'enabled' : 'none'})`);
    } else if (usingTemplate) {
      // Use template patch prompt
      selectedCodingPrompt = TEMPLATE_PATCH_PROMPT;
    } else {
      useTaskGraph = true
      console.log('🔄 [generate-extension-stream] No template matched - will use task graph approach')
    }
    
    if (useTaskGraph) {
      console.log('🔄 [generate-extension-stream] Using TASK GRAPH mode')
    } else if (usingTemplate) {
      console.log('🎨 [generate-extension-stream] Using TEMPLATE PATCH mode')
    } else if (usePatchingMode) {
      console.log('🔧 [generate-extension-stream] Using PATCH mode for modifications')
    } else {
      console.log('🔄 [generate-extension-stream] Using REPLACEMENT mode')
    }

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

    // --- Task Graph Branch ---
    if (useTaskGraph) {
      // Re-format planning outputs with scraped data and user APIs
      const updatedPlanningOutputs = await formatPlanningOutputs(
        requirementsAnalysis.planningResult, scrapedWebpageAnalysis,
        scrapeStatusCode, userProvidedApis, featureRequest
      )

      // Format planning summary for meta planner
      const planningSummary = formatPlanningSummaryForMetaPlanner(
        requirementsAnalysis.planningResult, scrapedWebpageAnalysis,
        userProvidedApis, featureRequest, userProvidedUrl
      )

      // Signal that all user inputs are confirmed and we're about to build the task graph
      yield { type: 'planning_progress', phase: 'analysis', content: 'Finalizing extension plan...' }

      // Call meta planner (Haiku)
      const { metaPlan, tokenUsage: metaPlannerTokenUsage } = await callMetaPlanner(
        featureRequest, planningSummary
      )

      // Phase 1 complete — hand off the plan to the client so it can start Phase 2
      // in a fresh request, avoiding Vercel's 5-minute function timeout on long generations.
      console.log('📦 [generate-extension-stream] Meta plan ready — yielding plan_ready for Phase 2')
      yield {
        type: 'plan_ready',
        metaPlan,
        formattedPlanningOutputs: updatedPlanningOutputs,
        scrapedWebpageAnalysis,
        frontendType: requirementsAnalysis.frontend_type,
      }
      return // Phase 2 (executeTaskGraph) runs in the next request
    }

    const finalUserPrompt = featureRequest;

    // Build replacements object based on request type and mode
    let replacements;

    if (requestType === REQUEST_TYPES.ADD_TO_EXISTING) {
      if (usePatchingMode) {
        // For patching mode: use specialized patch prompt replacements
        // Pass enabled tools from requirements analysis (populated by planning agent when enabled)
        const enabledTools = requirementsAnalysis.enabledTools || [];
        const filesToUse = requirementsAnalysis.relevantFiles || existingFiles;
        replacements = buildPatchPromptReplacements(finalUserPrompt, filesToUse, { enabledTools })
        console.log(`🔧 Built patch mode replacements with ${Object.keys(filesToUse).length} files, tools: [${enabledTools.join(', ') || 'none'}]`)
      } else {
        // For replacement mode: use ext_name and existing_files
        replacements = {
          USER_REQUEST: finalUserPrompt,
          ext_name: requirementsAnalysis.ext_name || "Existing Extension"
        }
        
        // Add existing files context for modifications
        if (Object.keys(existingFiles).length > 0) {
          console.log("📁 Including existing files context for replacement mode")
          const filteredFiles = {}
          for (const [filename, content] of Object.entries(existingFiles)) {
            // Include actual code files (not binary assets)
            // BUT include custom asset metadata entries (they start with "[Custom")
            const isAssetMetadata = typeof content === 'string' && content.startsWith('[Custom')
            const isBinaryFile = !isAssetMetadata && filename.match(/\.(png|jpg|jpeg|gif|svg|ico)$/i)
            
            if (!isBinaryFile) {
              filteredFiles[filename] = content
            }
          }
          // Format files as XML tags for universal use in patching and replacement prompts
          replacements.existing_files = formatFilesAsXml(filteredFiles)
          
          // Extract custom icon information
          const customIcons = Object.keys(filteredFiles).filter(path => 
            path.startsWith('icons/') && typeof filteredFiles[path] === 'string' && filteredFiles[path].startsWith('[Custom')
          );
          if (customIcons.length > 0) {
            replacements.existing_files += '\n\n<custom_icons>\nThe following custom icons are available:\n';
            customIcons.forEach(iconPath => {
              replacements.existing_files += `- ${iconPath}\n`;
            });
            replacements.existing_files += '\nUse these custom icon paths in manifest.json and code.\n';
            replacements.existing_files += '</custom_icons>';
            console.log('🎨 [generate-extension-stream] Found custom icons for modification:', customIcons.join(', '));
          }
          
          console.log(
            `📋 Context includes ${
              Object.keys(filteredFiles).length
            } existing files (excluding icons): ${Object.keys(filteredFiles).join(", ")}`
          )
          yield {
            type: "context_ready",
            content: "context_ready"
          }
        }
      }
    } else {
      // For new extensions: use planning outputs
      // Re-format external resources with webpage scraping data if available
      const planningResult = requirementsAnalysis.planningResult;
      const updatedPlanningOutputs = await formatPlanningOutputs(
        planningResult,
        scrapedWebpageAnalysis,
        scrapeStatusCode,
        userProvidedApis,
        finalUserPrompt
      );
      
      console.log('📄 [generate-extension-stream] EXTERNAL_RESOURCES with webpage data and user APIs:', updatedPlanningOutputs.EXTERNAL_RESOURCES.substring(0, 150) + (updatedPlanningOutputs.EXTERNAL_RESOURCES.length > 150 ? '...' : ''));
      console.log('🔐 [generate-extension-stream] WORKSPACE_AUTH injected:',
        updatedPlanningOutputs.WORKSPACE_AUTH ? (updatedPlanningOutputs.WORKSPACE_AUTH.length > 0 ? 'YES' : 'NO') : 'NO');
      if (requirementsAnalysis.workspaceScopes && requirementsAnalysis.workspaceScopes.length > 0) {
        console.log('🔑 Required OAuth scopes:', requirementsAnalysis.workspaceScopes);
      }

      // Extract custom icon information from existing files (for new extensions with uploaded icons)
      let customIconsInfo = '';
      if (Object.keys(existingFiles).length > 0) {
        const customIcons = Object.keys(existingFiles).filter(path => 
          path.startsWith('icons/') && typeof existingFiles[path] === 'string' && existingFiles[path].startsWith('[Custom')
        );
        if (customIcons.length > 0) {
          customIconsInfo = '\n\n<custom_icons>\nThe following custom icons have been uploaded and are available:\n';
          customIcons.forEach(iconPath => {
            customIconsInfo += `- ${iconPath}\n`;
          });
          customIconsInfo += '\nFor manifest.json, use the uploaded icon paths directly.\n';
          customIconsInfo += 'Example: "icons": { "16": "icons/custom-icon-16.png", "48": "icons/custom-icon-48.png", "128": "icons/custom-icon-128.png" }\n';
          customIconsInfo += '</custom_icons>';
          console.log('🎨 [generate-extension-stream] Found custom icons:', customIcons.join(', '));
        }
      }
      
      // Build replacements based on whether we're using a template
      if (usingTemplate) {
        // Format template files as XML for prompt
        const templateFilesXml = formatTemplateFilesAsXml(templateFiles)

        replacements = {
          USER_REQUEST: finalUserPrompt,
          USE_CASE_CHROME_APIS: updatedPlanningOutputs.USE_CASE_CHROME_APIS,
          EXTERNAL_RESOURCES: updatedPlanningOutputs.EXTERNAL_RESOURCES + customIconsInfo,
          TEMPLATE_FILES: templateFilesXml,
          WORKSPACE_AUTH: updatedPlanningOutputs.WORKSPACE_AUTH
        };

        console.log(`📦 [generate-extension-stream] Using template files for patching (${Object.keys(templateFiles).length} files)`)
      } else {
        replacements = {
          USER_REQUEST: finalUserPrompt,
          USE_CASE_CHROME_APIS: updatedPlanningOutputs.USE_CASE_CHROME_APIS,
          EXTERNAL_RESOURCES: updatedPlanningOutputs.EXTERNAL_RESOURCES + customIconsInfo,
          WORKSPACE_AUTH: updatedPlanningOutputs.WORKSPACE_AUTH
        };
      }
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

    // Prepare existing files for patching if in patch mode
    // If using template, use template files; otherwise use existing files
    const patchableFiles = usePatchingMode
      ? (usingTemplate ? prepareFilesForPatching(templateFiles) : prepareFilesForPatching(existingFiles))
      : {}

    // Calculate expected file count for thinking level determination
    let expectedFileCount = 0
    if (requestType === REQUEST_TYPES.ADD_TO_EXISTING) {
      // For follow-ups, count relevant files
      expectedFileCount = Object.keys(requirementsAnalysis.relevantFiles || {}).length
    } else if (requestType === REQUEST_TYPES.NEW_EXTENSION) {
      // For new extensions, estimate from template or use reasonable default
      if (usingTemplate && templateFiles) {
        expectedFileCount = Object.keys(templateFiles).length
      } else {
        // Conservative estimate for new extensions without template
        expectedFileCount = 4
      }
    }
    console.log(`📊 [generate-extension-stream] Expected file count for thinking level: ${expectedFileCount}`)

    // Add supabase client and scraping intent to replacements for tool execution
    replacements.supabase = supabase
    replacements.scrapingIntent = requirementsAnalysis.scrapingIntent || null
    // Pass all project files for read_file tool (when planning may have missed files)
    if (usePatchingMode && existingFiles) {
      replacements.allProjectFiles = existingFiles
    }

    // Use the streaming code generation (skip thinking phase since it was done in planning)
    for await (const chunk of generateExtensionCodeStream(
        selectedCodingPrompt,
        replacements,
        sessionId,
        true, {
          conversationTokenTotal,
          modelOverride,
          contextWindowMaxTokens,
          frontendType: requirementsAnalysis.frontend_type,
          requestType: requestType,
          originalUserRequest: featureRequest, // For clean history storage
          usePatchingMode,
          existingFilesForPatch: patchableFiles,
          userRequest: featureRequest,
          images: images, // Pass images to code generation
          expectedFileCount: expectedFileCount // For dynamic thinking level
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

/**
 * Handles the high-difficulty follow-up path: calls the followup meta planner,
 * then executes the resulting task graph.
 */
async function* runFollowupMetaPlannerBranch({ featureRequest, requirementsAnalysis, sessionId, modelOverride, supabase }) {
  const { followupPlan } = await callFollowupMetaPlanner(
    featureRequest,
    requirementsAnalysis.relevantFiles,
    requirementsAnalysis.fileSummaries,
    requirementsAnalysis.planningJustification
  )
  yield { type: 'generation_starting', content: 'generation_starting' }
  yield { type: 'phase', phase: 'implementing', content: 'Patching extension files via task graph.' }
  for await (const event of executeFollowupTaskGraph(followupPlan, {
    userRequest: featureRequest,
    existingFiles: requirementsAnalysis.relevantFiles,
    sessionId,
    modelOverride,
    supabase
  })) {
    yield event
  }
  yield { type: 'generation_complete', content: 'generation_complete' }
}
