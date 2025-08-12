import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { PLAN_LIMITS, DEFAULT_PLAN } from "@/lib/constants"

export async function GET() {
  const supabase = createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get user's plan
    const { data: billing } = await supabase
      .from('billing')
      .select('plan')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const userPlan = billing?.plan || DEFAULT_PLAN
    const planLimit = PLAN_LIMITS[userPlan] || PLAN_LIMITS[DEFAULT_PLAN]

    // Fetch single per-user token usage with monthly reset logic
    const { data: existingUsage, error: tokenError } = await supabase
      .from('token_usage')
      .select('id, total_tokens, monthly_reset')
      .eq('user_id', user.id)
      .maybeSingle()

    if (tokenError) {
      console.error('Error fetching token usage:', tokenError)
      return NextResponse.json({ error: "Failed to fetch token usage" }, { status: 500 })
    }

    const now = new Date()
    const monthlyResetDate = existingUsage?.monthly_reset ? new Date(existingUsage.monthly_reset) : null
    let resetDatePlusOneMonth = null
    if (monthlyResetDate) {
      resetDatePlusOneMonth = new Date(monthlyResetDate)
      resetDatePlusOneMonth.setMonth(resetDatePlusOneMonth.getMonth() + 1)
    }

    const isResetDue = monthlyResetDate ? now >= resetDatePlusOneMonth : false
    const totalTokensUsed = isResetDue ? 0 : (existingUsage?.total_tokens || 0)
    const usagePercentage = planLimit === -1 ? 0 : Math.round((totalTokensUsed / planLimit) * 100)
    const monthlyUsage = totalTokensUsed

    // If reset is due, update the record so UI reflects fresh cycle next calls
    if (existingUsage?.id && isResetDue) {
      await supabase
        .from('token_usage')
        .update({ total_tokens: 0, monthly_reset: now.toISOString() })
        .eq('id', existingUsage.id)
    }

    console.log(`Token usage - plan: ${userPlan}, limit: ${planLimit}, used: ${totalTokensUsed}, resetDue: ${isResetDue}`)

    return NextResponse.json({
      totalTokensUsed,
      planLimit: planLimit === -1 ? 'unlimited' : planLimit,
      usagePercentage,
      monthlyUsage,
      userPlan,
      remainingTokens: planLimit === -1 ? 'unlimited' : Math.max(0, planLimit - totalTokensUsed),
      monthlyReset: monthlyResetDate ? monthlyResetDate.toISOString() : null,
      resetDue: isResetDue,
    })
  } catch (error) {
    console.error("Error getting token usage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 