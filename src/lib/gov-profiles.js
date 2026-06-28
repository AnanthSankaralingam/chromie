import { createServiceClient } from "@/lib/supabase/service"
import {
  defaultParamsForScenario,
  GOV_PROFILE_SCENARIO_IDS,
} from "@/lib/workflow-automations"
import { normalizeSbirCategories } from "@/lib/gov-sbir-categories"

export const GOV_PROFILE_RFP_BUCKET = "gov-profile-rfps"
export const GOV_PROFILE_RFP_MAX_BYTES = 15 * 1024 * 1024
export const GOV_PROFILE_RFP_CONTEXT_MAX_CHARS = 3500

/** @param {...unknown} lists */
export function mergeUniqueKeywordList(...lists) {
  const seen = new Set()
  /** @type {string[]} */
  const out = []
  for (const list of lists) {
    for (const raw of parseTextList(list)) {
      const key = raw.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        out.push(raw)
      }
    }
  }
  return out
}

/** @param {unknown} profileKeywords */
export function normalizeGovSearchKeywords(profileKeywords) {
  return mergeUniqueKeywordList(profileKeywords)
}

/**
 * @param {Record<string, unknown> | null | undefined} govProfile
 * @param {string} scenarioId
 * @param {string} userEmail
 */
export function mergeGovProfileIntoScenarioParams(govProfile, scenarioId, userEmail = "") {
  const base = defaultParamsForScenario(scenarioId, userEmail)
  if (!govProfile || !GOV_PROFILE_SCENARIO_IDS.has(scenarioId)) {
    return base
  }

  const { corporate_overview_path: _ignoredPath, ...baseWithoutOverviewFile } = base
  const profileSearch = normalizeGovSearchKeywords(govProfile.search_keywords)
  const searchKeywords = profileSearch.length ? profileSearch : base.search_keywords
  const icpKeywords = profileSearch.length ? profileSearch : searchKeywords
  const maxKeywordSearches = profileSearch.length
    ? Math.min(profileSearch.length, Number(base.max_keyword_searches) || profileSearch.length)
    : base.max_keyword_searches
  const sbirCategories = normalizeSbirCategories(govProfile.sbir_categories)
  const isSbirMarketplace = scenarioId === "morphworks_sbir_tech_marketplace"
  const corporateOverview = String(govProfile.corporate_overview || "").trim()
  const pastRfpContext = buildPastRfpContext(govProfile.past_rfps)
  const combinedOverview = [corporateOverview, pastRfpContext && `Past completed RFP context:\n${pastRfpContext}`]
    .filter(Boolean)
    .join("\n\n")

  return {
    ...baseWithoutOverviewFile,
    customer_name: govProfile.name,
    search_keywords: searchKeywords,
    icp_keywords: icpKeywords,
    max_keyword_searches: maxKeywordSearches,
    naics_codes: govProfile.naics_codes ?? base.naics_codes,
    corporate_overview: combinedOverview,
    corporate_overview_path: "",
    gov_profile_id: govProfile.id,
    past_rfp_context: pastRfpContext,
    ...(isSbirMarketplace && sbirCategories.length
      ? {
          sbir_tech_marketplace_categories: sbirCategories,
        }
      : {}),
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 */
export async function getGovProfileForUser(supabase, userId) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("gov_profile_id")
    .eq("id", userId)
    .maybeSingle()

  if (profileError) {
    throw new Error(profileError.message)
  }
  if (!profile?.gov_profile_id) {
    return null
  }

  const { data: govProfile, error: govError } = await supabase
    .from("gov_profiles")
    .select("*")
    .eq("id", profile.gov_profile_id)
    .single()

  if (govError) {
    throw new Error(govError.message)
  }

  return govProfile
}

/** @param {unknown} value */
export function parseTextList(value) {
  if (Array.isArray(value)) {
    return value.map((s) => String(s).trim()).filter(Boolean)
  }
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

/** @param {unknown} value */
export function normalizePastRfpPdfs(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((row) => row && typeof row === "object")
    .map((row) => ({
      id: String(row.id || "").trim(),
      filename: String(row.filename || "").trim(),
      storage_path: String(row.storage_path || "").trim(),
      size_bytes: Number(row.size_bytes) || 0,
      uploaded_at: String(row.uploaded_at || "").trim(),
      processing_status: normalizeRfpProcessingStatus(row.processing_status),
      processed_at: String(row.processed_at || "").trim(),
      processing_error: String(row.processing_error || "").trim(),
      summary: String(row.summary || "").trim(),
      capabilities: parseTextList(row.capabilities).slice(0, 8),
      agencies: parseTextList(row.agencies).slice(0, 6),
      naics_codes: parseTextList(row.naics_codes).slice(0, 6),
      contract_keywords: parseTextList(row.contract_keywords).slice(0, 10),
      fit_context: String(row.fit_context || "").trim(),
    }))
    .filter((row) => row.id && row.storage_path && row.filename)
}

export function normalizeRfpProcessingStatus(value) {
  const status = String(value || "").trim()
  if (["processed", "failed", "pending"].includes(status)) return status
  return "pending"
}

export function buildPastRfpContext(pastRfps) {
  const processed = normalizePastRfpPdfs(pastRfps).filter(
    (row) => row.processing_status === "processed" && (row.fit_context || row.summary),
  )
  if (!processed.length) return ""

  const sections = processed.map((row, index) => {
    const parts = [
      processed.length > 1 && `Past completed RFP ${index + 1}:`,
      row.fit_context && `Fit signal: ${row.fit_context}`,
      row.summary && `Summary: ${row.summary}`,
      row.capabilities.length && `Capabilities: ${row.capabilities.join(", ")}`,
      row.agencies.length && `Agencies/customers: ${row.agencies.join(", ")}`,
      row.naics_codes.length && `NAICS: ${row.naics_codes.join(", ")}`,
      row.contract_keywords.length && `Keywords: ${row.contract_keywords.join(", ")}`,
    ].filter(Boolean)
    return parts.join("\n")
  })

  return sections.join("\n\n").slice(0, GOV_PROFILE_RFP_CONTEXT_MAX_CHARS).trim()
}

/**
 * @param {Record<string, unknown>} body
 */
export function sanitizeGovProfilePatch(body) {
  /** @type {Record<string, unknown>} */
  const patch = {}

  if (typeof body.name === "string" && body.name.trim()) {
    patch.name = body.name.trim()
  }
  if (body.search_keywords != null) {
    patch.search_keywords = normalizeGovSearchKeywords(body.search_keywords)
  }
  if (body.naics_codes != null) {
    patch.naics_codes = parseTextList(body.naics_codes)
  }
  if (body.sbir_categories != null) {
    patch.sbir_categories = normalizeSbirCategories(body.sbir_categories)
  }
  if (body.corporate_overview != null) {
    patch.corporate_overview =
      typeof body.corporate_overview === "string" ? body.corporate_overview.trim() : null
  }

  return patch
}

export function buildRfpStoragePath(govProfileId, fileId) {
  return `${govProfileId}/${fileId}.pdf`
}

/** @param {unknown} pastRfps */
export function findPastRfpPdf(pastRfps, fileId) {
  return normalizePastRfpPdfs(pastRfps).find((row) => row.id === fileId) || null
}

/** Server-side writes for past RFP storage/metadata bypass storage RLS after auth checks. */
export function requireGovProfileServiceClient() {
  const service = createServiceClient()
  if (!service) {
    throw new Error("Server is missing Supabase service credentials.")
  }
  return service
}
