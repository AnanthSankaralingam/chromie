const USASPENDING_AWARDS_URL = "https://api.usaspending.gov/api/v2/search/spending_by_award/"
const CONTRACT_AWARD_TYPE_CODES = ["A", "B", "C", "D"]
const DEFAULT_LOOKBACK_YEARS = 5
const DEFAULT_RESULT_LIMIT = 100
const DEFAULT_TOP_WINNERS = 5
export const TYPICAL_WINNERS_MATCH_VERSION = 2

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim()
}

function uniqueStrings(values, limit = 8) {
  const seen = new Set()
  const out = []
  for (const value of values) {
    const text = cleanText(value)
    const key = text.toLowerCase()
    if (text && !seen.has(key)) {
      seen.add(key)
      out.push(text)
    }
    if (out.length >= limit) break
  }
  return out
}

function extractNaicsCodesFromText(value) {
  const text = cleanText(value)
  if (!text) return []
  return Array.from(text.matchAll(/\b\d{6}\b/g), (match) => match[0])
}

function extractPscCodesFromText(value) {
  const text = cleanText(value)
  if (!text) return []
  return Array.from(text.matchAll(/\b(?:[A-Z]\d{3}|\d{4})\b/g), (match) => match[0].toUpperCase())
}

function fieldValues(rawFields, labelMatcher) {
  return Object.entries(rawFields || {})
    .filter(([label]) => labelMatcher(label.toLowerCase()))
    .map(([, value]) => value)
    .join(" ")
}

function extractNaicsCodes(run, govProfile) {
  const rawFields = run?.source_payload?.raw_fields || {}
  const naicsFieldText = fieldValues(rawFields, (label) => label.includes("naics"))

  return uniqueStrings([
    ...(Array.isArray(govProfile?.naics_codes) ? govProfile.naics_codes : []),
    ...extractNaicsCodesFromText(naicsFieldText),
  ], 6)
}

function extractPscCodes(run) {
  const rawFields = run?.source_payload?.raw_fields || {}
  const rawOpportunity = run?.analysis_payload?.raw_opportunity || {}
  const pscFieldText = fieldValues(
    rawFields,
    (label) => label.includes("psc") || label.includes("product service") || label.includes("classification"),
  )

  return uniqueStrings([
    ...extractPscCodesFromText(pscFieldText),
    ...extractPscCodesFromText(rawOpportunity.psc_code),
    ...extractPscCodesFromText(rawOpportunity.product_service_code),
  ], 4)
}

function inferToptierAgency(run) {
  const rawFields = run?.source_payload?.raw_fields || {}
  const source = cleanText(
    [
      run?.agency,
      fieldValues(
        rawFields,
        (label) =>
          label.includes("department") ||
          label.includes("agency") ||
          label.includes("sub-tier") ||
          label.includes("subtier") ||
          label.includes("office"),
      ),
    ].join(" "),
  ).toLowerCase()

  const mappings = [
    ["Department of Defense", /\b(department of defense|dod|defense logistics agency|dla|navy|army|air force|marine corps|space force)\b/],
    ["Department of Energy", /\bdepartment of energy\b|\bdoe\b/],
    ["Department of Homeland Security", /\bdepartment of homeland security\b|\bdhs\b|coast guard|fema/],
    ["Department of Veterans Affairs", /\bdepartment of veterans affairs\b|\bveterans affairs\b|\bva\b/],
    ["Department of Health and Human Services", /\bhealth and human services\b|\bhhs\b|national institutes of health|\bnih\b/],
    ["National Aeronautics and Space Administration", /\bnasa\b|national aeronautics/],
    ["General Services Administration", /\bgeneral services administration\b|\bgsa\b/],
    ["Department of Commerce", /\bdepartment of commerce\b|\bnoaa\b|nist/],
    ["Department of Transportation", /\bdepartment of transportation\b|\bdot\b|federal aviation administration|\bfaa\b/],
    ["Department of the Interior", /\bdepartment of the interior\b|\bdoi\b/],
    ["Department of Agriculture", /\bdepartment of agriculture\b|\busda\b/],
    ["Department of Justice", /\bdepartment of justice\b|\bdoj\b/],
  ]

  return mappings.find(([, pattern]) => pattern.test(source))?.[0] || ""
}

function extractKeywords(run) {
  const payload = run?.analysis_payload || {}
  const rawOpportunity = payload.raw_opportunity || {}
  const fields = run?.source_payload?.raw_fields || {}
  const sourceTerms = [
    payload.matched_keyword,
    ...(Array.isArray(payload.icp_match_terms) ? payload.icp_match_terms : []),
    rawOpportunity.matched_keyword,
    run?.title,
    run?.contract_summary,
    fields.description,
  ]

  const stopWords = new Set([
    "and",
    "for",
    "from",
    "government",
    "service",
    "services",
    "support",
    "contract",
    "notice",
    "solicitation",
    "requirement",
  ])

  const phrases = uniqueStrings(sourceTerms, 6).filter((term) => term.length <= 80)
  const singleWords = cleanText([run?.title, payload.matched_keyword].filter(Boolean).join(" "))
    .split(/[^A-Za-z0-9-]+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 4 && !stopWords.has(word.toLowerCase()))
    .slice(0, 8)

  return uniqueStrings([...phrases, ...singleWords], 8)
}

function isoDateYearsAgo(years) {
  const date = new Date()
  date.setUTCFullYear(date.getUTCFullYear() - years)
  return date.toISOString().slice(0, 10)
}

function buildPayload({ naicsCodes, pscCodes, keywords, agencyName, limit }) {
  const filters = {
    award_type_codes: CONTRACT_AWARD_TYPE_CODES,
    time_period: [
      {
        start_date: isoDateYearsAgo(DEFAULT_LOOKBACK_YEARS),
        end_date: new Date().toISOString().slice(0, 10),
      },
    ],
  }

  if (naicsCodes.length) {
    filters.naics_codes = naicsCodes
  }
  if (pscCodes.length) {
    filters.psc_codes = pscCodes
  }
  if (keywords.length) {
    filters.keywords = keywords
  }
  if (agencyName) {
    filters.agencies = [{ type: "awarding", tier: "toptier", name: agencyName }]
  }

  return {
    filters,
    fields: [
      "Award ID",
      "Recipient Name",
      "Award Amount",
      "Start Date",
      "Awarding Agency",
      "NAICS Code",
      "PSC Code",
      "Description",
    ],
    page: 1,
    limit,
    sort: "Award Amount",
    order: "desc",
    subawards: false,
  }
}

async function postUsaspending(payload) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(USASPENDING_AWARDS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(json.detail || json.message || `USASpending returned ${res.status}`)
    }
    return Array.isArray(json.results) ? json.results : []
  } finally {
    clearTimeout(timeout)
  }
}

function normalizeAmount(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  const n = Number(String(value || "").replace(/[$,]/g, ""))
  return Number.isFinite(n) ? n : 0
}

function aggregateWinners(results, topN) {
  const byRecipient = new Map()

  for (const row of results) {
    const recipientName = cleanText(row["Recipient Name"] || row.recipient_name)
    if (!recipientName) continue

    const current = byRecipient.get(recipientName.toLowerCase()) || {
      recipient_name: recipientName,
      award_count: 0,
      total_award_amount: 0,
      agencies: new Map(),
      sample_awards: [],
    }
    const amount = normalizeAmount(row["Award Amount"] || row.award_amount)
    const agency = cleanText(row["Awarding Agency"] || row.awarding_agency)

    current.award_count += 1
    current.total_award_amount += amount
    if (agency) current.agencies.set(agency, (current.agencies.get(agency) || 0) + 1)
    if (current.sample_awards.length < 3) {
      current.sample_awards.push({
        award_id: cleanText(row["Award ID"] || row.award_id),
        award_amount: amount,
        start_date: cleanText(row["Start Date"] || row.start_date),
        awarding_agency: agency,
        naics_code: cleanText(row["NAICS Code"] || row.naics_code),
        psc_code: cleanText(row["PSC Code"] || row.psc_code),
        description: cleanText(row.Description || row.description).slice(0, 180),
      })
    }
    byRecipient.set(recipientName.toLowerCase(), current)
  }

  return Array.from(byRecipient.values())
    .map((winner) => ({
      ...winner,
      agencies: Array.from(winner.agencies.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count })),
      average_award_amount: winner.award_count
        ? Math.round(winner.total_award_amount / winner.award_count)
        : 0,
      total_award_amount: Math.round(winner.total_award_amount),
    }))
    .sort((a, b) => b.total_award_amount - a.total_award_amount || b.award_count - a.award_count)
    .slice(0, topN)
}

function confidenceForAttempt(attempt) {
  if (attempt.pscCodes.length && attempt.agencyName) return "strong"
  if (attempt.pscCodes.length && attempt.keywords.length) return "strong"
  if (attempt.pscCodes.length && attempt.naicsCodes.length) return "strong"
  if (attempt.naicsCodes.length && attempt.agencyName && attempt.keywords.length) return "medium"
  if (attempt.naicsCodes.length && attempt.keywords.length) return "medium"
  if (attempt.agencyName && attempt.keywords.length) return "medium"
  return "broad"
}

function matchBasisForAttempt(attempt) {
  const basis = []
  if (attempt.pscCodes.length) basis.push(`PSC ${attempt.pscCodes.join(", ")}`)
  if (attempt.naicsCodes.length) basis.push(`NAICS ${attempt.naicsCodes.join(", ")}`)
  if (attempt.agencyName) basis.push(attempt.agencyName)
  if (attempt.keywords.length) basis.push(`keywords: ${attempt.keywords.join(", ")}`)
  return basis
}

function buildQueryAttempts(run, govProfile) {
  const naicsCodes = extractNaicsCodes(run, govProfile)
  const pscCodes = extractPscCodes(run)
  const agencyName = inferToptierAgency(run)
  const keywords = extractKeywords(run)
  const primaryKeyword = keywords.slice(0, 3)

  const attempts = [
    { pscCodes, naicsCodes, agencyName, keywords: primaryKeyword },
    { pscCodes, naicsCodes, agencyName: "", keywords: primaryKeyword },
    { pscCodes, naicsCodes: [], agencyName, keywords: primaryKeyword },
    { pscCodes, naicsCodes, agencyName: "", keywords: [] },
    { pscCodes, naicsCodes: [], agencyName: "", keywords: primaryKeyword },
    { pscCodes: [], naicsCodes, agencyName, keywords: primaryKeyword },
    { pscCodes: [], naicsCodes, agencyName: "", keywords: primaryKeyword },
    { pscCodes: [], naicsCodes, agencyName, keywords: [] },
    { pscCodes: [], naicsCodes, agencyName: "", keywords: [] },
    { pscCodes: [], naicsCodes: [], agencyName, keywords: primaryKeyword },
    { pscCodes: [], naicsCodes: [], agencyName: "", keywords: primaryKeyword },
  ]

  const seen = new Set()
  return attempts
    .filter(
      (attempt) =>
        attempt.pscCodes.length ||
        attempt.naicsCodes.length ||
        attempt.agencyName ||
        attempt.keywords.length,
    )
    .filter((attempt) => {
      const key = JSON.stringify(attempt)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((attempt) => ({
      ...attempt,
      confidence: confidenceForAttempt(attempt),
      match_basis: matchBasisForAttempt(attempt),
    }))
}

export async function findTypicalContractWinners({ run, govProfile, limit = DEFAULT_RESULT_LIMIT }) {
  if (!run || run.source === "sbir_tech_marketplace") {
    return {
      source: "usaspending",
      source_url: "https://www.usaspending.gov/",
      generated_at: new Date().toISOString(),
      match_version: TYPICAL_WINNERS_MATCH_VERSION,
      winners: [],
      confidence: "unavailable",
      match_basis: [],
      query: { naics_codes: [], psc_codes: [], keywords: [], agency: "" },
      reason: "winner history is only available for federal award data",
    }
  }

  const attempts = buildQueryAttempts(run, govProfile)
  if (!attempts.length) {
    return {
      source: "usaspending",
      source_url: "https://www.usaspending.gov/",
      generated_at: new Date().toISOString(),
      match_version: TYPICAL_WINNERS_MATCH_VERSION,
      winners: [],
      confidence: "unavailable",
      match_basis: [],
      query: { naics_codes: [], psc_codes: [], keywords: [], agency: "" },
      reason: "no PSC, NAICS, agency, or keyword signals available for winner lookup",
    }
  }

  let lastError = null
  for (const attempt of attempts) {
    try {
      const payload = buildPayload({ ...attempt, limit })
      const results = await postUsaspending(payload)
      const winners = aggregateWinners(results, DEFAULT_TOP_WINNERS)
      if (winners.length) {
        return {
          source: "usaspending",
          source_url: "https://www.usaspending.gov/",
          verification_source: "USASpending contract awards sourced from FPDS/SAM award records",
          generated_at: new Date().toISOString(),
          match_version: TYPICAL_WINNERS_MATCH_VERSION,
          lookback_years: DEFAULT_LOOKBACK_YEARS,
          confidence: attempt.confidence,
          match_basis: attempt.match_basis,
          query: {
            naics_codes: attempt.naicsCodes,
            psc_codes: attempt.pscCodes,
            keywords: attempt.keywords,
            agency: attempt.agencyName,
          },
          result_count: results.length,
          winners,
        }
      }
    } catch (err) {
      lastError = err
    }
  }

  if (lastError) {
    throw lastError
  }

  return {
    source: "usaspending",
    source_url: "https://www.usaspending.gov/",
    generated_at: new Date().toISOString(),
    match_version: TYPICAL_WINNERS_MATCH_VERSION,
    lookback_years: DEFAULT_LOOKBACK_YEARS,
    confidence: "unavailable",
    match_basis: attempts[0]?.match_basis || [],
    query: attempts[0]
      ? {
          naics_codes: attempts[0].naicsCodes,
          psc_codes: attempts[0].pscCodes,
          keywords: attempts[0].keywords,
          agency: attempts[0].agencyName,
        }
      : {},
    winners: [],
    reason: "no matching award history found",
  }
}
