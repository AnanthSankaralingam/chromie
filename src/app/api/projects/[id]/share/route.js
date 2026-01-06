import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { SHARE_RATE_LIMITS } from "@/lib/constants"
import { 
  validateProjectId, 
  checkRateLimit, 
  securityLog, 
  isSuspiciousUserAgent,
  generateSecureToken 
} from "@/lib/validation"

// Generate a secure random token
function generateShareToken() {
  return generateSecureToken(32)
}

// POST: Generate new share link for a project
export async function POST(request, { params }) {
  const startTime = Date.now()
  const supabase = createClient()
  const { id: projectId } = params

  // Security logging
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  
  securityLog('info', 'Share link creation attempt', {
    projectId,
    userAgent,
    clientIP,
    timestamp: new Date().toISOString()
  })

  // Validate project ID
  const projectValidation = validateProjectId(projectId)
  if (!projectValidation.isValid) {
    securityLog('warn', 'Invalid project ID format', {
      projectId,
      error: projectValidation.error,
      userAgent,
      clientIP
    })
    return NextResponse.json({ error: projectValidation.error }, { status: 400 })
  }

  // Check for suspicious user agent
  if (isSuspiciousUserAgent(userAgent)) {
    securityLog('warn', 'Suspicious user agent detected', {
      userAgent,
      clientIP,
      projectId
    })
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    securityLog('warn', 'Unauthorized share creation attempt', {
      projectId,
      userAgent,
      clientIP,
      error: userError?.message
    })
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate limiting
  const rateLimitKey = `share:${user.id}`
  const rateLimit = checkRateLimit(rateLimitKey, SHARE_RATE_LIMITS.MAX_SHARES_PER_USER, 60000) // 1 minute window
  
  if (!rateLimit.allowed) {
    securityLog('warn', 'Rate limit exceeded for share creation', {
      userId: user.id,
      projectId,
      userAgent,
      clientIP,
      remaining: rateLimit.remaining,
      resetTime: rateLimit.resetTime
    })
    return NextResponse.json({ 
      error: "Rate limit exceeded. Please try again later.",
      retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
    }, { 
      status: 429,
      headers: {
        'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString()
      }
    })
  }

  try {
    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, description")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
    }

    // Check if share already exists and is not expired
    const { data: existingShare } = await supabase
      .from("shared_links")
      .select("id, share_token, created_at, view_count, download_count, is_active, expires_at")
      .eq("project_id", projectId)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (existingShare) {
      return NextResponse.json({
        share: {
          id: existingShare.id,
          share_token: existingShare.share_token,
          created_at: existingShare.created_at,
          view_count: existingShare.view_count || 0,
          download_count: existingShare.download_count || 0,
          expires_at: existingShare.expires_at,
          share_url: `${process.env.NEXT_PUBLIC_APP_URL}/share/${existingShare.share_token}`
        }
      })
    }

    // Check user's active share count
    const { data: userProjects } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", user.id)

    if (!userProjects || userProjects.length === 0) {
      return NextResponse.json({ error: "No projects found for user" }, { status: 404 })
    }

    const projectIds = userProjects.map(p => p.id)
    
    const { data: userShares, error: sharesCountError } = await supabase
      .from("shared_links")
      .select("id")
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .in("project_id", projectIds)

    if (sharesCountError) {
      console.error("Error checking user share count:", sharesCountError)
      return NextResponse.json({ error: "Failed to check share limits" }, { status: 500 })
    }

    if (userShares && userShares.length >= SHARE_RATE_LIMITS.MAX_SHARES_PER_USER) {
      return NextResponse.json({ 
        error: "Maximum number of active shares reached",
        details: {
          current: userShares.length,
          limit: SHARE_RATE_LIMITS.MAX_SHARES_PER_USER
        }
      }, { status: 403 })
    }

    // Generate new share token
    const shareToken = generateShareToken()

    // Create new share
    const { data: share, error: shareError } = await supabase
      .from("shared_links")
      .insert({
        project_id: projectId,
        user_id: user.id,
        share_token: shareToken,
        is_active: true,
        download_count: 0,
        view_count: 0
      })
      .select("id, share_token, created_at, view_count, download_count, expires_at")
      .single()

    if (shareError) {
      console.error("Error creating share:", shareError)
      return NextResponse.json({ error: "Failed to create share link" }, { status: 500 })
    }

    const processingTime = Date.now() - startTime
    
    securityLog('info', 'Share link created successfully', {
      userId: user.id,
      projectId,
      shareId: share.id,
      shareToken: share.share_token,
      processingTime,
      userAgent,
      clientIP
    })
    
    return NextResponse.json({
      share: {
        id: share.id,
        share_token: share.share_token,
        created_at: share.created_at,
        view_count: share.view_count || 0,
        download_count: share.download_count || 0,
        expires_at: share.expires_at,
        share_url: `${process.env.NEXT_PUBLIC_APP_URL}/share/${share.share_token}`
      }
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    
    securityLog('error', 'Share creation failed', {
      userId: user?.id,
      projectId,
      error: error.message,
      stack: error.stack,
      processingTime,
      userAgent,
      clientIP
    })
    
    console.error("Error creating share:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET: Get existing share link for a project
export async function GET(request, { params }) {
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
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
    }

    // Get existing share (check if not expired)
    const { data: share, error: shareError } = await supabase
      .from("shared_links")
      .select("id, share_token, created_at, download_count, view_count, last_accessed_at, is_active, expires_at")
      .eq("project_id", projectId)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (shareError || !share) {
      return NextResponse.json({ error: "No active share found" }, { status: 404 })
    }

    return NextResponse.json({
      share: {
        id: share.id,
        share_token: share.share_token,
        created_at: share.created_at,
        download_count: share.download_count,
        view_count: share.view_count || 0,
        last_accessed_at: share.last_accessed_at,
        is_active: share.is_active,
        expires_at: share.expires_at,
        share_url: `${process.env.NEXT_PUBLIC_APP_URL}/share/${share.share_token}`
      }
    })

  } catch (error) {
    console.error("Error fetching share:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE: Revoke existing share link
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
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
    }

    // Deactivate share (soft delete)
    const { error: revokeError } = await supabase
      .from("shared_links")
      .update({ is_active: false })
      .eq("project_id", projectId)
      .eq("is_active", true)

    if (revokeError) {
      console.error("Error revoking share:", revokeError)
      return NextResponse.json({ error: "Failed to revoke share" }, { status: 500 })
    }

    console.log(`Share revoked for project ${projectId} by user ${user.id}`)
    return NextResponse.json({ success: true, message: "Share link revoked successfully" })

  } catch (error) {
    console.error("Error revoking share:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
