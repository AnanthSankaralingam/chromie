/**
 * Tool Executor
 * Routes tool calls to their implementations
 */

import { searchChromeExtensionAPI } from '../planning-handlers/chrome-api-docs.js';
import { scrapeWebPage } from '@/lib/webpage-scraper.js';
import { handleAgentFileDelete } from '../file-operations.js';

/**
 * Execute a tool call and return the result
 * @param {Object} toolCall - Tool call object with name and params
 * @param {Object} context - Execution context (projectId, supabase, etc.)
 * @returns {Promise<Object>} - Tool execution result
 */
export async function executeToolCall(toolCall, context = {}) {
  console.log(`🔧 [tool-executor] Executing tool: ${toolCall.name}`);

  switch (toolCall.name) {
    case 'chrome_api_search':
      return await executeChromeApiSearch(toolCall.params);
    case 'web_scraping':
      return await executeWebScraping(toolCall.params, context);
    case 'delete_file':
      return await executeFileDelete(toolCall.params, context);
    default:
      console.warn(`⚠️ [tool-executor] Unknown tool: ${toolCall.name}`);
      return { error: `Unknown tool: ${toolCall.name}` };
  }
}

/**
 * Execute Chrome API search tool
 * @param {Object} params - Tool parameters
 * @param {string} params.query - Search query for Chrome APIs
 * @returns {Promise<Object>} - Search results
 */
async function executeChromeApiSearch(params) {
  const { query } = params;

  if (!query) {
    return { error: 'Missing required parameter: query' };
  }

  console.log(`🔍 [tool-executor] Searching Chrome API docs for: ${query}`);

  const result = searchChromeExtensionAPI(query);
  return formatApiSearchResults(result);
}

/**
 * Execute web scraping tool
 * @param {Object} params - Tool parameters
 * @param {string} params.url - URL to scrape
 * @param {string} params.intent - What to extract or analyze
 * @param {Object} context - Execution context (projectId, supabase)
 * @returns {Promise<Object>} - Scraping results
 */
async function executeWebScraping(params, context = {}) {
  const { url, intent } = params;
  const { projectId, supabase, scrapingIntent } = context;
  // Prefer planning-derived scrapingIntent (niche use case) over LLM-provided intent
  const effectiveIntent = scrapingIntent || intent;

  if (!url) {
    return { error: 'Missing required parameter: url' };
  }

  let profileId = null;
  if (projectId && supabase) {
    try {
      const { data: project } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .maybeSingle();
      if (project?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('hyperbrowser_profile_id')
          .eq('id', project.user_id)
          .maybeSingle();
        if (profile?.hyperbrowser_profile_id) {
          profileId = profile.hyperbrowser_profile_id;
          console.log(`🌐 [tool-executor] Using user's Hyperbrowser profile for authenticated scrape`);
        }
      }
    } catch (err) {
      console.warn(`⚠️ [tool-executor] Could not fetch profile for scrape:`, err?.message);
    }
  }

  console.log(`🌐 [tool-executor] Scraping webpage: ${url} (intent: ${effectiveIntent || 'general'})${profileId ? ' [with profile]' : ''}`);

  try {
    const result = await scrapeWebPage(url, { intent: effectiveIntent, profile_id: profileId });
    return formatScrapingResults(result, effectiveIntent);
  } catch (error) {
    console.error(`❌ [tool-executor] Scraping failed:`, error);
    return { error: `Failed to scrape webpage: ${error.message}` };
  }
}

/**
 * Format Chrome API search results for LLM consumption
 * @param {Object} result - Raw search result
 * @returns {Object} - Formatted result
 */
function formatApiSearchResults(result) {
  if (result.error) {
    return {
      success: false,
      error: result.error,
      suggestion: result.available_apis
        ? `Available APIs: ${result.available_apis.slice(0, 10).join(', ')}...`
        : null
    };
  }

  return {
    success: true,
    api: result.name,
    description: result.description,
    permissions: result.permissions,
    code_example: result.code_example
  };
}

/**
 * Format web scraping results for LLM consumption
 * @param {Object} result - Raw scraping result
 * @param {string} intent - Original scraping intent
 * @returns {Object} - Formatted result
 */
function formatScrapingResults(result, intent) {
  if (result.error) {
    return {
      success: false,
      error: result.error,
      url: result.url
    };
  }

  return {
    success: true,
    url: result.url,
    title: result.title,
    elements: result.elements || [],
    majorElements: result.majorElementsData || {},
    intent: intent || 'general analysis'
  };
}

/**
 * Execute file deletion tool
 * @param {Object} params - Tool parameters
 * @param {string} params.file_path - Path of file to delete
 * @param {string} params.reason - Reason for deletion
 * @param {Object} context - Execution context
 * @param {string} context.projectId - Project ID
 * @param {Object} context.supabase - Supabase client
 * @param {Function} context.onConfirmationRequired - Confirmation callback
 * @returns {Promise<Object>} - Deletion result
 */
async function executeFileDelete(params, context) {
  const { file_path, reason } = params;
  const { projectId, supabase, onConfirmationRequired } = context;

  if (!file_path) {
    return { error: 'Missing required parameter: file_path' };
  }

  if (!reason) {
    return { error: 'Missing required parameter: reason - you must explain why this file should be deleted' };
  }

  if (!projectId || !supabase) {
    return { error: 'Missing execution context: projectId and supabase required' };
  }

  console.log(`🗑️ [tool-executor] Requesting deletion of: ${file_path} (reason: ${reason})`);

  try {
    const result = await handleAgentFileDelete({
      projectId,
      filePath: file_path,
      reason,
      supabase,
      onConfirmationRequired: onConfirmationRequired || (() => Promise.resolve(false))
    });

    return formatFileDeletionResult(result, file_path);
  } catch (error) {
    console.error(`❌ [tool-executor] File deletion failed:`, error);
    return { error: `Failed to delete file: ${error.message}` };
  }
}

/**
 * Format file deletion results for LLM consumption
 * @param {Object} result - Raw deletion result
 * @param {string} filePath - File path that was deleted
 * @returns {Object} - Formatted result
 */
function formatFileDeletionResult(result, filePath) {
  if (result.success) {
    return {
      success: true,
      message: `Successfully deleted file: ${filePath}`,
      filePath: result.filePath
    };
  }

  if (result.blocked) {
    return {
      success: false,
      blocked: true,
      error: result.error,
      message: `Cannot delete ${filePath}: ${result.error}. This file is protected and cannot be removed by agents.`
    };
  }

  if (result.declined) {
    return {
      success: false,
      declined: true,
      error: result.error,
      message: `File deletion declined: User chose to keep ${filePath}. Consider an alternative approach.`
    };
  }

  if (result.notFound) {
    return {
      success: false,
      notFound: true,
      error: result.error,
      message: `File ${filePath} does not exist in the project.`
    };
  }

  return {
    success: false,
    error: result.error,
    message: `Failed to delete ${filePath}: ${result.error}`
  };
}
