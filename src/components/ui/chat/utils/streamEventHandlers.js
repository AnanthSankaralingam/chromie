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
    setIsActuallyGeneratingCode,
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
        // Only show start message once per generation cycle
        if (!hasGeneratedCode && !hasShownStartMessageRef?.current) {
          addNewAssistantMessage("Starting to analyze your request...")
          if (hasShownStartMessageRef) {
            hasShownStartMessageRef.current = true
          }
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

      // Ignore intermediate status noise
      case "analyzing":
      case "analysis_complete":
      case "fetching_apis":
      case "apis_ready":
      case "scraping":
      case "scraping_complete":
      case "scraping_skipped":
      case "context_ready":
      case "phase":
        break

      case "generation_starting":
        // Mark that actual code generation (not planning) has started
        if (setIsActuallyGeneratingCode) {
          setIsActuallyGeneratingCode(true)
        }
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
  } = context

  return (data, prompt, requestType, projectId) => {
    // Store the current request info for URL continuation
    currentRequestRef.current = {
      prompt: prompt,
      requestType: requestType,
      projectId: projectId,
      analysisData: data.analysisData,
    }

    // Add a chat message with URL input request
    const urlInputMessage = {
      role: "assistant",
      type: "url_input_request",
      content: data.content || "To build your extension, I need the URL of the website you want to interact with. This helps me understand the page structure and create the right selectors.",
      detectedSites: data.detectedSites || [],
      detectedUrls: data.detectedUrls || [],
      featureRequest: prompt,
      requestType: requestType,
    }
    
    setMessages((prev) => [...prev, urlInputMessage])
  }
}

export function createRequiresApiHandler(context) {
  const {
    setMessages,
    currentRequestRef,
  } = context

  return (data, prompt, requestType, projectId) => {

    // Store the current request info for API continuation
    currentRequestRef.current = {
      prompt: prompt,
      requestType: requestType,
      projectId: projectId,
      analysisData: data.analysisData,
    }

    // Add a chat message with API input request
    const apiInputMessage = {
      role: "assistant",
      type: "api_input_request",
      content: data.content || "Your extension needs to connect to external APIs. Please provide the base endpoint URLs for each API below. You can use the default endpoints or provide custom ones.",
      suggestedAPIs: data.suggestedAPIs || [],
    }
    
    setMessages((prev) => [...prev, apiInputMessage])
  }
}
