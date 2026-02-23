export const WEB_SCRAPING_TOOL = `
<web_scraping>
Use this tool (sparingly) to scrape and extract content from specific web pages when you need to analyze website structures for DOM manipulation or data extraction features.

To call this tool, output JSON:
{
  "tool": "web_scraping",
  "url": "https://example.com",
  "intent": "what you want to extract or analyze"
}

Tool results will be provided before you generate patches.
</web_scraping>
`;
