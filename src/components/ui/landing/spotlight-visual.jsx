import ResultsComparisonVisual from "@/components/ui/landing/results-comparison-visual"
import AutomationPathsVisual from "@/components/ui/landing/automation-paths-visual"
import SelfHealingVisual from "@/components/ui/landing/self-healing-visual"
import ExecutionReplayVisual from "@/components/ui/landing/execution-replay-visual"

function RuntimeRoutingVisual() {
  const steps = [
    { label: "Task", value: "triage_inbox" },
    { label: "Step", value: "2 of 4" },
    { label: "Skills available", value: "classify, draft" },
    { label: "Selected", value: "classify@v2", highlight: true },
  ]

  return (
    <div className="landing-visual-panel w-full overflow-hidden border border-white/10 bg-[#080808]">
      <div className="border-b border-white/10 px-4 py-3 text-center">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
          Runtime routing
        </p>
        <p className="mt-1 text-[11px] text-zinc-400 sm:text-xs">
          right skill for where the agent is in the flow
        </p>
      </div>
      <dl className="space-y-0 divide-y divide-white/10">
        {steps.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[120px_1fr] gap-3 px-4 py-3 sm:px-5 sm:py-3.5"
          >
            <dt className="font-mono text-[10px] uppercase tracking-wider text-zinc-600 sm:text-[11px]">
              {row.label}
            </dt>
            <dd
              className={`font-mono text-[11px] sm:text-xs ${
                row.highlight ? "text-cyan-400/90" : "text-zinc-300"
              }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

const VISUALS = {
  tools: ResultsComparisonVisual,
  replay: ExecutionReplayVisual,
  analysis: AutomationPathsVisual,
  healing: SelfHealingVisual,
  router: RuntimeRoutingVisual,
}

export default function SpotlightVisual({ type }) {
  const Visual = VISUALS[type] || RuntimeRoutingVisual
  return <Visual />
}
