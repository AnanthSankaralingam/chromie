"use client"

import Image from "next/image"
import { Reveal, StaggerItem, StaggerReveal } from "@/components/ui/landing/landing-motion"

export default function ConfidenceCtaSection({
  title = "Ship web agents with confidence",
  description = "Contact us and let's get you started.",
  primaryHref,
  primaryLabel = "Book a demo",
  secondaryHref,
  secondaryLabel,
  imageSrc = "/automations-dashboard.png",
  imageAlt = "chromie automations dashboard for scheduling browser workflows",
}) {
  return (
    <section className="confidence-cta-section border-b border-white/10 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <StaggerReveal className="mx-auto max-w-2xl text-center">
          <StaggerItem>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">{title}</h2>
          </StaggerItem>
          <StaggerItem>
            <p className="mx-auto mt-4 max-w-lg text-sm text-zinc-400 sm:text-base">{description}</p>
          </StaggerItem>
          {(primaryHref || secondaryHref) && (
            <StaggerItem>
              <div className="mx-auto mt-8 flex w-full max-w-xs flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:justify-center">
                {primaryHref ? (
                  <a
                    href={primaryHref}
                    target={primaryHref.startsWith("http") ? "_blank" : undefined}
                    rel={primaryHref.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center justify-center border border-white bg-white px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
                  >
                    {primaryLabel}
                  </a>
                ) : null}
                {secondaryHref ? (
                  <a
                    href={secondaryHref}
                    className="inline-flex items-center justify-center border border-white/25 bg-transparent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/[0.04]"
                  >
                    {secondaryLabel}
                  </a>
                ) : null}
              </div>
            </StaggerItem>
          )}
        </StaggerReveal>

        <Reveal className="relative mt-10 sm:mt-12" delay={0.12}>
          <div className="relative overflow-hidden border border-white/10 bg-[#080808]">
            <div
              className="pointer-events-none absolute inset-0 opacity-80"
              style={{
                backgroundImage: `
                  radial-gradient(ellipse 80% 60% at 50% 100%, rgba(56, 72, 88, 0.35), transparent 55%),
                  linear-gradient(180deg, #0a0a0a 0%, #101216 50%, #0a0a0a 100%)
                `,
              }}
              aria-hidden
            />
            <div
              className="landing-dither-overlay pointer-events-none absolute inset-0 opacity-[0.15]"
              aria-hidden
            />
            <Image
              src={imageSrc}
              alt={imageAlt}
              width={1024}
              height={579}
              className="relative h-auto w-full"
              sizes="(max-width: 1152px) 100vw, 1152px"
            />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
