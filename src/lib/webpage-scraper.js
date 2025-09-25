/**
 * Webpage scraping functionality for Chrome extension builder
 * Uses AWS Lambda API Gateway for scraping
 */

const SCRAPER_API_URL = 'https://8kwll6ihd6.execute-api.us-east-1.amazonaws.com/default/lambda-scraper-2'

/**
 * Scrape webpage content using AWS Lambda API Gateway
 * @param {string} url - URL to scrape
 * @param {Object} options - Optional parameters for scraping
 * @param {number} options.max_pages - Maximum number of pages to scrape (default: 1)
 * @param {boolean} options.render - Whether to render JavaScript (default: false)
 * @returns {Promise<Object>} - Scraped data from the webpage
 */
export async function scrapeWebPage(url, options = {}) {
  const { max_pages = 2, render = false } = options
  console.log(`Scraping webpage at ${url} with options:`, { max_pages, render })
  
  try {
    const payload = {
      url: url,
      max_pages: max_pages,
      render: render
    }

    const resp = await fetch(SCRAPER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    if (!resp.ok) {
      throw new Error(`HTTP error! status: ${resp.status}`)
    }

    const outer = await resp.json()
    
    const body_raw = outer.body
    let body
    try {
      body = JSON.parse(body_raw)
    } catch (error) {
      body = { raw_body: body_raw }
    }

    console.log('Parsed scraper response:', JSON.stringify(body, null, 2))
    
    // Handle the new scraper response structure with pages array
    let pageData = null
    if (body.pages && body.pages.length > 0) {
      pageData = body.pages[0] // Use the first page
    }
    
    // Extract elements from the page data
    const elements = []
    if (pageData) {
      if (pageData.top_actions) {
        elements.push(...pageData.top_actions.map(a => `${a.kind}: ${a.text} (${a.selector})`))
      }
      if (pageData.forms) {
        elements.push(...pageData.forms.map(f => `Form: ${f.method} ${f.action} (${f.selector})`))
      }
      if (pageData.headings) {
        elements.push(...pageData.headings.map(h => `H${h.level}: ${h.text} (${h.selector})`))
      }
      if (pageData.landmarks) {
        elements.push(...pageData.landmarks.map(l => `Landmark: ${l.role} (${l.selector})`))
      }
    }
    
    // Return the parsed body data with additional metadata
    return {
      url: url,
      title: pageData?.title || body.title || `Page from ${url}`,
      content: pageData ? `Page analysis for ${url}` : (body.content || `No content available for ${url}`),
      elements: elements,
      timestamp: new Date().toISOString(),
      statusCode: outer.statusCode,
      pageData: pageData, // Include the full page data for downstream use
      ...body // Include all additional data from the API response
    }
  } catch (error) {
    console.error(`Error scraping ${url}:`, error)
    
    // Return fallback data in case of error
    return {
      url: url,
      title: `Error accessing ${url}`,
      content: `Unable to scrape content from ${url}: ${error.message}`,
      elements: [],
      timestamp: new Date().toISOString(),
      error: error.message
    }
  }
}

/**
 * Batch scrape multiple webpages for analysis
 * @param {string[]} domains - Array of domains to scrape
 * @param {string} userProvidedUrl - Optional specific URL to use instead of domain
 * @param {Object} options - Optional scraping parameters to pass to scrapeWebPage
 * @returns {Promise<string>} - Formatted analysis string
 */
export async function batchScrapeWebpages(domains, userProvidedUrl = null, options = {}) {
  if (!domains || domains.length === 0) {
    console.log("📝 No specific websites targeted - skipping scraping")
    return '<!-- No specific websites targeted -->'
  }

  if (!userProvidedUrl) {
    console.log("⏸️ No user-provided URL - skipping webpage scraping")
    return '<!-- Website analysis skipped - no URL provided -->'
  }

  console.log("🌐 Starting webpage scraping for:", domains, "with URL:", userProvidedUrl, "and options:", options)
  const webpageData = []
  
  for (const domain of domains) {
    // Use userProvidedUrl if available, otherwise construct from domain
    const urlToScrape = userProvidedUrl || `https://${domain}`
    console.log(`🔍 Scraping domain: ${domain} at URL: ${urlToScrape}`)
    const scrapedData = await scrapeWebPage(urlToScrape, options)
    
    const statusInfo = scrapedData.statusCode ? ` (Status: ${scrapedData.statusCode})` : ''
    const errorInfo = scrapedData.error ? `\n**Error:** ${scrapedData.error}` : ''
    
    // Build detailed analysis from page data
    let detailedAnalysis = `## ${domain} Analysis${statusInfo}
URL: ${scrapedData.url}
Title: ${scrapedData.title}
Content: ${scrapedData.content}
Timestamp: ${scrapedData.timestamp}${errorInfo}`

    // Add detailed page analysis if available
    if (scrapedData.pageData) {
      const page = scrapedData.pageData
      
      // DOM Structure Analysis for Extension Development
      detailedAnalysis += `\n\n## DOM Structure Analysis`
      
      // Interactive Elements with Selectors
      if (page.top_actions && page.top_actions.length > 0) {
        detailedAnalysis += `\n\n### Interactive Elements (Targetable for Extensions)`
        page.top_actions.forEach((action, index) => {
          detailedAnalysis += `\n\n**Element ${index + 1}:**`
          detailedAnalysis += `\n- Type: ${action.kind}`
          detailedAnalysis += `\n- Text: "${action.text}"`
          detailedAnalysis += `\n- CSS Selector: \`${action.selector}\``
          detailedAnalysis += `\n- Confidence: ${action.confidence}`
          detailedAnalysis += `\n- Extension Usage: Can be targeted for click events, text extraction, or modification`
        })
      }
      
      // Form Elements with Detailed Structure
      if (page.forms && page.forms.length > 0) {
        detailedAnalysis += `\n\n### Form Elements (For Data Extraction/Injection)`
        page.forms.forEach((form, index) => {
          detailedAnalysis += `\n\n**Form ${index + 1}:**`
          detailedAnalysis += `\n- Method: ${form.method}`
          detailedAnalysis += `\n- Action: ${form.action}`
          detailedAnalysis += `\n- CSS Selector: \`${form.selector}\``
          if (form.fields && form.fields.length > 0) {
            detailedAnalysis += `\n- Input Fields:`
            form.fields.forEach(field => {
              detailedAnalysis += `\n  - Name: ${field.name}, Type: ${field.type}, Selector: \`${field.selector}\``
            })
          }
          detailedAnalysis += `\n- Extension Usage: Can intercept form submissions, auto-fill fields, or extract form data`
        })
      }
      
      // Content Structure Elements
      if (page.headings && page.headings.length > 0) {
        detailedAnalysis += `\n\n### Content Structure (For Content Analysis)`
        page.headings.forEach((heading, index) => {
          detailedAnalysis += `\n\n**Heading ${index + 1}:**`
          detailedAnalysis += `\n- Level: H${heading.level}`
          detailedAnalysis += `\n- Text: "${heading.text}"`
          detailedAnalysis += `\n- CSS Selector: \`${heading.selector}\``
          detailedAnalysis += `\n- Extension Usage: Content analysis, navigation, or content modification`
        })
      }
      
      // Landmark Elements (Accessibility & Structure)
      if (page.landmarks && page.landmarks.length > 0) {
        detailedAnalysis += `\n\n### Landmark Elements (Page Structure)`
        page.landmarks.forEach((landmark, index) => {
          detailedAnalysis += `\n\n**Landmark ${index + 1}:**`
          detailedAnalysis += `\n- Role: ${landmark.role}`
          detailedAnalysis += `\n- Label: ${landmark.label || 'No label'}`
          detailedAnalysis += `\n- CSS Selector: \`${landmark.selector}\``
          detailedAnalysis += `\n- Extension Usage: Navigation, content injection, or structural analysis`
        })
      }
      
      // Schema.org Data (For Rich Data Extraction)
      if (page.schema_org_types && page.schema_org_types.length > 0) {
        detailedAnalysis += `\n\n### Schema.org Data Types`
        detailedAnalysis += `\n- Detected Types: ${page.schema_org_types.join(', ')}`
        detailedAnalysis += `\n- Extension Usage: Extract structured data, product information, or metadata`
      }
      
      // Extension Development Recommendations
      detailedAnalysis += `\n\n## Extension Development Recommendations`
      detailedAnalysis += `\n\n### Targetable Elements:`
      if (page.top_actions && page.top_actions.length > 0) {
        detailedAnalysis += `\n- Use \`${page.top_actions[0].selector}\` for primary interaction`
        detailedAnalysis += `\n- Target confidence scores > 0.5 for reliable element selection`
      }
      
      if (page.forms && page.forms.length > 0) {
        detailedAnalysis += `\n- Form selector: \`${page.forms[0].selector}\` for data extraction/injection`
      }
      
      detailedAnalysis += `\n\n### Content Script Strategy:`
      detailedAnalysis += `\n- Use document.querySelector() with provided selectors`
      detailedAnalysis += `\n- Implement event listeners for interactive elements`
      detailedAnalysis += `\n- Consider MutationObserver for dynamic content changes`
      detailedAnalysis += `\n- Use chrome.tabs.executeScript() for content manipulation`
      
    } else if (scrapedData.elements && scrapedData.elements.length > 0) {
      detailedAnalysis += `\n\n**Key Elements:** ${scrapedData.elements.join(', ')}`
    }

    webpageData.push(detailedAnalysis)
  }
  
  console.log("✅ Webpage analysis completed successfully")
  return webpageData.join('\n\n')
}
