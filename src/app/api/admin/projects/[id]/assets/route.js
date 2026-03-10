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
    const { data: assets, error } = await service
      .from("project_assets")
      .select("id, file_path, content_base64, file_type, mime_type, file_size")
      .eq("project_id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const formatted = (assets || []).map((a) => ({
      id: a.id,
      file_path: a.file_path,
      content_base64: a.content_base64,
      mime_type: a.mime_type,
      file_size: a.file_size,
    }))

    return NextResponse.json({ assets: formatted })
  } catch (err) {
    console.error("Admin assets fetch error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
