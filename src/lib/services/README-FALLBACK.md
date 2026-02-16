# LLM Service Automatic Fallback

## Overview

The LLM Service now includes automatic fallback functionality that transparently switches to backup providers when the primary provider is unavailable or experiencing high demand.

## How It Works

When a request to an LLM provider fails with certain error conditions, the service automatically retries the request with alternative providers without user intervention.

### Fallback Hierarchy

Each provider has a predefined fallback order:

- **Gemini** → Anthropic → OpenAI
- **Anthropic** → Gemini → OpenAI  
- **OpenAI** → Gemini → Anthropic

### Triggering Conditions

Automatic fallback is triggered when errors contain:

- HTTP 503 (Service Unavailable) status code
- HTTP 429 (Too Many Requests) status code
- "UNAVAILABLE" or "RESOURCE_EXHAUSTED" status
- "high demand" message
- "overloaded" message
- "rate limit" message
- "quota exceeded" message
- "temporarily unavailable" message

### Default Fallback Models

When falling back to a different provider, the service uses these default models:

- **Gemini**: `gemini-2.5-flash`
- **Anthropic**: `claude-haiku-4-5-20251001`
- **OpenAI**: `gpt-4o-mini`

## Logging

The service logs fallback attempts to help with debugging:

```
[llm-service] gemini unavailable, attempting fallback to next provider
[llm-service] Successfully fell back to anthropic after gemini failed
```

## Implementation

The fallback logic is implemented in both:

1. `createResponse()` - For non-streaming requests
2. `streamResponse()` - For streaming requests

Both methods will automatically try all available providers in the fallback hierarchy before throwing an error.

## Error Handling

- If the error is **not** retryable (e.g., invalid API key, malformed request), the error is thrown immediately
- If all providers in the fallback hierarchy fail, the last error is thrown
- Non-retryable errors bypass the fallback mechanism to provide faster feedback

## User Experience

From the user's perspective, the fallback is transparent:

- No additional configuration needed
- No user action required
- Requests complete successfully even when the primary provider is down
- Response format remains consistent across providers
