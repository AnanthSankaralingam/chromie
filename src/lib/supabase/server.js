import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  // Fall back to Authorization header for programmatic API access (e.g. eval harness).
  // Browser sessions use cookies as normal — this only kicks in when there are none.
  const authHeader = headers().get('authorization') || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      ...(bearerToken && {
        global: { headers: { Authorization: `Bearer ${bearerToken}` } },
      }),
    }
  )
}
