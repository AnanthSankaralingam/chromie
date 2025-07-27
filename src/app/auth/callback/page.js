"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from '@/components/SessionProviderClient'

export default function AuthCallback() {
  const router = useRouter()
  const { isLoading, user, session } = useSession()
  const [attempts, setAttempts] = useState(0)
  const [maxAttempts] = useState(10) // 5 seconds total wait time

  useEffect(() => {
    console.log('AuthCallback: Component mounted')
    console.log('AuthCallback: isLoading:', isLoading, 'user:', !!user, 'session:', !!session)
  }, [])

  useEffect(() => {
    const checkAuth = () => {
      console.log(`AuthCallback: Attempt ${attempts + 1}/${maxAttempts}`)
      console.log('AuthCallback: isLoading:', isLoading, 'user:', !!user, 'session:', !!session)
      
      if (!isLoading) {
        if (user && session) {
          console.log("AuthCallback: User authenticated, redirecting to builder")
          router.push("/builder")
          return
        }
        
        if (attempts >= maxAttempts - 1) {
          console.log("AuthCallback: Max attempts reached, redirecting to login")
          router.push("/login?error=auth_timeout")
          return
        }
        
        setAttempts(prev => prev + 1)
      }
    }

    const timer = setTimeout(checkAuth, 500) // Check every 500ms
    return () => clearTimeout(timer)
  }, [isLoading, user, session, router, attempts, maxAttempts])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Completing sign in...</h2>
        <p className="text-slate-400">Please wait while we set up your account.</p>
      </div>
    </div>
  )
}
