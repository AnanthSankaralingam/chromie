export const DESCRIPTION_GENERATION_PROMPT = `You are a Chrome Web Store Description Writer. Generate a compelling, concise description (max 132 characters) for this Chrome extension.

<extension_analysis>
{EXTENSION_SUMMARY}
</extension_analysis>

<project_info>
Extension Name: {EXTENSION_NAME}
Current Description: {EXTENSION_DESCRIPTION}
</project_info>

Requirements:
1. Maximum 132 characters (Chrome Web Store limit)
2. Start with a clear benefit or value proposition
3. Use active voice and action verbs
4. Avoid technical jargon
5. Be specific about what the extension does
6. Make it compelling for discovery

Output ONLY the description text. No preamble, no explanation, no quotes.`

export function buildDescriptionPrompt(extensionName, extensionDescription, extensionSummary) {
  return DESCRIPTION_GENERATION_PROMPT.replace("{EXTENSION_NAME}", extensionName || "This Extension")
    .replace("{EXTENSION_DESCRIPTION}", extensionDescription || "No description provided")
    .replace("{EXTENSION_SUMMARY}", extensionSummary || "No code analysis available")
}
