import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request) {
  const supabase = createClient()

  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!clientId || !clientSecret || !appUrl) {
    console.error("[github-oauth] Missing GitHub OAuth environment variables")
    return NextResponse.json(
      { error: "GitHub OAuth is not configured on the server" },
      { status: 500 }
    )
  }

  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")

  const storedState = request.cookies.get("github_oauth_state")?.value

  if (!code || !state || !storedState || state !== storedState) {
    console.error("[github-oauth] Invalid or missing state/code in callback", {
      hasCode: !!code,
      hasState: !!state,
      hasStoredState: !!storedState,
    })
    return NextResponse.redirect(`${appUrl}/profile?github=error`)
  }

  // Clear the state cookie
  const responseHeaders = new Headers()

  // Exchange code for access token
  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("[github-oauth] Failed to exchange code for token", tokenData)
      return NextResponse.redirect(`${appUrl}/profile?github=error`)
    }

    const accessToken = tokenData.access_token

    // Fetch basic GitHub user info
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    })

    const githubUser = await userResponse.json()

    if (!userResponse.ok) {
      console.error("[github-oauth] Failed to fetch GitHub user info", githubUser)
      return NextResponse.redirect(`${appUrl}/profile?github=error`)
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("[github-oauth] No authenticated Supabase user for callback", userError)
      return NextResponse.redirect(`${appUrl}/profile?github=error`)
    }

    // Store token and username in profiles table
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        github_access_token: accessToken,
        github_username: githubUser.login || null,
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[github-oauth] Failed to store GitHub token in Supabase", updateError)
      return NextResponse.redirect(`${appUrl}/profile?github=error`)
    }

    const redirectResponse = NextResponse.redirect(`${appUrl}/profile?github=connected`)
    redirectResponse.cookies.set("github_oauth_state", "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    })

    return redirectResponse
  } catch (error) {
    console.error("[github-oauth] Unexpected error during callback", error)
    return NextResponse.redirect(`${appUrl}/profile?github=error`)
  }
}


