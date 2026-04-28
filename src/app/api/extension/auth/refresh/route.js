import { createClient } from "@supabase/supabase-js"
import { extensionJson, extensionOptions } from "@/lib/api/extension-api"

export function OPTIONS(request) {
  return extensionOptions(request)
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const refreshToken = body?.refresh_token

  if (!refreshToken || typeof refreshToken !== "string") {
    return extensionJson(request, { error: "Missing refresh token" }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })

  if (error || !data?.session) {
    return extensionJson(
      request,
      { error: error?.message || "Failed to refresh extension session" },
      { status: 401 }
    )
  }

  return extensionJson(request, {
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      token_type: data.session.token_type || "bearer",
    },
    user: data.user
      ? {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
        }
      : null,
  })
}
