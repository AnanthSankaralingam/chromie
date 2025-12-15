import { NextResponse } from "next/server"
import { randomBytes } from "crypto"

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!clientId || !appUrl) {
    console.error("[github-oauth] Missing GITHUB_CLIENT_ID or NEXT_PUBLIC_APP_URL")
    return NextResponse.json(
      { error: "GitHub OAuth is not configured on the server" },
      { status: 500 }
    )
  }

  const redirectUri = `${appUrl}/api/github/callback`
  const state = randomBytes(16).toString("hex")

  // Store state in an httpOnly cookie for CSRF protection
  const authorizeUrl = new URL("https://github.com/login/oauth/authorize")
  authorizeUrl.searchParams.set("client_id", clientId)
  authorizeUrl.searchParams.set("redirect_uri", redirectUri)
  authorizeUrl.searchParams.set("scope", "repo")
  authorizeUrl.searchParams.set("state", state)

  const response = NextResponse.redirect(authorizeUrl.toString())
  response.cookies.set("github_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60, // 10 minutes
  })

  return response
}


