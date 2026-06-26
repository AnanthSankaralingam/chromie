"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/components/SessionProviderClient"
import { BTN_OUTLINE, BTN_PRIMARY, CARD_CLASS, INPUT_CLASS, SECTION_LABEL } from "@/components/ui/app-dashboard-theme"
import GovAlertBanner from "@/components/ui/gov/gov-alert-banner"
import { GovSignInGate } from "@/components/ui/gov/gov-gate-cards"
import GovField from "@/components/ui/gov/gov-field"
import GovLoadingState from "@/components/ui/gov/gov-loading-state"
import GovPageShell from "@/components/ui/gov/gov-page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/forms-and-input/input"
import { ArrowRight, Building2 } from "lucide-react"

const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "icloud.com",
  "live.com",
  "me.com",
  "outlook.com",
  "proton.me",
  "protonmail.com",
  "yahoo.com",
])

function normalizeDomain(value) {
  const raw = String(value || "").trim().toLowerCase()
  if (!raw) return ""
  try {
    const withProtocol = raw.includes("://") ? raw : `https://${raw}`
    return new URL(withProtocol).hostname.replace(/^www\./, "")
  } catch {
    return raw.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].split(":")[0]
  }
}

function domainFromEmail(email) {
  return normalizeDomain(String(email || "").split("@")[1] || "")
}

export default function GovOnboardingPage() {
  const router = useRouter()
  const { user, isLoading: sessionLoading } = useSession()
  const [showAuth, setShowAuth] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    name: "",
    company_domain: "",
    search_keywords: "",
    naics_codes: "",
    corporate_overview: "",
  })

  const emailDomain = useMemo(() => domainFromEmail(user?.email), [user?.email])
  const likelyPersonalEmail = emailDomain ? PERSONAL_EMAIL_DOMAINS.has(emailDomain) : false

  useEffect(() => {
    if (sessionLoading) return
    if (!user) {
      setShowAuth(true)
      return
    }
    if (emailDomain && !likelyPersonalEmail) {
      setForm((prev) => (prev.company_domain ? prev : { ...prev, company_domain: emailDomain }))
    }
  }, [emailDomain, likelyPersonalEmail, sessionLoading, user])

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function submitOnboarding(event) {
    event.preventDefault()
    if (!user) {
      setShowAuth(true)
      return
    }

    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/gov-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 401) {
        setShowAuth(true)
        return
      }
      if (!res.ok) {
        setError(json.error || "Could not complete onboarding.")
        return
      }

      console.log("[gov-onboarding] completed", json.gov_profile?.id)
      router.push("/gov/dashboard")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  if (sessionLoading) {
    return <GovLoadingState message="Loading onboarding…" />
  }

  return (
    <GovPageShell
      maxWidth="3xl"
      authOpen={showAuth}
      onAuthClose={() => setShowAuth(false)}
      authRedirect="/gov/onboarding"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/15 bg-white/[0.03]">
          <Building2 className="h-5 w-5 text-cyan-300" />
        </div>
        <div>
          <p className={SECTION_LABEL}>Government onboarding</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Set up your company profile
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Chromie uses this profile to configure SAM.gov searches, rank opportunities, and connect
            teammates from the same organization.
          </p>
        </div>
      </div>

      {!user ? (
        <GovSignInGate
          message="Sign in or create an account to start government onboarding."
          onSignIn={() => setShowAuth(true)}
        />
      ) : (
        <form onSubmit={submitOnboarding}>
          <Card className={`mt-8 ${CARD_CLASS}`}>
            <CardHeader className="border-b border-white/10 pb-4">
              <CardTitle className="text-base font-bold text-white">Company identity</CardTitle>
              <CardDescription className="text-zinc-400">
                Your signed-in email is {user.email}. We use the company domain to link teammates to
                the same shared profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              {likelyPersonalEmail ? (
                <GovAlertBanner variant="warning">
                  You are signed in with a personal email domain. Only env-allowlisted admin/test
                  emails can continue by entering a target company domain.
                </GovAlertBanner>
              ) : null}

              {error ? <GovAlertBanner>{error}</GovAlertBanner> : null}

              <GovField label="Company name">
                <Input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Acme Federal Solutions"
                  className={INPUT_CLASS}
                  required
                />
              </GovField>

              <GovField
                label="Company domain"
                hint={
                  likelyPersonalEmail
                    ? "Allowlisted admins can enter the target customer domain, like morphworks.ai."
                    : `This should match your work email domain (${emailDomain || "company.com"}).`
                }
              >
                <Input
                  value={form.company_domain}
                  onChange={(event) => updateField("company_domain", event.target.value)}
                  placeholder={emailDomain || "company.com"}
                  className={INPUT_CLASS}
                  required
                />
              </GovField>

              <GovField label="Company overview" hint="Short context used for future fit analysis.">
                <textarea
                  rows={5}
                  value={form.corporate_overview}
                  onChange={(event) => updateField("corporate_overview", event.target.value)}
                  placeholder="Describe your capabilities, target agencies, past performance, and contract focus."
                  className={`${INPUT_CLASS} w-full px-3 py-2`}
                />
              </GovField>

              <div className="grid gap-5 sm:grid-cols-2">
                <GovField label="Search keywords" hint="One per line.">
                  <textarea
                    rows={5}
                    value={form.search_keywords}
                    onChange={(event) => updateField("search_keywords", event.target.value)}
                    placeholder={"IT modernization\ndata integration\nasset management"}
                    className={`${INPUT_CLASS} w-full px-3 py-2 font-mono`}
                  />
                </GovField>

                <GovField label="NAICS codes" hint="One per line.">
                  <textarea
                    rows={5}
                    value={form.naics_codes}
                    onChange={(event) => updateField("naics_codes", event.target.value)}
                    placeholder={"541511\n541512\n541519"}
                    className={`${INPUT_CLASS} w-full px-3 py-2 font-mono`}
                  />
                </GovField>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="submit" disabled={submitting} className={BTN_PRIMARY}>
              {submitting ? "Setting up..." : "Create company profile"}
              {!submitting ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
            </Button>
            <Button
              type="button"
              className={BTN_OUTLINE}
              onClick={() => router.push("/gov/dashboard")}
            >
              Back to dashboard
            </Button>
          </div>
        </form>
      )}
    </GovPageShell>
  )
}
