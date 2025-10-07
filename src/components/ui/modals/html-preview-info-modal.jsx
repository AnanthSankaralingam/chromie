"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Eye, Code } from "lucide-react"

export default function HtmlPreviewInfoModal({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/95 border-slate-700 backdrop-blur-sm">
        <DialogHeader>
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <Eye className="h-4 w-4 text-white" />
            </div>
            <DialogTitle className="text-white text-xl font-semibold">
              HTML Preview (Beta)
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-300">
            This is a visual-only preview of your HTML. Interactivity, scripts, and extension APIs will not function here.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Code className="h-5 w-5 text-teal-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm text-slate-300">
                  For full functionality, try the simulated browser or install and test the generated extension in your browser.
                </p>
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                  <span>Preview shows static content only</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={onClose} 
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2"
            >
              Got it
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
