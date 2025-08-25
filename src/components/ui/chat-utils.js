// Helper function to replace or add messages without duplicates
export const replaceOrAddMessage = (messages, newMessage, shouldReplace = null) => {
  const newMessages = [...messages]
  
  // Auto-replace logic for "generating code..." messages
  if (!shouldReplace && newMessages.length > 0) {
    const lastMessage = newMessages[newMessages.length - 1]
    // Auto-replace generating messages with results
    if (lastMessage.content.includes("Generating code") && !newMessage.content.includes("Generating code")) {
      newMessages[newMessages.length - 1] = newMessage
      return newMessages
    }
    // Auto-replace generating messages with URL requests
    if (lastMessage.content.includes("Generating code") && newMessage.content.includes("I need to analyze")) {
      newMessages[newMessages.length - 1] = newMessage
      return newMessages
    }
  }
  
  // Check for replacement logic
  if (shouldReplace && newMessages.length > 0) {
    const lastMessage = newMessages[newMessages.length - 1]
    if (shouldReplace(lastMessage)) {
      newMessages[newMessages.length - 1] = newMessage
      return newMessages
    }
  }
  
  // Check for duplicates before adding
  const existingMessage = newMessages.find(msg => 
    msg.role === newMessage.role && 
    msg.content === newMessage.content
  )
  
  if (!existingMessage) {
    newMessages.push(newMessage)
  }
  
  return newMessages
}

// Continue generation with URL
export const continueGenerationWithUrl = async (
  promptData, 
  userUrl, 
  originalPrompt, 
  projectId, 
  hasGeneratedCode, 
  onCodeGenerated, 
  onGenerationEnd,
  setMessages,
  setIsGenerating
) => {
  try {
    if (userUrl === null) {
      console.log('No scraping requested - generating extension without website data');
      
      // Add "generating code..." message immediately
      const generatingMessage = {
        role: "assistant",
        content: "🚀 generating code without website analysis...",
      }
      
      setMessages((prev) => {
        const newMessages = [...prev]
        // Replace the last message (which should be the "generating code..." message)
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].content.includes("Generating code")) {
          newMessages[newMessages.length - 1] = generatingMessage
        } else {
          newMessages.push(generatingMessage)
        }
        return newMessages
      })
      
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: originalPrompt,
          projectId,
          requestType: hasGeneratedCode ? "add_to_existing" : "new_extension",
          userProvidedUrl: null, // Explicitly indicate no scraping
          skipScraping: true // New flag to indicate no scraping needed
        }),
      })

      const data = await response.json()
      
      let content = ""
      if (response.status === 403) {
        content = data.error || "token usage limit exceeded for your plan. please upgrade to continue generating extensions."
      } else if (data.explanation) {
        content = `${data.explanation}`
      } else if (data.error) {
        content = `Error: ${data.error}`
      } else {
        content = "code generated successfully!"
      }

      const assistantMessage = {
        role: "assistant",
        content,
      }

      // Replace the "generating code..." message with the actual result
      setMessages((prev) => {
        const newMessages = [...prev]
        // Replace the last message (which should be the "generating code..." message)
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].content.includes("Generating code without website analysis")) {
          newMessages[newMessages.length - 1] = assistantMessage
        } else {
          newMessages.push(assistantMessage)
        }
        return newMessages
      })
      
      // Mark that code has been generated
      if (onCodeGenerated) {
        onCodeGenerated(data)
      }

      // Refresh token usage display
      const tokenUsageEvent = new CustomEvent('tokenUsageUpdated')
      window.dispatchEvent(tokenUsageEvent)
      
      return;
    }
    
    console.log('Continuing generation with URL:', userUrl)
    
    // Add "generating code..." message immediately
    const generatingMessage = {
      role: "assistant",
      content: "🚀 generating code with real website data from " + new URL(userUrl).hostname + "...",
    }
    
    setMessages((prev) => {
      const newMessages = [...prev]
      // Replace the last message (which should be the "generating code..." message)
      if (newMessages.length > 0 && newMessages[newMessages.length - 1].content.includes("Generating code with real website data")) {
        newMessages[newMessages.length - 1] = generatingMessage
      } else {
        newMessages.push(generatingMessage)
      }
      return newMessages
    })
    
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: originalPrompt,
        projectId,
        requestType: hasGeneratedCode ? "add_to_existing" : "new_extension",
        userProvidedUrl: userUrl // Add the user-provided URL
      }),
    })

    const data = await response.json()
    
    let content = ""
    if (response.status === 403) {
      content = data.error || "token usage limit exceeded for your plan. please upgrade to continue generating extensions."
    } else if (data.explanation) {
      content = `${data.explanation}`
    } else if (data.error) {
      content = `Error: ${data.error}`
    } else {
      content = "code generated successfully!"
    }

    const assistantMessage = {
      role: "assistant",
      content,
    }

    // Replace the "generating code..." message with the actual result
    setMessages((prev) => {
      const newMessages = [...prev]
      // Replace the last message (which should be the "generating code..." message)
      if (newMessages.length > 0 && newMessages[newMessages.length - 1].content.includes("Generating code with real website data")) {
        newMessages[newMessages.length - 1] = assistantMessage
      } else {
        newMessages.push(assistantMessage)
      }
      return newMessages
    })
    
    // Mark that code has been generated
    if (onCodeGenerated) {
      onCodeGenerated(data)
    }

    // Refresh token usage display
    const tokenUsageEvent = new CustomEvent('tokenUsageUpdated')
    window.dispatchEvent(tokenUsageEvent)
    
  } catch (error) {
    console.error("Error continuing generation with URL:", error)
    const errorMessage = {
      role: "assistant",
      content: "sorry, i encountered an error while generating your extension with the provided url. please try again.",
    }
    
    // Replace the "generating code..." message with the error message
    setMessages((prev) => {
      const newMessages = [...prev]
      // Replace the last message (which should be the "generating code..." message)
      if (newMessages.length > 0 && newMessages[newMessages.length - 1].content.includes("Generating code")) {
        newMessages[newMessages.length - 1] = errorMessage
      } else {
        newMessages.push(errorMessage)
      }
      return newMessages
    })
  } finally {
    setIsGenerating(false)
    if (onGenerationEnd) {
      onGenerationEnd()
    }
  }
} 