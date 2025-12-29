import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import {
  validateShareToken,
  isShareExpired,
  securityLog,
  isSuspiciousUserAgent
} from "@/lib/validation"
import { checkLimit, formatLimitError } from "@/lib/limit-checker"

export async function POST(request, { params }) {
  const startTime = Date.now()
  const supabase = createClient()
  const { token } = params

  // Security logging
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

  securityLog('info', 'Fork attempt', {
    token: token?.substring(0, 8) + '...',
    userAgent,
    clientIP,
    timestamp: new Date().toISOString()
  })

  // Validate token format
  const tokenValidation = validateShareToken(token)
  if (!tokenValidation.isValid) {
    securityLog('warn', 'Invalid share token format for fork', {
      token: token?.substring(0, 8) + '...',
      error: tokenValidation.error,
      userAgent,
      clientIP
    })
    return NextResponse.json({ error: tokenValidation.error }, { status: 400 })
  }

  // Check for suspicious user agent
  if (isSuspiciousUserAgent(userAgent)) {
    securityLog('warn', 'Suspicious user agent attempting fork', {
      userAgent,
      clientIP,
      token: token?.substring(0, 8) + '...'
    })
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  // Authenticate user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    securityLog('warn', 'Unauthorized fork attempt', {
      token: token?.substring(0, 8) + '...',
      userAgent,
      clientIP
    })
    return NextResponse.json({ error: "Authentication required to fork" }, { status: 401 })
  }

  try {
    // Get shared project details (check if not expired)
    const { data: sharedProject, error: shareError } = await supabase
      .from("shared_links")
      .select(`
        id,
        project_id,
        created_at,
        is_active,
        expires_at
      `)
      .eq("share_token", token)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (shareError || !sharedProject) {
      securityLog('warn', 'Share token not found for fork', {
        token: token?.substring(0, 8) + '...',
        error: shareError?.message,
        userAgent,
        clientIP
      })
      return NextResponse.json({ error: "Share link not found or expired" }, { status: 404 })
    }

    // Check if share has expired
    if (isShareExpired(sharedProject.expires_at)) {
      securityLog('info', 'Expired share token fork attempt', {
        token: token?.substring(0, 8) + '...',
        expiresAt: sharedProject.expires_at,
        userAgent,
        clientIP
      })
      return NextResponse.json({ error: "Share link has expired" }, { status: 410 })
    }

    // Get original project details
    const { data: originalProject, error: projectError } = await supabase
      .from("projects")
      .select(`
        id,
        name,
        description
      `)
      .eq("id", sharedProject.project_id)
      .single()

    if (projectError || !originalProject) {
      securityLog('warn', 'Project not found for fork', {
        token: token?.substring(0, 8) + '...',
        projectId: sharedProject.project_id,
        error: projectError?.message,
        userAgent,
        clientIP
      })
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
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
        token: token?.substring(0, 8) + '...',
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
        created_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
        archived: false,
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
      .eq("project_id", sharedProject.project_id)
      .order("file_path")

    if (filesError) {
      console.error("Error fetching original files:", filesError)
      // Clean up created project
      await supabase.from("projects").delete().eq("id", newProject.id)
      return NextResponse.json({ error: "Failed to fetch project files" }, { status: 500 })
    }

    if (!originalFiles || originalFiles.length === 0) {
      console.error("No files found in shared project")
      // Clean up created project
      await supabase.from("projects").delete().eq("id", newProject.id)
      return NextResponse.json({ error: "No files found in shared project" }, { status: 404 })
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
          .eq("project_id", sharedProject.project_id)

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

    securityLog('info', 'Fork completed successfully', {
      userId: user.id,
      token: token?.substring(0, 8) + '...',
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

    securityLog('error', 'Fork failed', {
      userId: user?.id,
      token: token?.substring(0, 8) + '...',
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
