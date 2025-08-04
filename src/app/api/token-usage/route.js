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
    const { data: billing, error: billingError } = await supabase
      .from('billing')
      .select('plan')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const userPlan = billing?.plan || DEFAULT_PLAN
    const planLimit = PLAN_LIMITS[userPlan] || PLAN_LIMITS[DEFAULT_PLAN]

    // Get total tokens used by user
    const { data: tokenUsageData, error: tokenError } = await supabase
      .from('token_usage')
      .select('total_tokens, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (tokenError) {
      console.error('Error fetching token usage:', tokenError)
      return NextResponse.json({ error: "Failed to fetch token usage" }, { status: 500 })
    }

    const totalTokensUsed = tokenUsageData?.reduce((sum, record) => sum + (record.total_tokens || 0), 0) || 0

    // Calculate usage percentage (if not unlimited)
    const usagePercentage = planLimit === -1 ? 0 : Math.round((totalTokensUsed / planLimit) * 100)

    // Get monthly usage (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const monthlyUsage = tokenUsageData?.filter(record => 
      new Date(record.created_at) >= thirtyDaysAgo
    ).reduce((sum, record) => sum + (record.total_tokens || 0), 0) || 0

    return NextResponse.json({
      totalTokensUsed,
      planLimit: planLimit === -1 ? 'unlimited' : planLimit,
      usagePercentage,
      monthlyUsage,
      userPlan,
      remainingTokens: planLimit === -1 ? 'unlimited' : Math.max(0, planLimit - totalTokensUsed)
    })
  } catch (error) {
    console.error("Error getting token usage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 