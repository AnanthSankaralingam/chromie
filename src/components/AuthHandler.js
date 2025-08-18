"use client"

import { useEffect, Suspense } from 'react'
import { useSession } from './SessionProviderClient'
import { useRouter, useSearchParams } from 'next/navigation'

function AuthHandlerContent() {
  const { supabase, session, isLoading } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Only handle auth errors here, not OAuth codes
    // OAuth codes are handled by the dedicated callback page
    const error = searchParams.get('error')
    if (error) {
      console.error('❌ Auth error from URL:', error)
      // Clear error from URL and redirect to home
      router.replace('/')
      return
    }
  }, [searchParams, router])

  return null // This component doesn't render anything
}

// Loading fallback component
function AuthHandlerLoading() {
  return null // This component doesn't render anything, so no loading state needed
}

export default function AuthHandler() {
  return (
    <Suspense fallback={<AuthHandlerLoading />}>
      <AuthHandlerContent />
    </Suspense>
  )
}