import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { getGovProfileForUser } from "@/lib/gov-profiles"
import { getGovMonitorStatus } from "@/lib/gov-monitor-bootstrap"
import { createServiceClient } from "@/lib/supabase/service"

export const GET = withAuth(async ({ supabase, user }) => {
  try {
    const govProfile = await getGovProfileForUser(supabase, user.id)
    if (!govProfile) {
      return NextResponse.json({ error: "No gov profile linked" }, { status: 403 })
    }

    const service = createServiceClient()
    if (!service) {
      return NextResponse.json(
        { error: "Server is missing Supabase service credentials." },
        { status: 500 },
      )
    }

    const status = await getGovMonitorStatus({
      service,
      govProfileId: govProfile.id,
    })

    return NextResponse.json(status)
  } catch (err) {
    console.error("[gov-monitor/status GET]", err)
    return NextResponse.json(
      { error: err.message || "Failed to load monitor status." },
      { status: 500 },
    )
  }
})
