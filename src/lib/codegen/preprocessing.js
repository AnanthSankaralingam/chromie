import { NEW_EXT_PLANNING_PROMPT } from "../prompts/planning"

/**
 * Analyzes Chrome extension feature requests and creates structured implementation plans.
 * This function ONLY handles the planning phase and returns requirements analysis.
 * 
 * @param {Object} params - Function parameters
 * @param {string} params.featureRequest - User's feature request description
 * @returns {Object} Requirements analysis with structured plan
 */
export async function analyzeExtensionRequirements({ featureRequest }) {
  console.log(`Starting requirements analysis for feature: ${featureRequest}`)

  try {
    // Call the planning prompt to analyze the request
    const planningPrompt = NEW_EXT_PLANNING_PROMPT.replace('{USER_REQUEST}', featureRequest)
    
    // Log the final planning prompt for debugging/tracing
    console.log('🧾 Final planning prompt (NEW_EXT_PLANNING_PROMPT with USER_REQUEST):\n', planningPrompt)

    console.log("Calling planning prompt to analyze extension requirements...")
    
    const planningResponse = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.FIREWORKS_API_KEY}`
      },
      body: JSON.stringify({
        model: "accounts/fireworks/models/gpt-oss-20b",
        max_tokens: 2000,
        top_p: 1,
        top_k: 40,
        presence_penalty: 0,
        frequency_penalty: 0,
        temperature: 0.15,
        messages: [
          {
            role: "user",
            content: planningPrompt
          }
        ]
      })
    });

    if (!planningResponse.ok) {
      throw new Error(`Fireworks API error: ${planningResponse.status} ${planningResponse.statusText}`);
    }

    const planningCompletion = await planningResponse.json();
    
    // Preprocess the planning response to handle markdown-formatted JSON
    let planningContent = planningCompletion.choices[0].message.content
    console.log('🔍 Raw planning response:', planningContent.substring(0, 300) + '...')
    console.log('🔍 Raw planning response contains ```json:', planningContent.includes('```json'))
    console.log('🔍 Raw planning response contains ```:', planningContent.includes('```'))
    
    // Remove markdown code blocks if present
    if (planningContent.includes('```json')) {
      console.log('🔄 Detected markdown-formatted JSON in planning response, extracting content...')
      const jsonMatch = planningContent.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        planningContent = jsonMatch[1].trim()
        console.log('✅ Extracted JSON from markdown code block in planning response')
      } else {
        console.log('⚠️ Could not extract JSON from markdown, trying fallback...')
        const fallbackMatch = planningContent.match(/```\s*([\s\S]*?)\s*```/)
        if (fallbackMatch) {
          planningContent = fallbackMatch[1].trim()
          console.log('✅ Extracted content from generic code block in planning response')
        }
      }
    } else if (planningContent.includes('```')) {
      console.log('🔄 Detected generic markdown code block in planning response, extracting content...')
      const fallbackMatch = planningContent.match(/```\s*([\s\S]*?)\s*```/)
      if (fallbackMatch) {
        planningContent = fallbackMatch[1].trim()
        console.log('✅ Extracted content from generic code block in planning response')
      }
    }
    
    console.log('🔍 Processed planning response:', planningContent.substring(0, 200) + '...')
    
    let requirementsAnalysis
    try {
      requirementsAnalysis = JSON.parse(planningContent)
    } catch (parseError) {
      console.error('❌ JSON parsing failed for planning response:', parseError.message)
      console.error('❌ Failed to parse this content:', planningContent.substring(0, 500) + '...')
      throw parseError
    }
    
    // Extract token usage from Fireworks API response
    const tokenUsage = {
      prompt_tokens: planningCompletion.usage?.prompt_tokens || 0,
      completion_tokens: planningCompletion.usage?.completion_tokens || 0,
      total_tokens: planningCompletion.usage?.total_tokens || 0,
      model: "gpt-oss-20b"
    }
    
    console.log("Requirements analysis completed:", {
      frontend_type: requirementsAnalysis.frontend_type,
      docAPIs: requirementsAnalysis.chromeAPIs,
      webPageData: requirementsAnalysis.webPageData,
      ext_name: requirementsAnalysis.ext_name
    })

    return {
      success: true,
      requirements: requirementsAnalysis,
      tokenUsage: tokenUsage
    }

  } catch (error) {
    console.error("Error in requirements analysis:", error)
    throw error
  }
}

/**
 * Streaming version of analyzeExtensionRequirements
 * @param {string} featureRequest - User's feature request description
 * @returns {AsyncGenerator} Stream of planning analysis and final requirements
 */
export async function* analyzeExtensionRequirementsStream({ featureRequest }) {
  console.log(`Starting streaming requirements analysis for feature: ${featureRequest}`)

  try {
    // Call the planning prompt to analyze the request
    const planningPrompt = NEW_EXT_PLANNING_PROMPT.replace('{USER_REQUEST}', featureRequest)
    
    console.log("Calling streaming planning prompt to analyze extension requirements...")
    
    const planningResponse = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.FIREWORKS_API_KEY}`
      },
      body: JSON.stringify({
        model: "accounts/fireworks/models/gpt-oss-20b",
        max_tokens: 2000,
        top_p: 1,
        top_k: 40,
        presence_penalty: 0,
        frequency_penalty: 0,
        temperature: 0.15,
        stream: true,
        messages: [
          {
            role: "user",
            content: planningPrompt
          }
        ]
      })
    });

    if (!planningResponse.ok) {
      throw new Error(`Fireworks API error: ${planningResponse.status} ${planningResponse.statusText}`);
    }

    yield* parseStreamingPlanningResponse(planningResponse)

  } catch (error) {
    console.error("Error in streaming requirements analysis:", error)
    yield { type: "error", content: `Planning analysis error: ${error.message}` }
    throw error
  }
}

/**
 * Helper function to parse streaming planning response
 * @param {Response} planningResponse - Streaming response from Fireworks API
 * @returns {AsyncGenerator} Stream of planning analysis and final requirements
 */
async function* parseStreamingPlanningResponse(planningResponse) {
  console.log("🧠 Starting streaming planning analysis...")
  
  let planningContent = ""
  let tokenUsage = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    model: "gpt-oss-20b"
  }
  
  // Simply collect the streaming response without trying to parse individual chunks
  const reader = planningResponse.body.getReader()
  const decoder = new TextDecoder()
  
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          if (!data) continue
          
          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content || ""
            
            if (content) {
              planningContent += content
            }
            
            // Update token usage if available
            if (parsed.usage) {
              tokenUsage = {
                prompt_tokens: parsed.usage.prompt_tokens || 0,
                completion_tokens: parsed.usage.completion_tokens || 0,
                total_tokens: parsed.usage.total_tokens || 0,
                model: "gpt-oss-20b"
              }
            }
          } catch (parseError) {
            // Ignore individual chunk parsing errors - just collect the content
          }
        }
      }
    }
    
    // Process the complete planning response
    console.log('🔍 Complete planning response:', planningContent.substring(0, 300) + '...')
    console.log('🔍 Planning response contains ```json:', planningContent.includes('```json'))
    
    // Preprocess the planning response to handle markdown-formatted JSON
    let processedContent = planningContent
    
    // Extract JSON from markdown code blocks if present
    if (processedContent.includes('```json')) {
      const jsonMatch = processedContent.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        processedContent = jsonMatch[1].trim()
      }
    } else if (processedContent.includes('```')) {
      const codeMatch = processedContent.match(/```\s*([\s\S]*?)\s*```/)
      if (codeMatch) {
        processedContent = codeMatch[1].trim()
      }
    }
    
    // Parse the JSON - try standard parsing first, then manual extraction
    let requirementsAnalysis
    try {
      requirementsAnalysis = JSON.parse(processedContent)
      console.log('✅ Successfully parsed planning JSON')
    } catch (parseError) {
      console.log('⚠️ Standard JSON parsing failed, extracting fields manually')
      requirementsAnalysis = extractJsonFieldsManually(planningContent)
    }
    
    // Extract and stream the plan field as thinking content
    if (requirementsAnalysis.plan) {
      console.log('🧠 Found plan in requirements analysis, streaming as thinking content')
      // Stream the plan content as thinking (word by word for better UX)
      const words = requirementsAnalysis.plan.split(' ')
      for (let i = 0; i < words.length; i++) {
        const word = words[i] + (i < words.length - 1 ? ' ' : '')
        yield { type: "thinking", content: word }
        // Small delay to simulate natural streaming
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      yield { type: "thinking_complete", content: requirementsAnalysis.plan }
    } else {
      console.log('⚠️ No plan field found in requirements analysis')
      yield { type: "thinking_complete", content: "Planning analysis complete" }
    }
    
    console.log("Requirements analysis completed:", {
      frontend_type: requirementsAnalysis.frontend_type,
      docAPIs: requirementsAnalysis.chromeAPIs,
      webPageData: requirementsAnalysis.webPageData,
      ext_name: requirementsAnalysis.ext_name
    })

    yield {
      type: "analysis_complete",
      requirements: requirementsAnalysis,
      tokenUsage: tokenUsage
    }

  } catch (error) {
    console.error("Error in streaming planning analysis:", error)
    yield { type: "error", content: `Planning analysis error: ${error.message}` }
    throw error
  } finally {
    reader.releaseLock()
  }
}

/**
 * Manually extract JSON fields when parsing fails
 * @param {string} content - Raw content to extract from
 * @returns {Object} Extracted requirements analysis
 */
function extractJsonFieldsManually(content) {
  const analysis = {
    plan: "Extension analysis and planning complete.",
    frontend_type: "generic",
    chromeAPIs: [],
    webPageData: [],
    ext_name: "Chrome Extension",
    enhanced_prompt: content.substring(0, 200) + "..." // Use part of the content as fallback
  }

  
  
  // Simple regex extractions - don't overthink it
  const planMatch = content.match(/"plan"\s*:\s*"([^"]+)"/)
  if (planMatch) analysis.plan = planMatch[1]
  
  const frontendMatch = content.match(/"frontend_type"\s*:\s*"([^"]+)"/)
  if (frontendMatch) analysis.frontend_type = frontendMatch[1]
  
  const nameMatch = content.match(/"ext_name"\s*:\s*"([^"]+)"/)
  if (nameMatch) analysis.ext_name = nameMatch[1]
  
  const promptMatch = content.match(/"enhanced_prompt"\s*:\s*"([^"]+)"/)
  if (promptMatch) analysis.enhanced_prompt = promptMatch[1]
  
  // Extract arrays - keep it simple
  if (content.includes('"storage"')) analysis.chromeAPIs.push('storage')
  if (content.includes('"tabs"')) analysis.chromeAPIs.push('tabs')
  if (content.includes('"bookmarks"')) analysis.chromeAPIs.push('bookmarks')
  
  return analysis
}