/** Page routes that remain publicly reachable (everything else redirects to `/`). */
export const ALLOWED_PAGE_PATHS = new Set([
  "/",
  "/automations",
  "/blog",
  "/book-demo",
  "/dashboard",
  "/gov",
  "/gov/onboarding",
  "/gov/share",
  "/hospitality",
  "/landing",
  "/profile",
  "/privacy",
  "/privacy-policy",
  "/unsubscribe",
  "/use-cases",
  "/waitlist",
])

/** Auth flow and dynamic public pages that must remain reachable. */
export const ALLOWED_PAGE_PREFIXES = ["/auth/callback", "/blog/", "/gov/share/"]

export function isAllowedPagePath(pathname) {
  if (ALLOWED_PAGE_PATHS.has(pathname)) return true
  return ALLOWED_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  )
}
