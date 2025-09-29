import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
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

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ projects })
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

  const { name, description } = await request.json()

  console.log("Creating project for user:", user.id, "with data:", { name, description })

  try {
    // First, ensure the user has a profile
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, project_count")
      .eq("id", user.id)
      .single()

    if (!existingProfile) {
      console.log("Creating profile for user:", user.id)
      // Create profile for the user
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          email: user.email,
          provider: user.app_metadata?.provider || 'google',
          project_count: 0,
          created_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
        })

      if (profileError) {
        console.error("Error creating profile:", profileError)
        return NextResponse.json({ error: "Failed to create user profile" }, { status: 500 })
      }
      console.log("Successfully created profile for user:", user.id)
    }

    // Get user's current plan and project count
    const { data: profile } = await supabase
      .from("profiles")
      .select("project_count")
      .eq("id", user.id)
      .single()

    const { data: billing } = await supabase
      .from("billing")
      .select("plan")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    const currentPlan = billing?.plan || DEFAULT_PLAN
    const currentProjectCount = profile?.project_count || 0

    // Align project limits with PLAN_LIMITS
    const planLimit = PLAN_LIMITS[currentPlan] || PLAN_LIMITS[DEFAULT_PLAN]
    const maxProjects = planLimit.max_projects

    // Check if user has reached their project limit
    if (currentProjectCount >= maxProjects) {
      console.log(`User ${user.id} has reached project limit: ${currentProjectCount}/${maxProjects} on ${currentPlan} plan`)
      return NextResponse.json({ 
        error: "Project limit reached",
        details: {
          currentPlan,
          currentProjectCount,
          maxProjects,
          nextPlan: currentPlan === 'free' ? 'starter' : currentPlan === 'starter' ? 'pro' : null
        }
      }, { status: 403 })
    }

    // Enforce token usage BEFORE project creation (aggregate across monthly window)
    const { data: usageRows } = await supabase
      .from('token_usage')
      .select('id, total_tokens, monthly_reset, model')
      .eq('user_id', user.id)

    const now = new Date()
    let effectiveTokensUsed = 0
    if (Array.isArray(usageRows) && usageRows.length > 0) {
      for (const row of usageRows) {
        let monthlyResetIso = row?.monthly_reset
        if (!monthlyResetIso) {
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          monthlyResetIso = firstDayOfMonth.toISOString()
        }
        const monthlyResetDate = new Date(monthlyResetIso)
        const resetDatePlusOneMonth = new Date(monthlyResetDate)
        resetDatePlusOneMonth.setMonth(resetDatePlusOneMonth.getMonth() + 1)
        const isResetDue = now >= resetDatePlusOneMonth
        const counted = isResetDue ? 0 : (row?.total_tokens || 0)
        effectiveTokensUsed += counted
      }
    }

    if (planLimit.monthly_tokens !== -1 && effectiveTokensUsed >= planLimit.monthly_tokens) {
      console.log(`[projects POST] ❌ Token limit exceeded pre-creation: ${effectiveTokensUsed}/${planLimit.monthly_tokens}`)
      return NextResponse.json({
        error: "Token usage limit exceeded",
        details: { effectiveTokensUsed, limit: planLimit.monthly_tokens }
      }, { status: 403 })
    }

    // Now create the project
    const { data: project, error } = await supabase
      .from("projects")
      .insert([
        {
          user_id: user.id,
          name,
          description,
          created_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
          archived: false,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Error creating project:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("Successfully created project:", project.id)
    return NextResponse.json({ project })
    
  } catch (err) {
    console.error("Exception in project creation:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
