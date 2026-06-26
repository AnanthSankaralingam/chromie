import {
  Reveal,
  StaggerItem,
  StaggerReveal,
} from "@/components/ui/landing/landing-motion"
import { TRUSTED_LOGOS } from "@/components/ui/landing/landing-content"
import { SectionLabel } from "@/components/ui/landing/landing-primitives"

export default function LandingTrustedBy() {
  return (
    <Reveal className="border-t border-white/10 px-6 py-10 sm:px-10">
      <SectionLabel>Trusted by</SectionLabel>
      <StaggerReveal className="mt-6 flex flex-wrap items-center justify-center gap-10 opacity-60 grayscale transition-opacity hover:opacity-90 sm:justify-start sm:gap-12">
        {TRUSTED_LOGOS.map((logo) => (
          <StaggerItem key={logo.alt}>
            <a
              href={logo.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block transition-opacity hover:opacity-100"
            >
              <img
                src={logo.src}
                alt={logo.alt}
                className={`h-7 object-contain sm:h-8${logo.wide ? " w-auto max-w-[7rem] sm:max-w-[8.5rem]" : ""}`}
                style={{
                  mixBlendMode: "screen",
                  ...(logo.invert ? { filter: "brightness(0) invert(1)" } : {}),
                }}
              />
            </a>
          </StaggerItem>
        ))}
      </StaggerReveal>
    </Reveal>
  )
}
