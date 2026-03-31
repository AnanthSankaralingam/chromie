import { isShareExpired, securityLog } from "@/lib/validation"
import { isAdmin } from "@/lib/api/admin-auth"

/**
 * Load a share row by token (active only). Does not filter by expiry.
 */
export async function fetchActiveShareByToken(supabase, token, select) {
  const { data, error } = await supabase
    .from("shared_links")
    .select(select)
    .eq("share_token", token)
    .eq("is_active", true)
    .maybeSingle()
  if (error || !data) return null
  return data
}

/**
 * Enforce expiry unless the viewer is an authenticated admin (profiles.is_admin).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} token
 * @param {string} select - columns for shared_links select()
 * @param {import('@supabase/auth-js').User | null} user - from getUser(); null for anonymous
 * @returns {Promise<{ ok: true, sharedProject: object } | { ok: false, status: number, message: string }>}
 */
export async function resolveShareAccess(supabase, token, select, user) {
  const sharedProject = await fetchActiveShareByToken(supabase, token, select)
  if (!sharedProject) {
    return { ok: false, status: 404, message: "Share link not found or expired" }
  }

  if (!isShareExpired(sharedProject.expires_at)) {
    return { ok: true, sharedProject }
  }

  if (user && (await isAdmin(supabase, user))) {
    securityLog("info", "Admin viewing expired share link", {
      token: token?.substring(0, 8) + "...",
      userId: user.id,
      expiresAt: sharedProject.expires_at,
    })
    return { ok: true, sharedProject }
  }

  return { ok: false, status: 410, message: "Share link has expired" }
}
