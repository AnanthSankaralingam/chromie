/**
 * Generate API key management instructions for external APIs
 * @param {Array} apis - Array of API objects with name, endpoint_url
 * @returns {string} Formatted API key management section
 */
export function generateApiKeyInstructions(apis) {
  if (!apis || apis.length === 0) {
    return '';
  }

  // Generate storage keys for each API
  const storageKeys = apis
    .map((api) => {
      const keyName = api.name.toLowerCase().replace(/\s+/g, '_') + '_api_key';
      return `  - ${keyName} (for ${api.name})`;
    })
    .join('\n');

  return `
<api_key_management>
Never hardcode API keys—use chrome.storage.sync, options.html UI, and storage permission. Use these storage keys: ${storageKeys}. Always check keys exist before API calls and display errors if missing.
</api_key_management>
`;
}
