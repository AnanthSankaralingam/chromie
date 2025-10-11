/**
 * Webpage scraping functionality for Chrome extension builder
 * Uses Supabase scraper table for cached webpage data from the Python scraper.
 */

import { createClient } from './supabase/server'

/**
 * Extract domain name from a URL, prioritizing a more specific path if available.
 * @param {string} url - Full URL
 * @param {boolean} specific - If true, tries to include the first path segment.
 * @returns {string} - Domain name (e.g., 'youtube.com' or 'youtube.com/watch')
 */
function extractDomainName(url, specific = false) {
  if (!url) return null
  
  try {
    const urlObj = new URL(url)
    let domain = urlObj.hostname.replace(/^www\./, '')

    if (specific && urlObj.pathname && urlObj.pathname !== '/') {
      // Get the first path segment and append it to the domain
      const firstPathSegment = urlObj.pathname.split('/')[1]
      if (firstPathSegment) {
        domain += `/${firstPathSegment}`
      }
    }
    return domain
  } catch (error) {
    // Fallback for malformed URLs
    try {
      let urlWithProtocol = url
      if (!url.match(/^https?:\/\//)) {
        urlWithProtocol = 'https://' + url
      }
      const urlObj = new URL(urlWithProtocol)
      let domain = urlObj.hostname.replace(/^www\./, '')
      if (specific && urlObj.pathname && urlObj.pathname !== '/') {
        const firstPathSegment = urlObj.pathname.split('/')[1]
        if (firstPathSegment) {
          domain += `/${firstPathSegment}`
        }
      }
      return domain
    } catch (secondError) {
      const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^/:#?]+)/)
      let domain = match?.[1] || url.replace(/^www\./, '').split('/')[0]
      if (specific && url.split('/').length > 1) {
        const pathSegments = url.split('/').slice(3); // Get path segments after domain
        if (pathSegments.length > 0) {
            domain += `/${pathSegments[0]}`;
        }
      }
      return domain
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
    const supabase = createClient()
    let data = null
    let error = null
    let domainNameUsed = null;

    // 1. Try with the more specific domain name (e.g., youtube.com/watch)
    const specificDomainName = extractDomainName(url, true)
    console.log(`Attempting lookup with specific domain: ${specificDomainName}`)
    if (specificDomainName) {
      ({ data, error } = await supabase
        .from('scraper')
        .select('scraper_output')
        .eq('domain_name', specificDomainName)
        .maybeSingle())
      
      if (!error && data && data.scraper_output) {
        domainNameUsed = specificDomainName;
        console.log(`✅ Found scraper data for specific domain: ${specificDomainName}`)
      } else {
        console.warn(`⚠️ No specific scraper data found for: ${specificDomainName}. Error: ${error ? error.message : 'No data.'}`)
      }
    }

    // 2. If specific lookup failed, fall back to generic domain name (e.g., youtube.com)
    if (!data || !data.scraper_output) {
      const genericDomainName = extractDomainName(url, false)
      console.log(`Falling back to generic domain lookup: ${genericDomainName}`)
      if (genericDomainName) {
        ({ data, error } = await supabase
          .from('scraper')
          .select('scraper_output')
          .eq('domain_name', genericDomainName)
          .maybeSingle())

        if (!error && data && data.scraper_output) {
            domainNameUsed = genericDomainName;
            console.log(`✅ Found scraper data for generic domain: ${genericDomainName}`)
        } else {
          console.warn(`⚠️ No scraper data found for generic domain: ${genericDomainName}. Error: ${error ? error.message : 'No data.'}`)
        }
      }
    }
    
    if (error) {
      console.error(`❌ Database error querying scraper table:`, error)
      throw new Error(`Database lookup failed: ${error.message}`)
    }
    
    if (!data || !data.scraper_output) {
      throw new Error(`No scraper data found for URL: ${url} after trying both specific and generic domains.`)
    }
    
    const body = typeof data.scraper_output === 'string'
      ? JSON.parse(data.scraper_output)
      : data.scraper_output
    
    console.log('Retrieved scraper data from database:', JSON.stringify(body, null, 2))
    
    // **MODIFIED LOGIC: Handle the new `major_elements` format**
    const elements = []
    if (body.major_elements) {
      for (const [key, value] of Object.entries(body.major_elements)) {
        elements.push({
          key: key,
          description: value.description,
          selector: value.selector,
        })
      }
    }
    
    return {
      url: url,
      title: `Analysis for ${domainNameUsed || 'unknown domain'}`,
      content: `Found ${elements.length} major elements for ${domainNameUsed || 'unknown domain'}.`,
      elements: elements,
      timestamp: new Date().toISOString(),
      statusCode: 200,
      majorElementsData: body.major_elements || {},
    }
  } catch (error) {
    console.error(`Error getting scraper data for ${url}:`, error)
    
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
    return ''
  }

  console.log("🌐 Starting webpage data lookup for:", domains)
  const webpageData = []
  
  for (const domain of domains) {
    const urlToScrape = userProvidedUrl || `https://${domain}`
    console.log(`🔍 Looking up domain: ${domain} with URL: ${urlToScrape}`)
    const scrapedData = await scrapeWebPage(urlToScrape, options)
    
    const statusInfo = scrapedData.statusCode ? ` (Status: ${scrapedData.statusCode})` : ''
    const errorInfo = scrapedData.error ? `\n**Error:** ${scrapedData.error}` : ''
    
    let detailedAnalysis = `## ${scrapedData.title.replace('Analysis for ', '')} Analysis${statusInfo}
URL: ${scrapedData.url}
Title: ${scrapedData.title}
Timestamp: ${scrapedData.timestamp}${errorInfo}`

    // **MODIFIED LOGIC: Generate report from the new `majorElementsData` format**
    if (scrapedData.majorElementsData && Object.keys(scrapedData.majorElementsData).length > 0) {
      detailedAnalysis += `\n\n## Major Element Analysis`
      detailedAnalysis += `\nThis analysis identifies the most important structural and interactive elements on the page, which are ideal targets for a Chrome extension.`
      
      for (const [key, element] of Object.entries(scrapedData.majorElementsData)) {
        detailedAnalysis += `\n\n**Element:** \`${key}\``
        detailedAnalysis += `\n- **Description:** ${element.description}`
        detailedAnalysis += `\n- **CSS Selector:** \`${element.selector}\``
      }
      
      // Simplified Extension Development Recommendations
      detailedAnalysis += `\n\n## Extension Development Recommendations`
      detailedAnalysis += `\n\n### Content Script Strategy:`
      detailedAnalysis += `\n- **Targeting Elements:** Use \`document.querySelector()\` with the CSS selectors listed above to reliably interact with these key page components.`
      detailedAnalysis += `\n- **Primary Targets:** Elements like \`main_content_area\`, \`global_header\`, and \`global_navigation_bar\` are stable starting points for adding features or extracting information.`
      detailedAnalysis += `\n- **Dynamic Content:** For pages that load content dynamically, consider using a \`MutationObserver\` to watch for changes within these major elements.`

    } else if (scrapedData.elements && scrapedData.elements.length > 0) {
      // Fallback for any other structure that might exist
      detailedAnalysis += `\n\n**Key Elements:** ${scrapedData.elements.map(e => e.key).join(', ')}`
    }

    webpageData.push(detailedAnalysis)
  }
  
  console.log("✅ Webpage analysis completed successfully")
  return webpageData.join('\n\n')
}