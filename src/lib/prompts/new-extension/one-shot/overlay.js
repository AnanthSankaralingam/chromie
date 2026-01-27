import { WORKSPACE_AUTH_INSTRUCTIONS_CONTENT_SCRIPT } from '../../instructions/workspace-auth-instructions.js';
import { WORKSPACE_OAUTH_SETUP_EXPLANATION, WORKSPACE_OAUTH_SETUP_FILE } from '../../instructions/workspace-oauth-setup-prompt.js';

//TODO: Add workspace auth instructions to the prompt as dynamic content from planning orchestrator
// ${WORKSPACE_AUTH_INSTRUCTIONS_CONTENT_SCRIPT}
export const NEW_EXT_OVERLAY_PROMPT = `You are a Chrome extension development expert. Your task is to implement a Chrome extension with an overlay frontend based on the user request.

<user_request>
{USER_REQUEST}
</user_request>

<use_case_and_chrome_apis>
{USE_CASE_CHROME_APIS}
</use_case_and_chrome_apis>

<external_resources>
{EXTERNAL_RESOURCES}
</external_resources>

<overlay_implementation_requirements>
<ui_injection_strategy>
MANDATORY: Use overlay injection pattern that creates floating UI elements on web pages.
- Position: fixed with high z-index (999999+)
- Placement: Top-right corner by default (customizable)
- Styling: Modern, clean design with proper shadows and borders
- Responsiveness: Must work on all websites without breaking layout
</ui_injection_strategy>

<overlay_template>
// content.js

(function() {
  let lastUrl = location.href;
  
  function createOverlayElement() {
    const overlay = document.createElement('div');
    overlay.className = 'extension-overlay';
    overlay.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 999999; background: white; border: 2px solid #1976d2; border-radius: 12px; padding: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: -apple-system, BlinkMacSystemFont, system-ui; font-size: 14px; min-width: 200px;';
    
    // Add your overlay content here
    overlay.innerHTML = 
      '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">' +
        '<img id="icons/planet-icon.png" style="width: 20px; height: 20px;" alt="Extension">' +
        '<h3 style="margin: 0; color: #1976d2; font-size: 16px;">{ext_name}</h3>' +
      '</div>' +
      '<div id="overlay-content">' +
        '<!-- Your content here -->' +
      '</div>';
    
    // Set icon dynamically
    const iconImg = overlay.querySelector('#icons/planet-icon.png');
    iconImg.src = chrome.runtime.getURL('icons/planet-icon.png');
    
    return overlay;
  }
  
  const injectElement = () => {
    if (document.querySelector('.extension-overlay')) return;
    document.body.appendChild(createOverlayElement());
  };
  
  // Dynamic site monitoring
  new MutationObserver(() => setTimeout(injectElement, 100)).observe(document.body, { childList: true, subtree: true });
  
  // Handle URL changes for SPAs
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(injectElement, 500);
    }
  }, 1000);
  
  setTimeout(injectElement, 100);
})();
</overlay_template>
</overlay_implementation_requirements>

<styling_requirements>
MANDATORY: Create cutting-edge styles.css with modern, premium aesthetics.

Core Principles:
- Width: 340-400px | Spacing: 12px, 16px, 20px, 24px | Border-radius: 12px (MANDATORY)
- Transitions: cubic-bezier(0.4, 0, 0.2, 1) 0.2s

Color Schemes (choose ONE):
1. Glass Dark: BG #0f172a, Surface rgba(255,255,255,0.1) + blur(12px), Primary #818cf8, Text #f1f5f9/#94a3b8
2. Sophisticated: Accent #0ea5e9/#8b5cf6, BG #18181b/#ffffff, Surface #27272a/#f4f4f5
3. Vibrant: Gradient primary (#6366f1→#8b5cf6), BG #fafafa, Text #0f172a/#64748b

Components:
- Typography: system-ui, -apple-system | 13px body, 18px heading, 22px hero | Weights 600+ for headings | letter-spacing: -0.02em (headings)
- Buttons: Padding 10-12px 18-24px | Radius 12px (MANDATORY) or pill (999px) | Primary: gradient + white text | Hover: translateY(-1px) + shadow | Transition with cubic-bezier
- Inputs: Padding 10px 14px | Radius 12px (MANDATORY) | Focus: 2px primary border or ring (0 0 0 3px rgba(primary, 0.1))
- Cards: Padding 20-24px | Radius 12px (MANDATORY) | Shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06) | Glass option: border 1px rgba(255,255,255,0.18) + backdrop-filter

Premium Effects (MUST include):
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

Usage: Always use chrome.runtime.getURL() to load icons dynamically in JavaScript.
Example: const iconUrl = chrome.runtime.getURL('icons/note-icon.png');
</icon_configuration>

<chrome_messaging_api_rules>
Chrome Messaging Best Practices:
- In port.onMessage listeners (chrome.runtime.onConnect), do NOT use 'sender'; only (message) is received.
- To access sender/tab info, pass it in the message or capture it earlier.
- If you need 'sender', use chrome.runtime.onMessage or chrome.tabs.onMessage (these provide (message, sender, sendResponse)).
- Never reference 'sender' in port.onMessage.addListener callbacks.
</chrome_messaging_api_rules>

<output_requirements>
Return a JSON object with the following structure:
{
  "explanation": "BRIEF markdown explanation of how the extension works. IF this extension uses Google Workspace APIs (check manifest.json for oauth2 section), APPEND the workspace OAuth setup instructions from WORKSPACE_OAUTH_SETUP_EXPLANATION to your explanation.",
  "manifest.json": {valid JSON object},
  "background.js": "service worker code as raw text",
  "content.js": "overlay injection code as raw text",
  "options.html": "If needed for settings.",
  "options.js": "If needed for settings.",
  "styles.css": "optional: overlay styling as raw text",
  "OAUTH_SETUP.md": "IF this extension uses Google Workspace APIs (has oauth2 in manifest.json), include the full WORKSPACE_OAUTH_SETUP_FILE content. Otherwise, omit this file."
}

File Format Rules:
- manifest.json: Valid JSON object with quoted keys. IF options.html is generated, must include "options_ui": {"page": "options.html", "open_in_tab": false} and "storage" in permissions array
- All other files: Raw text strings with proper newlines
- No JSON encoding of file contents
</output_requirements>

<console_logging_requirements>
MANDATORY: Add console.log statements to track key events. Include the filename in each log:
- Log script initialization: console.log('[CHROMIE:filename.js] Script loaded')
- Log important operations and user interactions
- Log errors: console.error('[CHROMIE:filename.js] Error:', error)

All console.log, console.error, console.warn, and console.info MUST include the filename (e.g., [CHROMIE:background.js], [CHROMIE:content.js]).
</console_logging_requirements>

<implementation_guidelines>
- Create a robust overlay that works on all websites
- Implement the core functionality described in the extension details
- Implement proper error handling, comments, and logging
- Do not generate placeholder code.
</implementation_guidelines>
`;

//TODO mention web accessible resources and to use icons/* as needed