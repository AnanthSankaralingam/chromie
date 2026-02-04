import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { checkLimit, formatLimitError } from "@/lib/limit-checker"
import { CREDIT_COSTS } from "@/lib/constants"

const MAX_PROMPT_LENGTH = 500

const buildIconGenerationPrompt = (project, userPrompt) => {
  const name = project?.name ? `Project name: ${project.name}.` : ""
  const description = project?.description ? `Project description: ${project.description}.` : ""
  return [
    "Design a clean, modern, and distinctive Chrome extension icon.",
    name,
    description,
    `User request: ${userPrompt}`,
    "Style: simple, bold, minimal, centered, high contrast, no text, no words, no real-world brand logos.",
    "Output: a single square icon with a 1:1 aspect ratio. Transparent or subtle background."
  ]
    .filter(Boolean)
    .join(" ")
}

/**
 * POST - Generate an extension icon for a project using AI
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

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const trimmedPrompt = prompt.trim()
    if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
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
    const limitCheck = await checkLimit(user.id, "credits", imageGenCredits, supabase)

    if (!limitCheck.allowed) {
      return NextResponse.json(
        formatLimitError(limitCheck, "credits"),
        { status: 403 }
      )
    }

    const genai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_AI_API_KEY
    })

    const fullPrompt = buildIconGenerationPrompt(project, trimmedPrompt)

    console.log(`[generate-icon] Generating icon for project ${id} with prompt: ${trimmedPrompt.substring(0, 100)}...`)

    const response = await genai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: fullPrompt,
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    })

    const parts = response?.candidates?.[0]?.content?.parts || []
    let imageData = null

    for (const part of parts) {
      if (part.inlineData) {
        imageData = {
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || "image/png"
        }
        break
      }
    }

    if (!imageData) {
      console.error("[generate-icon] No image in response:", JSON.stringify(response, null, 2))
      return NextResponse.json({ error: "AI failed to generate an icon. Please try a different prompt." }, { status: 500 })
    }

    // Deduct credits after successful generation
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      let db = supabase
      if (supabaseUrl && serviceKey) {
        const { createClient: createServiceClient } = await import("@supabase/supabase-js")
        db = createServiceClient(supabaseUrl, serviceKey)
      }

      const { data: existingUsage, error: fetchError } = await db
        .from("token_usage")
        .select("id, total_credits, total_tokens, monthly_reset, model")
        .eq("user_id", user.id)
        .maybeSingle()

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error fetching existing usage:", fetchError)
      }

      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      let newMonthlyResetISO = existingUsage?.monthly_reset || firstDayOfMonth.toISOString()

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
          .from("token_usage")
          .update({
            total_credits: newTotalCredits,
            monthly_reset: newMonthlyResetISO
          })
          .eq("id", existingUsage.id)
          .eq("user_id", user.id)

        if (!updateError) {
          console.log(`✅ Charged ${imageGenCredits} credit(s) for AI icon generation`)
        }
      } else {
        const { error: insertError } = await db
          .from("token_usage")
          .insert({
            user_id: user.id,
            total_credits: imageGenCredits,
            total_tokens: 0,
            model: "gemini-2.5-flash-image",
            monthly_reset: newMonthlyResetISO
          })

        if (!insertError) {
          console.log(`✅ Charged ${imageGenCredits} credit(s) for AI icon generation`)
        }
      }
    } catch (creditError) {
      console.error("Error charging credit:", creditError)
    }

    return NextResponse.json({
      success: true,
      image: imageData
    })
  } catch (error) {
    console.error("Error generating icon:", error)
    return NextResponse.json({
      error: error.message || "Failed to generate icon"
    }, { status: 500 })
  }
}
