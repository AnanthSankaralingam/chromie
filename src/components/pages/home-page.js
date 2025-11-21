"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Send, LoaderIcon } from "lucide-react"
import { useSession } from '@/components/SessionProviderClient'
import { useRouter } from "next/navigation"
import AuthModal from "@/components/ui/modals/modal-auth"
import AppBar from "@/components/ui/app-bars/app-bar"
import { ProjectMaxAlert } from "@/components/ui/modals/project-max-alert"
import TokenUsageAlert from "@/components/ui/modals/token-usage-alert"
import TabCompleteSuggestions from "@/components/ui/tab-complete-suggestions"
import PersonaChipCarousel from "@/components/ui/persona-chip-carousel"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const { isLoading, user } = useSession()
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isProjectLimitModalOpen, setIsProjectLimitModalOpen] = useState(false)
  const [projectLimitDetails, setProjectLimitDetails] = useState(null)
  const [isTokenLimitModalOpen, setIsTokenLimitModalOpen] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showPersonaCarousel, setShowPersonaCarousel] = useState(true)
  const [inputFocused, setInputFocused] = useState(false)
  const router = useRouter()
  const textareaRef = useRef(null)

  // Auto-resize textarea hook
  const adjustHeight = useCallback((reset = false) => {
    const textarea = textareaRef.current
    if (!textarea) return

    if (reset) {
      textarea.style.height = '80px'
      return
    }

    textarea.style.height = '80px'
    const newHeight = Math.max(80, Math.min(textarea.scrollHeight, 240))
    textarea.style.height = `${newHeight}px`
  }, [])

  const handleTextareaChange = (e) => {
    const value = e.target.value
    setPrompt(value)
    adjustHeight()

    // Show suggestions when user starts typing
    if (value.trim().length >= 2) {
      setShowSuggestions(true)
      setShowPersonaCarousel(false)
    } else {
      setShowSuggestions(false)
      setShowPersonaCarousel(true)
    }
  }

  const handleSuggestionSelect = (suggestionText) => {
    setPrompt(suggestionText)
    setShowSuggestions(false)
    setShowPersonaCarousel(false)
    // Focus back to textarea after selection
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const handleTextareaFocus = () => {
    setInputFocused(true)

    // Show suggestions if there's existing text
    if (prompt.trim().length >= 2) {
      setShowSuggestions(true)
      setShowPersonaCarousel(false)
    } else {
      // Hide carousel when focused even with empty input
      setShowPersonaCarousel(false)
    }
  }

  const handleTextareaBlur = () => {
    setInputFocused(false)

    // Restart typing suggestions and show carousel when user blurs and textarea is empty
    if (!prompt.trim()) {
      setShowPersonaCarousel(true)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!prompt.trim()) return

    if (!user) {
      // Save prompt to sessionStorage and URL params before showing auth modal
      const promptData = {
        prompt: prompt.trim(),
        timestamp: Date.now()
      }
      sessionStorage.setItem('pending_prompt', JSON.stringify(promptData))
      
      // Also add prompt to URL params for backup
      const url = new URL(window.location)
      url.searchParams.set('prompt', encodeURIComponent(prompt.trim()))
      window.history.replaceState({}, '', url.toString())
      
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

        if (response.status === 403 && errorData.error === "projects limit reached") {
          // Show project limit modal
          setProjectLimitDetails(errorData.details)
          setIsProjectLimitModalOpen(true)
          setIsGenerating(false)
          return
      } else if (response.status === 403 && (errorData.error === 'Token usage limit exceeded' || (errorData.error || '').toLowerCase().includes('token usage'))) {
        setIsTokenLimitModalOpen(true)
        setIsGenerating(false)
        return
        }

        throw new Error(errorData.error || "Failed to create project")
      }

      const { project } = await response.json()

      // Redirect to builder immediately with the prompt to auto-generate
      const encodedPrompt = encodeURIComponent(prompt)
      const builderUrl = `/builder?project=${project.id}&autoGenerate=${encodedPrompt}`
      router.push(builderUrl)
    } catch (error) {
      console.error("Error generating extension:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleKeyDown = (e) => {
    // Let tab-complete component handle navigation keys (but not Enter or Escape)
    if (showSuggestions && (e.key === 'Tab' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      // Let the tab-complete component handle these keys
      return
    }

    // Handle Enter key for form submission (Shift+Enter for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      // Only submit if event wasn't already handled by tab-complete component
      if (!e.defaultPrevented) {
        e.preventDefault()
        setShowSuggestions(false) // Hide suggestions when submitting
        handleSubmit(e)
      }
      return
    }

    // Handle Escape key
    if (e.key === 'Escape' && showSuggestions) {
      setShowSuggestions(false)
      return
    }
  }

  // Restore prompt from URL params or sessionStorage on component mount
  useEffect(() => {
    const restorePrompt = () => {
      // First try to get prompt from URL params
      const urlParams = new URLSearchParams(window.location.search)
      const urlPrompt = urlParams.get('prompt')
      
      if (urlPrompt) {
        const decodedPrompt = decodeURIComponent(urlPrompt)
        setPrompt(decodedPrompt)
        
        // Clean up URL params
        const url = new URL(window.location)
        url.searchParams.delete('prompt')
        window.history.replaceState({}, '', url.toString())
        return
      }
      
      // Fallback to sessionStorage
      const savedPromptData = sessionStorage.getItem('pending_prompt')
      if (savedPromptData) {
        try {
          const { prompt: savedPrompt, timestamp } = JSON.parse(savedPromptData)
          // Only restore if prompt is less than 1 hour old
          if (Date.now() - timestamp < 60 * 60 * 1000) {
            setPrompt(savedPrompt)
          } else {
            // Clean up old prompt
            sessionStorage.removeItem('pending_prompt')
          }
        } catch (error) {
          console.error('Error parsing saved prompt:', error)
          sessionStorage.removeItem('pending_prompt')
        }
      }
    }
    
    restorePrompt()
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [prompt, adjustHeight])

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-slate-900 to-slate-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-[#0A0A0F] via-[#0F111A] to-[#0A0A0F] text-white relative overflow-hidden flex flex-col">
        {/* Header */}
        <AppBar />

        {/* Animated Background Blobs */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          {/* Flickering Grid Background */}
          <FlickeringGrid
            className="absolute inset-0 z-0"
            squareSize={4}
            gridGap={6}
            color="rgb(139, 92, 246)"
            maxOpacity={0.15}
            flickerChance={2.0}
          />
          
          <motion.div 
            className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-600/15 rounded-full filter blur-[140px] z-10"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.15, 0.25, 0.15],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute top-1/3 right-1/4 w-[700px] h-[700px] bg-blue-600/15 rounded-full filter blur-[140px] z-10"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-6 pt-12 pb-20 relative z-10">
          <div className="w-full max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              {/* Title Section with proper spacing */}
              <div className="text-center mb-12">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.6 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 pb-2"
                  style={{
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #A78BFA 50%, #60A5FA 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: '1.2'
                  }}
                >
                  what do you want to build?
                </motion.h1>
                <motion.p
                  className="text-lg md:text-xl text-slate-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                >
                  build chrome extensions in seconds by chatting with ai
                </motion.p>
              </div>

              {/* Chat Input Form */}
              <motion.form
                onSubmit={handleSubmit}
                className="relative mb-8"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.5 }}
              >
                <div className={cn(
                  "relative backdrop-blur-xl bg-slate-800/30 rounded-2xl border transition-all duration-300 shadow-2xl",
                  inputFocused 
                    ? "border-purple-500/60 shadow-purple-500/20" 
                    : "border-slate-700/40 hover:border-slate-600/60"
                )}>
                  {/* Tab Complete Suggestions */}
                  <TabCompleteSuggestions
                    query={prompt}
                    onSuggestionSelect={handleSuggestionSelect}
                    isVisible={showSuggestions}
                    onVisibilityChange={setShowSuggestions}
                    inputRef={textareaRef}
                  />

                  <div className="p-6">
                    <textarea
                      ref={textareaRef}
                      value={prompt}
                      onChange={handleTextareaChange}
                      onKeyDown={handleKeyDown}
                      onFocus={handleTextareaFocus}
                      onBlur={handleTextareaBlur}
                      placeholder="describe your extension..."
                      disabled={isGenerating}
                      className={cn(
                        "w-full px-0 py-0",
                        "resize-none",
                        "bg-transparent",
                        "border-none",
                        "text-white text-base md:text-lg leading-relaxed",
                        "focus:outline-none focus:ring-0",
                        "placeholder:text-slate-500",
                        "min-h-[80px]",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                      style={{
                        overflow: "hidden",
                      }}
                    />
                  </div>

                  <div className="px-6 pb-6 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <kbd className="px-2 py-1.5 bg-slate-700/60 rounded-md border border-slate-600/50 font-mono">Enter</kbd>
                      <span>to send</span>
                    </div>

                    <Button
                      type="submit"
                      disabled={isGenerating || !prompt.trim()}
                      size="lg"
                      className={cn(
                        "font-semibold transition-all duration-300 px-6 py-2.5",
                        prompt.trim() && !isGenerating
                          ? "bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 hover:from-purple-500 hover:via-purple-400 hover:to-blue-500 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 hover:scale-105"
                          : "bg-slate-700/40 text-slate-500 cursor-not-allowed"
                      )}
                    >
                      {isGenerating ? (
                        <>
                          <LoaderIcon className="w-4 h-4 animate-spin" />
                          <span className="ml-2">generating...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span className="ml-2">build</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.form>

              {/* Persona Chip Carousel */}
              <AnimatePresence>
                {showPersonaCarousel && !prompt && !isGenerating && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                  >
                    <PersonaChipCarousel
                      onSuggestionSelect={handleSuggestionSelect}
                      isVisible={true}
                      className="max-w-3xl mx-auto"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
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

      {/* Token Usage Modal */}
      <TokenUsageAlert isOpen={isTokenLimitModalOpen} onClose={() => setIsTokenLimitModalOpen(false)} />
    </>
  )
}

