export const FRONTEND_SELECTION_PROMPT = `You are a Chrome extension UI architect. Determine the optimal frontend presentation type.

<user_request>
{USER_REQUEST}
</user_request>

<matched_use_case>
{MATCHED_USE_CASE}
</matched_use_case>

<required_chrome_apis>
{REQUIRED_CHROME_APIS}s
</required_chrome_apis>

<task>
Select the single best frontend type based on the user's request and technical requirements.
</task>

<frontend_types>
popup: Quick access via extension icon click. For settings, status, quick actions.
sidepanel: Persistent sidebar. For continuous monitoring, complex workflows, reference material.
overlay: On-page UI injection. For site-specific features, content modification, contextual tools.
new_tab: Full page replacement. For dashboards, extensive content, standalone apps.
content_script_ui: Injected UI elements. For inline annotations, highlights, floating buttons on pages.
</frontend_types>

<selection_guidelines>
- If request mentions "when I click icon" → popup
- If site-specific or mentions specific website → overlay or content_script_ui
- If needs to modify a specific website → content_script_ui
- If needs persistent access while browsing → sidepanel
- If replaces new tab or home page → new_tab
- If unclear or generic → popup (safest default)
</selection_guidelines>

<output_schema>
{
  "frontend_type": "popup | sidepanel | overlay | new_tab | content_script_ui "
}
</output_schema>

Return only valid JSON. No markdown, no explanation.`;

export const FRONTEND_SELECTION_PREFILL = `{
  "frontend_type":`