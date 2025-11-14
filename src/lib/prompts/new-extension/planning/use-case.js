export const USE_CASE_CHROME_APIS_PROMPT = `You are a Chrome extension use case matcher. Analyze the user's request and identify the most similar predefined use case and required Chrome APIs.

<user_request>
{USER_REQUEST}
</user_request>

<available_use_cases>
Tab Manager, Bookmark Organizer, Page Content Modifier, Highlight to Action, Social Media Tool, Productivity Tracker, Form Filler, Shopping Assistant, Content Blocker, Notification Manager
</available_use_cases>

<task>
1. Match the user's request to the most similar use case from the list (or null if no good match exists - threshold: <70% similarity)
2. Identify all Chrome APIs required to implement this functionality
3. Return JSON matching the exact schema below
</task>

<chrome_api_examples>
Common APIs: "storage", "tabs", "bookmarks", "notifications", "identity", "scripting", "alarms", "contextMenus", "history", "webRequest", "cookies", "windows", "action", "tabGroups", "downloads", "runtime", "identity"
</chrome_api_examples>

<output_schema>
{
  "matched_use_case": {
    "name": "string or null",
        "category": "string or null"
  },
  "required_chrome_apis": ["array of API names or empty array"]
}
</output_schema>

Return only valid JSON. No markdown, no explanation.`;

//TODO define use cases json and update chrome api examples. 