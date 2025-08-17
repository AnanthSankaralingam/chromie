// Webpage scraper using Playwright for Chrome extension development
// Conditional import to avoid build issues in production
let chromium = null;
let browser = null;

// Try to import Playwright, but don't fail if it's not available
try {
  if (process.env.NODE_ENV !== 'production') {
    const playwright = require('playwright');
    chromium = playwright.chromium;
  }
} catch (error) {
  console.log('Playwright not available, using fallback scraper');
  chromium = null;
}

/**
 * Get or create a browser instance
 * @returns {Promise<Browser|null>} Playwright browser instance or null if not available
 */
async function getBrowser() {
  if (!chromium) {
    console.log('Playwright not available, skipping browser launch');
    return null;
  }
  
  if (!browser) {
    try {
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    } catch (error) {
      console.error('Failed to launch browser:', error);
      return null;
    }
  }
  return browser;
}

/**
 * Close the browser instance
 */
async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * Convert HTML content to markdown-like format
 * @param {string} content - Text content
 * @param {string} title - Page title
 * @returns {string} Markdown-like representation
 */
function convertToMarkdown(content, title) {
  if (!content) return '';
  
  let markdown = '';
  if (title) {
    markdown += `# ${title}\n\n`;
  }
  
  // Basic text processing
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  return markdown + lines.join('\n\n');
}

/**
 * Extract title from markdown if not available
 * @param {string} markdown - Markdown content
 * @returns {string} Extracted title
 */
function extractTitleFromMarkdown(markdown) {
  const titleMatch = markdown.match(/^# (.+)$/m);
  return titleMatch ? titleMatch[1] : 'Untitled';
}

/**
 * Extract description from markdown
 * @param {string} markdown - Markdown content
 * @returns {string} Extracted description
 */
function extractDescriptionFromMarkdown(markdown) {
  const lines = markdown.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  return lines.slice(0, 2).join(' ').substring(0, 160) + '...';
}

/**
 * Primary scraper using Playwright for HTML content
 * @param {string} url - The URL to scrape
 * @returns {object} - Scraped content with HTML and converted markdown
 */
async function scrapeWithPlaywright(url) {
  // Check if Playwright is available
  if (!chromium) {
    console.log(`Playwright not available, using fallback scraper for: ${url}`);
    return {
      success: false,
      error: 'Playwright not available in production build',
      fallback: true
    };
  }
  
  let page = null;
  
  try {
    console.log(`Using Playwright to scrape: ${url}`);
    
    const browserInstance = await getBrowser();
    if (!browserInstance) {
      return {
        success: false,
        error: 'Failed to launch browser instance',
        fallback: true
      };
    }
    
    page = await browserInstance.newPage();
    
    // Set viewport and user agent
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    
    // Navigate to the page with a timeout
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });
    
    // Wait a bit for any dynamic content to load
    await page.waitForTimeout(2000);
    
    // Extract HTML content
    const html = await page.content();
    
    // Extract text content for markdown-like representation
    const textContent = await page.evaluate(() => {
      // Remove script and style elements
      const scripts = document.querySelectorAll('script, style, noscript');
      scripts.forEach(el => el.remove());
      
      // Get page title
      const title = document.title || '';
      
      // Get meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      const description = metaDesc ? metaDesc.getAttribute('content') : '';
      
      // Get main content
      const body = document.body;
      let mainContent = '';
      
      if (body) {
        // Try to find main content area
        const mainElement = body.querySelector('main, article, .content, .main, #content, #main') || body;
        mainContent = mainElement.innerText || mainElement.textContent || '';
      }
      
      return {
        title,
        description,
        content: mainContent.trim()
      };
    });
    
    // Convert to markdown-like format
    const markdown = convertToMarkdown(textContent.content, textContent.title);
    
    // Log what was actually extracted
    console.log(`\n📋 ===== PLAYWRIGHT EXTRACTION RESULTS =====`);
    console.log(`🌐 URL: ${url}`);
    console.log(`📄 Title extracted: "${textContent.title}"`);
    console.log(`📝 Description extracted: "${textContent.description}"`);
    console.log(`📏 Raw HTML length: ${html.length} characters`);
    console.log(`📄 Text content length: ${textContent.content.length} characters`);
    console.log(`📖 Markdown length: ${markdown.length} characters`);
    
    // Show a preview of the extracted text content
    console.log(`\n📖 TEXT CONTENT PREVIEW (first 300 chars):`);
    console.log(textContent.content.substring(0, 300) + '...');
    
    // Show markdown structure
    console.log(`\n📝 MARKDOWN STRUCTURE PREVIEW (first 300 chars):`);
    console.log(markdown.substring(0, 300) + '...');
    console.log(`==============================================\n`);
    
    return {
      success: true,
      data: {
        html: html,
        markdown: markdown,
        metadata: {
          title: textContent.title || extractTitleFromMarkdown(markdown),
          description: textContent.description || extractDescriptionFromMarkdown(markdown),
          sourceURL: url
        }
      }
    };
    
  } catch (error) {
    console.error(`Playwright scraping failed for ${url}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (page) {
      await page.close();
    }
  }
}

/**
 * Generate comprehensive webpage analysis optimized for LLM consumption
 * @param {string} html - HTML content
 * @param {string} markdown - Markdown content
 * @param {string} url - URL that was scraped
 * @param {string} title - Page title
 * @param {string} description - Page description
 * @returns {object} - Comprehensive analysis optimized for LLM
 */
function generateWebpageAnalysisForLLM(html, markdown, url, title, description) {
  // Get HTML structure analysis
  const htmlAnalysis = analyzeHtmlStructure(html);
  
  // Get CSS selector analysis
  const cssAnalysis = extractPotentialSelectors(markdown, html);
  
  // Get actionable elements analysis
  const actionableAnalysis = extractActionableElements(markdown || '');
  
  // Enhanced selectors with generic and overlay strategies
  const enhancedSelectors = {
    recommendedSelectors: cssAnalysis.selectors,
    totalSelectorsFound: cssAnalysis.totalFound,
    qualityScore: cssAnalysis.qualityAnalysis.confidence,
    recommendation: cssAnalysis.qualityAnalysis.recommendations,
    
    // Add common generic selectors for any website
    genericSelectors: [
      // Action areas
      '.actions', '#actions', '[role="toolbar"]', '.toolbar',
      // Content areas
      '.content', '#content', '.main-content', 'main', '[role="main"]',
      // Navigation areas
      '.nav', '.navigation', 'nav', '.menu',
      // Header areas
      '.header', '#header', 'header', '.top-bar',
      // Generic containers
      '.container', '#container', '.wrapper', '.page'
    ],
    
    // Always include overlay strategy as failsafe
    overlayStrategy: {
      enabled: true,
      position: 'top-right',
      fallbackSelectors: [
        'body', 
        '#content', 
        '.main-content', 
        'main', 
        '[role="main"]',
        '.container',
        '#container'
      ]
    }
  };
  
  // Combine into comprehensive analysis
  const analysis = {
    url: url,
    title: title,
    description: description,
    
    // Enhanced CSS Selector Analysis
    cssSelectors: enhancedSelectors,
    
    // Actionable Elements Analysis
    actionableElements: {
      elements: actionableAnalysis.elements,
      totalFound: actionableAnalysis.totalFound,
      types: [...new Set(actionableAnalysis.elements.map(el => el.type))]
    },
    
    // Enhanced scrapeability assessment
    scrapeability: {
      hasReliableSelectors: cssAnalysis.qualityAnalysis.confidence > 30 || enhancedSelectors.genericSelectors.length > 0,
      hasActionableElements: actionableAnalysis.totalFound > 0,
      confidence: 'high', // Always high confidence with overlay fallback
      overlayFallbackAvailable: true
    },
    
    // Injection reliability assessment
    injectionStrategy: {
      primaryMethod: 'multi-layer',
      fallbackMethod: 'overlay',
      mutationObserverRequired: true,
      urlMonitoringRequired: true, // Most modern sites are SPAs
      confidence: 'high' // Always high with overlay fallback
    }
  };
  
  return analysis;
}

/**
 * Analyze HTML structure for semantic elements
 * @param {string} html - HTML content
 * @returns {object} Structure analysis
 */
function analyzeHtmlStructure(html) {
  const structure = {
    hasMain: html.includes('<main'),
    hasNav: html.includes('<nav'),
    hasHeader: html.includes('<header'),
    hasFooter: html.includes('<footer'),
    hasAside: html.includes('<aside'),
    hasArticle: html.includes('<article'),
    hasSection: html.includes('<section')
  };
  
  return structure;
}

/**
 * Extract potential CSS selectors from content
 * @param {string} markdown - Markdown content
 * @param {string} html - HTML content
 * @returns {object} Selector analysis
 */
function extractPotentialSelectors(markdown, html) {
  const selectors = [];
  
  // Look for common class patterns in HTML
  const classMatches = html.match(/class=["']([^"']+)["']/g) || [];
  const idMatches = html.match(/id=["']([^"']+)["']/g) || [];
  
  // Extract useful classes (avoid random/dynamic ones)
  classMatches.forEach(match => {
    const className = match.match(/class=["']([^"']+)["']/)[1];
    const classes = className.split(/\s+/);
    classes.forEach(cls => {
      if (cls.length > 2 && cls.length < 20 && !cls.match(/^[a-f0-9]{8,}$/)) {
        selectors.push(`.${cls}`);
      }
    });
  });
  
  // Extract useful IDs
  idMatches.forEach(match => {
    const id = match.match(/id=["']([^"']+)["']/)[1];
    if (id.length > 2 && id.length < 20 && !id.match(/^[a-f0-9]{8,}$/)) {
      selectors.push(`#${id}`);
    }
  });
  
  // Add semantic selectors
  if (html.includes('<main')) selectors.push('main');
  if (html.includes('<header')) selectors.push('header');
  if (html.includes('<nav')) selectors.push('nav');
  if (html.includes('<article')) selectors.push('article');
  
  return {
    selectors: [...new Set(selectors)].slice(0, 10),
    totalFound: selectors.length,
    qualityAnalysis: {
      confidence: Math.min(80, selectors.length * 5),
      recommendations: selectors.length > 5 ? 'Good selector options available' : 'Limited selectors, may need generic approach'
    }
  };
}

/**
 * Extract actionable elements from markdown content
 * @param {string} markdown - Markdown content
 * @returns {object} Actionable elements analysis
 */
function extractActionableElements(markdown) {
  const elements = [];
  
  // Look for button-like text
  const buttonKeywords = /\b(click|button|submit|save|send|login|signup|buy|add|remove|delete|edit|view|more|next|previous|back|forward|play|pause|stop)\b/gi;
  const buttonMatches = markdown.match(buttonKeywords) || [];
  
  buttonMatches.slice(0, 5).forEach(match => {
    elements.push({
      type: 'button',
      text: match,
      confidence: 'medium',
      suggestedSelectors: [`button:contains("${match}")`, `[type="submit"]`, `.btn`]
    });
  });
  
  // Look for link patterns
  const linkPattern = /\[(.*?)\]\((.*?)\)/g;
  let linkMatch;
  while ((linkMatch = linkPattern.exec(markdown)) !== null && elements.length < 10) {
    elements.push({
      type: 'link',
      text: linkMatch[1],
      href: linkMatch[2],
      confidence: 'high',
      suggestedSelectors: [`a[href="${linkMatch[2]}"]`, `a:contains("${linkMatch[1]}")`, `.link`]
    });
  }
  
  return {
    elements: elements,
    totalFound: elements.length
  };
}

/**
 * Scrape websites for Chrome extension development context
 * @param {string} featureRequest - The user's feature request
 * @param {string} userProvidedUrl - Optional specific URL to scrape
 * @returns {object} Scraped content and analysis for extension development
 */
async function scrapeWebsitesForExtension(featureRequest, userProvidedUrl = null) {
  if (!featureRequest || typeof featureRequest !== 'string') {
    return {
      error: 'Invalid feature request provided. Please provide a valid string describing the extension functionality.',
      requiresUrlPrompt: true,
      message: 'This extension would benefit from analyzing the target website structure. Please provide a specific URL to scrape for better component relevancy.',
      detectedSites: [],
      detectedUrls: []
    };
  }

  try {
    console.log('Tool call: scrapeWebsitesForExtension - analyzing feature request for scraping needs');
    
    // If no URL provided, prompt user for specific URL
    if (!userProvidedUrl) {
      return {
        requiresUrlPrompt: true,
        message: 'I need to analyze the specific webpage structure to build this extension effectively for: ' + featureRequest + '. Please provide the exact URL(s) you want the extension to work with. For example:\n- Specific Amazon product listing page\n- Exact YouTube video or channel page\n- Specific Twitter profile or tweet\n- The actual webpage where you want the extension to function\n\nOnce you provide the correct URLs, I\'ll scrape them and build the extension accordingly.',
        detectedSites: [],
        detectedUrls: []
      };
    }

    console.log(`User provided URL for scraping: ${userProvidedUrl}`);

    // Scrape the user-provided URL
    const websites = [];
    let totalSites = 1;
    let successfulScrapes = 0;

    const url = userProvidedUrl.startsWith('http') ? userProvidedUrl : `https://${userProvidedUrl}`;
    console.log(`Scraping and analyzing: ${url}`);
    
    try {
      // Use Playwright to scrape the URL
      const scrapeResult = await scrapeWithPlaywright(url);
      
      if (scrapeResult.fallback) {
        // Playwright not available, use fallback analysis
        console.log(`Using fallback analysis for ${url} (Playwright not available)`);
        websites.push({
          siteName: new URL(url).hostname,
          url: url,
          title: `Fallback Analysis for ${new URL(url).hostname}`,
          description: `Website analysis using generic selectors (Playwright not available in production)`,
          analysis: {
            cssSelectors: {
              recommendedSelectors: [
                'body', 'main', '.content', '#main', '.container', 
                '.wrapper', '.page', '.app', '.site', '.website'
              ],
              totalSelectorsFound: 10,
              qualityScore: 50,
              recommendation: 'Using generic selectors due to Playwright unavailability',
              genericSelectors: [
                '.actions', '#actions', '[role="toolbar"]', '.toolbar',
                '.content', '#content', '.main-content', 'main', '[role="main"]',
                '.nav', '.navigation', 'nav', '.menu',
                '.header', '#header', 'header', '.top-bar',
                '.container', '#container', '.wrapper', '.page'
              ],
              overlayStrategy: {
                enabled: true,
                position: 'top-right',
                fallbackSelectors: ['body', '#content', '.main-content', 'main', '[role="main"]', '.container', '#container']
              }
            },
            actionableElements: {
              elements: [
                { type: 'button', text: 'generic', confidence: 'low', suggestedSelectors: ['button', '.btn', '[type="submit"]'] },
                { type: 'link', text: 'generic', confidence: 'low', suggestedSelectors: ['a', '.link', '[href]'] }
              ],
              totalFound: 2,
              types: ['button', 'link']
            },
            scrapeability: {
              hasReliableSelectors: true,
              hasActionableElements: true,
              confidence: 'medium',
              overlayFallbackAvailable: true
            },
            injectionStrategy: {
              primaryMethod: 'generic',
              fallbackMethod: 'overlay',
              mutationObserverRequired: true,
              urlMonitoringRequired: true,
              confidence: 'medium'
            }
          },
          originalContentLength: 0,
          source: 'fallback',
          success: true
        });
        successfulScrapes++;
      } else if (scrapeResult.success) {
        // Generate comprehensive analysis with full HTML and markdown data
        const comprehensiveAnalysis = generateWebpageAnalysisForLLM(
          scrapeResult.data.html || '',
          scrapeResult.data.markdown || '',
          url,
          scrapeResult.data.metadata?.title || '',
          scrapeResult.data.metadata?.description || ''
        );
        
        websites.push({
          siteName: new URL(url).hostname,
          url: url,
          title: scrapeResult.data.metadata?.title,
          description: scrapeResult.data.metadata?.description,
          analysis: comprehensiveAnalysis,
          originalContentLength: scrapeResult.data.markdown?.length || 0,
          source: 'playwright',
          success: true
        });
        
        successfulScrapes++;
        console.log(`✅ Successfully analyzed ${url} - ${comprehensiveAnalysis.cssSelectors.recommendedSelectors.length} selectors, ${comprehensiveAnalysis.actionableElements.totalFound} actionable elements`);
        
        // Log detailed HTML analysis
        console.log(`\n🔍 ===== RAW SCRAPED CONTENT ANALYSIS =====`);
        console.log(`📄 Page title: "${scrapeResult.data.metadata.title}"`);
        console.log(`📝 Meta description: "${scrapeResult.data.metadata.description}"`);
        console.log(`📏 HTML size: ${scrapeResult.data.html?.length || 0} characters`);
        console.log(`📄 Markdown size: ${scrapeResult.data.markdown?.length || 0} characters`);
        
        // Show first 500 chars of markdown for content preview
        if (scrapeResult.data.markdown) {
          console.log(`\n📖 MARKDOWN PREVIEW (first 500 chars):`);
          console.log(scrapeResult.data.markdown.substring(0, 500) + '...');
        }
        
        // Show HTML structure analysis
        const htmlStructure = analyzeHtmlStructure(scrapeResult.data.html);
        console.log(`\n🏗️  HTML STRUCTURE DETECTED:`);
        console.log(`   - Has <main>: ${htmlStructure.hasMain}`);
        console.log(`   - Has <nav>: ${htmlStructure.hasNav}`);
        console.log(`   - Has <header>: ${htmlStructure.hasHeader}`);
        console.log(`   - Has <article>: ${htmlStructure.hasArticle}`);
        console.log(`   - Has <section>: ${htmlStructure.hasSection}`);
        
        // Show actual CSS classes found
        const classMatches = scrapeResult.data.html?.match(/class=["']([^"']+)["']/g) || [];
        const uniqueClasses = [...new Set(classMatches.map(match => {
          const className = match.match(/class=["']([^"']+)["']/)[1];
          return className.split(/\s+/);
        }).flat())].slice(0, 20);
        console.log(`\n🎨 CSS CLASSES FOUND (first 20): [${uniqueClasses.join(', ')}]`);
        
        // Show actual IDs found
        const idMatches = scrapeResult.data.html?.match(/id=["']([^"']+)["']/g) || [];
        const uniqueIds = [...new Set(idMatches.map(match => 
          match.match(/id=["']([^"']+)["']/)[1]
        ))].slice(0, 10);
        console.log(`🆔 CSS IDS FOUND (first 10): [${uniqueIds.join(', ')}]`);
        
        console.log(`=========================================\n`);
      } else {
        websites.push({
          siteName: new URL(url).hostname,
          url: url,
          title: `Failed to scrape ${url}`,
          description: `Unable to access content from ${url}. Extension will use generic selectors. Error: ${scrapeResult.error}`,
          error: true,
          source: 'error',
          success: false
        });
      }
    } catch (error) {
      console.error(`❌ Failed to scrape ${url}:`, error.message);
      websites.push({
        siteName: new URL(url).hostname,
        url: url,
        title: `Failed to scrape ${url}`,
        description: `Unable to access content from ${url}. Extension will use generic selectors. Error: ${error.message}`,
        error: true,
        source: 'error',
        success: false
      });
    }

    // Return the scraped content with comprehensive analysis for LLM consumption
    const scrapedData = {
      requiresUrlPrompt: false,
      websites: websites,
      totalSites: totalSites,
      successfulScrapes: successfulScrapes,
      userProvidedUrl: userProvidedUrl
    };
    
    console.log(`Tool call completed: analyzed ${scrapedData.totalSites} websites, ${scrapedData.successfulScrapes} successful`);
    return scrapedData;
    
  } catch (error) {
    console.error('Error in scrapeWebsitesForExtension tool:', error.message);
    return {
      error: `Failed to scrape websites: ${error.message}`,
      requiresUrlPrompt: false
    };
  }
}

module.exports = {
  scrapeWebsitesForExtension,
  scrapeWithPlaywright,
  generateWebpageAnalysisForLLM,
  closeBrowser
};