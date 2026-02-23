import { CHROME_API_SEARCH_TOOL } from './chrome-api-search.js';
import { WEB_SCRAPING_TOOL } from './scraping-with-intent.js';
import { FILE_DELETE_TOOL } from './file-delete.js';
import { READ_FILE_TOOL } from './read-file.js';

export { CHROME_API_SEARCH_TOOL, WEB_SCRAPING_TOOL, FILE_DELETE_TOOL, READ_FILE_TOOL };

/**
 * Builds conditional tool descriptions based on enabled tools
 * @param {string[]} enabledTools - Array of tool names to enable
 * @returns {string} - XML-formatted tool descriptions or empty string
 */
export function buildToolDescriptions(enabledTools = []) {
  if (!enabledTools || enabledTools.length === 0) {
    return '';
  }

  const toolMap = {
    'chrome_api_search': CHROME_API_SEARCH_TOOL,
    'web_scraping': WEB_SCRAPING_TOOL,
    'delete_file': FILE_DELETE_TOOL,
    'read_file': READ_FILE_TOOL
  };

  const sections = enabledTools
    .filter(tool => toolMap[tool])
    .map(tool => toolMap[tool]);

  if (sections.length === 0) return '';

  return `<available_tools>\n${sections.join('\n')}\n</available_tools>`;
}
