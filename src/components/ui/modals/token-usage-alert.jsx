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

        <div className="py-4 space-y-4">
          <p className="text-sm text-slate-300">
            To continue generating extensions, please upgrade your plan or wait until your credit quota resets.
          </p>
          <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-400/20">
            <CreditCard className="h-5 w-5 text-purple-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Upgrade your plan</p>
              <p className="text-xs text-slate-400">Get more credits and features</p>
            </div>
            <Link href="/pricing">
              <Button 
                variant="default" 
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
              >
                View pricing
              </Button>
            </Link>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}


