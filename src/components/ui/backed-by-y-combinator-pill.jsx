import { cn } from "@/lib/utils"

const YC_URL = "https://www.ycombinator.com/"

export function BackedByYCombinatorPill({ className }) {
  return (
    <a
      href={YC_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 transition-colors hover:border-white/25 hover:bg-white/[0.07]",
        className
      )}
    >
      <img
        src="/ycombinator-logo.svg"
        alt=""
        width={16}
        height={16}
        className="h-4 w-4 shrink-0 rounded-sm object-contain"
        aria-hidden
      />
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400">
        Backed by{" "}
        <span className="font-semibold text-zinc-200">Y Combinator</span>
      </span>
    </a>
  )
}
