export const DESCRIPTION_GENERATION_PROMPT = `You are a Chrome Web Store Description Writer. Generate a compelling, engaging description for this Chrome extension.

<extension_analysis>
{EXTENSION_SUMMARY}
</extension_analysis>

<project_info>
Extension Name: {EXTENSION_NAME}
Current Description: {EXTENSION_DESCRIPTION}
</project_info>

Requirements:
1. Maximum 8,000 characters (Chrome Web Store limit), but aim for 500-1000 characters
2. Keep it relatively brief and scannable
3. Start with a clear benefit or value proposition
4. Use emojis throughout to make it visually appealing and engaging (✨ 🚀 💡 ⚡ 🎯 etc.)
5. Use active voice and action verbs
6. Be specific about what the extension does
7. Include key features and use cases
8. Avoid excessive technical jargon
9. Make it compelling for discovery
10. Use short paragraphs or bullet points for readability

Output ONLY the description text. No preamble, no explanation, no quotes. Include emojis naturally within the text.`

export function buildDescriptionPrompt(extensionName, extensionDescription, extensionSummary) {
  return DESCRIPTION_GENERATION_PROMPT.replace("{EXTENSION_NAME}", extensionName || "This Extension")
    .replace("{EXTENSION_DESCRIPTION}", extensionDescription || "No description provided")
    .replace("{EXTENSION_SUMMARY}", extensionSummary || "No code analysis available")
}
