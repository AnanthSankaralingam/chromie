import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { checkLimit, formatLimitError } from "@/lib/limit-checker"
import emailService from "@/lib/services/email-service"

export const dynamic = 'force-dynamic'

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
          welcome_email_sent: false,
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

    // Send welcome email for new users (first project creation)
    if (!existingProfile) {
      console.log("Sending welcome email to new user:", user.email)
      try {
        // Send welcome email asynchronously (don't wait for it)
        emailService.sendWelcomeEmail(user).then(result => {
          if (result.success) {
            console.log("Welcome email sent successfully to:", user.email)
            // Update the profile to mark welcome email as sent
            supabase
              .from("profiles")
              .update({
                welcome_email_sent: true,
                welcome_email_sent_at: new Date().toISOString()
              })
              .eq("id", user.id)
              .then(({ error }) => {
                if (error) {
                  console.error("Error updating welcome email status:", error)
                }
              })
          } else {
            console.error("Failed to send welcome email:", result.error)
          }
        }).catch(error => {
          console.error("Error sending welcome email:", error)
        })
      } catch (error) {
        console.error("Error initiating welcome email:", error)
        // Don't fail the project creation if email fails
      }
    }

    return NextResponse.json({ project })

  } catch (err) {
    console.error("Exception in project creation:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
