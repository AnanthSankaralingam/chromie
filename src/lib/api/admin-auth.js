import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ADMIN_SHARE_EXPIRES_AT } from "@/lib/constants"

/**
 * Check if the authenticated user is an admin (profiles.is_admin = true).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client (anon, not service)
 * @param {object} user - Auth user from supabase.auth.getUser()
 * @returns {Promise<boolean>}
 */
export async function isAdmin(supabase, user) {
  if (!user?.id) return false
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()
  if (error || !profile) return false
  return profile.is_admin === true
}

/**
 * When inserting a shared_link, use this as expires_at for admins; omit (DB default) for others.
 * @returns {Promise<string|undefined>} ISO string or undefined to use table default
 */
export async function getShareExpiresAtForInsert(supabase, user) {
  if (await isAdmin(supabase, user)) return ADMIN_SHARE_EXPIRES_AT
  return undefined
}

/**
 * Bumps any of the user's active shares that expire sooner than the admin sentinel to never-expire.
 * No-op if not admin. Safe to call from share list / create flows.
 */
export async function extendActiveAdminSharesIfNeeded(supabase, user) {
  if (!user?.id) return
  if (!(await isAdmin(supabase, user))) return
  const { error } = await supabase
    .from("shared_links")
    .update({ expires_at: ADMIN_SHARE_EXPIRES_AT })
    .eq("user_id", user.id)
    .eq("is_active", true)
    .lt("expires_at", ADMIN_SHARE_EXPIRES_AT)
  if (error) console.error("extendActiveAdminSharesIfNeeded:", error)
}

/**
 * Middleware-style wrapper that requires admin (profiles.is_admin).
 * Uses withAuth pattern but adds admin check.
 */
export function withAdminAuth(handler) {
  return async function routeHandler(request, context) {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await isAdmin(supabase, user)
    if (!admin) {
      return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 })
    }

    const params = context?.params ? (typeof context.params.then === "function" ? await context.params : context.params) : {}

    return handler({
      request,
      params,
      supabase,
      user,
    })
  }
}
