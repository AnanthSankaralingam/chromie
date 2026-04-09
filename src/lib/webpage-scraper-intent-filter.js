/**
 * When we serve generic cached scraper output but the caller passed an intent, use an LLM
 * to pick major_elements keys that match the intent (primary cache hit or Lambda-fail fallback).
 * Selectors stay exactly as cached.
 */

import { llmService } from '@/lib/services/llm-service'
import { MODEL_SELECTION, SUPPORTED_PROVIDERS } from '@/lib/constants'
import { extractJsonContent, parseJsonWithRetry } from '@/lib/codegen/output-handlers/json-extractor'

const MAX_MAJOR_ELEMENTS_JSON_CHARS = 52000
const MAX_KEYS = 18

function truncateMajorElements(majorElements) {
  let payload = JSON.stringify(majorElements)
  if (payload.length <= MAX_MAJOR_ELEMENTS_JSON_CHARS) {
    return { majorElements, truncated: false }
  }
  const out = {}
  for (const key of Object.keys(majorElements)) {
    const next = { ...out, [key]: majorElements[key] }
    if (JSON.stringify(next).length > MAX_MAJOR_ELEMENTS_JSON_CHARS) break
    out[key] = majorElements[key]
  }
  console.warn(
    `[scraper-intent-filter] Truncated major_elements for LLM (${Object.keys(out).length} keys, was ${Object.keys(majorElements).length})`
  )
  return { majorElements: out, truncated: true }
}

/**
 * @param {string} intent
 * @param {Record<string, { description?: string, selector?: string }>} majorElements
 * @param {string} [pageUrl]
 * @returns {Promise<Record<string, { description?: string, selector?: string }>>}
 */
export async function filterCachedMajorElementsByIntent(intent, majorElements, pageUrl = '') {
  const trimmed = typeof intent === 'string' ? intent.trim() : ''
  if (!trimmed || !majorElements || typeof majorElements !== 'object') {
    return majorElements
  }

  const keys = Object.keys(majorElements)
  if (keys.length === 0) return majorElements

  const { majorElements: toSend } = truncateMajorElements(majorElements)

  const prompt = `You help build Chrome extensions. The live page scrape failed; we only have a cached DOM summary.

Page URL (context): ${pageUrl || '(unknown)'}

User intent (what the extension should do on this page):
"""${trimmed}"""

Cached "major_elements" is a JSON object. Each key names one logical region. Values have "description" and "selector" (CSS).

Your job: return ONLY keys from the input object that are relevant to the user intent — things a content script would likely need to target. Order keys from most to least important. Include at least one key if anything plausibly relates; if the intent is narrow and only a few keys matter, omit the rest. Cap at ${MAX_KEYS} keys.

Respond with a single JSON object and no other text:
{"relevant_keys":["key1","key2",...]}

Use exact key strings from the cached object below (character-for-character).

CACHED_MAJOR_ELEMENTS_JSON:
${JSON.stringify(toSend)}`

  try {
    const response = await llmService.createResponse({
      provider: SUPPORTED_PROVIDERS.GEMINI,
      model: MODEL_SELECTION.TASK_EXECUTOR_JSON,
      input: prompt,
      temperature: 0.15,
      max_output_tokens: 4096,
      store: false,
    })

    const raw =
      response?.output_text ||
      response?.choices?.[0]?.message?.content ||
      ''
    const extracted = extractJsonContent(raw)
    const parsed = parseJsonWithRetry(extracted || raw)
    const list = parsed?.relevant_keys
    if (!Array.isArray(list) || list.length === 0) {
      console.warn('[scraper-intent-filter] No relevant_keys from LLM; using full cache')
      return majorElements
    }

    const valid = new Set(keys)
    const ordered = []
    for (const k of list) {
      if (typeof k !== 'string') continue
      if (!valid.has(k)) continue
      if (!ordered.includes(k)) ordered.push(k)
    }

    if (ordered.length === 0) {
      console.warn('[scraper-intent-filter] LLM keys did not match cache; using full cache')
      return majorElements
    }

    const out = {}
    for (const k of ordered) {
      out[k] = majorElements[k]
    }
    console.log(
      `[scraper-intent-filter] Intent narrowed ${keys.length} cached elements → ${ordered.length} for: ${trimmed.slice(0, 80)}${trimmed.length > 80 ? '…' : ''}`
    )
    return out
  } catch (err) {
    console.warn('[scraper-intent-filter] LLM filter failed; using full cache:', err?.message || err)
    return majorElements
  }
}
