"use client"

import { useState } from "react"
import MarkdownMessage from "./markdown-message"
import { ChatBubble, ChatBubbleMessage, ChatBubbleAvatar } from "@/components/ui/chat-bubble"
import { UrlInputRequest, ApiInputRequest } from "./input-request-message"
import { RotateCcw, Copy, Check } from "lucide-react"
import { CHROMIE_LOGO_URL } from "@/lib/constants"

export default function ChatMessage({ message, index, showAvatar, typingCancelSignal, onUrlSubmit, onApiSubmit, onUrlCancel, onApiCancel, setMessages, projectId, onRevert }) {
  const [isReverting, setIsReverting] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  // Check if this is a final explanation message (marked with isFinalExplanation flag)
  const isFinalExplanation = message.role === "assistant" && message.isFinalExplanation === true

  const variant = message.role === "user" ? "sent" : "received"
  const isUser = message.role === "user"
  const aiAvatar = CHROMIE_LOGO_URL

  // Check if this is an input request message
  const isUrlInputRequest = message.type === "url_input_request"
  const isApiInputRequest = message.type === "api_input_request"

  // Check if this user message has a version snapshot
  const hasVersionSnapshot = isUser && message.versionId

  const handleRevert = async () => {
    if (!message.versionId || !projectId) return

    if (!confirm("Revert to this version? This will restore your project to the state before this message.")) {
      return
    }

    setIsReverting(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/versions/${message.versionId}/revert`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to revert")
      }

      const data = await response.json()
      console.log("✅ Reverted to version:", data)

      // Notify parent component that revert was successful
      if (onRevert) {
        onRevert()
      }

      alert(`Reverted successfully! Files restored: ${data.stats.files_restored}`)
    } catch (error) {
      console.error("Error reverting:", error)
      alert(`Failed to revert: ${error.message}`)
    } finally {
      setIsReverting(false)
    }
  }

  const handleCopy = async () => {
    if (!message.content) return

    try {
      await navigator.clipboard.writeText(message.content)
      setIsCopied(true)

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false)
      }, 2000)
    } catch (error) {
      console.error("Failed to copy prompt:", error)
    }
  }

  return (
    <ChatBubble variant={variant}>
      {/* Show avatar only for first AI message in succession */}
      {showAvatar && (
        <ChatBubbleAvatar
          src={aiAvatar}
          fallback="AI"
          className="h-8 w-8 shrink-0"
        />
      )}

      {/* Action buttons for user messages - placed BEFORE message on left side */}
      {isUser && (
        <div className="flex items-center gap-1">
          {/* Revert button - only show if version snapshot exists */}
          {hasVersionSnapshot && (
            <button
              onClick={handleRevert}
              disabled={isReverting}
              className="flex-shrink-0 p-1.5 rounded-md hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
              title="Revert to this version"
            >
              <RotateCcw className={`h-3.5 w-3.5 text-gray-400 group-hover:text-gray-300 ${isReverting ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Copy button - show for all user messages */}
          <button
            onClick={handleCopy}
            className="flex-shrink-0 p-1.5 rounded-md hover:bg-gray-700/50 transition-colors group"
            title="Copy prompt"
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-300" />
            )}
          </button>
        </div>
      )}

      <ChatBubbleMessage
        variant={variant}
        className={
          isFinalExplanation
            ? "bg-green-600/30 text-white"
            : undefined
        }
      >
        {isUrlInputRequest ? (
          <UrlInputRequest
            message={message}
            onSubmit={onUrlSubmit}
            onCancel={onUrlCancel}
            setMessages={setMessages}
            messageIndex={index}
          />
        ) : isApiInputRequest ? (
          <ApiInputRequest
            message={message}
            onSubmit={onApiSubmit}
            onCancel={onApiCancel}
            setMessages={setMessages}
            messageIndex={index}
          />
        ) : message.role === "assistant" ? (
          <MarkdownMessage content={message.content} typingCancelSignal={typingCancelSignal} />
        ) : (
          <div className="space-y-2">
            {message.images && message.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {message.images.map((image, idx) => {
                  // Handle different image formats:
                  // - File objects from fresh uploads
                  // - Data URL strings from database
                  // - Objects with 'data' property from API
                  let imageSrc
                  if (typeof image === 'string') {
                    imageSrc = image
                  } else if (image instanceof File) {
                    imageSrc = URL.createObjectURL(image)
                  } else if (image.data) {
                    imageSrc = image.data
                  }
                  
                  return (
                    <img
                      key={idx}
                      src={imageSrc}
                      alt={`Uploaded ${idx + 1}`}
                      className="max-w-xs max-h-48 rounded-lg border border-slate-600"
                    />
                  )
                })}
              </div>
            )}
            <p className="text-base whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        )}
      </ChatBubbleMessage>
    </ChatBubble>
  )
} 