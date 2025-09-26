"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Upload, X } from "lucide-react"
import { useCallback } from "react"

export default function PublishModal({ isOpen, onClose, onConfirm }) {
  const handleConfirm = useCallback(() => {
    console.log("[publish] confirm clicked")
    onConfirm?.()
  }, [onConfirm])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/95 border-slate-700 backdrop-blur-sm">
        <DialogTitle className="sr-only">Publish Extension</DialogTitle>
        <div className="relative">
          

          <Card className="bg-transparent border-none shadow-none">
            <CardHeader className="text-center pb-6">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Upload className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-white">Publish</span>
              </div>
              <CardDescription className="text-slate-400">
                Note that if it's your first time publishing, you'll be redirected to the Developer Dashboard to provide some details like name, description, screenshots, category, and privacy information!
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">

              <div className="pt-2">
                <Button
                  onClick={handleConfirm}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-medium"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Publish to Chrome Web Store
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}


