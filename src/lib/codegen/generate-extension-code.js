import OpenAI from "openai"
import { createClient } from "../supabase/server"
import { randomUUID } from "crypto"
import { continueResponse, createResponse } from "../services/openai-responses"
import { OPENAI_RESPONSES_DEFAULT_MODEL } from "../constants"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Generates Chrome extension code using the specified coding prompt
 * @param {string} codingPrompt - The coding prompt to use
 * @param {Object} replacements - Object containing placeholder replacements
 * @param {boolean} stream - Whether to stream the response
 * @returns {Promise<Object>} Generated extension code and metadata
 */
export async function generateExtensionCode(codingPrompt, replacements, stream = false, options = {}) {
  const { previousResponseId, conversationTokenTotal = 0, modelOverride, contextWindowMaxTokens } = options
  console.log("Generating extension code using coding prompt...")
  
  // Replace placeholders in the coding prompt
  let finalPrompt = codingPrompt
  for (const [placeholder, value] of Object.entries(replacements)) {
    if (!placeholder.includes('icon')) {
      console.log(`Replacing ${placeholder} with ${value}`)
    }
    finalPrompt = finalPrompt.replace(new RegExp(`{${placeholder}}`, 'g'), value)
  }

  // console.log('🧾 Final coding prompt (non-stream):\n', finalPrompt)

  const modelUsed = modelOverride || "gpt-4o"
  const jsonSchema = {
    name: "extension_implementation",
    schema: {
      type: "object",
      properties: {
        explanation: { type: "string" },
        "manifest.json": { type: "string" },
        "background.js": { type: "string" },
        "content.js": { type: "string" },
        "popup.html": { type: "string" },
        "popup.js": { type: "string" },
        "sidepanel.html": { type: "string" },
        "sidepanel.js": { type: "string" },
        "styles.css": { type: "string" }
      },
      required: [
        "explanation",
        "manifest.json",
        "background.js",
        "content.js",
        "popup.html",
        "popup.js",
        "sidepanel.html",
        "sidepanel.js",
        "styles.css"
      ],
      additionalProperties: false
    }
  }
  

  if (previousResponseId) {
    // Precheck for context window if provided
    if (contextWindowMaxTokens) {
      const estimatedTokensThisRequest = Math.ceil(finalPrompt.length / 4)
      const nextConversationTokenTotal = (conversationTokenTotal || 0) + estimatedTokensThisRequest
      console.log('[generateExtensionCode] context-window precheck', { estimatedTokensThisRequest, nextConversationTokenTotal, contextWindowMaxTokens })
      if (nextConversationTokenTotal > contextWindowMaxTokens) {
        return {
          errorType: 'context_window',
          message: 'Context limit reached. Please start a new conversation.',
          nextConversationTokenTotal
        }
      }
    }
    console.log("[generateExtensionCode] Using Responses API (follow-up)", { modelUsed, hasPrevious: true })
    try {
      const response = await continueResponse({
        model: modelOverride || OPENAI_RESPONSES_DEFAULT_MODEL,
        previous_response_id: previousResponseId,
        input: finalPrompt,
        store: true,
        response_format: jsonSchema,
        temperature: 0.2,
        max_output_tokens: 15000
      })
      const tokensUsedThisRequest = response?.usage?.total_tokens || response?.usage?.total || Math.ceil(finalPrompt.length / 4)
      const nextConversationTokenTotal = (conversationTokenTotal || 0) + (tokensUsedThisRequest || 0)
      console.log("[generateExtensionCode] tokens", { tokensUsedThisRequest, nextConversationTokenTotal, nextResponseId: response?.id })
      // Return a shape compatible with existing callers
      return {
        choices: [
          { message: { content: response?.output_text || "" } }
        ],
        usage: {
          total_tokens: tokensUsedThisRequest
        },
        tokenUsage: {
          total_tokens: tokensUsedThisRequest,
          model: modelUsed
        },
        nextResponseId: response?.id,
        tokensUsedThisRequest,
        nextConversationTokenTotal
      }
    } catch (err) {
      console.error("[generateExtensionCode] Responses API error", err?.message || err)
      // Surface context-window error in a normalized shape
      const { isContextLimitError } = await import('../services/openai-responses')
      if (isContextLimitError(err)) {
        const estimatedTokensThisRequest = Math.ceil(finalPrompt.length / 4)
        const nextConversationTokenTotal = (conversationTokenTotal || 0) + estimatedTokensThisRequest
        return {
          errorType: 'context_window',
          message: 'Context limit reached. Please start a new conversation.',
          nextConversationTokenTotal
        }
      }
      throw err
    }
  }

  console.log('[generateExtensionCode] Using Responses API (fresh)', { modelUsed })
  try {
    const response = await createResponse({
      model: modelUsed,
      input: finalPrompt,
      store: true,
      response_format: jsonSchema,
      temperature: 0.2,
      max_output_tokens: 15000
    })
    const tokensUsedThisRequest = response?.usage?.total_tokens || response?.usage?.total || Math.ceil(finalPrompt.length / 4)
    const nextResponseId = response?.id || null
    console.log('[generateExtensionCode] responses fresh tokens', { tokensUsedThisRequest, nextResponseId })
    return {
      choices: [
        { message: { content: response?.output_text || '' } }
      ],
      usage: {
        total_tokens: tokensUsedThisRequest
      },
      tokenUsage: {
        total_tokens: tokensUsedThisRequest,
        model: modelUsed
      },
      tokensUsedThisRequest,
      nextResponseId
    }
  } catch (err) {
    console.error('[generateExtensionCode] Responses API fresh error', err?.message || err)
    throw err
  }
}

/**
 * Generates Chrome extension code with streaming support (without separate thinking phase)
 * @param {string} codingPrompt - The coding prompt to use
 * @param {Object} replacements - Object containing placeholder replacements
 * @param {boolean} skipThinking - Whether to skip the thinking phase (already done in planning)
 * @returns {AsyncGenerator} Stream of code generation
 */
export async function* generateExtensionCodeStream(codingPrompt, replacements, sessionId, skipThinking = false, options = {}) {
  const { previousResponseId, conversationTokenTotal = 0, modelOverride, contextWindowMaxTokens } = options
  console.log("Generating extension code with streaming...")
  
  // Replace placeholders in the coding prompt
  let finalPrompt = codingPrompt
  for (const [placeholder, value] of Object.entries(replacements)) {
    console.log(`Adding ${placeholder} to the prompt`)
    finalPrompt = finalPrompt.replace(new RegExp(`{${placeholder}}`, 'g'), value)
  }

  // console.log('🧾 Final coding prompt (stream):\n', finalPrompt)

  // Generate extension code with streaming
  yield { type: "generating_code", content: "Starting code generation..." }

  const modelUsed = modelOverride || "gpt-4o"

  // Use Responses API for both new and follow-up requests
  if (previousResponseId) {
    console.log("[generateExtensionCodeStream] Using Responses API (follow-up)", { modelUsed, hasPrevious: true })
    try {
      const response = await continueResponse({
        model: modelOverride || OPENAI_RESPONSES_DEFAULT_MODEL,
        previous_response_id: previousResponseId,
        input: finalPrompt,
        store: true,
        temperature: 0.2,
        max_output_tokens: 15000,
        response_format: {
          name: "extension_implementation",
          schema: {
            type: "object",
            properties: {
              explanation: { type: "string" },
              "manifest.json": { type: "string" },
              "background.js": { type: "string" },
              "content.js": { type: "string" },
              "popup.html": { type: "string" },
              "popup.js": { type: "string" },
              "sidepanel.html": { type: "string" },
              "sidepanel.js": { type: "string" },
              "styles.css": { type: "string" }
            },
            required: ["explanation", "manifest.json", "background.js", "content.js", "popup.html", "popup.js", "sidepanel.html", "sidepanel.js", "styles.css"],
            additionalProperties: false
          }
        }
      })
      
      const tokensUsedThisRequest = response?.usage?.total_tokens || response?.usage?.total || Math.ceil(finalPrompt.length / 4)
      const nextConversationTokenTotal = (conversationTokenTotal || 0) + (tokensUsedThisRequest || 0)
      const nextResponseId = response?.id
      
      console.log("[generateExtensionCodeStream] Responses API tokens", { tokensUsedThisRequest, nextConversationTokenTotal, nextResponseId })
      
      // Send response_id data to frontend
      yield { type: "response_id", id: nextResponseId, tokensUsedThisRequest }
      
      // Process the response and yield completion
      yield { type: "complete", content: response?.output_text || "" }
      
      // Extract and stream the explanation
      let implementationResult
      try {
        let jsonContent = ""
        
        if (response?.output_text?.includes('```json')) {
          const jsonMatch = response.output_text.match(/```json\s*([\s\S]*?)\s*```/)
          if (jsonMatch) {
            jsonContent = jsonMatch[1].trim()
          }
        } else if (response?.output_text?.includes('```')) {
          const codeMatch = response.output_text.match(/```\s*([\s\S]*?)\s*```/)
          if (codeMatch) {
            jsonContent = codeMatch[1].trim()
          }
        } else {
          const jsonStart = response.output_text.indexOf('{')
          if (jsonStart !== -1) {
            let braceCount = 0
            let jsonEnd = jsonStart
            for (let i = jsonStart; i < response.output_text.length; i++) {
              if (response.output_text[i] === '{') braceCount++
              if (response.output_text[i] === '}') braceCount--
              if (braceCount === 0) {
                jsonEnd = i + 1
                break
              }
            }
            jsonContent = response.output_text.substring(jsonStart, jsonEnd)
          }
        }
        
        if (jsonContent) {
          implementationResult = JSON.parse(jsonContent)
          if (implementationResult && implementationResult.explanation) {
            console.log("📝 Extracted explanation from Responses API completion")
            yield { type: "explanation", content: implementationResult.explanation }
            yield { type: "phase", phase: "planning", content: implementationResult.explanation }
          }
        }
      } catch (error) {
        console.error("❌ Error parsing explanation from Responses API completion:", error)
        yield { type: "phase", phase: "planning", content: "Implementation approach completed" }
      }
      
      // Process and save files (same as streaming version)
      if (implementationResult && typeof implementationResult === 'object') {
        console.log("🔄 Processing generated code for file saving...")
        
        const supabase = createClient()
        
        // Get predefined icons
        const iconFiles = [
          { file_path: "icons/icon16.png", content: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" },
          { file_path: "icons/icon48.png", content: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" },
          { file_path: "icons/icon128.png", content: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" }
        ]
        
        // Combine generated files with icons
        const allFiles = { ...implementationResult }
        iconFiles.forEach(icon => {
          allFiles[icon.file_path] = icon.content
        })
        
        // Add fallback HyperAgent script if not provided
        if (!allFiles["hyperagent_test_script.js"]) {
          console.log("📝 No HyperAgent script provided, using fallback")
          allFiles["hyperagent_test_script.js"] = `// Fallback HyperAgent test script for Chrome extension testing
// This is a minimal placeholder script that will be used when no specific
// HyperAgent script is generated by the AI

console.log("Starting HyperAgent test for Chrome Extension")

// Basic test task - click extension icon and verify it loads
const testTask = "Test the Chrome extension by clicking the extension icon and verifying it loads correctly"

console.log("Test task:", testTask)

// This is a placeholder script - the actual HyperAgent execution will be handled
// by the Hyperbrowser service using this basic test task
console.log("✅ HyperAgent test script loaded (fallback version)")

// Export the test task for use by the HyperAgent service
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testTask }
}`
        }
        
        // Remove explanation as it's not a file
        delete allFiles.explanation
        
        console.log(`💾 Saving ${Object.keys(allFiles).length} files to database`)
        
        const savedFiles = []
        const errors = []
        
        for (const [filePath, content] of Object.entries(allFiles)) {
          try {
            // First, try to update existing file
            const { data: existingFile } = await supabase
              .from("code_files")
              .select("id")
              .eq("project_id", sessionId)
              .eq("file_path", filePath)
              .single()
            
            if (existingFile) {
              // Update existing file
              const { error: updateError } = await supabase
                .from("code_files")
                .update({
                  content: content,
                  last_used_at: new Date().toISOString(),
                })
                .eq("id", existingFile.id)
              
              if (updateError) {
                console.error(`Error updating file ${filePath}:`, updateError)
                errors.push({ filePath, error: updateError })
              } else {
                savedFiles.push(filePath)
              }
            } else {
              // Insert new file
              const { error: insertError } = await supabase
                .from("code_files")
                .insert({
                  id: randomUUID(),
                  project_id: sessionId,
                  file_path: filePath,
                  content: content
                })
              
              if (insertError) {
                console.error(`Error inserting file ${filePath}:`, insertError)
                errors.push({ filePath, error: insertError })
              } else {
                savedFiles.push(filePath)
              }
            }
          } catch (fileError) {
            console.error(`Exception handling file ${filePath}:`, fileError)
            errors.push({ filePath, error: fileError })
          }
        }
        
        console.log(`✅ Saved ${savedFiles.length} files successfully`)
        if (errors.length > 0) {
          console.error(`❌ ${errors.length} files had errors:`, errors.map(e => e.filePath))
        }
        
        // Update project's has_generated_code flag
        try {
          const { error: updateError } = await supabase
            .from('projects')
            .update({ 
              has_generated_code: true,
              last_used_at: new Date().toISOString()
            })
            .eq('id', sessionId)
          
          if (updateError) {
            console.error('❌ Error updating project has_generated_code:', updateError)
          } else {
            console.log('✅ Project has_generated_code updated successfully')
          }
        } catch (error) {
          console.error('💥 Exception during project update:', error)
        }
        
        yield { type: "files_saved", content: `Saved ${savedFiles.length} files to project` }
      }
      
      // Emit implementing phase completion summary
      yield { type: "phase", phase: "implementing", content: "Implementation complete: generated extension artifacts and updated the project." }
      return
    } catch (err) {
      console.error("[generateExtensionCodeStream] Responses API error", err?.message || err)
      const { isContextLimitError } = await import('../services/openai-responses')
      if (isContextLimitError(err)) {
        const estimatedTokensThisRequest = Math.ceil(finalPrompt.length / 4)
        const nextConversationTokenTotal = (conversationTokenTotal || 0) + estimatedTokensThisRequest
        yield { type: "context_window", content: "Context limit reached. Please start a new conversation.", total: nextConversationTokenTotal }
        return
      }
      throw err
    }
  } else {
    // New request - use createResponse
    console.log("[generateExtensionCodeStream] Using Responses API (new)", { modelUsed, hasPrevious: false })
    try {
      const response = await createResponse({
        model: modelOverride || OPENAI_RESPONSES_DEFAULT_MODEL,
        input: finalPrompt,
        store: true,
        temperature: 0.2,
        max_output_tokens: 15000,
    response_format: {
        name: "extension_implementation",
        schema: {
          type: "object",
          properties: {
            explanation: { type: "string" },
              "manifest.json": { type: "string" },
            "background.js": { type: "string" },
            "content.js": { type: "string" },
            "popup.html": { type: "string" },
            "popup.js": { type: "string" },
            "sidepanel.html": { type: "string" },
            "sidepanel.js": { type: "string" },
              "styles.css": { type: "string" }
            },
            required: ["explanation", "manifest.json", "background.js", "content.js", "popup.html", "popup.js", "sidepanel.html", "sidepanel.js", "styles.css"],
            additionalProperties: false
          }
        }
      })
      
      const tokensUsedThisRequest = response?.usage?.total_tokens || response?.usage?.total || Math.ceil(finalPrompt.length / 4)
      const nextConversationTokenTotal = (conversationTokenTotal || 0) + (tokensUsedThisRequest || 0)
      const nextResponseId = response?.id
      
      console.log("[generateExtensionCodeStream] Responses API tokens (new)", { tokensUsedThisRequest, nextConversationTokenTotal, nextResponseId })
      
      // Send response_id data to frontend
      yield { type: "response_id", id: nextResponseId, tokensUsedThisRequest }
      
      // Process the response and yield completion
      yield { type: "complete", content: response?.output_text || "" }
      
      // Extract and stream the explanation
  let implementationResult
  try {
    let jsonContent = ""
    
        if (response?.output_text?.includes('```json')) {
          const jsonMatch = response.output_text.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim()
      }
        } else if (response?.output_text?.includes('```')) {
          const codeMatch = response.output_text.match(/```\s*([\s\S]*?)\s*```/)
      if (codeMatch) {
        jsonContent = codeMatch[1].trim()
      }
    } else {
          const jsonStart = response.output_text.indexOf('{')
          if (jsonStart !== -1) {
      let braceCount = 0
      let jsonEnd = jsonStart
            for (let i = jsonStart; i < response.output_text.length; i++) {
              if (response.output_text[i] === '{') braceCount++
              if (response.output_text[i] === '}') braceCount--
        if (braceCount === 0) {
          jsonEnd = i + 1
          break
        }
      }
            jsonContent = response.output_text.substring(jsonStart, jsonEnd)
    }
    }
    
        if (jsonContent) {
    implementationResult = JSON.parse(jsonContent)
    if (implementationResult && implementationResult.explanation) {
            console.log("📝 Extracted explanation from Responses API completion (new)")
      yield { type: "explanation", content: implementationResult.explanation }
      yield { type: "phase", phase: "planning", content: implementationResult.explanation }
          }
    }
  } catch (error) {
        console.error("❌ Error parsing explanation from Responses API completion (new):", error)
    yield { type: "phase", phase: "planning", content: "Implementation approach completed" }
  }
  
      // Process and save files (same as follow-up version)
      if (implementationResult && typeof implementationResult === 'object') {
    console.log("🔄 Processing generated code for file saving...")
    
      const supabase = createClient()
      
      // Get predefined icons
      const iconFiles = [
        { file_path: "icons/icon16.png", content: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" },
        { file_path: "icons/icon48.png", content: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" },
        { file_path: "icons/icon128.png", content: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" }
      ]
      
      // Combine generated files with icons
      const allFiles = { ...implementationResult }
      iconFiles.forEach(icon => {
        allFiles[icon.file_path] = icon.content
      })
      
      // Add fallback HyperAgent script if not provided
      if (!allFiles["hyperagent_test_script.js"]) {
        console.log("📝 No HyperAgent script provided, using fallback")
        allFiles["hyperagent_test_script.js"] = `// Fallback HyperAgent test script for Chrome extension testing
// This is a minimal placeholder script that will be used when no specific
// HyperAgent script is generated by the AI

console.log("Starting HyperAgent test for Chrome Extension")

// Basic test task - click extension icon and verify it loads
const testTask = "Test the Chrome extension by clicking the extension icon and verifying it loads correctly"

console.log("Test task:", testTask)

// This is a placeholder script - the actual HyperAgent execution will be handled
// by the Hyperbrowser service using this basic test task
console.log("✅ HyperAgent test script loaded (fallback version)")

// Export the test task for use by the HyperAgent service
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testTask }
}`
      }
      
      // Remove explanation as it's not a file
      delete allFiles.explanation
      
      console.log(`💾 Saving ${Object.keys(allFiles).length} files to database`)
      
      const savedFiles = []
      const errors = []
      
      for (const [filePath, content] of Object.entries(allFiles)) {
        try {
          // First, try to update existing file
          const { data: existingFile } = await supabase
            .from("code_files")
            .select("id")
            .eq("project_id", sessionId)
            .eq("file_path", filePath)
            .single()
          
          if (existingFile) {
            // Update existing file
            const { error: updateError } = await supabase
              .from("code_files")
              .update({
                content: content,
                last_used_at: new Date().toISOString(),
              })
              .eq("id", existingFile.id)
            
            if (updateError) {
              console.error(`Error updating file ${filePath}:`, updateError)
              errors.push({ filePath, error: updateError })
            } else {
              savedFiles.push(filePath)
            }
          } else {
            // Insert new file
            const { error: insertError } = await supabase
              .from("code_files")
              .insert({
                id: randomUUID(),
                project_id: sessionId,
                file_path: filePath,
                content: content
              })
            
            if (insertError) {
              console.error(`Error inserting file ${filePath}:`, insertError)
              errors.push({ filePath, error: insertError })
            } else {
              savedFiles.push(filePath)
            }
          }
        } catch (fileError) {
          console.error(`Exception handling file ${filePath}:`, fileError)
          errors.push({ filePath, error: fileError })
        }
      }
      
      console.log(`✅ Saved ${savedFiles.length} files successfully`)
      if (errors.length > 0) {
        console.error(`❌ ${errors.length} files had errors:`, errors.map(e => e.filePath))
      }
      
      // Update project's has_generated_code flag
      try {
        const { error: updateError } = await supabase
          .from('projects')
          .update({ 
            has_generated_code: true,
            last_used_at: new Date().toISOString()
          })
          .eq('id', sessionId)
        
        if (updateError) {
          console.error('❌ Error updating project has_generated_code:', updateError)
        } else {
          console.log('✅ Project has_generated_code updated successfully')
        }
      } catch (error) {
        console.error('💥 Exception during project update:', error)
      }
      
      yield { type: "files_saved", content: `Saved ${savedFiles.length} files to project` }
  }
  
  // Emit implementing phase completion summary
  yield { type: "phase", phase: "implementing", content: "Implementation complete: generated extension artifacts and updated the project." }
      return
    } catch (err) {
      console.error("[generateExtensionCodeStream] Responses API error (new)", err?.message || err)
      const { isContextLimitError } = await import('../services/openai-responses')
      if (isContextLimitError(err)) {
        const estimatedTokensThisRequest = Math.ceil(finalPrompt.length / 4)
        const nextConversationTokenTotal = (conversationTokenTotal || 0) + estimatedTokensThisRequest
        yield { type: "context_window", content: "Context limit reached. Please start a new conversation.", total: nextConversationTokenTotal }
        return
      }
      throw err
    }
  }

}
