"use client"

import {
  Reveal,
  ScrollScrubVisual,
  SectionHeader,
  StaggerItem,
  StaggerReveal,
} from "@/components/ui/landing/landing-motion"
import { PrimaryButton } from "@/components/ui/landing/landing-buttons"
import LandingComparisonTable from "@/components/ui/landing/landing-comparison-table"
import SpotlightVisual from "@/components/ui/landing/spotlight-visual"
import {
  BENEFITS,
  CAL_URL,
  FEATURE_PILLS,
} from "@/components/ui/landing/landing-content"

export function FeaturesSection() {
  return (
    <section id="features" className="border-b border-white/10 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          label="Features"
          title="Web agent infrastructure that just works"
          description="Deterministic tool calls, execution analysis, and runtime skill selection, built for production web agents."
        />

        <StaggerReveal className="mt-10 flex flex-wrap gap-2" stagger={0.05}>
          {FEATURE_PILLS.map((pill) => (
            <StaggerItem key={pill}>
              <span className="border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                {pill}
              </span>
            </StaggerItem>
          ))}
        </StaggerReveal>

        <Reveal className="mt-8" delay={0.1}>
          <div className="grid gap-0 border border-white/10 lg:grid-cols-[1fr_1.2fr]">
            <div className="border-b border-white/10 p-6 sm:p-8 lg:border-b-0 lg:border-r">
              <h3 className="text-lg font-bold">Live execution trace</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                Every skill invocation logged: inputs, outputs, latency, and task context.
                Replay runs for debugging and compliance.
              </p>
              <div className="mt-6">
                <PrimaryButton href={CAL_URL} external>
                  Book a demo
                </PrimaryButton>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <ScrollScrubVisual>
                <SpotlightVisual type="replay" />
              </ScrollScrubVisual>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export function BenefitsSection() {
  return (
    <section id="benefits" className="border-b border-white/10 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader label="Benefits" title="Web automation at production scale" />

        <StaggerReveal className="mt-12 grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <StaggerItem key={benefit.title}>
              <article className="h-full bg-[#0a0a0a] p-6 transition-colors hover:bg-white/[0.02] sm:p-8">
                <h3 className="text-base font-bold text-white">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{benefit.body}</p>
              </article>
            </StaggerItem>
          ))}
        </StaggerReveal>
      </div>
    </section>
  )
}

export function ComparisonSection() {
  return (
    <section id="compare" className="border-b border-white/10 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader label="Comparison" title="Why teams choose chromie" />
        <LandingComparisonTable />
      </div>
    </section>
  )
}
