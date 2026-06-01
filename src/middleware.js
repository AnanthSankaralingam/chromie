import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { isAllowedPagePath } from '@/lib/allowed-routes'

export async function middleware(request) {
  // Do not strip www here — Vercel already canonicalizes apex → www.chromie.dev.
  // Redirecting www → apex caused an infinite redirect loop with hosting.

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This will refresh session if expired - required for Server Components
  await supabase.auth.getUser()

  // Redirect old auth pages to home or builder
  if (request.nextUrl.pathname.startsWith('/auth/signin') ||
      request.nextUrl.pathname.startsWith('/auth/signup')) {
    const landing = request.nextUrl.clone()
    landing.pathname = '/'
    landing.search = ''
    return NextResponse.redirect(landing)
  }

  if (!isAllowedPagePath(request.nextUrl.pathname)) {
    const landing = request.nextUrl.clone()
    landing.pathname = '/'
    landing.search = ''
    return NextResponse.redirect(landing)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
