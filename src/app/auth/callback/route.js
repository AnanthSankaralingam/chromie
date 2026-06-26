import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
function resolvePostAuthPath(pathname) {
  if (
    pathname === '/' ||
    pathname === '/dashboard' ||
    pathname === '/automations' ||
    pathname === '/gov' ||
    pathname === '/gov/dashboard' ||
    pathname === '/gov/onboarding' ||
    pathname === '/profile'
  ) {
    return pathname
  }
  return '/dashboard'
}

/**
 * Server-side auth callback - exchanges OAuth code for session and sets cookies.
 * This is required so server routes can read the session.
 * Without this, the session stays in localStorage only and the server gets 401.
 */
export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')

  if (error) {
    console.error('AuthCallback route: OAuth error:', error)
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error)}`, request.url))
  }

  if (code) {
    const cookieStore = await cookies()
    const supabase = await createClient()

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('AuthCallback route: exchangeCodeForSession error:', exchangeError)
      return NextResponse.redirect(new URL('/?error=auth_exchange_failed', request.url))
    }

    // Read redirect destination from cookie (set by modal-auth before OAuth redirect)
    const rawDest = cookieStore.get('auth_redirect_destination')?.value
    const redirectDestination = rawDest ? decodeURIComponent(rawDest) : '/dashboard'
    cookieStore.delete('auth_redirect_destination')

    const destPath = redirectDestination.startsWith('/')
      ? new URL(redirectDestination, request.url).pathname
      : '/dashboard'
    return NextResponse.redirect(
      new URL(resolvePostAuthPath(destPath), request.url),
    )
  }

  // No code - redirect to home
  return NextResponse.redirect(new URL('/', request.url))
}
