import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { checkLimit, formatLimitError } from "@/lib/limit-checker"
import { CREDIT_COSTS } from "@/lib/constants"
import { buildBrandAssetGenerationPrompt } from "@/lib/prompts/followup/workflows/brand-asset-generation"

const MAX_PROMPT_LENGTH = 500

/**
 * POST - Generate brand assets for a project using AI
 */
export async function POST(request, { params }) {
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
    const body = await request.json()
    const { prompt } = body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json({ error: `Prompt must be ${MAX_PROMPT_LENGTH} characters or less` }, { status: 400 })
    }

    // Verify project ownership and get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, description")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check credit limit for image generation
    const imageGenCredits = CREDIT_COSTS.IMAGE_GENERATION
    const limitCheck = await checkLimit(user.id, 'credits', imageGenCredits, supabase)

    if (!limitCheck.allowed) {
      return NextResponse.json(
        formatLimitError(limitCheck, 'credits'),
        { status: 403 }
      )
    }

    // Initialize Google GenAI
    const genai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_AI_API_KEY
    })

    // Build the full prompt using the stored template for high-quality results
    const fullPrompt = buildBrandAssetGenerationPrompt(
      project.name,
      project.description,
      prompt.trim()
    )

    // Generate image using Gemini 2.5 Flash Image with 16:9 (1344x768) for brand assets
    console.log(`[generate-brand] Generating image for project ${id} with prompt: ${prompt.substring(0, 100)}...`)

    const response = await genai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: fullPrompt,
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    })

    // Extract image from response
    const parts = response?.candidates?.[0]?.content?.parts || []
    let imageData = null

    for (const part of parts) {
      if (part.inlineData) {
        imageData = {
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png'
        }
        break
      }
    }

    if (!imageData) {
      console.error('[generate-brand] No image in response:', JSON.stringify(response, null, 2))
      return NextResponse.json({ error: "AI failed to generate an image. Please try a different prompt." }, { status: 500 })
    }

    // Deduct credits after successful generation
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      let db = supabase
      if (supabaseUrl && serviceKey) {
        const { createClient: createServiceClient } = await import('@supabase/supabase-js')
        db = createServiceClient(supabaseUrl, serviceKey)
      }

      // Check if user already has a token_usage record
      const { data: existingUsage, error: fetchError } = await db
        .from('token_usage')
        .select('id, total_credits, total_tokens, monthly_reset, model')
        .eq('user_id', user.id)
        .maybeSingle()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching existing usage:', fetchError)
        // Continue anyway - image was generated successfully
      }

      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      let newMonthlyResetISO = existingUsage?.monthly_reset || firstDayOfMonth.toISOString()

      // Determine if reset is due
      let isResetDue = false
      if (existingUsage?.monthly_reset) {
        const d = new Date(existingUsage.monthly_reset)
        const plusOne = new Date(d)
        plusOne.setMonth(plusOne.getMonth() + 1)
        isResetDue = now >= plusOne
      }

      let newTotalCredits
      if (!existingUsage || isResetDue) {
        newTotalCredits = imageGenCredits
        newMonthlyResetISO = firstDayOfMonth.toISOString()
      } else {
        newTotalCredits = (existingUsage.total_credits || 0) + imageGenCredits
      }

      if (existingUsage?.id) {
        const { error: updateError } = await db
          .from('token_usage')
          .update({
            total_credits: newTotalCredits,
            monthly_reset: newMonthlyResetISO
          })
          .eq('id', existingUsage.id)
          .eq('user_id', user.id)

        if (updateError) {
          console.error('Error updating credit usage:', updateError)
        } else {
          console.log(`✅ Charged ${imageGenCredits} credit(s) for AI image generation`)
        }
      } else {
        const { error: insertError } = await db
          .from('token_usage')
          .insert({
            user_id: user.id,
            total_credits: imageGenCredits,
            total_tokens: 0,
            model: 'gemini-2.5-flash-image',
            monthly_reset: newMonthlyResetISO
          })

        if (insertError) {
          console.error('Error creating credit usage record:', insertError)
        } else {
          console.log(`✅ Charged ${imageGenCredits} credit(s) for AI image generation`)
        }
      }
    } catch (creditError) {
      console.error('Error charging credit:', creditError)
      // Continue anyway - image was generated successfully
    }

    return NextResponse.json({
      success: true,
      image: imageData
    })

  } catch (error) {
    console.error("Error generating brand image:", error)
    return NextResponse.json({
      error: error.message || "Failed to generate image"
    }, { status: 500 })
  }
}
