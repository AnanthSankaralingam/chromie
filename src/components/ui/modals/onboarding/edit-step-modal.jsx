"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { FileCode, X } from "lucide-react"

export default function EditStepModal({ 
  isOpen, 
  onClose,
  onNext
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
        <DialogTitle className="sr-only">Edit Your Extension</DialogTitle>
        
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors z-10"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                  <FileCode className="h-8 w-8 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">
                Edit Your Code
              </h2>
              <p className="text-slate-300 text-lg">
                Customize your extension by editing the files
              </p>
            </div>
            
            <div className="space-y-6">
              {/* Main content */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileCode className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg mb-2">Make it yours!</h3>
                    <p className="text-slate-300 text-sm leading-relaxed mb-4">
                      Click on any file in the left panel to open it in the code editor. You can modify HTML, CSS, JavaScript, and the manifest file.
                    </p>
                    <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                      <p className="text-slate-400 text-xs">
                        💡 <strong>Tip:</strong> Start with the manifest.json file to change your extension's name and description.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex justify-between pt-4">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  Skip for now
                </Button>
                <Button
                  onClick={onNext}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-2"
                >
                  Got it!
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
