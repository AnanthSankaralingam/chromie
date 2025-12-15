import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ connected: false }, { status: 200 })
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("github_access_token, github_username")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      console.error("[github-status] Failed to load profile:", profileError)
      return NextResponse.json({ connected: false }, { status: 200 })
    }

    const connected = !!profile?.github_access_token

    return NextResponse.json({
      connected,
      username: profile?.github_username || null,
    })
  } catch (error) {
    console.error("[github-status] Unexpected error:", error)
    return NextResponse.json({ connected: false }, { status: 200 })
  }
}


