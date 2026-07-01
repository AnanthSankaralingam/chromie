import Image from "next/image"
import Link from "next/link"
import { Mail } from "lucide-react"

export const metadata = {
  title: "Page Not Found",
  description: "This Chromie page does not exist.",
}

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#0a0a0a] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_78%_70%,rgba(255,255,255,0.08),transparent_26%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:42px_42px] opacity-30" />

      <section className="relative z-10 mx-auto flex w-full max-w-5xl flex-col px-6 py-8">
        <Link href="/" className="flex w-fit items-center gap-2">
          <Image src="/chromie-logo-1.png" alt="Chromie" width={32} height={32} />
          <span className="text-xl font-semibold tracking-tight text-zinc-100">chromie.dev</span>
        </Link>

        <div className="flex flex-1 items-center py-16">
          <div className="grid w-full gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div className="border border-white/10 bg-black/60 p-5 font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
              <p>404</p>
              <div className="mt-5 h-px bg-white/10" />
              <p className="mt-5 leading-6">Route not found</p>
            </div>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-300">
                Missing page
              </p>
              <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                This page does not exist.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400">
                The page may have moved during the Chromie automation hub cleanup. If you expected
                something to be here, reach out to customer support at{" "}
                <a href="mailto:founders@chrome.dev" className="text-cyan-300 hover:underline">
                  founders@chrome.dev
                </a>
                .
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="mailto:founders@chrome.dev"
                  className="inline-flex items-center justify-center gap-2 border border-white bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
                >
                  Contact support
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
