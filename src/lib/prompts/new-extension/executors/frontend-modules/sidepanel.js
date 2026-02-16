export const SIDEPANEL_FRONTEND_MODULE = `
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
4. Background script for coordination (if needed)
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

<implementation_guidelines>
- CRITICAL: Only use chrome.sidePanel methods that exist: setPanelBehavior(), open(), getOptions()
- CRITICAL: chrome.sidePanel has NO event listeners (no onOpen, no onClose, no addListener methods)
- CRITICAL: Use chrome.action.onClicked instead of chrome.contextMenus to avoid requiring "contextMenus" permission
- CRITICAL: Ensure all required permissions are declared in manifest.json for any Chrome APIs you use
</implementation_guidelines>
</side_panel_implementation_requirements>
`
