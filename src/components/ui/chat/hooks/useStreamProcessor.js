import { useCallback } from "react"
import { REQUEST_TYPES } from "@/lib/prompts/request-types"
import {
  createStreamEventHandler,
  createRequiresUrlHandler,
  createRequiresApiHandler,
} from "../utils/streamEventHandlers"
import { fetchWithErrorHandling, streamResponse, buildGeneratePayload } from "../utils/apiHelpers"

export function useStreamProcessor({
  chatState,
  projectId,
  modelOverride,
  isOnboardingModalOpen,
  onGenerationStart,
  onGenerationEnd,
  onCodeGenerated,
  onAutoGenerateComplete,
  autoGeneratePrompt,
}) {
  const {
    setMessages,
    setIsGenerating,
    hasGeneratedCode,
    setHasGeneratedCode,
    setShowTokenLimitModal,
    resetStreamState,
    conversationTokenTotal,
    setConversationTokenTotal,
    setTypingCancelSignal,
    lastUrlSelectionRef,
    currentRequestRef,
    explanationBufferRef,
    thinkingChunkCountRef,
    filesSavedRef,
    doneReceivedRef,
    hasShownStartMessageRef,
    setModelThinkingFull,
    setPlanningProgress,
    setCurrentPlanningPhase,
    setIsGenerationComplete,
    modelThinkingFull,
    setModelThinkingDisplay,
    thinkingTimerRef,
    setIsActuallyGeneratingCode,
  } = chatState

  const processStream = useCallback(
    async (payload, eventHandlerExtensions = {}) => {
      const onTokenLimitError = () => {
        setShowTokenLimitModal(true)
        setIsGenerating(false)
        if (onGenerationEnd) onGenerationEnd()
      }

      const response = await fetchWithErrorHandling(
        "/api/generate/stream",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        onTokenLimitError
      )

      if (!response) return false

      // Create event handler context
      const handlerContext = {
        setMessages,
        setModelThinkingFull,
        setConversationTokenTotal,
        setPlanningProgress,
        setCurrentPlanningPhase,
        setIsGenerationComplete,
        explanationBufferRef,
        thinkingChunkCountRef,
        conversationTokenTotal,
        filesSavedRef,
        doneReceivedRef,
        hasShownStartMessageRef,
        onCodeGenerated,
        hasGeneratedCode,
        setHasGeneratedCode,
        modelThinkingFull,
        setModelThinkingDisplay,
        thinkingTimerRef,
        setTypingCancelSignal,
        currentRequestRef,
        setIsActuallyGeneratingCode,
      }

      const handleEvent = createStreamEventHandler(handlerContext)
      const handleRequiresUrl = createRequiresUrlHandler(handlerContext)
      const handleRequiresApi = createRequiresApiHandler(handlerContext)

      for await (const data of streamResponse(response)) {
        if (data.type === "requires_url") {
          handleRequiresUrl(data, payload.prompt, payload.requestType, payload.projectId)
        } else if (data.type === "requires_api") {
          handleRequiresApi(data, payload.prompt, payload.requestType, payload.projectId)
        } else if (eventHandlerExtensions[data.type]) {
          eventHandlerExtensions[data.type](data)
        } else {
          handleEvent(data)
        }
      }

      return true
    },
    [
      chatState,
      onCodeGenerated,
      onGenerationEnd,
      setShowTokenLimitModal,
      setIsGenerating,
      hasGeneratedCode,
      setHasGeneratedCode,
      conversationTokenTotal,
      modelThinkingFull,
    ]
  )

  const startGeneration = useCallback(
    async (prompt, isAutoGeneration = false) => {
      if (chatState.isGenerating) {
        console.log("⚠️ [StreamingChat] startGeneration called but already generating - ignoring")
        return
      }

      console.log("🚀 [StreamingChat] Starting generation:", {
        prompt: prompt?.substring(0, 50),
        isAutoGeneration,
      })

      lastUrlSelectionRef.current = null
      setIsGenerating(true)
      resetStreamState(true) // Reset start message flag for new generation

      if (onGenerationStart) onGenerationStart()

      try {
        // Refresh hasGeneratedCode from API
        let currentHasGeneratedCode = hasGeneratedCode
        if (projectId) {
          try {
            const response = await fetch(`/api/projects/${projectId}/has-generated-code`)
            if (response.ok) {
              const data = await response.json()
              currentHasGeneratedCode = data.hasGeneratedCode
              if (data.hasGeneratedCode !== hasGeneratedCode) {
                setHasGeneratedCode(data.hasGeneratedCode)
              }
            }
          } catch (error) {
            console.error("Error refreshing hasGeneratedCode:", error)
          }
        }

        const requestType = currentHasGeneratedCode
          ? REQUEST_TYPES.ADD_TO_EXISTING
          : REQUEST_TYPES.NEW_EXTENSION

        const payload = buildGeneratePayload({
          prompt,
          projectId,
          requestType,
          conversationTokenTotal,
          modelOverride,
        })

        await processStream(payload)

        // Don't clear autoGeneratePrompt yet - it might pause for URL/API input
        if (autoGeneratePrompt) {
          chatState.setInputMessage("")
        }
      } catch (error) {
        console.error("Error in streaming generation:", error)
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `I encountered an error: ${error.message}\n\nPlease try again or let me know if you need help with something else.`,
          },
        ])
      } finally {
        setIsGenerating(false)
        setTypingCancelSignal((v) => v + 1)
        if (autoGeneratePrompt) {
          chatState.setInputMessage("")
        }
        if (onGenerationEnd) onGenerationEnd()
      }
    },
    [
      chatState,
      projectId,
      modelOverride,
      onGenerationStart,
      onGenerationEnd,
      onAutoGenerateComplete,
      autoGeneratePrompt,
      hasGeneratedCode,
      setHasGeneratedCode,
      setIsGenerating,
      resetStreamState,
      processStream,
      lastUrlSelectionRef,
      conversationTokenTotal,
      setMessages,
      setTypingCancelSignal,
    ]
  )

  const startGenerationWithUrl = useCallback(
    async (prompt, userUrl, requestType, projectId, analysisData = null) => {
      if (chatState.isGenerating) return

      console.log("🔗 [startGenerationWithUrl] Starting with URL:", userUrl, "Has analysisData:", !!analysisData)

      setIsGenerating(true)
      resetStreamState(false) // Don't reset start message flag - this is a continuation

      if (onGenerationStart) onGenerationStart()

      try {
        const payload = buildGeneratePayload({
          prompt,
          projectId,
          requestType,
          userProvidedUrl: userUrl,
          skipScraping: false,
          conversationTokenTotal,
          modelOverride,
          analysisData,
        })

        console.log("📤 [startGenerationWithUrl] Sending to API:", {
          userProvidedUrl: userUrl,
          skipScraping: false,
          hasInitialRequirementsAnalysis: !!payload.initialRequirementsAnalysis,
        })

        await processStream(payload)

        // Don't clear autoGeneratePrompt yet - it might pause for URL/API input
        if (autoGeneratePrompt) {
          chatState.setInputMessage("")
        }
      } catch (error) {
        console.error("Error in streaming generation with URL:", error)
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `I encountered an error: ${error.message}\n\nPlease try again or let me know if you need help with something else.`,
          },
        ])
      } finally {
        setIsGenerating(false)
        setTypingCancelSignal((v) => v + 1)
        if (onGenerationEnd) onGenerationEnd()
      }
    },
    [
      chatState,
      conversationTokenTotal,
      modelOverride,
      onGenerationStart,
      onGenerationEnd,
      onAutoGenerateComplete,
      autoGeneratePrompt,
      setIsGenerating,
      resetStreamState,
      processStream,
      setMessages,
      setTypingCancelSignal,
    ]
  )

  const continueGenerationWithSkipScraping = useCallback(
    async (requestInfo) => {
      console.log("🚫 User skipped URL - checking analysisData")

      setIsGenerating(true)
      resetStreamState(false) // Don't reset start message flag - this is a continuation

      if (onGenerationStart) onGenerationStart()

      try {
        const payload = buildGeneratePayload({
          prompt: requestInfo.prompt,
          projectId: requestInfo.projectId,
          requestType: requestInfo.requestType,
          userProvidedUrl: null,
          skipScraping: true,
          analysisData: requestInfo.analysisData,
        })

        console.log("📤 [handleUrlSubmit Skip] Sending to API:", {
          skipScraping: true,
          hasInitialRequirementsAnalysis: !!payload.initialRequirementsAnalysis,
        })

        // Custom event handler for start event in skip flow
        const eventHandlerExtensions = {
          start: () => {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: "Analysis complete, now generating your extension...\nContinuing with extension generation...",
              },
            ])
          },
        }

        await processStream(payload, eventHandlerExtensions)
      } catch (err) {
        console.error("Error continuing generation without URL:", err)
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `I encountered an error: ${err.message}`,
          },
        ])
      } finally {
        setIsGenerating(false)
        setTypingCancelSignal((v) => v + 1)
        if (onGenerationEnd) onGenerationEnd()
      }
    },
    [
      chatState,
      onGenerationStart,
      onGenerationEnd,
      setIsGenerating,
      resetStreamState,
      processStream,
      setMessages,
      setTypingCancelSignal,
    ]
  )

  const continueGenerationWithApis = useCallback(
    async (requestInfo, userApis) => {
      setIsGenerating(true)
      resetStreamState(false) // Don't reset start message flag - this is a continuation

      if (onGenerationStart) onGenerationStart()

      try {
        const urlSelection = lastUrlSelectionRef.current
        const payload = buildGeneratePayload({
          prompt: requestInfo.prompt,
          projectId: requestInfo.projectId,
          requestType: requestInfo.requestType,
          userProvidedApis: userApis,
          userProvidedUrl: urlSelection?.skipScraping ? null : urlSelection?.userUrl,
          skipScraping: !!urlSelection?.skipScraping,
          analysisData: requestInfo.analysisData,
        })

        await processStream(payload)
      } catch (error) {
        console.error("Error in API continuation:", error)
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `I encountered an error while continuing generation: ${error.message}\n\nPlease try again.`,
          },
        ])
      } finally {
        setIsGenerating(false)
        setTypingCancelSignal((v) => v + 1)
        if (onGenerationEnd) onGenerationEnd()
      }
    },
    [
      chatState,
      onGenerationStart,
      onGenerationEnd,
      setIsGenerating,
      resetStreamState,
      processStream,
      lastUrlSelectionRef,
      setMessages,
      setTypingCancelSignal,
    ]
  )

  return {
    startGeneration,
    startGenerationWithUrl,
    continueGenerationWithSkipScraping,
    continueGenerationWithApis,
  }
}
