// Chrome extension suggestions - descriptions without "An extension that" prefix
export const extensionSuggestions = [
  {
    id: "rewards-tracker",
    title: "Loyalty rewards tracker",
    description: "helps users track and manage their loyalty points and rewards.",
    category: "Travel",
    keywords: ["rewards", "loyalty", "points", "cashback", "membership", "travel", "tracking"]
  },
  {
    id: "data-extractor",
    title: "Web data extraction tool",
    description: "notifies employees when they have redeemable rewards.",
    category: "HR",
    keywords: ["data", "extraction", "scraping", "business", "intelligence", "export", "analysis"]
  },
  {
    id: "media-authenticity-checker",
    title: "Visual media authenticity verifier",
    description: "analyzes webpage audio for AI deepfakes.",
    category: "Deepfake Detection",
    keywords: ["deepfake", "detection", "ai", "authenticity", "media", "verification", "manipulation"]
  },
  {
    id: "grammar-assistant",
    title: "Advanced grammar and style checker",
    description: "provides real-time AI editing and rewriting of text.",
    category: "Writing",
    keywords: ["grammar", "writing", "style", "checker", "proofreading", "editing", "tone"]
  },
  {
    id: "meeting-scheduler",
    title: "Smart meeting scheduler",
    description: "integrates with calendar platforms to allow users to schedule meetings.",
    category: "Productivity",
    keywords: ["scheduling", "meetings", "calendar", "availability", "timezone", "appointments", "coordination"]
  },
  {
    id: "lead-manager",
    title: "Lead capture and management tool",
    description: "surfaces CRM data from any website.",
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
