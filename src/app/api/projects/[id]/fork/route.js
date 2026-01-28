import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { securityLog } from "@/lib/validation"
import { checkLimit, formatLimitError } from "@/lib/limit-checker"

export async function POST(request, { params }) {
  const startTime = Date.now()
  const supabase = createClient()
  const { id: projectId } = params

  // Security logging
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

  securityLog('info', 'Fork own project attempt', {
    projectId: projectId?.substring(0, 8) + '...',
    userAgent,
    clientIP,
    timestamp: new Date().toISOString()
  })

  // Authenticate user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    securityLog('warn', 'Unauthorized fork attempt', {
      projectId: projectId?.substring(0, 8) + '...',
      userAgent,
      clientIP
    })
    return NextResponse.json({ error: "Authentication required to fork" }, { status: 401 })
  }

  try {
    // Get original project details and verify ownership
    const { data: originalProject, error: projectError } = await supabase
      .from("projects")
      .select(`
        id,
        name,
        description,
        initial_prompt,
        user_id
      `)
      .eq("id", projectId)
      .single()

    if (projectError || !originalProject) {
      securityLog('warn', 'Project not found for fork', {
        projectId: projectId?.substring(0, 8) + '...',
        error: projectError?.message,
        userId: user.id,
        userAgent,
        clientIP
      })
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Verify user owns the project
    if (originalProject.user_id !== user.id) {
      securityLog('warn', 'Unauthorized fork attempt - not owner', {
        projectId: projectId?.substring(0, 8) + '...',
        userId: user.id,
        projectOwnerId: originalProject.user_id,
        userAgent,
        clientIP
      })
      return NextResponse.json({ error: "You can only fork your own projects" }, { status: 403 })
    }

    // Ensure the user has a profile
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, project_count")
      .eq("id", user.id)
      .single()

    if (!existingProfile) {
      console.log("Creating profile for user:", user.id)
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

    // Check project limit
    const limitCheck = await checkLimit(user.id, 'projects', 1, supabase)

    if (!limitCheck.allowed) {
      console.log(`User ${user.id} has reached project limit: ${limitCheck.currentUsage}/${limitCheck.limit} on ${limitCheck.plan} plan`)
      securityLog('info', 'Fork blocked by project limit', {
        userId: user.id,
        projectId: projectId?.substring(0, 8) + '...',
        currentUsage: limitCheck.currentUsage,
        limit: limitCheck.limit,
        plan: limitCheck.plan
      })
      return NextResponse.json(
        formatLimitError(limitCheck, 'projects'),
        { status: 403 }
      )
    }

    // Generate forked project name
    const timestamp = Date.now()
    const forkedName = `${originalProject.name} (Fork)`

    // Check for name collision
    const { data: existingProjects } = await supabase
      .from("projects")
      .select("name")
      .eq("user_id", user.id)
      .eq("name", forkedName)

    const finalName = existingProjects && existingProjects.length > 0
      ? `${originalProject.name} (Fork ${timestamp})`
      : forkedName

    console.log("Creating forked project:", finalName)

    // Create forked project
    const { data: newProject, error: createError } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: finalName,
        description: originalProject.description,
        initial_prompt: originalProject.initial_prompt || null,
        created_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
        archived: false,
        has_generated_code: true, // Forked projects have code from the original
      })
      .select()
      .single()

    if (createError || !newProject) {
      console.error("Error creating forked project:", createError)
      return NextResponse.json({ error: "Failed to create forked project" }, { status: 500 })
    }

    console.log("Successfully created forked project:", newProject.id)

    // Get all files from original project
    const { data: originalFiles, error: filesError } = await supabase
      .from("code_files")
      .select("file_path, content")
      .eq("project_id", projectId)
      .order("file_path")

    if (filesError) {
      console.error("Error fetching original files:", filesError)
      // Clean up created project
      await supabase.from("projects").delete().eq("id", newProject.id)
      return NextResponse.json({ error: "Failed to fetch project files" }, { status: 500 })
    }

    if (!originalFiles || originalFiles.length === 0) {
      console.error("No files found in project")
      // Clean up created project
      await supabase.from("projects").delete().eq("id", newProject.id)
      return NextResponse.json({ error: "No files found in project" }, { status: 404 })
    }

    console.log(`Copying ${originalFiles.length} files to forked project`)

    // Copy all files to new project
    const filesToInsert = originalFiles.map(file => ({
      project_id: newProject.id,
      file_path: file.file_path,
      content: file.content,
      last_used_at: new Date().toISOString(),
    }))

    const { error: insertError } = await supabase
      .from("code_files")
      .upsert(filesToInsert, { onConflict: 'project_id,file_path' })

    if (insertError) {
      console.error("Error copying files:", insertError)
      // Clean up created project (cascade will delete any inserted files)
      await supabase.from("projects").delete().eq("id", newProject.id)
      return NextResponse.json({ error: "Failed to copy project files" }, { status: 500 })
    }

    // Copy project assets (custom icons and other files) using service role
    let assetCount = 0
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const serviceSupabase = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false }
        })

        const { data: originalAssets, error: assetsError } = await serviceSupabase
          .from("project_assets")
          .select("file_path, content_base64, file_type, mime_type, file_size")
          .eq("project_id", projectId)

        if (assetsError) {
          console.error("Error fetching original assets:", assetsError)
          // Don't fail the fork for missing assets - they're optional
        } else if (originalAssets && originalAssets.length > 0) {
          console.log(`Copying ${originalAssets.length} assets to forked project`)

          const assetsToInsert = originalAssets.map(asset => ({
            project_id: newProject.id,
            file_path: asset.file_path,
            content_base64: asset.content_base64,
            file_type: asset.file_type,
            mime_type: asset.mime_type,
            file_size: asset.file_size,
          }))

          const { error: assetsInsertError } = await supabase
            .from("project_assets")
            .upsert(assetsToInsert, { onConflict: 'project_id,file_path' })

          if (assetsInsertError) {
            console.error("Error copying assets:", assetsInsertError)
            // Don't fail the fork - assets are nice to have but not critical
          } else {
            assetCount = originalAssets.length
            console.log(`✅ Copied ${assetCount} assets to forked project`)
          }
        }
      }
    } catch (assetsError) {
      console.error("Error in asset copying:", assetsError)
      // Continue - assets are optional
    }

    const processingTime = Date.now() - startTime

    securityLog('info', 'Fork own project completed successfully', {
      userId: user.id,
      originalProjectId: originalProject.id,
      newProjectId: newProject.id,
      fileCount: originalFiles.length,
      assetCount,
      processingTime,
      userAgent,
      clientIP
    })

    console.log(`✅ Forked project ${originalProject.id} to ${newProject.id} with ${originalFiles.length} files and ${assetCount} assets in ${processingTime}ms`)

    // Return success with new project details
    return NextResponse.json({
      success: true,
      project: {
        id: newProject.id,
        name: newProject.name,
        description: newProject.description,
        fileCount: originalFiles.length,
        assetCount
      },
      message: "Project forked successfully"
    }, { status: 201 })

  } catch (error) {
    const processingTime = Date.now() - startTime

    securityLog('error', 'Fork own project failed', {
      userId: user?.id,
      projectId: projectId?.substring(0, 8) + '...',
      error: error.message,
      stack: error.stack,
      processingTime,
      userAgent,
      clientIP
    })

    console.error("Error forking project:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

