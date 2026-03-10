import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isAdmin } from "@/lib/api/admin-auth"

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ isAdmin: false }, { status: 200 })
  }

  const admin = await isAdmin(supabase, user)
  return NextResponse.json({ isAdmin: admin })
}
