import { createClient } from "../supabase/server"
import { randomUUID } from "crypto"
import { llmService } from "../services/llm-service"
import { selectUnifiedSchema } from "../response-schemas/unified-schemas"
import { DEFAULT_MODEL } from "../constants"

function normalizeGeneratedFileContent(str) {
  try {
    if (typeof str !== "string") return str
    let out = str.replace(/\r\n/g, "\n")
    out = out.replace(/[ \t]+$/gm, "")
    out = out.replace(/\n{3,}/g, "\n\n")
    out = out.trim()
    return out
  } catch (_) {
    return str
  }
}

/**
 * Generates Chrome extension code with streaming support (without separate thinking phase)
 * @param {string} codingPrompt - The coding prompt to use
 * @param {Object} replacements - Object containing placeholder replacements
 * @param {string} sessionId - Session/project identifier
 * @param {boolean} skipThinking - Whether to skip the thinking phase (already done in planning)
 * @param {Object} options - Additional options including frontendType and requestType
 * @returns {AsyncGenerator} Stream of code generation
 */
export async function* generateExtensionCodeStream(codingPrompt, replacements, sessionId, skipThinking = false, options = {}) {
  const { previousResponseId, conversationTokenTotal = 0, modelOverride, contextWindowMaxTokens, frontendType, requestType } = options
  console.log("Generating extension code with streaming...")
  
  // Replace placeholders in the coding prompt
  let finalPrompt = codingPrompt
  
  // Handle webpage_data section conditionally - remove entire section if no data
  if (replacements.scraped_webpage_analysis === '<!-- No specific websites targeted -->' || 
      replacements.scraped_webpage_analysis === '<!-- Website analysis skipped by user -->') {
    // Remove the entire webpage_data section
    finalPrompt = finalPrompt.replace(/<webpage_data>[\s\S]*?<\/webpage_data>/g, '')
    console.log('Removed webpage_data section - no specific websites targeted')
  }
  
  for (const [placeholder, value] of Object.entries(replacements)) {
    console.log(`Adding ${placeholder} to the prompt`)
    finalPrompt = finalPrompt.replace(new RegExp(`{${placeholder}}`, 'g'), value)
  }

  // console.log('🧾 Final coding prompt (stream):\n', finalPrompt)

  // Generate extension code with streaming
  yield { type: "generating_code", content: "Starting code generation..." }

  const modelUsed = modelOverride || "gemini-2.5-flash-lite"
  
  // Determine provider from model name
  const getProviderFromModel = (model) => {
    if (typeof model === 'string') {
      if (model.toLowerCase().includes('gemini')) return 'gemini'
      if (model.toLowerCase().includes('claude')) return 'anthropic'
      if (model.toLowerCase().includes('gpt')) return 'openai'
    }
    return 'gemini' // default fallback
  }
  
  // Get the provider from the model
  const provider = getProviderFromModel(modelUsed)
  
  // Select the appropriate schema using unified schema system
  const jsonSchema = selectUnifiedSchema(provider, frontendType || 'generic', requestType || 'NEW_EXTENSION')
  console.log(`Using ${provider} provider with schema for frontend type: ${frontendType || 'generic'}, request type: ${requestType || 'NEW_EXTENSION'}`)

  // Use Responses API for both new and follow-up requests
  if (previousResponseId) {
    try {
      const response = await llmService.continueResponse({
        provider,
        model: modelOverride || DEFAULT_MODEL,
        previous_response_id: previousResponseId,
        input: finalPrompt,
        store: true,
        temperature: 0.2,
        max_output_tokens: 15000,
        response_format: jsonSchema,
        session_id: sessionId
      })
      
      const tokensUsedThisRequest = response?.usage?.total_tokens || response?.usage?.total || 0
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
        const outputText = response?.output_text || ''
        
        if (typeof outputText === 'string' && outputText.includes('```json')) {
          const jsonMatch = outputText.match(/```json\s*([\s\S]*?)\s*```/)
          if (jsonMatch) {
            jsonContent = jsonMatch[1].trim()
          }
        } else if (typeof outputText === 'string' && outputText.includes('```')) {
          const codeMatch = outputText.match(/```\s*([\s\S]*?)\s*```/)
          if (codeMatch) {
            jsonContent = codeMatch[1].trim()
          }
        } else {
          const jsonStart = outputText.indexOf('{')
          if (jsonStart !== -1) {
            let braceCount = 0
            let jsonEnd = jsonStart
            for (let i = jsonStart; i < outputText.length; i++) {
              if (outputText[i] === '{') braceCount++
              if (outputText[i] === '}') braceCount--
              if (braceCount === 0) {
                jsonEnd = i + 1
                break
              }
            }
            jsonContent = outputText.substring(jsonStart, jsonEnd)
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
        
        // Icons are no longer persisted per project; they'll be materialized at packaging time
        console.log('[codegen-stream] Skipping per-project icon persistence; will materialize at packaging')
        const allFiles = { ...implementationResult }
        
        // Add fallback HyperAgent script if not provided
        
        // Remove explanation as it's not a file
        delete allFiles.explanation
        
        console.log(`💾 Saving ${Object.keys(allFiles).length} files to database`)
        
        const savedFiles = []
        const errors = []
        
        for (const [filePath, rawContent] of Object.entries(allFiles)) {
          const content = normalizeGeneratedFileContent(rawContent)
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
      console.error("[generateExtensionCodeStream] LLM Service error", err?.message || err)
      // Check for context limit error using the adapter's method
      const adapter = llmService.providerRegistry.getAdapter(provider)
      if (adapter && adapter.isContextLimitError && adapter.isContextLimitError(err)) {
        const estimatedTokensThisRequest = 0 // No estimation - use exact values from response
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
      // Stream thoughts and answer chunks with Gemini when available
      if (provider === 'gemini') {
        // Forward thinking vs answer chunks to frontend
        let combinedText = ''
        let exactTokenUsage = null
        
        for await (const s of llmService.streamResponse({
          provider,
          model: modelOverride || DEFAULT_MODEL,
          input: finalPrompt,
          temperature: 0.2,
          max_output_tokens: 15000,
          session_id: sessionId
        })) {
          if (s?.type === 'thinking_chunk') {
            yield { type: 'thinking_chunk', content: s.content }
          } else if (s?.type === 'answer_chunk' || s?.type === 'content') {
            combinedText += s.content
          } else if (s?.type === 'token_usage') {
            // Capture exact token usage from Gemini streaming response
            exactTokenUsage = s.usage
            console.log('[generateExtensionCodeStream] Captured exact token usage from Gemini stream:', exactTokenUsage)
          }
        }
        
        // After stream completes, continue with normal parsing using combinedText
        const response = {
          output_text: combinedText,
          usage: exactTokenUsage || { total_tokens: 0, total: 0 }
        }
        
        // Calculate exact token usage for this request
        const tokensUsedThisRequest = response?.usage?.total_tokens || response?.usage?.total || 0
        const nextConversationTokenTotal = (conversationTokenTotal || 0) + (tokensUsedThisRequest || 0)
        const nextResponseId = response?.id || null
        
        console.log("[generateExtensionCodeStream] Gemini streaming tokens", { tokensUsedThisRequest, nextConversationTokenTotal, nextResponseId })
        
        // Send response_id data to frontend
        yield { type: "response_id", id: nextResponseId, tokensUsedThisRequest }
        
        // Process the response and yield completion
        yield { type: "complete", content: response?.output_text || "" }
        
        // fall through to existing parsing below using this response
        
        // Extract and stream the explanation
        let implementationResult
        try {
          let jsonContent = ""
          const outputText = response?.output_text || ''
          if (typeof outputText === 'string' && outputText.includes('```json')) {
            const jsonMatch = outputText.match(/```json\s*([\s\S]*?)\s*```/)
            if (jsonMatch) {
              jsonContent = jsonMatch[1].trim()
            }
          } else if (typeof outputText === 'string' && outputText.includes('```')) {
            const codeMatch = outputText.match(/```\s*([\s\S]*?)\s*```/)
            if (codeMatch) {
              jsonContent = codeMatch[1].trim()
            }
          } else {
            const jsonStart = outputText.indexOf('{')
            if (jsonStart !== -1) {
              let braceCount = 0
              let jsonEnd = jsonStart
              for (let i = jsonStart; i < outputText.length; i++) {
                if (outputText[i] === '{') braceCount++
                if (outputText[i] === '}') braceCount--
                if (braceCount === 0) {
                  jsonEnd = i + 1
                  break
                }
              }
              jsonContent = outputText.substring(jsonStart, jsonEnd)
            }
          }
          if (jsonContent) {
            implementationResult = JSON.parse(jsonContent)
            if (implementationResult && implementationResult.explanation) {
              console.log("📝 Extracted explanation from Gemini stream (new)")
              yield { type: "explanation", content: implementationResult.explanation }
              yield { type: "phase", phase: "planning", content: implementationResult.explanation }
            }
          }
        } catch (error) {
          console.error("❌ Error parsing explanation from Gemini stream (new):", error)
          yield { type: "phase", phase: "planning", content: "Implementation approach completed" }
        }
        // Process and save files (reuse existing logic)
        if (implementationResult && typeof implementationResult === 'object') {
          console.log("🔄 Processing generated code for file saving...")
          const supabase = (await import('../supabase/server')).createClient()
          console.log('[codegen-stream] Skipping per-project icon persistence; will materialize at packaging')
          const allFiles = { ...implementationResult }
          delete allFiles.explanation
          console.log(`💾 Saving ${Object.keys(allFiles).length} files to database`)
          const savedFiles = []
          const errors = []
          for (const [filePath, rawContent] of Object.entries(allFiles)) {
            const content = normalizeGeneratedFileContent(rawContent)
            try {
              const { data: existingFile } = await supabase
                .from("code_files")
                .select("id")
                .eq("project_id", sessionId)
                .eq("file_path", filePath)
                .single()
              if (existingFile) {
                const { error: updateError } = await supabase
                  .from("code_files")
                  .update({ content, last_used_at: new Date().toISOString() })
                  .eq("id", existingFile.id)
                if (updateError) { errors.push({ filePath, error: updateError }) } else { savedFiles.push(filePath) }
              } else {
                const { error: insertError } = await supabase
                  .from("code_files")
                  .insert({ id: (await import('crypto')).randomUUID(), project_id: sessionId, file_path: filePath, content })
                if (insertError) { errors.push({ filePath, error: insertError }) } else { savedFiles.push(filePath) }
              }
            } catch (fileError) {
              errors.push({ filePath, error: fileError })
            }
          }
          console.log(`✅ Saved ${savedFiles.length} files successfully`)
          if (errors.length > 0) {
            console.error(`❌ ${errors.length} files had errors:`, errors.map(e => e.filePath))
          }
          try {
            const supabase = (await import('../supabase/server')).createClient()
            const { error: updateError } = await supabase
              .from('projects')
              .update({ has_generated_code: true, last_used_at: new Date().toISOString() })
              .eq('id', sessionId)
            if (updateError) { console.error('❌ Error updating project has_generated_code:', updateError) }
          } catch (err) {
            console.error('💥 Exception during project update:', err)
          }
          yield { type: "files_saved", content: `Saved ${savedFiles.length} files to project` }
        }
        yield { type: "phase", phase: "implementing", content: "Implementation complete: generated extension artifacts and updated the project." }
        return
      }

      const response = await llmService.createResponse({
        provider,
        model: modelOverride || DEFAULT_MODEL,
        input: finalPrompt,
        store: true,
        temperature: 0.2,
        max_output_tokens: 15000,
        response_format: jsonSchema,
        session_id: sessionId
      })
      
      const tokensUsedThisRequest = response?.usage?.total_tokens || response?.usage?.total || 0
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
    
        const outputText = response?.output_text || ''
        
        if (typeof outputText === 'string' && outputText.includes('```json')) {
          const jsonMatch = outputText.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim()
      }
        } else if (typeof outputText === 'string' && outputText.includes('```')) {
          const codeMatch = outputText.match(/```\s*([\s\S]*?)\s*```/)
      if (codeMatch) {
        jsonContent = codeMatch[1].trim()
      }
    } else {
          const jsonStart = outputText.indexOf('{')
          if (jsonStart !== -1) {
      let braceCount = 0
      let jsonEnd = jsonStart
            for (let i = jsonStart; i < outputText.length; i++) {
              if (outputText[i] === '{') braceCount++
              if (outputText[i] === '}') braceCount--
        if (braceCount === 0) {
          jsonEnd = i + 1
          break
        }
      }
            jsonContent = outputText.substring(jsonStart, jsonEnd)
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
      
      // Icons are no longer persisted per project; they'll be materialized at packaging time
      console.log('[codegen-stream] Skipping per-project icon persistence; will materialize at packaging')
      const allFiles = { ...implementationResult }
      
      // Remove explanation as it's not a file
      delete allFiles.explanation
      
      console.log(`💾 Saving ${Object.keys(allFiles).length} files to database`)
      
      const savedFiles = []
      const errors = []
      
      for (const [filePath, rawContent] of Object.entries(allFiles)) {
        const content = normalizeGeneratedFileContent(rawContent)
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
      console.error("[generateExtensionCodeStream] LLM Service error (new)", err?.message || err)
      // Check for context limit error using the adapter's method
      const adapter = llmService.providerRegistry.getAdapter(provider)
      if (adapter && adapter.isContextLimitError && adapter.isContextLimitError(err)) {
        const estimatedTokensThisRequest = 0 // No estimation - use exact values from response
        const nextConversationTokenTotal = (conversationTokenTotal || 0) + estimatedTokensThisRequest
        yield { type: "context_window", content: "Context limit reached. Please start a new conversation.", total: nextConversationTokenTotal }
        return
      }
      throw err
    }
  }

}
