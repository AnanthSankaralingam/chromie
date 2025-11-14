const chromeApisData = require('../chrome_extension_apis.json');

//FIXME adapt to new API docs format
/**
 * Search for Chrome Extension API documentation
 * @param {string} apiName - The name of the Chrome API to search for
 * @returns {Object} API documentation or error object
 */
export function searchChromeExtensionAPI(apiName) {
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

/**
 * Fetch Chrome API documentation for multiple APIs
 * @param {string[]} chromeAPIs - Array of API names
 * @returns {string} Formatted documentation string
 */
export function fetchChromeApiDocs(chromeAPIs) {
  if (!chromeAPIs || chromeAPIs.length === 0) {
    return "";
  }

  const apiDocs = [];

  for (const apiName of chromeAPIs) {
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

  return apiDocs.join("\n\n");
}

