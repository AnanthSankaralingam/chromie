"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Bot, User } from "lucide-react"

export default function AIChat({ projectId, onCodeGenerated, onGenerationStart, onGenerationEnd }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm your Chrome extension assistant. Tell me what you'd like in your extension.",
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasGeneratedCode, setHasGeneratedCode] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim() || isGenerating) return

    // Check if we have a valid project ID
    if (!projectId) {
      const errorMessage = {
        role: "assistant",
        content: "Please wait while I set up your project, then try again.",
      }
      setMessages((prev) => [...prev, errorMessage])
      return
    }

    const userMessage = { role: "user", content: inputMessage }
    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")
    setIsGenerating(true)

    // Notify parent component that generation started
    if (onGenerationStart) {
      onGenerationStart()
    }

    try {
      console.log("Sending request with type:", hasGeneratedCode ? "add_to_existing" : "new_extension")
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: inputMessage,
          projectId,
          requestType: hasGeneratedCode ? "add_to_existing" : "new_extension",
        }),
      })

      const data = await response.json()

      let content = ""

      // Handle different response scenarios
      if (response.status === 403) {
        content = data.error || "Token usage limit exceeded for your plan. Please upgrade to continue generating extensions."
      } else if (data.explanation) {
        content = `${data.explanation}`
      } else if (data.error) {
        content = `Error: ${data.error}`
      } else {
        content = "Code generated successfully!"
      }

      const assistantMessage = {
        role: "assistant",
        content,
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Mark that code has been generated
      setHasGeneratedCode(true)

      if (onCodeGenerated) {
        onCodeGenerated(data)
      }

      // Refresh token usage display by triggering a page reload of the token usage component
      // This is a simple way to refresh the token usage without complex state management
      const tokenUsageEvent = new CustomEvent('tokenUsageUpdated')
      window.dispatchEvent(tokenUsageEvent)
    } catch (error) {
      console.error("Error generating code:", error)
      const errorMessage = {
        role: "assistant",
        content: "Sorry, I encountered an error while generating your extension. Please try again.",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsGenerating(false)
      // Notify parent component that generation ended
      if (onGenerationEnd) {
        onGenerationEnd()
      }
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSendMessage(e)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-white/10">
        <h3 className="text-lg font-semibold mb-1 flex items-center">
          <Bot className="h-5 w-5 mr-2 text-purple-400" />
          AI Assistant
        </h3>
        <p className="text-sm text-slate-400">Ask me to modify your extension</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
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
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {isGenerating && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="bg-slate-700/50 border border-slate-600/50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-400 border-t-transparent" />
                <span className="text-sm text-slate-300">Generating code...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <form onSubmit={handleSendMessage} className="space-y-3">
          <Textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe what you want to add or modify..."
            className="min-h-[80px] bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 resize-none"
            disabled={isGenerating}
          />
          <Button
            type="submit"
            disabled={!inputMessage.trim() || isGenerating || !projectId}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50"
          >
            <Send className="h-4 w-4 mr-2" />
            {isGenerating ? "Generating..." : !projectId ? "Setting up project..." : "Send"}
          </Button>
        </form>
      </div>
    </div>
  )
}
