"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Zap, Send, Paperclip, Sparkles, Edit3, Github, ArrowRight, Chrome, Code, TestTube } from "lucide-react"
import { useSession } from '@/components/SessionProviderClient'
import { useRouter } from "next/navigation"
import AuthModal from "@/components/ui/auth-modal"
import AppBar from "@/components/ui/app-bar"

export default function AboutPage() {
  const { isLoading } = useSession()
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 text-white">
        {/* Header */}
        <AppBar />

        {/* Main Content */}
        <div className="container mx-auto px-4 py-4">
          <div className="max-w-6xl mx-auto">
            {/* Title */}
            <div className="text-center mb-16">
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                about chromie
              </h1>
            </div>

            {/* Workflow Steps */}
            <div className="grid md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center text-center bg-purple-800/30 backdrop-blur-sm rounded-lg p-10 border border-purple-500/30 min-h-[300px]">
                <div className="flex items-center justify-center w-20 h-20 bg-purple-600 rounded-full mb-8">
                  <Edit3 className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-purple-300 mb-4">describe your chrome extension</h3>
                <p className="text-gray-300 text-lg leading-relaxed">
                  tell us what you want your extension to do in plain english. we'll do the rest.
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center bg-blue-800/30 backdrop-blur-sm rounded-lg p-10 border border-blue-500/30 min-h-[300px]">
                <div className="flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-8">
                  <TestTube className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-blue-300 mb-4">test within the app</h3>
                <p className="text-gray-300 text-lg leading-relaxed">
                  try your extension immediately in our simulated browser environment, testing all features and functionality in real-time.
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center bg-green-800/30 backdrop-blur-sm rounded-lg p-10 border border-green-500/30 min-h-[300px]">
                <div className="flex items-center justify-center w-20 h-20 bg-green-600 rounded-full mb-8">
                  <Chrome className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-green-300 mb-4">download or publish</h3>
                <p className="text-gray-300 text-lg leading-relaxed">
                  get your extension directly to the chrome web store or download the files for manual installation. one-click deployment makes sharing your creation simple and fast.
                </p>
              </div>
            </div>

            {/* call to action */}
            <div className="mt-16 text-center">
              <Button 
                onClick={() => router.push('/builder')}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 text-lg"
              >
                start building your extension
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
