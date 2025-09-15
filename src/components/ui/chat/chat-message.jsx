"use client"

import { Bot, User } from "lucide-react"
import MarkdownMessage from "./markdown-message"

export default function ChatMessage({ message, index }) {
  return (
    <div
      className={`flex items-start space-x-3 ${
        message.role === "user" ? "flex-row-reverse space-x-reverse" : ""
      }`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          message.role === "user" ? "bg-blue-500" : "bg-purple-500"
        }`}
      >
        {message.role === "user" ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>
      <div
        className={`max-w-[80%] p-3 rounded-lg ${
          message.role === "user"
            ? "bg-blue-500/10 border border-blue-500/20 text-blue-100"
            : "bg-slate-700/50 border border-slate-600/50 text-slate-200"
        }`}
      >
        {message.role === "assistant" ? (
          <MarkdownMessage content={message.content} />
        ) : (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
    </div>
  )
} 