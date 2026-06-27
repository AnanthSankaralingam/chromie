"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/components/SessionProviderClient"
import { BTN_OUTLINE, BTN_PRIMARY, CARD_CLASS, INPUT_CLASS } from "@/components/ui/app-dashboard-theme"
import { GovForbiddenState } from "@/components/ui/gov/gov-gate-cards"
import GovField from "@/components/ui/gov/gov-field"
import GovLoadingState from "@/components/ui/gov/gov-loading-state"
import GovPageHeader from "@/components/ui/gov/gov-page-header"
import GovPageShell from "@/components/ui/gov/gov-page-shell"
import PastRfpSection from "@/components/ui/gov/past-rfp-section"
import UserProfileCard from "@/components/ui/gov/user-profile-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/forms-and-input/input"
import { normalizePastRfpPdfs } from "@/lib/gov-profiles"
import { LogOut, Save } from "lucide-react"

export default function GovProfilePage() {
  const { user, supabase } = useSession()
  const router = useRouter()
  const fileInputRef = useRef(null)
  const [showAuth, setShowAuth] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [forbidden, setForbidden] = useState(false)
  const [form, setForm] = useState(null)
  const [pastRfpPdfs, setPastRfpPdfs] = useState([])

  const loadProfile = useCallback(async () => {
    const res = await fetch("/api/gov-profile")
    if (res.status === 401) {
      setShowAuth(true)
      setLoading(false)
      return
    }
    if (res.status === 403) {
      setForbidden(true)
      setLoading(false)
      return
    }
    if (!res.ok) {
      setLoading(false)
      return
    }
    const json = await res.json()
    const gp = json.gov_profile
    setForm({
      name: gp.name || "",
      search_keywords: (gp.search_keywords || []).join("\n"),
      naics_codes: (gp.naics_codes || []).join("\n"),
      corporate_overview: gp.corporate_overview || "",
    })
    setPastRfpPdfs(normalizePastRfpPdfs(gp.past_rfps))
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!user) {
      setShowAuth(true)
      setLoading(false)
      return
    }
    loadProfile()
  }, [user, loadProfile])

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function saveProfile() {
    if (!form) return
    setSaving(true)
    try {
      const res = await fetch("/api/gov-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error || "Failed to save")
        return
      }
      console.log("[gov-profile] saved", json.gov_profile?.id)
    } finally {
      setSaving(false)
    }
  }

  async function uploadPdf(file) {
    if (!file) return
    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/gov-profile/rfps", { method: "POST", body })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error || "Upload failed")
        return
      }
      setPastRfpPdfs(normalizePastRfpPdfs(json.past_rfps))
      console.log("[gov-profile] uploaded pdf", json.pdf?.id)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  async function deletePdf(fileId) {
    setDeletingId(fileId)
    try {
      const res = await fetch(`/api/gov-profile/rfps/${fileId}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error || "Delete failed")
        return
      }
      setPastRfpPdfs(normalizePastRfpPdfs(json.past_rfps))
    } finally {
      setDeletingId(null)
    }
  }

  async function downloadPdf(fileId) {
    const res = await fetch(`/api/gov-profile/rfps/${fileId}`)
    const json = await res.json()
    if (!res.ok || !json.url) {
      alert(json.error || "Download failed")
      return
    }
    window.open(json.url, "_blank", "noopener,noreferrer")
  }

  async function signOut() {
    setSigningOut(true)
    try {
      await supabase?.auth.signOut()
      router.push("/")
    } finally {
      setSigningOut(false)
    }
  }

  if (loading) {
    return <GovLoadingState message="Loading company profile…" />
  }

  if (forbidden) {
    return (
      <GovPageShell
        maxWidth="lg"
        authOpen={showAuth}
        onAuthClose={() => setShowAuth(false)}
        authRedirect="/profile"
      >
        <GovForbiddenState
          title="Company profile unavailable"
          description="Your account is not linked to a government contractor profile yet. Set up your company profile to unlock contract discovery automation defaults."
          actionLabel="Set up company profile"
          onAction={() => router.push("/gov/onboarding")}
        />
      </GovPageShell>
    )
  }

  if (!form) {
    return null
  }

  return (
    <GovPageShell
      maxWidth="3xl"
      authOpen={showAuth}
      onAuthClose={() => setShowAuth(false)}
      authRedirect="/profile"
    >
      <GovPageHeader
        label="Company profile"
        title="Configure your profile"
        description="Contract search config shared across your team."
        actions={
          <>
            <Button asChild className={BTN_OUTLINE}>
              <Link href="/gov">Opportunities</Link>
            </Button>
          </>
        }
      />

      <Card className={`mt-6 ${CARD_CLASS}`}>
        <CardHeader className="border-b border-white/10 pb-4">
          <CardTitle className="text-base font-bold text-white">Search configuration</CardTitle>
          <CardDescription className="text-zinc-400">
            Used by contract discovery automations for everyone linked to this profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <GovField label="Company name">
            <Input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className={INPUT_CLASS}
            />
          </GovField>

          <GovField label="Company overview" hint="Company context for future contract matching.">
            <textarea
              rows={6}
              value={form.corporate_overview}
              onChange={(e) => updateField("corporate_overview", e.target.value)}
              className={`${INPUT_CLASS} max-h-56 w-full overflow-y-auto rounded-md px-3 py-2 text-sm`}
            />
          </GovField>

          <GovField label="Search keywords" hint="One per line — batched in each automation run.">
            <textarea
              rows={5}
              value={form.search_keywords}
              onChange={(e) => updateField("search_keywords", e.target.value)}
              className={`${INPUT_CLASS} w-full rounded-md px-3 py-2 text-sm font-mono`}
            />
          </GovField>

          <GovField label="NAICS codes" hint="One per line.">
            <textarea
              rows={3}
              value={form.naics_codes}
              onChange={(e) => updateField("naics_codes", e.target.value)}
              className={`${INPUT_CLASS} w-full rounded-md px-3 py-2 text-sm font-mono`}
            />
          </GovField>
        </CardContent>
      </Card>

      <PastRfpSection
        fileInputRef={fileInputRef}
        pastRfpPdfs={pastRfpPdfs}
        uploading={uploading}
        deletingId={deletingId}
        onUploadClick={() => fileInputRef.current?.click()}
        onFileChange={(e) => {
          const file = e.target.files?.[0]
          if (file) uploadPdf(file)
        }}
        onDownload={downloadPdf}
        onDelete={deletePdf}
      />

      {user ? (
        <div className="mt-8">
          <UserProfileCard user={user} />
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button type="button" disabled={saving} onClick={saveProfile} className={BTN_PRIMARY}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? "Saving…" : "Save profile"}
        </Button>
        <Button
          type="button"
          className={BTN_OUTLINE}
          onClick={signOut}
          disabled={signingOut}
        >
          <LogOut className="mr-1 h-4 w-4" />
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
      </div>
    </GovPageShell>
  )
}
