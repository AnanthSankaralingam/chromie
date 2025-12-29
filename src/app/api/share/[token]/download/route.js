import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import JSZip from "jszip"
import { SHARE_RATE_LIMITS } from "@/lib/constants"
import { 
  validateShareToken, 
  isShareExpired,
  checkRateLimit,
  securityLog, 
  isSuspiciousUserAgent 
} from "@/lib/validation"

// GET: Download the extension zip file (requires authentication)
export async function GET(request, { params }) {
  const startTime = Date.now()
  const supabase = createClient()
  const { token } = params

  // Security logging
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  
  securityLog('info', 'Download attempt', {
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
    securityLog('warn', 'Unauthorized download attempt', {
      token: token?.substring(0, 8) + '...',
      userAgent,
      clientIP,
      error: userError?.message
    })
    return NextResponse.json({ error: "Authentication required to download" }, { status: 401 })
  }

  // Rate limiting for downloads
  const rateLimitKey = `download:${user.id}:${token}`
  const rateLimit = checkRateLimit(rateLimitKey, SHARE_RATE_LIMITS.MAX_DOWNLOADS_PER_SHARE_PER_HOUR, 3600000) // 1 hour window
  
  if (!rateLimit.allowed) {
    securityLog('warn', 'Download rate limit exceeded', {
      userId: user.id,
      token: token?.substring(0, 8) + '...',
      userAgent,
      clientIP,
      remaining: rateLimit.remaining,
      resetTime: rateLimit.resetTime
    })
    return NextResponse.json({ 
      error: "Download rate limit exceeded. Please try again later.",
      retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
    }, { 
      status: 429,
      headers: {
        'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString()
      }
    })
  }

  try {
    // RLS policies now allow public access to shared data

    // Get shared project details
    const { data: sharedProject, error: shareError } = await supabase
      .from("shared_links")
      .select(`
        id,
        project_id,
        created_at,
        download_count,
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
    
    // For now, we'll use a simple approach - check if download count is reasonable
    // In a production environment, you'd want to track downloads per hour more precisely
    if (sharedProject.download_count > SHARE_RATE_LIMITS.MAX_DOWNLOADS_PER_SHARE_PER_HOUR) {
      return NextResponse.json({ 
        error: "Download rate limit exceeded for this share link",
        details: {
          current: sharedProject.download_count,
          limit: SHARE_RATE_LIMITS.MAX_DOWNLOADS_PER_SHARE_PER_HOUR
        }
      }, { status: 429 })
    }

    // Get project files (now works with proper RLS policies)
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

    // Create zip using JSZip (same pattern as project download)
    const zip = new JSZip()

    // Add all non-icon files
    for (const file of files) {
      if (file.file_path.startsWith('icons/')) continue
      zip.file(file.file_path, file.content)
    }

    // Fetch project assets (custom icons and other files) using service role
    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[shared download] Missing Supabase credentials')
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const serviceSupabase = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })

    const { data: projectAssets, error: assetsError } = await serviceSupabase
      .from("project_assets")
      .select("file_path, content_base64")
      .eq("project_id", sharedProject.project_id)

    if (assetsError) {
      console.error('[shared download] Error fetching project assets:', assetsError)
      // Continue without custom assets - not fatal
    }

    // Add all project assets to zip (including custom icons and other files)
    const customAssetPaths = new Set()
    if (projectAssets && projectAssets.length > 0) {
      for (const asset of projectAssets) {
        try {
          const binary = Buffer.from(asset.content_base64, 'base64')
          zip.file(asset.file_path, binary)
          customAssetPaths.add(asset.file_path)
          console.log(`[shared download] Added custom asset: ${asset.file_path}`)
        } catch (e) {
          console.error(`[shared download] Failed to decode asset ${asset.file_path}:`, e.message)
        }
      }
    }

    // Parse manifest for required icon paths
    const manifestFile = files.find(f => f.file_path === 'manifest.json')
    if (!manifestFile) {
      return NextResponse.json({ error: "Manifest file not found" }, { status: 400 })
    }

    let manifest
    try {
      manifest = JSON.parse(manifestFile.content)
    } catch (e) {
      return NextResponse.json({ error: "Invalid manifest.json content" }, { status: 400 })
    }

    // Ensure canonical icon mappings
    // Ensure icons is an object, not a string
    if (!manifest.icons || typeof manifest.icons !== 'object' || Array.isArray(manifest.icons)) {
      manifest.icons = {}
    }
    if (!manifest.icons["16"]) manifest.icons["16"] = "icons/icon16.png"
    if (!manifest.icons["48"]) manifest.icons["48"] = "icons/icon48.png"
    if (!manifest.icons["128"]) manifest.icons["128"] = "icons/icon128.png"

    if (manifest.action) {
      // Ensure default_icon is an object, not a string
      if (!manifest.action.default_icon || typeof manifest.action.default_icon !== 'object' || Array.isArray(manifest.action.default_icon)) {
        manifest.action.default_icon = {}
      }
      if (!manifest.action.default_icon["16"]) manifest.action.default_icon["16"] = "icons/icon16.png"
      if (!manifest.action.default_icon["48"]) manifest.action.default_icon["48"] = "icons/icon48.png"
      if (!manifest.action.default_icon["128"]) manifest.action.default_icon["128"] = "icons/icon128.png"
    }

    // Update manifest in zip
    zip.file('manifest.json', JSON.stringify(manifest, null, 2))

    // Collect required icon paths from manifest and source files
    const requiredIconPaths = new Set()
    // From manifest
    for (const p of Object.values(manifest.icons || {})) {
      if (typeof p === 'string' && p.startsWith('icons/')) requiredIconPaths.add(p)
    }
    if (manifest.action && manifest.action.default_icon) {
      for (const p of Object.values(manifest.action.default_icon)) {
        if (typeof p === 'string' && p.startsWith('icons/')) requiredIconPaths.add(p)
      }
    }
    // From code files: scan for any 'icons/*.png' references, including chrome.runtime.getURL('icons/...')
    const iconRefRegex = /icons\/[A-Za-z0-9-_]+\.png/gi
    for (const f of files) {
      if (typeof f.content !== 'string') continue
      if (f.file_path.startsWith('icons/')) continue
      const matches = f.content.match(iconRefRegex)
      if (matches) {
        for (const m of matches) {
          // Normalize casing in set usage
          const p = m.startsWith('icons/') ? m : `icons/${m}`
          requiredIconPaths.add(p)
        }
      }
    }

    const iconPaths = Array.from(requiredIconPaths)
    // Filter icon paths to only fetch from shared_icons those not already in custom assets
    const iconsToFetchFromShared = iconPaths.filter(p => !customAssetPaths.has(p))
    
    console.log('[shared download] required icon paths', iconPaths)
    console.log('[shared download] custom icons already included:', Array.from(customAssetPaths))
    console.log('[shared download] icons to fetch from shared_icons:', iconsToFetchFromShared)

    // Fetch remaining icons from shared_icons
    if (iconsToFetchFromShared.length > 0) {
      const { data: iconRows, error: iconError } = await serviceSupabase
        .from('shared_icons')
        .select('path_hint, content_base64')
        .in('path_hint', iconsToFetchFromShared)
        .eq('visibility', 'global')

      if (iconError) {
        console.error('[shared download] Failed to fetch shared icons:', iconError)
        return NextResponse.json({ error: "Failed to fetch icons from shared store" }, { status: 500 })
      }

      const iconMap = new Map((iconRows || []).map(r => [r.path_hint, r]))
      const missing = iconsToFetchFromShared.filter(p => !iconMap.has(p))

      if (missing.length > 0) {
        console.error('[shared download] Missing required icons:', missing)
        return NextResponse.json({ 
          error: `Missing required icons: ${missing.join(', ')}. Please contact support.` 
        }, { status: 400 })
      }

      // Add shared icons to zip
      for (const iconPath of iconsToFetchFromShared) {
        const iconRow = iconMap.get(iconPath)
        if (iconRow) {
          try {
            const binary = Buffer.from(iconRow.content_base64, 'base64')
            zip.file(iconPath, binary)
            console.log(`[shared download] Added shared icon: ${iconPath}`)
          } catch (e) {
            console.error(`[shared download] Failed to decode icon ${iconPath}:`, e.message)
            return NextResponse.json({ error: `Failed to process icon ${iconPath}` }, { status: 500 })
          }
        }
      }
    }

    // Generate zip buffer
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })

    // Increment download count
    const { error: updateError } = await supabase
      .from("shared_projects")
      .update({ download_count: sharedProject.download_count + 1 })
      .eq("id", sharedProject.id)

    if (updateError) {
      console.error("Error updating download count:", updateError)
      // Don't fail the request for this
    }

    // Create safe filename
    const safeProjectName = project.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()
    const filename = `chromie-shared-${safeProjectName}.zip`

    const processingTime = Date.now() - startTime
    
    securityLog('info', 'Download completed successfully', {
      userId: user.id,
      token: token?.substring(0, 8) + '...',
      projectId: sharedProject.project_id,
      filename,
      fileSize: zipBuffer.length,
      processingTime,
      userAgent,
      clientIP
    })

    // Return zip file
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    
    securityLog('error', 'Download failed', {
      userId: user?.id,
      token: token?.substring(0, 8) + '...',
      error: error.message,
      stack: error.stack,
      processingTime,
      userAgent,
      clientIP
    })
    
    console.error("Error processing download:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
