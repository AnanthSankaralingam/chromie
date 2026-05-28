"use client"

import { StaggerItem, StaggerReveal } from "@/components/ui/landing/landing-motion"

const SIGNALS = [
  { label: "Browser", headless: "Headless Chrome", real: "Chrome extension" },
  { label: "TLS", headless: "Datacenter", real: "User session" },
  { label: "GPU", headless: "Disabled", real: "Real device" },
  { label: "Fingerprint", headless: "Spoofed", real: "Genuine" },
  { label: "Bot check", headless: "Blocked", real: "Passed", headlessBad: true, realGood: true },
]

export default function RealChromeVisual() {
  return (
    <div className="landing-visual-panel w-full overflow-hidden border border-white/10 bg-[#080808]">
      <div className="border-b border-white/10 px-4 py-3 text-center sm:px-5">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
          What sites see
        </p>
        <p className="mt-1 text-[11px] leading-snug text-zinc-400 sm:text-xs">
          Headless automation vs. chromie on real Chrome
        </p>
      </div>

      <StaggerReveal className="grid gap-px bg-white/10 md:grid-cols-2" stagger={0.08}>
        <StaggerItem className="h-full">
          <div className="flex h-full min-h-[260px] flex-col bg-[#0c0c0c] sm:min-h-[280px]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
                Headless / cloud VM
              </span>
              <span className="border border-red-500/40 bg-red-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-red-400">
                Flagged
              </span>
            </div>
            <dl className="flex flex-1 flex-col justify-center gap-3 p-4 sm:p-5">
              {SIGNALS.map((row) => (
                <div key={row.label} className="grid grid-cols-[88px_1fr] gap-2 text-[11px]">
                  <dt className="text-zinc-600">{row.label}</dt>
                  <dd className={row.headlessBad ? "text-red-400/90" : "text-zinc-400"}>
                    {row.headless}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </StaggerItem>

        <StaggerItem className="h-full">
          <div className="flex h-full min-h-[260px] flex-col bg-[#0c0c0c] sm:min-h-[280px]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
                chromie · real Chrome
              </span>
              <span className="border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-emerald-400">
                Clear
              </span>
            </div>
            <dl className="flex flex-1 flex-col justify-center gap-3 p-4 sm:p-5">
              {SIGNALS.map((row) => (
                <div key={row.label} className="grid grid-cols-[88px_1fr] gap-2 text-[11px]">
                  <dt className="text-zinc-600">{row.label}</dt>
                  <dd className={row.realGood ? "text-emerald-400/90" : "text-zinc-200"}>
                    {row.real}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </StaggerItem>
      </StaggerReveal>
    </div>
  )
}
