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