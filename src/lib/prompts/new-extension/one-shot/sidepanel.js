import { WORKSPACE_AUTH_INSTRUCTIONS_POPUP_SIDEPANEL } from '../../instructions/workspace-auth-instructions.js';
import { WORKSPACE_OAUTH_SETUP_EXPLANATION, WORKSPACE_OAUTH_SETUP_FILE } from '../../instructions/workspace-oauth-setup-prompt.js';

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
4. Content script for webpage interaction (if needed)
5. Background script for coordination
</side_panel_structure>

<messaging_pattern>
CRITICAL: When sidepanel.js communicates with content scripts, use this pattern:

// sidepanel.js - Sending messages to content script
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs.length === 0) {
    console.error('[CHROMIE:sidepanel.js] No active tab found');
    return;
  }
  
  const tabId = tabs[0].id;
  
  chrome.tabs.sendMessage(tabId, { action: 'scanPage' }, (response) => {
    if (chrome.runtime.lastError) {
      // CRITICAL: Log chrome.runtime.lastError.message, not the object itself
      console.error('[CHROMIE:sidepanel.js] Error:', chrome.runtime.lastError.message);
      // Content script may not be injected (chrome:// pages, extension pages, etc.)
      return;
    }
    
    if (response && response.elements) {
      // Handle successful response
    }
  });
});

// Store tabId for later use (e.g., in event handlers)
let currentTabId = null;
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs.length > 0) {
    currentTabId = tabs[0].id;
  }
});

// Use stored tabId in event handlers
card.addEventListener('mouseover', () => {
  if (currentTabId) {
    chrome.tabs.sendMessage(currentTabId, { action: 'highlightElement', elementId: elementData.id }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[CHROMIE:sidepanel.js] Error:', chrome.runtime.lastError.message);
      }
    });
  }
});
</messaging_pattern>

<chrome_messaging_api_rules>
Chrome Messaging Best Practices:
- In port.onMessage listeners (chrome.runtime.onConnect), do NOT use 'sender'; only (message) is received.
- To access sender/tab info, pass it in the message or capture it earlier.
- If you need 'sender', use chrome.runtime.onMessage or chrome.tabs.onMessage (these provide (message, sender, sendResponse)).
- Never reference 'sender' in port.onMessage.addListener callbacks.
</chrome_messaging_api_rules>

<side_panel_template>
// background.js
console.log('[CHROMIE:background.js] Service worker loaded');

// Set up side panel to open when action button is clicked
chrome.runtime.onInstalled.addListener(() => {
  console.log('[CHROMIE:background.js] Extension installed');
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
</side_panel_template>

<manifest_configuration>
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

CRITICAL: Always include the "background" section with a service_worker when using sidePanel.
The background.js should use chrome.action.onClicked (not contextMenus) to open the side panel.
This avoids requiring the "contextMenus" permission.
</manifest_configuration>
</side_panel_implementation_requirements>

<styling_requirements>
MANDATORY: Create cutting-edge styles.css with modern, premium aesthetics.

Core Principles:
- Width: 340-400px | Spacing: 12px, 16px, 20px, 24px | Border-radius: 12px
- Transitions: cubic-bezier(0.4, 0, 0.2, 1) 0.2s

Color Schemes (choose ONE):
1. Glass Dark: BG #0f172a, Surface rgba(255,255,255,0.1) + blur(12px), Primary #818cf8, Text #f1f5f9/#94a3b8
2. Sophisticated: Accent #0ea5e9/#8b5cf6, BG #18181b/#ffffff, Surface #27272a/#f4f4f5
3. Vibrant: Gradient primary (#6366f1→#8b5cf6), BG #fafafa, Text #0f172a/#64748b

Components:
- Typography: system-ui, -apple-system | 13px body, 18px heading, 22px hero | Weights 600+ for headings | letter-spacing: -0.02em (headings)
- Buttons: Padding 10-12px 18-24px | Radius 12px or pill (999px) | Primary: gradient + white text | Hover: translateY(-1px) + shadow | Transition with cubic-bezier
- Inputs: Padding 10px 14px | Radius 12px | Focus: 2px primary border or ring (0 0 0 3px rgba(primary, 0.1))
- Cards: Padding 20-24px | Radius 12px | Shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06) | Glass option: border 1px rgba(255,255,255,0.18) + backdrop-filter

Premium Effects:
- Hover: scale(1.02) or translateY(-2px) + enhanced shadow
- Backdrop-filter: blur(12px) for overlays/glass
- Focus: Glowing ring with primary color
- Layered shadows for realistic depth
- Custom scrollbar styling (webkit-scrollbar)
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

<console_logging_requirements>
MANDATORY: Add console.log statements to track key events. Include the filename in each log:
- Log script initialization: console.log('[CHROMIE:filename.js] Script loaded')
- Log important operations and user interactions
- Log errors: console.error('[CHROMIE:filename.js] Error:', error)

All console.log, console.error, console.warn, and console.info MUST include the filename (e.g., [CHROMIE:background.js], [CHROMIE:sidepanel.js], [CHROMIE:content.js]).
</console_logging_requirements>

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