"use client"

import { useEffect, useState } from "react"
import { useSession } from "@/components/SessionProviderClient"
import GovOnboardingPage from "@/components/pages/gov-onboarding-page"
import GovProfilePage from "@/components/pages/gov-profile-page"
import ProfilePage from "@/components/pages/profile-page"

export default function ProfileRouter() {
  const { user, supabase } = useSession()
  const [govLinked, setGovLinked] = useState(null)

  useEffect(() => {
    if (!user || !supabase) {
      setGovLinked(false)
      return
    }
    let cancelled = false
    supabase
      .from("profiles")
      .select("gov_profile_id")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setGovLinked(Boolean(data?.gov_profile_id))
        }
      })
      .catch(() => {
        if (!cancelled) setGovLinked(false)
      })
    return () => {
      cancelled = true
    }
  }, [user, supabase])

  if (govLinked === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-zinc-600 border-t-transparent" />
      </div>
    )
  }

  if (govLinked) {
    return <GovProfilePage />
  }

  if (user) {
    return <GovOnboardingPage />
  }

  return <ProfilePage />
}
