// Chrome extension suggestions - descriptions without "An extension that" prefix
export const extensionSuggestions = [
  {
    id: "rewards-tracker",
    title: "Loyalty rewards tracker",
    description: "an extension that helps users track and manage their loyalty points and rewards.",
    category: "Travel",
    keywords: ["rewards", "loyalty", "points", "cashback", "membership", "travel", "tracking"]
  },
  {
    id: "data-extractor",
    title: "Web data extraction tool",
    description: "an extension that notifies employees when they have redeemable rewards.",
    category: "HR",
    keywords: ["data", "extraction", "scraping", "business", "intelligence", "export", "analysis"]
  },
  {
    id: "note-taker",
    title: "Quick note taker",
    description: "an extension that lets you save notes and highlights from any webpage.",
    category: "Productivity",
    keywords: ["notes", "highlight", "save", "bookmark", "writing", "research", "clipboard"]
  },
  {
    id: "meeting-scheduler",
    title: "Smart meeting scheduler",
    description: "an extension that integrates with calendar platforms to allow users to schedule meetings.",
    category: "Productivity",
    keywords: ["scheduling", "meetings", "calendar", "availability", "timezone", "appointments", "coordination"]
  },
  {
    id: "ad-blocker",
    title: "Ad and tracker blocker",
    description: "an extension that blocks ads, pop-ups, and tracking scripts while you browse.",
    category: "Privacy",
    keywords: ["ad blocker", "ads", "privacy", "tracker", "popup", "blocking", "security"]
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
