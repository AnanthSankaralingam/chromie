/**
 * Webpage scraping functionality for Chrome extension builder
 * 
 * WORKFLOW:
 * This module implements a three-step scraping workflow:
 * 1. Cache Check (Specific): First checks Supabase 'scraper' table for specific domain (e.g., 'youtube.com/watch')
 * 2. Cache Check (Generic): If no specific match, falls back to generic domain (e.g., 'youtube.com')
 * 3. Lambda API Fallback: If no cache found, calls AWS Lambda scraping API
 *    - Endpoint: https://x8jt0vamu0.execute-api.us-east-1.amazonaws.com/prod
 *    - Method: POST
 *    - Request body: { "url": "<full_url_with_https>", "intent": "<optional>", "profile_id": "<optional Hyperbrowser profile ID>" }
 *    - Response: { statusCode: 200, body: "<json_string>" }
 *    - ONLY if Lambda also fails, then a scraper miss is recorded in 'scraper_misses' table
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
 * - Scraper misses are ONLY recorded when BOTH database lookup AND Lambda API fail
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
 * @param {string} [intent] - Optional 1-2 sentence description of what to look for (element types or extension goal)
 * @param {string} [profileId] - Optional Hyperbrowser profile ID for the scrape session (e.g., logged-in state)
 * @returns {Promise<Object>} - Parsed response data with major_elements, domain, page_title
 * @throws {Error} - If API call fails or response is invalid
 */
async function callLambdaScrapingAPI(url, intent = null, profileId = null) {
  const LAMBDA_API_URL = 'https://x8jt0vamu0.execute-api.us-east-1.amazonaws.com/prod/scrape'
  const normalizedUrl = normalizeUrl(url)
  
  if (!normalizedUrl) {
    throw new Error('Invalid URL provided')
  }
  
  const requestBody = { url: normalizedUrl }
  if (intent && typeof intent === 'string' && intent.trim()) {
    requestBody.intent = intent.trim()
  }
  if (profileId && typeof profileId === 'string' && profileId.trim()) {
    requestBody.profile_id = profileId.trim()
  }
  
  console.log(`🌐 Calling Lambda API to scrape: ${normalizedUrl}${requestBody.intent ? ` (intent: ${requestBody.intent})` : ''}`)
  
  try {
    const response = await fetch(LAMBDA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })
    
    if (!response.ok) {
      throw new Error(`Lambda API returned status ${response.status}: ${response.statusText}`)
    }
    
    const responseData = await response.json()

    // Debug: Log the actual response structure
    console.log('🔍 Lambda response structure:', JSON.stringify(responseData, null, 2))

    // Handle two response formats:
    // 1. API Gateway Lambda Proxy: returns Lambda's body directly (major_elements, domain, etc.)
    // 2. Direct Lambda invoke: returns { statusCode: 200, body: "<json_string>" }
    let parsedBody
    if (responseData.major_elements) {
      // Format 1: Direct result from API Gateway proxy - body is the response itself
      parsedBody = responseData
    } else if (responseData.statusCode !== undefined && responseData.statusCode !== 200) {
      throw new Error(`Lambda API returned non-200 status: ${responseData.statusCode}. Full response: ${JSON.stringify(responseData)}`)
    } else if (responseData.body !== undefined) {
      // Format 2: Wrapped format with statusCode and body
      try {
        parsedBody = typeof responseData.body === 'string'
          ? JSON.parse(responseData.body)
          : responseData.body
      } catch (parseError) {
        throw new Error(`Failed to parse Lambda response body: ${parseError.message}`)
      }
    } else {
      throw new Error(`Unexpected Lambda response format. Full response: ${JSON.stringify(responseData)}`)
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
  const intent = options.intent && typeof options.intent === 'string' ? options.intent.trim() : null
  const profileId = options.profile_id && typeof options.profile_id === 'string' ? options.profile_id.trim() : null
  console.log(`Looking up webpage data for ${url}${intent ? ` (intent: ${intent})` : ''}${profileId ? ` (profile: ${profileId})` : ''}`)
  
  try {
    const supabase = createClient()
    let data = null
    let error = null
    let domainNameUsed = null;
    let genericDomainNameAttempted = null; 
    let specificDomainNameAttempted = null; // Store the specific domain name for scraper_misses

    // When intent or profile_id is provided, skip cache - these scrapes always go to Lambda
    const skipCache = !!(intent || profileId)
    const genericDomainName = extractDomainName(url, false)
    const specificDomainName = extractDomainName(url, true)

    // 1. Try with the more specific domain name (e.g., youtube.com/watch) - skip if intent provided
    specificDomainNameAttempted = specificDomainName; // Store the specific domain name
    console.log(`Attempting lookup with specific domain: ${specificDomainName}`)
    if (!skipCache && specificDomainName) {
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

    // 2. If specific lookup failed, fall back to generic domain name (e.g., youtube.com) - skip if intent provided
    genericDomainNameAttempted = genericDomainName
    if ((!data || !data.scraper_output) && !skipCache) {
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
    
    // 3. If no data found in Supabase cache, call Lambda API
    if (!data || !data.scraper_output) {
      console.log(`📡 No cache found in Supabase, calling Lambda API for: ${url}`)
      
      try {
        const lambdaResponse = await callLambdaScrapingAPI(url, intent, profileId)
        
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
        // Lambda API failed - record scraper miss now that ALL methods have failed
        console.error(`❌ Lambda API call failed for ${url}:`, lambdaError)

        // Record scraper miss for the generic domain (or specific if generic unavailable)
        const domainToRecord = genericDomainNameAttempted || specificDomainNameAttempted
        if (domainToRecord) {
          console.log(`📝 Recording scraper miss for domain: ${domainToRecord} (all methods failed)`)

          try {
            const { error: insertError } = await supabase
              .from('scraper_misses')
              .insert({ domain_name: domainToRecord, count: 1 })

            if (insertError) {
              if (insertError.code === '23505') { // Unique violation - domain already exists
                console.log(`Domain already exists in scraper_misses. Incrementing count for ${domainToRecord}`)
                const { data: existingMiss, error: selectError } = await supabase
                  .from('scraper_misses')
                  .select('count')
                  .eq('domain_name', domainToRecord)
                  .single()

                if (selectError) {
                  console.error('Error fetching existing scraper miss to update count:', selectError)
                } else if (existingMiss) {
                  const { error: updateError } = await supabase
                    .from('scraper_misses')
                    .update({ count: existingMiss.count + 1 })
                    .eq('domain_name', domainToRecord)

                  if (updateError) {
                    console.error('Error incrementing scraper miss count:', updateError)
                  } else {
                    console.log(`✅ Incremented scraper miss count for: ${domainToRecord}`)
                  }
                }
              } else {
                console.error(`❌ Error inserting into scraper_misses:`, insertError)
              }
            } else {
              console.log(`✅ Recorded new scraper miss for: ${domainToRecord}`)
            }
          } catch (missRecordError) {
            console.error(`⚠️ Failed to record scraper miss: ${missRecordError.message}`)
          }
        }

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

    let detailedAnalysis = `## ${scrapedData.title.replace('Analysis for ', '')} Analysis
URL: ${scrapedData.url}
Title: ${scrapedData.title}`

    // **MODIFIED LOGIC: Generate report from the new `major_elements` format**
    if (hasMajorElements) {
      detailedAnalysis += `\n\n## Major Element Analysis`
      detailedAnalysis += `\nThis analysis identifies the most important structural and interactive elements on the page, which are ideal targets for a Chrome extension.`
      
      for (const [key, element] of Object.entries(scrapedData.majorElementsData)) {
        detailedAnalysis += `\n\nElement: \`${key}\``
        detailedAnalysis += `\n\t- Description: ${element.description}`
        detailedAnalysis += `\n\t- CSS Selector: \`${element.selector}\``
      }
      
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