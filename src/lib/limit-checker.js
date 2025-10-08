import { PLAN_LIMITS, DEFAULT_PLAN } from '@/lib/constants'

/**
 * Get user's total purchased limits and current usage
 * Priority: Active Legend subscription > One-time purchases > Free tier
 */
export async function getUserLimits(userId, supabase) {
  // Get all active purchases
  const { data: purchases, error: purchasesError } = await supabase
    .from('purchases')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('purchased_at', { ascending: false })
  
  if (purchasesError) {
    console.error('Error fetching purchases:', purchasesError)
  }

  // Get current usage from token_usage table
  const { data: usage, error: usageError } = await supabase
    .from('token_usage')
    .select('total_tokens, browser_minutes, monthly_reset')
    .eq('user_id', userId)
    .maybeSingle()
  
  if (usageError) {
    console.error('Error fetching usage:', usageError)
  }

  // Get current project count from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('project_count')
    .eq('id', userId)
    .single()

  const now = new Date()
  
  // Check for active Legend subscription
  const legendSub = purchases?.find(p => 
    p.plan === 'legend' && 
    p.purchase_type === 'subscription' &&
    (!p.expires_at || new Date(p.expires_at) > now)
  )
  
  if (legendSub) {
    // Active Legend subscription - use Legend limits with monthly reset
    const monthlyResetDate = usage?.monthly_reset ? new Date(usage.monthly_reset) : null
    let resetDatePlusOneMonth = null
    if (monthlyResetDate) {
      resetDatePlusOneMonth = new Date(monthlyResetDate)
      resetDatePlusOneMonth.setMonth(resetDatePlusOneMonth.getMonth() + 1)
    }
    const isResetDue = monthlyResetDate ? now >= resetDatePlusOneMonth : false
    
    return {
      plan: 'legend',
      purchaseType: 'subscription',
      limits: {
        tokens: PLAN_LIMITS.legend.monthly_tokens,
        browserMinutes: PLAN_LIMITS.legend.monthly_browser_minutes,
        projects: PLAN_LIMITS.legend.max_projects
      },
      usage: {
        tokens: isResetDue ? 0 : (usage?.total_tokens || 0),
        browserMinutes: isResetDue ? 0 : (usage?.browser_minutes || 0),
        projects: profile?.project_count || 0
      },
      hasActiveLegend: true,
      resetDate: legendSub.expires_at,
      resetType: 'monthly'
    }
  }
  
  // Sum all one-time purchases
  const oneTimePurchases = purchases?.filter(p => p.purchase_type === 'one_time') || []
  
  if (oneTimePurchases.length > 0) {
    const totalLimits = {
      tokens: oneTimePurchases.reduce((sum, p) => sum + p.tokens_purchased, 0),
      browserMinutes: oneTimePurchases.reduce((sum, p) => sum + p.browser_minutes_purchased, 0),
      projects: oneTimePurchases.reduce((sum, p) => sum + p.projects_purchased, 0)
    }
    
    return {
      plan: 'one_time_bundle',
      planNames: [...new Set(oneTimePurchases.map(p => p.plan))], // ['starter', 'pro']
      purchaseType: 'one_time',
      purchaseCount: oneTimePurchases.length,
      limits: totalLimits,
      usage: {
        tokens: usage?.total_tokens || 0,
        browserMinutes: usage?.browser_minutes || 0,
        projects: profile?.project_count || 0
      },
      hasActiveLegend: false,
      resetDate: null,
      resetType: 'never',
      exhausted: {
        tokens: (usage?.total_tokens || 0) >= totalLimits.tokens,
        browserMinutes: (usage?.browser_minutes || 0) >= totalLimits.browserMinutes,
        projects: (profile?.project_count || 0) >= totalLimits.projects
      }
    }
  }
  
  // Free tier
  const monthlyResetDate = usage?.monthly_reset ? new Date(usage.monthly_reset) : null
  let resetDatePlusOneMonth = null
  if (monthlyResetDate) {
    resetDatePlusOneMonth = new Date(monthlyResetDate)
    resetDatePlusOneMonth.setMonth(resetDatePlusOneMonth.getMonth() + 1)
  }
  const isResetDue = monthlyResetDate ? now >= resetDatePlusOneMonth : false
  
  return {
    plan: 'free',
    purchaseType: 'free',
    limits: {
      tokens: PLAN_LIMITS.free.monthly_tokens,
      browserMinutes: PLAN_LIMITS.free.monthly_browser_minutes,
      projects: PLAN_LIMITS.free.max_projects
    },
    usage: {
      tokens: isResetDue ? 0 : (usage?.total_tokens || 0),
      browserMinutes: isResetDue ? 0 : (usage?.browser_minutes || 0),
      projects: profile?.project_count || 0
    },
    hasActiveLegend: false,
    resetDate: monthlyResetDate,
    resetType: 'monthly'
  }
}

/**
 * Check if user has sufficient resources
 */
export async function checkLimit(userId, resourceType, amount, supabase) {
  const limits = await getUserLimits(userId, supabase)
  
  const currentUsage = limits.usage[resourceType] || 0
  const limit = limits.limits[resourceType] || 0
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

/**
 * Format limit check error for API response
 */
export function formatLimitError(checkResult, resourceType) {
  const resourceNames = {
    tokens: 'AI tokens',
    browserMinutes: 'browser testing minutes',
    projects: 'projects'
  }
  
  const suggestion = checkResult.purchaseType === 'one_time'
    ? 'Buy another package or subscribe to Legend for more'
    : checkResult.purchaseType === 'free'
    ? 'Purchase a Starter or Pro package to continue'
    : 'Your limit will reset on your next billing cycle'
  
  return {
    error: `${resourceNames[resourceType]} limit reached`,
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
      suggestion
    }
  }
}

