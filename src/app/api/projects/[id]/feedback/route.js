import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request, { params }) {
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
    const { rating, feedback } = await request.json()

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating is required and must be between 1 and 5" }, { status: 400 })
    }

    if (feedback && feedback.length > 1000) {
      return NextResponse.json({ error: "Feedback must be 1000 characters or less" }, { status: 400 })
    }

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

    // Update project with feedback
    const updateData = {
      rating: rating
    }
    if (feedback !== null) {
      updateData.feedback = feedback
    }

    const { data: updatedProject, error: updateError } = await supabase
      .from("projects")
      .update(updateData)
      .eq("id", projectId)
      .eq("user_id", user.id)
      .select("id, rating, feedback")
      .single()

    if (updateError) {
      console.error("Error updating project feedback:", updateError)
      return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 })
    }

    console.log(`Feedback submitted for project ${projectId} by user ${user.id}:`, { rating, feedback })

    return NextResponse.json({ 
      success: true, 
      message: "Feedback submitted successfully",
      project: updatedProject
    })
  } catch (error) {
    console.error("Error submitting feedback:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
