import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/auth/callback"

  if (code) {
    const supabase = createClient()
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(`${origin}/login?error=auth_callback_error&message=${encodeURIComponent(error.message)}`)
      }

      if (data?.session) {
        console.log('Session created successfully:', data.session.user.id)
        // Redirect to auth callback page to establish client-side session
        return NextResponse.redirect(`${origin}/auth/callback`)
      } else {
        console.error('No session data returned')
        return NextResponse.redirect(`${origin}/login?error=no_session`)
      }
    } catch (err) {
      console.error('Exception in auth callback:', err)
      return NextResponse.redirect(`${origin}/login?error=exception&message=${encodeURIComponent(err.message)}`)
    }
  }

  // No code parameter
  console.error('No code parameter in auth callback')
  return NextResponse.redirect(`${origin}/login?error=no_code`)
}