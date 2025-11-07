import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const { feedback_category, feedback_text, would_recommend, page_url } =
      await request.json();

    // Validate inputs
    if (!feedback_category || !feedback_text || would_recommend === undefined) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate feedback_category
    const validCategories = ["bug", "feature", "general", "other"];
    if (!validCategories.includes(feedback_category)) {
      return Response.json(
        { error: "Invalid feedback category" },
        { status: 400 }
      );
    }

    // Validate feedback_text length
    if (
      typeof feedback_text !== "string" ||
      feedback_text.trim().length < 3 ||
      feedback_text.length > 1000
    ) {
      return Response.json(
        { error: "Feedback text must be between 3 and 1000 characters" },
        { status: 400 }
      );
    }

    // Validate would_recommend is boolean
    if (typeof would_recommend !== "boolean") {
      return Response.json(
        { error: "Would recommend must be a boolean" },
        { status: 400 }
      );
    }

    // Insert feedback into database
    const { data: feedbackData, error: insertError } = await supabase
      .from("global_feedback")
      .insert({
        user_id: user.id,
        feedback_category,
        feedback_text: feedback_text.trim(),
        would_recommend,
        page_url: page_url || null,
      })
      .select("id, created_at")
      .single();

    if (insertError) {
      console.error("Error inserting feedback:", insertError);
      return Response.json(
        { error: "Failed to submit feedback" },
        { status: 500 }
      );
    }

    console.log(
      `Feedback submitted successfully - User: ${user.id}, ID: ${feedbackData.id}`
    );

    return Response.json(
      {
        success: true,
        message: "Thank you for your feedback!",
        data: feedbackData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in feedback API:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
