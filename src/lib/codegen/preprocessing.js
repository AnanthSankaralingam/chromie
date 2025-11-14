// DEPRECATED: This file uses old Fireworks API planning.
// Use planning-orchestrator.js instead for the new multi-prompt planning architecture.
// This file is kept for reference and potential rollback purposes only.

import { NEW_EXT_PLANNING_PROMPT } from "../prompts/old-prompts/planning"

/**
 * Streaming version of analyzeExtensionRequirements
 * @deprecated Use orchestratePlanning from planning-orchestrator.js instead
 * @param {string} featureRequest - User's feature request description
 * @returns {AsyncGenerator} Stream of planning analysis and final requirements
 */
export async function* analyzeExtensionRequirementsStream({ featureRequest }) {
  console.log(`Starting streaming requirements analysis for feature: ${featureRequest}`)

  try {
    // Step 1: Initial analysis phase
    yield { type: "planning_progress", phase: "analysis", content: "Analyzing your request and understanding requirements..." }
    yield { type: "planning_progress", phase: "analysis", content: "Identifying the best frontend approach for your extension..." }
    
    // Call the planning prompt to analyze the request
    const planningPrompt = NEW_EXT_PLANNING_PROMPT.replace('{USER_REQUEST}', featureRequest)
    
    yield { type: "planning_progress", phase: "analysis", content: "Preparing detailed implementation plan..." }
    
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

    yield* parseStreamingPlanningResponse(planningResponse, featureRequest)

  } catch (error) {
    console.error("Error in streaming requirements analysis:", error)
    yield { type: "error", content: `Planning analysis error: ${error.message}` }
    throw error
  }
}

/**
 * Helper function to parse streaming planning response
 * @param {Response} planningResponse - Streaming response from Fireworks API
 * @param {string} featureRequest - Original user feature request
 * @returns {AsyncGenerator} Stream of planning analysis and final requirements
 */
async function* parseStreamingPlanningResponse(planningResponse, featureRequest) {
  console.log("🧠 Starting streaming planning analysis...")
  
  let planningContent = ""
  let tokenUsage = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    model: "gpt-oss-20b"
  }
  
  // Yield progress updates during streaming
  yield { type: "planning_progress", phase: "analysis", content: "Processing requirements with AI planning model..." }
  
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
              
              // Yield progress updates based on content length
              if (planningContent.length > 100 && planningContent.length < 200) {
                yield { type: "planning_progress", phase: "analysis", content: "Analyzing extension architecture and dependencies..." }
              } else if (planningContent.length > 300 && planningContent.length < 500) {
                yield { type: "planning_progress", phase: "analysis", content: "Determining required Chrome APIs and permissions..." }
              } else if (planningContent.length > 600 && planningContent.length < 800) {
                yield { type: "planning_progress", phase: "analysis", content: "Evaluating frontend approach and user interface needs..." }
              }
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
    console.log('🔍 Complete planning response:', planningContent)
    console.log('🔍 Planning response contains ```json:', planningContent.includes('```json'))
    
    yield { type: "planning_progress", phase: "analysis", content: "Finalizing analysis and extracting implementation details..." }
    
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
    
    // Try to fix common JSON formatting issues
    if (processedContent.includes('plan":"') && !processedContent.includes('"plan":"')) {
      console.log('🔄 Detected malformed JSON in stream, attempting to fix...')
      // Fix missing quotes around keys
      processedContent = processedContent.replace(/(\w+):/g, '"$1":')
      // Fix missing quotes around string values that don't already have them
      processedContent = processedContent.replace(/:\s*([^",{\[\s][^",}\]\s]*?)([,}\]])/g, ': "$1"$2')
      console.log('🔧 Applied JSON formatting fixes to stream')
    }
    
    yield { type: "planning_progress", phase: "analysis", content: "Parsing requirements and preparing for code generation..." }
    
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
    
    // Apply fallback website detection to catch any missed websites
    const originalWebPageData = requirementsAnalysis.webPageData || []
    requirementsAnalysis.webPageData = detectWebsitesInPrompt(featureRequest, originalWebPageData)
    
    if (requirementsAnalysis.webPageData.length > originalWebPageData.length) {
      console.log(`✅ Fallback detection added ${requirementsAnalysis.webPageData.length - originalWebPageData.length} website(s)`)
    }
    
    // Extract suggested APIs for logging and processing
    const originalSuggestedAPIs = requirementsAnalysis.suggestedAPIs || []
    console.log('🔌 Suggested APIs:', originalSuggestedAPIs)
    
    console.log("Requirements analysis completed:", {
      frontend_type: requirementsAnalysis.frontend_type,
      docAPIs: requirementsAnalysis.chromeAPIs,
      webPageData: requirementsAnalysis.webPageData,
      suggestedAPIs: requirementsAnalysis.suggestedAPIs,
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
    suggestedAPIs: [],
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
  
  // Extract suggestedAPIs - look for the array structure
  const suggestedApisMatch = content.match(/"suggestedAPIs"\s*:\s*\[(.*?)\]/s)
  if (suggestedApisMatch) {
    try {
      // Try to parse the suggestedAPIs array
      const apisArray = JSON.parse('[' + suggestedApisMatch[1] + ']')
      analysis.suggestedAPIs = apisArray
    } catch (e) {
      // If parsing fails, try to extract individual API objects
      const apiMatches = content.match(/\{"name"\s*:\s*"([^"]+)"\s*,\s*"endpoint"\s*:\s*"([^"]+)"\}/g)
      if (apiMatches) {
        analysis.suggestedAPIs = apiMatches.map(match => {
          const nameMatch = match.match(/"name"\s*:\s*"([^"]+)"/)
          const endpointMatch = match.match(/"endpoint"\s*:\s*"([^"]+)"/)
          return {
            name: nameMatch ? nameMatch[1] : 'Unknown API',
            endpoint: endpointMatch ? endpointMatch[1] : 'https://api.example.com'
          }
        })
      }
    }
  }
  
  return analysis
}

/**
 * Fallback website detection - scans user prompt for common website names
 * This runs AFTER the AI planning to catch any missed detections
 * @param {string} userPrompt - Original user request
 * @param {Array} existingWebPageData - Websites already detected by AI
 * @returns {Array} Updated webPageData with any missed websites
 */
function detectWebsitesInPrompt(userPrompt, existingWebPageData = []) {
  const prompt = userPrompt.toLowerCase()
  
  // Common website mappings (name -> domain)
  const websiteMap = {
    'youtube': 'youtube.com',
    'x.com': 'x.com',
    'reddit': 'reddit.com',
    'github': 'github.com',
    'amazon': 'amazon.com',
    'linkedin': 'linkedin.com',
    'instagram': 'instagram.com',
    'facebook': 'facebook.com',
    'tiktok': 'tiktok.com',
    'netflix': 'netflix.com',
    'spotify': 'spotify.com',
    'pinterest': 'pinterest.com',
    'ebay': 'ebay.com',
    'wikipedia': 'wikipedia.org',
    'google': 'google.com',
    'gmail': 'mail.google.com',
    'stackoverflow': 'stackoverflow.com',
    'medium': 'medium.com',
    'twitch': 'twitch.tv',
    'discord': 'discord.com',
    'slack': 'slack.com',
    'notion': 'notion.so',
    'figma': 'figma.com',
    'canva': 'canva.com',
    'dropbox': 'dropbox.com',
    'trello': 'trello.com',
    'asana': 'asana.com',
    'zoom': 'zoom.us'
  }
  
  const detectedWebsites = new Set(existingWebPageData)
  
  // Check for each website name in the prompt
  for (const [name, domain] of Object.entries(websiteMap)) {
    // Match word boundaries to avoid false positives
    const regex = new RegExp(`\\b${name}\\b`, 'i')
    if (regex.test(prompt)) {
      detectedWebsites.add(domain)
      console.log(`🔍 [Fallback Detection] Found "${name}" in prompt → adding ${domain}`)
    }
  }
  
  // Also check for direct domain mentions (e.g., "example.com")
  const domainRegex = /\b([a-z0-9-]+\.[a-z]{2,})\b/gi
  const domainMatches = prompt.match(domainRegex)
  if (domainMatches) {
    domainMatches.forEach(domain => {
      detectedWebsites.add(domain.toLowerCase())
      console.log(`🔍 [Fallback Detection] Found domain in prompt → adding ${domain}`)
    })
  }
  
  return Array.from(detectedWebsites)
}