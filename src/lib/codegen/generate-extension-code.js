import OpenAI from "openai"
import { createClient } from "../supabase/server"
import { randomUUID } from "crypto"

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
export async function generateExtensionCode(codingPrompt, replacements, stream = false) {
  console.log("Generating extension code using coding prompt...")
  
  // Replace placeholders in the coding prompt
  let finalPrompt = codingPrompt
  for (const [placeholder, value] of Object.entries(replacements)) {
    if (!placeholder.includes('icon')) {
      console.log(`Replacing ${placeholder} with ${value}`)
    }
    finalPrompt = finalPrompt.replace(new RegExp(`{${placeholder}}`, 'g'), value)
  }

  // Log the final coding prompt (non-stream)
  console.log('🧾 Final coding prompt (non-stream):\n', finalPrompt)

  const requestConfig = {
    model: "gpt-4o",
    messages: [
      { role: "user", content: finalPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "extension_implementation",
        schema: {
          type: "object",
          properties: {
            explanation: { type: "string" },
            "manifest.json": {
              oneOf: [{ type: "string" }, { type: "object" }],
            },
            "background.js": { type: "string" },
            "content.js": { type: "string" },
            "popup.html": { type: "string" },
            "popup.js": { type: "string" },
            "sidepanel.html": { type: "string" },
            "sidepanel.js": { type: "string" },
            "styles.css": { type: "string" },
          },
          required: ["explanation"],
        },
      },
    },
    temperature: 0.2,
    max_tokens: 15000,
  }

  if (stream) {
    requestConfig.stream = true
  }

  const codingCompletion = await openai.chat.completions.create(requestConfig)

  return codingCompletion
}

/**
 * Generates Chrome extension code with streaming support (without separate thinking phase)
 * @param {string} codingPrompt - The coding prompt to use
 * @param {Object} replacements - Object containing placeholder replacements
 * @param {boolean} skipThinking - Whether to skip the thinking phase (already done in planning)
 * @returns {AsyncGenerator} Stream of code generation
 */
export async function* generateExtensionCodeStream(codingPrompt, replacements, sessionId, skipThinking = false) {
  console.log("Generating extension code with streaming...")
  
  // Replace placeholders in the coding prompt
  let finalPrompt = codingPrompt
  for (const [placeholder, value] of Object.entries(replacements)) {
    console.log(`Adding ${placeholder} to the prompt`)
    finalPrompt = finalPrompt.replace(new RegExp(`{${placeholder}}`, 'g'), value)
  }

<<<<<<< Updated upstream
  // Log the final coding prompt (stream)
  console.log('🧾 Final coding prompt (stream):\n', finalPrompt)

  // Generate extension code with streaming - first get thinking, then structured code
  yield { type: "generating_code", content: "Starting code generation..." }

  // Step 1: Get the thinking process with streaming
  console.log("🧠 Starting thinking phase...")
  // Log the thinking prompt messages for traceability
  const thinkingSystem = "You are an expert Chrome extension developer. Think through the user's request step by step, explaining your approach and reasoning in detail. Limit your analysis to 2-3 sentences, covering the most important details. Do NOT generate any code yet, just think through the problem."
  const thinkingUser = `${finalPrompt}\n\nPlease think through this request step by step. Limit your analysis to 2-3 sentences, covering the most important details. Do not generate any code yet - just provide your detailed thinking process.`
  console.log('🧠 Thinking prompt (system):\n', thinkingSystem)
  console.log('🧠 Thinking prompt (user):\n', thinkingUser)
  const thinkingStream = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { 
        role: "system", 
        content: "You are an expert Chrome extension developer. Think through the user's request step by step, explaining your approach and reasoning in detail. Limit your analysis to 2 sentences, covering the most important details. Do NOT generate any code yet, just think through the problem." 
      },
      { role: "user", content: `Please think through this request step by step. Limit your analysis to 2 sentences, covering the most important details. Do not generate any code yet - just provide your detailed thinking process.` },
    ],
    stream: true,
    temperature: 0.3,
    max_tokens: 3000,
  })
=======
  // Generate extension code with streaming
  yield { type: "generating_code", content: "Starting code generation..." }

  // Skip thinking phase if already done (e.g., from planning stream)
  if (!skipThinking) {
    // Step 1: Get the thinking process with streaming
    console.log("🧠 Starting thinking phase...")
    const thinkingStream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are an expert Chrome extension developer. Think through the user's request step by step, explaining your approach and reasoning in detail. Limit your analysis to 2 sentences, covering the most important details. Do NOT generate any code yet, just think through the problem." 
        },
        { role: "user", content: `Please think through this request step by step. Limit your analysis to 2 sentences, covering the most important details. Do not generate any code yet - just provide your detailed thinking process.` },
      ],
      stream: true,
      temperature: 0.3,
      max_tokens: 3000,
    })
>>>>>>> Stashed changes

    let thinkingContent = ""
    
    for await (const chunk of thinkingStream) {
      const content = chunk.choices[0]?.delta?.content || ""
      if (content) {
        thinkingContent += content
        // Stream thinking content in real-time
        yield { type: "thinking", content: content }
      }
    }

    yield { type: "thinking_complete", content: thinkingContent }
  }

  // Generate the structured code
  console.log("💻 Starting code generation phase...")
  // Log the coding phase message role and prompt
  console.log('💻 Coding prompt role: system')
  console.log('💻 Coding prompt content (stream):\n', finalPrompt)
  const codeStream = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { 
        role: "system", 
        content: finalPrompt 
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "extension_implementation",
        schema: {
          type: "object",
          properties: {
            explanation: { type: "string" },
            "manifest.json": {
              oneOf: [{ type: "string" }, { type: "object" }],
            },
            "background.js": { type: "string" },
            "content.js": { type: "string" },
            "popup.html": { type: "string" },
            "popup.js": { type: "string" },
            "sidepanel.html": { type: "string" },
            "sidepanel.js": { type: "string" },
            "styles.css": { type: "string" },
          },
          required: ["explanation"],
        },
      },
    },
    temperature: 0.2,
    max_completion_tokens: 15000,
  })

  let fullContent = codeStream.choices[0].message.content
  yield { type: "complete", content: fullContent }
  
  // Extract and stream the explanation from the coding completion
  let implementationResult
  try {
    // Find the JSON section in the full content
    let jsonContent = ""
    
    // Look for JSON block markers first
    if (fullContent.includes('```json')) {
      const jsonMatch = fullContent.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim()
      }
    } else if (fullContent.includes('```')) {
      // Try generic code block
      const codeMatch = fullContent.match(/```\s*([\s\S]*?)\s*```/)
      if (codeMatch) {
        jsonContent = codeMatch[1].trim()
      }
    } else {
      // Find the largest JSON object in the content
      const jsonStart = fullContent.indexOf('{')
      if (jsonStart === -1) {
        throw new Error("No JSON found in response")
      }
      
      // Find the matching closing brace
      let braceCount = 0
      let jsonEnd = jsonStart
      for (let i = jsonStart; i < fullContent.length; i++) {
        if (fullContent[i] === '{') braceCount++
        if (fullContent[i] === '}') braceCount--
        if (braceCount === 0) {
          jsonEnd = i + 1
          break
        }
      }
      
      jsonContent = fullContent.substring(jsonStart, jsonEnd)
    }
    
    if (!jsonContent) {
      throw new Error("No JSON content extracted")
    }
    
    implementationResult = JSON.parse(jsonContent)
    if (implementationResult && implementationResult.explanation) {
      console.log("📝 Extracted explanation from coding completion")
      yield { type: "explanation", content: implementationResult.explanation }
      // Also emit as planning phase summary for the UI phases view
      yield { type: "phase", phase: "planning", content: implementationResult.explanation }
    }
  } catch (error) {
    console.error("❌ Error parsing explanation from coding completion:", error)
    yield { type: "phase", phase: "planning", content: "Implementation approach completed" }
  }
  
  // Process and save the generated files
  try {
    console.log("🔄 Processing generated code for file saving...")
    
    if (implementationResult && typeof implementationResult === 'object') {
      // Save files to database
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
  } catch (error) {
    console.error("❌ Error processing generated code:", error)
    yield { type: "save_error", content: `Error saving files: ${error.message}` }
  }
  
  // Emit implementing phase completion summary
  yield { type: "phase", phase: "implementing", content: "Implementation complete: generated extension artifacts and updated the project." }
}
