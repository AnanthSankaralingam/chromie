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

/**
 * Consumer / free email providers whose domain is shared by unrelated people,
 * so it must NEVER be treated as a company identifier.
 */
export const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.co.in",
  "ymail.com",
  "rocketmail.com",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "outlook.co.uk",
  "live.com",
  "msn.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "yandex.ru",
  "tutanota.com",
  "fastmail.com",
  "hey.com",
  "qq.com",
  "163.com",
  "126.com",
  "sina.com",
  "naver.com",
  "hanmail.net",
  "daum.net",
  "comcast.net",
  "verizon.net",
  "att.net",
  "sbcglobal.net",
  "cox.net",
  "bellsouth.net",
  "charter.net",
  "earthlink.net",
  "juno.com",
])

/** True when the domain is a shared consumer/free email provider. */
export function isPublicEmailDomain(domain) {
  return PUBLIC_EMAIL_DOMAINS.has(normalizeDomain(domain))
}

/**
 * Company identifier derived from a work email — the normalized domain, but only
 * when it's a genuine corporate domain. Returns null for consumer/free providers
 * (e.g. gmail.com) or invalid domains, so automations from personal emails stay
 * private to their creator instead of leaking to unrelated people.
 */
export function companyDomainFromEmail(email) {
  const domain = domainFromEmail(email)
  if (!domain || !isValidDomain(domain) || isPublicEmailDomain(domain)) return null
  return domain
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
