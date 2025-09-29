// anthropic-service.js
import Anthropic from '@anthropic-ai/sdk'
import {
  CODE_GENERATION_DEFAULT_MODEL,
  CONTEXT_WINDOW_MAX_TOKENS_DEFAULT
} from '../constants.js'

function logCreate({ model, store }) {
  console.log('[anthropic-service] create', {
    model,
    store
  })
}

function logError(err) {
  // Attempt to normalize Anthropic error shape
  const type = err?.type || err?.name || 'Error'
  const code = err?.status || err?.error?.code
  const message = err?.message || err?.error?.message || String(err)
  console.error('[anthropic-service] error', { type, code, message })
}

export function isContextLimitError(err) {
  const message = (err?.message || err?.error?.message || '').toLowerCase()
  const code = (err?.status || err?.error?.code)?.toString().toLowerCase()
  
  // Heuristics for token/context limit errors
  const keywords = [
    'context',
    'token',
    'max',
    'length',
    'quota',
    'limit',
    'too many tokens',
    'exceeds',
    'maximum context length',
    'context length exceeded'
  ]
  const codeMatches = ['context_length_exceeded', 'max_tokens', 'rate_limit_exceeded'].some(k => (code || '').includes(k))
  const msgMatches = keywords.some(k => message.includes(k))
  return Boolean(codeMatches || msgMatches)
}

function getClient() {
  // Uses ANTHROPIC_API_KEY from env
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
}

function normalizeInput(input) {
  // Convert to Claude message format
  if (typeof input === 'string') {
    return [
      {
        role: 'user',
        content: input
      }
    ]
  }

  // If it's already in message format, return as is
  if (Array.isArray(input)) {
    return input.map(msg => ({
      role: msg.role || 'user',
      content: typeof msg.content === 'string' ? msg.content : 
               Array.isArray(msg.content) ? msg.content.map(c => c.text || c.content || '').join('\n') :
               String(msg.content)
    }))
  }

  return [{ role: 'user', content: String(input) }]
}

function normalizeResult(resp) {
  return {
    id: resp?.id,
    output_text: resp?.content?.[0]?.text || resp?.text || '',
    usage: {
      total_tokens: (resp?.usage?.input_tokens || 0) + (resp?.usage?.output_tokens || 0),
      input_tokens: resp?.usage?.input_tokens || 0,
      output_tokens: resp?.usage?.output_tokens || 0,
      total: (resp?.usage?.input_tokens || 0) + (resp?.usage?.output_tokens || 0)
    }
  }
}

export async function createResponse({ model, input, store, response_format, temperature, max_output_tokens } = {}) {
  const client = getClient()
  const effectiveModel = model || CODE_GENERATION_DEFAULT_MODEL

  logCreate({ model: effectiveModel, store })

  try {
    const messages = normalizeInput(input)
    
    // Build the request payload
    const payload = {
      model: effectiveModel,
      messages,
      max_tokens: max_output_tokens || 4096,
      ...(typeof temperature === 'number' ? { temperature } : { temperature: 0.2 }),
    }

    // Handle JSON schema response format
    if (response_format) {
      const rfType = response_format?.type || response_format?.format || null
      if (rfType === 'json_schema' || rfType === 'json' || response_format?.schema || response_format?.name) {
        // For Claude, we need to add instructions to the system prompt or last message
        const schema = response_format?.json_schema || response_format?.schema || response_format
        const schemaInstruction = `\n\nIMPORTANT: Respond with valid JSON that follows this exact schema:\n${JSON.stringify(schema, null, 2)}

CRITICAL CHROME EXTENSION REQUIREMENTS:
1. If your manifest.json includes "content_scripts", you MUST provide the corresponding JavaScript files with actual content
2. Never create empty content_scripts entries - only include content_scripts if you're providing the actual JS files
3. Content scripts must have meaningful code, not just comments or empty functions
4. If no content script is needed, omit the content_scripts section entirely from manifest.json
5. Always provide complete, functional code for all files listed in the required schema
6. Ensure all referenced files in manifest.json (popup.js, background.js, etc.) have actual implementation code`
        
        // Add schema instruction to the last user message
        if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
          messages[messages.length - 1].content += schemaInstruction
        } else {
          messages.push({
            role: 'user',
            content: schemaInstruction
          })
        }
      }
    }

    const response = await client.messages.create(payload)
    return normalizeResult(response)
  } catch (err) {
    logError(err)
    throw err
  }
}

// For now, continueResponse will work the same as createResponse since Claude doesn't have a direct equivalent to OpenAI's Responses API
export async function continueResponse({ model, previous_response_id, input, store, response_format, temperature, max_output_tokens } = {}) {
  // Note: Claude doesn't have a direct equivalent to OpenAI's continue response
  // For now, we'll treat this as a new conversation
  console.log('[anthropic-service] continueResponse called, treating as new conversation (previous_response_id ignored)')
  
  return createResponse({ model, input, store, response_format, temperature, max_output_tokens })
}

export default {
  createResponse,
  continueResponse,
  isContextLimitError,
  CONTEXT_WINDOW_MAX_TOKENS_DEFAULT
}