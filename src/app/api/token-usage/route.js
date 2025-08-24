import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { PLAN_LIMITS, DEFAULT_PLAN } from "@/lib/constants"
import { randomUUID } from "crypto"

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
      // Align reset anchor with beginning of current month for consistency with generation endpoint
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const { error: resetError } = await supabase
        .from('token_usage')
        .update({ total_tokens: 0, monthly_reset: firstDayOfMonth.toISOString() })
        .eq('id', existingUsage.id)
        .eq('user_id', user.id)

      if (resetError) {
        console.error('Error resetting monthly token usage:', resetError)
      }
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

export async function POST(request) {
  const supabase = createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const tokensThisRequest = Number(body?.tokensThisRequest || 0)
    const modelUsed = typeof body?.model === 'string' ? body.model : 'unknown'
    const targetId = typeof body?.id === 'string' ? body.id : null

    if (!Number.isFinite(tokensThisRequest) || tokensThisRequest < 0) {
      return NextResponse.json({ error: "tokensThisRequest must be a non-negative number" }, { status: 400 })
    }

    // Prefer service-role client for deterministic, RLS-safe updates (after verifying auth user)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let db = supabase
    if (supabaseUrl && serviceKey) {
      const { createClient: createServiceClient } = await import('@supabase/supabase-js')
      db = createServiceClient(supabaseUrl, serviceKey)
    }

    // Fetch existing usage for this user. If id is provided, target that row for safety and determinism.
    let existingUsage = null
    if (targetId) {
      const { data } = await db
        .from('token_usage')
        .select('id, total_tokens, monthly_reset, model')
        .eq('id', targetId)
        .eq('user_id', user.id)
        .maybeSingle()
      existingUsage = data || null
    } else {
      const { data } = await db
        .from('token_usage')
        .select('id, total_tokens, monthly_reset, model')
        .eq('user_id', user.id)
        .maybeSingle()
      existingUsage = data || null
    }

    const now = new Date()
    // Use beginning of current month as the reset anchor
    let effectiveMonthlyReset = existingUsage?.monthly_reset
    if (!effectiveMonthlyReset) {
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      effectiveMonthlyReset = firstDayOfMonth.toISOString()
    }

    const monthlyResetDate = effectiveMonthlyReset ? new Date(effectiveMonthlyReset) : null
    let resetDatePlusOneMonth = null
    if (monthlyResetDate) {
      resetDatePlusOneMonth = new Date(monthlyResetDate)
      resetDatePlusOneMonth.setMonth(resetDatePlusOneMonth.getMonth() + 1)
    }

    const isResetDue = monthlyResetDate ? now >= resetDatePlusOneMonth : false

    // Determine new totals and monthly_reset state
    let newTotalTokens
    let newMonthlyReset = existingUsage?.monthly_reset

    if (!existingUsage) {
      // First-ever usage record for this user
      newTotalTokens = tokensThisRequest
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      newMonthlyReset = firstDayOfMonth.toISOString()
    } else if (!existingUsage.monthly_reset) {
      // No monthly_reset set yet; set to beginning of current month and continue accumulating
      newTotalTokens = (existingUsage.total_tokens || 0) + tokensThisRequest
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      newMonthlyReset = firstDayOfMonth.toISOString()
    } else if (isResetDue) {
      // New monthly period started; reset total to current request
      newTotalTokens = tokensThisRequest
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      newMonthlyReset = firstDayOfMonth.toISOString()
    } else {
      // Same monthly period; accumulate
      newTotalTokens = (existingUsage.total_tokens || 0) + tokensThisRequest
    }

    console.log(`Updating token usage via POST - user: ${user.id}, add: ${tokensThisRequest}, total -> ${newTotalTokens}`)

    if (existingUsage?.id) {
      const { data: updatedRows, error: updateError } = await db
        .from('token_usage')
        .update({
          total_tokens: newTotalTokens,
          monthly_reset: newMonthlyReset,
          model: modelUsed,
        })
        .eq('id', existingUsage.id)
        .eq('user_id', user.id)
        .select('id, total_tokens, monthly_reset')

      if (updateError) {
        console.error('Error updating token usage via POST:', updateError)
        return NextResponse.json({ error: "Failed to update token usage" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        id: updatedRows?.[0]?.id || existingUsage.id,
        total_tokens: updatedRows?.[0]?.total_tokens ?? newTotalTokens,
        monthly_reset: updatedRows?.[0]?.monthly_reset ?? newMonthlyReset,
        model: modelUsed,
      })
    }

    const newId = randomUUID()
    const { error: insertError } = await db
      .from('token_usage')
      .insert({
        id: newId,
        user_id: user.id,
        total_tokens: newTotalTokens,
        model: modelUsed,
        monthly_reset: newMonthlyReset,
      })

    if (insertError) {
      console.error('Error inserting token usage via POST:', insertError)
      return NextResponse.json({ error: "Failed to insert token usage" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      id: newId,
      total_tokens: newTotalTokens,
      monthly_reset: newMonthlyReset,
      model: modelUsed,
    })
  } catch (error) {
    console.error("Error updating token usage via POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}