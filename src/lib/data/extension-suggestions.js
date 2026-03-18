// Chrome extension suggestions - descriptions without "An extension that" prefix
export const extensionSuggestions = [
  {
    id: "job-autofill",
    title: "Job application autofiller",
    description: "automatically fills out job application forms on LinkedIn, Workday, and Ashby.",
    prompt: "Build a job application autofiller extension. When the user clicks the extension icon on a job application page (LinkedIn Easy Apply, Workday, Ashby, Greenhouse), it should detect the form fields and automatically fill them in using stored profile data (name, email, phone, experience, education). Include a settings popup where the user can save and edit their profile information. Show a success notification when fields are filled.",
    category: "Productivity",
    keywords: ["job", "autofill", "linkedin", "workday", "application", "resume", "hiring"]
  },
  {
    id: "chatgpt-sidepanel",
    title: "ChatGPT side panel",
    description: "opens a ChatGPT chat panel on any webpage so you can ask questions while browsing.",
    prompt: "Build a ChatGPT side panel extension. When the user clicks the extension icon, open a side panel with a full chat interface powered by the OpenAI API. The user should be able to type messages and get responses from GPT-4o. Include a button to quote selected text from the current page directly into the chat. Store the API key in extension settings and persist the conversation history for the session.",
    category: "AI",
    keywords: ["chatgpt", "ai", "sidepanel", "assistant", "openai", "chat", "gpt"]
  },
  {
    id: "note-taker",
    title: "Quick note taker",
    description: "lets you save notes and highlights from any webpage.",
    prompt: "Build a quick note taker extension. When the user highlights text on any webpage and right-clicks, show a context menu option to save it as a note. Notes should be stored with the page URL, favicon, and timestamp. The popup should show all saved notes grouped by website, with the ability to search, copy, and delete notes. Export all notes as a markdown file.",
    category: "Productivity",
    keywords: ["notes", "highlight", "save", "bookmark", "writing", "research", "clipboard"]
  },
  {
    id: "pomodoro-timer",
    title: "Pomodoro focus timer",
    description: "runs focus and break intervals in a new tab with session tracking.",
    prompt: "Build a Pomodoro focus timer extension that opens in a new tab. Show a large countdown timer with 25-minute focus sessions and 5-minute breaks (with a longer 15-minute break every 4 sessions). Include start, pause, and reset controls. Play a soft sound when a session ends. Track completed sessions for the day and show a simple daily stats view. Let the user customise the focus and break durations in settings.",
    category: "Productivity",
    keywords: ["pomodoro", "timer", "focus", "productivity", "break", "sessions", "tracking"]
  },
  {
    id: "tab-manager",
    title: "Tab memory manager",
    description: "groups, suspends, and saves browser tabs to reduce memory usage.",
    prompt: "Build a tab memory manager extension. Show a popup listing all open tabs with their memory usage. Let the user suspend inactive tabs (unload them from memory while keeping them in the tab bar) with one click. Include an auto-suspend feature that suspends tabs not visited in the last 30 minutes. Allow saving groups of tabs as named sessions that can be restored later. Show total memory saved.",
    category: "Productivity",
    keywords: ["tabs", "memory", "manager", "suspend", "groups", "browser", "performance"]
  },
  {
    id: "coupon-finder",
    title: "Coupon & discount finder",
    description: "automatically finds and applies coupon codes at checkout on shopping sites.",
    prompt: "Build a coupon and discount finder extension. When the user is on a checkout page (Amazon, eBay, Etsy, or any site with a promo code field), automatically detect the coupon input field and try a list of known coupon codes one by one, keeping the one that gives the biggest discount. Show a badge on the extension icon when a coupon is available. Display the savings amount in a popup after applying.",
    category: "Shopping",
    keywords: ["coupon", "discount", "promo", "checkout", "shopping", "savings", "deals"]
  },
  {
    id: "ai-resume-tailor",
    title: "AI resume tailor",
    description: "rewrites your resume bullets to match a job description using AI.",
    prompt: "Build an AI resume tailor extension. The user pastes their resume and a job description into the extension popup. Using the OpenAI API, rewrite the resume's bullet points and summary to better match the keywords and requirements in the job description. Show the original and rewritten versions side by side. Include a copy button and a slider to control how aggressively the resume is rewritten.",
    category: "AI",
    keywords: ["resume", "ai", "job", "tailor", "rewrite", "career", "openai"]
  },
  {
    id: "youtube-bookmarker",
    title: "YouTube video bookmarker",
    description: "saves timestamped bookmarks on YouTube videos so you can return to key moments.",
    prompt: "Build a YouTube video bookmarker extension. While watching a YouTube video, the user can press a keyboard shortcut (or click a button injected below the video) to save a bookmark at the current timestamp with an optional label. Show all bookmarks for the current video in a panel next to the player. Clicking a bookmark jumps to that timestamp. Store bookmarks per video URL and show them across sessions.",
    category: "Productivity",
    keywords: ["youtube", "bookmark", "timestamp", "video", "save", "notes", "clips"]
  },
  {
    id: "rewards-tracker",
    title: "Loyalty rewards tracker",
    description: "helps users track and manage their loyalty points and rewards across programs.",
    prompt: "Build a loyalty rewards tracker extension. The user can add their rewards program accounts (airline miles, hotel points, credit card rewards, coffee shop stamps) with their current balance. The popup shows all programs in a dashboard with point totals, expiry dates, and estimated cash value. Let the user manually update balances and set low-balance alerts. Show a summary of total rewards value across all programs.",
    category: "Travel",
    keywords: ["rewards", "loyalty", "points", "cashback", "membership", "travel", "tracking"]
  },
  {
    id: "web-scraper",
    title: "Web data extractor",
    description: "scrapes and exports structured data from any webpage into CSV or JSON.",
    prompt: "Build a web data extractor extension. The user can click on elements on any webpage to select them as data columns (e.g. product name, price, rating). The extension identifies the repeating pattern and extracts all matching rows from the page. Show the extracted data in a preview table inside the popup. Allow exporting as CSV or JSON with one click. Support pagination by letting the user define a 'next page' button to scrape multiple pages.",
    category: "Business",
    keywords: ["data", "extraction", "scraping", "export", "csv", "json", "analysis"]
  },
  {
    id: "ai-writing-assistant",
    title: "AI writing assistant",
    description: "rewrites, summarises, or expands selected text on any webpage.",
    prompt: "Build an AI writing assistant extension. When the user selects text on any webpage or in a text input, show a small floating toolbar with options: Rewrite, Summarise, Expand, Fix grammar, and Change tone. When an option is clicked, send the selected text to the OpenAI API and show the result in a popup. For text inputs, include a 'Replace' button to swap the original text with the AI output. Store the API key in settings.",
    category: "AI",
    keywords: ["writing", "ai", "rewrite", "summarise", "expand", "text", "assistant"]
  },
  {
    id: "meeting-cheat-sheet",
    title: "Live meeting cheat sheet",
    description: "listens to your meetings and surfaces talking points and answers in real time.",
    prompt: "Build a live meeting cheat sheet extension. When the user starts a meeting (Google Meet, Zoom web), the extension captures the audio transcript in real time using the Web Speech API. It sends the last few sentences to the OpenAI API and suggests relevant talking points, answers, or follow-up questions in a floating sidebar. The user can also pre-load a document (job description, product brief) that the AI uses as context for its suggestions.",
    category: "AI",
    keywords: ["meeting", "ai", "realtime", "cheat", "talking points", "interview", "sales"]
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
