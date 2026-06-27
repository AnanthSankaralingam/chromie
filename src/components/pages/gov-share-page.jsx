"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "@/components/SessionProviderClient"
import { BTN_PRIMARY, CARD_CLASS, LIST_ITEM } from "@/components/ui/app-dashboard-theme"
import GovLoadingState from "@/components/ui/gov/gov-loading-state"
import GovPageHeader from "@/components/ui/gov/gov-page-header"
import GovPageShell from "@/components/ui/gov/gov-page-shell"
import OpportunityStats from "@/components/ui/gov/opportunity-stats"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  companyNameFromDomain,
  isValidDomain,
  normalizeDomain,
} from "@/lib/gov-domain"
import { ArrowRight, Lock } from "lucide-react"

const TEASER_OPPORTUNITY_POOL = [
  {
    id: "teaser-1",
    title: "Enterprise IT modernization and cloud migration support services",
    agency: "Department of Veterans Affairs",
    source: "sam_gov",
  },
  {
    id: "teaser-2",
    title: "Cybersecurity operations center managed services",
    agency: "Department of Homeland Security",
    source: "sam_gov",
  },
  {
    id: "teaser-3",
    title: "Data analytics platform development and sustainment",
    agency: "General Services Administration",
    source: "sam_gov",
  },
  {
    id: "teaser-4",
    title: "Engineering research and development for defense systems",
    agency: "Air Force Research Laboratory",
    source: "sbir",
  },
  {
    id: "teaser-5",
    title: "Systems engineering and technical assistance support",
    agency: "Department of Defense",
    source: "sam_gov",
  },
]

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffleArray(items) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function formatOffsetDate(daysFromNow) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().slice(0, 10)
}

function buildTeaserData() {
  const total = randomInt(3, 5)
  const openDeadlines = randomInt(1, total)
  const highFitCount = randomInt(1, total)
  const opportunities = shuffleArray(TEASER_OPPORTUNITY_POOL)
    .slice(0, total)
    .map((item, index) => ({
      ...item,
      fit_score: randomInt(85, 96) / 100,
      published_date: formatOffsetDate(-randomInt(3, 21)),
      response_date: formatOffsetDate(randomInt(14, 90)),
      id: `${item.id}-${index}`,
    }))

  console.log("[gov-share] generated teaser stats", { total, openDeadlines, highFitCount })
  return { total, openDeadlines, highFitCount, opportunities }
}

function formatFitScore(score) {
  if (score == null || Number.isNaN(Number(score))) return null
  return `${Math.round(Number(score) * 100)}%`
}

function TeaserOpportunityRow({ run }) {
  const fitLabel = formatFitScore(run.fit_score)

  return (
    <article className={`${LIST_ITEM} overflow-hidden select-none`}>
      <div className="flex w-full items-start gap-4 px-4 py-4 blur-sm">
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-[15px] font-semibold leading-snug text-white">{run.title}</h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
            <span>{run.agency}</span>
            <span className="text-zinc-700">·</span>
            <span className="inline-flex shrink-0 border border-white/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              {run.source === "sam_gov" ? "SAM.gov" : run.source.replace(/_/g, " ")}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
            <span>Published {run.published_date}</span>
            <span className="text-amber-300/90">Response {run.response_date}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {fitLabel ? (
            <span className="inline-flex min-w-[3rem] justify-center border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 font-mono text-xs font-medium text-emerald-300">
              {fitLabel}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function GovShareContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: sessionLoading } = useSession()
  const [showAuth, setShowAuth] = useState(false)
  const [checkingProfile, setCheckingProfile] = useState(false)
  const [teaserData, setTeaserData] = useState(null)

  const rawCompany = searchParams.get("company") || ""
  const companyDomain = useMemo(() => normalizeDomain(rawCompany), [rawCompany])
  const isValidCompany = Boolean(companyDomain && isValidDomain(companyDomain))
  const companyName = isValidCompany ? companyNameFromDomain(companyDomain) : ""
  const onboardingPath = isValidCompany
    ? `/gov/onboarding?company=${encodeURIComponent(companyDomain)}`
    : "/gov/onboarding"

  useEffect(() => {
    if (!isValidCompany) return
    setTeaserData(buildTeaserData())
  }, [isValidCompany])

  useEffect(() => {
    if (sessionLoading || !user || !isValidCompany) return

    let cancelled = false

    async function resolveSignedInUser() {
      setCheckingProfile(true)
      try {
        const res = await fetch("/api/gov-onboarding")
        const json = await res.json().catch(() => ({}))
        if (cancelled) return

        if (res.ok && json.status === "already_linked") {
          router.push("/gov")
          return
        }

        router.push(onboardingPath)
      } catch (err) {
        console.error("[gov-share] profile check failed", err)
        if (!cancelled) {
          router.push(onboardingPath)
        }
      } finally {
        if (!cancelled) {
          setCheckingProfile(false)
        }
      }
    }

    resolveSignedInUser()
    return () => {
      cancelled = true
    }
  }, [sessionLoading, user, isValidCompany, onboardingPath, router])

  if (sessionLoading || checkingProfile || (isValidCompany && !teaserData)) {
    return <GovLoadingState message="Loading your invite…" />
  }

  if (!isValidCompany) {
    return (
      <GovPageShell maxWidth="lg" showOpportunities={false}>
        <div className="py-10 text-center sm:py-20">
          <h1 className="text-xl font-bold">Invalid invite link</h1>
          <p className="mt-3 text-sm text-zinc-400">
            This link is missing a valid company domain. Ask your Chromie contact for an updated
            link.
          </p>
        </div>
      </GovPageShell>
    )
  }

  return (
    <GovPageShell
      maxWidth="5xl"
      showOpportunities={false}
      authOpen={showAuth}
      onAuthClose={() => setShowAuth(false)}
      authRedirect={onboardingPath}
    >
      <GovPageHeader
        label="Government contracting"
        title={`Contract opportunities for ${companyName}`}
        description={`We found federal contract opportunities matched to ${companyName}. Sign up with your @${companyDomain} email to unlock your personalized dashboard.`}
      />

      <OpportunityStats
        total={teaserData.total}
        openDeadlines={teaserData.openDeadlines}
        highFitCount={teaserData.highFitCount}
      />

      <div className="relative mt-8">
        <div className="space-y-2">
          {teaserData.opportunities.map((run) => (
            <TeaserOpportunityRow key={run.id} run={run} />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent via-black/20 to-black/60">
          <Card className={`${CARD_CLASS} pointer-events-auto mx-4 max-w-md border-cyan-400/20`}>
            <CardContent className="px-6 py-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center border border-cyan-400/30 bg-cyan-400/10">
                <Lock className="h-5 w-5 text-cyan-300" />
              </div>
              <p className="mt-4 text-lg font-semibold text-white">
                {teaserData.total} opportunities waiting
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Create a free account with your <strong className="text-zinc-200">@{companyDomain}</strong>{" "}
                email to view full details, fit scores, and daily contract search results.
              </p>
              <Button
                className={`mt-6 ${BTN_PRIMARY}`}
                onClick={() => setShowAuth(true)}
              >
                Sign up to unlock
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-zinc-600">
        Preview opportunities are illustrative. Sign up to run a live SAM.gov and SBIR search for{" "}
        {companyName}.
      </p>
    </GovPageShell>
  )
}

export default function GovSharePage() {
  return (
    <Suspense fallback={<GovLoadingState message="Loading invite…" />}>
      <GovShareContent />
    </Suspense>
  )
}
