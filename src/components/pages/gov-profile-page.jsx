"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/components/SessionProviderClient"
import AppBarDashboard from "@/components/ui/app-bars/app-bar-dashboard"
import {
  APP_PAGE,
  BTN_OUTLINE,
  BTN_PRIMARY,
  CARD_CLASS,
  INPUT_CLASS,
  LABEL_CLASS,
  SECTION_LABEL,
} from "@/components/ui/app-dashboard-theme"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/forms-and-input/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FilmGrain } from "@/components/ui/landing/landing-motion"
import AuthModal from "@/components/ui/modals/modal-auth"
import { normalizePastRfpPdfs } from "@/lib/gov-profiles"
import { FileText, Save, Trash2, Upload } from "lucide-react"

function Field({ label, children, hint }) {
  return (
    <div className="min-w-0">
      <label className={LABEL_CLASS}>{label}</label>
      {hint ? <p className="mt-0.5 text-xs text-zinc-600">{hint}</p> : null}
      {children}
    </div>
  )
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function userInitials(user) {
  const fromName = user?.user_metadata?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
  return fromName || user?.email?.[0]?.toUpperCase() || "U"
}

function UserProfileSection({ user }) {
  const displayName = user?.user_metadata?.name || user?.user_metadata?.full_name

  return (
    <Card className={CARD_CLASS}>
      <CardContent className="flex items-center gap-4 px-4 py-4">
        <Avatar className="h-11 w-11 border border-white/15">
          <AvatarImage
            src={user?.user_metadata?.picture}
            alt={displayName || user?.email}
          />
          <AvatarFallback className="bg-white text-sm font-semibold text-black">
            {userInitials(user)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          {displayName ? (
            <p className="truncate font-medium text-white">{displayName}</p>
          ) : null}
          <p className={`truncate text-sm text-zinc-400 ${displayName ? "mt-0.5" : ""}`}>
            {user?.email}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function GovProfilePage() {
  const { user } = useSession()
  const router = useRouter()
  const fileInputRef = useRef(null)
  const [showAuth, setShowAuth] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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

  if (loading) {
    return (
      <div className={`${APP_PAGE} flex items-center justify-center`}>
        <p className="text-sm text-zinc-500">Loading company profile…</p>
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className={APP_PAGE}>
        <FilmGrain />
        <AppBarDashboard />
        <main className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="text-xl font-bold">Company profile unavailable</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Your account is not linked to a gov contractor profile. Contact Chromie to get access.
          </p>
          <Button className={`mt-6 ${BTN_OUTLINE}`} onClick={() => router.push("/dashboard")}>
            Back to dashboard
          </Button>
        </main>
      </div>
    )
  }

  if (!form) {
    return null
  }

  return (
    <div className={APP_PAGE}>
      <FilmGrain />
      <AppBarDashboard />
      <main className="relative z-[1] mx-auto max-h-[calc(100vh-3.5rem)] max-w-3xl overflow-y-auto px-4 py-10 sm:px-6">
        <div>
          <p className={SECTION_LABEL}>Company profile</p>
          <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">{form.name}</h2>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            SAM.gov search config shared across your team.
          </p>
        </div>

        <Card className={`mt-6 ${CARD_CLASS}`}>
          <CardHeader className="border-b border-white/10 pb-4">
            <CardTitle className="text-base font-bold text-white">Search configuration</CardTitle>
            <CardDescription className="text-zinc-400">
              Used by SAM.gov automations for everyone linked to this profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <Field label="Company name">
              <Input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Company overview" hint="Company context for future contract matching.">
              <textarea
                rows={6}
                value={form.corporate_overview}
                onChange={(e) => updateField("corporate_overview", e.target.value)}
                className={`${INPUT_CLASS} max-h-56 w-full overflow-y-auto rounded-md px-3 py-2 text-sm`}
              />
            </Field>

            <Field label="Search keywords" hint="One per line — batched in each automation run.">
              <textarea
                rows={5}
                value={form.search_keywords}
                onChange={(e) => updateField("search_keywords", e.target.value)}
                className={`${INPUT_CLASS} w-full rounded-md px-3 py-2 text-sm font-mono`}
              />
            </Field>

            <Field label="NAICS codes" hint="One per line.">
              <textarea
                rows={3}
                value={form.naics_codes}
                onChange={(e) => updateField("naics_codes", e.target.value)}
                className={`${INPUT_CLASS} w-full rounded-md px-3 py-2 text-sm font-mono`}
              />
            </Field>

          </CardContent>
        </Card>

        <Card className={`mt-8 ${CARD_CLASS}`}>
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/10 pb-4">
            <div>
              <CardTitle className="text-base font-bold text-white">Past RFPs</CardTitle>
              <CardDescription className="text-zinc-400">
                Upload PDFs from past proposals or solicitations for future matching.
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={BTN_OUTLINE}
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3 w-3 mr-1" />
              {uploading ? "Uploading…" : "Upload PDF"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadPdf(file)
              }}
            />
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {pastRfpPdfs.length === 0 && (
              <p className="text-sm text-zinc-500">No PDFs uploaded yet.</p>
            )}
            {pastRfpPdfs.map((pdf) => (
              <div
                key={pdf.id}
                className="flex items-center gap-3 border border-white/10 px-3 py-2.5 text-sm"
              >
                <FileText className="h-4 w-4 shrink-0 text-zinc-500" />
                <button
                  type="button"
                  onClick={() => downloadPdf(pdf.id)}
                  className="min-w-0 flex-1 text-left text-zinc-200 hover:text-white truncate"
                >
                  {pdf.filename}
                </button>
                <span className="shrink-0 text-xs text-zinc-500">{formatBytes(pdf.size_bytes)}</span>
                <button
                  type="button"
                  disabled={deletingId === pdf.id}
                  onClick={() => deletePdf(pdf.id)}
                  className="shrink-0 text-zinc-500 hover:text-red-400 disabled:opacity-40"
                  aria-label={`Delete ${pdf.filename}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <p className="text-xs text-zinc-600">PDF only, max 15 MB each.</p>
          </CardContent>
        </Card>

        {user ? (
          <div className="mt-8">
            <UserProfileSection user={user} />
          </div>
        ) : null}

        <div className="mt-8 flex gap-3">
          <Button type="button" disabled={saving} onClick={saveProfile} className={BTN_PRIMARY}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Saving…" : "Save profile"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={BTN_OUTLINE}
            onClick={() => router.push("/dashboard")}
          >
            Dashboard
          </Button>
        </div>
      </main>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} redirectUrl="/profile" />
    </div>
  )
}
