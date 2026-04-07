/**
 * Tavily search API — LLM-ready summaries + scraped snippets (see https://tavily.com).
 * Set TAVILY_API_KEY in the environment to enable external-resources augmentation.
 */

const TAVILY_SEARCH_URL = 'https://api.tavily.com/search'

/** Below this scraping-intent confidence, the planner is unsure — good candidate for Tavily. */
export const TAVILY_SCRAPING_CONFIDENCE_MAX = 0.82
/** Ignore noise at exactly 0 unless there is scraping intent text. */
export const TAVILY_SCRAPING_CONFIDENCE_MIN = 0.22

/**
 * Heuristic: run Tavily when the first-pass external-resources model is uncertain
 * or returned no concrete resources despite a request that likely needs them.
 *
 * @param {Object} rawResult - Parsed JSON from the first external-resources call (before endpoint filtering).
 * @param {string} featureRequest - User message.
 * @returns {boolean}
 */
export function shouldAugmentExternalResourcesWithTavily(rawResult, featureRequest) {
  if (!process.env.TAVILY_API_KEY?.trim()) {
    return false
  }
  const req = typeof featureRequest === 'string' ? featureRequest : ''
  const c =
    typeof rawResult?.scraping_intent_confidence === 'number'
      ? rawResult.scraping_intent_confidence
      : parseFloat(rawResult?.scraping_intent_confidence) || 0

  const apis = Array.isArray(rawResult?.external_apis) ? rawResult.external_apis.length : 0
  const pages = Array.isArray(rawResult?.webpages_to_scrape) ? rawResult.webpages_to_scrape.length : 0
  const intent = (rawResult?.scraping_intent || '').trim()

  // Uncertain niche scraping (between noise and "highly confident")
  if (c >= TAVILY_SCRAPING_CONFIDENCE_MIN && c < TAVILY_SCRAPING_CONFIDENCE_MAX) {
    console.log('🔭 [Tavily] Heuristic: scraping_intent_confidence in uncertain band:', c)
    return true
  }

  // Planner wrote a niche intent but stayed doubtful
  if (intent.length > 0 && c > 0 && c < 0.48) {
    console.log('🔭 [Tavily] Heuristic: non-empty scraping_intent with low confidence:', c)
    return true
  }

  // No concrete resources yet, but the request likely needs third-party context
  if (apis === 0 && pages === 0 && looksLikeNeedsExternalContext(req)) {
    console.log('🔭 [Tavily] Heuristic: empty APIs/pages but request suggests external integration')
    return true
  }

  // First pass listed APIs/domains but scraping_intent_confidence is 0 or "noise" (< MIN).
  // In that case the model is not claiming niche page scraping — we still want web research to
  // validate endpoints, company context, and domains (common when logs show APIs + sites + c=0).
  if ((apis > 0 || pages > 0) && c < TAVILY_SCRAPING_CONFIDENCE_MIN) {
    console.log(
      '🔭 [Tavily] Heuristic: external resources listed but scraping_intent_confidence is generic/low:',
      c
    )
    return true
  }

  return false
}

function looksLikeNeedsExternalContext(text) {
  if (text.length < 12) return false
  if (/https?:\/\//i.test(text)) return true
  return /\b(api|apis|rest|graphql|oauth|integrate|integration|webhook|sdk|stripe|openai|anthropic|notion|slack|jira|github|gitlab|linear|asana|trello|firebase|supabase|twilio|sendgrid|plaid)\b/i.test(
    text
  )
}

/**
 * Host or label from endpoint_url for search queries (avoid leading with "Chrome extension API…"
 * — that retrieves Chrome Web Store junk instead of the actual third party).
 */
function endpointHint(endpointUrl) {
  const s = (endpointUrl || '').trim()
  if (!s) return ''
  try {
    const u = new URL(s.includes('://') ? s : `https://${s}`)
    return u.hostname || ''
  } catch {
    return ''
  }
}

/**
 * Neutral retrieval hint when the planner gave concrete names/hosts/domains (any third party:
 * OSS, SaaS, consumer site, gov API — not “enterprise”-specific wording).
 */
const STRUCTURED_RESEARCH_HINT =
  'Official documentation, API base URL or public endpoints, authentication pattern, rate limits if known.'

/**
 * Build a Tavily query using modes so we do not overfit to one template:
 *
 * - **intent + optional identifiers** — page/DOM focus; depth scales with whether we have anchors.
 * - **identifiers only** — lead with planner output + neutral docs/endpoint hint + user text.
 * - **open** — no structured row; user message drives search (avoids Chrome Web Store–style boilerplate).
 *
 * @param {string} featureRequest
 * @param {Object} rawResult
 * @returns {{ query: string, searchDepth: 'basic' | 'advanced', maxResults: number, mode: string }}
 */
export function buildTavilyQueryForExternalResources(featureRequest, rawResult) {
  const base = (featureRequest || '').trim().slice(0, 520)
  const intent = (rawResult?.scraping_intent || '').trim().slice(0, 220)

  const apiBits = []
  if (Array.isArray(rawResult?.external_apis)) {
    for (const api of rawResult.external_apis.slice(0, 5)) {
      const name = (api?.name || '').trim()
      const host = endpointHint(api?.endpoint_url)
      if (name && host) apiBits.push(`${name} ${host}`)
      else if (name) apiBits.push(name)
      else if (host) apiBits.push(host)
    }
  }

  const pageBits = []
  if (Array.isArray(rawResult?.webpages_to_scrape)) {
    for (const d of rawResult.webpages_to_scrape.slice(0, 5)) {
      const dom = String(d || '')
        .trim()
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .replace(/^www\./i, '')
      if (dom) pageBits.push(dom)
    }
  }

  const entityParts = []
  if (apiBits.length) entityParts.push(`Services/APIs: ${apiBits.join('; ')}`)
  if (pageBits.length) entityParts.push(`Sites: ${pageBits.join(', ')}`)
  const entityLine = entityParts.join('. ')
  const hasStructured = apiBits.length > 0 || pageBits.length > 0

  if (intent) {
    const parts = [hasStructured ? entityLine : '', `Page or DOM focus: ${intent}`, base].filter(Boolean)
    const query = parts.join(' — ').slice(0, 400)
    return {
      query,
      searchDepth: hasStructured ? 'advanced' : 'basic',
      maxResults: hasStructured ? 8 : 6,
      mode: 'intent',
    }
  }

  if (hasStructured) {
    const query = `${entityLine}. ${STRUCTURED_RESEARCH_HINT} ${base}`.slice(0, 400)
    return {
      query,
      searchDepth: 'advanced',
      maxResults: 8,
      mode: 'structured',
    }
  }

  const query =
    base.length >= 28
      ? base.slice(0, 400)
      : `Browser extension — external APIs, websites, or services (documentation and integration): ${base}`.slice(
          0,
          400
        )
  return {
    query,
    searchDepth: 'basic',
    maxResults: 5,
    mode: 'open',
  }
}

/**
 * @param {string} query
 * @param {{ searchDepth?: 'basic' | 'advanced', maxResults?: number }} [options]
 * @returns {Promise<{ answer: string, results: Array<{ title?: string, url?: string, content?: string }>, raw?: object } | null>}
 */
export async function fetchTavilySearchForPlanning(query, options = {}) {
  const apiKey = process.env.TAVILY_API_KEY?.trim()
  if (!apiKey || !query?.trim()) {
    return null
  }

  const searchDepth = options.searchDepth === 'basic' ? 'basic' : 'advanced'
  const maxResults = Math.min(Math.max(Number(options.maxResults) || 8, 1), 15)

  const body = {
    api_key: apiKey,
    query: query.trim().slice(0, 400),
    search_depth: searchDepth,
    include_answer: true,
    max_results: maxResults,
  }

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 28000)

  try {
    const res = await fetch(TAVILY_SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[Tavily] HTTP error:', res.status, errText.slice(0, 200))
      return null
    }

    const data = await res.json()
    const answer = typeof data.answer === 'string' ? data.answer : ''
    const results = Array.isArray(data.results)
      ? data.results.map((r) => ({
          title: r.title,
          url: r.url,
          content: typeof r.content === 'string' ? r.content.slice(0, 1200) : '',
        }))
      : []

    const logAnswerCap = 4000
    const logSnippetCap = 900
    console.log('🔭 [Tavily] Search response:', {
      query: body.query,
      answer:
        answer.length > logAnswerCap
          ? `${answer.slice(0, logAnswerCap)}… (${answer.length} chars total)`
          : answer || '(empty)',
      results: results.map((r, i) => ({
        i: i + 1,
        title: r.title,
        url: r.url,
        content:
          (r.content || '').length > logSnippetCap
            ? `${(r.content || '').slice(0, logSnippetCap)}…`
            : r.content || '',
      })),
      rawKeys: data && typeof data === 'object' ? Object.keys(data) : [],
    })

    return { answer, results, raw: data }
  } catch (e) {
    console.error('[Tavily] Request failed:', e?.message || e)
    return null
  } finally {
    clearTimeout(t)
  }
}

/**
 * Format Tavily payload for an LLM refinement prompt (compact).
 */
export function formatTavilyContextForPrompt(tavily) {
  if (!tavily || (!tavily.answer && !(tavily.results?.length > 0))) {
    return ''
  }
  const parts = []
  if (tavily.answer) {
    parts.push('## Summary\n' + tavily.answer.trim())
  }
  if (tavily.results?.length) {
    const lines = tavily.results
      .map((r, i) => {
        const title = r.title || 'Source'
        const url = r.url || ''
        const snippet = (r.content || '').trim().replace(/\s+/g, ' ').slice(0, 700)
        return `${i + 1}. **${title}** ${url ? `(${url})` : ''}\n${snippet}`
      })
      .join('\n\n')
    parts.push('## Sources (snippets)\n' + lines)
  }
  return parts.join('\n\n')
}
