/** @typedef {{ id: string, label: string, description: string }} WorkflowScenarioMeta */

/** @type {WorkflowScenarioMeta[]} */
export const WORKFLOW_SCENARIOS = [
  {
    id: "morphworks_sam_gov",
    label: "SAM.gov opportunity search",
    description: "Batch keyword searches on SAM.gov and email contract matches.",
  },
  {
    id: "morphworks_sbir_tech_marketplace",
    label: "SBIR Tech Marketplace search",
    description: "Batch keyword searches on the SBIR Tech Marketplace and email contract matches.",
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
  "morphworks_sbir_tech_marketplace",
])

export const GOV_PROFILE_SCENARIO_IDS = new Set([
  "morphworks_sam_gov",
  "morphworks_sbir_tech_marketplace",
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
  if (GOV_PROFILE_SCENARIO_IDS.has(scenarioId)) {
    const isSbirMarketplace = scenarioId === "morphworks_sbir_tech_marketplace"
    return {
      id: scenarioId,
      sam_gov_base_url: "https://sam.gov",
      ...(isSbirMarketplace
        ? {
            sbir_tech_marketplace_url:
              "https://thesbirtechmarketplace.com/?view=marketplace",
            sbir_tech_marketplace_status: ["Active"],
            sbir_tech_marketplace_listing_types: ["Contract"],
          }
        : {}),
      customer_name: "MorphWorks",
      search_keywords: [
        "IT modernization",
        "data integration",
        "data visualization",
        "asset management",
      ],
      recipient_email: userEmail,
      email_subject: isSbirMarketplace
        ? "SBIR Tech Marketplace IT opportunities — MorphWorks ICP"
        : "SAM.gov IT opportunities — MorphWorks ICP",
      corporate_overview_path: "scenarios/morphworks_sam_gov/corporate_overview.txt",
      max_email_opportunities: 3,
      min_opportunities: 3,
      max_keyword_searches: 4,
      ...(isSbirMarketplace ? {} : { max_pages_per_keyword: 3 }),
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
