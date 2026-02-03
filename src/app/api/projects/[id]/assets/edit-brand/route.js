import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { checkLimit, formatLimitError } from "@/lib/limit-checker"
import { CREDIT_COSTS } from "@/lib/constants"

const MAX_EDIT_PROMPT_LENGTH = 500

/**
 * POST - Edit an existing brand asset image using AI (chats API)
 * Sends current image + edit instruction; returns updated image.
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
    const { imageBase64, imageMimeType, editInstruction } = body

    if (!imageBase64 || typeof imageBase64 !== "string" || imageBase64.trim().length === 0) {
      return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 })
    }

    if (!editInstruction || typeof editInstruction !== "string" || editInstruction.trim().length === 0) {
      return NextResponse.json({ error: "editInstruction is required" }, { status: 400 })
    }

    const trimmedInstruction = editInstruction.trim()
    if (trimmedInstruction.length > MAX_EDIT_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `editInstruction must be ${MAX_EDIT_PROMPT_LENGTH} characters or less` },
        { status: 400 }
      )
    }

    const mimeType = imageMimeType && typeof imageMimeType === "string" ? imageMimeType : "image/png"

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const imageGenCredits = CREDIT_COSTS.IMAGE_GENERATION
    const limitCheck = await checkLimit(user.id, "credits", imageGenCredits, supabase)

    if (!limitCheck.allowed) {
      return NextResponse.json(formatLimitError(limitCheck, "credits"), { status: 403 })
    }

    const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY })

    // Create chat with image-generation config (same as doc: responseModalities + imageConfig)
    const chat = genai.chats.create({
      model: "gemini-2.5-flash-image",
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    })

    // Send message: current image + edit instruction (model edits in context)
    const messageParts = [
      {
        inlineData: {
          data: imageBase64,
          mimeType,
        },
      },
      `Apply these changes to this brand asset image. Do not change the overall composition unless the user asks. ${trimmedInstruction}`,
    ]

    console.log(`[edit-brand] Editing image for project ${id}, instruction: ${trimmedInstruction.substring(0, 80)}...`)

    const response = await chat.sendMessage({
      message: messageParts,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    })

    const parts = response?.candidates?.[0]?.content?.parts || []
    let imageData = null

    for (const part of parts) {
      if (part.inlineData) {
        imageData = {
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || "image/png",
        }
        break
      }
    }

    if (!imageData) {
      console.error("[edit-brand] No image in response:", JSON.stringify(response, null, 2))
      return NextResponse.json(
        { error: "AI failed to produce an edited image. Try a different instruction." },
        { status: 500 }
      )
    }

    // Deduct credits (same block as generate-brand)
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
            monthly_reset: newMonthlyResetISO,
          })
          .eq("id", existingUsage.id)
          .eq("user_id", user.id)

        if (!updateError) {
          console.log(`✅ Charged ${imageGenCredits} credit(s) for AI image edit`)
        }
      } else {
        const { error: insertError } = await db
          .from("token_usage")
          .insert({
            user_id: user.id,
            total_credits: newTotalCredits,
            total_tokens: 0,
            model: "gemini-2.5-flash-image",
            monthly_reset: newMonthlyResetISO,
          })

        if (!insertError) {
          console.log(`✅ Charged ${imageGenCredits} credit(s) for AI image edit`)
        }
      }
    } catch (creditError) {
      console.error("Error charging credit:", creditError)
    }

    return NextResponse.json({
      success: true,
      image: imageData,
    })
  } catch (error) {
    console.error("Error editing brand image:", error)
    return NextResponse.json(
      { error: error.message || "Failed to edit image" },
      { status: 500 }
    )
  }
}
