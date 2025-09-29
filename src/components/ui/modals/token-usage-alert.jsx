"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CreditCard } from "lucide-react"
import Link from "next/link"

export default function TokenUsageAlert({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-xl">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-slate-900">Token Limit Reached</DialogTitle>
              <DialogDescription className="text-sm text-slate-600">
                You have reached your monthly token allowance for your current plan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <p className="text-sm text-slate-700">
            To continue generating extensions, please upgrade your plan or wait until your monthly token quota resets.
          </p>
          <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <CreditCard className="h-4 w-4 text-purple-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700">Upgrade your plan</p>
              <p className="text-xs text-slate-500">Get more monthly tokens and features</p>
            </div>
            <Link href="/pricing">
              <Button 
                variant="default" 
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                View pricing
              </Button>
            </Link>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Link href="/pricing">
            <Button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">Upgrade</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


