/** @typedef {{ id: string, label: string, description: string }} WorkflowScenarioMeta */

/** @type {WorkflowScenarioMeta[]} */
export const WORKFLOW_SCENARIOS = [
  {
    id: "morphworks_sam_gov",
    label: "SAM.gov opportunities",
    description: "Batch keyword searches on SAM.gov and email contract matches.",
  },
  {
    id: "zillow_listing_alert",
    label: "Zillow listing alert",
    description: "Search Zillow and email matching listings.",
  },
]

export const DEFAULT_WORKFLOW_SCENARIO_ID = "morphworks_sam_gov"

export const EMAIL_DELIVERY_SCENARIO_IDS = new Set([
  "zillow_listing_alert",
  "morphworks_sam_gov",
])

export const ZILLOW_DEFAULT_FILTERS = {
  city: "Suwanee, GA",
  min_price: 400000,
  max_price: 650000,
  min_beds: 3,
  property_type: "houses",
  listing_type: "for_sale",
}

export function defaultParamsForScenario(scenarioId, userEmail = "") {
  if (scenarioId === "morphworks_sam_gov") {
    return {
      id: "morphworks_sam_gov",
      sam_gov_base_url: "https://sam.gov",
      customer_name: "MorphWorks",
      search_keywords: [
        "IT modernization",
        "data integration",
        "data visualization",
        "asset management",
      ],
      recipient_email: userEmail,
      email_subject: "SAM.gov IT opportunities — MorphWorks ICP",
      corporate_overview_path: "scenarios/morphworks_sam_gov/corporate_overview.txt",
      max_email_opportunities: 3,
      min_opportunities: 3,
      max_keyword_searches: 4,
      max_pages_per_keyword: 3,
      require_signed_in: false,
    }
  }
  return {
    id: "zillow_listing_alert",
    zillow_base_url: "https://www.zillow.com",
    filters: { ...ZILLOW_DEFAULT_FILTERS },
    recipient_email: userEmail,
    email_subject: "Zillow listings matching your filters",
    min_addresses: 3,
  }
}

export function scenarioMeta(scenarioId) {
  return WORKFLOW_SCENARIOS.find((s) => s.id === scenarioId)
}
