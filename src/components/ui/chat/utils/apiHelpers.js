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

  function* processLines(lines) {
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6))
          yield data
        } catch (parseError) {
          console.error("Error parsing stream data:", parseError, "| raw line:", line.slice(0, 200))
        }
      }
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    yield* processLines(lines)
  }

  // Flush remaining buffer — the last SSE event may not have a trailing newline
  // before the stream closes (e.g. plan_ready right before controller.close()).
  if (buffer.trim()) {
    yield* processLines([buffer])
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
  userConfirmedWorkspaceIntegration = null,
  prebuiltMetaPlan = null,
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

  if (userConfirmedWorkspaceIntegration !== undefined && userConfirmedWorkspaceIntegration !== null) {
    payload.userConfirmedWorkspaceIntegration = userConfirmedWorkspaceIntegration
  }

  // Phase 2 continuation: carry the pre-built meta plan for direct task graph execution.
  if (prebuiltMetaPlan) {
    payload.prebuiltMetaPlan = prebuiltMetaPlan
  }

  return payload
}
