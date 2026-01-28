import { WORKSPACE_AUTH_INSTRUCTIONS_POPUP_SIDEPANEL } from '../../instructions/workspace-auth-instructions.js';
import { WORKSPACE_OAUTH_SETUP_EXPLANATION, WORKSPACE_OAUTH_SETUP_FILE } from '../../instructions/workspace-oauth-setup-prompt.js';
import { CONSOLE_LOGGING_REQUIREMENTS, ICON_CONFIGURATION, STYLING_REQUIREMENTS } from './shared-content.js';

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
4. Background script for coordination
</side_panel_structure>

<side_panel_template>
Required manifest.json sections:
{
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "permissions": ["sidePanel", "activeTab"],
  "action": {
    "default_title": "Open Side Panel"
  },
  "background": {
    "service_worker": "background.js"
  }
}

// background.js
console.log('[CHROMIE:background.js] Service worker loaded');

// Set up side panel to open when action button is clicked
chrome.runtime.onInstalled.addListener(() => {
  console.log('[CHROMIE:background.js] Extension installed');
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
</side_panel_template>

CRITICAL: Always include the "background" section with a service_worker when using sidePanel.
The background.js should use chrome.action.onClicked (not contextMenus) to open the side panel.
This avoids requiring the "contextMenus" permission.
</side_panel_implementation_requirements>

<chrome_messaging_api_rules>
Chrome Messaging Best Practices:
- In port.onMessage listeners (chrome.runtime.onConnect), do NOT use 'sender'; only (message) is received.
- To access sender/tab info, pass it in the message or capture it earlier.
- If you need 'sender', use chrome.runtime.onMessage or chrome.tabs.onMessage (these provide (message, sender, sendResponse)).
- Never reference 'sender' in port.onMessage.addListener callbacks.
</chrome_messaging_api_rules>

${STYLING_REQUIREMENTS}

${ICON_CONFIGURATION}

<output_requirements>
Return a JSON object with the following structure:
{
  "explanation": "BRIEF markdown explanation of how the extension works. IF this extension uses Google Workspace APIs (check manifest.json for oauth2 section), APPEND the workspace OAuth setup instructions from WORKSPACE_OAUTH_SETUP_EXPLANATION to your explanation.",
  "manifest.json": {valid JSON object},
  "background.js": "service worker code as raw text",
  "sidepanel.html": "side panel HTML as raw text",
  "sidepanel.js": "side panel JavaScript as raw text",
  "content.js": "optional: webpage interaction code as raw text",
  "options.html": "If needed for settings.",
  "options.js": "If needed for settings.",
  "styles.css": "optional: side panel styling as raw text",
  "OAUTH_SETUP.md": "IF this extension uses Google Workspace APIs (has oauth2 in manifest.json), include the full WORKSPACE_OAUTH_SETUP_FILE content. Otherwise, omit this file."
}

File Format Rules:
- manifest.json: Valid JSON object with quoted keys
- All other files: Raw text strings with proper newlines
- No JSON encoding of file contents
</output_requirements>

${CONSOLE_LOGGING_REQUIREMENTS}

<implementation_guidelines>
- Create a comprehensive side panel interface
- Implement proper messaging between panel and content scripts
- Do not generate placeholder code.
- Implement proper error handling, comments, and logging
- CRITICAL: Only use chrome.sidePanel methods that exist: setPanelBehavior(), open(), getOptions()
- CRITICAL: chrome.sidePanel has NO event listeners (no onOpen, no onClose, no addListener methods)
- CRITICAL: Use chrome.action.onClicked instead of chrome.contextMenus to avoid requiring "contextMenus" permission
- CRITICAL: Ensure all required permissions are declared in manifest.json for any Chrome APIs you use
</implementation_guidelines>
`;