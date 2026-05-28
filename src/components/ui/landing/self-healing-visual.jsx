"use client"

const ROWS = [
  { label: "Failure", value: "selector #submit-btn not found", tone: "error" },
  { label: "Recovery", value: "fallback chain → aria-label match", tone: "active" },
  { label: "Refinement", value: "invocation 12 · higher confidence", tone: "active" },
  { label: "Status", value: "resumed · step 3 of 4", tone: "success" },
]

export default function SelfHealingVisual() {
  return (
    <div className="landing-visual-panel w-full overflow-hidden border border-white/10 bg-[#080808]">
      <div className="border-b border-white/10 px-4 py-3 text-center">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
          Self-healing
        </p>
        <p className="mt-1 text-[11px] text-zinc-400 sm:text-xs">
          recover when the DOM drifts · smarter on every invocation
        </p>
      </div>
      <dl className="space-y-0 divide-y divide-white/10">
        {ROWS.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[120px_1fr] gap-3 px-4 py-3 sm:px-5 sm:py-3.5"
          >
            <dt className="font-mono text-[10px] uppercase tracking-wider text-zinc-600 sm:text-[11px]">
              {row.label}
            </dt>
            <dd
              className={`font-mono text-[11px] sm:text-xs ${
                row.tone === "error"
                  ? "text-red-400/90"
                  : row.tone === "success"
                    ? "text-emerald-400/90"
                    : "text-cyan-400/90"
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
