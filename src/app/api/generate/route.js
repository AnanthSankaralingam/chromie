import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateExtension } from "@/lib/openai-service"
import { REQUEST_TYPES } from "@/lib/prompts/old-prompts"
import { PLAN_LIMITS, DEFAULT_PLAN } from "@/lib/constants"
import { randomUUID } from "crypto"
import fs from "fs"
import path from "path"

export async function POST(request) {
  const supabase = createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { prompt, projectId, requestType = REQUEST_TYPES.NEW_EXTENSION } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
    }

    // Verify project ownership
    if (projectId) {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single()

      if (projectError || !project) {
        return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
      }
    }

    console.log(":", prompt)

    // Check user's plan and token usage limits
    const { data: billing, error: billingError } = await supabase
      .from('billing')
      .select('plan')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const userPlan = billing?.plan || DEFAULT_PLAN
    const planLimit = PLAN_LIMITS[userPlan] || PLAN_LIMITS[DEFAULT_PLAN]

    // Fetch global per-user token usage with monthly reset logic
    const { data: existingUsage } = await supabase
      .from('token_usage')
      .select('id, total_tokens, monthly_reset, model')
      .eq('user_id', user.id)
      .maybeSingle()

    console.log('Existing token usage from database:', existingUsage)

    const now = new Date()
    // If no monthly_reset exists, calculate it as beginning of current month
    let effectiveMonthlyReset = existingUsage?.monthly_reset
    if (!effectiveMonthlyReset) {
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      effectiveMonthlyReset = firstDayOfMonth.toISOString()
    }
    
    const monthlyResetDate = effectiveMonthlyReset ? new Date(effectiveMonthlyReset) : null
    let resetDatePlusOneMonth = null
    if (monthlyResetDate) {
      resetDatePlusOneMonth = new Date(monthlyResetDate)
      resetDatePlusOneMonth.setMonth(resetDatePlusOneMonth.getMonth() + 1)
    }

    const isResetDue = monthlyResetDate ? now >= resetDatePlusOneMonth : false
    const effectiveTokensUsed = isResetDue ? 0 : (existingUsage?.total_tokens || 0)

    console.log(`User plan: ${userPlan}, Limit: ${planLimit}, Used (effective): ${effectiveTokensUsed}`)
    console.log(`Monthly reset date: ${monthlyResetDate?.toISOString()}, Reset due: ${isResetDue}`)

    // Check if user has exceeded their limit (unless unlimited)
    if (planLimit !== -1 && effectiveTokensUsed >= planLimit) {
      return NextResponse.json({
        error: "Token usage limit exceeded for your plan. Please upgrade to continue generating extensions."
      }, { status: 403 })
    }

    // Get existing files if this is an add-to-existing request
    let existingFiles = {}
    if (requestType === REQUEST_TYPES.ADD_TO_EXISTING && projectId) {
      console.log("🔧 Add-to-existing request - fetching existing project files...")
      const { data: files } = await supabase.from("code_files").select("file_path, content").eq("project_id", projectId)

      if (files) {
        existingFiles = files.reduce((acc, file) => {
          acc[file.file_path] = file.content
          return acc
        }, {})
        console.log(`📁 Found ${Object.keys(existingFiles).length} existing files: ${Object.keys(existingFiles).join(', ')}`)
      } else {
        console.log("⚠️ No existing files found for add-to-existing request")
      }
    } else if (requestType === REQUEST_TYPES.NEW_EXTENSION) {
      console.log("🆕 New extension request - no existing files needed")
    }

    // Generate extension code using OpenAI
    console.log(`🚀 Calling generateExtension with request type: ${requestType}`)
    console.log(`📝 Feature request: ${prompt}`)
    console.log(`📁 Existing files count: ${Object.keys(existingFiles).length}`)
    
    const result = await generateExtension({
      featureRequest: prompt,
      requestType,
      sessionId: projectId,
      existingFiles,
      userProvidedUrl: null, // Add this parameter for future use
    })

    // Handle URL prompt requirement
    if (!result.success && result.requiresUrl) {
      return NextResponse.json({
        requiresUrl: true,
        message: result.message,
        detectedSites: result.detectedSites,
        detectedUrls: result.detectedUrls,
        featureRequest: result.featureRequest,
        requestType: result.requestType
      })
    }

    if (!result.success) {
      return NextResponse.json({ error: "Failed to generate extension code" }, { status: 500 })
    }

    console.log('Generate extension result:', {
      success: result.success,
      hasTokenUsage: !!result.tokenUsage,
      tokenUsageKeys: result.tokenUsage ? Object.keys(result.tokenUsage) : null,
      filesCount: result.files ? Object.keys(result.files).length : 0
    })

    // Do not update token usage here anymore. The client will call POST /api/token-usage with result.tokenUsage
    if (!result.tokenUsage) {
      console.log('⚠️ No token usage data received from generateExtension function')
    }

    // Save generated files to database - handle each file individually
    const savedFiles = []
    const errors = []

    // Automatically include icons folder for all extensions
    const iconsDir = path.join(process.cwd(), 'icons')
    const iconFiles = []
    
    try {
      if (fs.existsSync(iconsDir)) {
        const iconFilesList = fs.readdirSync(iconsDir)
        for (const iconFile of iconFilesList) {
          if (iconFile.endsWith('.png') || iconFile.endsWith('.ico')) {
            const iconPath = path.join(iconsDir, iconFile)
            const iconContent = fs.readFileSync(iconPath)
            iconFiles.push({
              file_path: `icons/${iconFile}`,
              content: iconContent.toString('base64') // Store as base64 for binary files
            })
            console.log(`Including icon: ${iconFile} (${Math.round(iconContent.length / 1024)}KB)`)
          }
        }
        console.log(`✅ Successfully included ${iconFiles.length} icon files in extension`)
      } else {
        console.warn('⚠️ Icons directory not found at:', iconsDir)
      }
    } catch (iconError) {
      console.warn('⚠️ Could not read icons directory:', iconError.message)
    }

    // Combine generated files with icons
    const allFiles = { ...result.files }
    iconFiles.forEach(icon => {
      allFiles[icon.file_path] = icon.content
    })

    for (const [filePath, content] of Object.entries(allFiles)) {
      try {
        // First, try to update existing file
        const { data: existingFile } = await supabase
          .from("code_files")
          .select("id")
          .eq("project_id", projectId)
          .eq("file_path", filePath)
          .single()

        if (existingFile) {
          // Update existing file
          const { error: updateError } = await supabase
            .from("code_files")
            .update({
              content: content,
              last_used_at: new Date().toISOString(),
            })
            .eq("id", existingFile.id)

          if (updateError) {
            console.error(`Error updating file ${filePath}:`, updateError)
            errors.push({ filePath, error: updateError })
          } else {
            savedFiles.push(filePath)
          }
        } else {
          // Insert new file
          const { error: insertError } = await supabase
            .from("code_files")
            .insert({
              id: randomUUID(),
              project_id: projectId,
              file_path: filePath,
              content: content,
              last_used_at: new Date().toISOString(),
            })

          if (insertError) {
            console.error(`Error inserting file ${filePath}:`, insertError)
            errors.push({ filePath, error: insertError })
          } else {
            savedFiles.push(filePath)
          }
        }
      } catch (fileError) {
        console.error(`Exception handling file ${filePath}:`, fileError)
        errors.push({ filePath, error: fileError })
      }
    }

    if (errors.length > 0) {
      console.error("Errors saving files:", errors)
      return NextResponse.json({ 
        error: "Failed to save some generated files", 
        details: errors,
        savedFiles 
      }, { status: 500 })
    }

    // Update project data
    let projectUpdateData = {
      last_used_at: new Date().toISOString(),
    }

    // Try to extract extension name from manifest.json
    if (allFiles['manifest.json']) {
      try {
        const manifestContent = allFiles['manifest.json']
        const manifest = JSON.parse(manifestContent)
        
        if (manifest.name && manifest.name.trim()) {
          projectUpdateData.name = manifest.name.trim()
          console.log(`Updating project name to: ${manifest.name}`)
        }
        
        if (manifest.description && manifest.description.trim()) {
          projectUpdateData.description = manifest.description.trim()
          console.log(`Updating project description to: ${manifest.description}`)
        }
      } catch (parseError) {
        console.warn('Could not parse manifest.json for project update:', parseError.message)
      }
    }

    // Update project with generation info and extension details
    const { error: projectUpdateError } = await supabase
      .from("projects")
      .update(projectUpdateData)
      .eq("id", projectId)

    if (projectUpdateError) {
      console.error('Error updating project with extension info:', projectUpdateError)
    } else {
      console.log('✅ Project updated successfully with extension info')
    }

    console.log(`✅ Code generation completed successfully. Generated ${savedFiles.length} files.`)
    
    return NextResponse.json({
      success: true,
      explanation: result.explanation,
      files: savedFiles,
      filesGenerated: savedFiles.length,
      tokenUsage: result.tokenUsage || null,
    })
  } catch (error) {
    console.error("Error generating extension:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
