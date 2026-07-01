"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import {
  domainFromEmail,
  emailDomainMatchesInvite,
  isValidDomain,
  normalizeDomain,
} from "@/lib/gov/gov-domain"
import { ArrowRight, Building2 } from "lucide-react"

function govProfileToForm(profile) {
  return {
    name: profile?.name || "",
    company_domain: profile?.company_domain || "",
    corporate_overview: profile?.corporate_overview || "",
    search_keywords: Array.isArray(profile?.search_keywords)
      ? profile.search_keywords.join("\n")
      : String(profile?.search_keywords || ""),
    naics_codes: Array.isArray(profile?.naics_codes)
      ? profile.naics_codes.join("\n")
      : String(profile?.naics_codes || ""),
    sbir_categories: Array.isArray(profile?.sbir_categories)
      ? profile.sbir_categories
      : [],
  }
}

function GovOnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: sessionLoading } = useSession()
  const [showAuth, setShowAuth] = useState(false)
  const [checkingExisting, setCheckingExisting] = useState(false)
  const [autoLinking, setAutoLinking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [error, setError] = useState("")
  const [enrichmentStatus, setEnrichmentStatus] = useState("")
  const [inviteNotice, setInviteNotice] = useState("")
  const [isOnboardingAdmin, setIsOnboardingAdmin] = useState(false)
  const [adminLinkedProfile, setAdminLinkedProfile] = useState(null)
  const [companyUrl, setCompanyUrl] = useState("")
  const [form, setForm] = useState({
    name: "",
    company_domain: "",
    search_keywords: "",
    naics_codes: "",
    sbir_categories: [],
    corporate_overview: "",
  })
  const autoEnrichAttempted = useRef(false)
  const formRef = useRef(form)
  const enrichRef = useRef(null)
  formRef.current = form

  const rawInviteDomain = searchParams.get("company") || ""
  const inviteDomain = useMemo(() => normalizeDomain(rawInviteDomain), [rawInviteDomain])
  const hasValidInvite = Boolean(inviteDomain && isValidDomain(inviteDomain))
  const authRedirect = hasValidInvite
    ? `/gov/onboarding?company=${encodeURIComponent(inviteDomain)}`
    : "/gov/onboarding"

  async function enrichFromWebsite(requestedUrlOverride) {
    if (!user) {
      setShowAuth(true)
      return false
    }

    const requestedUrl = String(requestedUrlOverride || companyUrl).trim()
    if (!requestedUrl) {
      setError("Enter your company website URL first.")
      return false
    }

    const formAtRequestStart = formRef.current
    setEnriching(true)
    setError("")
    if (!requestedUrlOverride) {
      setEnrichmentStatus("")
    }
    try {
      const res = await fetch("/api/gov-onboarding/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_url: requestedUrl }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 401) {
        setShowAuth(true)
        return false
      }
      if (!res.ok) {
        setError(json.error || "Could not fill your company profile from this website.")
        return false
      }

      const profile = json.profile || {}
      const nextValues = {
        name: profile.name || "",
        company_domain: profile.company_domain || "",
        corporate_overview: profile.corporate_overview || "",
        search_keywords: Array.isArray(profile.search_keywords)
          ? profile.search_keywords.join("\n")
          : String(profile.search_keywords || ""),
        naics_codes: Array.isArray(profile.naics_codes)
          ? profile.naics_codes.join("\n")
          : String(profile.naics_codes || ""),
        sbir_categories: Array.isArray(profile.sbir_categories)
          ? profile.sbir_categories
          : [],
      }

      setForm((prev) => {
        const merged = { ...prev }
        for (const [key, value] of Object.entries(nextValues)) {
          if (!value) continue
          if (!prev[key] || prev[key] === formAtRequestStart[key]) {
            merged[key] = value
          }
        }
        return merged
      })

      if (!requestedUrlOverride) {
        setEnrichmentStatus(
          `Filled profile details from ${profile.company_domain || requestedUrl}. Review before creating the profile.`,
        )
      }
      console.log("[gov-onboarding] website enrichment completed", {
        domain: profile.company_domain,
        confidence: profile.confidence,
      })
      return true
    } finally {
      setEnriching(false)
    }
  }
  enrichRef.current = enrichFromWebsite

  useEffect(() => {
    if (sessionLoading) return
    if (!user) {
      setShowAuth(true)
      setCheckingExisting(false)
      return
    }

    let cancelled = false

    async function resolveOnboardingState() {
      setCheckingExisting(true)
      setError("")
      setInviteNotice("")

      try {
        const res = await fetch("/api/gov-onboarding")
        const json = await res.json().catch(() => ({}))
        if (cancelled) return

        if (res.status === 401) {
          setShowAuth(true)
          return
        }
        if (!res.ok) {
          setError(json.error || "Could not load onboarding status.")
          return
        }

        const adminMode = Boolean(json.is_onboarding_admin)
        setIsOnboardingAdmin(adminMode)
        setAdminLinkedProfile(json.currently_linked_profile || null)

        if (json.status === "already_linked") {
          router.push("/gov")
          return
        }

        if (json.status === "existing_company" && !adminMode) {
          setForm((prev) => ({ ...prev, ...govProfileToForm(json.gov_profile) }))
          setAutoLinking(true)
          const linkRes = await fetch("/api/gov-onboarding", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ link_existing: true }),
          })
          const linkJson = await linkRes.json().catch(() => ({}))
          if (cancelled) return

          if (linkRes.status === 401) {
            setShowAuth(true)
            return
          }
          if (!linkRes.ok) {
            setError(linkJson.error || "Could not join your company profile.")
            return
          }

          console.log("[gov-onboarding] auto-linked existing company", linkJson.gov_profile?.id)
          router.push("/gov")
          router.refresh()
          return
        }

        if (hasValidInvite) {
          const inviteMatches = adminMode || emailDomainMatchesInvite(user.email, inviteDomain)
          if (inviteMatches) {
            setForm((prev) => ({
              ...prev,
              company_domain: prev.company_domain || inviteDomain,
            }))
            setCompanyUrl(`https://${inviteDomain}`)
          } else {
            setInviteNotice(
              `This invite was for ${inviteDomain}. Your email domain (${domainFromEmail(user.email) || "unknown"}) doesn't match, so you can set up your company manually below.`,
            )
          }
        }

        if (json.email_domain && !hasValidInvite && !adminMode) {
          setForm((prev) => ({
            ...prev,
            company_domain: prev.company_domain || json.email_domain,
          }))
        }

        if (
          hasValidInvite &&
          (adminMode || emailDomainMatchesInvite(user.email, inviteDomain)) &&
          !autoEnrichAttempted.current
        ) {
          autoEnrichAttempted.current = true
          const inviteUrl = `https://${inviteDomain}`
          const enriched = await enrichRef.current?.(inviteUrl)
          if (cancelled) return
          if (enriched) {
            setEnrichmentStatus(
              adminMode
                ? `Admin mode — pre-filled profile from ${inviteDomain}. Review before linking.`
                : `Invite matched your company email — we pre-filled your profile from ${inviteDomain}. Review before creating.`,
            )
          }
        }
      } finally {
        if (!cancelled) {
          setCheckingExisting(false)
          setAutoLinking(false)
        }
      }
    }

    resolveOnboardingState()
    return () => {
      cancelled = true
    }
  }, [sessionLoading, user, router, hasValidInvite, inviteDomain])

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
        body: JSON.stringify({
          ...form,
          schedule_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
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
      router.push("/gov")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  if (sessionLoading || checkingExisting || autoLinking) {
    return (
      <GovLoadingState
        message={
          autoLinking
            ? "Joining your company profile…"
            : enriching
              ? "Pre-filling your company profile…"
              : "Loading onboarding…"
        }
      />
    )
  }

  return (
    <GovPageShell
      maxWidth="3xl"
      authOpen={showAuth}
      onAuthClose={() => setShowAuth(false)}
      authRedirect={authRedirect}
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
            Chromie uses this profile to configure contract searches, rank opportunities, and connect
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
                {isOnboardingAdmin
                  ? `Admin onboarding for ${user.email}. Enter any company domain to create or join a gov profile.`
                  : `Your signed-in email is ${user.email}. We use the company domain to link teammates to the same shared profile.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              {error ? <GovAlertBanner>{error}</GovAlertBanner> : null}
              {isOnboardingAdmin ? (
                <p className="border border-violet-400/20 bg-violet-400/10 px-3 py-2 text-sm text-violet-100">
                  Admin mode enabled
                  {adminLinkedProfile?.company_domain
                    ? ` — currently linked to ${adminLinkedProfile.company_domain}. Submitting will switch profiles.`
                    : ". You can rerun this flow anytime at /gov/onboarding."}
                </p>
              ) : null}
              {inviteNotice ? (
                <p className="border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                  {inviteNotice}
                </p>
              ) : null}
              {enrichmentStatus ? (
                <p className="border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">
                  {enrichmentStatus}
                </p>
              ) : null}

              <GovField
                label="Company website"
                hint="Paste your company URL to fill this profile automatically, then review the results."
              >
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={companyUrl}
                    onChange={(event) => setCompanyUrl(event.target.value)}
                    placeholder="https://acmefederal.com"
                    className={`${INPUT_CLASS} min-w-0 flex-1`}
                  />
                  <Button
                    type="button"
                    disabled={enriching || submitting}
                    className={`${BTN_OUTLINE} mt-1.5 shrink-0`}
                    onClick={() => enrichFromWebsite()}
                  >
                    {enriching ? "Filling..." : "Fill from website"}
                  </Button>
                </div>
              </GovField>

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
                hint="Teammates with the same domain are linked to this shared company profile."
              >
                <Input
                  value={form.company_domain}
                  onChange={(event) => updateField("company_domain", event.target.value)}
                  placeholder="company.com"
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
            <Button type="submit" disabled={submitting || enriching} className={BTN_PRIMARY}>
              {submitting ? "Setting up..." : "Create company profile"}
              {!submitting ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
            </Button>
          </div>
        </form>
      )}
    </GovPageShell>
  )
}

export default function GovOnboardingPage() {
  return (
    <Suspense fallback={<GovLoadingState message="Loading onboarding…" />}>
      <GovOnboardingContent />
    </Suspense>
  )
}
