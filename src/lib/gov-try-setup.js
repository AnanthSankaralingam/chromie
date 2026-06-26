import { createServiceClient } from "@/lib/supabase/service"
import { defaultParamsForScenario } from "@/lib/workflow-automations"

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase()
}

function getProvider(user) {
  return user?.app_metadata?.provider || user?.identities?.[0]?.provider || "email"
}

function getDisplayName(user, fallbackEmail) {
  return (
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    fallbackEmail.split("@")[0] ||
    "My company"
  )
}

function tryCompanyDomain(userId) {
  return `try-${userId}.chromie.dev`
}

function isEmailVerified(user) {
  return Boolean(user?.email && (user.email_confirmed_at || user.confirmed_at))
}

/**
 * Create a solo gov profile for try-it-out users and link profiles.gov_profile_id.
 * Idempotent when the user is already linked.
 *
 * @param {import('@supabase/supabase-js').User} user
 */
export async function provisionTryGovProfile(user) {
  if (!isEmailVerified(user)) {
    return { error: "Please verify your email before trying Chromie.", status: 400 }
  }

  const service = createServiceClient()
  if (!service) {
    return { error: "Server is missing Supabase service credentials.", status: 500 }
  }

  const userEmail = normalizeEmail(user.email)
  const { data: existingProfileRow, error: profileLookupError } = await service
    .from("profiles")
    .select("gov_profile_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileLookupError) {
    return { error: profileLookupError.message, status: 500 }
  }

  if (existingProfileRow?.gov_profile_id) {
    const { data: linkedGovProfile, error: linkedError } = await service
      .from("gov_profiles")
      .select("*")
      .eq("id", existingProfileRow.gov_profile_id)
      .single()

    if (linkedError) {
      return { error: linkedError.message, status: 500 }
    }

    return { gov_profile: linkedGovProfile, already_linked: true }
  }

  const defaults = defaultParamsForScenario("morphworks_sam_gov", userEmail)
  const companyName = getDisplayName(user, userEmail)
  const companyDomain = tryCompanyDomain(user.id)

  const { data: inserted, error: insertError } = await service
    .from("gov_profiles")
    .insert({
      name: companyName,
      company_domain: companyDomain,
      search_keywords: defaults.search_keywords ?? [],
      naics_codes: [],
      corporate_overview: null,
    })
    .select()
    .single()

  if (insertError) {
    return { error: insertError.message, status: 500 }
  }

  const { error: upsertError } = await service.from("profiles").upsert(
    {
      id: user.id,
      name: getDisplayName(user, userEmail),
      email: userEmail,
      provider: getProvider(user),
      gov_profile_id: inserted.id,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  )

  if (upsertError) {
    return { error: upsertError.message, status: 500 }
  }

  console.log("[gov-try] provisioned", userEmail, inserted.id)
  return { gov_profile: inserted, created: true }
}
