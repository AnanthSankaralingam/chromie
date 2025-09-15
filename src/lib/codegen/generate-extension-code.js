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
 * Generates Chrome extension code with streaming support
 * @param {string} codingPrompt - The coding prompt to use
 * @param {Object} replacements - Object containing placeholder replacements
 * @returns {AsyncGenerator} Stream of thinking and code generation
 */
export async function* generateExtensionCodeStream(codingPrompt, replacements, sessionId) {
  console.log("Generating extension code with streaming...")
  
  // Replace placeholders in the coding prompt
  let finalPrompt = codingPrompt
  for (const [placeholder, value] of Object.entries(replacements)) {
    if (!placeholder.includes('existing_files')) {
      console.log(`Replacing ${placeholder} with ${value}`)
    }
    finalPrompt = finalPrompt.replace(new RegExp(`{${placeholder}}`, 'g'), value)
  }

  // First, generate thinking/explanation using OpenAI and stream it
  const thinkingStream = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { 
        role: "system", 
        content: "You are an expert Chrome extension developer. Think through the user's request step by step, explaining your approach and reasoning. Be concise but thorough in your thinking process." 
      },
      { role: "user", content: `Think through this request: ${finalPrompt}` },
    ],
    stream: true,
    temperature: 0.3,
    max_tokens: 1000,
  })

  let thinkingContent = ""
  for await (const chunk of thinkingStream) {
    const content = chunk.choices[0]?.delta?.content || ""
    if (content) {
      thinkingContent += content
      // Stream the actual thinking content as it comes from OpenAI
      yield { type: "thinking", content: content }
    }
  }

  // Stream thinking complete without summary
  yield { type: "thinking_complete", content: "Thinking complete" }
  yield { type: "generating_code", content: "Now generating the extension code..." }

  const codeStream = await openai.chat.completions.create({
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
            "hyperagent_test_script.js": { type: "string" }
          },
          required: ["explanation"],
        },
      },
    },
    stream: true,
    temperature: 0.2,
    max_tokens: 15000,
  })

  let codeContent = ""
  for await (const chunk of codeStream) {
    const content = chunk.choices[0]?.delta?.content || ""
    if (content) {
      codeContent += content
      yield { type: "code", content: content }
    }
  }

  yield { type: "complete", content: codeContent }
  
  // Extract and stream the explanation from the coding completion
  let implementationResult
  try {
    implementationResult = JSON.parse(codeContent)
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
