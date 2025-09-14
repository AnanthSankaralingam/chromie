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
    console.log(`Replacing ${placeholder} with ${value}`)
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
            "stagehand_script": { type: "string" }
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
    console.log(`Replacing ${placeholder} with ${value}`)
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

  // Generate a quick summary using Fireworks API (gpt-oss-20b)
  let thinkingSummary = ""
  try {
    const summaryResponse = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.FIREWORKS_API_KEY}`
      },
      body: JSON.stringify({
        model: "accounts/fireworks/models/gpt-oss-20b",
        max_tokens: 400,
        top_p: 1,
        top_k: 40,
        presence_penalty: 0,
        frequency_penalty: 0,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: "You are a Chrome extension development assistant. Provide a brief, clear summary of the development approach and key decisions in 1-2 sentences. Keep it concise and user-friendly. Always complete your sentences."
          },
          {
            role: "user",
            content: `Summarize this development thinking in 1-2 sentences: ${thinkingContent}`
          }
        ]
      })
    });

    if (summaryResponse.ok) {
      const summaryCompletion = await summaryResponse.json();
      thinkingSummary = summaryCompletion.choices[0]?.message?.content || "Planning complete"
      console.log("🔥 Fireworks summary generated:", thinkingSummary)
    } else {
      console.error("❌ Fireworks API error:", summaryResponse.status, summaryResponse.statusText)
      thinkingSummary = "Planning complete"
    }
  } catch (error) {
    console.error("Error generating thinking summary:", error)
    thinkingSummary = "Planning complete"
  }

  // Stream the summary when thinking is complete
  yield { type: "thinking_complete", content: thinkingSummary }
  // Also emit a planning phase summary for the UI phases view
  yield { type: "phase", phase: "planning", content: thinkingSummary }
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
            "stagehand_script": { type: "string" },
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
  
  // Process and save the generated files
  try {
    console.log("🔄 Processing generated code for file saving...")
    const implementationResult = JSON.parse(codeContent)
    
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
