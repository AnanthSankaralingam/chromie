"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { 
  Play, 
  FileCode, 
  Eye, 
  Download, 
  Store, 
  X, 
  ChevronLeft, 
  ChevronRight,
  SkipForward
} from "lucide-react"

const MODAL_CONTENT = {
  title: 'Welcome to Chromie!',
  description: 'Here\'s how to use your new Chrome extension',
  icon: Play,
  content: (
    <div className="space-y-8">
      {/* Key Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test Extension */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Play className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-white font-semibold text-lg">Test Your Extension</h3>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            Click the test button to open a simulated browser where you can interact with your extension just like in Chrome.
          </p>
        </div>

        {/* File Editor */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <FileCode className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-white font-semibold text-lg">Edit Files</h3>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            Use the file editor to modify your extension code. Click on files in the left panel to edit them.
          </p>
        </div>

        {/* Download */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <Download className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-white font-semibold text-lg">Download & Install</h3>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            Download your extension as a ZIP file and install it in Chrome for local testing.
          </p>
        </div>

        {/* Publish */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Store className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-white font-semibold text-lg">Publish to Store</h3>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            Share your extension with the world by publishing it to the Chrome Web Store.
          </p>
        </div>
      </div>

      {/* Quick Start Steps */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 border border-slate-600">
        <h3 className="text-white font-semibold text-lg mb-4">Quick Start Guide</h3>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
            <p className="text-slate-300 text-sm">Test your extension using the test button to see how it works</p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
            <p className="text-slate-300 text-sm">Edit files in the code editor to customize your extension</p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
            <p className="text-slate-300 text-sm">Download and install your extension in Chrome when ready</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingModal({ 
  isOpen, 
  onClose
}) {
  const IconComponent = MODAL_CONTENT.icon

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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 backdrop-blur-sm">
        <DialogTitle className="sr-only">Onboarding Tutorial</DialogTitle>
        
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
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <IconComponent className="h-8 w-8 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">
                {MODAL_CONTENT.title}
              </h2>
              <p className="text-slate-300 text-lg">
                {MODAL_CONTENT.description}
              </p>
            </div>
            
            <div className="space-y-8">
              {MODAL_CONTENT.content}
              
              {/* Close button */}
              <div className="flex justify-center pt-6">
                <Button
                  onClick={onClose}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8 py-3 text-lg font-medium shadow-lg"
                >
                  Got it, let's start building!
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
