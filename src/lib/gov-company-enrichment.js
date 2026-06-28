import { isIP } from "node:net"
import { normalizeGovSearchKeywords } from "@/lib/gov-profiles"
import {
  companyNameFromDomain,
  isValidDomain,
  normalizeDomain,
} from "@/lib/gov-domain"
import {
  SBIR_TECH_MARKETPLACE_CATEGORIES,
  normalizeSbirCategories,
} from "@/lib/gov-sbir-categories"
import { OpenAIAdapter } from "@/lib/services/adapters/openai-adapter"

export {
  companyNameFromDomain,
  domainFromEmail,
  emailDomainMatchesInvite,
  isValidDomain,
  normalizeDomain,
  normalizeEmail,
} from "@/lib/gov-domain"

const PRIVATE_IPV4_RANGES = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
]

const GOV_ONBOARDING_OPENAI_MODEL = "gpt-5.4-nano-2026-03-17"
const openaiAdapter = new OpenAIAdapter()

const llmProfileSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    corporate_overview: { type: "string" },
    search_keywords: {
      type: "array",
      description:
        "SAM.gov Simple Search phrases (1-3 words each) written in federal procurement language, not product marketing copy.",
      items: {
        type: "string",
        description:
          "A phrase likely to appear in a federal solicitation title or statement of work for work this company could perform.",
      },
      minItems: 2,
      maxItems: 3,
    },
    naics_codes: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 5,
    },
    sbir_categories: {
      type: "array",
      description:
        "Relevant SBIR Tech Marketplace categories. Choose only from the provided category list.",
      items: {
        type: "string",
        enum: SBIR_TECH_MARKETPLACE_CATEGORIES,
      },
      minItems: 1,
      maxItems: 4,
    },
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"],
    },
  },
  required: [
    "name",
    "corporate_overview",
    "search_keywords",
    "naics_codes",
    "sbir_categories",
    "confidence",
  ],
}

export function isEmailVerified(user) {
  return Boolean(user?.email && (user.email_confirmed_at || user.confirmed_at))
}

function isUnsafeHostname(hostname) {
  const normalized = String(hostname || "").trim().toLowerCase()
  if (!normalized) return true
  if (normalized === "localhost" || normalized.endsWith(".localhost") || normalized.endsWith(".local")) {
    return true
  }
  if (normalized.includes(":")) {
    return true
  }
  if (isIP(normalized) === 4) {
    return PRIVATE_IPV4_RANGES.some((range) => range.test(normalized))
  }
  return false
}

export function normalizeCompanyUrl(value) {
  const raw = String(value || "").trim()
  if (!raw) {
    throw new Error("Enter a company website URL to continue.")
  }

  let url
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`)
  } catch {
    throw new Error("Enter a valid company website URL.")
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Company website must be an http or https URL.")
  }
  if (isUnsafeHostname(url.hostname)) {
    throw new Error("Enter a public company website URL.")
  }

  url.hash = ""
  url.username = ""
  url.password = ""
  return {
    url: url.toString(),
    domain: normalizeDomain(url.hostname),
  }
}

function withTimeout(promise, timeoutMs, label) {
  let timeout
  const timer = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out.`)), timeoutMs)
  })
  return Promise.race([promise, timer]).finally(() => clearTimeout(timeout))
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
}

function extractTagContent(html, regex) {
  return decodeHtmlEntities(html.match(regex)?.[1] || "").replace(/\s+/g, " ").trim()
}

function extractPageContent(html) {
  const title = extractTagContent(html, /<title[^>]*>([\s\S]*?)<\/title>/i)
  const metaDescription = extractTagContent(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
  )
  const bodyText = decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\/(h[1-6]|p|li|div|section|article)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 35)
    .filter((line, index, lines) => lines.indexOf(line) === index)
    .slice(0, 80)
    .join("\n")

  return {
    title,
    metaDescription,
    bodyText: bodyText.slice(0, 10000),
  }
}

function parseLlmJson(value) {
  const text = String(value || "").trim()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : null
  }
}

function cleanStringArray(value, limit) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, limit)
}

function cleanNaicsCodes(value) {
  return cleanStringArray(value, 5)
    .map((code) => code.match(/\d{2,6}/)?.[0] || "")
    .filter(Boolean)
}

function normalizeLlmProfile(profile, fallbackName) {
  const name = String(profile?.name || fallbackName || "").trim()
  const productKeywords = cleanStringArray(profile?.search_keywords, 3)
  return {
    name,
    corporate_overview: String(profile?.corporate_overview || "").trim(),
    search_keywords: normalizeGovSearchKeywords(productKeywords),
    naics_codes: cleanNaicsCodes(profile?.naics_codes),
    sbir_categories: normalizeSbirCategories(profile?.sbir_categories),
    confidence: ["low", "medium", "high"].includes(profile?.confidence) ? profile.confidence : "medium",
  }
}

async function fetchCompanyPage(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        "user-agent": "Mozilla/5.0 (compatible; ChromieGovOnboarding/1.0)",
      },
    })

    if (!response.ok) {
      throw new Error(`Company website returned ${response.status}.`)
    }

    const contentType = response.headers.get("content-type") || ""
    if (contentType && !/text\/html|text\/plain|application\/xhtml\+xml/i.test(contentType)) {
      throw new Error("Company website did not return readable page content.")
    }

    return response.text()
  } finally {
    clearTimeout(timeout)
  }
}

async function normalizePageWithLlm({ domain, sourceUrl, pageContent }) {
  const input = `Fill a government contracting company profile from this company website content.

Rules:
- Use only the website content below. Do not invent certifications, past performance, agencies, customers, or contract vehicles.
- corporate_overview: one concise paragraph, 2-4 sentences, grounded in website copy. Explain what products and services the company offers.
- search_keywords: 2-3 SAM.gov phrases (1-3 words each). Write how agencies describe the work in solicitations—not product names, marketing copy, or internal jargon.
- naics_codes: 3-5 likely numeric NAICS strings from what the company actually does.
- sbir_categories: 1-4 relevant SBIR Tech Marketplace categories. Choose only from: ${SBIR_TECH_MARKETPLACE_CATEGORIES.join(", ")}.
- If the company name is unclear, infer a clean name from the domain.

Domain: ${domain}
Source URL: ${sourceUrl}
Page title: ${pageContent.title}
Meta description: ${pageContent.metaDescription}
Website text:
${pageContent.bodyText}`

  const response = await openaiAdapter.createResponse({
    model: GOV_ONBOARDING_OPENAI_MODEL,
    input,
    response_format: {
      type: "json_schema",
      name: "gov_company_profile",
      schema: llmProfileSchema,
    },
    temperature: 0.1,
    max_output_tokens: 900,
    store: false,
  })

  return normalizeLlmProfile(parseLlmJson(response?.output_text), companyNameFromDomain(domain))
}

export async function enrichGovCompanyProfile(companyUrl) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Server is missing OpenAI credentials.")
  }

  const normalized = normalizeCompanyUrl(companyUrl)
  const html = await withTimeout(fetchCompanyPage(normalized.url), 16000, "Company website fetch")
  const pageContent = extractPageContent(html)
  const profile = await normalizePageWithLlm({
    domain: normalized.domain,
    sourceUrl: normalized.url,
    pageContent,
  })

  console.log("[gov-company-enrichment] completed", {
    domain: normalized.domain,
    source_url: normalized.url,
    confidence: profile.confidence,
    text_length: pageContent.bodyText.length,
  })

  return {
    ...profile,
    company_domain: normalized.domain,
    source_url: normalized.url,
  }
}
