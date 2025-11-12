"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Download, X } from "lucide-react"

export default function DownloadStepModal({
  isOpen,
  onClose,
  onNext,
  currentStepNumber,
  totalSteps,
  isLastStep
}) {
  // Handle keyboard navigation - only allow escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return
      
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 backdrop-blur-sm">
        <DialogTitle className="sr-only">Download Your Extension</DialogTitle>
        
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors z-10"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-8">
            <div className="text-center mb-8">
              {/* Progress indicator */}
              <div className="flex items-center justify-center mb-4">
                <span className="text-sm font-medium text-purple-400 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30">
                  {currentStepNumber}/{totalSteps}
                </span>
              </div>

              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Download className="h-8 w-8 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">
                Download & Install
              </h2>
              <p className="text-slate-300 text-lg">
                Get your extension ready for Chrome
              </p>
            </div>
            
            <div className="space-y-6">
              {/* Main content */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Download className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg mb-2">Ready to install!</h3>
                    <p className="text-slate-300 text-sm leading-relaxed mb-4">
                      Click the download button to get a ZIP file of your extension. Then install it in Chrome for local testing.
                    </p>
                    <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                      <p className="text-slate-400 text-xs">
                        💡 <strong>Tip:</strong> To install in Chrome: Go to chrome://extensions/, enable "Developer mode", then click "Load unpacked" and select the downloaded folder.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex justify-end pt-4">
                <Button
                  onClick={onNext}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-2"
                >
                  {isLastStep ? 'Get Started' : 'Next'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
