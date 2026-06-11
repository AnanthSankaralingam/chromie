"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Check, Play } from "lucide-react"
import {
  FilmGrain,
  Reveal,
  SectionHeader,
  StaggerItem,
  StaggerReveal,
} from "@/components/ui/landing/landing-motion"
import ConfidenceCtaSection from "@/components/ui/landing/confidence-cta-section"
import { DEMO_USE_CASES, getDemoEmbedUrl } from "@/lib/demo-use-cases"

const CAL_URL = "https://cal.com/chromie"
const CONTACT_EMAIL = "founders@chromie.dev"

function UseCaseVideo({ useCase, playGeneration }) {
  return (
    <div className="border border-white/10 bg-black">
      <div className="relative aspect-video w-full bg-black">
        <iframe
          key={`${useCase.videoId}-${playGeneration}`}
          title={`chromie.dev ${useCase.title} demo`}
          src={getDemoEmbedUrl(useCase.videoId, { autoplay: playGeneration > 0 })}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  )
}

function UseCaseDetail({ useCase }) {
  return (
    <div className="border border-white/10 bg-zinc-950 p-6 sm:p-8">
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-400/80">
        {useCase.label}
      </p>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
        {useCase.title}
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-zinc-300 sm:text-base">
        {useCase.summary}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-zinc-500">{useCase.description}</p>
      <ul className="mt-6 space-y-3">
        {useCase.highlights.map((highlight) => (
          <li key={highlight} className="flex items-start gap-3 text-sm text-zinc-300">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
            {highlight}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function UseCasesPage() {
  const [activeId, setActiveId] = useState(DEMO_USE_CASES[0]?.id ?? null)
  const [playGeneration, setPlayGeneration] = useState(0)
  const activeUseCase = DEMO_USE_CASES.find((useCase) => useCase.id === activeId) ?? null

  function selectUseCase(id) {
    if (id === activeId) return
    setActiveId(id)
    setPlayGeneration((generation) => generation + 1)
    console.log("[use-cases] selected demo:", id)
  }

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white">
      <FilmGrain />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/chromie-logo-1.png"
              alt="Chromie"
              width={28}
              height={28}
              className="shrink-0"
            />
            <span className="text-lg font-bold tracking-tight">
              chromie<span className="font-normal text-zinc-500">.dev</span>
            </span>
          </Link>

          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/"
              className="hidden font-mono text-[11px] uppercase tracking-wider text-zinc-500 transition-colors hover:text-white sm:inline"
            >
              Home
            </Link>
            <a
              href={CAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-white bg-white px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-zinc-200 sm:px-5 sm:py-2.5 sm:text-sm"
            >
              Book a demo
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-[1]">
        <section className="border-b border-white/10 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeader
              label="Use Cases"
              title="See chromie in your industry"
              description="Pick a workflow below to watch a tailored demo and learn how teams use deterministic browser automation in production."
            />
          </div>
        </section>

        <section className="border-b border-white/10 py-10 sm:py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,18rem)_1fr] lg:gap-10">
              <StaggerReveal className="flex flex-col gap-2" stagger={0.06}>
                <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                  Demos
                </p>
                {DEMO_USE_CASES.map((useCase) => {
                  const isActive = useCase.id === activeId
                  return (
                    <StaggerItem key={useCase.id}>
                      <button
                        type="button"
                        onClick={() => selectUseCase(useCase.id)}
                        aria-pressed={isActive}
                        className={`flex w-full items-start gap-3 border px-4 py-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
                          isActive
                            ? "border-cyan-400/70 bg-cyan-500/15 text-white"
                            : "border-white/10 bg-zinc-950 text-zinc-300 hover:border-white/25 hover:bg-white/[0.03]"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border ${
                            isActive
                              ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-100"
                              : "border-white/15 bg-black text-zinc-400"
                          }`}
                          aria-hidden
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{useCase.title}</span>
                          <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
                            {useCase.summary}
                          </span>
                        </span>
                      </button>
                    </StaggerItem>
                  )
                })}
              </StaggerReveal>

              {activeUseCase ? (
                <Reveal className="space-y-0" delay={0.05}>
                  <UseCaseVideo useCase={activeUseCase} playGeneration={playGeneration} />
                  <UseCaseDetail useCase={activeUseCase} />
                </Reveal>
              ) : null}
            </div>
          </div>
        </section>

        <ConfidenceCtaSection
          title="Want a demo for your workflow?"
          description="Tell us about your use case and we'll show you how chromie fits your stack."
          primaryHref={CAL_URL}
          primaryLabel="Book a demo"
          secondaryHref={`mailto:${CONTACT_EMAIL}`}
          secondaryLabel={CONTACT_EMAIL}
        />
      </main>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="font-mono text-[11px] text-zinc-600">
            © {new Date().getFullYear()} chromie.dev. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
