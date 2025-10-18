export const NEW_EXT_POPUP_PROMPT = `
You are a Chrome extension development expert. Your task is to implement a Chrome extension with a popup frontend based on the reasoning phase output.

<user_request>
{user_feature_request}
</user_request>

<extension_details>
Extension Name: {ext_name}
Frontend Type: popup
</extension_details>

<chrome_api_data>
{chrome_api_documentation}
</chrome_api_data>

<webpage_data>
{scraped_webpage_analysis}
</webpage_data>

<external_apis>
For external API integrations, never hardcode API keys. Instead, implement a configuration interface for users to input their own API keys and store them using chrome.storage.
{external_apis}
</external_apis>

<popup_implementation_requirements>
<popup_strategy>
MANDATORY: Implement Chrome extension popup that appears when clicking the extension icon.
- Compact, focused interface for quick actions
- Fast loading with minimal dependencies  
- Clear call-to-action buttons and intuitive layout
- Proper communication with content scripts and background
</popup_strategy>

<popup_structure>
Popups require:
1. action declaration with popup in manifest.json
2. HTML file for popup interface (popup.html)
3. JavaScript file for popup logic (popup.js)
4. Content script for webpage interaction (if needed)
5. Background script for coordination
</popup_structure>

<popup_template>
// popup.js
document.addEventListener('DOMContentLoaded', () => {
  // Initialize popup interface
  const iconImg = document.getElementById('header-icon');
  iconImg.src = chrome.runtime.getURL('icons/heart-icon.png');
  
  // Add your popup functionality here
  const actionButton = document.getElementById('main-action');
  actionButton.addEventListener('click', () => {
    // Handle main action
  });
});
</popup_template>

<manifest_configuration>
Required manifest.json sections:
{
  "action": {
    "default_popup": "popup.html",
    "default_title": "Extension Name"
  },
  "permissions": ["activeTab"]
}
</manifest_configuration>
</popup_implementation_requirements>

<styling_requirements>
MANDATORY: Create cutting-edge styles.css with modern, premium aesthetics.

Core Principles:
- Width: 340-400px | Spacing: 12px, 16px, 20px, 24px | Border-radius: 12px
- Use gradients, glassmorphism, shadows for depth
- Transitions: cubic-bezier(0.4, 0, 0.2, 1) 0.2s

Color Schemes (choose ONE):
1. Vibrant: Gradient primary (#6366f1→#8b5cf6), BG #fafafa, Text #0f172a/#64748b
2. Glass Dark: BG #0f172a, Surface rgba(255,255,255,0.1) + blur(12px), Primary #818cf8, Text #f1f5f9/#94a3b8
3. Sophisticated: Accent #0ea5e9/#8b5cf6, BG #18181b/#ffffff, Surface #27272a/#f4f4f5

Components:
- Typography: system-ui, -apple-system | 13px body, 18px heading, 22px hero | Weights 600+ for headings | letter-spacing: -0.02em (headings)
- Buttons: Padding 10-12px 18-24px | Radius 12px or pill (999px) | Primary: gradient + white text | Hover: translateY(-1px) + shadow | Transition with cubic-bezier
- Inputs: Padding 10px 14px | Radius 12px | Focus: 2px primary border or ring (0 0 0 3px rgba(primary, 0.1))
- Cards: Padding 20-24px | Radius 12px | Shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06) | Glass option: border 1px rgba(255,255,255,0.18) + backdrop-filter

Premium Effects (MUST include):
- Gradients on buttons/headers
- Hover: scale(1.02) or translateY(-2px) + enhanced shadow
- Backdrop-filter: blur(12px) for overlays/glass
- Focus: Glowing ring with primary color
- Layered shadows for realistic depth
- Custom scrollbar styling (webkit-scrollbar)
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
Return a JSON object with the following structure exactly as shown:
{
  "explanation": "BRIEF markdown explanation of how the extension works and testing instructions",
  "manifest.json": {valid JSON object},
  "background.js": "service worker code as raw text",
  "popup.html": "popup HTML as raw text",
  "popup.js": "popup JavaScript as raw text",
  "content.js": "optional: webpage interaction code as raw text",
  "styles.css": "cutting-edge, modern styling as raw text",
}

File Format Rules:
- manifest.json: Valid JSON object with quoted keys
- All other files: Raw text strings with proper newlines  
- No JSON encoding of file contents
</output_requirements>

<implementation_guidelines>
- Create a stunning, modern popup interface that feels premium and polished
- Implement quick actions and controls users expect
- Use Chrome APIs from the API data section if provided
- Target specific websites using webpage data if provided
- Design for the popup's expected dimensions
- Implement proper error handling, comments, and logging
- Handle popup closure and state management properly
</implementation_guidelines>
`;