import { normalizeEmail } from "@/lib/gov-domain"

/** Comma-separated allowlist from GOV_ONBOARDING_ADMIN_EMAILS (server-only). */
export function getGovOnboardingAdminEmails() {
  return new Set(
    String(process.env.GOV_ONBOARDING_ADMIN_EMAILS || "")
      .split(",")
      .map((entry) => normalizeEmail(entry))
      .filter(Boolean),
  )
}

export function isGovOnboardingAdmin(email) {
  const normalized = normalizeEmail(email)
  if (!normalized) return false
  return getGovOnboardingAdminEmails().has(normalized)
}
