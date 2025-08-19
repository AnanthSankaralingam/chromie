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
    
    // Return the parsed body data with additional metadata
    return {
      url: url,
      title: body.title || `Page from ${url}`,
      content: body.content || `No content available for ${url}`,
      elements: body.elements || [],
      timestamp: new Date().toISOString(),
      statusCode: outer.statusCode,
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
    return '<!-- No specific websites targeted -->'
  }

  console.log("Scraping webpages for:", domains, "with options:", options)
  const webpageData = []
  
  for (const domain of domains) {
    // Use userProvidedUrl if available, otherwise construct from domain
    const urlToScrape = userProvidedUrl || `https://${domain}`
    const scrapedData = await scrapeWebPage(urlToScrape, options)
    
    const statusInfo = scrapedData.statusCode ? ` (Status: ${scrapedData.statusCode})` : ''
    const errorInfo = scrapedData.error ? `\n**Error:** ${scrapedData.error}` : ''
    
    webpageData.push(`
## ${domain} Analysis${statusInfo}
**URL:** ${scrapedData.url}
**Title:** ${scrapedData.title}
**Content:** ${scrapedData.content}
**Key Elements:** ${scrapedData.elements.join(', ')}
**Timestamp:** ${scrapedData.timestamp}${errorInfo}
    `)
  }
  
  console.log("Webpage analysis completed")
  return webpageData.join('\n\n')
}
