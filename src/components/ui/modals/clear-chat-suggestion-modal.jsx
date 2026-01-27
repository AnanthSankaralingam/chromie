"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Trash2, MessageSquare, X } from "lucide-react"

export default function ClearChatSuggestionModal({
  isOpen,
  onClose,
  onClearChat,
  projectName
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

  const handleClearAndClose = () => {
    onClearChat?.()
    onClose?.()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 backdrop-blur-sm">
        <DialogTitle className="sr-only">Clear Chat Suggestion</DialogTitle>

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
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <MessageSquare className="h-8 w-8 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">
                Long Conversation Detected
              </h2>
              <p className="text-slate-300 text-lg">
                Your chat history is getting lengthy
              </p>
            </div>

            <div className="space-y-6">
              {/* Main content */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Trash2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg mb-2">Clear for Better Performance</h3>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        Long conversations can slow down response times. Clearing your chat keeps things fast while preserving all your code.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-slate-600 to-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg mb-2">Your Code is Safe</h3>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        Clearing the chat only removes messages. All your generated code and files remain untouched.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  Keep Chat
                </Button>
                <Button
                  onClick={handleClearAndClose}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Chat
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
