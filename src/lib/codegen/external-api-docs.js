import externalApisData from '../data/external_apis.json' with { type: 'json' };

const SCRAPER_URL = 'https://x8jt0vamu0.execute-api.us-east-1.amazonaws.com/prod/extract-api-docs'

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
 * @param {Array} apis - Array of API objects with name, endpoint_url, purpose, and optional doc_link/doc_description
 * @returns {Promise<string>} Formatted documentation string
 */
export async function fetchExternalApiDocs(apis) {
  if (!apis || apis.length === 0) {
    return "";
  }

  const apiDocs = [];

  for (const api of apis) {
    const endpointUrl = api.endpoint_url || api.endpoint;
    const docLink = api.doc_link && typeof api.doc_link === 'string' ? api.doc_link.trim() : '';
    const docDescription = api.doc_description && typeof api.doc_description === 'string'
      ? api.doc_description.trim()
      : '';

    let scraped = null;

    if (docLink) {
      if (!process.env.AWS_API_SCRAPER_API_KEY) {
        console.warn('[external-api-docs] AWS_API_SCRAPER_API_KEY not set; skipping scraper call for', api.name);
      } else {
        try {
          const response = await fetch(SCRAPER_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.AWS_API_SCRAPER_API_KEY,
            },
            body: JSON.stringify({
              doc_link: docLink,
              api_name: api.name,
            }),
          });

          if (response.ok) {
            const json = await response.json();
            if (json && json.status === 'success' && json.data && json.data.doc_content) {
              scraped = {
                source: json.source,
                apiName: json.data.api_name || api.name,
                apiUrl: json.data.api_url || null,
                docContent: json.data.doc_content,
              };
            } else {
              console.warn(
                '[external-api-docs] Scraper returned non-success for',
                api.name,
                '- status:',
                json?.status
              );
            }
          } else {
            console.warn(
              '[external-api-docs] Scraper HTTP error for',
              api.name,
              '- status:',
              response.status
            );
          }
        } catch (error) {
          console.error('[external-api-docs] Failed to scrape docs for', api.name, '-', error.message);
        }
      }
    }

    let doc = '';

    if (scraped && scraped.docContent) {
      const { docContent } = scraped;
      const baseUrl =
        docContent.base_url ||
        scraped.apiUrl ||
        endpointUrl ||
        null;

      doc += `### ${scraped.apiName}\n`;
      doc += `**Base URL**: ${baseUrl || 'Unknown'}\n\n`;

      if (Array.isArray(docContent.endpoints) && docContent.endpoints.length > 0) {
        doc += `**Key endpoints**:\n`;
        docContent.endpoints.forEach((ep) => {
          if (!ep) return;
          const method = ep.method || 'GET';
          const path = ep.path || '/';
          const description = ep.description || 'No description provided';
          doc += `- ${method.toUpperCase()} ${path}: ${description}\n`;
        });
        doc += `\n`;
      }

      if (docContent.authentication && docContent.authentication.type) {
        const authType = docContent.authentication.type;
        const authDesc = docContent.authentication.description || '';
        doc += `**Authentication**: ${authType}${authDesc ? ` — ${authDesc}` : ''}\n\n`;
      }

      // Optionally include compact examples if present
      const firstEndpoint = Array.isArray(docContent.endpoints) && docContent.endpoints.length > 0
        ? docContent.endpoints[0]
        : null;

      if (firstEndpoint?.request_example) {
        doc += `**Request example**:\n\`\`\`json\n${firstEndpoint.request_example}\n\`\`\`\n\n`;
      }

      if (firstEndpoint?.response_example) {
        doc += `**Response example**:\n\`\`\`json\n${firstEndpoint.response_example}\n\`\`\`\n\n`;
      }
    } else {
      // Fallback to local catalog-based documentation
      const apiResult = searchExternalAPI(api.name);

      if (!apiResult.error) {
        doc += `### ${apiResult.name}\n`;
        doc += `**Description**: ${apiResult.description}\n\n`;
        doc += `**Base URL**: ${endpointUrl || apiResult.base_url}\n\n`;
        doc += `**Authentication**: ${apiResult.authentication}\n\n`;

        if (apiResult.common_endpoints && apiResult.common_endpoints.length > 0) {
          doc += `**Common Endpoints**:\n`;
          apiResult.common_endpoints.forEach((endpoint) => {
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
      } else {
        // If API not found in docs, still include basic info
        doc += `### ${api.name}\n**Endpoint**: ${endpointUrl || 'Not specified'}\n*Note: API documentation not available. Use standard REST API patterns.*\n`;
      }
    }

    if (docDescription) {
      doc += `\n**User-provided usage notes:**\n${docDescription}\n`;
    }

    if (doc) {
      apiDocs.push(doc.trim());
    }
  }

  return apiDocs.join("\n\n");
}

