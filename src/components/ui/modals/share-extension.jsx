"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Share, Copy, Check, X } from "lucide-react"
import { useState, useCallback } from "react"

export default function ShareModal({
  isOpen,
  onClose,
  onConfirm,
  shareUrl = "",
  isGenerating = false,
  error = null,
  successMessage = null
}) {
  const [copied, setCopied] = useState(false)

  const handleConfirm = useCallback(() => {
    console.log("[share] confirm clicked")
    onConfirm?.()
  }, [onConfirm])

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy to clipboard:", err)
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [shareUrl])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/95 border-slate-700 backdrop-blur-sm">
        <DialogTitle className="sr-only">Share Extension</DialogTitle>
        <div className="relative">
          <Card className="bg-transparent border-none shadow-none">
            <CardHeader className="text-center pb-6">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <Share className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-white">Share Extension</span>
              </div>
              <CardDescription className="text-slate-400">
                Create a secure link to share your extension. Anyone with the link can download your extension.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {error ? (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <X className="h-4 w-4 text-red-400" />
                    <span className="text-red-400 font-medium">Error</span>
                  </div>
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              ) : isGenerating ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="text-slate-300">Generating share link...</span>
                  </div>
                </div>
              ) : shareUrl ? (
                <div className="space-y-4">

                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">
                      Share Link
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <Button
                        onClick={handleCopy}
                        variant="outline"
                        size="sm"
                        className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 hover:text-white"
                      >
                        {copied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {copied && (
                      <p className="text-xs text-green-400 mt-1">Copied to clipboard!</p>
                    )}
                  </div>
                  {/*                   
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">
                      <strong>Note:</strong> Be careyour extension. You can revoke this link anytime.
                    </p>
                  </div> */}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-slate-300 mb-4">
                    Ready to create a shareable link for your extension?
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-2">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1 bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 hover:text-white"
                >
                  <X className="h-4 w-4 mr-2" />
                  {shareUrl ? "Close" : error ? "Close" : "Cancel"}
                </Button>
                {!shareUrl && !error && (
                  <Button
                    onClick={handleConfirm}
                    disabled={isGenerating}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 font-medium disabled:opacity-50"
                  >
                    <Share className="h-4 w-4 mr-2" />
                    {isGenerating ? "Creating..." : "Create Share Link"}
                  </Button>
                )}
                {error && (
                  <Button
                    onClick={handleConfirm}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 font-medium"
                  >
                    <Share className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
