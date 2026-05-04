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
            You&apos;ve used your monthly credits for this cycle. Credits reset on your monthly billing date.
          </p>
          <div className="flex items-center space-x-3 p-4 bg-white/[0.04] rounded-lg border border-white/[0.08]">
            <CreditCard className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Pro — $9.99/month</p>
              <p className="text-xs text-slate-400">250 credits/month + premium features</p>
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
          <div className="flex items-center space-x-3 p-4 bg-white/[0.04] rounded-lg border border-white/[0.08]">
            <CreditCard className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Builder — $15/month</p>
              <p className="text-xs text-slate-400">500 credits/month + highest limits</p>
            </div>
            <Link href="/#pricing">
              <Button
                variant="default"
                size="sm"
                className="bg-white text-black hover:bg-zinc-100 font-medium"
              >
                Compare Plans
              </Button>
            </Link>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}


