// Chrome extension suggestions - one per category for tab-complete functionality
export const extensionSuggestions = [
  {
    id: "rewards-tracker",
    title: "Loyalty rewards tracker",
    description: "Build a browser extension that helps users track and manage their loyalty points, cashback rewards, and membership tiers across multiple travel and shopping platforms in one centralized dashboard.",
    category: "Travel",
    keywords: ["rewards", "loyalty", "points", "cashback", "membership", "travel", "tracking"]
  },
  {
    id: "data-extractor",
    title: "Web data extraction tool",
    description: "Develop an extension that extracts structured data from websites into CSV or JSON format, supporting table scraping, list extraction, and custom data point collection for business intelligence purposes.",
    category: "HR",
    keywords: ["data", "extraction", "scraping", "business", "intelligence", "export", "analysis"]
  },
  {
    id: "media-authenticity-checker",
    title: "Visual media authenticity verifier",
    description: "Develop an extension that analyzes images and videos on webpages for signs of AI manipulation or deepfakes using metadata analysis, visual artifact detection, and inconsistency highlighting.",
    category: "Deepfake Detection",
    keywords: ["deepfake", "detection", "ai", "authenticity", "media", "verification", "manipulation"]
  },
  {
    id: "grammar-assistant",
    title: "Advanced grammar and style checker",
    description: "Develop a writing extension that provides real-time grammar checking, style suggestions, tone analysis, and readability scores across any text field in the browser with contextual recommendations.",
    category: "Writing",
    keywords: ["grammar", "writing", "style", "checker", "proofreading", "editing", "tone"]
  },
  {
    id: "meeting-scheduler",
    title: "Smart meeting scheduler",
    description: "Develop an extension that integrates with calendar platforms to suggest optimal meeting times, check availability across teams, and automatically generate scheduling links with timezone conversion support.",
    category: "Productivity",
    keywords: ["scheduling", "meetings", "calendar", "availability", "timezone", "appointments", "coordination"]
  },
  {
    id: "lead-manager",
    title: "Lead capture and management tool",
    description: "Build an extension that helps sales teams capture lead information from LinkedIn, company websites, and contact forms, organizing prospects with tags, notes, and follow-up reminders in a centralized system.",
    category: "Sales",
    keywords: ["leads", "sales", "crm", "prospects", "business", "contact", "management"]
  }
];

// Helper function to search suggestions (used by TabCompleteSuggestions component)
export function searchSuggestions(query, limit = 8) {
  if (!query || query.length < 2) return [];

  const searchTerm = query.toLowerCase().trim();
  const results = [];

  // Score each suggestion based on relevance
  extensionSuggestions.forEach(suggestion => {
    let score = 0;

    // Exact title match gets highest score
    if (suggestion.title.toLowerCase().includes(searchTerm)) {
      score += 100;
    }

    // Description match gets medium score
    if (suggestion.description.toLowerCase().includes(searchTerm)) {
      score += 50;
    }

    // Keyword match gets lower score
    const keywordMatches = suggestion.keywords.filter(keyword =>
      keyword.toLowerCase().includes(searchTerm)
    ).length;
    score += keywordMatches * 20;

    // Category match gets small score
    if (suggestion.category.toLowerCase().includes(searchTerm)) {
      score += 10;
    }

    if (score > 0) {
      results.push({ ...suggestion, score });
    }
  });

  // Sort by score (descending) and return top results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
