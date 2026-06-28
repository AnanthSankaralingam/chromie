/** @typedef {{ id: string, label: string, description: string }} WorkflowScenarioMeta */

export const GOV_CONTRACT_SAM_GOV_SCENARIO_ID = "gov_contract_sam_gov"
export const GOV_CONTRACT_SBIR_TECH_MARKETPLACE_SCENARIO_ID =
  "gov_contract_sbir_tech_marketplace"

const LEGACY_GOV_CONTRACT_SAM_GOV_SCENARIO_ID = "morphworks_sam_gov"
const LEGACY_GOV_CONTRACT_SBIR_TECH_MARKETPLACE_SCENARIO_ID =
  "morphworks_sbir_tech_marketplace"

export const GOV_SCENARIO_ID_ALIASES = new Map([
  [LEGACY_GOV_CONTRACT_SAM_GOV_SCENARIO_ID, GOV_CONTRACT_SAM_GOV_SCENARIO_ID],
  [
    LEGACY_GOV_CONTRACT_SBIR_TECH_MARKETPLACE_SCENARIO_ID,
    GOV_CONTRACT_SBIR_TECH_MARKETPLACE_SCENARIO_ID,
  ],
])

export function canonicalGovScenarioId(scenarioId) {
  return GOV_SCENARIO_ID_ALIASES.get(scenarioId) || scenarioId
}

export function govScenarioIdAliases(scenarioId) {
  const canonical = canonicalGovScenarioId(scenarioId)
  const aliases = [canonical]
  for (const [legacy, current] of GOV_SCENARIO_ID_ALIASES) {
    if (current === canonical) aliases.push(legacy)
  }
  return aliases
}

export function isGovSbirScenarioId(scenarioId) {
  return canonicalGovScenarioId(scenarioId) === GOV_CONTRACT_SBIR_TECH_MARKETPLACE_SCENARIO_ID
}

/** @type {WorkflowScenarioMeta[]} */
export const GOV_WORKFLOW_SCENARIOS = [
  {
    id: GOV_CONTRACT_SAM_GOV_SCENARIO_ID,
    label: "SAM.gov opportunity search",
    description: "Batch keyword searches on SAM.gov and email contract matches.",
  },
  {
    id: GOV_CONTRACT_SBIR_TECH_MARKETPLACE_SCENARIO_ID,
    label: "SBIR Tech Marketplace search",
    description: "Batch keyword searches on the SBIR Tech Marketplace and email contract matches.",
  },
]

export const LEGACY_GOV_SAM_SCENARIO_ID = LEGACY_GOV_CONTRACT_SAM_GOV_SCENARIO_ID
export const LEGACY_GOV_SBIR_SCENARIO_ID = LEGACY_GOV_CONTRACT_SBIR_TECH_MARKETPLACE_SCENARIO_ID
export const GOV_SAM_SCENARIO_ID = GOV_CONTRACT_SAM_GOV_SCENARIO_ID
export const GOV_SBIR_SCENARIO_ID = GOV_CONTRACT_SBIR_TECH_MARKETPLACE_SCENARIO_ID
export const GOV_SAM_SCENARIO_IDS = [LEGACY_GOV_SAM_SCENARIO_ID, GOV_SAM_SCENARIO_ID]
export const GOV_SBIR_SCENARIO_IDS = [LEGACY_GOV_SBIR_SCENARIO_ID, GOV_SBIR_SCENARIO_ID]
export const GOV_MATCH_SCENARIO_IDS = [
  ...GOV_WORKFLOW_SCENARIOS.map((scenario) => scenario.id),
  ...GOV_SCENARIO_ID_ALIASES.keys(),
]
export const PRIMARY_GOV_SCENARIO_ID = GOV_CONTRACT_SAM_GOV_SCENARIO_ID

/** @type {WorkflowScenarioMeta[]} */
export const WORKFLOW_SCENARIOS = [
  ...GOV_WORKFLOW_SCENARIOS,
  {
    id: "zillow_listing_alert",
    label: "Zillow listing alert",
    description: "Search Zillow and email matching listings.",
  },
]

export const DEFAULT_WORKFLOW_SCENARIO_ID = PRIMARY_GOV_SCENARIO_ID

export const EMAIL_DELIVERY_SCENARIO_IDS = new Set([
  "zillow_listing_alert",
  ...GOV_MATCH_SCENARIO_IDS,
])

export const GOV_PROFILE_SCENARIO_IDS = new Set(GOV_MATCH_SCENARIO_IDS)

export const ZILLOW_DEFAULT_FILTERS = {
  city: "Suwanee, GA",
  min_price: 400000,
  max_price: 650000,
  min_beds: 3,
  property_type: "houses",
  listing_type: "for_sale",
}

export function defaultParamsForScenario(scenarioId, userEmail = "") {
  const canonicalScenarioId = canonicalGovScenarioId(scenarioId)
  if (GOV_PROFILE_SCENARIO_IDS.has(canonicalScenarioId)) {
    const isSbirMarketplace = isGovSbirScenarioId(canonicalScenarioId)
    return {
      id: canonicalScenarioId,
      sam_gov_base_url: "https://sam.gov",
      ...(isSbirMarketplace
        ? {
            sbir_tech_marketplace_url:
              "https://thesbirtechmarketplace.com/?view=marketplace",
            sbir_tech_marketplace_status: ["Active"],
            sbir_tech_marketplace_listing_types: ["Contract"],
            sbir_tech_marketplace_categories: ["Software", "Cybersecurity"],
          }
        : {}),
      customer_name: "",
      search_keywords: [
        "IT modernization",
        "data integration",
        "data visualization",
        "asset management",
      ],
      recipient_email: userEmail,
      email_subject: isSbirMarketplace
        ? "SBIR Tech Marketplace opportunities — ICP match brief"
        : "SAM.gov opportunities — ICP match brief",
      corporate_overview_path: "scenarios/gov_contract_sam_gov/corporate.md",
      max_email_opportunities: 5,
      min_opportunities: 0,
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
