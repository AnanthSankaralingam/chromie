import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { extensionJson, extensionOptions } from "@/lib/api/extension-api"

const REDIRECT_COOKIE = "chromie_extension_redirect_uri"

function isValidExtensionRedirect(value) {
  if (!value || typeof value !== "string") return false
  if (!value.startsWith("https://")) return false

  const configuredId = process.env.CHROMIE_EXTENSION_ID
  if (!configuredId) return true
  return value.startsWith(`https://${configuredId}.chromiumapp.org/`)
}

export function OPTIONS(request) {
  return extensionOptions(request)
}

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const extensionRedirectUri = requestUrl.searchParams.get("redirect_uri")
  const provider = requestUrl.searchParams.get("provider") || "google"

  if (!isValidExtensionRedirect(extensionRedirectUri)) {
    return extensionJson(request, { error: "Invalid extension redirect URI" }, { status: 400 })
  }

  const supabase = await createClient()
  const callbackUrl = new URL("/auth/extension/callback", requestUrl.origin)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  })

  if (error || !data?.url) {
    return extensionJson(
      request,
      { error: error?.message || "Failed to start extension authentication" },
      { status: 500 }
    )
  }

  const cookieStore = await cookies()
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  }
  cookieStore.set(REDIRECT_COOKIE, extensionRedirectUri, cookieOptions)

  return NextResponse.redirect(data.url)
}
