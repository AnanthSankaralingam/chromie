"use client"

import { useEffect, Suspense } from "react"
import { useSession } from "./SessionProviderClient"
import { useRouter, useSearchParams } from "next/navigation"
import {
  classifyPostAuthDestination,
  explicitPostAuthDestination,
  resolveGovHomePath,
} from "@/lib/gov-auth-redirect"

function AuthHandlerContent() {
  const { supabase, session, isLoading } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const error = searchParams.get("error")
    if (error) {
      console.error("❌ Auth error from URL:", error)
      router.replace("/")
      return
    }
  }, [searchParams, router])

  useEffect(() => {
    if (isLoading || !session?.user || !supabase) return

    const pendingDest = sessionStorage.getItem("auth_redirect_destination")
    if (!pendingDest) return

    const currentPath = `${window.location.pathname}${window.location.search}`
    if (currentPath === pendingDest) {
      sessionStorage.removeItem("auth_redirect_destination")
      return
    }

    const destinationKind = classifyPostAuthDestination(pendingDest)
    sessionStorage.removeItem("auth_redirect_destination")
    document.cookie = "auth_redirect_destination=; path=/; max-age=0; samesite=lax"

    if (destinationKind === "explicit") {
      const explicitDest = explicitPostAuthDestination(pendingDest)
      if (explicitDest) {
        router.replace(explicitDest)
      }
      return
    }

    if (destinationKind === "legacy_home") {
      resolveGovHomePath(supabase, session.user.id)
        .then((home) => router.replace(home))
        .catch((err) => console.error("[AuthHandler] gov home redirect failed", err))
    }
  }, [session, isLoading, supabase, router])

  return null
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