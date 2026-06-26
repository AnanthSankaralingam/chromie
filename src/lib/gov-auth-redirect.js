/** Paths that should resolve to the user's gov home instead of rendering legacy surfaces. */
export const LEGACY_HOME_PATHS = new Set(["/dashboard", "/automations"])

/** Explicit post-auth destinations that should be honored as-is. */
export function isExplicitPostAuthPath(pathname) {
  return (
    pathname === "/" ||
    pathname === "/gov" ||
    pathname === "/gov/dashboard" ||
    pathname === "/gov/onboarding" ||
    pathname === "/profile"
  )
}

/**
 * @param {string} rawDestination
 * @returns {"explicit" | "legacy_home" | "invalid"}
 */
export function classifyPostAuthDestination(rawDestination) {
  const raw = String(rawDestination || "").trim()
  if (!raw.startsWith("/")) return "invalid"

  try {
    const destUrl = new URL(raw, "https://chromie.dev")
    if (isExplicitPostAuthPath(destUrl.pathname)) return "explicit"
    if (LEGACY_HOME_PATHS.has(destUrl.pathname)) return "legacy_home"
  } catch {
    return "invalid"
  }

  return "invalid"
}

/**
 * @param {string} rawDestination
 * @returns {string | null} pathname + search for explicit destinations
 */
export function explicitPostAuthDestination(rawDestination) {
  const raw = String(rawDestination || "").trim()
  if (!raw.startsWith("/")) return null

  try {
    const destUrl = new URL(raw, "https://chromie.dev")
    if (!isExplicitPostAuthPath(destUrl.pathname)) return null
    return `${destUrl.pathname}${destUrl.search}`
  } catch {
    return null
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 */
export async function resolveGovHomePath(supabase, userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("gov_profile_id")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    console.error("[gov-auth-redirect] profile lookup failed", error.message)
    return "/gov/onboarding"
  }

  return data?.gov_profile_id ? "/gov/dashboard" : "/gov/onboarding"
}
