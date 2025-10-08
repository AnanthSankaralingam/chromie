/**
 * Webpage scraping functionality for Chrome extension builder
 * Uses Supabase scraper table for cached webpage data
 */

import { createClient } from './supabase/server'

/**
 * Extract domain name from a URL
 * @param {string} url - Full URL
 * @returns {string} - Domain name (e.g., 'youtube.com')
 */
function extractDomainName(url) {
  if (!url) return null
  
  try {
    // Try standard URL parsing first
    const urlObj = new URL(url)
    // Remove www. prefix and return hostname
    return urlObj.hostname.replace(/^www\./, '')
  } catch (error) {
    // URL parsing failed, try manual extraction
    try {
      // Add protocol if missing
      let urlWithProtocol = url
      if (!url.match(/^https?:\/\//)) {
        urlWithProtocol = 'https://' + url
      }
      const urlObj = new URL(urlWithProtocol)
      return urlObj.hostname.replace(/^www\./, '')
    } catch (secondError) {
      // Last resort: regex extraction
      const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^/:#?]+)/)
      if (match && match[1]) {
        return match[1]
      }
      // If all else fails, return the original (cleaned up)
      return url.replace(/^www\./, '').split('/')[0].split(':')[0].split('?')[0]
    }
  }
}

/**
 * Query webpage data from Supabase scraper table
 * @param {string} url - URL to get scraper data for
 * @param {Object} options - Optional parameters (kept for compatibility)
 * @returns {Promise<Object>} - Scraped data from the database
 */
export async function scrapeWebPage(url, options = {}) {
  console.log(`Looking up webpage data for ${url}`)
  
  try {
    // Extract domain name from URL
    const domainName = extractDomainName(url)
    console.log(`Extracted domain name: ${domainName}`)
    
    // Query Supabase for scraper data
    const supabase = createClient()
    const { data, error } = await supabase
      .from('scraper')
      .select('scraper_output')
      .eq('domain_name', domainName)
      .maybeSingle()
    
    if (error) {
      console.error(`❌ Database error querying scraper table for ${domainName}:`, error)
      throw new Error(`Database lookup failed: ${error.message}`)
    }
    
    if (!data) {
      console.warn(`⚠️ No scraper data found in database for domain: ${domainName}`)
      throw new Error(`No scraper data found for domain: ${domainName}`)
    }
    
    if (!data.scraper_output) {
      console.warn(`⚠️ Scraper data exists but scraper_output is empty for: ${domainName}`)
      throw new Error(`Empty scraper data for domain: ${domainName}`)
    }
    
    // Parse the scraper_output JSON
    let body
    if (typeof data.scraper_output === 'string') {
      body = JSON.parse(data.scraper_output)
    } else {
      body = data.scraper_output
    }
    
    console.log('Retrieved scraper data from database:', JSON.stringify(body, null, 2))
    
    // Handle the scraper response structure with pages array
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
      statusCode: 200, // Indicate success from database
      pageData: pageData, // Include the full page data for downstream use
      ...body // Include all additional data from the API response
    }
  } catch (error) {
    console.error(`Error getting scraper data for ${url}:`, error)
    
    // Return fallback data in case of error
    return {
      url: url,
      title: `Error accessing ${url}`,
      content: `Unable to get scraper data for ${url}: ${error.message}`,
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

  console.log("🌐 Starting webpage data lookup for:", domains, "with URL:", userProvidedUrl, "and options:", options)
  const webpageData = []
  
  for (const domain of domains) {
    // Use userProvidedUrl if available, otherwise construct from domain for database lookup
    const urlToScrape = userProvidedUrl || `https://${domain}`
    console.log(`🔍 Looking up domain: ${domain} with URL: ${urlToScrape}`)
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
      
      // Interactive Elements with Selectors (limit to top 10 to reduce token usage)
      if (page.top_actions && page.top_actions.length > 0) {
        detailedAnalysis += `\n\n### Interactive Elements (Targetable for Extensions)`
        const limitedActions = page.top_actions.slice(0, 10)
        if (page.top_actions.length > 10) {
          detailedAnalysis += ` (showing top 10 of ${page.top_actions.length})`
        }
        limitedActions.forEach((action, index) => {
          detailedAnalysis += `\n\n**Element ${index + 1}:**`
          detailedAnalysis += `\n- Type: ${action.kind}`
          detailedAnalysis += `\n- Text: "${action.text}"`
          detailedAnalysis += `\n- CSS Selector: \`${action.selector}\``
          detailedAnalysis += `\n- Confidence: ${action.confidence}`
          detailedAnalysis += `\n- Extension Usage: Can be targeted for click events, text extraction, or modification`
        })
      }
      
      // Form Elements with Detailed Structure (limit to top 5)
      if (page.forms && page.forms.length > 0) {
        detailedAnalysis += `\n\n### Form Elements (For Data Extraction/Injection)`
        const limitedForms = page.forms.slice(0, 5)
        if (page.forms.length > 5) {
          detailedAnalysis += ` (showing top 5 of ${page.forms.length})`
        }
        limitedForms.forEach((form, index) => {
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
      
      // Content Structure Elements (limit to top 8)
      if (page.headings && page.headings.length > 0) {
        detailedAnalysis += `\n\n### Content Structure (For Content Analysis)`
        const limitedHeadings = page.headings.slice(0, 5)
        if (page.headings.length > 5) {
          detailedAnalysis += ` (showing top 5 of ${page.headings.length})`
        }
        limitedHeadings.forEach((heading, index) => {
          detailedAnalysis += `\n\n**Heading ${index + 1}:**`
          detailedAnalysis += `\n- Level: H${heading.level}`
          detailedAnalysis += `\n- Text: "${heading.text}"`
          detailedAnalysis += `\n- CSS Selector: \`${heading.selector}\``
          detailedAnalysis += `\n- Extension Usage: Content analysis, navigation, or content modification`
        })
      }
      
      // Landmark Elements (Accessibility & Structure) (limit to top 6)
      if (page.landmarks && page.landmarks.length > 0) {
        detailedAnalysis += `\n\n### Landmark Elements (Page Structure)`
        const limitedLandmarks = page.landmarks.slice(0, 5)
        if (page.landmarks.length > 5) {
          detailedAnalysis += ` (showing top 5 of ${page.landmarks.length})`
        }
        limitedLandmarks.forEach((landmark, index) => {
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
