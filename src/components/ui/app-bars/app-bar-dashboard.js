"use client"

import Link from "next/link"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Menu, X } from "lucide-react"
import { useSession } from "@/components/SessionProviderClient"
import { useEffect, useState } from "react"
import { SECTION_LABEL } from "@/components/ui/app-dashboard-theme"

export default function AppBarDashboard({ showOpportunities = true }) {
  const { user, supabase } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [govProfileLinked, setGovProfileLinked] = useState(false)

  useEffect(() => {
    if (!user || !supabase) {
      setGovProfileLinked(false)
      return
    }
    let cancelled = false
    supabase
      .from("profiles")
      .select("gov_profile_id")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setGovProfileLinked(Boolean(data?.gov_profile_id))
      })
      .catch(() => {
        if (!cancelled) setGovProfileLinked(false)
      })
    return () => {
      cancelled = true
    }
  }, [user, supabase])

  const initials =
    user?.user_metadata?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    user?.email?.[0]?.toUpperCase() ||
    "U"

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/chromie-logo-1.png" alt="Chromie" width={28} height={28} />
          <span className="text-lg font-bold tracking-tight">
            chromie<span className="font-normal text-zinc-500">.dev</span>
          </span>
        </Link>

        <div className="flex items-center gap-5 sm:gap-6">
          <nav className="hidden items-center gap-5 md:flex" aria-label="Dashboard">
            {govProfileLinked ? (
              <>
                <Link
                  href="/gov/dashboard"
                  className={`${SECTION_LABEL} text-zinc-400 transition-colors hover:text-white`}
                >
                  Dashboard
                </Link>
                {showOpportunities ? (
                  <Link
                    href="/gov"
                    className={`${SECTION_LABEL} text-zinc-400 transition-colors hover:text-white`}
                  >
                    Opportunities
                  </Link>
                ) : null}
              </>
            ) : user ? (
              <Link
                href="/gov/onboarding"
                className={`${SECTION_LABEL} text-zinc-400 transition-colors hover:text-white`}
              >
                Set up gov profile
              </Link>
            ) : null}
          </nav>

          {user ? (
            <Link href="/profile" className="hidden sm:block">
              <Avatar className="h-8 w-8 cursor-pointer border border-white/15 transition-opacity hover:opacity-80">
                <AvatarImage
                  src={user?.user_metadata?.picture}
                  alt={user?.user_metadata?.name || user?.email}
                />
                <AvatarFallback className="bg-white text-xs font-semibold text-black">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : null}

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center border border-white/15 md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-white/10 px-4 py-4 md:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-3">
            {govProfileLinked ? (
              <>
                <Link
                  href="/gov/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className={`${SECTION_LABEL} text-zinc-400 hover:text-white`}
                >
                  Dashboard
                </Link>
                {showOpportunities ? (
                  <Link
                    href="/gov"
                    onClick={() => setMobileOpen(false)}
                    className={`${SECTION_LABEL} text-zinc-400 hover:text-white`}
                  >
                    Opportunities
                  </Link>
                ) : null}
              </>
            ) : user ? (
              <Link
                href="/gov/onboarding"
                onClick={() => setMobileOpen(false)}
                className={`${SECTION_LABEL} text-zinc-400 hover:text-white`}
              >
                Set up gov profile
              </Link>
            ) : null}
          </div>
        </nav>
      )}
    </header>
  )
}
