"use client"

import { useState, useEffect } from "react"
import ChatHeader from "@/components/ui/chat/chat-header"
import ChatMessage from "@/components/ui/chat/chat-message"
import ChatInput from "@/components/ui/chat/chat-input"
import ModalUrlPrompt from "@/components/ui/modals/modal-url-prompt"
import StreamingChat from "@/components/ui/chat/streaming-chat"
import TokenUsageAlert from "@/components/ui/modals/token-usage-alert"
import { useChat } from "@/hooks/use-chat"
import { REQUEST_TYPES } from "@/lib/prompts/request-types"

export default function AIChat({ projectId, projectName, autoGeneratePrompt, onAutoGenerateComplete, onCodeGenerated, onGenerationStart, onGenerationEnd, isProjectReady }) {
  const [urlPromptData, setUrlPromptData] = useState(null)
  const [showUrlPrompt, setShowUrlPrompt] = useState(false)
  const [useStreaming, setUseStreaming] = useState(true) // Enable streaming with buffering fix
  const [previousResponseId, setPreviousResponseId] = useState(null)
  const [conversationTokenTotal, setConversationTokenTotal] = useState(0)
  const [showTokenLimitModal, setShowTokenLimitModal] = useState(false)
  
  // Listen for URL prompt events from use-chat hook
  useEffect(() => {
    // In streaming mode, StreamingChat owns the URL prompt. Skip listener here.
    if (useStreaming) return

    const handleUrlPromptRequired = (event) => {
      const { data, originalPrompt } = event.detail
      showUrlPromptModal(data, originalPrompt)
    }

    window.addEventListener('urlPromptRequired', handleUrlPromptRequired)
    
    return () => {
      window.removeEventListener('urlPromptRequired', handleUrlPromptRequired)
    }
  }, [useStreaming])
  
  // Only use the non-streaming chat hook when NOT in streaming mode
  const chatHookResult = useChat({
    projectId,
    autoGeneratePrompt: useStreaming ? null : autoGeneratePrompt, // Only trigger auto-gen in non-streaming mode
    onAutoGenerateComplete,
    onCodeGenerated,
    onGenerationStart,
    onGenerationEnd,
    isProjectReady
  })
  
  const {
    messages,
    setMessages,
    inputMessage,
    setInputMessage,
    isGenerating,
    setIsGenerating,
    hasGeneratedCode,
    setHasGeneratedCode,
    messagesEndRef,
    handleSendMessage,
    handleUrlSubmit,
    handleUrlCancel,
    scrollToBottom
  } = chatHookResult

  useEffect(() => {
    // Reset on navigation/refresh: local-only state
    setPreviousResponseId(null)
    setConversationTokenTotal(0)
    console.log('[client/ai-chat] reset conversation state')
  }, [projectId])

  // Helper to start a fresh conversation from UI triggers if needed
  const startNewConversation = () => {
    setPreviousResponseId(null)
    setConversationTokenTotal(0)
    console.log('[client/ai-chat] user started new conversation: cleared response id and token total')
  }

  // Show URL prompt modal when needed
  const showUrlPromptModal = (data, originalPrompt) => {
    setUrlPromptData({ data, originalPrompt })
    setShowUrlPrompt(true)
  }

  // Handle URL submission from modal
  const onUrlSubmit = (data, userUrl, originalPrompt) => {
    setShowUrlPrompt(false)
    setUrlPromptData(null)
    handleUrlSubmit(data, userUrl, originalPrompt)
  }

  // Handle URL modal cancellation
  const onUrlCancel = () => {
    setShowUrlPrompt(false)
    setUrlPromptData(null)
    handleUrlCancel()
  }

  // Override the default handleSendMessage to show URL prompt when needed
  const handleSendMessageWithUrlPrompt = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim() || isGenerating) return

    // Check if we have a valid project ID
    if (!isProjectReady) {
      const errorMessage = {
        role: "assistant",
        content: "please wait while i set up your project, then try again.",
      }
      setMessages((prev) => [...prev, errorMessage])
      return
    }

    const userMessage = { role: "user", content: inputMessage }
    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")

    try {
      // Force refresh hasGeneratedCode from Supabase before determining request type
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
          console.error('Error refreshing hasGeneratedCode:', error)
        }
      }
      
      const requestType = currentHasGeneratedCode ? REQUEST_TYPES.ADD_TO_EXISTING : REQUEST_TYPES.NEW_EXTENSION
      
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: inputMessage,
          projectId,
          requestType: requestType,
        }),
      })

      const data = await response.json()

      let content = ""

      // Handle different response scenarios
      if (response.status === 403 && data.details?.resourceType === 'tokens') {
        // Show token usage modal for token limit errors only - no chat message
        setShowTokenLimitModal(true)
        setIsGenerating(false)
        if (onGenerationEnd) {
          onGenerationEnd()
        }
        return // Don't show any error message in chat
      } else if (data.requiresUrl) {
        // Show URL prompt modal for scraping - no chat message needed
        
        // Ensure spinner is not shown
        setIsGenerating(false)
        
        showUrlPromptModal(data, inputMessage);
        
        // Clear the auto-generate prompt for URL requests
        if (onAutoGenerateComplete) {
          onAutoGenerateComplete()
        }
        
        return; // Don't continue with normal flow
      } else if (data.error) {
        content = `Error: ${data.error}`
      } else if (data.thinkingSummary) {
        content = `${data.thinkingSummary}`
      } else if (data.explanation) {
        content = `${data.explanation}`
      } else {
        content = "Extension code has been generated and saved to your project."
      }

      // Only add "generating code..." message if we're actually generating code (not showing URL modal)
      if (content && !data.requiresUrl) {
        // Turn on spinner only when actually generating
        setIsGenerating(true)
        
        const generatingMessage = {
          role: "assistant",
          content: "🚀 generating code...",
        }
        setMessages(prev => [...prev, generatingMessage])
        
        // Create the final assistant message
        const assistantMessage = {
          role: "assistant",
          content,
        }

        // Replace the "generating code..." message with the actual result
        setMessages((prev) => {
          const newMessages = [...prev]
          // Replace the last message (which should be the "generating code..." message)
          if (newMessages.length > 0 && newMessages[newMessages.length - 1].content.includes("Generating code")) {
            newMessages[newMessages.length - 1] = assistantMessage
          } else {
            newMessages.push(assistantMessage)
          }
          return newMessages
        })

        // Mark that code has been generated (only set once after first successful generation)
        if (!hasGeneratedCode) {
          setHasGeneratedCode(true)
        }

        if (onCodeGenerated) {
          onCodeGenerated(data)
        }

        // Refresh token usage display by triggering a page reload of the token usage component
        const tokenUsageEvent = new CustomEvent('tokenUsageUpdated')
        window.dispatchEvent(tokenUsageEvent)
      }

    } catch (error) {
      console.error("Error generating code:", error)
      const errorMessage = {
        role: "assistant",
        content: "sorry, i encountered an error while generating your extension. please try again.",
      }
      
      // Replace the "generating code..." message with the error message
      setMessages((prev) => {
        const newMessages = [...prev]
        // Replace the last message (which should be the "generating code..." message)
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].content.includes("Generating code")) {
          newMessages[newMessages.length - 1] = errorMessage
        } else {
          newMessages.push(errorMessage)
        }
        return newMessages
      })
    } finally {
      setIsGenerating(false)
      // Notify parent component that generation ended
      if (onGenerationEnd) {
        onGenerationEnd()
      }
    }
  }

  // Use streaming chat by default for better UX
  if (useStreaming) {
    try {
      return (
        <>
          <StreamingChat
            projectId={projectId}
            projectName={projectName}
            autoGeneratePrompt={autoGeneratePrompt}
            onAutoGenerateComplete={onAutoGenerateComplete}
            onCodeGenerated={onCodeGenerated}
            onGenerationStart={onGenerationStart}
            onGenerationEnd={onGenerationEnd}
            isProjectReady={isProjectReady}
            previousResponseId={previousResponseId}
            setPreviousResponseId={setPreviousResponseId}
            conversationTokenTotal={conversationTokenTotal}
            setConversationTokenTotal={setConversationTokenTotal}
          />
        </>
      )
    } catch (error) {
      console.error('Error rendering StreamingChat, falling back to regular chat:', error)
      setUseStreaming(false)
    }
  }

  // Fallback to original non-streaming chat
  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <ChatHeader />
      
      {/* Debug Toggle */}
      <div className="p-2 border-b border-white/10 bg-slate-800/50">
        <button
          onClick={() => setUseStreaming(!useStreaming)}
          className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-white"
        >
          {useStreaming ? 'Switch to Regular Chat' : 'Switch to Streaming Chat'}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto custom-scrollbar p-4 space-y-4 bg-gradient-to-b from-slate-800/30 to-slate-900/30">
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} index={index} />
        ))}
        {isGenerating && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-4 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm border border-purple-400/30 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm text-white font-medium">generating code...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        onSubmit={handleSendMessageWithUrlPrompt}
        isGenerating={isGenerating}
        projectId={projectId}
        projectName={projectName}
      />

      {/* URL Prompt Modal */}
      {showUrlPrompt && urlPromptData && (
        <ModalUrlPrompt
          data={urlPromptData.data}
          originalPrompt={urlPromptData.originalPrompt}
          onUrlSubmit={onUrlSubmit}
          onCancel={onUrlCancel}
          onCodeGenerated={onCodeGenerated}
          projectId={projectId}
          hasGeneratedCode={hasGeneratedCode}
          onGenerationEnd={onGenerationEnd}
        />
      )}
      <TokenUsageAlert isOpen={showTokenLimitModal} onClose={() => setShowTokenLimitModal(false)} />
    </div>
  )
}
