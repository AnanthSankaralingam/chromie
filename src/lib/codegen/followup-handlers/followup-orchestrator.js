/**
 * Follow-up Request Orchestrator
 * Handles planning, tool execution loop, and patching for existing extensions
 */

import { analyzeExtensionFiles, formatFileSummariesForPlanning, formatFileContentsForPlanning } from '../file-analysis/index.js';
import { PLANNING_FOLLOWUP_PROMPT } from '@/lib/prompts/followup/planning/planning-context.js';
import { FOLLOW_UP_PATCH_PROMPT } from '@/lib/prompts/followup/follow-up-patching.js';
import { FOLLOW_UP_PATCH_PROMPT_WITH_TOOLS } from '@/lib/prompts/followup/follow-up-patching-with-tools.js';
import { executeToolCall } from './tool-executor.js';
import { extractJsonContent, parseJsonWithRetry } from '@/lib/codegen/output-handlers/json-extractor.js';

const FOLLOWUP_PLANNER_RESPONSE_FORMAT = {
  type: 'json_schema',
  name: 'followup_planning',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['justification', 'tools', 'files', 'difficulty'],
    properties: {
      justification: { type: 'string' },
      tools: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['chrome_api_search', 'web_scraping', 'delete_file', 'read_file']
        }
      },
      files: {
        type: 'array',
        items: { type: 'string' }
      },
      difficulty: { type: 'number' }
    }
  }
};

/**
 * Calls the planning agent to determine tools and files needed
 * @param {string} userRequest - The user's follow-up request
 * @param {Object} existingFiles - Map of file paths to contents
 * @param {Function} callLLM - LLM call function (injected dependency)
 * @param {Array<Object>|null} images - Optional image attachments for multimodal planning
 * @returns {Promise<Object>} - Planning result with tools, files, and success flag
 */
export async function callFollowUpPlanning(userRequest, existingFiles, callLLM, images = null, conversationHistory = [], isErrorReport = false) {
  console.log('📋 [followup-orchestrator] Starting follow-up planning...');

  // 1. Analyze files for summaries
  const analysisResult = analyzeExtensionFiles(existingFiles);
  const fileSummaries = formatFileSummariesForPlanning(analysisResult);

  console.log('📊 [followup-orchestrator] File summaries generated:', fileSummaries.substring(0, 200) + '...');

  // E1: Format conversation history for planning context
  let historyContext = '';
  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-6);
    historyContext = recentHistory
      .map(msg => `[${msg.role}]: ${(msg.content || '').substring(0, 300)}`)
      .join('\n');
  }

  // E3: Error context hint
  const errorHint = isErrorReport
    ? '\n\nNOTE: This appears to be a bug report / error fix. Prioritize debugging: include files referenced in error messages and their imports/callers.'
    : '';

  // 2. Build planning prompt (includes full file contents so the planner can
  //    match error messages, specific code lines, and function names to files)
  const fileContents = formatFileContentsForPlanning(existingFiles);
  const prompt = PLANNING_FOLLOWUP_PROMPT
    .replace('{USER_REQUEST}', userRequest)
    .replace('{FILE_SUMMARIES}', fileSummaries)
    .replace('{FILE_CONTENTS}', fileContents)
    .replace('{CONVERSATION_HISTORY}', historyContext)
    .replace('{ERROR_CONTEXT}', errorHint);

  const normalizePlanningResult = (planningResult) => {
    const validTools = ['chrome_api_search', 'web_scraping', 'delete_file', 'read_file'];
    const tools = Array.isArray(planningResult?.tools)
      ? planningResult.tools.filter((t) => validTools.includes(t))
      : [];
    const files = Array.isArray(planningResult?.files) && planningResult.files.length > 0
      ? planningResult.files
      : Object.keys(existingFiles);
    const difficultyRaw = Number(planningResult?.difficulty);
    const difficulty = Number.isFinite(difficultyRaw)
      ? Math.max(0, Math.min(1, difficultyRaw))
      : 0;

    return {
      success: true,
      justification: planningResult?.justification || '',
      tools,
      files,
      difficulty
    };
  };

  const parsePlanningResponse = (text) => {
    if (!text || typeof text !== 'string') return null;

    // Fast path: entire response is already JSON.
    const directParsed = parseJsonWithRetry(text.trim());
    if (directParsed && typeof directParsed === 'object') return directParsed;

    // Fallback: extract JSON from markdown/fenced output.
    const extracted = extractJsonContent(text);
    const extractedParsed = parseJsonWithRetry(extracted);
    if (extractedParsed && typeof extractedParsed === 'object') return extractedParsed;

    return null;
  };

  const isValidPlanningShape = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    if (!('justification' in obj) || !('tools' in obj) || !('files' in obj)) return false;
    if (!Array.isArray(obj.tools) || !Array.isArray(obj.files)) return false;
    return true;
  };

  // 3. Call LLM (attempt 1: structured output + images)
  console.log('🤖 [followup-orchestrator] Calling followup planning agent...');
  let response = await callLLM(prompt, images, { responseFormat: FOLLOWUP_PLANNER_RESPONSE_FORMAT });

  // 4. Parse JSON response
  try {
    let planningResult = parsePlanningResponse(response);
    if (planningResult && !isValidPlanningShape(planningResult)) {
      console.warn('⚠️ [followup-orchestrator] Parsed response was JSON but missing required planner keys');
      planningResult = null;
    }

    // If parsing failed, skip the expensive retry LLM call and fall back to
    // defaults. The structured output (json_schema) should produce valid JSON in
    // the vast majority of cases; when it doesn't, the all-files default is a
    // reasonable fallback that avoids doubling latency.
    if (!planningResult) {
      console.warn('⚠️ [followup-orchestrator] Planning response not parseable, falling back to defaults (skipping retry)');
      return {
        success: false,
        justification: 'Could not parse planning response',
        tools: [],
        files: Object.keys(existingFiles),
        difficulty: 0
      };
    }

    console.log('✅ [followup-orchestrator] Planning complete:', JSON.stringify(planningResult, null, 2));

    return normalizePlanningResult(planningResult);
  } catch (error) {
    console.error('❌ [followup-orchestrator] Failed to parse planning response:', error);
    return {
      success: false,
      justification: 'Planning response parsing failed',
      tools: [],
      files: Object.keys(existingFiles),
      difficulty: 0
    };
  }
}

/**
 * Selects the appropriate prompt based on planning results
 * - If planning succeeded and tools are enabled: use FOLLOW_UP_PATCH_PROMPT_WITH_TOOLS
 * - If planning failed or no tools: use FOLLOW_UP_PATCH_PROMPT (no tool access, all files)
 * @param {Object} planningResult - Result from callFollowUpPlanning
 * @returns {Object} - { prompt, enabledTools, useAllFiles }
 */
export function selectFollowUpPrompt(planningResult) {
  // If planning failed, fall back to original prompt with no tools and all files
  if (!planningResult.success) {
    console.log('⚠️ [followup-orchestrator] Planning failed, using default prompt with all files');
    return {
      prompt: FOLLOW_UP_PATCH_PROMPT,
      enabledTools: [],
      useAllFiles: true
    };
  }

  // If planning succeeded but no tools needed, use original prompt
  if (!planningResult.tools || planningResult.tools.length === 0) {
    console.log('📝 [followup-orchestrator] No tools needed, using standard patch prompt');
    return {
      prompt: FOLLOW_UP_PATCH_PROMPT,
      enabledTools: [],
      useAllFiles: false
    };
  }

  // Planning succeeded with tools enabled - use tools-enabled prompt
  console.log(`🔧 [followup-orchestrator] Using tools-enabled prompt with: [${planningResult.tools.join(', ')}]`);
  return {
    prompt: FOLLOW_UP_PATCH_PROMPT_WITH_TOOLS,
    enabledTools: planningResult.tools,
    useAllFiles: false,
    difficulty: planningResult.difficulty
  };
}

/**
 * Parse tool calls from LLM response
 * @param {string} response - LLM response text
 * @returns {Array<Object>} - Array of tool call objects
 */
export function parseToolCalls(response) {
  const toolCalls = [];

  // Pattern 1: XML-style tool calls
  const xmlRegex = /<tool_call>\s*<tool_name>(\w+)<\/tool_name>([\s\S]*?)<\/tool_call>/g;
  let match;

  while ((match = xmlRegex.exec(response)) !== null) {
    const name = match[1];
    const paramsXml = match[2];
    toolCalls.push({ name, params: parseToolParamsFromXml(name, paramsXml) });
  }

  // Pattern 2: JSON-style tool calls (as defined in the tool descriptions)
  const jsonRegex = /\{\s*"tool"\s*:\s*"(\w+)"[^}]*\}/g;

  while ((match = jsonRegex.exec(response)) !== null) {
    try {
      const toolJson = JSON.parse(match[0]);
      if (toolJson.tool && !toolCalls.some(tc => tc.name === toolJson.tool)) {
        toolCalls.push({
          name: toolJson.tool,
          params: extractToolParams(toolJson)
        });
      }
    } catch (e) {
      // Skip invalid JSON
      console.warn('⚠️ [followup-orchestrator] Failed to parse JSON tool call:', match[0]);
    }
  }

  return toolCalls;
}

/**
 * Parse tool parameters from XML content
 * @param {string} toolName - Name of the tool
 * @param {string} xmlContent - XML content containing parameters
 * @returns {Object} - Parsed parameters
 */
function parseToolParamsFromXml(toolName, xmlContent) {
  const params = {};

  // Extract common parameters
  const queryMatch = xmlContent.match(/<query>([\s\S]*?)<\/query>/);
  if (queryMatch) params.query = queryMatch[1].trim();

  const urlMatch = xmlContent.match(/<url>([\s\S]*?)<\/url>/);
  if (urlMatch) params.url = urlMatch[1].trim();

  const intentMatch = xmlContent.match(/<intent>([\s\S]*?)<\/intent>/);
  if (intentMatch) params.intent = intentMatch[1].trim();

  const filePathMatch = xmlContent.match(/<file_path>([\s\S]*?)<\/file_path>/);
  if (filePathMatch) params.file_path = filePathMatch[1].trim();

  return params;
}

/**
 * Extract tool parameters from JSON object
 * @param {Object} toolJson - Parsed JSON tool call
 * @returns {Object} - Extracted parameters
 */
function extractToolParams(toolJson) {
  const params = {};

  // Copy all properties except 'tool'
  for (const [key, value] of Object.entries(toolJson)) {
    if (key !== 'tool') {
      params[key] = value;
    }
  }

  return params;
}

/**
 * Format tool results for inclusion in the next LLM prompt
 * @param {Array<Object>} toolResults - Array of tool result objects
 * @returns {string} - Formatted tool results string
 */
export function formatToolResults(toolResults) {
  if (!toolResults || toolResults.length === 0) {
    return '';
  }

  const formattedResults = toolResults.map(({ call, result }) => {
    return `<tool_result tool="${call.name}">
${JSON.stringify(result, null, 2)}
</tool_result>`;
  }).join('\n\n');

  return `\n\n<tool_results>\n${formattedResults}\n</tool_results>`;
}

/**
 * Agentic loop for patching with tool calls
 * Yields streaming events and handles tool execution
 * @param {string} prompt - Initial prompt with replacements applied
 * @param {Object} existingFiles - Existing extension files
 * @param {Function} callLLM - LLM call function
 * @param {Object} options - Additional options
 * @param {string} options.projectId - Project ID for tool context
 * @param {Object} options.supabase - Supabase client for tool context
 * @param {Function} options.onConfirmationRequired - Confirmation callback
 * @returns {AsyncGenerator} - Yields progress events
 */
export async function* runPatchingWithToolLoop(prompt, existingFiles, callLLM, options = {}) {
  let currentPrompt = prompt;
  let toolResults = [];
  const maxIterations = options.maxIterations || 5;
  
  // Extract tool execution context
  const toolContext = {
    projectId: options.projectId,
    supabase: options.supabase,
    scrapingIntent: options.scrapingIntent || null,
    onConfirmationRequired: options.onConfirmationRequired
  };

  console.log('🔄 [followup-orchestrator] Starting patching with tool loop...');

  for (let i = 0; i < maxIterations; i++) {
    console.log(`📍 [followup-orchestrator] Iteration ${i + 1}/${maxIterations}`);

    // Build prompt with any accumulated tool results
    const fullPrompt = currentPrompt + formatToolResults(toolResults);

    // Call patching agent
    yield { type: 'llm_call_start', iteration: i + 1 };
    const response = await callLLM(fullPrompt);
    yield { type: 'llm_call_complete', iteration: i + 1 };

    // Check for tool calls in response
    const toolCalls = parseToolCalls(response);

    console.log(`🔍 [followup-orchestrator] Found ${toolCalls.length} tool calls in response`);

    if (toolCalls.length === 0) {
      // No more tool calls - agent is done, yield final response
      console.log('✅ [followup-orchestrator] No tool calls found, returning patch output');
      yield { type: 'patch_output', content: response };
      return;
    }

    // Execute each tool call
    for (const toolCall of toolCalls) {
      yield { type: 'tool_call', tool: toolCall.name, params: toolCall.params };

      console.log(`🔧 [followup-orchestrator] Executing tool: ${toolCall.name}`);
      const result = await executeToolCall(toolCall, toolContext);
      toolResults.push({ call: toolCall, result });

      yield { type: 'tool_result', tool: toolCall.name, result };
    }
  }

  // Max iterations reached - return whatever we have
  console.warn('⚠️ [followup-orchestrator] Max tool iterations reached');
  yield {
    type: 'error',
    content: 'Max tool iterations reached without generating patches'
  };
}

/**
 * Filter existing files to only include relevant ones
 * @param {Object} existingFiles - All existing files
 * @param {Array<string>} relevantPaths - Paths to include
 * @param {Array<Object>} taggedFiles - User-tagged files with path and content (highest priority)
 * @returns {Object} - Filtered files
 */
export function filterRelevantFiles(existingFiles, relevantPaths, taggedFiles = null) {
  const filtered = {};

  // Priority 1: Always include manifest.json if it exists
  if (existingFiles['manifest.json']) {
    filtered['manifest.json'] = existingFiles['manifest.json'];
  }

  // Priority 2: ALWAYS include user-tagged files (bypass planner)
  if (taggedFiles && taggedFiles.length > 0) {
    for (const taggedFile of taggedFiles) {
      if (taggedFile.path && taggedFile.content) {
        filtered[taggedFile.path] = taggedFile.content;
        console.log(`📌 [followup-orchestrator] Including user-tagged file: ${taggedFile.path}`);
      }
    }
  }

  // Priority 3: Include planner-selected files (if not already included)
  if (relevantPaths && relevantPaths.length > 0) {
    for (const path of relevantPaths) {
      if (!filtered[path] && existingFiles[path]) {
        filtered[path] = existingFiles[path];
      }
    }

    // E6: Also include files imported by selected files to avoid blind spots.
    // Scan selected JS files for import/require statements referencing other project files.
    const importPatterns = [
      /import\s+.*?from\s+['"]\.\/([^'"]+)['"]/g,
      /import\s+.*?from\s+['"]\.\.\/([^'"]+)['"]/g,
      /require\s*\(\s*['"]\.\/([^'"]+)['"]\s*\)/g,
    ];
    for (const selectedPath of relevantPaths) {
      const content = existingFiles[selectedPath];
      if (!content || typeof content !== 'string' || !selectedPath.endsWith('.js')) continue;
      for (const pattern of importPatterns) {
        pattern.lastIndex = 0;
        let m;
        while ((m = pattern.exec(content)) !== null) {
          let importedFile = m[1];
          if (!importedFile.endsWith('.js')) importedFile += '.js';
          // Check if this file exists in the project
          if (existingFiles[importedFile] && !filtered[importedFile]) {
            filtered[importedFile] = existingFiles[importedFile];
            console.log(`🔗 [followup-orchestrator] Auto-including imported file: ${importedFile} (imported by ${selectedPath})`);
          }
        }
      }
    }
  } else {
    // If no planner paths, include all existing files not already included
    for (const path in existingFiles) {
      if (!filtered[path]) {
        filtered[path] = existingFiles[path];
      }
    }
  }

  const taggedCount = taggedFiles ? taggedFiles.length : 0;
  console.log(`📁 [followup-orchestrator] Filtered to ${Object.keys(filtered).length} relevant files (${taggedCount} user-tagged)`);
  return filtered;
}
