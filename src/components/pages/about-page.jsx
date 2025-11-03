"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/forms-and-input/textarea"
import { Zap, Send, Paperclip, Sparkles, Edit3, Github, ArrowRight, Chrome, Code, TestTube } from "lucide-react"
import { useSession } from '@/components/SessionProviderClient'
import { useRouter } from "next/navigation"
import AuthModal from "@/components/ui/modals/modal-auth"
import AppBar from "@/components/ui/app-bars/app-bar"

export default function AboutPage() {
  const { isLoading } = useSession()
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-slate-900 to-slate-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
        {/* Header */}
        <AppBar />

        {/* Main Content */}
        <div className="container mx-auto px-4 py-4">
          <div className="max-w-6xl mx-auto">
            {/* Title */}
            <div className="text-center mb-16">
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent leading-tight">
                about chromie
              </h1>
            </div>

            {/* Workflow Steps */}
            <div className="grid md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center text-center bg-gray-800/30 backdrop-blur-sm rounded-lg p-10 border border-gray-500/30 min-h-[300px]">
                <div className="flex items-center justify-center w-20 h-20 bg-gray-600 rounded-full mb-8">
                  <Edit3 className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-300 mb-4">describe your chrome extension</h3>
                <p className="text-gray-300 text-lg leading-relaxed">
                  tell us what you want your extension to do in plain english. we'll do the rest.
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center bg-gray-700/30 backdrop-blur-sm rounded-lg p-10 border border-gray-400/30 min-h-[300px]">
                <div className="flex items-center justify-center w-20 h-20 bg-gray-500 rounded-full mb-8">
                  <TestTube className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-300 mb-4">test within the app</h3>
                <p className="text-gray-300 text-lg leading-relaxed">
                  try your extension immediately in our simulated browser environment, testing all features and functionality in real-time.
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center bg-gray-600/30 backdrop-blur-sm rounded-lg p-10 border border-gray-300/30 min-h-[300px]">
                <div className="flex items-center justify-center w-20 h-20 bg-gray-400 rounded-full mb-8">
                  <Chrome className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-300 mb-4">download or publish</h3>
                <p className="text-gray-300 text-lg leading-relaxed">
                  get your extension directly to the chrome web store or download the files for manual installation. one-click deployment makes sharing your creation simple and fast.
                </p>
              </div>
            </div>

            {/* How-to: side-by-side steps */}
            <div className="mt-16">
              <h2 className="text-3xl font-semibold text-center mb-8 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                how to use chromie
              </h2>

              {/* Step 1 */}
              <div className="grid md:grid-cols-2 gap-8 items-center mb-10">
                <div className="bg-gray-800/20 border border-gray-500/20 rounded-lg p-6">
                  <h3 className="text-2xl font-semibold text-gray-200 mb-2">describe your extension</h3>
                  <p className="text-gray-300">tell chromie what you want in plain english. keep it simple and specific.</p>
                </div>
                <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                  <Image
                    src="/how-to-prompting.png"
                    alt="describe your extension prompt"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    onLoad={() => console.log('[about] screenshot loaded: how-to-prompting.png')}
                  />
                </div>
              </div>

              {/* Step 2 */}
              <div className="grid md:grid-cols-2 gap-8 items-center mb-10">
                <div className="bg-blue-800/20 border border-blue-500/20 rounded-lg p-6">
                  <h3 className="text-2xl font-semibold text-blue-200 mb-2">see the code in the editor</h3>
                  <p className="text-gray-300">review the generated files in the in-app editor. adjust anything you need.</p>
                </div>
                <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                  <Image
                    src="/how-to-code-generated.png"
                    alt="see generated code in the in-app editor"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    onLoad={() => console.log('[about] screenshot loaded: how-to-code-generated.png')}
                  />
                </div>
              </div>

              {/* Step 3 */}
              <div className="grid md:grid-cols-2 gap-8 items-center mb-10">
                <div className="bg-green-800/20 border border-green-500/20 rounded-lg p-6">
                  <h3 className="text-2xl font-semibold text-green-200 mb-2">test in the browser simulator</h3>
                  <p className="text-gray-300">run the extension instantly with the built-in test environment to verify behavior.</p>
                </div>
                <div className="space-y-4">
                  <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                    <Image
                      src="/how-to-testing.png"
                      alt="test the extension in the simulator"
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover object-top"
                      onLoad={() => console.log('[about] screenshot loaded: how-to-testing.png')}
                    />
                  </div>
                  <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                    <Image
                      src="/how-to-browser-simulator.png"
                      alt="browser simulator view"
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-contain"
                      onLoad={() => console.log('[about] screenshot loaded: how-to-browser-simulator.png')}
                    />
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="bg-slate-800/20 border border-slate-500/20 rounded-lg p-6">
                  <h3 className="text-2xl font-semibold text-slate-200 mb-2">download the zip</h3>
                  <p className="text-gray-300">grab a zip with all the code to run locally or publish to the chrome web store.</p>
                </div>
                <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                  <Image
                    src="/how-to-downloading.png"
                    alt="download the zip with your code"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover object-top"
                    onLoad={() => console.log('[about] screenshot loaded: how-to-downloading.png')}
                  />
                </div>
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
