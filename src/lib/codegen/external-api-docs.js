import externalApisData from '../data/external_apis.json' with { type: 'json' };

/**
 * Search for external API documentation
 * @param {string} apiName - The name of the API to search for (e.g., "Stripe API", "OpenAI API")
 * @returns {Object} API documentation or error object
 */
export function searchExternalAPI(apiName) {
  if (!apiName || typeof apiName !== "string") {
    return {
      error: "Invalid API name provided. Please provide a valid string.",
      available_apis: externalApisData.api_docs.map((api) => api.name),
    };
  }

  const searchTerm = apiName.toLowerCase().trim();

  // Search for exact match first
  let api = externalApisData.api_docs.find(
    (api) => api.name.toLowerCase() === searchTerm
  );

  // If no exact match, search for partial matches
  if (!api) {
    api = externalApisData.api_docs.find(
      (api) => api.name.toLowerCase().includes(searchTerm) || 
               searchTerm.includes(api.name.toLowerCase().split(' ')[0])
    );
  }

  if (!api) {
    return {
      error: `API "${apiName}" not found.`,
      available_apis: externalApisData.api_docs.map((api) => api.name),
      total_apis: externalApisData.api_docs.length,
    };
  }

  return {
    name: api.name,
    description: api.description,
    authentication: api.authentication,
    base_url: api.base_url,
    common_endpoints: api.common_endpoints,
    headers: api.headers,
    code_example: api.code_example,
  };
}

/**
 * Fetch external API documentation for multiple APIs
 * @param {Array} apis - Array of API objects with name and endpoint_url
 * @returns {string} Formatted documentation string
 */
export function fetchExternalApiDocs(apis) {
  if (!apis || apis.length === 0) {
    return "";
  }

  const apiDocs = [];

  for (const api of apis) {
    const apiResult = searchExternalAPI(api.name);
    // Handle both endpoint_url (from planning) and endpoint (from user-provided)
    const endpointUrl = api.endpoint_url || api.endpoint;
    
    if (!apiResult.error) {
      let doc = `## ${apiResult.name}\n`;
      doc += `**Description**: ${apiResult.description}\n\n`;
      doc += `**Base URL**: ${endpointUrl || apiResult.base_url}\n\n`;
      doc += `**Authentication**: ${apiResult.authentication}\n\n`;
      
      if (apiResult.common_endpoints && apiResult.common_endpoints.length > 0) {
        doc += `**Common Endpoints**:\n`;
        apiResult.common_endpoints.forEach(endpoint => {
          doc += `- ${endpoint.method} ${endpoint.path}: ${endpoint.description}\n`;
        });
        doc += `\n`;
      }

      if (apiResult.headers && Object.keys(apiResult.headers).length > 0) {
        doc += `**Required Headers**:\n`;
        Object.entries(apiResult.headers).forEach(([key, value]) => {
          doc += `- ${key}: ${value}\n`;
        });
        doc += `\n`;
      }

      if (apiResult.code_example) {
        doc += `**Code Example**:\n\`\`\`javascript\n${apiResult.code_example}\n\`\`\`\n`;
      }

      apiDocs.push(doc);
    } else {
      // If API not found in docs, still include basic info
      apiDocs.push(`## ${api.name}\n**Endpoint**: ${endpointUrl || 'Not specified'}\n*Note: API documentation not available. Use standard REST API patterns.*\n`);
    }
  }

  return apiDocs.join("\n\n");
}

