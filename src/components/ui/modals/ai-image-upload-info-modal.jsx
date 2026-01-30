"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ImagePlus, Upload, ArrowRight } from "lucide-react"

export default function AiImageUploadInfoModal({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <ImagePlus className="h-5 w-5 text-purple-400" />
            AI Image Upload
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-slate-300">
              This button lets you attach <span className="font-semibold text-white">images to send to the AI</span> as visual context for your request.
            </p>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 space-y-2">
              <p className="text-sm text-purple-300 font-medium">Use this to:</p>
              <ul className="text-xs text-purple-200 space-y-1 ml-4 list-disc">
                <li>Show mockups or designs you want the AI to recreate</li>
                <li>Share screenshots of what you're trying to build</li>
                <li>Provide visual examples for styling and layout</li>
              </ul>
            </div>
            <p className="text-sm text-slate-400">
              These images are <span className="font-semibold text-slate-300">sent to the AI</span> to help guide the implementation. They are <span className="font-semibold text-slate-300">not</span> added to your extension.
            </p>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <Upload className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-300">Need to add icons or assets to your extension?</p>
                <p className="text-xs text-blue-200">
                  Use the "Upload" button in the file panel (left sidebar) instead. That adds files to your extension that can be referenced in code.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              onClick={onClose}
              className="bg-purple-600 hover:bg-purple-700 text-white"
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
