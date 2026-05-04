import {
  PLAN_LIMITS,
  DEFAULT_PLAN,
  SUBSCRIPTION_PLANS,
  BILLING_SUBSCRIBE,
} from '@/lib/constants'
import { subscriptionPurchaseEntitled } from '@/lib/subscription-entitlement'

function getCycleInfo(anchorISO, now) {
  let anchorDate = new Date(anchorISO)
  const initialNextResetDate = new Date(anchorDate)
  initialNextResetDate.setMonth(initialNextResetDate.getMonth() + 1)
  let nextResetDate = new Date(anchorDate)
  nextResetDate.setMonth(nextResetDate.getMonth() + 1)
  while (now >= nextResetDate) {
    anchorDate = new Date(nextResetDate)
    nextResetDate = new Date(anchorDate)
    nextResetDate.setMonth(nextResetDate.getMonth() + 1)
  }
  return {
    resetDue: now >= initialNextResetDate,
    nextResetISO: nextResetDate.toISOString(),
  }
}

function extensionProxyUsageForLimitCheck(usage, now, fallbackAnchorISO) {
  const anchorISO =
    usage?.extension_proxy_monthly_reset ||
    usage?.monthly_reset ||
    fallbackAnchorISO
  const { resetDue } = getCycleInfo(anchorISO, now)
  return resetDue ? 0 : (usage?.extension_proxy_tokens || 0)
}

/**
 * Get user's active plan limits and current usage.
 * Priority: Active Builder subscription > Pro subscription > Free tier
 */
export async function getUserLimits(userId, supabase) {
  // Get all active purchases
  const { data: purchases, error: purchasesError } = await supabase
    .from('purchases')
    .select('*')
    .eq('user_id', userId)
    .order('purchased_at', { ascending: false })
  
  if (purchasesError) {
    console.error('Error fetching purchases:', purchasesError)
  }

  // Get current usage from token_usage table (tracks both credits and tokens)
  const { data: usage, error: usageError } = await supabase
    .from('token_usage')
    .select(
      'total_credits, total_tokens, browser_minutes, monthly_reset, extension_proxy_monthly_reset, extension_proxy_tokens'
    )
    .eq('user_id', userId)
    .maybeSingle()
  
  if (usageError) {
    console.error('Error fetching usage:', usageError)
  }

  // Get current project count from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('project_count, created_at')
    .eq('id', userId)
    .single()

  const now = new Date()
  const planPriority = { builder: 2, pro: 1, free: 0 }
  const activeSubscription = (purchases || [])
    .filter(
      (p) =>
        p.purchase_type === 'subscription' &&
        subscriptionPurchaseEntitled(p, now) &&
        SUBSCRIPTION_PLANS.includes(p.plan) &&
        p.plan !== 'free'
    )
    .sort((a, b) => {
      const planDelta =
        (planPriority[b.plan] || 0) - (planPriority[a.plan] || 0)
      if (planDelta !== 0) return planDelta
      return new Date(b.purchased_at) - new Date(a.purchased_at)
    })[0]

  const resolvedPlan = activeSubscription?.plan || DEFAULT_PLAN
  const planLimits = PLAN_LIMITS[resolvedPlan] || PLAN_LIMITS[DEFAULT_PLAN]
  const fallbackAnchorISO =
    usage?.monthly_reset ||
    activeSubscription?.purchased_at ||
    profile?.created_at ||
    now.toISOString()
  const { resetDue, nextResetISO } = getCycleInfo(fallbackAnchorISO, now)
  return {
    plan: resolvedPlan,
    purchaseType: resolvedPlan === 'free' ? 'free' : 'subscription',
    limits: {
      credits: planLimits.monthly_credits,
      browserMinutes: Infinity,
      projects: Infinity,
      extensionProxyTokens: planLimits.extension_proxy_tokens,
    },
    usage: {
      credits: resetDue ? 0 : (usage?.total_credits || 0),
      browserMinutes: resetDue ? 0 : (usage?.browser_minutes || 0),
      projects: profile?.project_count || 0,
      extensionProxyTokens: extensionProxyUsageForLimitCheck(
        usage,
        now,
        fallbackAnchorISO
      ),
    },
    hasActiveSubscription: resolvedPlan !== 'free',
    // Backward-compat field for existing clients.
    hasActivePro: resolvedPlan === 'pro' || resolvedPlan === 'builder',
    resetDate: nextResetISO,
    resetType: 'monthly',
    exhausted: {
      credits: (resetDue ? 0 : (usage?.total_credits || 0)) >= planLimits.monthly_credits,
      browserMinutes: false,
      projects: false,
      extensionProxyTokens:
        extensionProxyUsageForLimitCheck(usage, now, fallbackAnchorISO) >=
        planLimits.extension_proxy_tokens,
    },
  }
}

/**
 * Check if user has sufficient resources
 */
export async function checkLimit(userId, resourceType, amount, supabase) {
  const limits = await getUserLimits(userId, supabase)
  
  const currentUsage = limits.usage[resourceType] || 0
  const limit = limits.limits[resourceType] || 0
  
  // Skip project and browser minute limits for all plans (only credits are limited)
  const shouldSkipLimit = resourceType === 'projects' || resourceType === 'browserMinutes'
  
  if (shouldSkipLimit) {
    return {
      allowed: true, // Always allow - only credits are limited
      currentUsage,
      limit: Infinity,
      available: Infinity,
      needed: amount,
      plan: limits.plan,
      purchaseType: limits.purchaseType,
      resetType: limits.resetType,
      resetDate: limits.resetDate,
      exhausted: false
    }
  }
  
  const available = limit - currentUsage
  
  return {
    allowed: available >= amount,
    currentUsage,
    limit,
    available,
    needed: amount,
    plan: limits.plan,
    purchaseType: limits.purchaseType,
    resetType: limits.resetType,
    resetDate: limits.resetDate,
    exhausted: limits.exhausted
  }
}

function formatLimitResetLabel(iso) {
  if (!iso) return 'your next monthly reset'
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return 'your next monthly reset'
  }
}

/** ~100K / ~500K style (matches pricing page FAQ) */
function formatProxyTokensShort(n) {
  if (n >= 1_000_000) return `~${n / 1_000_000}M`
  if (n >= 1_000) return `~${n / 1_000}K`
  return String(n)
}

function buildCreditsLimitMessage(checkResult) {
  const plan = checkResult.plan || DEFAULT_PLAN
  const reset = formatLimitResetLabel(checkResult.resetDate)
  const { free, pro, builder } = PLAN_LIMITS

  if (plan === 'builder') {
    return `You've used all **monthly credits** on your Builder plan (${builder.monthly_credits}/month). Your pool resets on **${reset}**.`
  }
  if (plan === 'pro') {
    return `You've used all **monthly credits** on your Pro plan (${pro.monthly_credits}/month). **Builder** is **$14.99/month** with **${builder.monthly_credits} credits/month** and higher limits: [Upgrade to Builder](${BILLING_SUBSCRIBE.builder})

If you stay on Pro, credits reset on **${reset}**.`
  }
  return `You've used all **monthly credits** on the Free plan (${free.monthly_credits}/month). Upgrade for more builder and extension codegen credits:

- **Pro** — **$9.99/month** — ${pro.monthly_credits} credits/month — [Subscribe with Stripe](${BILLING_SUBSCRIBE.pro})
- **Builder** — **$14.99/month** — ${builder.monthly_credits} credits/month — [Subscribe with Stripe](${BILLING_SUBSCRIBE.builder})

Your usage resets on **${reset}**.`
}

function buildExtensionProxyLimitMessage(checkResult) {
  const plan = checkResult.plan || DEFAULT_PLAN
  const reset = formatLimitResetLabel(checkResult.resetDate)
  const { free, pro, builder } = PLAN_LIMITS
  const f = formatProxyTokensShort

  if (plan === 'builder') {
    return `You've reached your **extension LLM proxy** allowance for this month (${f(builder.extension_proxy_tokens)} tokens on Builder). It resets on **${reset}**.`
  }
  if (plan === 'pro') {
    return `You've reached your **extension LLM proxy** allowance for this month (${f(pro.extension_proxy_tokens)} tokens on Pro). **Builder** includes **${f(builder.extension_proxy_tokens)} tokens/month** and more headroom: [Upgrade to Builder](${BILLING_SUBSCRIBE.builder})

Or wait until **${reset}** when your allowance resets.`
  }
  return `You've reached your **extension LLM proxy** allowance for this month (Free: ${f(free.extension_proxy_tokens)} tokens). Upgrade for a larger monthly pool:

- **Pro** — **$9.99/month** — ${f(pro.extension_proxy_tokens)} proxy tokens/month — [Subscribe with Stripe](${BILLING_SUBSCRIBE.pro})
- **Builder** — **$14.99/month** — ${f(builder.extension_proxy_tokens)} proxy tokens/month — [Subscribe with Stripe](${BILLING_SUBSCRIBE.builder})

Resets on **${reset}**.`
}

/**
 * Format limit check error for API response
 */
export function formatLimitError(checkResult, resourceType) {
  const resourceNames = {
    credits: 'credits',
    browserMinutes: 'browser testing minutes',
    projects: 'projects',
    extensionProxyTokens: 'extension LLM tokens',
  }

  const suggestion =
    checkResult.purchaseType === 'free'
      ? 'Upgrade to Pro or Builder to continue this month'
      : 'Your limit will reset on your next monthly billing cycle'

  const shortError = `${resourceNames[resourceType]} limit reached`

  let message
  if (resourceType === 'credits') {
    message = buildCreditsLimitMessage(checkResult)
  } else if (resourceType === 'extensionProxyTokens') {
    message = buildExtensionProxyLimitMessage(checkResult)
  } else {
    const head =
      shortError.charAt(0).toUpperCase() + shortError.slice(1)
    message = `${head}. ${suggestion}.`
  }

  return {
    error: shortError,
    message,
    details: {
      resourceType,
      currentUsage: checkResult.currentUsage,
      limit: checkResult.limit,
      available: checkResult.available,
      needed: checkResult.needed,
      plan: checkResult.plan,
      purchaseType: checkResult.purchaseType,
      resetType: checkResult.resetType,
      resetDate: checkResult.resetDate,
      suggestion,
    },
  }
}

