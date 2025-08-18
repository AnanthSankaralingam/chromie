Reasoning Phase

1. Takes the user’s feature request.
2. Determines the frontend type (popup, side panel, overlay).
3. Calls tools as needed: getExtensionDocs for API references and scrapeWebPage for external data.
4. Outputs a structured plan including frontend type, docs data, scraped data, extension name, description, and capabilities.

Output Schema
{
  "frontend_type": "popup | side_panel | overlay",
  "docAPIs": ["array of API names needed like 'bookmarks', 'tabs', 'storage' or empty array []"],
  "webPageData": [true/false, ["array of domains like 'youtube.com', 'twitter.com' or empty array if false"]],
  "ext_name": "Descriptive extension name (3-5 words)",
  "ext_description": "Clear description of what the extension does (1-2 sentences)"
}

Coding Phase
1. Receives the reasoning output.
2. Uses a strict schema to generate code: manifest, background/service worker, content scripts, frontend files, and explanation.
3. Respects frontend injection patterns, icon configuration rules, file formatting rules, and security best practices.
4. Returns a JSON object where filenames are keys and file contents are raw text.

input schema:
{
  "role_definition": "Acts as a Chrome extension development expert.",
  "output_format": {
    "requirement": "Return JSON object where filenames are keys and file content is raw text",
    "example_structure": {
      "explanation": "Brief markdown explanation of how the extension works and how to test it",
      "manifest.json": "{...}",
      "background.js": "// service worker logic",
      "content.js": "// injected logic",
      "popup.html": "<!DOCTYPE html>..."
    }
  },
  "ui_injection_patterns": {
    "frontend_type": "popup | side_panel | overlay",
    "requirements": "Implement only the chosen pattern, never mix with others."
  },
  "icon_configuration": {
    "allowed_icons": ["..."],
    "usage_rule": "Icons must be loaded with chrome.runtime.getURL(); do not use relative paths in HTML.",
    "mandatory_sizes": [16, 48, 128] 
  },
  "file_format_rules": {
    "manifest.json": "Must be valid JSON object with keys quoted",
    "other_files": "Raw text strings with proper newlines, no JSON encoding of content"
  },
  "file_creation_guidelines": "All created files must be listed in manifest.json if applicable.",
  "final_reminder": "Prioritize overlay injection unless another type is explicitly set."
}

output:
{
  "explanation": "...",
  "manifest.json": "{...}",
  "background.js": "...",
  "content.js": "...",
  "popup.html": "..."
}


Essentially, Phase 1 plans and gathers resources, and Phase 2 generates fully structured, schema-compliant code based on that plan.
