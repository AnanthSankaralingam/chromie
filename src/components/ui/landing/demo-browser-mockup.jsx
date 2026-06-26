"use client"

import { useState } from "react"
import DemoVideoEmbed from "@/components/ui/landing/demo-video-embed"
import { USE_CASE_TABS } from "@/components/ui/landing/landing-content"
import { BASE_DEMO_VIDEO_ID } from "@/lib/demo-use-cases"

export default function DemoBrowserMockup({ id = "hero" }) {
  const [activeTabId, setActiveTabId] = useState(null)
  const [playGeneration, setPlayGeneration] = useState(0)
  const activeTab = activeTabId ? USE_CASE_TABS.find((tab) => tab.id === activeTabId) : null
  const videoId = activeTab?.videoId ?? BASE_DEMO_VIDEO_ID
  const videoTitle = activeTab ? `chromie.dev ${activeTab.label} demo` : "chromie.dev demo"

  function engageDemo() {
    setPlayGeneration((generation) => generation + 1)
    console.log("[landing] demo play:", videoId)
  }

  function selectTab(tabId) {
    const nextTabId = tabId === activeTabId ? null : tabId
    setActiveTabId(nextTabId)
    setPlayGeneration((generation) => generation + 1)
    console.log("[landing] demo tab:", nextTabId ?? "default")
  }

  return (
    <div className="border border-white/10 bg-black">
      <div
        id={`${id}-panel`}
        role="tabpanel"
        className="relative aspect-video w-full bg-black"
      >
        <DemoVideoEmbed
          videoId={videoId}
          title={videoTitle}
          engaged={playGeneration > 0}
          playKey={playGeneration}
          onEngage={engageDemo}
        />
      </div>
      <div className="border-t border-white/10 bg-zinc-950 px-4 py-4 sm:px-5 sm:py-5">
        <p className="text-sm font-semibold text-white">Use Cases</p>
        <p className="mt-1 text-xs text-zinc-500">
          Pick an industry to watch a tailored demo.{" "}
          <a
            href="/use-cases"
            className="text-cyan-400/90 underline underline-offset-2 transition-colors hover:text-cyan-300"
          >
            View all use cases
          </a>
        </p>
        <div
          className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-0 sm:overflow-hidden sm:border sm:border-white/20"
          role="tablist"
          aria-label="Demo use cases"
        >
          {USE_CASE_TABS.map((tab, index) => {
            const isActive = tab.id === activeTabId
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`${id}-panel`}
                id={`${id}-tab-${tab.id}`}
                onClick={() => selectTab(tab.id)}
                className={`flex min-h-12 w-full cursor-pointer items-center justify-center border px-3 py-3 text-center text-sm font-semibold leading-snug transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 sm:min-h-[3.25rem] sm:border-0 sm:px-4 sm:text-[15px] ${
                  index < USE_CASE_TABS.length - 1 ? "sm:border-r sm:border-white/20" : ""
                } ${
                  isActive
                    ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-100 ring-1 ring-inset ring-cyan-400/40 sm:bg-cyan-500/20 sm:ring-0"
                    : "border-white/30 bg-zinc-900 text-white hover:border-white/50 hover:bg-zinc-800 sm:bg-zinc-950 sm:hover:bg-white/[0.06]"
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
