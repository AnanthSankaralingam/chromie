"use client"

import { Plus, Sparkles } from "lucide-react"
import { StaggerItem, StaggerReveal } from "@/components/ui/landing/landing-motion"

const PATHS = [
  {
    id: "new",
    icon: Plus,
    title: "Automate new workflow",
    description: "chromie agent builds the workflow with deterministic tools.",
    steps: ["Define the task", "Agent + tools scaffold the flow", "Ship a new extension or agent"],
  },
  {
    id: "upgrade",
    icon: Sparkles,
    title: "Upgrade existing automation",
    description: "Keep what works. Add chromie tools to your current setup.",
    steps: [
      "Connect your existing automation",
      "Analysis finds repeatable actions",
      "Add deterministic tools in place",
    ],
  },
]

export default function AutomationPathsVisual() {
  return (
    <div className="landing-visual-panel w-full overflow-hidden border border-white/10 bg-[#080808]">
      <div className="border-b border-white/10 px-4 py-2.5 text-center">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">Two ways in</p>
      </div>

      <StaggerReveal
        className="flex flex-col gap-px bg-white/10 md:flex-row md:items-stretch"
        stagger={0.1}
      >
        {PATHS.map((path) => {
          const Icon = path.icon
          return (
            <StaggerItem key={path.id} className="min-w-0 flex-1">
              <div className="flex h-full flex-col bg-[#0c0c0c] p-5 sm:p-6">
                <div className="flex h-9 w-9 items-center justify-center border border-white/15 bg-white/[0.04]">
                  <Icon className="h-4 w-4 text-zinc-300" aria-hidden />
                </div>

                <h4 className="mt-4 text-sm font-bold text-white sm:text-base">{path.title}</h4>
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-400 sm:text-xs">
                  {path.description}
                </p>

                <ul className="mt-4 space-y-1.5 border-t border-white/10 pt-4">
                  {path.steps.map((step, i) => (
                    <li
                      key={step}
                      className="flex gap-2 font-mono text-[10px] sm:text-[11px]"
                    >
                      <span className="text-zinc-600">{i + 1}.</span>
                      <span
                        className={
                          i === path.steps.length - 1 ? "text-cyan-400/90" : "text-zinc-500"
                        }
                      >
                        {step}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </StaggerItem>
          )
        })}
      </StaggerReveal>
    </div>
  )
}
