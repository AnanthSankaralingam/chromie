import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const REDIRECT_COOKIE = "chromie_extension_redirect_uri"

function redirectWithFragment(baseUrl, values) {
  const target = new URL(baseUrl)
  target.hash = new URLSearchParams(values).toString()
  return NextResponse.redirect(target)
}

function clearAuthCookies(response) {
  response.cookies.delete(REDIRECT_COOKIE)
  return response
}

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")
  const cookieStore = await cookies()
  const extensionRedirectUri = cookieStore.get(REDIRECT_COOKIE)?.value

  if (!extensionRedirectUri?.startsWith("https://")) {
    return NextResponse.redirect(new URL("/?error=extension_auth_missing_redirect", request.url))
  }

  if (error) {
    return clearAuthCookies(
      redirectWithFragment(extensionRedirectUri, {
        error,
        error_description: requestUrl.searchParams.get("error_description") || "Authentication failed.",
      })
    )
  }

  if (!code) {
    return clearAuthCookies(
      redirectWithFragment(extensionRedirectUri, {
        error: "missing_code",
        error_description: "Supabase did not return an authorization code.",
      })
    )
  }

  const supabase = await createClient()
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError || !data?.session) {
    return clearAuthCookies(
      redirectWithFragment(extensionRedirectUri, {
        error: "auth_exchange_failed",
        error_description: exchangeError?.message || "Failed to exchange auth code for session.",
      })
    )
  }

  return clearAuthCookies(
    redirectWithFragment(extensionRedirectUri, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: String(data.session.expires_at || ""),
      token_type: data.session.token_type || "bearer",
    })
  )
}
