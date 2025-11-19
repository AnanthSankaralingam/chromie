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
        className={`max-w-[80%] min-w-0 p-4 rounded-2xl ${
          message.role === "user"
            ? "bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-400/30 text-blue-100 backdrop-blur-sm shadow-lg"
            : isFinalExplanation
            ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/40 text-white backdrop-blur-sm shadow-xl ring-2 ring-green-400/20"
            : "bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-slate-600/50 text-slate-200 backdrop-blur-sm shadow-lg"
        }`}
      >
        {message.role === "assistant" ? (
          <MarkdownMessage content={message.content} typingCancelSignal={typingCancelSignal} />
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        )}
      </div>
    </div>
  )
} 