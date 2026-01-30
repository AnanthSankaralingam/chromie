"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Shield, FileText, ExternalLink } from "lucide-react"

export default function PrivacyPolicyInfoModal({ isOpen, onClose, onContinue }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/95 border-slate-700 backdrop-blur-sm">
        <DialogHeader>
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <DialogTitle className="text-white text-xl font-semibold">
              Privacy Policy Hosting
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-300">
            Create and host a privacy policy for your Chrome extension
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm text-slate-300">
                  Get a shareable link, required for Chrome Web Store submissions.
                </p>
                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Write your own or generate with AI</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Get a public chromie.dev/privacy-policy/[your-ext] link</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Update anytime, link stays the same</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={onContinue}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 font-medium"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
