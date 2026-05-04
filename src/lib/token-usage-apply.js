function nextMonth(dateLike) {
  const date = new Date(dateLike)
  date.setMonth(date.getMonth() + 1)
  return date
}

function currentCycleAnchor(anchorISO, now) {
  let anchor = new Date(anchorISO)
  let next = nextMonth(anchor)
  while (now >= next) {
    anchor = next
    next = nextMonth(anchor)
  }
  return {
    currentAnchorISO: anchor.toISOString(),
    nextResetISO: next.toISOString(),
    resetDue: now >= nextMonth(anchorISO),
  }
}

/**
 * Shared token_usage period math (must match POST /api/token-usage).
 * @param {object|null} existingUsage
 * @param {boolean} isFreeTier
 * @param {Date} [now]
 * @param {number} creditsThisRequest
 * @param {number} tokensThisRequest
 * @param {number} browserMinutesThisRequest
 * @param {number} extensionProxyTokensThisRequest
 * @param {string} cycleAnchorISO
 */
export function computeNextTokenUsageState(
  existingUsage,
  _isFreeTier,
  now,
  creditsThisRequest,
  tokensThisRequest,
  browserMinutesThisRequest,
  extensionProxyTokensThisRequest,
  cycleAnchorISO
) {
  const effectiveCycleAnchor =
    existingUsage?.monthly_reset || cycleAnchorISO || now.toISOString()
  const cycleState = currentCycleAnchor(effectiveCycleAnchor, now)
  const extensionProxyAnchorISO =
    existingUsage?.extension_proxy_monthly_reset || cycleState.currentAnchorISO
  const proxyCycleState = currentCycleAnchor(extensionProxyAnchorISO, now)
  const proxyIsResetDue = proxyCycleState.resetDue

  let newTotalCredits
  let newTotalTokens
  let newTotalBrowserMinutes
  let newExtensionProxyTokens
  let newMonthlyReset = existingUsage?.monthly_reset
  let newExtensionProxyMonthlyReset = existingUsage?.extension_proxy_monthly_reset

  if (!existingUsage) {
    newTotalCredits = creditsThisRequest
    newTotalTokens = tokensThisRequest
    newTotalBrowserMinutes = browserMinutesThisRequest
    newExtensionProxyTokens = extensionProxyTokensThisRequest
    newMonthlyReset = cycleState.currentAnchorISO
    newExtensionProxyMonthlyReset = proxyCycleState.currentAnchorISO
  } else if (cycleState.resetDue) {
    newTotalCredits = creditsThisRequest
    newTotalTokens = tokensThisRequest
    newTotalBrowserMinutes = browserMinutesThisRequest
    newExtensionProxyTokens = proxyIsResetDue
      ? extensionProxyTokensThisRequest
      : (existingUsage.extension_proxy_tokens || 0) +
        extensionProxyTokensThisRequest
    newMonthlyReset = cycleState.currentAnchorISO
    newExtensionProxyMonthlyReset = proxyIsResetDue
      ? proxyCycleState.currentAnchorISO
      : existingUsage.extension_proxy_monthly_reset
  } else {
    newTotalCredits = (existingUsage.total_credits || 0) + creditsThisRequest
    newTotalTokens = (existingUsage.total_tokens || 0) + tokensThisRequest
    newTotalBrowserMinutes =
      (existingUsage.browser_minutes || 0) + browserMinutesThisRequest
    newExtensionProxyTokens = proxyIsResetDue
      ? extensionProxyTokensThisRequest
      : (existingUsage.extension_proxy_tokens || 0) +
        extensionProxyTokensThisRequest
    newExtensionProxyMonthlyReset = proxyIsResetDue
      ? proxyCycleState.currentAnchorISO
      : existingUsage.extension_proxy_monthly_reset
  }

  return {
    newTotalCredits,
    newTotalTokens,
    newTotalBrowserMinutes,
    newExtensionProxyTokens,
    newMonthlyReset,
    newExtensionProxyMonthlyReset,
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {string} userId
 * @param {{
 *   creditsThisRequest?: number,
 *   tokensThisRequest?: number,
 *   browserMinutesThisRequest?: number,
 *   extensionProxyTokensThisRequest?: number,
 *   targetId?: string | null,
 * }} opts
 */
export async function applyTokenUsageDelta(db, userId, opts) {
  const {
    creditsThisRequest = 0,
    tokensThisRequest = 0,
    browserMinutesThisRequest = 0,
    extensionProxyTokensThisRequest = 0,
    targetId = null,
  } = opts

  const selectCols =
    "id, total_credits, total_tokens, monthly_reset, extension_proxy_monthly_reset, browser_minutes, extension_proxy_tokens"

  let existingUsage = null
  if (targetId) {
    const { data } = await db
      .from("token_usage")
      .select(selectCols)
      .eq("id", targetId)
      .eq("user_id", userId)
      .maybeSingle()
    existingUsage = data || null
  } else {
    const { data } = await db
      .from("token_usage")
      .select(selectCols)
      .eq("user_id", userId)
      .maybeSingle()
    existingUsage = data || null
  }

  const now = new Date()
  const { data: profile } = await db
    .from("profiles")
    .select("created_at")
    .eq("id", userId)
    .maybeSingle()
  const billingCycleAnchorISO = profile?.created_at || now.toISOString()

  const {
    newTotalCredits,
    newTotalTokens,
    newTotalBrowserMinutes,
    newExtensionProxyTokens,
    newMonthlyReset,
    newExtensionProxyMonthlyReset,
  } = computeNextTokenUsageState(
    existingUsage,
    false,
    now,
    creditsThisRequest,
    tokensThisRequest,
    browserMinutesThisRequest,
    extensionProxyTokensThisRequest,
    billingCycleAnchorISO
  )

  const payload = {
    total_credits: newTotalCredits,
    total_tokens: newTotalTokens,
    browser_minutes: newTotalBrowserMinutes,
    extension_proxy_tokens: newExtensionProxyTokens,
    monthly_reset: newMonthlyReset,
    extension_proxy_monthly_reset: newExtensionProxyMonthlyReset,
  }

  if (existingUsage?.id) {
    const { data: updatedRows, error: updateError } = await db
      .from("token_usage")
      .update(payload)
      .eq("id", existingUsage.id)
      .eq("user_id", userId)
      .select(
        "id, total_credits, total_tokens, browser_minutes, monthly_reset, extension_proxy_monthly_reset, extension_proxy_tokens"
      )

    if (updateError) {
      console.error("[token-usage-apply] update error:", updateError)
      return { ok: false, error: updateError }
    }
    const row = updatedRows?.[0]
    return {
      ok: true,
      id: row?.id || existingUsage.id,
      total_credits: row?.total_credits ?? newTotalCredits,
      total_tokens: row?.total_tokens ?? newTotalTokens,
      browser_minutes: row?.browser_minutes ?? newTotalBrowserMinutes,
      monthly_reset: row?.monthly_reset ?? newMonthlyReset,
      extension_proxy_monthly_reset:
        row?.extension_proxy_monthly_reset ?? newExtensionProxyMonthlyReset,
      extension_proxy_tokens:
        row?.extension_proxy_tokens ?? newExtensionProxyTokens,
    }
  }

  const { randomUUID } = await import("crypto")
  const newId = randomUUID()
  const { error: insertError } = await db.from("token_usage").insert({
    id: newId,
    user_id: userId,
    ...payload,
  })

  if (insertError) {
    console.error("[token-usage-apply] insert error:", insertError)
    return { ok: false, error: insertError }
  }
  return {
    ok: true,
    id: newId,
    total_credits: newTotalCredits,
    total_tokens: newTotalTokens,
    browser_minutes: newTotalBrowserMinutes,
    monthly_reset: newMonthlyReset,
    extension_proxy_monthly_reset: newExtensionProxyMonthlyReset,
    extension_proxy_tokens: newExtensionProxyTokens,
  }
}
