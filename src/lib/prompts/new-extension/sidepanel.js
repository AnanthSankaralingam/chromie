import { WORKSPACE_AUTH_INSTRUCTIONS_POPUP_SIDEPANEL } from '../instructions/workspace-auth-instructions.js';
import { WORKSPACE_OAUTH_SETUP_EXPLANATION, WORKSPACE_OAUTH_SETUP_FILE } from '../instructions/workspace-oauth-setup-prompt.js';

export const NEW_EXT_SIDEPANEL_PROMPT = `You are a Chrome extension development expert. Your task is to implement a Chrome extension with a side panel frontend based on the user request.

<user_request>
{USER_REQUEST}
</user_request>

<use_case_and_chrome_apis>
{USE_CASE_CHROME_APIS}
</use_case_and_chrome_apis>

<external_resources>
{EXTERNAL_RESOURCES}
</external_resources>

${WORKSPACE_AUTH_INSTRUCTIONS_POPUP_SIDEPANEL}

<side_panel_implementation_requirements>
<side_panel_strategy>
MANDATORY: Implement Chrome's side panel API for persistent extension UI.
- Panel stays open alongside web content
- Communicates with content scripts via messaging
- Provides continuous functionality while browsing
- Modern, responsive design with proper navigation
</side_panel_strategy>

<side_panel_structure>
Side panels require:
1. side_panel declaration in manifest.json
2. Dedicated HTML file for the panel interface
3. JavaScript file for panel logic
4. Content script for webpage interaction (if needed)
5. Background script for coordination
</side_panel_structure>

<side_panel_template>
// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'openSidePanel',
    title: 'Open side panel',
    contexts: ['all']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'openSidePanel') {
    // This will open the panel in all the pages on the current window.
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});
</side_panel_template>

<manifest_configuration>
Required manifest.json sections:
{
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "permissions": ["sidePanel", "activeTab"],
  "action": {}
}
</manifest_configuration>
</side_panel_implementation_requirements>

<styling_requirements>
MANDATORY: Create simple, clean styles.css with basic colors and styling. NO emojis in generated code.

Core Principles:
- Width: 340-400px | Spacing: 12px, 16px, 20px, 24px | Border-radius: 8px
- Use simple solid colors, basic borders, and minimal shadows
- Simple transitions: ease 0.2s

Color Schemes (choose ONE):
1. Light: Primary #2563eb, Background #ffffff, Text #1f2937, Border #e5e7eb
2. Dark: Primary #3b82f6, Background #1f2937, Text #f9fafb, Border #374151
3. Neutral: Primary #4b5563, Background #f9fafb, Text #111827, Border #d1d5db

Components:
- Typography: system-ui, -apple-system | 14px body, 16px heading | Weights 500-600 for headings
- Buttons: Padding 8px 16px | Radius 6px | Solid background color + white text | Hover: slight opacity change
- Inputs: Padding 8px 12px | Radius 6px | Border 1px solid | Focus: 2px solid border
- Cards: Padding 16px | Radius 8px | Border 1px solid | Simple shadow: 0 1px 3px rgba(0,0,0,0.1)

Simple Effects:
- Basic hover states with opacity or background color change
- Simple borders and shadows
- No gradients, glassmorphism, or complex effects
- No emojis in any generated code
</styling_requirements>

<icon_configuration>
MANDATORY: Use ONLY these available icon files:
- icons/icon16.png, icons/icon48.png, icons/icon128.png (main extension icons)
- icons/planet-icon.png, icons/search-icon.png, icons/timer-icon.png, icons/note-icon.png
- icons/home-icon.png, icons/heart-icon.png, icons/cloud-icon.png, icons/calendar-icon.png

Usage in side panel: Always use chrome.runtime.getURL() in JavaScript.
Example: document.getElementById('icon').src = chrome.runtime.getURL('icons/home-icon.png');
</icon_configuration>

<output_requirements>
Return a JSON object with the following structure:
{
  "explanation": "BRIEF markdown explanation of how the extension works. IF this extension uses Google Workspace APIs (check manifest.json for oauth2 section), APPEND the workspace OAuth setup instructions from WORKSPACE_OAUTH_SETUP_EXPLANATION to your explanation.",
  "manifest.json": {valid JSON object},
  "background.js": "service worker code as raw text",
  "sidepanel.html": "side panel HTML as raw text",
  "sidepanel.js": "side panel JavaScript as raw text",
  "content.js": "optional: webpage interaction code as raw text",
  "styles.css": "optional: side panel styling as raw text",
  "OAUTH_SETUP.md": "IF this extension uses Google Workspace APIs (has oauth2 in manifest.json), include the full WORKSPACE_OAUTH_SETUP_FILE content. Otherwise, omit this file."
}

File Format Rules:
- manifest.json: Valid JSON object with quoted keys
- All other files: Raw text strings with proper newlines
- No JSON encoding of file contents
</output_requirements>

<implementation_guidelines>
- Create a comprehensive side panel interface
- Implement proper messaging between panel and content scripts
- Do not generate placeholder code
- Implement proper error handling, comments, and logging
- Do not use emojis in any generated code, UI text, or console logs
</implementation_guidelines>
`;