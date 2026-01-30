import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { validateProjectId, checkPaidPlan } from "@/lib/validation"
import {
  generatePrivacySlug,
  isPrivacySlugAvailable,
  validatePrivacyPolicyContent
} from "@/lib/privacy-policy-utils"

// GET: Retrieve project's privacy policy
export async function GET(request, { params }) {
  const supabase = createClient()
  const { id: projectId } = params

  const projectValidation = validateProjectId(projectId)
  if (!projectValidation.isValid) {
    return NextResponse.json({ error: projectValidation.error }, { status: 400 })
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { data: project, error } = await supabase
      .from("projects")
      .select("id, name, privacy_slug, privacy_policy, privacy_policy_last_updated")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (error || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json({
      privacy_slug: project.privacy_slug,
      privacy_policy: project.privacy_policy,
      last_updated: project.privacy_policy_last_updated,
      url: project.privacy_slug
        ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://chromie.dev'}/privacy-policy/${project.privacy_slug}`
        : null
    })
  } catch (error) {
    console.error("Error fetching privacy policy:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST: Create or update privacy policy
export async function POST(request, { params }) {
  const supabase = createClient()
  const { id: projectId } = params

  const projectValidation = validateProjectId(projectId)
  if (!projectValidation.isValid) {
    return NextResponse.json({ error: projectValidation.error }, { status: 400 })
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if user has paid plan
  const { isPaid } = await checkPaidPlan(supabase, user.id)
  if (!isPaid) {
    return NextResponse.json({
      error: "Privacy policy hosting is a paid feature. Please upgrade to access this feature."
    }, { status: 403 })
  }

  try {
    const { privacy_policy, custom_slug } = await request.json()

    // Validate content
    const contentValidation = validatePrivacyPolicyContent(privacy_policy)
    if (!contentValidation.isValid) {
      return NextResponse.json({ error: contentValidation.error }, { status: 400 })
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, privacy_slug")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Generate or use custom slug
    let slug = custom_slug
    if (!slug) {
      slug = generatePrivacySlug(project.name, projectId)
    }

    // Check slug availability (excluding current project)
    const isAvailable = await isPrivacySlugAvailable(slug, supabase, projectId)
    if (!isAvailable) {
      // Auto-append random suffix if collision
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      slug = `${slug}-${randomSuffix}`
    }

    // Update project with privacy policy
    const { data: updated, error: updateError } = await supabase
      .from("projects")
      .update({
        privacy_slug: slug,
        privacy_policy: privacy_policy,
        privacy_policy_last_updated: new Date().toISOString()
      })
      .eq("id", projectId)
      .eq("user_id", user.id)
      .select("id, name, privacy_slug, privacy_policy_last_updated")
      .single()

    if (updateError) {
      console.error("Error updating privacy policy:", updateError)
      return NextResponse.json({ error: "Failed to save privacy policy" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      privacy_slug: updated.privacy_slug,
      last_updated: updated.privacy_policy_last_updated,
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://chromie.dev'}/privacy-policy/${updated.privacy_slug}`
    })
  } catch (error) {
    console.error("Error saving privacy policy:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE: Remove privacy policy
export async function DELETE(request, { params }) {
  const supabase = createClient()
  const { id: projectId } = params

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { error } = await supabase
      .from("projects")
      .update({
        privacy_slug: null,
        privacy_policy: null,
        privacy_policy_last_updated: null
      })
      .eq("id", projectId)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error deleting privacy policy:", error)
      return NextResponse.json({ error: "Failed to delete privacy policy" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Privacy policy deleted" })
  } catch (error) {
    console.error("Error deleting privacy policy:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
