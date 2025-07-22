"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Bot, User, Trash2 } from "lucide-react"
import { conversationService } from "@/lib/supabase"

export default function AIChat({ projectId, onCodeGenerated }) {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const messagesEndRef = useRef(null)

  // Load conversation history when project changes
  useEffect(() => {
    if (projectId) {
      loadConversationHistory()
    }
  }, [projectId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const loadConversationHistory = async () => {
    if (!projectId) return

    setIsLoadingHistory(true)
    try {
      const { data, error } = await conversationService.getProjectConversations(projectId)

      if (error) {
        console.error("Error loading conversation history:", error)
      } else {
        setMessages(data || [])
      }
    } catch (error) {
      console.error("Error loading conversation history:", error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !projectId) return

    const userMessage = {
      role: "user",
      content: inputMessage.trim(),
      created_at: new Date().toISOString(),
    }

    // Add user message to UI immediately
    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)

    try {
      // Save user message to database
      await conversationService.addMessage(projectId, "user", userMessage.content)

      // TODO: Integrate with OpenAI API
      // For now, simulate AI response
      setTimeout(async () => {
        const aiResponse = {
          role: "assistant",
          content:
            "I understand you want to modify your Chrome extension. Let me help you generate the code. What specific functionality would you like to add or change?",
          created_at: new Date().toISOString(),
        }

        // Add AI response to UI
        setMessages((prev) => [...prev, aiResponse])

        // Save AI response to database
        await conversationService.addMessage(projectId, "assistant", aiResponse.content)

        // Trigger code generation if needed
        if (onCodeGenerated) {
          onCodeGenerated(aiResponse.content)
        }

        setIsLoading(false)
      }, 1500)
    } catch (error) {
      console.error("Error sending message:", error)
      setIsLoading(false)
    }
  }

  const handleClearHistory = async () => {
    if (!projectId) return

    try {
      await conversationService.clearProjectConversations(projectId)
      setMessages([])
    } catch (error) {
      console.error("Error clearing conversation history:", error)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (isLoadingHistory) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/20 flex items-center justify-between">
        <h3 className="text-lg font-semibold">AI Assistant</h3>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearHistory} className="text-slate-400 hover:text-white">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-purple-200 text-sm">
            Start a conversation to get help with your Chrome extension development
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`flex items-start space-x-2 max-w-[80%] ${message.role === "user" ? "flex-row-reverse space-x-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === "user" ? "bg-white/20" : "bg-purple-500"
                  }`}
                >
                  {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div
                  className={`p-3 rounded-lg ${
                    message.role === "user" ? "bg-white/10 text-white" : "bg-purple-500/20 text-purple-100"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-60 mt-1">{new Date(message.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2">
              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-purple-500/20 text-purple-100 p-3 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-purple-300 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-purple-300 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/20">
        <div className="mb-4">
          <Textarea
            placeholder="Describe what you want to build or ask for help..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="bg-white/10 border-white/20 text-white placeholder:text-purple-200 resize-none"
            rows={3}
          />
        </div>
        <Button
          onClick={handleSendMessage}
          disabled={isLoading || !inputMessage.trim()}
          className="w-full bg-white/20 hover:bg-white/30 text-white"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          {isLoading ? "Generating..." : "Send"}
        </Button>
        <p className="text-xs text-purple-200 mt-2">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  )
}
