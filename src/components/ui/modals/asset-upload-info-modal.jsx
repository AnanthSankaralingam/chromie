"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, Sparkles, ArrowRight } from "lucide-react"

export default function AssetUploadInfoModal({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-400" />
            Asset Upload
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-slate-300">
              This upload button is for adding <span className="font-semibold text-white">icons and assets</span> that your Chrome extension will use.
            </p>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-2">
              <p className="text-sm text-blue-300 font-medium">What you can upload:</p>
              <ul className="text-xs text-blue-200 space-y-1 ml-4 list-disc">
                <li>Extension icons (automatically resized to 16x16, 48x48, 128x128)</li>
                <li>Image assets (PNG, JPG, SVG)</li>
                <li>Other files (JSON, CSS, HTML, TXT)</li>
              </ul>
            </div>
            <p className="text-sm text-slate-400">
              These files become part of your extension and can be referenced in your code using <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs text-purple-300">chrome.runtime.getURL()</code>
            </p>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <div className="flex items-start gap-3 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
              <Sparkles className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-purple-300">Need to guide the AI's design?</p>
                <p className="text-xs text-purple-200">
                  Use the image upload button in the chat input instead. That sends visual context to the AI, not to your extension.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Got it
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
