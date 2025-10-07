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
        is_active,
        expires_at,
        projects!inner(
          id,
          name,
          description,
          created_at,
          profiles!inner(
            name,
            email
          )
        )
      `)
      .eq("share_token", token)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (shareError || !sharedProject) {
      securityLog('warn', 'Share token not found', {
        token: token?.substring(0, 8) + '...',
        error: shareError?.message,
        userAgent,
        clientIP
      })
      return NextResponse.json({ error: "Share link not found or expired" }, { status: 404 })
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

    // Get project files
    const { data: files, error: filesError } = await supabase
      .from("code_files")
      .select("file_path, content")
      .eq("project_id", sharedProject.project_id)
      .order("file_path")

    if (filesError) {
      console.error("Error fetching project files:", filesError)
      return NextResponse.json({ error: "Failed to fetch project files" }, { status: 500 })
    }

    const processingTime = Date.now() - startTime
    
    securityLog('info', 'Share token accessed successfully', {
      token: token?.substring(0, 8) + '...',
      projectId: sharedProject.project_id,
      fileCount: files?.length || 0,
      processingTime,
      userAgent,
      clientIP
    })

    // Return project details without sensitive information
    return NextResponse.json({
      project: {
        id: sharedProject.projects.id,
        name: sharedProject.projects.name,
        description: sharedProject.projects.description,
        created_at: sharedProject.projects.created_at,
        author: {
          name: sharedProject.projects.profiles.name,
          email: sharedProject.projects.profiles.email
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
        is_active,
        expires_at,
        projects!inner(
          id,
          name,
          description
        )
      `)
      .eq("share_token", token)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (shareError || !sharedProject) {
      return NextResponse.json({ error: "Share link not found or expired" }, { status: 404 })
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

    // Get project files
    const { data: files, error: filesError } = await supabase
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
        id: sharedProject.projects.id,
        name: sharedProject.projects.name,
        description: sharedProject.projects.description
      },
      files: files,
      download_count: sharedProject.download_count + 1
    })

  } catch (error) {
    console.error("Error processing download request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
