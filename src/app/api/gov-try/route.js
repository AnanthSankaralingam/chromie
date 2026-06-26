import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { provisionTryGovProfile } from "@/lib/gov-try-setup"

export const POST = withAuth(async ({ user }) => {
  try {
    const result = await provisionTryGovProfile(user)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status || 500 })
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error("[gov-try POST]", err)
    return NextResponse.json(
      { error: err.message || "Failed to set up your government profile." },
      { status: 500 },
    )
  }
})
