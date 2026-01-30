"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { BarChart3, Sparkles, Mail } from "lucide-react"

export default function MetricsComingSoonModal({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/95 border-slate-700 backdrop-blur-sm">
        <DialogHeader>
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <DialogTitle className="text-white text-xl font-semibold">
              Metrics SDK
            </DialogTitle>
            <span className="px-2 py-1 bg-purple-600/20 border border-purple-500/30 rounded-full text-xs text-purple-300 font-medium">
              Coming Soon
            </span>
          </div>
          <DialogDescription className="text-slate-300">
            Observability for all Chrome extensions
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Sparkles className="h-5 w-5 text-indigo-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-3">
                <p className="text-sm text-slate-300">
                  The Metrics SDK provides comprehensive observability for Chrome extensions—whether built with Chromie or not.
                </p>
                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                    <span>Track extension usage and performance</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                    <span>Monitor errors and crashes in real-time</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                    <span>Understand user behavior and engagement</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                    <span>Works with any Chrome extension</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-950/30 border border-indigo-700/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-indigo-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm text-slate-300 font-medium">
                  Want early access?
                </p>
                <p className="text-xs text-slate-400">
                  Email us at{" "}
                  <a
                    href="mailto:ananths1@terpmail.umd.edu?subject=Chromie%20Metrics%20SDK%20Early%20Access"
                    className="text-indigo-400 hover:text-indigo-300 underline"
                  >
                    ananths1@terpmail.umd.edu
                  </a>
                  {" "}for early access or other feature requests.
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 font-medium"
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
