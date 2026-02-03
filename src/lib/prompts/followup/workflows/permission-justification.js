export const PERMISSION_JUSTIFICATION_PROMPT = `You are a Chrome Extension Permissions Explainer. Generate clear, user-friendly justifications for each permission.

<permissions>
{PERMISSIONS_LIST}
</permissions>

<extension_code_analysis>
{EXTENSION_SUMMARY}
</extension_code_analysis>

<chrome_api_reference>
{API_DOCS}
</chrome_api_reference>

Requirements:
1. Explain WHY each permission is needed based on actual code usage
2. Use simple, non-technical language
3. Start with "Required to..." or "Used to..."
4. Be specific (cite actual features)
5. Keep each justification to 1-2 sentences
6. Be honest and transparent

Output JSON array: [{"permission": "...", "justification": "..."}]

Example output:
[
  {"permission": "tabs", "justification": "Required to detect when you open a new tab and display the custom start page with your bookmarks."},
  {"permission": "storage", "justification": "Used to save your preferences and bookmark settings locally on your device."}
]`

export function buildPermissionJustificationPrompt(permissions, apiDocs, extensionSummary) {
  const permissionsList = Array.isArray(permissions) ? permissions.join(", ") : permissions
  const apiDocsText = typeof apiDocs === "string" ? apiDocs : JSON.stringify(apiDocs, null, 2)

  return PERMISSION_JUSTIFICATION_PROMPT.replace("{PERMISSIONS_LIST}", permissionsList)
    .replace("{EXTENSION_SUMMARY}", extensionSummary || "No code analysis available")
    .replace("{API_DOCS}", apiDocsText || "No API documentation available")
}
