"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from '@/components/SessionProviderClient'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoading, user, session } = useSession()
  const [attempts, setAttempts] = useState(0)
  const [maxAttempts] = useState(20) // 10 seconds total wait time
  const [isProcessingCode, setIsProcessingCode] = useState(false)

  useEffect(() => {
    console.log('AuthCallback: Component mounted')
    console.log('AuthCallback: isLoading:', isLoading, 'user:', !!user, 'session:', !!session)
    
    // Check if we have a code parameter that needs to be processed
    const code = searchParams.get('code')
    if (code && !isProcessingCode) {
      console.log('AuthCallback: Found code parameter, processing authentication...')
      setIsProcessingCode(true)
      processAuthCode(code)
    }
  }, [searchParams, isProcessingCode])

  const processAuthCode = async (code) => {
    try {
      console.log('AuthCallback: Processing auth code...')
      
      // Call the API route to exchange code for session
      const response = await fetch(`/api/auth/callback?code=${code}`)
      
      if (response.ok) {
        console.log('AuthCallback: Code processed successfully, redirecting...')
        // The API route will handle the redirect
        return
      } else {
        console.error('AuthCallback: Failed to process code:', response.status)
        router.push('/?error=auth_failed')
      }
    } catch (error) {
      console.error('AuthCallback: Error processing code:', error)
      router.push('/?error=auth_error')
    } finally {
      setIsProcessingCode(false)
    }
  }

  useEffect(() => {
    const checkAuth = () => {
      console.log(`AuthCallback: Attempt ${attempts + 1}/${maxAttempts}`)
      console.log('AuthCallback: isLoading:', isLoading, 'user:', !!user, 'session:', !!session)
      
      if (!isLoading && !isProcessingCode) {
        if (user && session) {
          console.log("AuthCallback: User authenticated, redirecting to builder")
          router.push("/builder")
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
  }, [isLoading, user, session, router, attempts, maxAttempts, isProcessingCode])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          {isProcessingCode ? "Processing sign in..." : "Completing sign in..."}
        </h2>
        <p className="text-slate-400">
          {isProcessingCode 
            ? "Exchanging authentication code..." 
            : "Please wait while we set up your account."
          }
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
