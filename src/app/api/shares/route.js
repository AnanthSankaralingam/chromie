import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { securityLog } from "@/lib/validation"

// GET: Get all shares for the authenticated user
export async function GET(request) {
  const supabase = createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // First, get user's project IDs
    const { data: userProjects, error: projectsError } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", user.id)

    if (projectsError) {
      console.error("Error fetching user projects:", projectsError)
      return NextResponse.json({ error: "Failed to fetch user projects" }, { status: 500 })
    }

    if (!userProjects || userProjects.length === 0) {
      return NextResponse.json({ shares: [] })
    }

    const projectIds = userProjects.map(p => p.id)

    // Then, get all shares for user's projects (check if not expired)
    const { data: shares, error: sharesError } = await supabase
      .from("shared_links")
      .select(`
        id,
        share_token,
        created_at,
        download_count,
        is_active,
        expires_at,
        projects!inner(
          id,
          name,
          description
        )
      `)
      .in("project_id", projectIds)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })

    if (sharesError) {
      console.error("Error fetching shares:", sharesError)
      return NextResponse.json({ error: "Failed to fetch shares" }, { status: 500 })
    }

    // Format shares with share URLs
    const formattedShares = (shares || []).map(share => ({
      id: share.id,
      share_token: share.share_token,
      created_at: share.created_at,
      download_count: share.download_count,
      is_active: share.is_active,
      project: share.projects,
      share_url: `${process.env.NEXT_PUBLIC_SITE_URL}/share/${share.share_token}`
    }))

    securityLog('info', 'User shares fetched', {
      userId: user.id,
      shareCount: formattedShares.length
    })

    return NextResponse.json({ shares: formattedShares })

  } catch (error) {
    console.error("Error fetching shares:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
