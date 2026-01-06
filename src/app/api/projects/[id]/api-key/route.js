import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { API_KEY_CONFIG } from "@/lib/constants"

// GET - Get API key info for a project (does not return the full key)
export async function GET(request, { params }) {
  const supabase = createClient()
  const { id } = params

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, api_key_prefix, api_key_last_used_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check if project has an API key
    const hasApiKey = !!project.api_key_prefix

    if (!hasApiKey) {
      return NextResponse.json({
        hasApiKey: false,
        apiKey: null
      })
    }

    // Return API key info (prefix only, never the full key)
    return NextResponse.json({
      hasApiKey: true,
      apiKey: {
        id: project.id,
        name: project.name,
        key: project.api_key_prefix, // Display prefix only
        lastUsed: project.api_key_last_used_at,
        created: project.api_key_last_used_at // Approximate, we don't store creation time separately
      }
    })
  } catch (error) {
    console.error("Error fetching API key:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Generate a new API key for a project
export async function POST(request, { params }) {
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
    // Parse request body (optional key name)
    const body = await request.json()
    const { name } = body || {}

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, user_id, api_key_hash")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check if project already has an API key
    if (project.api_key_hash) {
      return NextResponse.json({
        error: "Project already has an API key. Delete the existing key first."
      }, { status: 400 })
    }

    // Check if user already has an API key across all projects (limit to 1 per user)
    const { data: userProjects, error: userProjectsError } = await supabase
      .from("projects")
      .select("id, api_key_hash")
      .eq("user_id", user.id)
      .not("api_key_hash", "is", null)

    if (userProjectsError) {
      console.error("Error checking user API keys:", userProjectsError)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }

    if (userProjects && userProjects.length >= API_KEY_CONFIG.MAX_KEYS_PER_USER) {
      return NextResponse.json({
        error: `You can only have ${API_KEY_CONFIG.MAX_KEYS_PER_USER} API key total. Delete an existing key first.`
      }, { status: 400 })
    }

    // Call the database function to generate the API key
    const { data: keyData, error: keyError } = await supabase
      .rpc('generate_api_key', { p_project_id: projectId })

    if (keyError) {
      console.error("Error generating API key:", keyError)
      return NextResponse.json({ error: "Failed to generate API key" }, { status: 500 })
    }

    // The function returns a TABLE, so keyData is an array of rows
    if (!keyData || keyData.length === 0 || !keyData[0].api_key) {
      console.error("No API key returned from database function", keyData)
      return NextResponse.json({ error: "Failed to generate API key" }, { status: 500 })
    }

    console.log(`API key generated for project ${projectId}`)

    // Return the full API key (this is the ONLY time it will be shown)
    return NextResponse.json({
      success: true,
      apiKey: {
        id: projectId,
        name: name || project.name,
        key: keyData[0].api_key, // Full key returned ONCE (from first row of result)
        created: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error("Error generating API key:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete the API key for a project
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
    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id, api_key_hash")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check if project has an API key
    if (!project.api_key_hash) {
      return NextResponse.json({
        error: "Project does not have an API key"
      }, { status: 400 })
    }

    // Delete the API key by setting hash and prefix to null
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        api_key_hash: null,
        api_key_prefix: null,
        api_key_last_used_at: null
      })
      .eq("id", projectId)
      .eq("user_id", user.id)

    if (updateError) {
      console.error("Error deleting API key:", updateError)
      return NextResponse.json({ error: "Failed to delete API key" }, { status: 500 })
    }

    console.log(`API key deleted for project ${projectId}`)

    return NextResponse.json({
      success: true,
      message: "API key deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting API key:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
