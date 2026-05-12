import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import WaitlistForm from "@/components/ui/waitlist-form"

export default function WaitlistPage() {
  return (
    <div className="min-h-screen bg-[#050608] text-white relative overflow-hidden flex flex-col">
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(34,211,238,0.12),transparent_55%)]"
        aria-hidden
      />
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <FlickeringGrid
          className="absolute inset-0 opacity-90"
          squareSize={4}
          gridGap={6}
          color="rgb(148, 163, 184)"
          maxOpacity={0.06}
          flickerChance={1.8}
        />
      </div>

      <main className="flex-1 relative z-10 px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-lg mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            chromie.dev
          </Link>

          <div className="mt-10 relative rounded-[1.35rem] border border-white/[0.09] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-px shadow-[0_32px_120px_-24px_rgba(0,0,0,0.75)]">
            <div className="rounded-[1.3rem] bg-[#0a0c12]/85 backdrop-blur-xl px-6 py-9 sm:px-10 sm:py-10">
              <WaitlistForm />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
