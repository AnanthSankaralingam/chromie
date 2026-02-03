export const BRAND_ASSET_GENERATION_PROMPT = `You are a Chrome Web Store Brand Asset Generator. Generate a compelling, engaging brand asset for this Chrome extension.

<project_info>
Extension Name: {EXTENSION_NAME}
Current Description: {EXTENSION_DESCRIPTION}
</project_info>

<user_request>
{USER_REQUEST}
</user_request>`; 

export function buildBrandAssetGenerationPrompt(extensionName, extensionDescription, userRequest) {
  return BRAND_ASSET_GENERATION_PROMPT.replace("{EXTENSION_NAME}", extensionName || "This Extension")
    .replace("{EXTENSION_DESCRIPTION}", extensionDescription || "No description provided")
    .replace("{USER_REQUEST}", userRequest || "No user request provided")
}
