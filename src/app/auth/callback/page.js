"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from '@/components/SessionProviderClient'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoading, user, session, supabase } = useSession()
  const [attempts, setAttempts] = useState(0)
  const [maxAttempts] = useState(20) // 10 seconds total wait time

  useEffect(() => {
    console.log('AuthCallback: Component mounted')
    console.log('AuthCallback: isLoading:', isLoading, 'user:', !!user, 'session:', !!session)
    
    // Check if we have an error parameter
    const error = searchParams.get('error')
    if (error) {
      console.error('AuthCallback: OAuth error received:', error)
      router.push('/?error=auth_failed')
      return
    }

    // Check if we have a code parameter - let Supabase handle it automatically
    const code = searchParams.get('code')
    if (code) {
      console.log('AuthCallback: OAuth code received, letting Supabase handle it')
      // Don't manually exchange the code - let Supabase's built-in flow handle it
      // The code will be automatically processed by Supabase's OAuth callback handling
    }
  }, [searchParams, router])

  useEffect(() => {
    const checkAuth = () => {
      console.log(`AuthCallback: Attempt ${attempts + 1}/${maxAttempts}`)
      console.log('AuthCallback: isLoading:', isLoading, 'user:', !!user, 'session:', !!session)
      
      if (!isLoading) {
        if (user && session) {
          console.log("AuthCallback: User authenticated, updating profile and redirecting to builder")
          
          // Update profile last_used_at
          const updateProfile = async () => {
            try {
              const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                  id: user.id,
                  last_used_at: new Date().toISOString(),
                }, {
                  onConflict: 'id'
                })

              if (profileError) {
                console.error('Error updating profile last_used_at:', profileError)
              } else {
                console.log('Profile last_used_at updated successfully')
              }
            } catch (profileError) {
              console.error('Exception updating profile:', profileError)
            }
          }
          
          updateProfile()
          
          // Get redirect destination from sessionStorage or default to builder
          const redirectDestination = sessionStorage.getItem('auth_redirect_destination') || '/builder'
          sessionStorage.removeItem('auth_redirect_destination') // Clean up
          
          console.log('AuthCallback: Redirecting to:', redirectDestination)
          router.push(redirectDestination)
          return
        }
        
        if (attempts >= maxAttempts - 1) {
          console.log("AuthCallback: Max attempts reached, redirecting to home")
          router.push("/?error=auth_timeout")
          return
        }
        
        setAttempts(prev => prev + 1)
      }
    }

    const timer = setTimeout(checkAuth, 500) // Check every 500ms
    return () => clearTimeout(timer)
  }, [isLoading, user, session, router, attempts, maxAttempts, supabase])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          Completing sign in...
        </h2>
        <p className="text-slate-400">
          Please wait while we set up your account.
        </p>
      </div>
    </div>
  )
}

// Loading fallback component
function AuthCallbackLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Loading...</h2>
        <p className="text-slate-400">Preparing authentication...</p>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<AuthCallbackLoading />}>
      <AuthCallbackContent />
    </Suspense>
  )
}
