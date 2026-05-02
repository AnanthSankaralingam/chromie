/**
 * Shared token_usage period math (must match POST /api/token-usage).
 * @param {object|null} existingUsage
 * @param {boolean} isFreeTier
 * @param {Date} [now]
 * @param {number} creditsThisRequest
 * @param {number} tokensThisRequest
 * @param {number} browserMinutesThisRequest
 * @param {number} extensionProxyTokensThisRequest
 */
export function computeNextTokenUsageState(
  existingUsage,
  isFreeTier,
  now,
  creditsThisRequest,
  tokensThisRequest,
  browserMinutesThisRequest,
  extensionProxyTokensThisRequest
) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  let effectiveMonthlyReset = existingUsage?.monthly_reset
  if (!effectiveMonthlyReset) {
    effectiveMonthlyReset = isFreeTier
      ? startOfToday.toISOString()
      : new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  }

  const monthlyResetDate = effectiveMonthlyReset
    ? new Date(effectiveMonthlyReset)
    : null
  let resetDatePlusOneMonth = null
  if (monthlyResetDate && !isFreeTier) {
    resetDatePlusOneMonth = new Date(monthlyResetDate)
    resetDatePlusOneMonth.setMonth(resetDatePlusOneMonth.getMonth() + 1)
  }

  const isResetDue = isFreeTier
    ? monthlyResetDate
      ? monthlyResetDate < startOfToday
      : false
    : monthlyResetDate
      ? now >= resetDatePlusOneMonth
      : false

  const newResetAnchor = isFreeTier
    ? startOfToday.toISOString()
    : new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  let newTotalCredits
  let newTotalTokens
  let newTotalBrowserMinutes
  let newExtensionProxyTokens
  let newMonthlyReset = existingUsage?.monthly_reset

  if (!existingUsage) {
    newTotalCredits = creditsThisRequest
    newTotalTokens = tokensThisRequest
    newTotalBrowserMinutes = browserMinutesThisRequest
    newExtensionProxyTokens = extensionProxyTokensThisRequest
    newMonthlyReset = newResetAnchor
  } else if (!existingUsage.monthly_reset) {
    newTotalCredits = (existingUsage.total_credits || 0) + creditsThisRequest
    newTotalTokens = (existingUsage.total_tokens || 0) + tokensThisRequest
    newTotalBrowserMinutes =
      (existingUsage.browser_minutes || 0) + browserMinutesThisRequest
    newExtensionProxyTokens =
      (existingUsage.extension_proxy_tokens || 0) +
      extensionProxyTokensThisRequest
    newMonthlyReset = newResetAnchor
  } else if (isResetDue) {
    newTotalCredits = creditsThisRequest
    newTotalTokens = tokensThisRequest
    newTotalBrowserMinutes = browserMinutesThisRequest
    newExtensionProxyTokens = extensionProxyTokensThisRequest
    newMonthlyReset = newResetAnchor
  } else {
    newTotalCredits = (existingUsage.total_credits || 0) + creditsThisRequest
    newTotalTokens = (existingUsage.total_tokens || 0) + tokensThisRequest
    newTotalBrowserMinutes =
      (existingUsage.browser_minutes || 0) + browserMinutesThisRequest
    newExtensionProxyTokens =
      (existingUsage.extension_proxy_tokens || 0) +
      extensionProxyTokensThisRequest
  }

  return {
    newTotalCredits,
    newTotalTokens,
    newTotalBrowserMinutes,
    newExtensionProxyTokens,
    newMonthlyReset,
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
 *   modelUsed?: string,
 *   targetId?: string | null,
 * }} opts
 */
export async function applyTokenUsageDelta(db, userId, opts) {
  const {
    creditsThisRequest = 0,
    tokensThisRequest = 0,
    browserMinutesThisRequest = 0,
    extensionProxyTokensThisRequest = 0,
    modelUsed = "unknown",
    targetId = null,
  } = opts

  const selectCols =
    "id, total_credits, total_tokens, monthly_reset, model, browser_minutes, extension_proxy_tokens"

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
  const { data: activePurchases } = await db
    .from("purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
  const isFreeTier = !activePurchases || activePurchases.length === 0

  const {
    newTotalCredits,
    newTotalTokens,
    newTotalBrowserMinutes,
    newExtensionProxyTokens,
    newMonthlyReset,
  } = computeNextTokenUsageState(
    existingUsage,
    isFreeTier,
    now,
    creditsThisRequest,
    tokensThisRequest,
    browserMinutesThisRequest,
    extensionProxyTokensThisRequest
  )

  const payload = {
    total_credits: newTotalCredits,
    total_tokens: newTotalTokens,
    browser_minutes: newTotalBrowserMinutes,
    extension_proxy_tokens: newExtensionProxyTokens,
    monthly_reset: newMonthlyReset,
    model: modelUsed,
  }

  if (existingUsage?.id) {
    const { data: updatedRows, error: updateError } = await db
      .from("token_usage")
      .update(payload)
      .eq("id", existingUsage.id)
      .eq("user_id", userId)
      .select(
        "id, total_credits, total_tokens, browser_minutes, monthly_reset, extension_proxy_tokens"
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
    extension_proxy_tokens: newExtensionProxyTokens,
  }
}
