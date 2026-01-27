/**
 * Utility functions for formatting console logs for LLM context injection
 */

/**
 * Get a human-readable label for a log source
 */
function getSourceLabel(source) {
  switch (source) {
    case 'extension:background':
      return 'Background'
    case 'extension:popup':
      return 'Popup'
    case 'extension:sidepanel':
      return 'Sidepanel'
    case 'extension:content':
      return 'Content Script'
    case 'browser:page':
      return 'Page'
    default:
      return source || 'Unknown'
  }
}

/**
 * Summarize log activity by type and source
 * @param {Array} logs - Array of log entries
 * @returns {Object} Summary object with counts
 */
export function summarizeLogActivity(logs) {
  if (!logs || logs.length === 0) {
    return {
      total: 0,
      byType: {},
      bySource: {},
      errors: 0,
      warnings: 0
    }
  }

  const byType = {}
  const bySource = {}
  let errors = 0
  let warnings = 0

  for (const log of logs) {
    // Count by type
    const type = log.type || 'log'
    byType[type] = (byType[type] || 0) + 1

    // Count by source
    const source = log.source || 'unknown'
    bySource[source] = (bySource[source] || 0) + 1

    // Count errors and warnings
    if (type === 'error') errors++
    if (type === 'warn' || type === 'warning') warnings++
  }

  return {
    total: logs.length,
    byType,
    bySource,
    errors,
    warnings
  }
}

/**
 * Format logs for LLM context injection
 * @param {Array} logs - Array of log entries
 * @param {Object} options - Formatting options
 * @param {number} options.maxLogs - Maximum number of logs to include (default: 50)
 * @param {number} options.maxChars - Maximum total characters (default: 8000)
 * @returns {string} Formatted log string for context injection
 */
export function formatLogsForContext(logs, options = {}) {
  const { maxLogs = 50, maxChars = 8000 } = options

  if (!logs || logs.length === 0) {
    return ''
  }

  const summary = summarizeLogActivity(logs)

  // Build header
  let result = `## Console Logs from Test Session\n\n`
  result += `**Summary:** ${summary.total} total logs`
  if (summary.errors > 0) result += `, ${summary.errors} errors`
  if (summary.warnings > 0) result += `, ${summary.warnings} warnings`
  result += `\n\n`

  // Add source breakdown
  const sourceLabels = Object.entries(summary.bySource)
    .map(([source, count]) => `${getSourceLabel(source)}: ${count}`)
    .join(', ')
  if (sourceLabels) {
    result += `**Sources:** ${sourceLabels}\n\n`
  }

  result += `### Log Entries\n\n`

  // Take the most recent logs up to maxLogs
  const logsToInclude = logs.slice(-maxLogs)

  // Prioritize errors and warnings first, then recent logs
  const sortedLogs = [...logsToInclude].sort((a, b) => {
    const typeOrder = { error: 0, warn: 1, warning: 1 }
    const aOrder = typeOrder[a.type] ?? 2
    const bOrder = typeOrder[b.type] ?? 2
    if (aOrder !== bOrder) return aOrder - bOrder
    // Within same priority, keep chronological order
    return 0
  })

  let charsUsed = result.length

  for (const log of sortedLogs) {
    const sourceLabel = getSourceLabel(log.source)
    const typeLabel = log.type?.toUpperCase() || 'LOG'
    const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''

    let logLine = `[${typeLabel}] [${sourceLabel}]`
    if (timestamp) logLine += ` ${timestamp}`
    logLine += `: ${log.text}\n`

    // Check if we'd exceed maxChars
    if (charsUsed + logLine.length > maxChars) {
      result += `\n... (${logs.length - sortedLogs.indexOf(log)} more logs truncated)\n`
      break
    }

    result += logLine
    charsUsed += logLine.length
  }

  return result
}

/**
 * Format a brief preview of logs (for the context pill)
 * @param {Array} logs - Array of log entries
 * @param {number} maxLogs - Maximum logs to show in preview (default: 5)
 * @returns {Array} Array of formatted preview strings
 */
export function formatLogsPreview(logs, maxLogs = 5) {
  if (!logs || logs.length === 0) return []

  // Prioritize errors and warnings, then most recent
  const prioritized = [...logs].sort((a, b) => {
    const typeOrder = { error: 0, warn: 1, warning: 1 }
    const aOrder = typeOrder[a.type] ?? 2
    const bOrder = typeOrder[b.type] ?? 2
    if (aOrder !== bOrder) return aOrder - bOrder
    // More recent first within same priority
    return new Date(b.timestamp) - new Date(a.timestamp)
  })

  return prioritized.slice(0, maxLogs).map(log => {
    const sourceLabel = getSourceLabel(log.source)
    const typeEmoji = log.type === 'error' ? '!' : log.type === 'warn' ? '?' : '>'
    const truncatedText = log.text.length > 60 ? log.text.slice(0, 57) + '...' : log.text
    return `${typeEmoji} [${sourceLabel}] ${truncatedText}`
  })
}
