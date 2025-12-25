import { REQUEST_TYPES } from "../prompts/request-types";

/**
 * Create simplified requirements analysis for existing extensions
 * @param {Object} existingFiles - Existing extension files
 * @returns {Object} Requirements analysis object
 */
export function createExistingExtensionRequirements(existingFiles) {
  const requirements = {
    frontend_type: "generic",
    docAPIs: [],
    webPageData: null,
    ext_name: "Existing Extension",
  };

  // Extract extension info from existing manifest if available
  if (existingFiles['manifest.json']) {
    try {
      const manifest = JSON.parse(existingFiles['manifest.json']);
      if (manifest.name) {
        requirements.ext_name = manifest.name;
      }
    } catch (e) {
      console.warn('Could not parse existing manifest.json:', e.message);
    }
  }

  return requirements;
}

/**
 * Check if URL scraping is required but not provided
 * @param {Object} requirements - Requirements analysis
 * @param {string} userProvidedUrl - User-provided URL
 * @param {boolean} skipScraping - Whether to skip scraping
 * @returns {Object|null} URL requirement data or null if not needed
 */
export function checkUrlRequirement(requirements, userProvidedUrl, skipScraping) {
  if (
    requirements.webPageData &&
    requirements.webPageData.length > 0 &&
    !userProvidedUrl &&
    !skipScraping
  ) {
    return {
      requiresUrl: true,
      detectedSites: requirements.webPageData,
      detectedUrls: requirements.webPageData.map((site) => `https://${site}`),
    };
  }
  return null;
}

/**
 * Check if external APIs are required but not provided
 * @param {Object} requirements - Requirements analysis
 * @param {Array} userProvidedApis - User-provided APIs
 * @returns {Object|null} API requirement data or null if not needed
 */
export function checkApiRequirement(requirements, userProvidedApis) {
  if (
    requirements.suggestedAPIs &&
    requirements.suggestedAPIs.length > 0 &&
    !userProvidedApis
  ) {
    return {
      requiresApi: true,
      suggestedAPIs: requirements.suggestedAPIs,
    };
  }
  return null;
}

/**
 * Format external APIs for prompt context
 * @param {Array} userProvidedApis - Array of API objects with name and endpoint
 * @returns {string} Formatted APIs string
 */
export function formatExternalApisContext(userProvidedApis) {
  if (!userProvidedApis || userProvidedApis.length === 0) {
    return '';
  }

  return userProvidedApis
    .map(api => `${api.name}: ${api.endpoint}`)
    .join('\n');
}

/**
 * Format files as XML tags for use in prompts
 * Universal format for both patching and replacement prompts
 * @param {Object} files - Map of file paths to contents
 * @returns {string} Formatted XML string with file tags
 */
export function formatFilesAsXml(files) {
  if (!files || typeof files !== 'object') {
    return '';
  }

  return Object.entries(files)
    .map(([path, content]) => `<file path="${path}">\n${content}\n</file>`)
    .join('\n\n');
}

/**
 * Determine which prompt to use based on request type and frontend type
 * @param {string} requestType - Type of request
 * @param {string} frontendType - Type of frontend (popup, sidepanel, overlay, new_tab, content_script_ui)
 * @param {Object} prompts - Object containing all prompt templates
 * @returns {string} Selected prompt template
 */
export function selectPrompt(requestType, frontendType, prompts) {
  if (requestType === REQUEST_TYPES.ADD_TO_EXISTING) {
    return prompts.UPDATE_EXT_PROMPT;
  }

  switch (frontendType) {
    case "sidepanel":
    case "side_panel":
      return prompts.NEW_EXT_SIDEPANEL_PROMPT;
    case "popup":
      return prompts.NEW_EXT_POPUP_PROMPT;
    case "overlay":
      return prompts.NEW_EXT_OVERLAY_PROMPT;
    case "new_tab":
    case "newtab":
      return prompts.NEW_EXT_NEW_TAB_PROMPT;
    case "content_script_ui":
    case "content_injection":
      return prompts.NEW_EXT_CONTENT_SCRIPT_UI_PROMPT;
    default:
      // Default to popup as safest fallback
      console.warn(`Unknown frontend type "${frontendType}", defaulting to popup`);
      return prompts.NEW_EXT_POPUP_PROMPT;
  }
}

