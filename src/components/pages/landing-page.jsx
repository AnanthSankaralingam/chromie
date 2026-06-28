"use client"

import ConfidenceCtaSection from "@/components/ui/landing/confidence-cta-section"
import LandingFaqSection from "@/components/ui/landing/landing-faq-section"
import LandingFooter from "@/components/ui/landing/landing-footer"
import LandingHeader from "@/components/ui/landing/landing-header"
import LandingHeroSection from "@/components/ui/landing/landing-hero-section"
import {
  BenefitsSection,
  ComparisonSection,
  FeaturesSection,
} from "@/components/ui/landing/landing-sections"
import SpotlightSection from "@/components/ui/landing/spotlight-section"
import {
  FilmGrain,
  HeroScrollGlow,
} from "@/components/ui/landing/landing-motion"
import { HatchBand } from "@/components/ui/landing/landing-primitives"
import {
  CAL_URL,
  CONTACT_EMAIL,
  SPOTLIGHTS,
} from "@/components/ui/landing/landing-content"

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white">
      <FilmGrain />
      <HeroScrollGlow />

      <a
        href="/gov/onboarding"
        className="relative z-50 block border-b border-cyan-400/30 bg-cyan-400 px-4 py-2 text-center text-sm font-semibold text-black transition-colors hover:bg-cyan-300"
      >
        🚀 New Launch: Try our free, self-serve automation tool for Government Contracting →
      </a>
      <LandingHeader />
      <HatchBand />

      <main className="relative z-[1]">
        <LandingHeroSection />

        {SPOTLIGHTS.map((item, index) => (
          <SpotlightSection key={item.id} item={item} reverse={index % 2 === 1} />
        ))}

        <HatchBand />
        <FeaturesSection />
        <BenefitsSection />
        <ComparisonSection />
        <HatchBand />
        <LandingFaqSection />

        <ConfidenceCtaSection
          primaryHref={CAL_URL}
          primaryLabel="Book a demo"
          secondaryHref={`mailto:${CONTACT_EMAIL}`}
          secondaryLabel={CONTACT_EMAIL}
        />
      </main>

      <HatchBand />
      <LandingFooter />
    </div>
  )
}
