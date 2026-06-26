import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import {
  enrichGovCompanyProfile,
  isEmailVerified,
  isValidDomain,
  normalizeCompanyUrl,
  normalizeEmail,
} from "@/lib/gov-company-enrichment"

export const POST = withAuth(async ({ request, user }) => {
  try {
    if (!isEmailVerified(user)) {
      return NextResponse.json(
        { error: "Please verify your email before enriching your company profile." },
        { status: 400 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const normalizedUrl = normalizeCompanyUrl(body.company_url || body.company_website)
    const userEmail = normalizeEmail(user.email)

    if (!normalizedUrl.domain || !isValidDomain(normalizedUrl.domain)) {
      return NextResponse.json(
        { error: "Enter a valid public company website URL." },
        { status: 400 },
      )
    }

    console.log("[gov-onboarding enrich] started", {
      user: userEmail,
      domain: normalizedUrl.domain,
    })

    const profile = await enrichGovCompanyProfile(normalizedUrl.url)

    return NextResponse.json({
      profile,
    })
  } catch (err) {
    console.error("[gov-onboarding enrich POST]", err)
    const message = err.message || "Failed to enrich company profile."
    const status = /enter a|must be an http|verify/i.test(message)
      ? 400
      : 500
    return NextResponse.json({ error: message }, { status })
  }
})
