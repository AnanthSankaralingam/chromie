import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { 
  validateShareToken, 
  isShareExpired,
  securityLog, 
  isSuspiciousUserAgent 
} from "@/lib/validation"

// GET: Get project details for a share token (public access)
export async function GET(request, { params }) {
  const startTime = Date.now()
  const supabase = createClient()
  const { token } = params

  // Security logging
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  
  securityLog('info', 'Share token access attempt', {
    token: token?.substring(0, 8) + '...', // Log partial token for security
    userAgent,
    clientIP,
    timestamp: new Date().toISOString()
  })

  // Validate token format
  const tokenValidation = validateShareToken(token)
  if (!tokenValidation.isValid) {
    securityLog('warn', 'Invalid share token format', {
      token: token?.substring(0, 8) + '...',
      error: tokenValidation.error,
      userAgent,
      clientIP
    })
    return NextResponse.json({ error: tokenValidation.error }, { status: 400 })
  }

  // Check for suspicious user agent
  if (isSuspiciousUserAgent(userAgent)) {
    securityLog('warn', 'Suspicious user agent accessing share', {
      userAgent,
      clientIP,
      token: token?.substring(0, 8) + '...'
    })
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  try {
    // Get shared project details (check if not expired)
    const { data: sharedProject, error: shareError } = await supabase
      .from("shared_links")
      .select(`
        id,
        project_id,
        created_at,
        download_count,
        view_count,
        is_active,
        expires_at
      `)
      .eq("share_token", token)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .single()

    console.log("sharedProject", sharedProject)
    console.log("shareError", shareError)

    if (shareError || !sharedProject) {
      securityLog('warn', 'Share token not found', {
        token: token?.substring(0, 8) + '...',
        error: shareError?.message,
        userAgent,
        clientIP
      })
      return NextResponse.json({ error: "Share link not found or expired" }, { status: 404 })
    }

    // Get project details (now works with proper RLS policies)
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(`
        id,
        name,
        description,
        created_at,
        user_id
      `)
      .eq("id", sharedProject.project_id)
      .single()

    if (projectError || !project) {
      securityLog('warn', 'Project not found for share token', {
        token: token?.substring(0, 8) + '...',
        projectId: sharedProject.project_id,
        error: projectError?.message,
        userAgent,
        clientIP
      })
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Get profile details (now works with proper RLS policies)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        name,
        email
      `)
      .eq("id", project.user_id)
      .single()

    if (profileError || !profile) {
      securityLog('warn', 'Profile not found for project', {
        token: token?.substring(0, 8) + '...',
        projectId: sharedProject.project_id,
        userId: project.user_id,
        error: profileError?.message,
        userAgent,
        clientIP
      })
      return NextResponse.json({ error: "Author information not found" }, { status: 404 })
    }

    // Check if share has expired
    if (isShareExpired(sharedProject.expires_at)) {
      securityLog('info', 'Expired share token accessed', {
        token: token?.substring(0, 8) + '...',
        expiresAt: sharedProject.expires_at,
        userAgent,
        clientIP
      })
      return NextResponse.json({ error: "Share link has expired" }, { status: 410 })
    }

    // Get project files (now works with proper RLS policies)
    const { data: files, error: filesError } = await supabase
      .from("code_files")
      .select("file_path, content")
      .eq("project_id", sharedProject.project_id)
      .order("file_path")

    console.log("Files query result:", { files: files?.length || 0, filesError })
    
    if (filesError) {
      console.error("Error fetching project files:", filesError)
      return NextResponse.json({ error: "Failed to fetch project files" }, { status: 500 })
    }

    // Update view count and last accessed timestamp
    const { error: updateError } = await supabase
      .from("shared_links")
      .update({
        view_count: sharedProject.view_count ? sharedProject.view_count + 1 : 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq("id", sharedProject.id)

    if (updateError) {
      console.error("Error updating share access stats:", updateError)
      // Don't fail the request for this
    }

    const processingTime = Date.now() - startTime

    securityLog('info', 'Share token accessed successfully', {
      token: token?.substring(0, 8) + '...',
      projectId: sharedProject.project_id,
      fileCount: files?.length || 0,
      viewCount: sharedProject.view_count + 1,
      processingTime,
      userAgent,
      clientIP
    })

    // Return project details without sensitive information
    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        created_at: project.created_at,
        author: {
          name: profile.name,
          email: profile.email
        }
      },
      files: files || [],
      share_info: {
        created_at: sharedProject.created_at,
        download_count: sharedProject.download_count,
        share_url: `${process.env.NEXT_PUBLIC_APP_URL}/share/${token}`
      }
    })

  } catch (error) {
    console.error("Error fetching shared project:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST: Download extension zip for a share token (requires auth)
export async function POST(request, { params }) {
  const startTime = Date.now()
  const supabase = createClient()
  const { token } = params

  // Security logging
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  
  securityLog('info', 'Download request attempt', {
    token: token?.substring(0, 8) + '...',
    userAgent,
    clientIP,
    timestamp: new Date().toISOString()
  })

  // Validate token format
  const tokenValidation = validateShareToken(token)
  if (!tokenValidation.isValid) {
    securityLog('warn', 'Invalid share token format for download', {
      token: token?.substring(0, 8) + '...',
      error: tokenValidation.error,
      userAgent,
      clientIP
    })
    return NextResponse.json({ error: tokenValidation.error }, { status: 400 })
  }

  // Check for suspicious user agent
  if (isSuspiciousUserAgent(userAgent)) {
    securityLog('warn', 'Suspicious user agent attempting download', {
      userAgent,
      clientIP,
      token: token?.substring(0, 8) + '...'
    })
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Authentication required to download" }, { status: 401 })
  }

  try {
    // Get shared project details (check if not expired)
    const { data: sharedProject, error: shareError } = await supabase
      .from("shared_links")
      .select(`
        id,
        project_id,
        created_at,
        download_count,
        view_count,
        is_active,
        expires_at
      `)
      .eq("share_token", token)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (shareError || !sharedProject) {
      return NextResponse.json({ error: "Share link not found or expired" }, { status: 404 })
    }

    // Get project details (now works with proper RLS policies)
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(`
        id,
        name,
        description
      `)
      .eq("id", sharedProject.project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check if share has expired
    if (sharedProject.expires_at && new Date() > new Date(sharedProject.expires_at)) {
      return NextResponse.json({ error: "Share link has expired" }, { status: 410 })
    }

    // Increment download count
    const { error: updateError } = await supabase
      .from("shared_links")
      .update({ download_count: sharedProject.download_count + 1 })
      .eq("id", sharedProject.id)

    if (updateError) {
      console.error("Error updating download count:", updateError)
      // Don't fail the request for this
    }

    // Get project files (using service role to bypass RLS)
    const { data: files, error: filesError } = await serviceSupabase
      .from("code_files")
      .select("file_path, content")
      .eq("project_id", sharedProject.project_id)
      .order("file_path")

    if (filesError) {
      console.error("Error fetching project files:", filesError)
      return NextResponse.json({ error: "Failed to fetch project files" }, { status: 500 })
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files found for this project" }, { status: 404 })
    }

    // Return project data for zip generation
    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description
      },
      files: files,
      download_count: sharedProject.download_count + 1
    })

  } catch (error) {
    console.error("Error processing download request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
