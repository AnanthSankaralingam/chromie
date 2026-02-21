/**
 * Webpage scraping for Chrome extension builder.
 * Workflow: Supabase cache (specific domain → generic domain) → Lambda API fallback.
 * Scraper misses are only recorded when both cache and Lambda fail.
 */

import { createClient } from './supabase/server'

const LAMBDA_API_URL = 'https://x8jt0vamu0.execute-api.us-east-1.amazonaws.com/prod/scrape'

// --- Helpers ---

/**
 * Extract domain name from a URL.
 * @param {string} url
 * @param {boolean} specific - If true, appends the first path segment (e.g. 'youtube.com/watch')
 * @returns {string|null}
 */
function extractDomainName(url, specific = false) {
  if (!url) return null

  // Normalize protocol so URL() can always parse the input
  const normalized = url.match(/^https?:\/\//) ? url : `https://${url}`

  try {
    const { hostname, pathname } = new URL(normalized)
    let domain = hostname.replace(/^www\./, '')
    if (specific && pathname && pathname !== '/') {
      const firstSegment = pathname.split('/')[1]
      if (firstSegment) domain += `/${firstSegment}`
    }
    return domain
  } catch {
    // Last-resort regex fallback for badly malformed URLs
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^/:#?]+)/)
    let domain = match?.[1] || url.replace(/^www\./, '').split('/')[0]
    if (specific) {
      const segment = url.split('/').slice(3)[0]
      if (segment) domain += `/${segment}`
    }
    return domain
  }
}

function normalizeUrl(url) {
  if (!url) return null
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`
}

/** Convert a major_elements object into a flat array for easier consumption. */
function majorElementsToArray(majorElements) {
  if (!majorElements) return []
  return Object.entries(majorElements).map(([key, value]) => ({
    key,
    description: value.description,
    selector: value.selector,
  }))
}

/**
 * Increment the scraper_misses counter for a domain.
 * Called only after both cache lookup and Lambda both fail.
 */
async function recordScraperMiss(supabase, domain) {
  console.log(`📝 Recording scraper miss for: ${domain}`)
  try {
    const { error } = await supabase
      .from('scraper_misses')
      .insert({ domain_name: domain, count: 1 })

    if (!error) {
      console.log(`✅ Recorded new scraper miss for: ${domain}`)
      return
    }

    if (error.code !== '23505') { // not a unique-violation
      console.error(`❌ Error inserting into scraper_misses:`, error)
      return
    }

    // Domain already exists — increment the count
    const { data: existing, error: selectError } = await supabase
      .from('scraper_misses')
      .select('count')
      .eq('domain_name', domain)
      .single()

    if (selectError) {
      console.error('Error fetching existing scraper miss:', selectError)
      return
    }

    const { error: updateError } = await supabase
      .from('scraper_misses')
      .update({ count: existing.count + 1 })
      .eq('domain_name', domain)

    if (updateError) {
      console.error('Error incrementing scraper miss count:', updateError)
    } else {
      console.log(`✅ Incremented scraper miss count for: ${domain}`)
    }
  } catch (err) {
    console.error(`⚠️ Failed to record scraper miss: ${err.message}`)
  }
}

// --- Lambda API ---

/**
 * Call the AWS Lambda scraping API.
 * Handles two response shapes:
 *   Shape A (API Gateway proxy): { major_elements, domain, page_title, ... }
 *   Shape B (wrapped):           { statusCode, body: "<json string>" }
 */
async function callLambdaScrapingAPI(url, intent = null, profileId = null) {
  const normalizedUrl = normalizeUrl(url)
  if (!normalizedUrl) throw new Error('Invalid URL provided')

  const body = { url: normalizedUrl }
  if (intent?.trim()) body.intent = intent.trim()
  if (profileId?.trim()) body.profile_id = profileId.trim()

  console.log(`🌐 Calling Lambda API to scrape: ${normalizedUrl}${body.intent ? ` (intent: ${body.intent})` : ''}`)

  const response = await fetch(LAMBDA_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Lambda API returned status ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()

  let parsed
  if (data.major_elements) {
    parsed = data // Shape A
  } else if (data.statusCode !== undefined && data.statusCode !== 200) {
    throw new Error(`Lambda returned non-200 status: ${data.statusCode}`)
  } else if (data.body !== undefined) {
    parsed = typeof data.body === 'string' ? JSON.parse(data.body) : data.body // Shape B
  } else {
    throw new Error(`Unexpected Lambda response format: ${JSON.stringify(data)}`)
  }

  if (!parsed.major_elements) {
    throw new Error('Lambda response missing required field: major_elements')
  }

  console.log(`✅ Lambda API scrape successful for ${normalizedUrl}`)
  return parsed
}

// --- Public API ---

/**
 * Scrape a single URL.
 * Cache is checked first (specific domain, then generic) unless intent is provided,
 * which always forces a fresh Lambda scrape. Profile ID only affects the Lambda
 * browser session and does not bypass the cache.
 */
export async function scrapeWebPage(url, options = {}) {
  const intent = typeof options.intent === 'string' ? options.intent.trim() || null : null
  const profileId = typeof options.profile_id === 'string' ? options.profile_id.trim() || null : null
  console.log(`Looking up webpage data for ${url}${intent ? ` (intent: ${intent})` : ''}${profileId ? ` (profile: ${profileId})` : ''}`)

  try {
    const supabase = await createClient()
    const specificDomain = extractDomainName(url, true)
    const genericDomain = extractDomainName(url, false)

    // Intent-specific scrapes bypass the cache — the user wants a fresh, focused analysis.
    const skipCache = !!intent

    let cachedOutput = null
    let domainNameUsed = null

    if (!skipCache) {
      // Check specific domain first (e.g. youtube.com/watch), then generic (youtube.com)
      for (const domain of [specificDomain, genericDomain]) {
        if (!domain) continue
        console.log(`Attempting cache lookup for: ${domain}`)
        const { data, error } = await supabase
          .from('scraper')
          .select('scraper_output')
          .eq('domain_name', domain)
          .maybeSingle()

        if (error) throw new Error(`Database lookup failed: ${error.message}`)

        if (data?.scraper_output) {
          cachedOutput = typeof data.scraper_output === 'string'
            ? JSON.parse(data.scraper_output)
            : data.scraper_output
          domainNameUsed = domain
          console.log(`✅ Cache hit for: ${domain}`)
          break
        }
        console.warn(`⚠️ No cache entry for: ${domain}`)
      }
    }

    if (cachedOutput) {
      const elements = majorElementsToArray(cachedOutput.major_elements)
      console.log('Retrieved scraper data from database:', JSON.stringify(cachedOutput, null, 2))
      return {
        url,
        title: `Analysis for ${domainNameUsed}`,
        content: `Found ${elements.length} major elements for ${domainNameUsed}.`,
        elements,
        timestamp: new Date().toISOString(),
        statusCode: 200,
        majorElementsData: cachedOutput.major_elements || {},
      }
    }

    // No cache — call Lambda
    console.log(skipCache
      ? `📡 Skipping cache (intent-specific scrape), calling Lambda API for: ${url}`
      : `📡 No cache found in Supabase, calling Lambda API for: ${url}`)

    try {
      const lambdaData = await callLambdaScrapingAPI(url, intent, profileId)
      domainNameUsed = lambdaData.domain || genericDomain
      const elements = majorElementsToArray(lambdaData.major_elements)
      const title = lambdaData.page_title || `Analysis for ${domainNameUsed}`
      console.log('Retrieved scraper data from Lambda API:', JSON.stringify({
        major_elements: lambdaData.major_elements,
        domain: lambdaData.domain,
        page_title: lambdaData.page_title,
      }, null, 2))

      return {
        url,
        title,
        content: `Found ${elements.length} major elements for ${domainNameUsed}.`,
        elements,
        timestamp: new Date().toISOString(),
        statusCode: 200,
        majorElementsData: lambdaData.major_elements || {},
      }
    } catch (lambdaError) {
      console.error(`❌ Lambda API call failed for ${url}:`, lambdaError)

      // Lambda failed — try cache as fallback before giving up
      console.log(`🔄 Lambda failed — attempting cache fallback for ${url}`)
      for (const domain of [specificDomain, genericDomain]) {
        if (!domain) continue
        console.log(`Attempting cache fallback lookup for: ${domain}`)
        try {
          const { data, error } = await supabase
            .from('scraper')
            .select('scraper_output')
            .eq('domain_name', domain)
            .maybeSingle()

          if (!error && data?.scraper_output) {
            const fallbackOutput = typeof data.scraper_output === 'string'
              ? JSON.parse(data.scraper_output)
              : data.scraper_output
            const elements = majorElementsToArray(fallbackOutput.major_elements)
            console.log(`✅ Cache fallback hit for: ${domain}`)
            return {
              url,
              title: `Analysis for ${domain}`,
              content: `Found ${elements.length} major elements for ${domain}.`,
              elements,
              timestamp: new Date().toISOString(),
              statusCode: 200,
              majorElementsData: fallbackOutput.major_elements || {},
            }
          }
        } catch (cacheError) {
          console.warn(`⚠️ Cache fallback lookup failed for ${domain}:`, cacheError.message)
        }
        console.warn(`⚠️ No cache fallback entry for: ${domain}`)
      }

      // Both Lambda and cache failed — record miss
      const domainToRecord = genericDomain || specificDomain
      if (domainToRecord) await recordScraperMiss(supabase, domainToRecord)
      throw new Error(`Failed to scrape webpage via Lambda API: ${lambdaError.message}`)
    }
  } catch (error) {
    console.error(`Error getting scraper data for ${url}:`, error)
    return {
      url,
      title: `Error accessing ${url}`,
      content: `Unable to get scraper data for ${url}: ${error.message}`,
      elements: [],
      timestamp: new Date().toISOString(),
      error: error.message,
    }
  }
}

/**
 * Scrape one or more domains and return a combined analysis string.
 * If userProvidedUrl is given it is scraped once (not once per detected domain).
 * Returns { data: string, statusCode: 200 | 404 | 500 }.
 */
export async function batchScrapeWebpages(domains, userProvidedUrl = null, options = {}) {
  if (!domains?.length) {
    console.log('📝 No specific websites targeted - skipping scraping')
    return { data: '', statusCode: 404 }
  }

  console.log('🌐 Starting webpage data lookup for:', domains)

  // When the user provides a URL, scrape it once rather than once per detected domain.
  const targets = userProvidedUrl
    ? [{ domain: domains[0], url: userProvidedUrl }]
    : domains.map(domain => ({ domain, url: `https://${domain}` }))

  const results = []
  let hasErrors = false

  for (const { domain, url } of targets) {
    console.log(`🔍 Looking up domain: ${domain} with URL: ${url}`)
    const scraped = await scrapeWebPage(url, options)

    if (scraped.error) {
      console.warn(`⚠️ Skipping error result for ${domain}: ${scraped.error}`)
      hasErrors = true
      continue
    }

    const hasMajorElements = scraped.majorElementsData && Object.keys(scraped.majorElementsData).length > 0

    if (!hasMajorElements && !scraped.elements?.length) {
      console.warn(`⚠️ Skipping ${domain}: No element data found`)
      continue
    }

    let analysis = `## ${scraped.title.replace('Analysis for ', '')} Analysis\nURL: ${scraped.url}\nTitle: ${scraped.title}`

    if (hasMajorElements) {
      analysis += '\n\n## Major Element Analysis'
      analysis += '\nThis analysis identifies the most important structural and interactive elements on the page, which are ideal targets for a Chrome extension.'
      for (const [key, el] of Object.entries(scraped.majorElementsData)) {
        analysis += `\n\nElement: \`${key}\``
        analysis += `\n\t- Description: ${el.description}`
        analysis += `\n\t- CSS Selector: \`${el.selector}\``
      }
    } else {
      analysis += `\n\n**Key Elements:** ${scraped.elements.map(e => e.key).join(', ')}`
    }

    results.push(analysis)
  }

  if (!results.length) {
    console.warn('⚠️ No successful webpage analysis data collected')
    return { data: '', statusCode: hasErrors ? 500 : 404 }
  }

  console.log(`✅ Webpage analysis completed successfully (${results.length} successful scrape(s))`)
  return { data: results.join('\n\n'), statusCode: 200 }
}
