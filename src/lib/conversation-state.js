// Simple conversation state helpers - only track responseId

export function getConversationStorageKey(projectId) {
  return `chromie:responseId:${projectId || 'unknown'}`
}

export function loadResponseId(projectId, storage = (typeof window !== 'undefined' ? window.localStorage : null)) {
  try {
    const key = getConversationStorageKey(projectId)
    const raw = storage?.getItem ? storage.getItem(key) : null
    return raw ? JSON.parse(raw)?.responseId ?? null : null
  } catch (e) {
    return null
  }
}

export function saveResponseId(projectId, responseId, storage = (typeof window !== 'undefined' ? window.localStorage : null)) {
  try {
    const key = getConversationStorageKey(projectId)
    storage?.setItem && storage.setItem(key, JSON.stringify({ responseId }))
  } catch (e) {
    // no-op
  }
}

export function resetResponseId(projectId, storage = (typeof window !== 'undefined' ? window.localStorage : null)) {
  try {
    const key = getConversationStorageKey(projectId)
    storage?.removeItem && storage.removeItem(key)
  } catch (e) {
    // no-op
  }
}

