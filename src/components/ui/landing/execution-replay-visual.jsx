"use client"

const RUN = {
  id: "run_8f2a91c",
  task: "prior_auth_triage",
  duration: "62.1s",
  status: "completed",
}

const INVOCATIONS = [
  { n: 1, tool: "analyze_clinical_note", latency: "840ms", status: "ok" },
  { n: 2, tool: "extract_pending_authorization_row", latency: "1.1s", status: "ok" },
  { n: 3, tool: "open_prior_auth_form", latency: "620ms", status: "ok" },
  { n: 4, tool: "fill_prior_auth_from_payload", latency: "1.2s", status: "ok", active: true },
  { n: 5, tool: "verify_submission", latency: "—", status: "pending" },
]

const ACTIVE_DETAIL = {
  input: [
    { key: "patient_id", value: '"PT-44291"' },
    { key: "auth_code", value: '"AUTH-781DECA9"' },
  ],
  output: [
    { key: "fields_filled", value: "12" },
    { key: "receipt", value: '"AUTH-781DECA9"' },
  ],
  context: [
    { key: "task", value: "prior_auth_triage" },
    { key: "step", value: "3 of 4" },
    { key: "latency", value: "1.2s" },
  ],
}

function DetailBlock({ title, rows }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-600">{title}</p>
      <dl className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex justify-between gap-2 font-mono text-[10px] sm:text-[11px]"
          >
            <dt className="text-zinc-600">{row.key}</dt>
            <dd className="text-right text-zinc-300">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export default function ExecutionReplayVisual() {
  const activeTool = INVOCATIONS.find((i) => i.active)?.tool

  return (
    <div className="landing-visual-panel w-full overflow-hidden border border-white/10 bg-[#080808]">
      <div className="border-b border-white/10 px-4 py-3 text-center sm:px-5">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
          Execution replay
        </p>
        <p className="mt-1 text-[11px] leading-snug text-zinc-400 sm:text-xs">
          every invocation logged · replay from any step
        </p>
      </div>

      <dl className="divide-y divide-white/10 border-b border-white/10">
        <div className="grid grid-cols-[88px_1fr] gap-3 px-4 py-2.5 sm:grid-cols-[100px_1fr] sm:px-5">
          <dt className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">Run</dt>
          <dd className="font-mono text-[11px] text-zinc-300">{RUN.id}</dd>
        </div>
        <div className="grid grid-cols-[88px_1fr] gap-3 px-4 py-2.5 sm:grid-cols-[100px_1fr] sm:px-5">
          <dt className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">Task</dt>
          <dd className="font-mono text-[11px] text-cyan-400/90">{RUN.task}</dd>
        </div>
        <div className="grid grid-cols-[88px_1fr] gap-3 px-4 py-2.5 sm:grid-cols-[100px_1fr] sm:px-5">
          <dt className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">Status</dt>
          <dd className="font-mono text-[11px] text-emerald-400/90">
            {RUN.status} · {RUN.duration}
          </dd>
        </div>
      </dl>

      <div className="grid min-w-0 md:grid-cols-2 md:divide-x md:divide-white/10">
        <div className="min-w-0 border-b border-white/10 p-3 sm:p-4 md:border-b-0">
          <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-600">
            Invocations
          </p>
          <ul className="mt-2 space-y-1">
            {INVOCATIONS.map((inv) => (
              <li
                key={inv.n}
                className={`grid grid-cols-[1.25rem_minmax(0,1fr)_2.75rem] items-start gap-x-2 rounded-sm px-1 py-0.5 font-mono text-[10px] leading-snug sm:text-[11px] ${
                  inv.active ? "bg-cyan-500/10" : ""
                }`}
              >
                <span className="text-zinc-600">{inv.n}.</span>
                <span
                  className={`min-w-0 break-words ${
                    inv.status === "pending"
                      ? "text-zinc-600"
                      : inv.active
                        ? "text-cyan-400/90"
                        : "text-zinc-400"
                  }`}
                >
                  {inv.tool}
                </span>
                <span className="whitespace-nowrap text-right tabular-nums text-zinc-600">
                  {inv.latency}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-white/10 pt-3 font-mono text-[10px] text-zinc-500 sm:text-[11px]">
            Replay from step 4
          </p>
        </div>

        <div className="p-3 sm:p-4">
          <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-600">
            Step detail
          </p>
          <p className="mt-1 font-mono text-[10px] text-cyan-400/90 sm:text-[11px]">{activeTool}</p>
          <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
            <DetailBlock title="Input" rows={ACTIVE_DETAIL.input} />
            <DetailBlock title="Output" rows={ACTIVE_DETAIL.output} />
            <DetailBlock title="Task context" rows={ACTIVE_DETAIL.context} />
          </div>
        </div>
      </div>
    </div>
  )
}
