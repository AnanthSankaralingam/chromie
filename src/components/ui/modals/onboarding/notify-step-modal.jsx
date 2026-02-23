"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Bell, X } from "lucide-react"

export default function NotifyStepModal({
  isOpen,
  onClose,
  onOptIn,
  onOptOut,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onOptOut?.()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onOptOut])

  const handleOptIn = () => {
    onOptIn?.()
    onClose?.()
  }

  const handleOptOut = () => {
    onOptOut?.()
    onClose?.()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleOptOut()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 backdrop-blur-sm">
        <DialogTitle className="sr-only">Get notified when we&apos;re done</DialogTitle>

        <div className="relative">
          <button
            onClick={handleOptOut}
            className="absolute -top-2 -right-2 w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors z-10"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Bell className="h-8 w-8 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">
                Get notified when we&apos;re done?
              </h2>
              <p className="text-slate-300 text-lg">
                High-quality extension generation takes a few minutes
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  You don&apos;t need to wait on the site. Feel free to switch tabs or grab a coffee — we&apos;ll play a sound when your extension is ready.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleOptOut}
                  className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  No thanks
                </Button>
                <Button
                  onClick={handleOptIn}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-8 py-2"
                >
                  Yes, notify me
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
