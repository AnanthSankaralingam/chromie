import { WORKSPACE_AUTH_INSTRUCTIONS_NEW_TAB } from '../instructions/workspace-auth-instructions.js';
import { WORKSPACE_OAUTH_SETUP_EXPLANATION, WORKSPACE_OAUTH_SETUP_FILE } from '../instructions/workspace-oauth-setup-prompt.js';

export const NEW_EXT_NEW_TAB_PROMPT = `You are a Chrome extension development expert. Your task is to implement a Chrome extension that replaces the new tab page.

<user_request>
{USER_REQUEST}
</user_request>

<use_case_and_chrome_apis>
{USE_CASE_CHROME_APIS}
</use_case_and_chrome_apis>

<external_resources>
{EXTERNAL_RESOURCES}
</external_resources>

${WORKSPACE_AUTH_INSTRUCTIONS_NEW_TAB}

<new_tab_implementation_requirements>

<manifest_configuration>
Required manifest.json sections:
{
  "chrome_url_overrides": {
    "newtab": "newtab.html"
  },
  "permissions": ["storage"]
}
</manifest_configuration>
</new_tab_implementation_requirements>

<styling_requirements>
MANDATORY: Create simple, clean styles.css with basic colors and styling for full-page display. NO emojis in generated code.

Core Principles:
- Full viewport | Spacing: 16px, 24px, 32px | Border-radius: 8px
- Center content with max-width (1200-1400px)
- Use simple solid colors, basic borders, and minimal shadows
- Simple transitions: ease 0.2s

Color Schemes (choose ONE):
1. Light: Primary #2563eb, Background #ffffff, Text #1f2937, Border #e5e7eb
2. Dark: Primary #3b82f6, Background #1f2937, Text #f9fafb, Border #374151
3. Neutral: Primary #4b5563, Background #f9fafb, Text #111827, Border #d1d5db

Components:
- Typography: system-ui, -apple-system | 14px body, 20px heading | Weights 500-600 for headings
- Buttons: Padding 10px 20px | Radius 6px | Solid background color + white text | Hover: slight opacity change
- Inputs: Padding 10px 14px | Radius 6px | Border 1px solid | Focus: 2px solid border
- Cards: Padding 20px | Radius 8px | Border 1px solid | Simple shadow: 0 1px 3px rgba(0,0,0,0.1)

Simple Effects:
- Basic hover states with opacity or background color change
- Simple borders and shadows
- No gradients, glassmorphism, or complex effects
- No emojis in any generated code
</styling_requirements>

<icon_configuration>
MANDATORY: Use ONLY these available icon files:
icons/add.png, icons/angle-left.png, icons/angle-right.png, icons/bulb.png, 
icons/calendar-icon.png, icons/check.png, icons/cloud-icon.png, icons/cross.png, 
icons/download.png, icons/globe.png, icons/heart-icon.png, icons/home-icon.png, 
icons/icon16.png, icons/icon48.png, icons/icon128.png, icons/info.png, 
icons/instagram.png, icons/linkedin.png, icons/list-check.png, icons/marker.png, 
icons/menu-burger.png, icons/note-icon.png, icons/paper-plane.png, icons/planet-icon.png, 
icons/refresh.png, icons/search-icon.png, icons/settings-sliders.png, icons/shopping-cart.png, 
icons/timer-icon.png, icons/trash.png, icons/user.png, icons/users-alt.png, 
icons/world.png, icons/youtube.png
</icon_configuration>

<output_requirements>
Return a JSON object with the following structure:
{
  "explanation": "BRIEF markdown explanation of how the extension works. IF this extension uses Google Workspace APIs (check manifest.json for oauth2 section), APPEND the workspace OAuth setup instructions from WORKSPACE_OAUTH_SETUP_EXPLANATION to your explanation.",
  "manifest.json": {valid JSON object},
  "background.js": "optional: service worker code as raw text",
  "newtab.html": "new tab page HTML as raw text",
  "newtab.js": "new tab page JavaScript as raw text",
  "styles.css": "simple, clean full-page styling as raw text",
  "OAUTH_SETUP.md": "IF this extension uses Google Workspace APIs (has oauth2 in manifest.json), include the full WORKSPACE_OAUTH_SETUP_FILE content. Otherwise, omit this file."
}

File Format Rules:
- manifest.json: Valid JSON object with quoted keys
- All other files: Raw text strings with proper newlines
- No JSON encoding of file contents
</output_requirements>

<implementation_guidelines>
- Create a simple, functional new tab experience
- Implement proper error handling, comments, and logging
- Do not generate placeholder code
- Do not use emojis in any generated code, UI text, or console logs
</implementation_guidelines>
`;