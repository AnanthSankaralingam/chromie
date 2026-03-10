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
    const { data: conversation, error } = await service
      .from("conversations")
      .select("history")
      .eq("project_id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ messages: [] })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const messages = conversation?.history || []
    return NextResponse.json({ messages })
  } catch (err) {
    console.error("Admin messages fetch error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
