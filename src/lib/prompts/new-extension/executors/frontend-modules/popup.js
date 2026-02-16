export const POPUP_FRONTEND_MODULE = `
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
5. Background script for coordination (if needed)
</popup_structure>

<popup_html_requirements>
CRITICAL: When generating popup.html, ensure proper sizing to prevent cutoff:
- Set width: 380px; min-height: 400px; on the body or main container
- Include proper DOCTYPE and meta viewport tags
- Ensure the main content container has padding and fills the available space
- Example structure:
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app">
    <!-- Your content here -->
  </div>
  <script src="popup.js"></script>
</body>
</html>
</popup_html_requirements>

<popup_template>
// popup.js
document.addEventListener('DOMContentLoaded', () => {
  // Add your popup functionality here
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
`
