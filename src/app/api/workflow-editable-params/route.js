import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"

export const GET = withAuth(async ({ request, supabase }) => {
  const { searchParams } = new URL(request.url)
  const scenario_id = searchParams.get("scenario_id")?.trim()
  if (!scenario_id) {
    return NextResponse.json({ error: "scenario_id is required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("workflow_editable_params")
    .select("*")
    .eq("scenario_id", scenario_id)
    .order("sort_order", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ params: data || [] })
})
