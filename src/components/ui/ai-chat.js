"use client"

import { useState, useEffect } from "react"
import { Bot } from "lucide-react"
import ChatHeader from "./chat-header"
import ChatMessage from "./chat-message"
import ChatInput from "./chat-input"
import ModalUrlPrompt from "@/components/ui/modals/modal-url-prompt"
import { useChat } from "@/hooks"
import { REQUEST_TYPES } from "@/lib/constants"

export default function AIChat({ projectId, autoGeneratePrompt, onAutoGenerateComplete, onCodeGenerated, onGenerationStart, onGenerationEnd, isProjectReady, previousResponseId }) {
  const [urlPromptData, setUrlPromptData] = useState(null)
  const [showUrlPrompt, setShowUrlPrompt] = useState(false)

  // Listen for URL prompt events from use-chat hook
  useEffect(() => {
    const handleUrlPromptRequired = (event) => {
      const { data, originalPrompt } = event.detail
      console.log('🔗 URL prompt required event received:', data)
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
    setHasGeneratedCode,
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
    isProjectReady,
    previousResponseId
  })

  // Detect if this is a follow-up request
  const isFollowUpRequest = hasGeneratedCode || !!previousResponseId

  // Wrapper to maintain compatibility with older callers referencing this name
  const handleSendMessageWithUrlPrompt = (e) => {
    return handleSendMessage(e)
  }

  // Show URL prompt modal when needed
  const showUrlPromptModal = (data, originalPrompt) => {
    console.log('🔗 Showing URL prompt modal for:', { data, originalPrompt })
    setUrlPromptData({ data, originalPrompt })
    setShowUrlPrompt(true)
  }

  // Handle URL submission from modal
  const onUrlSubmit = (data, userUrl, originalPrompt) => {
    console.log('🔗 URL submitted from modal:', userUrl)
    setShowUrlPrompt(false)
    setUrlPromptData(null)
    handleUrlSubmit(data, userUrl, originalPrompt)
  }

  // Handle URL modal cancellation
  const onUrlCancel = () => {
    console.log('❌ URL modal cancelled')
    setShowUrlPrompt(false)
    setUrlPromptData(null)
    handleUrlCancel()
  }



  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="relative">
        <ChatHeader />
        {/* Conversation Continuity Indicator */}
        {isFollowUpRequest && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-xs text-blue-300">
            💬 follow-up
          </div>
        )}
      </div>

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
                <span className="text-sm text-slate-300">
                  {isFollowUpRequest ? "continuing conversation..." : "generating code..."}
                </span>
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
