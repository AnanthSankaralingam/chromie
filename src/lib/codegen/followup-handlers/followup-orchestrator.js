/**
 * Follow-up Request Orchestrator
 * Handles planning, tool execution loop, and patching for existing extensions
 */

import { analyzeExtensionFiles, formatFileSummariesForPlanning } from '../file-analysis/index.js';
import { PLANNING_FOLLOWUP_PROMPT } from '@/lib/prompts/followup/workflows/planning-context.js';
import { FOLLOW_UP_PATCH_PROMPT } from '@/lib/prompts/followup/follow-up-patching.js';
import { FOLLOW_UP_PATCH_PROMPT_WITH_TOOLS, buildToolDescriptions } from '@/lib/prompts/followup/follow-up-patching-with-tools.js';
import { executeToolCall } from './tool-executor.js';

/**
 * Calls the planning agent to determine tools and files needed
 * @param {string} userRequest - The user's follow-up request
 * @param {Object} existingFiles - Map of file paths to contents
 * @param {Function} callLLM - LLM call function (injected dependency)
 * @returns {Promise<Object>} - Planning result with tools, files, and success flag
 */
export async function callFollowUpPlanning(userRequest, existingFiles, callLLM) {
  console.log('📋 [followup-orchestrator] Starting follow-up planning...');

  // 1. Analyze files for summaries
  const analysisResult = analyzeExtensionFiles(existingFiles);
  const fileSummaries = formatFileSummariesForPlanning(analysisResult);

  console.log('📊 [followup-orchestrator] File summaries generated:', fileSummaries.substring(0, 200) + '...');

  // 2. Build planning prompt
  const prompt = PLANNING_FOLLOWUP_PROMPT
    .replace('{USER_REQUEST}', userRequest)
    .replace('{FILE_SUMMARIES}', fileSummaries);

  // 3. Call LLM
  console.log('🤖 [followup-orchestrator] Calling followup planning agent...');
  const response = await callLLM(prompt);

  // 4. Parse JSON response
  try {
    // Extract JSON from response (handle potential markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('⚠️ [followup-orchestrator] No JSON found in planning response, using defaults');
      return {
        success: false,
        justification: 'Could not parse planning response',
        tools: [],
        files: Object.keys(existingFiles)
      };
    }

    const planningResult = JSON.parse(jsonMatch[0]);
    console.log('✅ [followup-orchestrator] Planning complete:', JSON.stringify(planningResult, null, 2));

    return {
      success: true,
      justification: planningResult.justification || '',
      tools: planningResult.tools || [],
      files: planningResult.files || Object.keys(existingFiles)
    };
  } catch (error) {
    console.error('❌ [followup-orchestrator] Failed to parse planning response:', error);
    return {
      success: false,
      justification: 'Planning response parsing failed',
      tools: [],
      files: Object.keys(existingFiles)
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
    useAllFiles: false
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
