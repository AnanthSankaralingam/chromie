import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserLimits } from "@/lib/limit-checker"
import { applyTokenUsageDelta } from "@/lib/token-usage-apply"

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const userLimits = await getUserLimits(user.id, supabase)
    
    return NextResponse.json({
      plan: userLimits.plan,
      planNames: userLimits.planNames, // For one-time bundles: e.g. ['pro']
      purchaseType: userLimits.purchaseType,
      purchaseCount: userLimits.purchaseCount,
      resetType: userLimits.resetType,
      resetDate: userLimits.resetDate,
      hasActivePro: userLimits.hasActivePro,
      
      limits: userLimits.limits,
      usage: userLimits.usage,
      
      remaining: {
        credits: userLimits.limits.credits - userLimits.usage.credits,
        browserMinutes: userLimits.limits.browserMinutes - userLimits.usage.browserMinutes,
        projects: userLimits.limits.projects - userLimits.usage.projects
      },
      
      percentages: {
        credits: Math.round((userLimits.usage.credits / userLimits.limits.credits) * 100),
        browserMinutes: Math.round((userLimits.usage.browserMinutes / userLimits.limits.browserMinutes) * 100),
        projects: Math.round((userLimits.usage.projects / userLimits.limits.projects) * 100)
      },
      
      exhausted: userLimits.exhausted || {
        credits: false,
        browserMinutes: false,
        projects: false
      },
      
      // Legacy fields for backwards compatibility (using credits now)
      totalTokensUsed: userLimits.usage.credits,
      planLimit: userLimits.limits.credits === -1 ? 'unlimited' : userLimits.limits.credits,
      usagePercentage: Math.round((userLimits.usage.credits / userLimits.limits.credits) * 100),
      monthlyUsage: userLimits.usage.credits,
      userPlan: userLimits.plan,
      remainingTokens: userLimits.limits.credits === -1 ? 'unlimited' : Math.max(0, userLimits.limits.credits - userLimits.usage.credits),
      monthlyReset: userLimits.resetDate,
      resetDue: userLimits.resetType === 'monthly' && userLimits.resetDate ? new Date() >= new Date(userLimits.resetDate) : false,
      totalBrowserMinutesUsed: userLimits.usage.browserMinutes,
      browserPlanLimit: userLimits.limits.browserMinutes === -1 ? 'unlimited' : userLimits.limits.browserMinutes,
      browserUsagePercentage: Math.round((userLimits.usage.browserMinutes / userLimits.limits.browserMinutes) * 100),
      remainingBrowserMinutes: userLimits.limits.browserMinutes === -1 ? 'unlimited' : Math.max(0, userLimits.limits.browserMinutes - userLimits.usage.browserMinutes),
    })
  } catch (error) {
    console.error("Error getting token usage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 

export async function POST(request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const creditsThisRequest = Number(body?.creditsThisRequest || 0)
    const tokensThisRequest = Number(body?.tokensThisRequest || 0)
    const browserMinutesThisRequest = Number(body?.browserMinutesThisRequest || 0)
    const extensionProxyTokensThisRequest = Number(
      body?.extensionProxyTokensThisRequest ?? 0
    )
    const modelUsed = typeof body?.model === 'string' ? body.model : 'unknown'
    const targetId = typeof body?.id === 'string' ? body.id : null

    if (!Number.isFinite(creditsThisRequest) || creditsThisRequest < 0) {
      return NextResponse.json({ error: "creditsThisRequest must be a non-negative number" }, { status: 400 })
    }

    if (!Number.isFinite(tokensThisRequest) || tokensThisRequest < 0) {
      return NextResponse.json({ error: "tokensThisRequest must be a non-negative number" }, { status: 400 })
    }

    if (!Number.isFinite(browserMinutesThisRequest) || browserMinutesThisRequest < 0) {
      return NextResponse.json({ error: "browserMinutesThisRequest must be a non-negative number" }, { status: 400 })
    }

    if (
      !Number.isFinite(extensionProxyTokensThisRequest) ||
      extensionProxyTokensThisRequest < 0
    ) {
      return NextResponse.json(
        {
          error:
            "extensionProxyTokensThisRequest must be a non-negative number",
        },
        { status: 400 }
      )
    }

    // Prefer service-role client for deterministic, RLS-safe updates (after verifying auth user)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let db = supabase
    if (supabaseUrl && serviceKey) {
      const { createClient: createServiceClient } = await import('@supabase/supabase-js')
      db = createServiceClient(supabaseUrl, serviceKey)
    }

    console.log(`Updating credit usage via POST - user: ${user.id}, add: ${creditsThisRequest}`)
    console.log(`Updating token usage via POST - user: ${user.id}, add: ${tokensThisRequest}`)
    console.log(`Updating browser usage via POST - user: ${user.id}, add: ${browserMinutesThisRequest}`)
    console.log(`Updating extension proxy tokens via POST - user: ${user.id}, add: ${extensionProxyTokensThisRequest}`)

    const applied = await applyTokenUsageDelta(db, user.id, {
      creditsThisRequest,
      tokensThisRequest,
      browserMinutesThisRequest,
      extensionProxyTokensThisRequest,
      modelUsed,
      targetId,
    })

    if (!applied.ok) {
      console.error('Error applying token usage via POST:', applied.error)
      return NextResponse.json({ error: "Failed to update usage" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      id: applied.id,
      total_credits: applied.total_credits,
      total_tokens: applied.total_tokens,
      browser_minutes: applied.browser_minutes,
      monthly_reset: applied.monthly_reset,
      extension_proxy_tokens: applied.extension_proxy_tokens,
      model: modelUsed,
    })
  } catch (error) {
    console.error("Error updating token usage via POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}