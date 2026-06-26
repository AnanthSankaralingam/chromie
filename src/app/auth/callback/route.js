import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  classifyPostAuthDestination,
  explicitPostAuthDestination,
  resolveGovHomePath,
} from "@/lib/gov-auth-redirect"

/**
 * Server-side auth callback - exchanges OAuth code for session and sets cookies.
 * This is required so server routes can read the session.
 * Without this, the session stays in localStorage only and the server gets 401.
 */
export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")

  if (error) {
    console.error("AuthCallback route: OAuth error:", error)
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error)}`, request.url))
  }

  if (code) {
    const cookieStore = await cookies()
    const supabase = await createClient()

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error("AuthCallback route: exchangeCodeForSession error:", exchangeError)
      return NextResponse.redirect(new URL("/?error=auth_exchange_failed", request.url))
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const nextParam = requestUrl.searchParams.get("next")
    const cookieDest = cookieStore.get("auth_redirect_destination")?.value
    const rawDest = nextParam || (cookieDest ? decodeURIComponent(cookieDest) : "")
    cookieStore.delete("auth_redirect_destination")

    if (user && rawDest) {
      const destinationKind = classifyPostAuthDestination(rawDest)
      if (destinationKind === "explicit") {
        const explicitDest = explicitPostAuthDestination(rawDest)
        if (explicitDest) {
          return NextResponse.redirect(new URL(explicitDest, request.url))
        }
      }
      if (destinationKind === "legacy_home") {
        const home = await resolveGovHomePath(supabase, user.id)
        return NextResponse.redirect(new URL(home, request.url))
      }
    }

    if (user) {
      const home = await resolveGovHomePath(supabase, user.id)
      return NextResponse.redirect(new URL(home, request.url))
    }

    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.redirect(new URL("/", request.url))
}
