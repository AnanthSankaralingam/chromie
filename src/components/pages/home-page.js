"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Zap, Send, Paperclip, Sparkles, Edit3, Github } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const { user, loading } = useAuth()
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!prompt.trim()) return

    if (!user) {
      router.push("/signup")
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

      // Generate extension code
      await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          projectId: project.id,
        }),
      })

      // Redirect to builder
      router.push(`/builder?project=${project.id}`)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">chromie ai</span>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/about" className="text-slate-300 hover:text-white transition-colors">
              about us
            </Link>
            <Link href="/features" className="text-slate-300 hover:text-white transition-colors">
              features
            </Link>
            <Link href="/docs" className="text-slate-300 hover:text-white transition-colors">
              docs
            </Link>
            <Link href="/pricing" className="text-slate-300 hover:text-white transition-colors">
              pricing
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-3">
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <Github className="h-5 w-5" />
              </a>
            </div>
            {user ? (
              <div className="flex items-center space-x-2">
                <span className="text-slate-300">Welcome, {user.user_metadata?.name || user.email}</span>
                <Link href="/builder">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">dashboard</Button>
                </Link>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-slate-300 hover:text-white">
                    sign in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">get started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
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

          {/* Quick Examples */}
          <div className="mt-16 text-left max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold mb-4 text-slate-300">quick examples:</h3>
            <div className="grid gap-3">
              {[
                "a password manager that auto-fills forms",
                "a productivity tracker that blocks distracting websites",
                "a price comparison tool for shopping sites",
                "a dark mode toggle for any website",
              ].map((example, index) => (
                <button
                  key={index}
                  onClick={() => setPrompt(example)}
                  className="text-left p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 text-slate-300 hover:text-white transition-colors border border-slate-700/50 hover:border-slate-600"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
