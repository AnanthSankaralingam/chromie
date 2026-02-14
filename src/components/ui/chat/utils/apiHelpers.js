/**
 * API helper functions for streaming chat
 */

export async function fetchWithErrorHandling(url, options, onTokenLimitError) {
  const response = await fetch(url, options)

  if (!response.ok) {
    // Check if it's a token limit error (403 with specific structure)
    if (response.status === 403) {
      try {
        const errorData = await response.json()
        if (errorData.details?.resourceType === "tokens") {
          onTokenLimitError()
          return null
        }
      } catch (e) {
        // If we can't parse the response, fall through to generic error
      }
    }
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response
}

export async function* streamResponse(response) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6))
          yield data
        } catch (parseError) {
          console.error("Error parsing stream data:", parseError)
        }
      }
    }
  }
}

export function buildGeneratePayload({
  prompt,
  projectId,
  requestType,
  conversationTokenTotal,
  modelOverride,
  userProvidedUrl = null,
  skipScraping = false,
  userProvidedApis = null,
  analysisData = null,
  userSelectedFrontendType = null,
}) {
  const payload = {
    prompt,
    projectId,
    requestType,
    conversationTokenTotal,
    modelOverride,
  }

  if (userProvidedUrl !== undefined) {
    payload.userProvidedUrl = userProvidedUrl
  }

  if (skipScraping) {
    payload.skipScraping = skipScraping
  }

  if (userProvidedApis) {
    payload.userProvidedApis = userProvidedApis
  }

  // Pass analysis data to preserve planning results
  if (analysisData) {
    payload.initialRequirementsAnalysis = analysisData.requirements
    payload.initialPlanningTokenUsage = analysisData.tokenUsage
  }

  if (userSelectedFrontendType) {
    payload.userSelectedFrontendType = userSelectedFrontendType
  }

  return payload
}
