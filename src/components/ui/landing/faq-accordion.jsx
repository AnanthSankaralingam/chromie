"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { AnimatedFaqPanel } from "@/components/ui/landing/landing-motion"
import { FAQ_ITEMS } from "@/components/ui/landing/landing-content"

export default function FaqAccordion() {
  const [openId, setOpenId] = useState(FAQ_ITEMS[0]?.id ?? null)
  const rowGrid = "grid w-full grid-cols-[2.5rem_minmax(0,1fr)_1.25rem] items-start gap-x-4"

  return (
    <div className="divide-y divide-white/10 border border-white/10">
      {FAQ_ITEMS.map((item) => {
        const isOpen = openId === item.id
        return (
          <div key={item.id} className="bg-black">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className={`${rowGrid} px-5 py-5 text-left transition-colors hover:bg-white/[0.02] sm:px-6 ${isOpen ? "pb-4" : ""}`}
              aria-expanded={isOpen}
            >
              <span className="font-mono text-xs leading-5 text-zinc-600">{item.num}</span>
              <span className="min-w-0 text-sm font-semibold leading-snug text-white sm:text-base">
                {item.q}
              </span>
              <ChevronDown
                className={`mt-0.5 h-4 w-4 justify-self-end text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatedFaqPanel isOpen={isOpen}>
              <div className="border-t border-white/10 px-5 pb-5 sm:px-6 sm:pb-6">
                <div className={`${rowGrid} pt-4`}>
                  <div aria-hidden="true" />
                  <p className="col-span-2 col-start-2 min-w-0 text-sm leading-relaxed text-zinc-400">
                    {item.a}
                  </p>
                </div>
              </div>
            </AnimatedFaqPanel>
          </div>
        )
      })}
    </div>
  )
}
