"use client"

import Image from "next/image"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { FlickeringGrid } from "@/components/ui/flickering-grid"

const PRO_STRIPE_URL = "https://buy.stripe.com/cNi8wO7ot5BSe8f7hQ7kc05"

const PRO_FEATURES = [
  "Import & edit your own Chrome extensions",
  "Higher token limits for longer builds",
  "More projects & faster generation",
]

export default function PaywallModal({ isOpen, onClose, featureName = "This feature" }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#0A0A0F] border-slate-800 p-0 overflow-hidden">

        {/* Flickering grid background */}
        <div className="absolute inset-0 z-[1] bg-[#0A0A0F]/70 pointer-events-none" />
        <FlickeringGrid
          className="absolute inset-0 z-0"
          squareSize={4}
          gridGap={6}
          color="rgb(200, 200, 220)"
          maxOpacity={0.35}
          flickerChance={2.0}
        />

        {/* Header */}
        <div className="relative z-10 flex flex-col items-center text-center gap-4 px-6 pt-10 pb-6">
          <div className="flex items-center gap-2.5">
            <Image src="/chromie-logo-1.png" alt="Chromie" width={30} height={30} className="shrink-0" />
            <span className="text-lg font-semibold text-white tracking-tight">chromie.dev</span>
          </div>
          <div className="space-y-1.5">
            <DialogTitle className="text-xl font-semibold text-white">unlock Pro features</DialogTitle>
            <DialogDescription className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
              {featureName} is a Pro feature. Upgrade to get the most out of chromie.
            </DialogDescription>
          </div>
        </div>

        {/* Feature checklist */}
        <div className="relative z-10 px-6 pb-6 space-y-3">
          {PRO_FEATURES.map((feature) => (
            <div key={feature} className="flex items-center gap-3 bg-white/[0.04] border border-slate-700/50 rounded-lg px-4 py-3">
              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-green-400" />
              </div>
              <span className="text-sm text-slate-300">{feature}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="relative z-10 px-6 pb-8 space-y-2">
          <Button
            className="w-full bg-white hover:bg-slate-100 text-slate-900 font-semibold py-5 shadow-lg transition-all duration-200"
            onClick={() => window.location.href = PRO_STRIPE_URL}
          >
            upgrade to Pro — $9.99/mo (limited time sale)
          </Button>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <span>use code</span>
            <span className="font-mono font-bold text-white tracking-widest bg-slate-800 border border-slate-600 px-2 py-0.5 rounded">LAUNCH11</span>
            <span>for an extra discount — limited time</span>
          </div>
          <p className="text-center text-xs text-slate-500">cancel anytime</p>
        </div>

      </DialogContent>
    </Dialog>
  )
}
