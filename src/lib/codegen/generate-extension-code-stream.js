import { createClient } from "../supabase/server"
import { randomUUID } from "crypto"
import { llmService } from "../services/llm-service"
import { selectUnifiedSchema } from "../response-schemas/unified-schemas"
import { DEFAULT_MODEL, CONTEXT_WINDOW_MAX_TOKENS_DEFAULT } from "../constants"
import { formatManifestJson } from "../utils/json-formatter"

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
 * Extracts JSON content from LLM output text
 * Handles three formats: ```json blocks, ``` blocks, and raw JSON
 * @param {string} outputText - The LLM output text
 * @returns {string} Extracted JSON content or empty string
 */
function extractJsonContent(outputText) {
  if (!outputText || typeof outputText !== 'string') return ""

  // Try extracting from ```json code blocks
  if (outputText.includes('```json')) {
    const jsonMatch = outputText.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      return jsonMatch[1].trim()
    }
  }

  // Try extracting from generic ``` code blocks
  if (outputText.includes('```')) {
    const codeMatch = outputText.match(/```\s*([\s\S]*?)\s*```/)
    if (codeMatch) {
      return codeMatch[1].trim()
    }
  }

  // Try extracting raw JSON by finding matching braces
  const jsonStart = outputText.indexOf('{')
  if (jsonStart === -1) return ""

  let braceCount = 0
  let jsonEnd = jsonStart
  let inString = false
  let escapeNext = false

  for (let i = jsonStart; i < outputText.length; i++) {
    const char = outputText[i]

    if (escapeNext) {
      escapeNext = false
      continue
    }

    if (char === '\\') {
      escapeNext = true
      continue
    }

    if (char === '"' && !escapeNext) {
      inString = !inString
      continue
    }

    if (!inString) {
      if (char === '{') braceCount++
      if (char === '}') braceCount--
      if (braceCount === 0) {
        jsonEnd = i + 1
        break
      }
    }
  }

  return outputText.substring(jsonStart, jsonEnd).trim()
}

/**
 * Sanitizes control characters in JSON string values
 * Escapes unescaped control characters that are invalid in JSON
 * Uses a simple state machine to correctly handle escaped characters
 * @param {string} jsonContent - The JSON string to sanitize
 * @returns {string} Sanitized JSON string
 */
function sanitizeJsonControlCharacters(jsonContent) {
  if (!jsonContent) return jsonContent

  let result = ''
  let inString = false
  let escapeNext = false

  for (let i = 0; i < jsonContent.length; i++) {
    const char = jsonContent[i]
    const code = char.charCodeAt(0)

    if (escapeNext) {
      // We're in an escape sequence, just copy it
      result += char
      escapeNext = false
      continue
    }

    if (char === '\\') {
      escapeNext = true
      result += char
      continue
    }

    if (char === '"') {
      inString = !inString
      result += char
      continue
    }

    if (inString) {
      // We're inside a string value, escape control characters
      if (code < 0x20) {
        // Control character - escape it
        if (code === 0x09) {
          result += '\\t'  // tab
        } else if (code === 0x0A) {
          result += '\\n'  // newline
        } else if (code === 0x0D) {
          result += '\\r'  // carriage return
        } else {
          // Escape other control characters as \uXXXX
          result += '\\u' + ('0000' + code.toString(16)).slice(-4)
        }
      } else {
        result += char
      }
    } else {
      // Outside string, copy as-is
      result += char
    }
  }

  return result
}

/**
 * Parses JSON with fallback retry logic
 * Attempts progressive trimming and control character sanitization if initial parse fails
 * @param {string} jsonContent - The JSON string to parse
 * @returns {Object|null} Parsed object or null if parsing fails
 */
function parseJsonWithRetry(jsonContent) {
  if (!jsonContent) return null

  try {
    return JSON.parse(jsonContent)
  } catch (parseError) {
    console.warn("⚠️ Initial JSON parse failed, attempting to extract first valid JSON object:", parseError.message)

    // First, try sanitizing control characters
    try {
      const sanitized = sanitizeJsonControlCharacters(jsonContent)
      const result = JSON.parse(sanitized)
      console.log("✅ Successfully parsed JSON after sanitizing control characters")
      return result
    } catch (sanitizeError) {
      console.warn("⚠️ Sanitization didn't fix the issue, trying progressive trimming")
    }

    // Try to find the end of the first valid JSON object by parsing progressively
    for (let i = jsonContent.length; i > 0; i--) {
      try {
        const substr = jsonContent.substring(0, i).trim()
        if (substr.endsWith('}')) {
          // Try sanitizing the substring as well
          const sanitized = sanitizeJsonControlCharacters(substr)
          const result = JSON.parse(sanitized)
          console.log("✅ Successfully extracted valid JSON by trimming extra content")
          return result
        }
      } catch (e) {
        // Continue trying
      }
    }

    console.error("❌ Could not parse JSON even with retry logic")
    return null
  }
}

/**
 * Processes and yields explanation from implementation result
 * @param {Object} implementationResult - The parsed implementation result
 * @param {string} context - Context string for logging (e.g., "Responses API", "Gemini stream")
 * @returns {Generator} Yields phase event with explanation
 */
async function* yieldExplanation(implementationResult, context) {
  if (implementationResult && implementationResult.explanation) {
    console.log(`📝 Extracted explanation from ${context}`)
    // Yield explanation event for frontend display
    yield { type: "explanation", content: implementationResult.explanation }
  } else {
    console.log(`⚠️ No explanation found in ${context}`)
    yield { type: "explanation", content: "Implementation complete." }
  }
}

/**
 * Saves generated files to the database
 * @param {Object} implementationResult - The parsed implementation result
 * @param {string} sessionId - Session/project identifier
 * @param {Object} replacements - Placeholder replacements (for manifest name)
 * @returns {Object} Object containing savedFiles array and errors array
 */
async function saveFilesToDatabase(implementationResult, sessionId, replacements = {}) {
  if (!implementationResult || typeof implementationResult !== 'object') {
    return { savedFiles: [], errors: [] }
  }

  console.log("🔄 Processing generated code for file saving...")

  const supabase = createClient()

  // Icons are no longer persisted per project; they'll be materialized at packaging time
  console.log('[codegen-stream] Skipping per-project icon persistence; will materialize at packaging')
  const allFiles = { ...implementationResult }

  // Remove explanation as it's not a file
  delete allFiles.explanation

  console.log(`💾 Saving ${Object.keys(allFiles).length} files to database for project ${sessionId}`)
  console.log(`📝 Files to save:`, Object.keys(allFiles).join(', '))

  const savedFiles = []
  const errors = []

  for (const [filePath, rawContent] of Object.entries(allFiles)) {
    // Skip null, undefined, or empty content
    if (rawContent === null || rawContent === undefined) {
      console.log(`  ⚠️ Skipping ${filePath} - content is null/undefined`)
      continue
    }

    // Convert objects to JSON strings (handles manifest.json returned as object)
    let stringContent = rawContent
    if (typeof rawContent === 'object' && rawContent !== null) {
      stringContent = filePath === 'manifest.json'
        ? formatManifestJson(rawContent)
        : JSON.stringify(rawContent, null, 2)
    }

    const content = normalizeGeneratedFileContent(stringContent)

    // Skip if content is still null or empty after normalization
    if (!content || (typeof content === 'string' && content.trim().length === 0)) {
      console.log(`  ⚠️ Skipping ${filePath} - content is empty after normalization`)
      continue
    }

    console.log(`  → Saving ${filePath} (${content.length} chars)`)
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
          console.error(`    ❌ Error updating file ${filePath}:`, updateError)
          errors.push({ filePath, error: updateError })
        } else {
          console.log(`    ✅ Updated ${filePath}`)
          savedFiles.push(filePath)
        }
      } else {
        // Insert new file
        const fileId = randomUUID()
        const { error: insertError } = await supabase
          .from("code_files")
          .insert({
            id: fileId,
            project_id: sessionId,
            file_path: filePath,
            content: content
          })

        if (insertError) {
          console.error(`    ❌ Error inserting file ${filePath}:`, insertError)
          errors.push({ filePath, error: insertError })
        } else {
          console.log(`    ✅ Inserted ${filePath} (id: ${fileId})`)
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

  return { savedFiles, errors }
}

/**
 * Updates project metadata in the database
 * @param {string} sessionId - Session/project identifier
 * @param {Object} allFiles - All generated files (to extract manifest info)
 */
async function updateProjectMetadata(sessionId, allFiles = {}) {
  const supabase = createClient()

  let projectUpdateData = {
    has_generated_code: true,
    last_used_at: new Date().toISOString()
  }

  // Try to extract extension name from manifest.json
  if (allFiles['manifest.json']) {
    try {
      const manifestContent = allFiles['manifest.json']
      // Handle both string and object formats
      const manifest = typeof manifestContent === 'string'
        ? JSON.parse(manifestContent)
        : manifestContent

      if (manifest.name && manifest.name.trim()) {
        projectUpdateData.name = manifest.name.trim()
        console.log(`📝 [stream] Updating project name to: ${manifest.name}`)
      }

      if (manifest.description && manifest.description.trim()) {
        projectUpdateData.description = manifest.description.trim()
        console.log(`📝 [stream] Updating project description to: ${manifest.description}`)
      }
    } catch (parseError) {
      console.warn('Could not parse manifest.json for project update in stream:', parseError.message)
    }
  }

  // Update project with generation info and extension details
  try {
    const { error: updateError } = await supabase
      .from('projects')
      .update(projectUpdateData)
      .eq('id', sessionId)

    if (updateError) {
      console.error('❌ Error updating project:', updateError)
    } else {
      console.log('✅ Project updated successfully with extension info')
    }
  } catch (error) {
    console.error('💥 Exception during project update:', error)
  }
}

/**
 * Processes response metadata and yields response_id event
 * @param {Object} response - LLM response object
 * @param {number} conversationTokenTotal - Running total of conversation tokens
 * @returns {Object} Object containing nextResponseId, tokensUsedThisRequest, nextConversationTokenTotal
 */
function processResponseMetadata(response, conversationTokenTotal = 0) {
  const tokensUsedThisRequest = response?.usage?.total_tokens || response?.usage?.total || 0
  const nextConversationTokenTotal = (conversationTokenTotal || 0) + (tokensUsedThisRequest || 0)
  const nextResponseId = response?.id || null

  return {
    nextResponseId,
    tokensUsedThisRequest,
    nextConversationTokenTotal
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

  for (const [placeholder, value] of Object.entries(replacements)) {
    console.log(`Adding ${placeholder} to the prompt`)
    finalPrompt = finalPrompt.replace(new RegExp(`{${placeholder}}`, 'g'), value)
  }

  console.log('🧾 Raw final coding prompt (stream):\n', finalPrompt)

  // Generate extension code with streaming
  yield { type: "generating_code", content: "Starting code generation..." }

  const modelUsed = modelOverride || "gemini-2.5-flash"
  
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
        max_output_tokens: 32000,  // Increased for more complete code generation
        response_format: jsonSchema,
        session_id: sessionId,
        thinkingConfig: {
          includeThoughts: true  // Enable thinking for better code quality
        }
      })
      
      const { nextResponseId, tokensUsedThisRequest, nextConversationTokenTotal } = processResponseMetadata(response, conversationTokenTotal)

      console.log("[generateExtensionCodeStream] Responses API tokens", { tokensUsedThisRequest, nextConversationTokenTotal, nextResponseId })

      // Send response_id data to frontend
      yield { type: "response_id", id: nextResponseId, tokensUsedThisRequest }

      // Process the response and yield completion
      yield { type: "complete", content: response?.output_text || "" }

      // Extract and stream the explanation
      let implementationResult
      try {
        const outputText = response?.output_text || ''
        const jsonContent = extractJsonContent(outputText)

        if (jsonContent) {
          implementationResult = parseJsonWithRetry(jsonContent)
          if (!implementationResult) {
            throw new Error("Failed to parse JSON")
          }
          yield* yieldExplanation(implementationResult, "Responses API completion")
        }
      } catch (error) {
        console.error("❌ Error parsing explanation from Responses API completion:", error)
        yield { type: "phase", phase: "planning", content: "Implementation approach completed" }
      }
      
      // Process and save files
      if (implementationResult && typeof implementationResult === 'object') {
        const { savedFiles } = await saveFilesToDatabase(implementationResult, sessionId, replacements)

        // Get allFiles for project metadata update
        const allFiles = { ...implementationResult }
        delete allFiles.explanation

        await updateProjectMetadata(sessionId, allFiles)

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
          max_output_tokens: 32000,  // Increased for more complete code generation
          response_format: jsonSchema,  // Add schema constraint for structured output
          session_id: sessionId,
          thinkingConfig: {
            includeThoughts: true   
          }
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

        const { nextResponseId, tokensUsedThisRequest, nextConversationTokenTotal } = processResponseMetadata(response, conversationTokenTotal)

        console.log("[generateExtensionCodeStream] Gemini streaming tokens", { tokensUsedThisRequest, nextConversationTokenTotal, nextResponseId })

        // Send response_id data to frontend
        yield { type: "response_id", id: nextResponseId, tokensUsedThisRequest }

        // Process the response and yield completion
        yield { type: "complete", content: response?.output_text || "" }

        // Extract and stream the explanation
        let implementationResult
        try {
          const outputText = response?.output_text || ''
          const jsonContent = extractJsonContent(outputText)

          if (jsonContent) {
            implementationResult = parseJsonWithRetry(jsonContent)
            if (!implementationResult) {
              throw new Error("Failed to parse JSON")
            }
            yield* yieldExplanation(implementationResult, "Gemini stream (new)")
          }
        } catch (error) {
          console.error("❌ Error parsing explanation from Gemini stream (new):", error)
          yield { type: "phase", phase: "planning", content: "Implementation approach completed" }
        }
        // Process and save files
        if (implementationResult && typeof implementationResult === 'object') {
          const { savedFiles } = await saveFilesToDatabase(implementationResult, sessionId, replacements)

          // Get allFiles for project metadata update
          const allFiles = { ...implementationResult }
          delete allFiles.explanation

          await updateProjectMetadata(sessionId, allFiles)

          yield { type: "files_saved", content: `Saved ${savedFiles.length} files to project` }
        }
        // Emit usage summary (thinking vs completion) if available
        if (exactTokenUsage && (typeof exactTokenUsage.thoughts_tokens === 'number' || typeof exactTokenUsage.completion_tokens === 'number')) {
          const tokenLimit = 32000 // matches max_output_tokens used for this request
          yield {
            type: "usage_summary",
            thinking_tokens: exactTokenUsage.thoughts_tokens || 0,
            completion_tokens: exactTokenUsage.completion_tokens || 0,
            token_limit: tokenLimit
          }
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
        max_output_tokens: 32000,  // Increased for more complete code generation
        response_format: jsonSchema,
        session_id: sessionId,
        thinkingConfig: {
          includeThoughts: true  // Enable thinking for better code quality
        }
      })
      
      const { nextResponseId, tokensUsedThisRequest, nextConversationTokenTotal } = processResponseMetadata(response, conversationTokenTotal)

      console.log("[generateExtensionCodeStream] Responses API tokens (new)", { tokensUsedThisRequest, nextConversationTokenTotal, nextResponseId })

      // Send response_id data to frontend
      yield { type: "response_id", id: nextResponseId, tokensUsedThisRequest }

      // Process the response and yield completion
      yield { type: "complete", content: response?.output_text || "" }

      // Extract and stream the explanation
      let implementationResult
      try {
        const outputText = response?.output_text || ''
        const jsonContent = extractJsonContent(outputText)

        if (jsonContent) {
          implementationResult = parseJsonWithRetry(jsonContent)
          if (!implementationResult) {
            throw new Error("Failed to parse JSON")
          }
          yield* yieldExplanation(implementationResult, "Responses API completion (new)")
        }
      } catch (error) {
        console.error("❌ Error parsing explanation from Responses API completion (new):", error)
        yield { type: "phase", phase: "planning", content: "Implementation approach completed" }
      }
  
      // Process and save files
      if (implementationResult && typeof implementationResult === 'object') {
        const { savedFiles } = await saveFilesToDatabase(implementationResult, sessionId, replacements)

        // Get allFiles for project metadata update
        const allFiles = { ...implementationResult }
        delete allFiles.explanation

        await updateProjectMetadata(sessionId, allFiles)

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
