import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const redirect = searchParams.get("redirect") ?? "/builder"

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
        
        // Update the user's last_used_at timestamp in profiles table
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.session.user.id,
              last_used_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'id'
            })

          if (profileError) {
            console.error('Error updating profile last_used_at:', profileError)
            // Don't fail the auth flow, just log the error
          } else {
            console.log('Profile last_used_at updated successfully')
          }
        } catch (profileError) {
          console.error('Exception updating profile:', profileError)
          // Don't fail the auth flow, just log the error
        }
        
        // Redirect to the specified redirect URL or default to /builder
        return NextResponse.redirect(`${origin}${redirect}`)
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