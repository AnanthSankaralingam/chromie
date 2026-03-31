"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CreditCard } from "lucide-react"
import Link from "next/link"

export default function TokenUsageAlert({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/95 border-slate-700 backdrop-blur-sm">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-white">Credit Limit Reached</DialogTitle>
              <DialogDescription className="text-sm text-slate-300">
                You have reached your credit allowance for your current plan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <p className="text-sm text-slate-300">
            You&apos;ve used all 10 free credits for today. Your daily allowance resets at midnight — or get more credits right now.
          </p>
          <div className="flex items-center space-x-3 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <CreditCard className="h-5 w-5 text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Starter Pack — $15 one-time</p>
              <p className="text-xs text-slate-400">100 credits, no subscription, never expire</p>
            </div>
            <Link href="/#pricing">
              <Button
                variant="default"
                size="sm"
                className="bg-amber-500 hover:bg-amber-400 text-black font-medium"
              >
                Get credits
              </Button>
            </Link>
          </div>
          <div className="flex items-center space-x-3 p-4 bg-white/[0.04] rounded-lg border border-white/[0.08]">
            <CreditCard className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Pro — $9.99/month</p>
              <p className="text-xs text-slate-400">500 credits/month + all features</p>
            </div>
            <Link href="/#pricing">
              <Button
                variant="default"
                size="sm"
                className="bg-white text-black hover:bg-zinc-100 font-medium"
              >
                Upgrade
              </Button>
            </Link>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}


