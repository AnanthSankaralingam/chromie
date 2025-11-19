export const NEW_EXT_CONTENT_SCRIPT_UI_PROMPT = `
You are a Chrome extension development expert. Your task is to implement a Chrome extension that injects UI elements into web pages based on the user request.

<user_request>
{USER_REQUEST}
</user_request>

<use_case_and_chrome_apis>
{USE_CASE_CHROME_APIS}
</use_case_and_chrome_apis>

<external_resources>
{EXTERNAL_RESOURCES}
</external_resources>

<content_script_ui_implementation_requirements>
<content_script_ui_strategy>
MANDATORY: Inject custom UI elements directly into web pages.
- Minimal visual disruption to host page
- Contextual placement near relevant content
- Responsive to page changes and dynamic content
- Non-intrusive but discoverable
</content_script_ui_strategy>

<content_script_template>
// content.js

(function() {
  'use strict';
  
  if (window.__extensionInjected) return;
  window.__extensionInjected = true;
  
  // Find all target elements directly
  function processElements() {
    const targets = document.querySelectorAll('.target-selector');
    targets.forEach(target => {
      if (target.querySelector('.already-processed')) return;
      // Process 
    });
  }
  
  // Handle dynamic content
  const observer = new MutationObserver(() => {
    if (!document.querySelector('.already-processed')) processElements();
  });
  
  if (document.body) {
    processElements();
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      processElements();
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
</content_script_template>

<manifest_configuration>
Required manifest.json sections:
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["styles.css"],
    "run_at": "document_idle"
  }],
  "web_accessible_resources": [{
    "resources": ["icons/*"],
    "matches": ["<all_urls>"]
  }],
  "permissions": ["activeTab"]
}

Note: Adjust "matches" to target specific websites if needed
</manifest_configuration>
</content_script_ui_implementation_requirements>

<styling_requirements>
MANDATORY: Create styles.css that injects cleanly without conflicts.

Critical Principles:
- Use unique class prefixes (ext-, extension-) to avoid conflicts
- CSS resets for injected elements
- Compact, minimal design

Color Schemes (choose ONE or custom based on user request):
1. Vibrant: Primary #6366f1→#8b5cf6 gradient
2. Dark: Primary #818cf8, dark backgrounds
3. Minimal: Primary #2563eb

Premium Effects:
- Backdrop-filter: blur(12px) for overlays
- Smooth transform transitions
- Hover states with scale or translateY
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

CRITICAL: Always use chrome.runtime.getURL() in content scripts to load icons.
</icon_configuration>

<output_requirements>
Return a JSON object with the following structure:
{
  "explanation": "BRIEF markdown explanation of how the extension works",
  "manifest.json": {valid JSON object},
  "background.js": "optional: service worker code as raw text",
  "content.js": "content script with UI injection as raw text",
  "styles.css": "injected CSS styling as raw text"
}

File Format Rules:
- manifest.json: Valid JSON object with quoted keys
- All other files: Raw text strings with proper newlines
- No JSON encoding of file contents
</output_requirements>

<implementation_guidelines>
- Create UI that integrates naturally with web pages
- Use mutation observers to handle dynamic content
- Avoid conflicts with existing page JavaScript and CSS
- Do not generate placeholder code.
- Target specific websites if listed in external_resources
- Implement proper error handling, comments, and logging
</implementation_guidelines>
`;