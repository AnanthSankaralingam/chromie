export const CHROME_API_SEARCH_TOOL = `
<chrome_api_search>
Use this tool to search Chrome extension API documentation when you need to verify API methods, parameters, permissions, or best practices.

To call this tool, output JSON:
{
  "tool": "chrome_api_search",
  "query": "your search query here"
}

Tool results will be provided before you generate patches.
</chrome_api_search>
`;
