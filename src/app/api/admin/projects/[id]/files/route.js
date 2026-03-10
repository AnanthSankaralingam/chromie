import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { withAdminAuth } from "@/lib/api/admin-auth"

export const GET = withAdminAuth(async ({ params }) => {
  const { id } = await params
  const service = createServiceClient()
  if (!service) {
    return NextResponse.json(
      { error: "Service role not configured" },
      { status: 500 }
    )
  }

  try {
    const { data: files, error } = await service
      .from("code_files")
      .select("*")
      .eq("project_id", id)
      .order("file_path")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ files: files || [] })
  } catch (err) {
    console.error("Admin files fetch error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
