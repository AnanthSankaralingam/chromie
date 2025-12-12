"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Send, LoaderIcon, ArrowRight } from "lucide-react"
import { useSession } from '@/components/SessionProviderClient'
import { useRouter } from "next/navigation"
import AuthModal from "@/components/ui/modals/modal-auth"
import { ProjectMaxAlert } from "@/components/ui/modals/project-max-alert"
import TokenUsageAlert from "@/components/ui/modals/token-usage-alert"
import TabCompleteSuggestions from "@/components/ui/tab-complete-suggestions"
import { cn } from "@/lib/utils"
import { extensionSuggestions } from "@/lib/data/extension-suggestions"
import { motion } from "framer-motion"

export default function HeroSection() {
     const { isLoading, user } = useSession()
     const [prompt, setPrompt] = useState("")
     const [isGenerating, setIsGenerating] = useState(false)
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

     // Typing suggestions logic
     const typingSuggestions = useMemo(() =>
          extensionSuggestions.map(suggestion => suggestion.description),
          []
     )

     const adjustHeight = useCallback((reset = false) => {
          const textarea = textareaRef.current
          if (!textarea) return
          if (reset) {
               textarea.style.height = '60px'
               return
          }
          textarea.style.height = '60px'
          const newHeight = Math.max(60, Math.min(textarea.scrollHeight, 200))
          textarea.style.height = `${newHeight}px`
     }, [])

     const handleTextareaChange = (e) => {
          const value = e.target.value
          setPrompt(value)
          adjustHeight()
          if (value.trim().length >= 2) {
               setShowSuggestions(true)
          } else {
               setShowSuggestions(false)
          }
     }

     const handleSuggestionSelect = (suggestionText) => {
          setPrompt(suggestionText)
          setShowSuggestions(false)
          if (textareaRef.current) {
               textareaRef.current.focus()
          }
     }

     const handleTextareaFocus = () => {
          setInputFocused(true)
          if (prompt.trim().length >= 2) {
               setShowSuggestions(true)
          }
     }

     const handleTextareaBlur = () => {
          setInputFocused(false)
     }

     const handleSubmit = async (e) => {
          e.preventDefault()
          if (!prompt.trim()) return

          if (!user) {
               const promptData = { prompt: prompt.trim(), timestamp: Date.now() }
               sessionStorage.setItem('pending_prompt', JSON.stringify(promptData))
               const url = new URL(window.location)
               url.searchParams.set('prompt', encodeURIComponent(prompt.trim()))
               window.history.replaceState({}, '', url.toString())
               setIsAuthModalOpen(true)
               return
          }

          setIsGenerating(true)

          try {
               const response = await fetch("/api/projects", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                         name: prompt.slice(0, 50) + "...",
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
                    } else if (response.status === 403 && (errorData.error === 'Token usage limit exceeded' || (errorData.error || '').toLowerCase().includes('token usage'))) {
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
          if (showSuggestions && (e.key === 'Tab' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) return
          if (e.key === 'Enter' && !e.shiftKey) {
               if (!e.defaultPrevented) {
                    e.preventDefault()
                    setShowSuggestions(false)
                    handleSubmit(e)
               }
               return
          }
          if (e.key === 'Escape' && showSuggestions) {
               setShowSuggestions(false)
               return
          }
     }

     // Effects
     useEffect(() => {
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
                    if (charIndex <= currentText.length) {
                         setPlaceholderText('An extension that ' + currentText.slice(0, charIndex))
                         charIndex++
                    } else {
                         clearInterval(typingInterval)
                         pauseTimeout = setTimeout(() => {
                              isTyping = false
                              deleteInterval = setInterval(() => {
                                   if (charIndex > 0) {
                                        charIndex--
                                        setPlaceholderText('An extension that ' + currentText.slice(0, charIndex))
                                   } else {
                                        clearInterval(deleteInterval)
                                        setCurrentSuggestionIndex((prev) => (prev + 1) % typingSuggestions.length)
                                   }
                              }, 2)
                         }, 1000)
                    }
               }
          }, 8)

          return () => {
               clearInterval(typingInterval)
               if (pauseTimeout) clearTimeout(pauseTimeout)
               if (deleteInterval) clearInterval(deleteInterval)
          }
     }, [prompt, currentSuggestionIndex, typingSuggestions])

     useEffect(() => {
          const restorePrompt = () => {
               const urlParams = new URLSearchParams(window.location.search)
               const urlPrompt = urlParams.get('prompt')
               if (urlPrompt) {
                    setPrompt(decodeURIComponent(urlPrompt))
                    const url = new URL(window.location)
                    url.searchParams.delete('prompt')
                    window.history.replaceState({}, '', url.toString())
                    return
               }
               const savedPromptData = sessionStorage.getItem('pending_prompt')
               if (savedPromptData) {
                    try {
                         const { prompt: savedPrompt, timestamp } = JSON.parse(savedPromptData)
                         if (Date.now() - timestamp < 60 * 60 * 1000) {
                              setPrompt(savedPrompt)
                         } else {
                              sessionStorage.removeItem('pending_prompt')
                         }
                    } catch (error) {
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
          setIsProjectLimitModalOpen(false)
          router.push('/pricing')
     }

     const handleManageProjects = () => {
          setIsProjectLimitModalOpen(false)
          router.push('/profile')
     }

     return (
          <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
               <div className="container-width relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                         <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5 }}
                         >
                              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6 font-display">
                                   Extend your reach. <br className="hidden md:block" />
                                   <span className="text-primary">Not your roadmaps.</span>
                              </h1>
                              <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                                   Augment your product suite with a browser extension in seconds.
                              </p>
                         </motion.div>

                         {/* Prompt Box */}
                         <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.2, duration: 0.5 }}
                              className="max-w-2xl mx-auto relative"
                         >
                              <div className={cn(
                                   "relative bg-card rounded-2xl border transition-all duration-300 shadow-xl",
                                   inputFocused
                                        ? "border-primary/50 ring-4 ring-primary/5 shadow-2xl"
                                        : "border-border shadow-lg hover:shadow-xl"
                              )}>
                                   <TabCompleteSuggestions
                                        query={prompt}
                                        onSuggestionSelect={handleSuggestionSelect}
                                        isVisible={showSuggestions}
                                        onVisibilityChange={setShowSuggestions}
                                        inputRef={textareaRef}
                                   />

                                   <div className="p-4 md:p-6">
                                        <textarea
                                             ref={textareaRef}
                                             value={prompt}
                                             onChange={handleTextareaChange}
                                             onKeyDown={handleKeyDown}
                                             onFocus={handleTextareaFocus}
                                             onBlur={handleTextareaBlur}
                                             placeholder={placeholderText || "Describe your extension..."}
                                             disabled={isGenerating}
                                             className={cn(
                                                  "w-full px-0 py-0 resize-none bg-transparent border-none text-foreground text-lg leading-relaxed focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50 min-h-[60px]",
                                                  "disabled:opacity-50 disabled:cursor-not-allowed"
                                             )}
                                        />
                                   </div>

                                   <div className="px-4 pb-4 md:px-6 md:pb-6 flex items-center justify-between gap-4 border-t border-border/50 pt-4 mt-2">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                             <span className="bg-secondary px-2 py-1 rounded text-secondary-foreground">Enter</span>
                                             <span>to build</span>
                                        </div>

                                        <Button
                                             onClick={handleSubmit}
                                             disabled={isGenerating || !prompt.trim()}
                                             className={cn(
                                                  "btn-primary rounded-xl px-6 py-2 h-auto text-sm font-semibold transition-all",
                                                  prompt.trim() && !isGenerating
                                                       ? "shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-105"
                                                       : "opacity-50 cursor-not-allowed"
                                             )}
                                        >
                                             {isGenerating ? (
                                                  <>
                                                       <LoaderIcon className="w-4 h-4 animate-spin mr-2" />
                                                       Building...
                                                  </>
                                             ) : (
                                                  <>
                                                       Start Building
                                                       <ArrowRight className="w-4 h-4 ml-2" />
                                                  </>
                                             )}
                                        </Button>
                                   </div>
                              </div>
                         </motion.div>

                         {/* Social Proof / Trust */}
                         <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.4, duration: 0.5 }}
                              className="mt-16 pt-8 border-t border-border/40"
                         >
                              <p className="text-sm font-medium text-muted-foreground mb-6">TRUSTED BY DEVELOPERS FROM</p>
                              <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                                   {/* Placeholders for logos - using text for now to match style */}
                                   <span className="text-lg font-bold">Google</span>
                                   <span className="text-lg font-bold">Microsoft</span>
                                   <span className="text-lg font-bold">Amazon</span>
                                   <span className="text-lg font-bold">Meta</span>
                                   <span className="text-lg font-bold">Netflix</span>
                              </div>
                         </motion.div>
                    </div>
               </div>

               {/* Modals */}
               <AuthModal
                    isOpen={isAuthModalOpen}
                    onClose={() => setIsAuthModalOpen(false)}
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
          </section>
     )
}
