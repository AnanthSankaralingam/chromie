// openai-responses.js
import OpenAI from 'openai'
import {
  OPENAI_RESPONSES_DEFAULT_MODEL,
  RESPONSE_STORE_DEFAULT,
  CONTEXT_WINDOW_MAX_TOKENS_DEFAULT
} from '../constants'

// Stateless wrapper for OpenAI Responses API
// createResponse and continueResponse both call responses.create().

function logCreate({ model, previous_response_id, store }) {
  console.log('[openai-responses] create', {
    model,
    has_previous_response_id: Boolean(previous_response_id),
    store
  })
}

function logError(err) {
  // Attempt to normalize OpenAI error shape
  const type = err?.type || err?.name || 'Error'
  const code = err?.code || err?.status || err?.statusCode || err?.error?.code
  const message = err?.message || err?.error?.message || String(err)
  console.error('[openai-responses] error', { type, code, message })
}

export function isContextLimitError(err) {
  const message = (err?.message || err?.error?.message || '').toLowerCase()
  const code = (err?.code || err?.error?.code || err?.status)?.toString().toLowerCase()
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
  // Uses OPENAI_API_KEY from env in both server and edge runtimes
  return new OpenAI()
}

function normalizeInput(input) {
  // Normalize to Responses API content array
  if (typeof input === 'string') {
    return [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: input }
        ]
      }
    ]
  }

  return input
}

function normalizeResult(resp) {
  return {
    id: resp?.id,
    output_text: resp?.output_text,
    usage: resp?.usage || resp?.usage_details || null
  }
}

export async function createResponse({ model, input, store, response_format, temperature, max_output_tokens } = {}) {
  const client = new OpenAI()
  const effectiveModel = model || OPENAI_RESPONSES_DEFAULT_MODEL
  const effectiveStore = typeof store === 'boolean' ? store : RESPONSE_STORE_DEFAULT

  try {
    const payload = {
      model: effectiveModel,
      input: normalizeInput(input),
      store: effectiveStore,
      ...(typeof temperature === 'number' ? { temperature } : {}),
      ...(typeof max_output_tokens === 'number' ? { max_output_tokens } : {}),
    }

    if (response_format) {
      const rfType = response_format?.type || response_format?.format || null
      if (rfType === 'json_schema' || rfType === 'json' || response_format?.schema || response_format?.name) {
        payload.text = {
          format: {
            type: 'json_schema',
            name: response_format?.name || 'response_schema',
            schema: response_format?.json_schema || response_format?.schema || response_format
          }
        }
      }
    }
    

    const response = await client.responses.create(payload)

    return normalizeResult(response)
  } catch (err) {
    logError(err)
    throw err
  }
}

export async function continueResponse({ model, previous_response_id, input, store, response_format, temperature, max_output_tokens } = {}) {
  const client = new OpenAI()
  const effectiveModel = model || OPENAI_RESPONSES_DEFAULT_MODEL
  const effectiveStore = typeof store === 'boolean' ? store : RESPONSE_STORE_DEFAULT

  try {
    const payload = {
      model: effectiveModel,
      previous_response_id,
      input: normalizeInput(input),
      store: effectiveStore,
      ...(typeof temperature === 'number' ? { temperature } : {}),
      ...(typeof max_output_tokens === 'number' ? { max_output_tokens } : {}),
    }

    if (response_format) {
      const rfType = response_format?.type || response_format?.format || null
      if (rfType === 'json_schema' || rfType === 'json' || response_format?.schema || response_format?.name) {
        payload.text = {
          format: {
            type: 'json_schema',
            name: response_format?.name || 'response_schema',
            schema: response_format?.json_schema || response_format?.schema || response_format
          }
        }
      }
    }    

    const response = await client.responses.create(payload)
    return normalizeResult(response)
  } catch (err) {
    logError(err)
    throw err
  }
}

export default {
  createResponse,
  continueResponse,
  isContextLimitError,
  CONTEXT_WINDOW_MAX_TOKENS_DEFAULT
}
