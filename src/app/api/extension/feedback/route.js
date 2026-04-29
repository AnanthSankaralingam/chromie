import { createClient } from "@/lib/supabase/server"
import { extensionJson, extensionOptions } from "@/lib/api/extension-api"

export function OPTIONS(request) {
  return extensionOptions(request)
}

const DEFAULT_QUICK_TEXT =
  "Quick reaction from the Chromie browser extension (AI chat)."

export async function POST(request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return extensionJson(request, { error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { would_recommend, feedback_text } = body

    if (typeof would_recommend !== "boolean") {
      return extensionJson(
        request,
        { error: "would_recommend (boolean) is required" },
        { status: 400 }
      )
    }

    let text = typeof feedback_text === "string" ? feedback_text.trim() : ""
    if (!text) {
      text = DEFAULT_QUICK_TEXT
    }
    if (text.length < 3 || text.length > 1000) {
      return extensionJson(
        request,
        { error: "Feedback text must be between 3 and 1000 characters" },
        { status: 400 }
      )
    }

    const { data: feedbackData, error: insertError } = await supabase
      .from("global_feedback")
      .insert({
        user_id: user.id,
        feedback_category: "general",
        feedback_text: text,
        would_recommend,
        page_url: "extension:sidepanel/ai-chat",
      })
      .select("id, created_at")
      .single()

    if (insertError) {
      console.error("Error inserting extension feedback:", insertError)
      return extensionJson(
        request,
        { error: "Failed to submit feedback" },
        { status: 500 }
      )
    }

    return extensionJson(request, {
      success: true,
      data: feedbackData,
    })
  } catch (error) {
    console.error("Error in extension feedback API:", error)
    return extensionJson(
      request,
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
