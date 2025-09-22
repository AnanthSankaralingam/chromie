// Comprehensive list of Chrome extension building suggestions
export const extensionSuggestions = [
  // Productivity Extensions
  {
    id: "todo-list",
    title: "To-do list manager",
    description: "Create a simple to-do list extension that helps users track tasks and manage productivity directly from their browser toolbar",
    category: "Productivity",
    keywords: ["todo", "task", "productivity", "list", "manager", "checklist", "organize"]
  },
  {
    id: "password-generator",
    title: "Password generator", 
    description: "Build a secure password generator that creates strong, customizable passwords with options for length, special characters, and complexity",
    category: "Security",
    keywords: ["password", "generator", "security", "random", "strong", "secure", "encryption"]
  },
  {
    id: "note-taking",
    title: "Quick note taker",
    description: "Develop a note-taking extension that allows users to quickly jot down thoughts, save snippets, and sync notes across devices",
    category: "Productivity", 
    keywords: ["notes", "notepad", "memo", "quick", "save", "text", "snippets"]
  },
  {
    id: "time-tracker",
    title: "Time tracking tool",
    description: "Create a time tracking extension that monitors how much time users spend on different websites and provides productivity insights",
    category: "Productivity",
    keywords: ["time", "tracker", "monitor", "productivity", "analytics", "usage", "statistics"]
  },
  {
    id: "pomodoro-timer",
    title: "Pomodoro timer",
    description: "Build a Pomodoro technique timer with customizable work/break intervals, notifications, and progress tracking for better focus",
    category: "Productivity",
    keywords: ["pomodoro", "timer", "focus", "break", "work", "productivity", "concentration"]
  },

  // Social Media & Communication
  {
    id: "social-media-blocker",
    title: "Social media blocker",
    description: "Design a social media blocking extension that helps users stay focused by temporarily blocking access to distracting websites",
    category: "Productivity",
    keywords: ["block", "social media", "focus", "distraction", "productivity", "facebook", "twitter", "instagram"]
  },
  {
    id: "twitter-scheduler",
    title: "Tweet scheduler",
    description: "Create a Twitter scheduling extension that allows users to compose and schedule tweets for optimal posting times",
    category: "Social Media",
    keywords: ["twitter", "tweet", "schedule", "social media", "post", "timing", "automation"]
  },
  {
    id: "linkedin-helper",
    title: "LinkedIn connection helper",
    description: "Build a LinkedIn automation tool that helps users send personalized connection requests and manage their professional network",
    category: "Social Media", 
    keywords: ["linkedin", "connection", "networking", "professional", "automation", "messages", "outreach"]
  },

  // Web Development & Design
  {
    id: "color-picker",
    title: "Color picker tool",
    description: "Develop a color picker extension that allows designers and developers to extract colors from any webpage with hex, RGB, and HSL values",
    category: "Design",
    keywords: ["color", "picker", "design", "hex", "rgb", "palette", "eyedropper", "web design"]
  },
  {
    id: "screenshot-tool",
    title: "Screenshot capture tool",
    description: "Create a comprehensive screenshot extension with options for full page, visible area, or selected region capture with editing features",
    category: "Utility",
    keywords: ["screenshot", "capture", "image", "screen", "save", "crop", "edit", "annotation"]
  },
  {
    id: "css-inspector",
    title: "CSS style inspector",
    description: "Build a CSS inspection tool that shows computed styles, allows live editing, and helps developers debug styling issues",
    category: "Development",
    keywords: ["css", "inspector", "styles", "debug", "developer", "web development", "design"]
  },
  {
    id: "font-identifier",
    title: "Font identifier",
    description: "Create a font identification extension that detects and displays font information from any text on a webpage",
    category: "Design",
    keywords: ["font", "typography", "identifier", "text", "design", "typeface", "web fonts"]
  },

  // Shopping & E-commerce
  {
    id: "price-tracker",
    title: "Price comparison tracker",
    description: "Design a price tracking extension that monitors product prices across multiple retailers and alerts users to deals and price drops",
    category: "Shopping",
    keywords: ["price", "tracker", "shopping", "deals", "comparison", "alerts", "savings", "ecommerce"]
  },
  {
    id: "coupon-finder",
    title: "Coupon code finder",
    description: "Build an automatic coupon finder that searches for and applies discount codes during online checkout processes",
    category: "Shopping", 
    keywords: ["coupon", "discount", "deals", "savings", "promo code", "shopping", "checkout"]
  },
  {
    id: "wishlist-manager",
    title: "Shopping wishlist manager",
    description: "Create a universal wishlist extension that allows users to save products from any website and track price changes",
    category: "Shopping",
    keywords: ["wishlist", "shopping", "save", "products", "favorites", "bookmark", "ecommerce"]
  },

  // News & Content
  {
    id: "news-aggregator",
    title: "News feed aggregator",
    description: "Develop a news aggregation extension that collects articles from multiple sources and presents them in a clean, organized feed",
    category: "News",
    keywords: ["news", "aggregator", "feed", "articles", "headlines", "sources", "reader"]
  },
  {
    id: "reading-mode",
    title: "Reading mode enhancer",
    description: "Create a reading mode extension that removes distractions, improves typography, and provides a clean reading experience",
    category: "Utility",
    keywords: ["reading", "mode", "clean", "typography", "distraction-free", "article", "text"]
  },
  {
    id: "translation-tool",
    title: "Page translation tool",
    description: "Build a translation extension that can translate selected text or entire web pages into different languages instantly",
    category: "Utility",
    keywords: ["translate", "translation", "language", "international", "multilingual", "text", "page"]
  },
  {
    id: "article-summarizer",
    title: "Article summarizer",
    description: "Design an AI-powered article summarizer that extracts key points and creates concise summaries of long-form content",
    category: "Productivity",
    keywords: ["summarizer", "summary", "article", "ai", "key points", "reading", "content"]
  },

  // Entertainment & Media
  {
    id: "youtube-enhancer",
    title: "YouTube video enhancer",
    description: "Create a YouTube enhancement extension with features like ad blocking, speed controls, and video downloading capabilities",
    category: "Entertainment",
    keywords: ["youtube", "video", "enhancer", "ad blocker", "download", "speed", "player"]
  },
  {
    id: "music-player",
    title: "Web music player",
    description: "Build a universal music player extension that works across different streaming platforms with unified controls",
    category: "Entertainment", 
    keywords: ["music", "player", "streaming", "controls", "spotify", "youtube music", "audio"]
  },
  {
    id: "gif-maker",
    title: "GIF creator from videos",
    description: "Develop a GIF creation tool that converts video clips from any website into animated GIFs with customization options",
    category: "Media",
    keywords: ["gif", "creator", "video", "animation", "convert", "media", "meme"]
  },

  // Privacy & Security
  {
    id: "ad-blocker",
    title: "Custom ad blocker",
    description: "Create a lightweight ad blocking extension with customizable filters and whitelist capabilities for better browsing",
    category: "Privacy",
    keywords: ["ad blocker", "ads", "privacy", "filter", "blocking", "clean browsing", "security"]
  },
  {
    id: "tracker-blocker",
    title: "Privacy tracker blocker",
    description: "Build a privacy-focused extension that blocks tracking scripts, cookies, and other data collection mechanisms",
    category: "Privacy",
    keywords: ["privacy", "tracker", "blocker", "cookies", "security", "data protection", "anonymous"]
  },
  {
    id: "vpn-checker",
    title: "VPN status checker",
    description: "Design a VPN monitoring extension that displays connection status, IP location, and provides quick access to VPN controls",
    category: "Security",
    keywords: ["vpn", "security", "ip", "location", "privacy", "connection", "status"]
  },

  // Utility & Tools
  {
    id: "qr-generator",
    title: "QR code generator",
    description: "Create a QR code generator that converts URLs, text, or current page into scannable QR codes with customization options",
    category: "Utility",
    keywords: ["qr code", "generator", "url", "text", "scan", "mobile", "share"]
  },
  {
    id: "url-shortener",
    title: "URL shortener tool",
    description: "Build a URL shortening extension that creates short links for easy sharing with click tracking and analytics",
    category: "Utility",
    keywords: ["url", "shortener", "link", "share", "analytics", "tracking", "short"]
  },
  {
    id: "weather-widget",
    title: "Weather forecast widget",
    description: "Develop a weather extension that shows current conditions and forecasts with location-based updates and alerts",
    category: "Utility",
    keywords: ["weather", "forecast", "temperature", "conditions", "location", "widget", "climate"]
  },
  {
    id: "calculator",
    title: "Advanced calculator",
    description: "Create a calculator extension with basic and scientific functions, unit conversions, and calculation history",
    category: "Utility",
    keywords: ["calculator", "math", "scientific", "conversion", "computation", "numbers", "formula"]
  },

  // Accessibility & Health
  {
    id: "dark-mode",
    title: "Universal dark mode",
    description: "Build a dark mode extension that applies dark themes to any website with customizable colors and brightness settings",
    category: "Accessibility",
    keywords: ["dark mode", "theme", "night", "accessibility", "eye strain", "brightness", "contrast"]
  },
  {
    id: "text-to-speech",
    title: "Text-to-speech reader",
    description: "Create a text-to-speech extension that reads selected text or entire articles aloud with voice and speed controls",
    category: "Accessibility",
    keywords: ["text to speech", "tts", "accessibility", "voice", "reading", "audio", "speech"]
  },
  {
    id: "eye-care",
    title: "Blue light filter",
    description: "Design an eye care extension that reduces blue light emission from screens and provides break reminders for eye health",
    category: "Health",
    keywords: ["blue light", "eye care", "filter", "health", "screen", "strain", "break"]
  },

  // Business & Finance
  {
    id: "expense-tracker",
    title: "Expense tracker",
    description: "Create a personal finance extension that tracks online purchases, categorizes expenses, and provides spending insights",
    category: "Finance",
    keywords: ["expense", "tracker", "finance", "budget", "money", "spending", "purchases"]
  },
  {
    id: "crypto-tracker",
    title: "Cryptocurrency tracker",
    description: "Build a crypto portfolio tracker that monitors coin prices, shows market trends, and calculates portfolio value",
    category: "Finance",
    keywords: ["cryptocurrency", "crypto", "bitcoin", "portfolio", "tracker", "prices", "market"]
  },
  {
    id: "invoice-generator",
    title: "Invoice generator",
    description: "Develop an invoice creation extension for freelancers and small businesses with templates and client management",
    category: "Business",
    keywords: ["invoice", "generator", "business", "freelancer", "billing", "template", "client"]
  },

  // Learning & Education
  {
    id: "flashcard-maker",
    title: "Flashcard study tool",
    description: "Create a flashcard extension that helps students create, organize, and review study materials with spaced repetition",
    category: "Education",
    keywords: ["flashcard", "study", "learning", "education", "memory", "review", "spaced repetition"]
  },
  {
    id: "dictionary-lookup",
    title: "Dictionary lookup tool",
    description: "Build a dictionary extension that provides instant definitions, synonyms, and pronunciations for selected text",
    category: "Education",
    keywords: ["dictionary", "definition", "lookup", "vocabulary", "language", "learning", "words"]
  },
  {
    id: "grammar-checker",
    title: "Grammar and spell checker",
    description: "Design a grammar checking extension that highlights errors and suggests corrections in text fields and forms",
    category: "Writing",
    keywords: ["grammar", "spell check", "writing", "correction", "language", "proofreading", "text"]
  },

  // Custom & Advanced
  {
    id: "api-tester",
    title: "REST API testing tool",
    description: "Create an API testing extension that allows developers to make HTTP requests, test endpoints, and view responses",
    category: "Development",
    keywords: ["api", "rest", "testing", "http", "developer", "endpoints", "requests", "json"]
  },
  {
    id: "regex-tester",
    title: "Regular expression tester",
    description: "Build a regex testing tool that validates patterns, provides matches, and offers common regex examples and explanations",
    category: "Development",
    keywords: ["regex", "regular expression", "pattern", "testing", "developer", "validation", "match"]
  },
  {
    id: "bookmark-organizer",
    title: "Bookmark manager",
    description: "Develop an advanced bookmark manager with tagging, search, duplicate detection, and import/export capabilities",
    category: "Utility",
    keywords: ["bookmark", "manager", "organize", "tags", "search", "favorites", "links"]
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
