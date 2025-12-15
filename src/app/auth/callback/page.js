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
    // Check if we have an error parameter
    const error = searchParams.get('error')
    if (error) {
      console.error('AuthCallback: OAuth error received:', error)
      router.push('/?error=auth_failed')
      return
    }
  }, [searchParams, router])

  useEffect(() => {
    const checkAuth = async () => {
      if (!isLoading) {
        if (user && session) {
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
          
          // Check for pending prompt and handle it
          const pendingPromptData = sessionStorage.getItem('pending_prompt')
          if (pendingPromptData) {
            try {
              const { prompt: savedPrompt, timestamp } = JSON.parse(pendingPromptData)
              
              // Only process if prompt is less than 1 hour old
              if (Date.now() - timestamp < 60 * 60 * 1000) {
                console.log('AuthCallback: Found pending prompt, creating project:', savedPrompt)
                
                // Create project with the saved prompt
                const response = await fetch("/api/projects", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    name: savedPrompt.slice(0, 50) + "...",
                    description: savedPrompt,
                  }),
                })
                
                if (response.ok) {
                  const { project } = await response.json()
                  
                  // Clean up the pending prompt
                  sessionStorage.removeItem('pending_prompt')
                  
                  // Redirect to builder with autoGenerate
                  const encodedPrompt = encodeURIComponent(savedPrompt)
                  const builderUrl = `/builder?project=${project.id}&autoGenerate=${encodedPrompt}`
                  
                  console.log('AuthCallback: Created project and redirecting to builder:', {
                    projectId: project.id,
                    prompt: savedPrompt,
                    builderUrl: builderUrl
                  })
                  
                  router.push(builderUrl)
                  return
                } else {
                  console.error('AuthCallback: Failed to create project with pending prompt')
                  // Fall through to normal redirect
                }
              } else {
                console.log('AuthCallback: Pending prompt expired, cleaning up')
                sessionStorage.removeItem('pending_prompt')
              }
            } catch (error) {
              console.error('AuthCallback: Error processing pending prompt:', error)
              sessionStorage.removeItem('pending_prompt')
            }
          }
          
          // Get redirect destination from sessionStorage or default to builder
          const redirectDestination = sessionStorage.getItem('auth_redirect_destination') || '/builder'
          sessionStorage.removeItem('auth_redirect_destination') // Clean up
          
          console.log('AuthCallback: Redirecting to:', redirectDestination)
          router.push(redirectDestination)
          return
        }
        
        if (attempts >= maxAttempts - 1) {
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
          Signing in...
        </h2>
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
