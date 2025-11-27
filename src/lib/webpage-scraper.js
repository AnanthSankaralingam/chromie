/**
 * Webpage scraping functionality for Chrome extension builder
 * 
 * WORKFLOW:
 * This module implements a two-step scraping workflow:
 * 1. Cache Check: First checks Supabase 'scraper' table for cached webpage data
 *    - Tries specific domain first (e.g., 'youtube.com/watch')
 *    - Falls back to generic domain (e.g., 'youtube.com')
 * 2. Lambda API Fallback: If no cache found, calls AWS Lambda scraping API
 *    - Endpoint: https://x8jt0vamu0.execute-api.us-east-1.amazonaws.com/prod
 *    - Method: POST
 *    - Request body: { "url": "<full_url_with_https>" }
 *    - Response: { statusCode: 200, body: "<json_string>" }
 * 
 * LAMBDA API INTEGRATION:
 * The Lambda function (AWS Lambda) performs the following:
 * - Scrapes webpage using Hyperbrowser (headless browser)
 * - Analyzes HTML with Gemini AI to identify major UI elements
 * - Returns structured data with major_elements, domain, page_title
 * - Automatically saves results to Supabase 'scraper' table for future cache hits
 * 
 * RESPONSE FORMAT:
 * Lambda returns: {
 *   statusCode: 200,
 *   body: "{\"major_elements\": {...}, \"domain\": \"...\", \"page_title\": \"...\", \"token_usage\": {...}, \"saved_to_db\": true}"
 * }
 * 
 * The 'body' field is a JSON string that must be parsed to extract:
 * - major_elements: Object mapping element keys to {description, selector}
 * - domain: Extracted domain name
 * - page_title: Page title from the scraped webpage
 * - token_usage: LLM token usage statistics
 * - saved_to_db: Boolean indicating if data was saved to Supabase
 * 
 * ERROR HANDLING:
 * - Supabase cache misses are tracked in 'scraper_misses' table
 * - Lambda API failures return graceful error responses (not thrown)
 * - Network errors, timeouts, and invalid responses are handled gracefully
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
 * Normalize URL to ensure it has https:// prefix
 * @param {string} url - URL to normalize
 * @returns {string} - URL with https:// prefix
 */
function normalizeUrl(url) {
  if (!url) return null
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url
  }
  return `https://${url}`
}

/**
 * Call AWS Lambda scraping API to scrape a webpage
 * @param {string} url - Full URL to scrape (will be normalized to include https://)
 * @returns {Promise<Object>} - Parsed response data with major_elements, domain, page_title
 * @throws {Error} - If API call fails or response is invalid
 */
async function callLambdaScrapingAPI(url) {
  const LAMBDA_API_URL = 'https://x8jt0vamu0.execute-api.us-east-1.amazonaws.com/prod'
  const normalizedUrl = normalizeUrl(url)
  
  if (!normalizedUrl) {
    throw new Error('Invalid URL provided')
  }
  
  console.log(`🌐 Calling Lambda API to scrape: ${normalizedUrl}`)
  
  try {
    const response = await fetch(LAMBDA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: normalizedUrl }),
    })
    
    if (!response.ok) {
      throw new Error(`Lambda API returned status ${response.status}: ${response.statusText}`)
    }
    
    const responseData = await response.json()
    
    // Lambda returns { statusCode: 200, body: "<json_string>" }
    if (responseData.statusCode !== 200) {
      throw new Error(`Lambda API returned non-200 status: ${responseData.statusCode}`)
    }
    
    // Parse the body field which is a JSON string
    let parsedBody
    try {
      parsedBody = typeof responseData.body === 'string' 
        ? JSON.parse(responseData.body)
        : responseData.body
    } catch (parseError) {
      throw new Error(`Failed to parse Lambda response body: ${parseError.message}`)
    }
    
    // Validate required fields
    if (!parsedBody.major_elements) {
      throw new Error('Lambda response missing required field: major_elements')
    }
    
    console.log(`✅ Lambda API scrape successful for ${normalizedUrl}`)
    return parsedBody
    
  } catch (error) {
    console.error(`❌ Lambda API call failed for ${normalizedUrl}:`, error)
    throw error
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
    let genericDomainNameAttempted = null; 
    let specificDomainNameAttempted = null; // Store the specific domain name for scraper_misses

    // 1. Try with the more specific domain name (e.g., youtube.com/watch)
    const specificDomainName = extractDomainName(url, true)
    specificDomainNameAttempted = specificDomainName; // Store the specific domain name
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
        
        // MODIFICATION: Track scraper misses for specific domains
        if (specificDomainNameAttempted) {
          console.log(`Attempting to record specific scraper miss for domain: ${specificDomainNameAttempted}`);
          const { error: insertError } = await supabase
            .from('scraper_misses')
            .insert({ domain_name: specificDomainNameAttempted, count: 1 });

          if (insertError) {
            if (insertError.code === '23505') { // Unique violation
              console.log(`Specific domain already exists. Incrementing count for ${specificDomainNameAttempted}.`);
              const { data: existingMiss, error: selectError } = await supabase
                .from('scraper_misses')
                .select('count')
                .eq('domain_name', specificDomainNameAttempted)
                .single();

              if (selectError) {
                console.error('Error fetching existing specific scraper miss to update count:', selectError);
              } else if (existingMiss) {
                const { error: updateError } = await supabase
                  .from('scraper_misses')
                  .update({ count: existingMiss.count + 1 })
                  .eq('domain_name', specificDomainNameAttempted);
                
                if (updateError) {
                  console.error('Error incrementing specific scraper miss count:', updateError);
                } else {
                  console.log(`✅ Incremented specific scraper miss count for: ${specificDomainNameAttempted}`);
                }
              }
            } else {
              console.error(`❌ Error inserting into scraper_misses (specific domain):`, insertError);
            }
          } else {
            console.log(`✅ Recorded new specific scraper miss for: ${specificDomainNameAttempted}`);
          }
        }
      }
    }

    // 2. If specific lookup failed, fall back to generic domain name (e.g., youtube.com)
    if (!data || !data.scraper_output) {
      const genericDomainName = extractDomainName(url, false)
      genericDomainNameAttempted = genericDomainName; // Store the generic domain name
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

          // MODIFICATION: Keep the existing logic for generic domain misses
          if (genericDomainNameAttempted) {
            console.log(`Attempting to record generic scraper miss for domain: ${genericDomainNameAttempted}`);
            const { error: insertError } = await supabase
              .from('scraper_misses')
              .insert({ domain_name: genericDomainNameAttempted, count: 1 });

            if (insertError) {
              if (insertError.code === '23505') { // Unique violation
                console.log(`Generic domain already exists. Incrementing count for ${genericDomainNameAttempted}.`);
                const { data: existingMiss, error: selectError } = await supabase
                  .from('scraper_misses')
                  .select('count')
                  .eq('domain_name', genericDomainNameAttempted)
                  .single();

                if (selectError) {
                  console.error('Error fetching existing generic scraper miss to update count:', selectError);
                } else if (existingMiss) {
                  const { error: updateError } = await supabase
                    .from('scraper_misses')
                    .update({ count: existingMiss.count + 1 })
                    .eq('domain_name', genericDomainNameAttempted);
                  
                  if (updateError) {
                    console.error('Error incrementing generic scraper miss count:', updateError);
                  } else {
                    console.log(`✅ Incremented generic scraper miss count for: ${genericDomainNameAttempted}`);
                  }
                }
              } else {
                console.error(`❌ Error inserting into scraper_misses (generic domain):`, insertError);
              }
            } else {
              console.log(`✅ Recorded new generic scraper miss for: ${genericDomainNameAttempted}`);
            }
          }
        }
      }
    }
    
    if (error) {
      console.error(`❌ Database error querying scraper table:`, error)
      throw new Error(`Database lookup failed: ${error.message}`)
    }
    
    // 3. If no data found in Supabase cache, call Lambda API
    if (!data || !data.scraper_output) {
      console.log(`📡 No cache found in Supabase, calling Lambda API for: ${url}`)
      
      try {
        const lambdaResponse = await callLambdaScrapingAPI(url)
        
        // Lambda response contains: major_elements, domain, page_title, token_usage, saved_to_db
        const body = {
          major_elements: lambdaResponse.major_elements,
          domain: lambdaResponse.domain,
          page_title: lambdaResponse.page_title,
        }
        
        // Use domain from Lambda response for tracking
        domainNameUsed = lambdaResponse.domain || extractDomainName(url, false)
        
        console.log('Retrieved scraper data from Lambda API:', JSON.stringify(body, null, 2))
        
        // Format elements array from major_elements
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
        
        // Use page_title from Lambda response if available
        const title = body.page_title || `Analysis for ${domainNameUsed || 'unknown domain'}`
        
        return {
          url: url,
          title: title,
          content: `Found ${elements.length} major elements for ${domainNameUsed || 'unknown domain'}.`,
          elements: elements,
          timestamp: new Date().toISOString(),
          statusCode: 200,
          majorElementsData: body.major_elements || {},
        }
      } catch (lambdaError) {
        // Lambda API failed - return graceful error response
        console.error(`❌ Lambda API call failed for ${url}:`, lambdaError)
        throw new Error(`Failed to scrape webpage via Lambda API: ${lambdaError.message}`)
      }
    }
    
    // Data found in Supabase cache
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
 * @returns {Promise<Object>} - Object with { data: string, statusCode: number }
 *   statusCode: 200 = success, 404 = no data found, 500 = error occurred
 */
export async function batchScrapeWebpages(domains, userProvidedUrl = null, options = {}) {
  if (!domains || domains.length === 0) {
    console.log("📝 No specific websites targeted - skipping scraping")
    return { data: '', statusCode: 404 }
  }

  console.log("🌐 Starting webpage data lookup for:", domains)
  const webpageData = []
  let hasErrors = false
  
  for (const domain of domains) {
    const urlToScrape = userProvidedUrl || `https://${domain}`
    console.log(`🔍 Looking up domain: ${domain} with URL: ${urlToScrape}`)
    const scrapedData = await scrapeWebPage(urlToScrape, options)
    
    // Skip error results - only include successful scrapes with actual data
    if (scrapedData.error) {
      console.warn(`⚠️ Skipping error result for ${domain}: ${scrapedData.error}`)
      hasErrors = true
      continue
    }
    
    // Only include if we have actual element data
    const hasMajorElements = scrapedData.majorElementsData && Object.keys(scrapedData.majorElementsData).length > 0
    const hasElements = scrapedData.elements && scrapedData.elements.length > 0
    
    if (!hasMajorElements && !hasElements) {
      console.warn(`⚠️ Skipping ${domain}: No element data found`)
      continue
    }
    
    const statusInfo = scrapedData.statusCode ? ` (Status: ${scrapedData.statusCode})` : ''
    
    let detailedAnalysis = `## ${scrapedData.title.replace('Analysis for ', '')} Analysis${statusInfo}
URL: ${scrapedData.url}
Title: ${scrapedData.title}`

    // **MODIFIED LOGIC: Generate report from the new `major_elements` format**
    if (hasMajorElements) {
      detailedAnalysis += `\n\n## Major Element Analysis`
      detailedAnalysis += `\nThis analysis identifies the most important structural and interactive elements on the page, which are ideal targets for a Chrome extension.`
      
      for (const [key, element] of Object.entries(scrapedData.majorElementsData)) {
        detailedAnalysis += `\n\n**Element:** \`${key}\``
        detailedAnalysis += `\n- **Description:** ${element.description}`
        detailedAnalysis += `\n- **CSS Selector:** \`${element.selector}\``
      }
      
      // // Simplified Extension Development Recommendations
      // detailedAnalysis += `\n\n## Extension Development Recommendations`
      // detailedAnalysis += `\n\n### Content Script Strategy:`
      // detailedAnalysis += `\n- **Targeting Elements:** Use \`document.querySelector()\` with the CSS selectors listed above to reliably interact with these key page components.`
      // detailedAnalysis += `\n- **Primary Targets:** Elements like \`main_content_area\`, \`global_header\`, and \`global_navigation_bar\` are stable starting points for adding features or extracting information.`
      // detailedAnalysis += `\n- **Dynamic Content:** For pages that load content dynamically, consider using a \`MutationObserver\` to watch for changes within these major elements.`

    } else if (hasElements) {
      // Fallback for any other structure that might exist
      detailedAnalysis += `\n\n**Key Elements:** ${scrapedData.elements.map(e => e.key).join(', ')}`
    }

    webpageData.push(detailedAnalysis)
  }
  
  if (webpageData.length === 0) {
    console.warn("⚠️ No successful webpage analysis data collected")
    return { 
      data: '', 
      statusCode: hasErrors ? 500 : 404 
    }
  }
  
  console.log(`✅ Webpage analysis completed successfully (${webpageData.length} successful scrape(s))`)
  return { 
    data: webpageData.join('\n\n'), 
    statusCode: 200 
  }
}