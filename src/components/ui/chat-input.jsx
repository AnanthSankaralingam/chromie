"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send } from "lucide-react"

export default function ChatInput({ 
  inputMessage, 
  setInputMessage, 
  onSubmit, 
  isGenerating, 
  projectId 
}) {
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e)
    }
  }

  return (
    <div className="p-4 border-t border-white/10">
      <form onSubmit={onSubmit} className="space-y-3">
        <Textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="describe what you want to add or modify..."
          className="min-h-[80px] bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 resize-none"
          disabled={isGenerating}
        />
        <Button
          type="submit"
          disabled={!inputMessage.trim() || isGenerating || !projectId}
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50"
        >
          <Send className="h-4 w-4 mr-2" />
          {isGenerating ? "generating..." : !projectId ? "setting up project..." : "send"}
        </Button>
      </form>
    </div>
  )
} 