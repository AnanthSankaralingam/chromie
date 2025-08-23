"use client"

import { Bot } from "lucide-react"

export default function ChatHeader() {
  return (
    <div className="p-4 border-b border-white/10">
      <h3 className="text-lg font-semibold mb-1 flex items-center">
        <Bot className="h-5 w-5 mr-2 text-purple-400" />
        chromie ai
      </h3>
      <p className="text-sm text-slate-400">let's build your personal assistant</p>
    </div>
  )
} 