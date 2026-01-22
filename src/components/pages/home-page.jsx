"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Send, LoaderIcon, Sparkles } from "lucide-react"
import { useSession } from '@/components/SessionProviderClient'
import { useRouter } from "next/navigation"
import AuthModal from "@/components/ui/modals/modal-auth"
import AppBar from "@/components/ui/app-bars/app-bar"
import { ProjectMaxAlert } from "@/components/ui/modals/project-max-alert"
import TokenUsageAlert from "@/components/ui/modals/token-usage-alert"
import TabCompleteSuggestions from "@/components/ui/tab-complete-suggestions"
// import HowItWorksSection from "@/components/ui/sections/how-it-works-section" // COMMENTED OUT: Videos taking up too many resources on Vercel
import BlogSection from "@/components/ui/sections/blog-section"
import PricingSection from "@/components/ui/sections/pricing-section"
import ContactSection from "@/components/ui/sections/contact-section"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { extensionSuggestions } from "@/lib/data/extension-suggestions"
import { useToast } from "@/lib/hooks/use-toast"

export default function HomePage() {
  const { isLoading, user } = useSession()
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isProjectLimitModalOpen, setIsProjectLimitModalOpen] = useState(false)
  const [projectLimitDetails, setProjectLimitDetails] = useState(null)
  const [isTokenLimitModalOpen, setIsTokenLimitModalOpen] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [placeholderText, setPlaceholderText] = useState("")
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0)
  const router = useRouter()
  const textareaRef = useRef(null)
  const { toast } = useToast()

  // Typing suggestions for placeholder - extracted from extension suggestions data
  // Descriptions already have no prefix, "An extension that " is added during typing
  const typingSuggestions = useMemo(() =>
    extensionSuggestions.map(suggestion => suggestion.description),
    []
  )

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
  }

  const handleTextareaFocus = () => {
    setInputFocused(true)

    // Show suggestions if there's existing text
    if (prompt.trim().length >= 2) {
      setShowSuggestions(true)
    }
  }

  const handleTextareaBlur = () => {
    setInputFocused(false)
  }

  const handleOptimizePrompt = async () => {
    const promptText = prompt.trim()

    // Validate prompt length
    if (promptText.length < 10) {
      toast({
        variant: "destructive",
        title: "Prompt too short",
        description: "Prompt must be at least 10 characters long.",
      })
      return
    }

    if (promptText.length > 1500) {
      toast({
        variant: "destructive",
        title: "Prompt too long",
        description: "Prompt must be less than 1500 characters.",
      })
      return
    }

    setIsOptimizing(true)

    try {
      const response = await fetch("/api/optimize-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: promptText }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to optimize prompt")
      }

      const { optimizedPrompt } = await response.json()
      setPrompt(optimizedPrompt)
      adjustHeight()
    } catch (error) {
      console.error("Error optimizing prompt:", error)
      toast({
        variant: "destructive",
        title: "Optimization failed",
        description: error.message || "Failed to optimize prompt. Please try again.",
      })
    } finally {
      setIsOptimizing(false)
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

  // Typing animation effect for placeholder
  useEffect(() => {
    // Only run typing animation when prompt is empty
    if (prompt) {
      setPlaceholderText("")
      return
    }

    const currentText = typingSuggestions[currentSuggestionIndex]
    if (!currentText) return

    let charIndex = 0
    let isTyping = true
    let pauseTimeout = null
    let deleteInterval = null

    const typingInterval = setInterval(() => {
      if (isTyping) {
        // Typing phase
        if (charIndex <= currentText.length) {
          setPlaceholderText('An extension that ' + currentText.slice(0, charIndex))
          charIndex++
        } else {
          // Finished typing, pause before deleting
          clearInterval(typingInterval)
          pauseTimeout = setTimeout(() => {
            isTyping = false
            // Start deleting
            deleteInterval = setInterval(() => {
              if (charIndex > 0) {
                charIndex--
                setPlaceholderText('An extension that ' + currentText.slice(0, charIndex))
              } else {
                // Finished deleting, move to next suggestion
                clearInterval(deleteInterval)
                setCurrentSuggestionIndex((prev) => (prev + 1) % typingSuggestions.length)
              }
            }, 2)
          }, 1000) // Pause for 1 second
        }
      }
    }, 8) // Typing speed

    return () => {
      clearInterval(typingInterval)
      if (pauseTimeout) clearTimeout(pauseTimeout)
      if (deleteInterval) clearInterval(deleteInterval)
    }
  }, [prompt, currentSuggestionIndex, typingSuggestions])

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

    // Handle hash navigation (e.g., from /home#blog, /home#pricing, or /home#contact)
    const handleHashScroll = () => {
      const hash = window.location.hash
      if (hash === '#blog' || hash === '#pricing' || hash === '#contact') {
        setTimeout(() => {
          const section = document.getElementById(hash.substring(1))
          if (section) {
            section.scrollIntoView({ behavior: 'smooth' })
          }
        }, 100)
      }
    }

    handleHashScroll()
    
    // Also listen for hash changes
    window.addEventListener('hashchange', handleHashScroll)
    return () => window.removeEventListener('hashchange', handleHashScroll)
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
                  className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-2 pb-2 whitespace-nowrap overflow-x-auto"
                  style={{
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #A78BFA 50%, #60A5FA 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: 1.15,
                    letterSpacing: '0.01em',
                    wordSpacing: '0.02em',
                    maxWidth: '100%',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <i>extend</i> reach. not roadmaps.
                </motion.h1>
                <motion.p
                  className="text-lg md:text-xl text-slate-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                >
                  augment your product suite with a browser extension in seconds.
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
                      placeholder={placeholderText || "describe your extension..."}
                      disabled={isGenerating || isOptimizing}
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

                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        onClick={handleOptimizePrompt}
                        disabled={isOptimizing || isGenerating || !prompt.trim()}
                        size="lg"
                        title="optimize prompt"
                        className={cn(
                          "font-semibold transition-all duration-300 px-4 py-2.5",
                          prompt.trim() && !isOptimizing && !isGenerating
                            ? "bg-slate-700/60 hover:bg-slate-700/80 border border-slate-600/50 hover:border-slate-500/70 shadow-md hover:shadow-lg hover:scale-105"
                            : "bg-slate-700/40 text-slate-500 cursor-not-allowed border border-slate-700/40"
                        )}
                      >
                        {isOptimizing ? (
                          <>
                            <LoaderIcon className="w-4 h-4 animate-spin" />
                          </>
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </Button>

                      <Button
                        type="submit"
                        disabled={isGenerating || isOptimizing || !prompt.trim()}
                        size="lg"
                        className={cn(
                          "font-semibold transition-all duration-300 px-6 py-2.5",
                          prompt.trim() && !isGenerating && !isOptimizing
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
                </div>
              </motion.form>
            </motion.div>
          </div>
        </main>

        {/* COMMENTED OUT: How It Works Section - Videos taking up too many resources on Vercel
        <HowItWorksSection />
        */}

        {/* Pricing Section */}
        <PricingSection />

        {/* Blog Section */}
        <BlogSection />

        {/* Contact Section */}
        <ContactSection />

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

