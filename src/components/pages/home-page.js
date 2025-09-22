"use client"

import { useState, useEffect, useRef, useLayoutEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/forms-and-input/textarea"
import { Send, Paperclip, Sparkles, Edit3 } from "lucide-react"
import { useSession } from '@/components/SessionProviderClient'
import { useRouter } from "next/navigation"
import AuthModal from "@/components/ui/modals/modal-auth"
import AppBar from "@/components/ui/app-bars/app-bar"
import { ProjectMaxAlert } from "@/components/ui/project-max-alert"
import TabCompleteSuggestions from "@/components/ui/tab-complete-suggestions"

export default function HomePage() {
  const { isLoading, user } = useSession()
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isProjectLimitModalOpen, setIsProjectLimitModalOpen] = useState(false)
  const [projectLimitDetails, setProjectLimitDetails] = useState(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const router = useRouter()
  const textareaRef = useRef(null)

  const resizeTextarea = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const EXTRA_SPACE_PX = 30
    const newHeight = Math.max(120, textarea.scrollHeight + EXTRA_SPACE_PX)
    textarea.style.height = newHeight + 'px'
    console.log('🧺 Resized textarea with extra space', {
      scrollHeight: textarea.scrollHeight,
      extra: EXTRA_SPACE_PX,
      newHeight
    })
  }

  const handleTextareaInput = () => {
    requestAnimationFrame(() => {
      resizeTextarea()
    })
  }

  const handleTextareaChange = (e) => {
    const value = e.target.value
    setPrompt(value)
    
    // Show suggestions when user starts typing
    if (value.trim().length >= 2) {
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  const handleSuggestionSelect = (suggestionText) => {
    setPrompt(suggestionText)
    setShowSuggestions(false)
    // Focus back to textarea after selection
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
    console.log('🎯 Selected suggestion applied:', suggestionText.slice(0, 50) + '...')
  }

  const handleTextareaFocus = () => {
    // Show suggestions if there's existing text
    if (prompt.trim().length >= 2) {
      setShowSuggestions(true)
    }
  }

  const handleTextareaBlur = () => {
    // Don't hide suggestions immediately to allow clicking on them
    // The autocomplete component handles hiding via click outside
  }

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

      if (!response.ok) {
        const errorData = await response.json()
        
        if (response.status === 403 && errorData.error === "Project limit reached") {
          // Show project limit modal
          setProjectLimitDetails(errorData.details)
          setIsProjectLimitModalOpen(true)
          setIsGenerating(false)
          return
        }
        
        throw new Error(errorData.error || "Failed to create project")
      }

      const { project } = await response.json()

      // Redirect to builder immediately with the prompt to auto-generate
      const encodedPrompt = encodeURIComponent(prompt)
      const builderUrl = `/builder?project=${project.id}&autoGenerate=${encodedPrompt}`
      console.log('🚀 Redirecting to builder with prompt:', {
        originalPrompt: prompt,
        encodedPrompt: encodedPrompt,
        builderUrl: builderUrl,
        projectId: project.id
      })
      router.push(builderUrl)
    } catch (error) {
      console.error("Error generating extension:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleKeyDown = (e) => {
    // Let tab-complete component handle navigation and completion keys
    if (showSuggestions && (e.key === 'Tab' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Enter' || e.key === 'Escape')) {
      // Let the tab-complete component handle these keys
      return
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      setShowSuggestions(false) // Hide suggestions when submitting
      handleSubmit(e)
      return
    }
    if (e.key === 'Enter' && e.shiftKey) {
      // Ensure the textarea grows immediately after newline is inserted
      requestAnimationFrame(() => {
        resizeTextarea()
      })
    }
  }

  useLayoutEffect(() => {
    resizeTextarea()
  }, [prompt])

  useEffect(() => {
    resizeTextarea()
  }, [])

  const handleUpgradePlan = () => {
    // Close the modal and redirect to pricing page
    setIsProjectLimitModalOpen(false)
    router.push('/pricing')
  }

  const handleManageProjects = () => {
    // Close the modal and redirect to profile page to manage existing projects
    setIsProjectLimitModalOpen(false)
    router.push('/profile')
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
            <p className="text-xl text-slate-400 mb-8 md:mb-12 max-w-2xl mx-auto px-2">
              create powerful chrome extensions by chatting with ai.
            </p>

            {/* Chat Input */}
            <form onSubmit={handleSubmit} className="mb-8">
              <div className="relative max-w-3xl mx-auto">
                <Textarea
                  value={prompt}
                  onChange={handleTextareaChange}
                  onInput={handleTextareaInput}
                  onKeyDown={handleKeyDown}
                  onFocus={handleTextareaFocus}
                  onBlur={handleTextareaBlur}
                  onPaste={() => {
                    requestAnimationFrame(() => {
                      resizeTextarea()
                      console.log('📋 Pasted content: resized textarea to', textareaRef.current?.style.height)
                    })
                  }}
                  placeholder="type your extension idea and we'll bring it to life (or /command)"
                  className="w-full min-h-[120px] p-4 md:p-6 pb-32 text-base md:text-lg bg-slate-800/50 border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent overflow-hidden"
                  ref={textareaRef}
                  disabled={isGenerating}
                />

                {/* Tab Complete Suggestions */}
                <TabCompleteSuggestions
                  query={prompt}
                  onSuggestionSelect={handleSuggestionSelect}
                  isVisible={showSuggestions}
                  onVisibilityChange={setShowSuggestions}
                  inputRef={textareaRef}
                />

                {/* Action Buttons */}
                <div className="absolute bottom-3 md:bottom-4 left-3 md:left-4 flex items-center space-x-2 md:space-x-3">
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

                <div className="absolute bottom-3 md:bottom-4 right-3 md:right-4">
                  <Button
                    type="submit"
                    disabled={!prompt.trim() || isGenerating}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-5 md:px-6"
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

      {/* Project Limit Modal */}
      {projectLimitDetails && (
        <ProjectMaxAlert
          isOpen={isProjectLimitModalOpen}
          onClose={() => setIsProjectLimitModalOpen(false)}
          currentPlan={projectLimitDetails.currentPlan}
          currentProjectCount={projectLimitDetails.currentProjectCount}
          maxProjects={projectLimitDetails.maxProjects}
          onUpgradePlan={handleUpgradePlan}
          onDeleteProject={handleManageProjects}
        />
      )}
    </>
  )
}
