// Shared console log storage for test sessions
// This is used across API routes to store and retrieve console logs

const MAX_LOGS_PER_SESSION = 100

// Use global to ensure singleton across module reloads in Next.js
const getSessionLogs = () => {
  if (!global.__CHROMIE_SESSION_LOGS__) {
    console.log('[CONSOLE-LOG-STORAGE] 🆕 Initializing global session logs storage')
    global.__CHROMIE_SESSION_LOGS__ = new Map()
  }
  return global.__CHROMIE_SESSION_LOGS__
}

/**
 * Add a log entry for a session
 * @param {string} sessionId - Session identifier
 * @param {Object} logEntry - Log entry object { type, text, prefix, timestamp }
 */
export function addLog(sessionId, logEntry) {
  if (!sessionId || !logEntry) return

  const sessionLogs = getSessionLogs()
  const logs = sessionLogs.get(sessionId) || []
  logs.push(logEntry)

  // Keep only last MAX_LOGS_PER_SESSION logs
  if (logs.length > MAX_LOGS_PER_SESSION) {
    logs.shift()
  }

  sessionLogs.set(sessionId, logs)
  console.log(`[CONSOLE-LOG-STORAGE] ✅ Added log for session ${sessionId}. Total: ${logs.length}`)
}

/**
 * Get all logs for a session
 * @param {string} sessionId - Session identifier
 * @returns {Array} Array of log entries
 */
export function getLogs(sessionId) {
  const sessionLogs = getSessionLogs()
  const logs = sessionLogs.get(sessionId) || []
  console.log(`[CONSOLE-LOG-STORAGE] 📖 Retrieved ${logs.length} logs for session ${sessionId}`)
  console.log(`[CONSOLE-LOG-STORAGE] 🗂️  All sessions in storage:`, Array.from(sessionLogs.keys()))
  return logs
}

/**
 * Clear logs for a session
 * @param {string} sessionId - Session identifier
 */
export function clearLogs(sessionId) {
  const sessionLogs = getSessionLogs()
  sessionLogs.delete(sessionId)
  console.log(`[CONSOLE-LOG-STORAGE] 🗑️  Cleared logs for session ${sessionId}`)
}

/**
 * Get all session IDs that have logs
 * @returns {Array<string>} Array of session IDs
 */
export function getActiveSessions() {
  const sessionLogs = getSessionLogs()
  return Array.from(sessionLogs.keys())
}

