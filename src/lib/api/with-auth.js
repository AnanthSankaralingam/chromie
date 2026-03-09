import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Middleware-style wrapper that injects Supabase client and authenticated user.
 * Usage:
 *   export const GET = withAuth(async ({ supabase, user, request, params }) => { ... })
 */
export function withAuth(handler) {
  return async function routeHandler(request, context) {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const params = context?.params || {}

    return handler({
      request,
      params,
      supabase,
      user,
    })
  }
}

