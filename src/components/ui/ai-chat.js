"use client"

import { useState, useEffect } from "react"
import { Bot } from "lucide-react"
import ChatHeader from "./chat-header"
import ChatMessage from "./chat-message"
import ChatInput from "./chat-input"
import ModalUrlPrompt from "@/components/ui/modals/modal-url-prompt"
import { useChat } from "@/hooks"
import { REQUEST_TYPES } from "@/lib/prompts/old-prompts"

export default function AIChat({ projectId, autoGeneratePrompt, onAutoGenerateComplete, onCodeGenerated, onGenerationStart, onGenerationEnd, isProjectReady }) {
  const [urlPromptData, setUrlPromptData] = useState(null)
  const [showUrlPrompt, setShowUrlPrompt] = useState(false)
  
  // Listen for URL prompt events from use-chat hook
  useEffect(() => {
    const handleUrlPromptRequired = (event) => {
      const { data, originalPrompt } = event.detail
      console.log('URL prompt required event received:', data)
      showUrlPromptModal(data, originalPrompt)
    }

    window.addEventListener('urlPromptRequired', handleUrlPromptRequired)
    
    return () => {
      window.removeEventListener('urlPromptRequired', handleUrlPromptRequired)
    }
  }, [])
  
  const {
    messages,
    setMessages,
    inputMessage,
    setInputMessage,
    isGenerating,
    setIsGenerating,
    hasGeneratedCode,
    messagesEndRef,
    handleSendMessage,
    handleUrlSubmit,
    handleUrlCancel,
    scrollToBottom
  } = useChat({
    projectId,
    autoGeneratePrompt,
    onAutoGenerateComplete,
    onCodeGenerated,
    onGenerationStart,
    onGenerationEnd,
    isProjectReady
  })

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
    setIsGenerating(true)

    // Notify parent component that generation started
    if (onGenerationStart) {
      onGenerationStart()
    }

    try {
      const requestType = hasGeneratedCode ? REQUEST_TYPES.ADD_TO_EXISTING : REQUEST_TYPES.NEW_EXTENSION
      console.log(`🔄 Follow-up request detected. Using request type: ${requestType}`)
      
      // Add "generating code..." message immediately
      const generatingMessage = {
        role: "assistant",
        content: "🚀 generating code...",
      }
      setMessages(prev => [...prev, generatingMessage])
      
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
      if (response.status === 403) {
        content = data.error || "token usage limit exceeded for your plan. please upgrade to continue generating extensions."
      } else if (data.requiresUrl) {
        // Show URL prompt modal for scraping
        // console.log('URL required for scraping:', data.message);
        
        // Replace "generating code..." with URL request message
        const urlRequestMessage = {
          role: "assistant",
          content: "🔗 i need to analyze the specific webpage structure to build this extension effectively. please provide the url of the website you want the extension to work with.",
        }
        
        setMessages(prev => {
          const newMessages = [...prev]
          // Replace the last message (which should be the "generating code..." message)
          if (newMessages.length > 0 && newMessages[newMessages.length - 1].content.includes("Generating code")) {
            newMessages[newMessages.length - 1] = urlRequestMessage
          } else {
            newMessages.push(urlRequestMessage)
          }
          return newMessages
        })
        
        showUrlPromptModal(data, inputMessage);
        
        // Clear the auto-generate prompt for URL requests
        if (onAutoGenerateComplete) {
          onAutoGenerateComplete()
        }
        
        return; // Don't continue with normal flow
      } else if (data.explanation) {
        content = `${data.explanation}`
      } else if (data.error) {
        content = `Error: ${data.error}`
      } else {
        content = "code generated successfully!"
      }

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

      // Post token usage to server (moved out of /api/generate)
      try {
        if (data?.tokenUsage?.total_tokens) {
          await fetch('/api/token-usage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              tokensThisRequest: data.tokenUsage.total_tokens,
              model: data.tokenUsage.model || 'unknown'
            })
          })
        }
      } catch (usageErr) {
        console.error('Failed to post token usage:', usageErr)
      }

      // Mark that code has been generated
      setHasGeneratedCode(true)

      if (onCodeGenerated) {
        onCodeGenerated(data)
      }

      // Refresh token usage display by triggering a page reload of the token usage component
      // This is a simple way to refresh the token usage without complex state management
      const tokenUsageEvent = new CustomEvent('tokenUsageUpdated')
      window.dispatchEvent(tokenUsageEvent)
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

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <ChatHeader />

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} index={index} />
        ))}
        {isGenerating && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="bg-slate-700/50 border border-slate-600/50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-400 border-t-transparent" />
                <span className="text-sm text-slate-300">generating code...</span>
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
    </div>
  )
}
