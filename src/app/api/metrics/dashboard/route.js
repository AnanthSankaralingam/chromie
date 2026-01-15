import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request) {
  const supabase = createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const bucket = searchParams.get('bucket') || 'day'

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  // Verify user owns this project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single()

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  // Calculate default time range if not provided (last 30 days)
  const toDate = to ? new Date(to) : new Date()
  const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000)

  try {
    // Call the metrics_dashboard RPC function
    const { data, error } = await supabase.rpc('metrics_dashboard', {
      p_project_id: projectId,
      p_from: fromDate.toISOString(),
      p_to: toDate.toISOString(),
      p_bucket: bucket
    })

    if (error) {
      console.error("Error fetching metrics dashboard:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("Metrics dashboard data for project", projectId, ":", JSON.stringify(data).substring(0, 200))

    return NextResponse.json({
      metrics: data,
      timeRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        bucket
      }
    })
  } catch (err) {
    console.error("Exception fetching metrics:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
