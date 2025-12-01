/**
 * Handles different types of stream events from the API
 */

export function createStreamEventHandler(context) {
  const {
    setMessages,
    setModelThinkingFull,
    setConversationTokenTotal,
    setPlanningProgress,
    setCurrentPlanningPhase,
    setIsGenerationComplete,
    explanationBufferRef,
    thinkingChunkCountRef,
    previousResponseIdRef,
    conversationTokenTotal,
    filesSavedRef,
    doneReceivedRef,
    onCodeGenerated,
    hasGeneratedCode,
    setHasGeneratedCode,
    modelThinkingFull,
    setModelThinkingDisplay,
    thinkingTimerRef,
    setTypingCancelSignal,
  } = context

  const addNewAssistantMessage = (content) => {
    const newMessage = {
      role: "assistant",
      content: content,
    }
    setMessages((prev) => [...prev, newMessage])
  }

  return (data) => {
    switch (data.type) {
      case "thinking_chunk":
      case "thinking":
        if (typeof data.content === "string" && data.content.length > 0) {
          thinkingChunkCountRef.current += 1
          setModelThinkingFull((prev) => prev + data.content)
        }
        break

      case "planning_progress":
        if (data.phase && data.content) {
          setCurrentPlanningPhase(data.phase)
          setPlanningProgress(data.content)
        }
        break

      case "start":
        if (!hasGeneratedCode) {
          addNewAssistantMessage("Starting to analyze your request...")
        }
        break

      case "token_usage":
        if (typeof data.total === "number") {
          setConversationTokenTotal(data.total)
        }
        break

      case "usage_summary":
        // Usage data is tracked server-side but not displayed to users
        break

      case "context_window":
        addNewAssistantMessage("Context limit reached. Please start a new conversation.")
        if (typeof data.total === "number") {
          setConversationTokenTotal(data.total)
        }
        break

      case "response_id":
        previousResponseIdRef.current = data.id
        if (typeof data.tokensUsedThisRequest === "number") {
          const nextTotal = (conversationTokenTotal || 0) + data.tokensUsedThisRequest
          setConversationTokenTotal(nextTotal)
        }
        break

      // Ignore intermediate status noise
      case "analyzing":
      case "analysis_complete":
      case "fetching_apis":
      case "apis_ready":
      case "scraping":
      case "scraping_complete":
      case "scraping_skipped":
      case "context_ready":
      case "generation_starting":
      case "phase":
        break

      case "explanation":
        if (data.content) {
          explanationBufferRef.current += data.content
        }
        break

      case "generating_code":
        break

      case "code":
        // If backend supplies file path info, auto-select in editor via global event
        try {
          const filePath = data.file_path || data.path || data.file || null
          if (filePath && typeof window !== "undefined") {
            const evt = new CustomEvent("editor:selectFile", {
              detail: { file_path: String(filePath) },
            })
            window.dispatchEvent(evt)
          }
        } catch (_) {}
        break

      case "files_saved":
      case "generation_complete":
        filesSavedRef.current = true
        // Focus manifest.json after a short delay
        try {
          if (typeof window !== "undefined") {
            setTimeout(() => {
              const evt = new CustomEvent("editor:focusManifest")
              window.dispatchEvent(evt)
            }, 200)
          }
        } catch (_) {}
        // If done was already received, trigger onCodeGenerated now
        if (doneReceivedRef.current && onCodeGenerated) {
          onCodeGenerated({ success: true })
          doneReceivedRef.current = false
          filesSavedRef.current = false
        }
        break

      case "error":
        addNewAssistantMessage(
          "I encountered an error: " +
            data.content +
            "\n\nPlease try again or let me know if you need help with something else."
        )
        break

      case "done":
        doneReceivedRef.current = true

        // Emit the final explanation once when stream completes
        if (explanationBufferRef.current.trim()) {
          addNewAssistantMessage(
            "Here's what I've built for you:\n\n" + explanationBufferRef.current.trim()
          )
          explanationBufferRef.current = ""
        }

        // Mark generation as complete
        setIsGenerationComplete(true)
        setPlanningProgress(null)
        setCurrentPlanningPhase(null)

        if (!hasGeneratedCode) {
          setHasGeneratedCode(true)
        }

        // Only call onCodeGenerated if files have been saved
        if (filesSavedRef.current && onCodeGenerated) {
          onCodeGenerated({ success: true })
          doneReceivedRef.current = false
          filesSavedRef.current = false
        }

        // Cancel any active typing and render full responses immediately
        setTypingCancelSignal((v) => v + 1)

        // Request manifest focus
        try {
          if (typeof window !== "undefined") {
            const evt = new CustomEvent("editor:focusManifest")
            window.dispatchEvent(evt)
          }
        } catch (_) {}

        // Flush model thinking panel
        setModelThinkingDisplay(modelThinkingFull)
        if (thinkingTimerRef.current) {
          clearTimeout(thinkingTimerRef.current)
          thinkingTimerRef.current = null
        }
        break

      default:
        // Unknown event type
        break
    }
  }
}

export function createRequiresUrlHandler(context) {
  const {
    setMessages,
    currentRequestRef,
    isOnboardingModalOpen,
    setPendingUrlPrompt,
    setUrlPromptData,
    setShowUrlPrompt,
  } = context

  return (data, prompt, requestType, projectId) => {
    console.log("📋 Received requires_url signal:", data)
    console.log("📊 Has analysisData:", !!data.analysisData)

    const addNewAssistantMessage = (content) => {
      const newMessage = {
        role: "assistant",
        content: content,
      }
      setMessages((prev) => [...prev, newMessage])
    }

    addNewAssistantMessage(
      "I need to analyze a specific website to build this extension properly. Let me get that information from you..."
    )

    // Store the current request info for URL continuation
    currentRequestRef.current = {
      prompt: prompt,
      requestType: requestType,
      projectId: projectId,
      analysisData: data.analysisData,
    }
    console.log("💾 Stored currentRequestRef with analysisData:", !!currentRequestRef.current.analysisData)

    const urlModalData = {
      data: {
        requiresUrl: true,
        message:
          data.content ||
          "This extension would benefit from analyzing specific website structure. Please choose how you'd like to proceed.",
        detectedSites: data.detectedSites || [],
        detectedUrls: data.detectedUrls || [],
        featureRequest: prompt,
        requestType: requestType,
      },
      originalPrompt: prompt,
    }

    // If onboarding is open, queue the modal
    if (isOnboardingModalOpen) {
      console.log("⏳ Onboarding is open - queueing URL prompt modal")
      setPendingUrlPrompt(urlModalData)
    } else {
      console.log("✅ Showing URL prompt modal immediately")
      setUrlPromptData(urlModalData)
      setShowUrlPrompt(true)
    }
  }
}

export function createRequiresApiHandler(context) {
  const {
    setMessages,
    currentRequestRef,
    isOnboardingModalOpen,
    setPendingApiPrompt,
    setApiPromptData,
    setShowApiPrompt,
  } = context

  return (data, prompt, requestType, projectId) => {
    console.log("🔌 Received requires_api event:", {
      suggestedAPIs: data.suggestedAPIs,
      content: data.content,
      hasAnalysisData: !!data.analysisData,
    })

    const addNewAssistantMessage = (content) => {
      const newMessage = {
        role: "assistant",
        content: content,
      }
      setMessages((prev) => [...prev, newMessage])
    }

    addNewAssistantMessage("This extension looks like it might need external APIs. Let me get endpoint details...")

    // Store the current request info for API continuation
    currentRequestRef.current = {
      prompt: prompt,
      requestType: requestType,
      projectId: projectId,
      analysisData: data.analysisData,
    }

    const apiModalData = {
      data: {
        suggestedAPIs: data.suggestedAPIs || [],
        message:
          data.content ||
          "This extension looks like it might need external API endpoints. Please configure them or choose to skip.",
      },
      originalPrompt: prompt,
    }

    console.log("🔌 API Modal Data prepared:", {
      suggestedAPIsCount: apiModalData.data.suggestedAPIs.length,
      hasMessage: !!apiModalData.data.message,
      isOnboardingOpen: isOnboardingModalOpen,
    })

    // If onboarding is open, queue the modal
    if (isOnboardingModalOpen) {
      console.log("⏳ Onboarding is open - queueing API prompt modal")
      setPendingApiPrompt(apiModalData)
    } else {
      console.log("✅ Showing API prompt modal immediately")
      setApiPromptData(apiModalData)
      setShowApiPrompt(true)
    }
  }
}
