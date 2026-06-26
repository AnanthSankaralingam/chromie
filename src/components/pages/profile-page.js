"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/components/SessionProviderClient"
import AppBarDashboard from "@/components/ui/app-bars/app-bar-dashboard"
import {
  APP_PAGE,
  BTN_OUTLINE,
  BTN_PRIMARY,
  CARD_CLASS,
  SECTION_LABEL,
} from "@/components/ui/app-dashboard-theme"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FilmGrain } from "@/components/ui/landing/landing-motion"
import AuthModal from "@/components/ui/modals/modal-auth"
import { Calendar, LogOut, Mail, User } from "lucide-react"

function userInitials(user) {
  const fromName = user?.user_metadata?.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return fromName || user?.email?.[0]?.toUpperCase() || "U"
}

function formatDate(value) {
  if (!value) return "Unknown"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown"
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default function ProfilePage() {
  const { user, supabase } = useSession()
  const router = useRouter()
  const [showAuth, setShowAuth] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function signOut() {
    setSigningOut(true)
    try {
      await supabase?.auth.signOut()
      router.push("/")
    } finally {
      setSigningOut(false)
    }
  }

  if (!user) {
    return (
      <div className={APP_PAGE}>
        <FilmGrain />
        <AppBarDashboard />
        <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center px-4">
          <Card className={CARD_CLASS}>
            <CardHeader>
              <CardTitle>Sign in to view your profile</CardTitle>
              <CardDescription>
                Your Chromie profile manages access to automations and saved workflow settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className={BTN_PRIMARY} onClick={() => setShowAuth(true)}>
                Sign in
              </Button>
            </CardContent>
          </Card>
        </main>
        <AuthModal open={showAuth} onOpenChange={setShowAuth} />
      </div>
    )
  }

  const displayName = user.user_metadata?.name || user.user_metadata?.full_name || "Chromie user"

  return (
    <div className={APP_PAGE}>
      <FilmGrain />
      <AppBarDashboard />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <p className={SECTION_LABEL}>Profile</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Account settings</h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-400">
            Manage your Chromie account and jump back into your automation workflows.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <Card className={CARD_CLASS}>
            <CardContent className="flex items-center gap-4 p-5">
              <Avatar className="h-14 w-14 border border-white/15">
                <AvatarImage src={user.user_metadata?.picture} alt={displayName} />
                <AvatarFallback className="bg-white text-base font-semibold text-black">
                  {userInitials(user)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-lg font-medium text-white">{displayName}</p>
                <div className="mt-2 space-y-1 text-sm text-zinc-400">
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-zinc-600" />
                    <span className="truncate">{user.email}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-zinc-600" />
                    <span>Joined {formatDate(user.created_at)}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={CARD_CLASS}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-cyan-300" />
                Workspace
              </CardTitle>
              <CardDescription>Open the core automation surfaces.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className={`w-full ${BTN_PRIMARY}`} onClick={() => router.push("/dashboard")}>
                My automations
              </Button>
              <Button className={`w-full ${BTN_OUTLINE}`} onClick={() => router.push("/gov")}>
                Gov opportunities
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className={`mt-4 ${CARD_CLASS}`}>
          <CardHeader>
            <CardTitle>Session</CardTitle>
            <CardDescription>Sign out of this browser when you are finished.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className={BTN_OUTLINE} onClick={signOut} disabled={signingOut}>
              <LogOut className="mr-2 h-4 w-4" />
              {signingOut ? "Signing out..." : "Sign out"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
