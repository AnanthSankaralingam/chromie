import { createBrowserbaseContext } from "@/lib/browserbase"
import { companyDomainFromEmail, normalizeEmail } from "@/lib/gov/gov-domain"

/** Scenario id for automations captured via the self-serve /new recorder. */
export const NEW_AUTOMATION_SCENARIO_ID = "custom_recorded_automation"

function displayNameForUser(user) {
  return user?.user_metadata?.name || user?.email?.split("@")[0] || "Chromie user"
}

function providerForUser(user) {
  return user?.app_metadata?.provider || user?.identities?.[0]?.provider || "email"
}

/**
 * The company's frozen recorder context: the earliest teammate on the same
 * corporate work-email domain who already has one. Returns null if the company
 * has no context yet (first teammate) or for consumer/free email domains.
 *
 * Requires the service client — corporate teammates live in other users' rows,
 * which per-user RLS on `profiles` would hide.
 */
async function findCompanyContextId(service, companyId) {
  if (!companyId) return null
  const { data, error } = await service
    .from("profiles")
    .select("browserbase_context_id, created_at")
    .ilike("email", `%@${companyId}`)
    .not("browserbase_context_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  const contextId = String(data?.browserbase_context_id || "").trim()
  return contextId || null
}

/**
 * Resolve-and-FREEZE the identity-level Browserbase context for the /new recorder,
 * stored on `profiles.browserbase_context_id`:
 *   - already set on this profile → return it (never changes),
 *   - corporate email → inherit the company's earliest teammate context, else create one,
 *   - consumer/free email → the user's own new context.
 * The chosen id is persisted on the profile so every future recording/run reuses it.
 *
 * Uses the ONE helper `createBrowserbaseContext` — no extra context store. eviivo/gov
 * intentionally keep their dedicated per-scenario contexts and do NOT use this.
 */
export async function ensureProfileBrowserbaseContextId(service, user) {
  const companyId = companyDomainFromEmail(user?.email)
  const email = normalizeEmail(user?.email)

  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("id, browserbase_context_id")
    .eq("id", user.id)
    .maybeSingle()
  if (profileError) throw new Error(profileError.message)

  const existing = String(profile?.browserbase_context_id || "").trim()
  if (existing) {
    return { contextId: existing, companyId, created: false }
  }

  // First time for this user: inherit the company's context or mint a fresh one,
  // then freeze it on the profile so it's fixed for the account from here on.
  const contextId = (companyId && (await findCompanyContextId(service, companyId))) || (await createBrowserbaseContext())

  if (profile) {
    const { error } = await service
      .from("profiles")
      .update({ browserbase_context_id: contextId, last_used_at: new Date().toISOString() })
      .eq("id", user.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await service.from("profiles").insert({
      id: user.id,
      email,
      name: displayNameForUser(user),
      provider: providerForUser(user),
      browserbase_context_id: contextId,
      last_used_at: new Date().toISOString(),
    })
    if (error) throw new Error(error.message)
  }

  return { contextId, companyId, created: true }
}
