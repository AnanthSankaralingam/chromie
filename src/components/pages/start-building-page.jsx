"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Send, LoaderIcon, Sparkles, RefreshCw } from "lucide-react"
import { useSession } from "@/components/SessionProviderClient"
import { useRouter } from "next/navigation"
import Link from "next/link"
import AuthModal from "@/components/ui/modals/modal-auth"
import AppBar from "@/components/ui/app-bars/app-bar"
import { ProjectMaxAlert } from "@/components/ui/modals/project-max-alert"
import TokenUsageAlert from "@/components/ui/modals/token-usage-alert"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { extensionSuggestions } from "@/lib/data/extension-suggestions"
import { useToast } from "@/lib/hooks/use-toast"
import { INPUT_LIMITS } from "@/lib/constants"

export default function StartBuildingPage() {
  const { isLoading, user } = useSession()
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isProjectLimitModalOpen, setIsProjectLimitModalOpen] = useState(false)
  const [projectLimitDetails, setProjectLimitDetails] = useState(null)
  const [isTokenLimitModalOpen, setIsTokenLimitModalOpen] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const router = useRouter()
  const textareaRef = useRef(null)
  const { toast } = useToast()

  const pickRandom = (exclude = []) => {
    const pool = extensionSuggestions.filter((s) => !exclude.includes(s.id))
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 3)
  }

  const [visibleSuggestions, setVisibleSuggestions] = useState(() => pickRandom())

  const handleRefreshSuggestions = () => {
    setVisibleSuggestions((prev) => pickRandom(prev.map((s) => s.id)))
  }

  const handleSuggestionClick = (suggestion) => {
    setPrompt(suggestion.prompt)
    textareaRef.current?.focus()
  }

  const adjustHeight = useCallback((reset = false) => {
    const textarea = textareaRef.current
    if (!textarea) return

    if (reset) {
      textarea.style.height = "80px"
      return
    }

    textarea.style.height = "80px"
    const newHeight = Math.max(80, Math.min(textarea.scrollHeight, 240))
    textarea.style.height = `${newHeight}px`
  }, [])

  const handleTextareaChange = (e) => {
    const value = e.target.value.slice(0, INPUT_LIMITS.PROMPT)
    setPrompt(value)
    adjustHeight()
  }

  const handleTextareaFocus = () => {
    setInputFocused(true)
  }

  const handleTextareaBlur = () => {
    setInputFocused(false)
  }

  const handleOptimizePrompt = async () => {
    const promptText = prompt.trim()

    if (promptText.length < 10) {
      toast({
        variant: "destructive",
        title: "Prompt too short",
        description: "Prompt must be at least 10 characters long.",
      })
      return
    }

    if (promptText.length > INPUT_LIMITS.PROMPT) {
      toast({
        variant: "destructive",
        title: "Prompt too long",
        description: `Prompt must be ${INPUT_LIMITS.PROMPT.toLocaleString()} characters or less.`,
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

    if (prompt.length > INPUT_LIMITS.PROMPT) {
      toast({
        variant: "destructive",
        title: "Prompt too long",
        description: `Prompt must be ${INPUT_LIMITS.PROMPT.toLocaleString()} characters or less.`,
      })
      return
    }

    if (!user) {
      const promptData = {
        prompt: prompt.trim(),
        timestamp: Date.now(),
      }
      sessionStorage.setItem("pending_prompt", JSON.stringify(promptData))

      const url = new URL(window.location.href)
      url.searchParams.set("prompt", encodeURIComponent(prompt.trim()))
      window.history.replaceState({}, "", url.toString())

      setIsAuthModalOpen(true)
      return
    }

    setIsGenerating(true)

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `${prompt.slice(0, 50)}...`,
          description: prompt,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()

        if (response.status === 403 && errorData.error === "projects limit reached") {
          setProjectLimitDetails(errorData.details)
          setIsProjectLimitModalOpen(true)
          setIsGenerating(false)
          return
        }
        if (
          response.status === 403 &&
          (errorData.error === "Token usage limit exceeded" ||
            (errorData.error || "").toLowerCase().includes("token usage"))
        ) {
          setIsTokenLimitModalOpen(true)
          setIsGenerating(false)
          return
        }

        throw new Error(errorData.error || "Failed to create project")
      }

      const { project } = await response.json()

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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  useEffect(() => {
    const restorePrompt = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const urlPrompt = urlParams.get("prompt")

      if (urlPrompt) {
        const decodedPrompt = decodeURIComponent(urlPrompt)
        setPrompt(decodedPrompt)

        const url = new URL(window.location.href)
        url.searchParams.delete("prompt")
        window.history.replaceState({}, "", url.toString())
        return
      }

      const savedPromptData = sessionStorage.getItem("pending_prompt")
      if (savedPromptData) {
        try {
          const { prompt: savedPrompt, timestamp } = JSON.parse(savedPromptData)
          if (Date.now() - timestamp < 60 * 60 * 1000) {
            setPrompt(savedPrompt)
          } else {
            sessionStorage.removeItem("pending_prompt")
          }
        } catch (error) {
          console.error("Error parsing saved prompt:", error)
          sessionStorage.removeItem("pending_prompt")
        }
      }
    }

    restorePrompt()
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [prompt, adjustHeight])

  const handleUpgradePlan = () => {
    setIsProjectLimitModalOpen(false)
    router.push("/#pricing")
  }

  const handleManageProjects = () => {
    setIsProjectLimitModalOpen(false)
    router.push("/profile")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080a0f]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/10 border-t-white/30" />
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-[#080a0f] text-white relative overflow-hidden flex flex-col">
        <AppBar />

        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <FlickeringGrid
            className="absolute inset-0 z-0"
            squareSize={4}
            gridGap={6}
            color="rgb(156, 163, 175)"
            maxOpacity={0.08}
            flickerChance={2.0}
          />
        </div>

        <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-14 relative z-10">
          <div className="w-full max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-8"
            >
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
                start building with chromie
              </h1>
              <p className="text-sm md:text-base text-zinc-400 max-w-lg mx-auto mb-2">
                describe your extension in plain language — we&apos;ll generate the code.
              </p>
              <Link
                href="/"
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                ← back to home
              </Link>
            </motion.div>

            <motion.form
              onSubmit={handleSubmit}
              className="relative mb-4"
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.45 }}
            >
              <div
                className={cn(
                  "relative bg-[#0f1117] rounded-2xl border transition-all duration-200",
                  inputFocused ? "border-white/20" : "border-white/[0.08] hover:border-white/[0.14]"
                )}
              >
                <div className="p-6">
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleTextareaFocus}
                    onBlur={handleTextareaBlur}
                    placeholder="describe your extension idea. chromie will bring it to life..."
                    disabled={isGenerating || isOptimizing}
                    maxLength={INPUT_LIMITS.PROMPT}
                    className={cn(
                      "w-full px-0 py-0",
                      "resize-none",
                      "bg-transparent",
                      "border-none",
                      "text-white text-base md:text-lg leading-relaxed",
                      "focus:outline-none focus:ring-0",
                      "placeholder:text-zinc-600",
                      "min-h-[80px]",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    style={{ overflowY: "auto" }}
                  />
                </div>

                <div className="px-6 pb-6 flex items-center justify-between gap-4">
                  <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-600">
                    <kbd className="px-2 py-1.5 bg-white/[0.05] rounded-md border border-white/[0.08] font-mono">
                      enter
                    </kbd>
                    <span>to send</span>
                  </div>

                  <div className="flex items-center gap-3 ml-auto sm:ml-0">
                    <Button
                      type="button"
                      onClick={handleOptimizePrompt}
                      disabled={isOptimizing || isGenerating || !prompt.trim()}
                      size="lg"
                      title="optimize prompt"
                      className={cn(
                        "font-medium transition-all duration-200 px-4 py-2.5 rounded-full text-xs md:text-sm",
                        prompt.trim() && !isOptimizing && !isGenerating
                          ? "bg-transparent text-zinc-300 border border-white/[0.12] hover:bg-white/[0.06] hover:border-white/20 hover:text-white"
                          : "bg-transparent text-zinc-700 cursor-not-allowed border border-white/[0.06]"
                      )}
                    >
                      {isOptimizing ? (
                        <LoaderIcon className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </Button>

                    <Button
                      type="submit"
                      disabled={isGenerating || isOptimizing || !prompt.trim()}
                      size="lg"
                      className={cn(
                        "font-medium transition-all duration-200 px-6 py-2.5 rounded-full text-xs md:text-sm",
                        prompt.trim() && !isGenerating && !isOptimizing
                          ? "bg-white text-[#080a0f] hover:bg-zinc-100"
                          : "bg-white/10 text-zinc-600 cursor-not-allowed border-0"
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

            {!prompt && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="flex flex-col items-center gap-3 mt-6"
              >
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span>try an example prompt</span>
                  <button
                    type="button"
                    onClick={handleRefreshSuggestions}
                    className="hover:text-zinc-300 transition-colors"
                    aria-label="Refresh suggestions"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {visibleSuggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSuggestionClick(s)}
                      className="text-xs text-zinc-400 border border-white/[0.1] rounded-full px-4 py-2 hover:bg-white/[0.06] hover:text-zinc-200 hover:border-white/20 transition-all duration-150"
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        redirectUrl="/builder"
        showBlurredBackground
      />

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

      <TokenUsageAlert isOpen={isTokenLimitModalOpen} onClose={() => setIsTokenLimitModalOpen(false)} />
    </>
  )
}
