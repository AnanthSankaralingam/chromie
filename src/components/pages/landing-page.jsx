import Link from "next/link"
import { Mail } from "lucide-react"
import { FlickeringGrid } from "@/components/ui/flickering-grid"

const DEMO_VIDEO_ID = "2b7Rfqgotvk"

const BLURB =
  "Current automation either sacrifices intelligence for reliability, or reliability for intelligence. We provide both through AI augmented with deterministic tooling."

const CONTACT_EMAILS = [
  "akshay.mistry@gmail.com",
  "ananth.sankaralingam@gmail.com",
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050608] text-white relative overflow-hidden flex flex-col">
      {/* Ambient layers */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(34,211,238,0.14),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_70%_50%_at_100%_50%,rgba(139,92,246,0.08),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_60%_40%_at_0%_80%,rgba(34,211,238,0.06),transparent_45%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-transparent to-[#050608]/90"
        aria-hidden
      />

      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <FlickeringGrid
          className="absolute inset-0 opacity-90"
          squareSize={4}
          gridGap={6}
          color="rgb(148, 163, 184)"
          maxOpacity={0.07}
          flickerChance={1.8}
        />
      </div>

      <main className="flex-1 relative z-10 flex flex-col items-center justify-center px-4 sm:px-6 py-20 sm:py-28">
        <div className="w-full max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-3 duration-700 fill-mode-both">
          {/* Hero */}
          <header className="text-center mb-12 sm:mb-16">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-[-0.04em] leading-[1.05] mb-5 sm:mb-6">
              <span className="bg-gradient-to-br from-white via-white to-zinc-400 bg-clip-text text-transparent">
                chromie.dev
              </span>
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-zinc-400 font-light tracking-wide max-w-2xl mx-auto leading-snug">
              the custom tool layer for{" "}
              <span className="font-normal text-transparent bg-clip-text bg-gradient-to-r from-cyan-200/95 to-teal-300/90">
                web agents
              </span>
            </p>

            <div className="mx-auto mt-10 h-px w-24 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" aria-hidden />
          </header>

          {/* Copy + video card */}
          <div className="relative rounded-[1.35rem] border border-white/[0.09] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-px shadow-[0_32px_120px_-24px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="rounded-[1.3rem] bg-[#0a0c12]/80 backdrop-blur-xl px-6 py-9 sm:px-10 sm:py-11">
              <p className="text-[15px] sm:text-[17px] leading-[1.75] text-zinc-400 text-pretty max-w-prose mx-auto text-center font-light">
                {BLURB}
              </p>

              <div className="relative mx-auto max-w-3xl mt-10 sm:mt-12">
                <div
                  className="pointer-events-none absolute -inset-3 rounded-2xl bg-gradient-to-b from-cyan-500/12 via-transparent to-violet-500/10 blur-2xl opacity-80"
                  aria-hidden
                />
                <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-black/60 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_64px_-8px_rgba(0,0,0,0.65)] ring-1 ring-cyan-400/10 aspect-video">
                  <span
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent z-10"
                    aria-hidden
                  />
                  <iframe
                    title="chromie.dev demo video"
                    src={`https://www.youtube-nocookie.com/embed/${DEMO_VIDEO_ID}`}
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              </div>

              <div className="flex justify-center mt-10 sm:mt-12 pt-10 sm:pt-12 border-t border-white/[0.08]">
                <Link
                  href="/waitlist"
                  className="inline-flex items-center justify-center rounded-xl border border-cyan-400/35 bg-cyan-500/[0.12] px-8 py-3.5 text-sm font-semibold text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all hover:border-cyan-300/55 hover:bg-cyan-500/[0.2] hover:shadow-[0_0_28px_-6px_rgba(34,211,238,0.35)]"
                >
                  Join the waitlist
                </Link>
              </div>

              <div className="mt-10 sm:mt-12 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 mb-4">
                  Contact
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3 sm:gap-4">
                  {CONTACT_EMAILS.map((address) => (
                    <a
                      key={address}
                      href={`mailto:${address}`}
                      className="group inline-flex items-center justify-center gap-2.5 rounded-xl border border-white/[0.14] bg-white/[0.07] px-4 py-3 text-[15px] sm:text-base font-medium text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all hover:border-cyan-400/45 hover:bg-white/[0.11] hover:text-white hover:shadow-[0_0_24px_-4px_rgba(34,211,238,0.25)] break-all sm:break-words sm:max-w-[min(100%,22rem)]"
                    >
                      <Mail
                        className="h-4 w-4 shrink-0 text-cyan-300/90 opacity-90 group-hover:opacity-100"
                        aria-hidden
                      />
                      <span className="min-w-0 text-left sm:text-center">{address}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
