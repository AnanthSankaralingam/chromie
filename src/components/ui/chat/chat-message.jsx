"use client"

import { useState } from "react"
import MarkdownMessage from "./markdown-message"
import { ChatBubble, ChatBubbleMessage, ChatBubbleAvatar } from "@/components/ui/chat-bubble"
import { UrlInputRequest, ApiInputRequest, FrontendTypeInputRequest, WorkspaceApiInputRequest } from "./input-request-message"
import { RotateCcw, Copy, Check } from "lucide-react"
import { CHROMIE_LOGO_URL } from "@/lib/constants"

// Renders the inner content of an assistant message without any ChatBubble wrapper.
// Used when multiple assistant messages are grouped into a single unified bubble.
export function ChatMessageContent({ message, index, typingCancelSignal, onUrlSubmit, onApiSubmit, onUrlCancel, onApiCancel, onFrontendTypeSubmit, onFrontendTypeCancel, onWorkspaceApiSubmit, onWorkspaceApiCancel, setMessages }) {
  const isFinalExplanation = message.isFinalExplanation === true
  const isFrontendTypeInputRequest = message.type === "frontend_type_input_request"
  const isUrlInputRequest = message.type === "url_input_request"
  const isApiInputRequest = message.type === "api_input_request"
  const isWorkspaceApiInputRequest = message.type === "workspace_api_input_request"

  const content = isWorkspaceApiInputRequest ? (
    <WorkspaceApiInputRequest message={message} onSubmit={onWorkspaceApiSubmit} onCancel={onWorkspaceApiCancel} setMessages={setMessages} messageIndex={index} />
  ) : isFrontendTypeInputRequest ? (
    <FrontendTypeInputRequest message={message} onSubmit={onFrontendTypeSubmit} onCancel={onFrontendTypeCancel} setMessages={setMessages} messageIndex={index} />
  ) : isUrlInputRequest ? (
    <UrlInputRequest message={message} onSubmit={onUrlSubmit} onCancel={onUrlCancel} setMessages={setMessages} messageIndex={index} />
  ) : isApiInputRequest ? (
    <ApiInputRequest message={message} onSubmit={onApiSubmit} onCancel={onApiCancel} setMessages={setMessages} messageIndex={index} />
  ) : (
    <MarkdownMessage content={message.content} typingCancelSignal={typingCancelSignal} />
  )

  if (isFinalExplanation) {
    return (
      <div className="border-l-2 border-green-500/50 pl-3 bg-green-500/5 rounded-r-md py-3">
        {content}
      </div>
    )
  }

  return content
}

export default function ChatMessage({ message, index, showAvatar, typingCancelSignal, onUrlSubmit, onApiSubmit, onUrlCancel, onApiCancel, onFrontendTypeSubmit, onFrontendTypeCancel, onWorkspaceApiSubmit, onWorkspaceApiCancel, setMessages, projectId, onRevert }) {
  const [isReverting, setIsReverting] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const isUser = message.role === "user"
  const hasVersionSnapshot = isUser && message.versionId

  const handleRevert = async () => {
    if (!message.versionId || !projectId) return
    if (!confirm("Revert to this version? This will restore your project to the state before this message.")) return

    setIsReverting(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/versions/${message.versionId}/revert`, { method: "POST" })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to revert")
      }
      const data = await response.json()
      if (onRevert) onRevert()
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
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy prompt:", error)
    }
  }

  // User messages still get their own standalone bubble with action buttons
  if (isUser) {
    return (
      <ChatBubble variant="sent">
        <div className="flex items-center gap-1">
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
        <ChatBubbleMessage variant="sent">
          <div className="space-y-2">
            {message.images && message.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {message.images.map((image, idx) => {
                  let imageSrc
                  if (typeof image === 'string') imageSrc = image
                  else if (image instanceof File) imageSrc = URL.createObjectURL(image)
                  else if (image.data) imageSrc = image.data
                  return (
                    <img key={idx} src={imageSrc} alt={`Uploaded ${idx + 1}`} className="max-w-xs max-h-48 rounded-lg border border-slate-600" />
                  )
                })}
              </div>
            )}
            <p className="text-base whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        </ChatBubbleMessage>
      </ChatBubble>
    )
  }

  // Standalone assistant bubble (used for legacy/fallback paths only)
  return (
    <ChatBubble variant="received">
      {showAvatar && <ChatBubbleAvatar src={CHROMIE_LOGO_URL} fallback="AI" className="h-8 w-8 shrink-0" />}
      <ChatBubbleMessage variant="received">
        <ChatMessageContent
          message={message}
          index={index}
          typingCancelSignal={typingCancelSignal}
          onUrlSubmit={onUrlSubmit}
          onApiSubmit={onApiSubmit}
          onUrlCancel={onUrlCancel}
          onApiCancel={onApiCancel}
          onFrontendTypeSubmit={onFrontendTypeSubmit}
          onFrontendTypeCancel={onFrontendTypeCancel}
          onWorkspaceApiSubmit={onWorkspaceApiSubmit}
          onWorkspaceApiCancel={onWorkspaceApiCancel}
          setMessages={setMessages}
        />
      </ChatBubbleMessage>
    </ChatBubble>
  )
}