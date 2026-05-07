"use client"

import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

export function HeroSocialProofBar({
  storeHref,
  usersLabel = "200+ users building",
  ratingLabel = "4.9 on the Chrome Web Store",
  className,
}) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-5 py-2.5 text-xs text-zinc-400 sm:gap-x-6",
        className
      )}
    >
      <span className="whitespace-nowrap font-normal tabular-nums tracking-tight">{usersLabel}</span>
      <span className="h-3.5 w-px shrink-0 bg-zinc-600" aria-hidden />
      <a
        href={storeHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 whitespace-nowrap transition-colors hover:text-zinc-300"
        aria-label={`${ratingLabel}. Opens Chrome Web Store listing.`}
      >
        <span className="flex items-center gap-0.5" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" strokeWidth={0} />
          ))}
        </span>
        <span className="font-normal leading-normal">{ratingLabel}</span>
      </a>
    </div>
  )
}
