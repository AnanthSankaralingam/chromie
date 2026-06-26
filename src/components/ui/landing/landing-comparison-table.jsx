"use client"

import { Check } from "lucide-react"
import { motion } from "framer-motion"
import { Reveal } from "@/components/ui/landing/landing-motion"
import { COMPARISON_ROWS } from "@/components/ui/landing/landing-content"

export default function LandingComparisonTable() {
  return (
    <Reveal className="mt-12 overflow-hidden border border-white/10" delay={0.05}>
      <div className="grid grid-cols-3 border-b border-white/10 bg-white/[0.03] font-mono text-[10px] uppercase tracking-wider sm:text-[11px]">
        <div className="p-4 text-zinc-500" />
        <div className="border-l border-white/10 p-4 text-zinc-500">Generic Automation</div>
        <div className="border-l border-white/10 p-4 text-white">chromie.dev</div>
      </div>
      {COMPARISON_ROWS.map((row, i) => (
        <motion.div
          key={row.feature}
          className={`grid grid-cols-3 ${i < COMPARISON_ROWS.length - 1 ? "border-b border-white/10" : ""}`}
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-5%" }}
          transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="p-4 text-sm font-medium text-zinc-300">{row.feature}</div>
          <div className="flex items-center border-l border-white/10 p-4 text-sm text-zinc-500">
            {row.other}
          </div>
          <div className="flex items-center gap-2 border-l border-white/10 p-4 text-sm font-medium text-white">
            <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
            {row.chromie}
          </div>
        </motion.div>
      ))}
    </Reveal>
  )
}
