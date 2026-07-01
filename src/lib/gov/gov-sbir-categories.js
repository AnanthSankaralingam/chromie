export const SBIR_TECH_MARKETPLACE_CATEGORIES = [
  "AI",
  "Autonomous Systems",
  "Biomedical Technology",
  "Cybersecurity",
  "Hardware",
  "Software",
  "Space Technology",
  "Training",
  "Wearables",
  "Other",
]

const SBIR_CATEGORY_BY_KEY = new Map(
  SBIR_TECH_MARKETPLACE_CATEGORIES.map((category) => [category.toLowerCase(), category]),
)

/** @param {unknown} value */
export function normalizeSbirCategories(value) {
  if (!Array.isArray(value)) return []

  const seen = new Set()
  const normalized = []
  for (const raw of value) {
    const category = SBIR_CATEGORY_BY_KEY.get(String(raw || "").trim().toLowerCase())
    if (!category || seen.has(category)) continue

    seen.add(category)
    normalized.push(category)
  }

  return normalized
}
