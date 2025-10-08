import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { checkLimit, formatLimitError } from "@/lib/limit-checker"

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

    // Check project limit using new limit checker
    const limitCheck = await checkLimit(user.id, 'projects', 1, supabase)
    
    if (!limitCheck.allowed) {
      console.log(`User ${user.id} has reached project limit: ${limitCheck.currentUsage}/${limitCheck.limit} on ${limitCheck.plan} plan`)
      return NextResponse.json(
        formatLimitError(limitCheck, 'projects'),
        { status: 403 }
      )
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
