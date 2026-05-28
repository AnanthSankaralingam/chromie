"use client"

import { motion } from "framer-motion"
import { StaggerItem, StaggerReveal } from "@/components/ui/landing/landing-motion"

const BASELINE_PHASES = [
  ...Array.from({ length: 9 }, (_, i) => ({
    n: i + 1,
    label: "Agent thinking",
    tone: "muted",
  })),
  { n: 10, label: "Error: receipt mismatch", tone: "error" },
]

const CHROMIE_PHASES = [
  { n: 1, label: "Agent thinking", tone: "muted" },
  { n: 2, label: "analyze_clinical_note", tone: "tool" },
  { n: 3, label: "Agent thinking", tone: "muted" },
  { n: 4, label: "extract_pending_authorization_row", tone: "tool" },
  { n: 5, label: "Agent thinking", tone: "muted" },
  { n: 6, label: "open_prior_auth_form", tone: "tool" },
  { n: 7, label: "Agent thinking", tone: "muted" },
  { n: 8, label: "fill_prior_auth_from_payload", tone: "tool" },
  { n: 9, label: "Agent thinking", tone: "muted" },
  { n: 10, label: "Idle: Run complete", tone: "success" },
]

function StatusBadge({ pass }) {
  return (
    <span
      className={`shrink-0 border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider sm:text-[10px] ${
        pass
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
          : "border-red-500/40 bg-red-500/10 text-red-400"
      }`}
    >
      {pass ? "Pass" : "Fail"}
    </span>
  )
}

function PhaseSequence({ phases, animateFrom = 0.12 }) {
  return (
    <div className="mt-3 flex min-h-[148px] flex-col border-t border-white/10 pt-3 sm:min-h-[168px]">
      <p className="mb-2 text-[9px] uppercase tracking-wider text-zinc-600">Execution sequence</p>
      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
        {phases.map((phase, i) => (
          <motion.li
            key={`${phase.n}-${phase.label}`}
            className="flex gap-2"
            initial={{ opacity: 0, x: -6 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: animateFrom + i * 0.035, duration: 0.3 }}
          >
            <span className="w-4 shrink-0 text-zinc-600">{phase.n}.</span>
            <span
              className={
                phase.tone === "tool"
                  ? "text-cyan-400/90"
                  : phase.tone === "error"
                    ? "text-red-400/90"
                    : phase.tone === "success"
                      ? "text-emerald-400/80"
                      : "text-zinc-500"
              }
            >
              {phase.label}
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

function Panel({ title, pass, children }) {
  return (
    <div className="flex h-full min-h-[320px] flex-col border border-white/10 bg-[#0c0c0c] sm:min-h-[360px]">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-zinc-400 sm:text-[10px]">
          {title}
        </span>
        <StatusBadge pass={pass} />
      </div>
      <div className="flex flex-1 flex-col p-3 font-mono text-[10px] leading-relaxed sm:p-4 sm:text-[11px]">
        {children}
      </div>
    </div>
  )
}

export default function ResultsComparisonVisual() {
  return (
    <div className="landing-visual-panel relative w-full overflow-hidden border border-white/10 bg-[#080808]">
      <div className="border-b border-white/10 px-4 py-3 text-center sm:px-5">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">Results</p>
        <p className="mt-1 text-[11px] leading-snug text-zinc-400 sm:text-xs">
          baseline agent vs. chromie agent with deterministic tools
        </p>
      </div>

      <StaggerReveal
        className="grid items-stretch gap-px bg-white/10 md:grid-cols-2"
        stagger={0.08}
      >
        <StaggerItem className="h-full">
          <Panel title="Baseline" pass={false}>
            <p className="text-zinc-500">
              Run result: <span className="text-red-400">FAIL</span>
            </p>
            <div className="mt-2 space-y-1 text-zinc-500">
              <p>Receipt</p>
              <p>
                expected: <span className="text-zinc-300">&apos;AUTH-781DECA9&apos;</span>
              </p>
              <p>
                actual: <span className="text-red-400/90">&apos;AUTH-8F6458EE&apos;</span>
              </p>
            </div>
            <p className="mt-2 text-red-400/90">Receipt mismatch</p>
            <p className="text-zinc-600">Duration: 85.0s</p>
            <PhaseSequence phases={BASELINE_PHASES} animateFrom={0.08} />
          </Panel>
        </StaggerItem>

        <StaggerItem className="h-full">
          <Panel title="Agent + Chromie tools" pass>
            <p className="text-emerald-400/90">INFO [Agent] ✓ Task completed successfully</p>
            <p className="mt-2 text-zinc-500">
              Run result: <span className="text-emerald-400">PASS</span>
            </p>
            <div className="mt-2 space-y-1 text-zinc-500">
              <p>Receipt</p>
              <p>
                expected: <span className="text-zinc-300">&apos;AUTH-781DECA9&apos;</span>
              </p>
              <p>
                actual: <span className="text-emerald-400">&apos;AUTH-781DECA9&apos;</span>
              </p>
            </div>
            <p className="text-zinc-600">Duration: 62.1s</p>
            <PhaseSequence phases={CHROMIE_PHASES} animateFrom={0.14} />
          </Panel>
        </StaggerItem>
      </StaggerReveal>
    </div>
  )
}
