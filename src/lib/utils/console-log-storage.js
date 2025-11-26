// Shared console log storage for test sessions
// This is used across API routes to store and retrieve console logs

const sessionLogs = new Map()
const MAX_LOGS_PER_SESSION = 100

/**
 * Add a log entry for a session
 * @param {string} sessionId - Session identifier
 * @param {Object} logEntry - Log entry object { type, text, prefix, timestamp }
 */
export function addLog(sessionId, logEntry) {
  if (!sessionId || !logEntry) return
  
  const logs = sessionLogs.get(sessionId) || []
  logs.push(logEntry)
  
  // Keep only last MAX_LOGS_PER_SESSION logs
  if (logs.length > MAX_LOGS_PER_SESSION) {
    logs.shift()
  }
  
  sessionLogs.set(sessionId, logs)
}

/**
 * Get all logs for a session
 * @param {string} sessionId - Session identifier
 * @returns {Array} Array of log entries
 */
export function getLogs(sessionId) {
  return sessionLogs.get(sessionId) || []
}

/**
 * Clear logs for a session
 * @param {string} sessionId - Session identifier
 */
export function clearLogs(sessionId) {
  sessionLogs.delete(sessionId)
}

/**
 * Get all session IDs that have logs
 * @returns {Array<string>} Array of session IDs
 */
export function getActiveSessions() {
  return Array.from(sessionLogs.keys())
}

