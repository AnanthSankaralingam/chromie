"use client"

import MarkdownMessage from "./markdown-message"
import { ChatBubble, ChatBubbleMessage, ChatBubbleAvatar } from "@/components/ui/chat-bubble"
import { UrlInputRequest, ApiInputRequest } from "./input-request-message"

export default function ChatMessage({ message, index, showAvatar, typingCancelSignal, onUrlSubmit, onApiSubmit, onUrlCancel, onApiCancel, setMessages }) {
  // Check if this is a final explanation message (contains "Here's what I've built for you")
  const isFinalExplanation = message.role === "assistant" &&
    message.content &&
    message.content.includes("Here's what I've built for you")

  const variant = message.role === "user" ? "sent" : "received"
  const isUser = message.role === "user"
  const aiAvatar = "/chromie-logo-1.png"

  // Check if this is an input request message
  const isUrlInputRequest = message.type === "url_input_request"
  const isApiInputRequest = message.type === "api_input_request"

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
          <p className="text-base whitespace-pre-wrap break-words">{message.content}</p>
        )}
      </ChatBubbleMessage>
    </ChatBubble>
  )
} 