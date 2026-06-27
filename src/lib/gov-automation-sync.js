import { createServiceClient } from "@/lib/supabase/service"
import { GOV_PROFILE_SCENARIO_IDS } from "@/lib/workflow-automations"
import { mergeGovProfileIntoScenarioParams } from "@/lib/gov-profiles"

const PROFILE_PARAM_KEYS = [
  "customer_name",
  "search_keywords",
  "icp_keywords",
  "naics_codes",
  "corporate_overview",
  "corporate_overview_path",
  "gov_profile_id",
  "past_rfp_context",
]

function pickProfileParams(params) {
  const out = {}
  for (const key of PROFILE_PARAM_KEYS) {
    out[key] = params[key]
  }
  return out
}

export function syncedGovAutomationParams(existingParams, govProfile, scenarioId, userEmail = "") {
  const existing = existingParams && typeof existingParams === "object" ? existingParams : {}
  if (!govProfile || !GOV_PROFILE_SCENARIO_IDS.has(scenarioId)) {
    return existing
  }
  const merged = mergeGovProfileIntoScenarioParams(govProfile, scenarioId, userEmail)
  return {
    ...existing,
    ...pickProfileParams(merged),
    recipient_email: String(existing.recipient_email || merged.recipient_email || userEmail || "").trim(),
    email_subject: existing.email_subject || merged.email_subject,
  }
}

export async function refreshGovAutomationParamsForProfile({ supabase, govProfile, userId = null }) {
  if (!govProfile?.id) return { updated: 0 }

  const service = createServiceClient()
  const client = service || supabase
  let profileQuery = client
    .from("profiles")
    .select("id, email")
    .eq("gov_profile_id", govProfile.id)

  if (!service && userId) {
    profileQuery = profileQuery.eq("id", userId)
  }

  const { data: profiles, error: profileError } = await profileQuery
  if (profileError) {
    throw new Error(profileError.message)
  }

  const profileRows = profiles || []
  const userIds = profileRows.map((row) => row.id).filter(Boolean)
  if (!userIds.length) return { updated: 0 }

  const emailByUserId = new Map(profileRows.map((row) => [row.id, row.email || ""]))
  const { data: automations, error: automationError } = await client
    .from("automations")
    .select("id, user_id, scenario_id, params")
    .in("user_id", userIds)
    .in("scenario_id", [...GOV_PROFILE_SCENARIO_IDS])

  if (automationError) {
    throw new Error(automationError.message)
  }

  const updates = await Promise.all(
    (automations || []).map((automation) => {
      const params = syncedGovAutomationParams(
        automation.params,
        govProfile,
        automation.scenario_id,
        emailByUserId.get(automation.user_id) || "",
      )
      return client
        .from("automations")
        .update({ params, updated_at: new Date().toISOString() })
        .eq("id", automation.id)
    }),
  )

  const failed = updates.find((result) => result.error)
  if (failed?.error) {
    throw new Error(failed.error.message)
  }

  return { updated: updates.length }
}
