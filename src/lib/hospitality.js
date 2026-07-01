import { resolveScheduleFieldsFromBody } from "@/lib/workflow/automation-schedule-sync"
import { createBrowserbaseContext } from "@/lib/browserbase"
import { EVIIVO_DATA_PULL_SCENARIO_ID, defaultParamsForScenario } from "@/lib/workflow/workflow-automations"

export const DEFAULT_HOSPITALITY_TIMEZONE = "UTC"

function displayNameForUser(user) {
  return (
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Hospitality user"
  )
}

function providerForUser(user) {
  return user?.app_metadata?.provider || user?.identities?.[0]?.provider || "email"
}

export function normalizeHospitalityTimezone(value) {
  const timezone = String(value || "").trim()
  if (!timezone) return DEFAULT_HOSPITALITY_TIMEZONE
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return timezone
  } catch {
    return DEFAULT_HOSPITALITY_TIMEZONE
  }
}

export function sanitizeHospitalityProfileInput(body = {}) {
  const name = String(body.name || body.property_name || "Hospitality profile").trim()
  const propertyName = String(body.property_name || name).trim()
  const eviivoBaseUrl = String(body.eviivo_base_url || "https://on.eviivo.com").trim()
  return {
    name,
    property_name: propertyName,
    eviivo_base_url: eviivoBaseUrl || "https://on.eviivo.com",
    timezone: normalizeHospitalityTimezone(body.timezone),
  }
}

export async function getHospitalityProfileForUser(supabase, userId) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("hosp_profile_id")
    .eq("id", userId)
    .maybeSingle()

  if (profileError) throw new Error(profileError.message)
  if (!profile?.hosp_profile_id) return null

  const { data, error } = await supabase
    .from("hospitality_profiles")
    .select("*")
    .eq("id", profile.hosp_profile_id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function linkUserToHospitalityProfile(service, user, hospitalityProfile) {
  const email = String(user.email || "").trim().toLowerCase()
  const { error } = await service
    .from("profiles")
    .upsert(
      {
        id: user.id,
        name: displayNameForUser(user),
        email,
        provider: providerForUser(user),
        hosp_profile_id: hospitalityProfile.id,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )

  if (error) throw new Error(error.message)
}

export async function upsertHospitalityProfileForUser({ service, user, input }) {
  const existing = await getHospitalityProfileForUser(service, user.id)
  if (existing) {
    const { data, error } = await service
      .from("hospitality_profiles")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    await linkUserToHospitalityProfile(service, user, data)
    return data
  }

  const { data, error } = await service
    .from("hospitality_profiles")
    .insert({
      ...input,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  await linkUserToHospitalityProfile(service, user, data)
  return data
}

export function hospitalityParamsForProfile(hospitalityProfile) {
  return {
    ...defaultParamsForScenario(EVIIVO_DATA_PULL_SCENARIO_ID),
    hosp_profile_id: hospitalityProfile.id,
    property_name: hospitalityProfile.property_name || hospitalityProfile.name || "",
    eviivo_base_url: hospitalityProfile.eviivo_base_url || "https://on.eviivo.com",
    timezone: hospitalityProfile.timezone || DEFAULT_HOSPITALITY_TIMEZONE,
  }
}

async function ensureBrowserbaseContextId(existingAutomation) {
  const existingContextId = String(existingAutomation?.browserbase_context_id || "").trim()
  if (existingContextId) return existingContextId
  return createBrowserbaseContext()
}

export async function ensureHospitalityAutomation({ service, user, hospitalityProfile }) {
  const { data: existing, error: existingError } = await service
    .from("automations")
    .select("*")
    .eq("user_id", user.id)
    .eq("scenario_id", EVIIVO_DATA_PULL_SCENARIO_ID)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)

  const params = hospitalityParamsForProfile(hospitalityProfile)
  const browserbaseContextId = await ensureBrowserbaseContextId(existing)
  if (existing) {
    const { data, error } = await service
      .from("automations")
      .update({
        name: "eviivo hospitality data pull",
        params,
        browserbase_context_id: browserbaseContextId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  const scheduleFields = resolveScheduleFieldsFromBody({
    schedule_enabled: false,
    schedule_kind: "on_demand",
    schedule_timezone: hospitalityProfile.timezone || DEFAULT_HOSPITALITY_TIMEZONE,
  })
  const { data, error } = await service
    .from("automations")
    .insert({
      user_id: user.id,
      name: "eviivo hospitality data pull",
      scenario_id: EVIIVO_DATA_PULL_SCENARIO_ID,
      params,
      browserbase_context_id: browserbaseContextId,
      env_overrides: {},
      enabled: true,
      ...scheduleFields,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function loadHospitalityRuns(service, hospProfileId, limit = 20) {
  const { data, error } = await service
    .from("hospitality_runs")
    .select("*")
    .eq("hosp_profile_id", hospProfileId)
    .order("pulled_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data || []
}
