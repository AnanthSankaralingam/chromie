/**
 * Tool Executor
 * Routes tool calls to their implementations
 */

import { searchChromeExtensionAPI } from '../planning-handlers/chrome-api-docs.js';
import { scrapeWebPage } from '@/lib/webpage-scraper.js';

/**
 * Execute a tool call and return the result
 * @param {Object} toolCall - Tool call object with name and params
 * @returns {Promise<Object>} - Tool execution result
 */
export async function executeToolCall(toolCall) {
  console.log(`🔧 [tool-executor] Executing tool: ${toolCall.name}`);

  switch (toolCall.name) {
    case 'chrome_api_search':
      return await executeChromeApiSearch(toolCall.params);
    case 'web_scraping':
      return await executeWebScraping(toolCall.params);
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
 * @returns {Promise<Object>} - Scraping results
 */
async function executeWebScraping(params) {
  const { url, intent } = params;

  if (!url) {
    return { error: 'Missing required parameter: url' };
  }

  console.log(`🌐 [tool-executor] Scraping webpage: ${url} (intent: ${intent || 'general'})`);

  try {
    const result = await scrapeWebPage(url);
    return formatScrapingResults(result, intent);
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
