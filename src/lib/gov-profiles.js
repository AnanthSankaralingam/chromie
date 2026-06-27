import {
  defaultParamsForScenario,
  GOV_PROFILE_SCENARIO_IDS,
} from "@/lib/workflow-automations"

export const GOV_PROFILE_RFP_BUCKET = "gov-profile-rfps"
export const GOV_PROFILE_RFP_MAX_BYTES = 15 * 1024 * 1024

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

  return {
    ...baseWithoutOverviewFile,
    customer_name: govProfile.name,
    search_keywords: searchKeywords,
    icp_keywords: icpKeywords,
    naics_codes: govProfile.naics_codes ?? base.naics_codes,
    corporate_overview: String(govProfile.corporate_overview || "").trim(),
    corporate_overview_path: "",
    gov_profile_id: govProfile.id,
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
    }))
    .filter((row) => row.id && row.storage_path && row.filename)
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
