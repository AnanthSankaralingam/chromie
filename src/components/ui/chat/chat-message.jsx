"use client"

import MarkdownMessage from "./markdown-message"
import { ChatBubble, ChatBubbleMessage, ChatBubbleAvatar } from "@/components/ui/chat-bubble"

export default function ChatMessage({ message, index, showAvatar, typingCancelSignal }) {
  // Check if this is a final explanation message (contains "Here's what I've built for you")
  const isFinalExplanation = message.role === "assistant" &&
    message.content &&
    message.content.includes("Here's what I've built for you")

  const variant = message.role === "user" ? "sent" : "received"
  const isUser = message.role === "user"
  const aiAvatar = "/chromie-logo-1.png"

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
        {message.role === "assistant" ? (
          <MarkdownMessage content={message.content} typingCancelSignal={typingCancelSignal} />
        ) : (
          <p className="text-base whitespace-pre-wrap break-words">{message.content}</p>
        )}
      </ChatBubbleMessage>
    </ChatBubble>
  )
} 