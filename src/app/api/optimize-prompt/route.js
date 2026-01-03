import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { llmService } from "@/lib/services/llm-service"
import { ONE_SHOT_OPTIMIZER_PROMPT, ONE_SHOT_OPTIMIZER_PROMPT_PREFILL } from "@/lib/prompts/new-extension/optimizer/optimize-prompt"

export async function POST(request) {
  const supabase = createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { prompt } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    // Construct the optimization prompt by replacing the placeholder
    const optimizationPrompt = ONE_SHOT_OPTIMIZER_PROMPT.replace(
      '{USER_REQUEST}',
      prompt.trim()
    )

    // Call Anthropic API via llmService
    const response = await llmService.createResponse({
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      input: optimizationPrompt,
      temperature: 0.2,
      max_output_tokens: 2048,
      store: false, // Don't store optimization requests in conversation history
    })

    // Extract the optimized prompt from the response
    const optimizedText = response.output_text || response.choices?.[0]?.message?.content || ''

    if (!optimizedText.trim()) {
      return NextResponse.json({ error: "Failed to generate optimized prompt" }, { status: 500 })
    }

    // Prepend the prefill if the response doesn't start with it
    let optimizedPrompt = optimizedText.trim()
    if (!optimizedPrompt.toLowerCase().startsWith('build an extension')) {
      optimizedPrompt = ONE_SHOT_OPTIMIZER_PROMPT_PREFILL + optimizedPrompt
    }

    return NextResponse.json({ optimizedPrompt })
  } catch (error) {
    console.error('[api/optimize-prompt] error:', error)
    return NextResponse.json(
      { error: error.message || "Failed to optimize prompt" },
      { status: 500 }
    )
  }
}
