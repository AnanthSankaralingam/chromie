"use client"

import MarkdownMessage from "./markdown-message"

export default function ChatMessage({ message, index, typingCancelSignal }) {
  // Check if this is a final explanation message (contains "Here's what I've built for you")
  const isFinalExplanation = message.role === "assistant" && 
    message.content && 
    message.content.includes("Here's what I've built for you")

  return (
    <div
      className={`flex items-start space-x-3 ${
        message.role === "user" ? "flex-row-reverse space-x-reverse" : ""
      }`}
    >
      <div
        className={`max-w-[80%] p-4 rounded-2xl ${
          message.role === "user"
            ? "bg-gradient-to-r from-gray-600/20 to-gray-700/20 border border-gray-500/30 text-gray-100 backdrop-blur-sm shadow-lg"
            : isFinalExplanation
            ? "bg-gradient-to-r from-gray-500/20 to-gray-600/20 border border-gray-400/40 text-white backdrop-blur-sm shadow-xl ring-2 ring-gray-400/20"
            : "bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-gray-600/50 text-gray-200 backdrop-blur-sm shadow-lg"
        }`}
      >
        {message.role === "assistant" ? (
          <MarkdownMessage content={message.content} typingCancelSignal={typingCancelSignal} />
        ) : (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
    </div>
  )
} 