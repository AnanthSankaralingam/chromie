"use client"

import MarkdownMessage from "./markdown-message"
import { ChatBubble, ChatBubbleMessage, ChatBubbleAvatar } from "@/components/ui/chat-bubble"

export default function ChatMessage({ message, index, typingCancelSignal }) {
  // Check if this is a final explanation message (contains "Here's what I've built for you")
  const isFinalExplanation = message.role === "assistant" && 
    message.content && 
    message.content.includes("Here's what I've built for you")

  const variant = message.role === "user" ? "sent" : "received"
  
  // Use Chromie logo for AI avatar
  const userAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&crop=faces&fit=crop"
  const aiAvatar = "/chromie-logo-1.png"

  return (
    <ChatBubble variant={variant}>
      <ChatBubbleAvatar
        src={message.role === "user" ? userAvatar : aiAvatar}
        fallback={message.role === "user" ? "U" : "AI"}
        className="h-8 w-8 shrink-0"
      />
      <ChatBubbleMessage
        variant={variant}
        className={
          isFinalExplanation
            ? "bg-green-600 text-white"
            : undefined
        }
      >
        {message.role === "assistant" ? (
          <MarkdownMessage content={message.content} typingCancelSignal={typingCancelSignal} />
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        )}
      </ChatBubbleMessage>
    </ChatBubble>
  )
} 