// Comprehensive list of Chrome extension building suggestions
export const extensionSuggestions = [
  // Productivity Extensions
  {
    id: "todo-list",
    title: "To-do list manager",
    description: "Create a simple to-do list extension that lets users add, remove, and check off daily tasks directly from the browser toolbar.",
    category: "Productivity",
    keywords: ["todo", "task", "productivity", "list", "manager", "checklist", "organize"]
  },
  {
    id: "password-generator",
    title: "Password generator",
    description: "Build a secure password generator that creates random passwords with adjustable length and optional special characters.",
    category: "Security",
    keywords: ["password", "generator", "security", "random", "strong", "secure"]
  },
  {
    id: "note-taking",
    title: "Quick note taker",
    description: "Develop a note-taking extension that saves quick notes or snippets locally for easy reference later.",
    category: "Productivity",
    keywords: ["notes", "notepad", "memo", "quick", "save", "text"]
  },
  {
    id: "time-tracker",
    title: "Simple time tracker",
    description: "Create a lightweight time tracker that measures how long users spend on specific websites using the Chrome tabs API.",
    category: "Productivity",
    keywords: ["time", "tracker", "monitor", "productivity", "usage"]
  },
  {
    id: "pomodoro-timer",
    title: "Pomodoro timer",
    description: "Build a timer that cycles between focus and break sessions, with sound or notification alerts when time is up.",
    category: "Productivity",
    keywords: ["pomodoro", "timer", "focus", "break", "productivity"]
  },

  // Social Media & Communication
  {
    id: "social-media-blocker",
    title: "Social media blocker",
    description: "Block distracting social media sites by redirecting or hiding their content for a set duration.",
    category: "Productivity",
    keywords: ["block", "social media", "focus", "distraction", "productivity"]
  },
  {
    id: "twitter-scheduler",
    title: "Tweet draft saver",
    description: "Allow users to write and save tweet drafts locally for later posting instead of full scheduling automation.",
    category: "Social Media",
    keywords: ["twitter", "tweet", "draft", "save", "social media"]
  },
  {
    id: "linkedin-helper",
    title: "LinkedIn note keeper",
    description: "Add a small notes widget for LinkedIn profiles to jot down personal notes about connections without automation.",
    category: "Social Media",
    keywords: ["linkedin", "notes", "networking", "professional"]
  },

  // Web Development & Design
  {
    id: "color-picker",
    title: "Color picker tool",
    description: "Extract colors from any webpage element using the EyeDropper API and show hex/RGB values.",
    category: "Design",
    keywords: ["color", "picker", "design", "hex", "rgb", "palette"]
  },
  {
    id: "screenshot-tool",
    title: "Screenshot capture tool",
    description: "Capture visible areas of a webpage using Chrome’s capture APIs and save images locally.",
    category: "Utility",
    keywords: ["screenshot", "capture", "image", "screen", "save"]
  },
  {
    id: "css-inspector",
    title: "CSS viewer",
    description: "Display CSS properties for hovered elements without editing — a read-only visual inspector.",
    category: "Development",
    keywords: ["css", "inspector", "styles", "debug", "developer"]
  },
  {
    id: "font-identifier",
    title: "Font info viewer",
    description: "Detect and display font families, sizes, and colors for selected text on any webpage.",
    category: "Design",
    keywords: ["font", "typography", "identifier", "text", "design"]
  },

  // Shopping & E-commerce
  {
    id: "price-tracker",
    title: "Price bookmarker",
    description: "Save and track prices manually for your favorite products instead of scraping multiple sites.",
    category: "Shopping",
    keywords: ["price", "tracker", "shopping", "deals", "save"]
  },
  {
    id: "coupon-finder",
    title: "Manual coupon saver",
    description: "Let users store and copy coupon codes for online stores without automatic injection.",
    category: "Shopping",
    keywords: ["coupon", "discount", "deals", "savings", "shopping"]
  },
  {
    id: "wishlist-manager",
    title: "Shopping wishlist",
    description: "Save and organize product links into a personal wishlist stored locally in the browser.",
    category: "Shopping",
    keywords: ["wishlist", "shopping", "save", "products", "favorites"]
  },

  // News & Content
  {
    id: "news-aggregator",
    title: "Custom news bookmarks",
    description: "Allow users to manually add and organize RSS or news URLs into a personal feed.",
    category: "News",
    keywords: ["news", "feed", "articles", "headlines", "reader"]
  },
  {
    id: "reading-mode",
    title: "Simplified reading mode",
    description: "Toggle a cleaner reading view by hiding ads and distracting elements from articles.",
    category: "Utility",
    keywords: ["reading", "mode", "clean", "distraction-free", "article"]
  },
  {
    id: "translation-tool",
    title: "Quick text translator",
    description: "Use Google Translate’s web API to translate selected text snippets inline.",
    category: "Utility",
    keywords: ["translate", "translation", "language", "text"]
  },
  {
    id: "article-summarizer",
    title: "Manual article highlighter",
    description: "Let users highlight and save key points from articles manually, instead of using AI summarization.",
    category: "Productivity",
    keywords: ["highlight", "summary", "article", "reading", "content"]
  },

  // Entertainment & Media
  {
    id: "youtube-enhancer",
    title: "YouTube focus mode",
    description: "Hide comments and recommended videos for a distraction-free YouTube viewing experience.",
    category: "Entertainment",
    keywords: ["youtube", "video", "focus", "clean", "watch"]
  },
  {
    id: "music-player",
    title: "Mini audio player",
    description: "Play and control local or embedded audio files from a simple toolbar popup.",
    category: "Entertainment",
    keywords: ["music", "player", "audio", "controls"]
  },
  {
    id: "gif-maker",
    title: "GIF generator (local)",
    description: "Convert local video snippets into GIFs using the canvas API — no online upload required.",
    category: "Media",
    keywords: ["gif", "creator", "video", "animation"]
  },

  // Privacy & Security
  {
    id: "ad-blocker",
    title: "Simple ad hider",
    description: "Hide common ad elements on pages using CSS selectors instead of custom filter lists.",
    category: "Privacy",
    keywords: ["ad blocker", "ads", "privacy", "filter", "clean"]
  },
  {
    id: "tracker-blocker",
    title: "Cookie consent hider",
    description: "Hide or auto-dismiss cookie banners for a smoother browsing experience.",
    category: "Privacy",
    keywords: ["privacy", "cookies", "block", "clean", "anonymous"]
  },
  {
    id: "vpn-checker",
    title: "IP info display",
    description: "Show current IP and approximate location using a free public API — read-only info display.",
    category: "Security",
    keywords: ["vpn", "ip", "location", "privacy", "connection"]
  },

  // Utility & Tools
  {
    id: "qr-generator",
    title: "QR code generator",
    description: "Generate a QR code for the current tab’s URL or user-input text.",
    category: "Utility",
    keywords: ["qr code", "generator", "url", "text", "share"]
  },
  {
    id: "url-shortener",
    title: "Link copy helper",
    description: "Copy and manage frequently used URLs without relying on third-party shorteners.",
    category: "Utility",
    keywords: ["url", "link", "copy", "share", "short"]
  },
  {
    id: "weather-widget",
    title: "Basic weather viewer",
    description: "Display weather data for a fixed location using a simple public weather API.",
    category: "Utility",
    keywords: ["weather", "forecast", "temperature", "location", "widget"]
  },
  {
    id: "calculator",
    title: "Popup calculator",
    description: "Create a basic calculator with memory and history stored locally.",
    category: "Utility",
    keywords: ["calculator", "math", "computation", "numbers"]
  },

  // Accessibility & Health
  {
    id: "dark-mode",
    title: "Dark mode toggle",
    description: "Apply a custom dark theme to any website using CSS filters and user-set colors.",
    category: "Accessibility",
    keywords: ["dark mode", "theme", "night", "accessibility"]
  },
  {
    id: "text-to-speech",
    title: "Text-to-speech reader",
    description: "Read selected text aloud using the built-in Web Speech API with adjustable speed.",
    category: "Accessibility",
    keywords: ["text to speech", "tts", "voice", "reading"]
  },
  {
    id: "eye-care",
    title: "Screen dimmer",
    description: "Add an adjustable overlay to dim bright screens and remind users to take breaks.",
    category: "Health",
    keywords: ["eye care", "filter", "health", "screen", "break"]
  },

  // Business & Finance
  {
    id: "expense-tracker",
    title: "Expense log",
    description: "Manually record and categorize expenses directly within the extension popup.",
    category: "Finance",
    keywords: ["expense", "tracker", "finance", "budget", "money"]
  },
  {
    id: "crypto-tracker",
    title: "Crypto price viewer",
    description: "Fetch and display live prices for selected cryptocurrencies using a free public API.",
    category: "Finance",
    keywords: ["crypto", "bitcoin", "prices", "market"]
  },
  {
    id: "invoice-generator",
    title: "Simple invoice builder",
    description: "Create and export basic invoices as downloadable PDFs — no login required.",
    category: "Business",
    keywords: ["invoice", "generator", "billing", "template"]
  },

  // Learning & Education
  {
    id: "flashcard-maker",
    title: "Flashcard creator",
    description: "Create and review flashcards saved locally to help with study sessions.",
    category: "Education",
    keywords: ["flashcard", "study", "learning", "education"]
  },
  {
    id: "dictionary-lookup",
    title: "Word lookup tool",
    description: "Look up definitions and synonyms of selected words using a free dictionary API.",
    category: "Education",
    keywords: ["dictionary", "definition", "lookup", "vocabulary"]
  },
  {
    id: "grammar-checker",
    title: "Basic text proofreader",
    description: "Highlight potential spelling mistakes using a simple dictionary-based check.",
    category: "Writing",
    keywords: ["grammar", "spell check", "writing", "proofreading"]
  },

  // Custom & Advanced
  {
    id: "api-tester",
    title: "Simple API tester",
    description: "Send GET and POST requests to any endpoint and view the JSON response — no auth required.",
    category: "Development",
    keywords: ["api", "testing", "http", "requests", "json"]
  },
  {
    id: "regex-tester",
    title: "Regex tester",
    description: "Test and visualize regular expressions with real-time matching results.",
    category: "Development",
    keywords: ["regex", "pattern", "testing", "developer"]
  },
  {
    id: "bookmark-organizer",
    title: "Simple bookmark manager",
    description: "List and organize bookmarks using Chrome’s built-in bookmarks API with search and tags.",
    category: "Utility",
    keywords: ["bookmark", "manager", "organize", "tags", "favorites"]
  }
];

// Helper function to search suggestions
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

// Get suggestions by category
export function getSuggestionsByCategory(category) {
  return extensionSuggestions.filter(suggestion => 
    suggestion.category.toLowerCase() === category.toLowerCase()
  );
}

// Get random suggestions
export function getRandomSuggestions(count = 5) {
  const shuffled = [...extensionSuggestions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
