/** Page routes that remain publicly reachable (everything else redirects to `/`). */
export const ALLOWED_PAGE_PATHS = new Set([
  "/",
  "/use-cases",
  "/dashboard",
  "/automations",
  "/landing",
])

/** Auth flows required for dashboard sign-in and the Chrome extension. */
export const ALLOWED_PAGE_PREFIXES = ["/auth/callback", "/auth/extension/"]

export function isAllowedPagePath(pathname) {
  if (ALLOWED_PAGE_PATHS.has(pathname)) return true
  return ALLOWED_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  )
}
