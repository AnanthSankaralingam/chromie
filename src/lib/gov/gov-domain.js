export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase()
}

export function normalizeDomain(value) {
  const raw = String(value || "").trim().toLowerCase()
  if (!raw) return ""

  try {
    const withProtocol = raw.includes("://") ? raw : `https://${raw}`
    const hostname = new URL(withProtocol).hostname
    return hostname.replace(/^www\./, "")
  } catch {
    return raw
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split(":")[0]
      .trim()
  }
}

export function domainFromEmail(email) {
  const [, domain = ""] = normalizeEmail(email).split("@")
  return normalizeDomain(domain)
}

export function isValidDomain(domain) {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(domain)
}

export function companyNameFromDomain(domain) {
  return normalizeDomain(domain)
    .split(".")[0]
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function emailDomainMatchesInvite(userEmail, inviteDomain) {
  const emailDomain = domainFromEmail(userEmail)
  const normalizedInvite = normalizeDomain(inviteDomain)
  if (!emailDomain || !normalizedInvite) return false
  return emailDomain === normalizedInvite
}
