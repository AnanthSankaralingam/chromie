"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Zap, Send, Paperclip, Sparkles, Edit3, Github } from "lucide-react"
import { useSession } from '@/components/SessionProviderClient'
import { useRouter } from "next/navigation"
import AuthModal from "@/components/ui/auth-modal"
import AppBar from "@/components/ui/app-bar"

export default function HomePage() {
  const { isLoading, user } = useSession()
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!prompt.trim()) return

    if (!user) {
      setIsAuthModalOpen(true)
      return
    }

    setIsGenerating(true)

    try {
      // Create a new project
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: prompt.slice(0, 50) + "...",
          description: prompt,
        }),
      })

      const { project } = await response.json()

      // Redirect to builder immediately with the prompt to auto-generate
      router.push(`/builder?project=${project.id}&autoGenerate=${encodeURIComponent(prompt)}`)
    } catch (error) {
      console.error("Error generating extension:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e)
    }
  }

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
        <main className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              what do you want to build?
            </h1>
            <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
              create powerful chrome extensions by chatting with ai.
            </p>

            {/* Chat Input */}
            <form onSubmit={handleSubmit} className="mb-8">
              <div className="relative max-w-3xl mx-auto">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="type your extension idea and we'll bring it to life (or /command)"
                  className="w-full min-h-[120px] p-6 text-lg bg-slate-800/50 border-slate-600 rounded-xl text-white placeholder:text-slate-500 resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isGenerating}
                />

                {/* Action Buttons */}
                <div className="absolute bottom-4 left-4 flex items-center space-x-3">
                  <Button type="button" variant="ghost" size="sm" className="text-slate-400 hover:text-white p-2">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="text-slate-400 hover:text-white p-2">
                    <Sparkles className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="text-slate-400 hover:text-white p-2">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="absolute bottom-4 right-4">
                  <Button
                    type="submit"
                    disabled={!prompt.trim() || isGenerating}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-6"
                  >
                    {isGenerating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {isGenerating ? "generating..." : "build"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </>
  )
}
