"use client"

import React from "react"
import { LoadingIndeterminateBar } from "@/components/ui/loading/progress-spinner"

/**
 * Full-screen loading state for browser extension tests: clear hierarchy,
 * larger type, one focused tip card with few bullets.
 */
export default function BrowserTestLoadingOverlay({ stageTitle, tip }) {
  const Icon = tip?.icon

  return (
    <div className="absolute inset-0 bg-[#0a0a0a] flex justify-center items-start overflow-y-auto px-6 pt-5 pb-12 sm:px-10 sm:pt-6">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <LoadingIndeterminateBar />
        </div>

        <div className="flex flex-col items-center text-center gap-6 mb-8 sm:flex-row sm:items-start sm:text-left sm:gap-8">
          <div className="relative shrink-0">
            <div className="animate-spin rounded-full h-11 w-11 border-[3px] border-neutral-700 border-t-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight leading-snug">
              {stageTitle ?? "initializing"}
            </h2>
          </div>
        </div>

        {tip && Icon && (
          <div className="rounded-2xl border border-white/15 bg-neutral-900/90 shadow-xl shadow-black/50 ring-1 ring-white/5 px-6 py-6 sm:px-8 sm:py-7 text-left">
            <div className="flex items-start gap-4 mb-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Icon className="h-6 w-6 text-neutral-100" aria-hidden />
              </div>
              <div className="min-w-0 pt-1">
                <h3 className="text-xl font-semibold text-white leading-tight">{tip.title}</h3>
              </div>
            </div>
            <ul className="list-none space-y-4 pl-0">
              {tip.items.map((item, index) => (
                <li key={index} className="flex gap-3 text-base text-neutral-200 leading-relaxed">
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/90"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
