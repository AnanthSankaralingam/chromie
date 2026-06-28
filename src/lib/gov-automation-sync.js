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
  "sbir_tech_marketplace_categories",
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

export async function refreshGovAutomationParamsForProfile({ supabase, govProfile }) {
  if (!govProfile?.id) return { updated: 0 }

  const service = createServiceClient()
  const client = service || supabase
  const { data: automations, error: automationError } = await client
    .from("automations")
    .select("id, scenario_id, params")
    .eq("gov_profile_id", govProfile.id)
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
        "",
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
