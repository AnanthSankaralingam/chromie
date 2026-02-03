import { getLogs } from "./console-log-storage"

/**
 * Analyze extension logs to determine if tests should be considered failed
 * @param {string} sessionId - The session ID to check logs for
 * @param {Object} options - Analysis options
 * @param {boolean} options.checkExtensionErrors - Check for extension errors (default: true)
 * @param {boolean} options.checkRuntimeErrors - Check for runtime errors (default: true)
 * @param {number} options.timeWindowMs - Only check logs within this time window (default: 5 minutes)
 * @returns {Object} Analysis result with { hasErrors, errors, warnings, errorCount, warningCount }
 */
export function analyzeLogsForTestVerification(sessionId, options = {}) {
  const {
    checkExtensionErrors = true,
    checkRuntimeErrors = true,
    timeWindowMs = 5 * 60 * 1000, // 5 minutes default
  } = options

  if (!sessionId) {
    return {
      hasErrors: false,
      errors: [],
      warnings: [],
      errorCount: 0,
      warningCount: 0,
      message: "No session ID provided",
    }
  }

  const logs = getLogs(sessionId)
  if (!logs || logs.length === 0) {
    return {
      hasErrors: false,
      errors: [],
      warnings: [],
      errorCount: 0,
      warningCount: 0,
      message: "No logs found for session",
    }
  }

  // Filter logs by time window if specified
  const now = Date.now()
  const relevantLogs = logs.filter((log) => {
    if (!log.timestamp) return true // Include logs without timestamps
    const logTime = new Date(log.timestamp).getTime()
    return now - logTime <= timeWindowMs
  })

  const errors = []
  const warnings = []

  for (const log of relevantLogs) {
    const logType = log.type?.toLowerCase()
    const logText = String(log.text || "").toLowerCase()
    const isExtensionLog = log.source?.startsWith("extension:")

    // Check for errors
    if (checkRuntimeErrors && logType === "error") {
      // Skip test framework errors that are expected (like assertion failures)
      if (
        !logText.includes("expected") &&
        !logText.includes("assertion") &&
        !logText.includes("test failed")
      ) {
        errors.push({
          type: "runtime_error",
          source: log.source,
          text: log.text,
          timestamp: log.timestamp,
          isExtensionLog,
        })
      }
    }

    // Check for extension-specific errors
    if (checkExtensionErrors && isExtensionLog && logType === "error") {
      errors.push({
        type: "extension_error",
        source: log.source,
        text: log.text,
        timestamp: log.timestamp,
        component: log.component,
      })
    }

    // Check for warnings that might indicate issues
    if (logType === "warn" || logType === "warning") {
      // Filter out benign warnings
      if (
        !logText.includes("deprecated") &&
        !logText.includes("experimental") &&
        !logText.includes("non-standard")
      ) {
        warnings.push({
          source: log.source,
          text: log.text,
          timestamp: log.timestamp,
          isExtensionLog,
        })
      }
    }

    // Also check for error-like patterns in log text (even if type isn't "error")
    if (
      checkRuntimeErrors &&
      logType !== "error" &&
      (logText.includes("uncaught") ||
        logText.includes("unhandled") ||
        logText.includes("failed to") ||
        logText.includes("cannot") ||
        logText.includes("error:"))
    ) {
      // Only add if it's not already in errors
      const alreadyAdded = errors.some(
        (e) => e.text === log.text && e.timestamp === log.timestamp
      )
      if (!alreadyAdded) {
        errors.push({
          type: "error_pattern",
          source: log.source,
          text: log.text,
          timestamp: log.timestamp,
          isExtensionLog,
        })
      }
    }
  }

  const hasErrors = errors.length > 0

  return {
    hasErrors,
    errors,
    warnings,
    errorCount: errors.length,
    warningCount: warnings.length,
    totalLogs: relevantLogs.length,
    message: hasErrors
      ? `Found ${errors.length} error(s) in logs`
      : `No errors found in ${relevantLogs.length} log(s)`,
  }
}

/**
 * Get a summary of errors for display in test results
 * @param {Array} errors - Array of error objects from analyzeLogsForTestVerification
 * @returns {string} Formatted error summary
 */
export function formatErrorSummary(errors) {
  if (!errors || errors.length === 0) {
    return null
  }

  const extensionErrors = errors.filter((e) => e.isExtensionLog || e.type === "extension_error")
  const runtimeErrors = errors.filter((e) => !e.isExtensionLog && e.type !== "extension_error")

  const parts = []

  if (extensionErrors.length > 0) {
    parts.push(`${extensionErrors.length} extension error(s)`)
    // Include first error details
    const firstError = extensionErrors[0]
    if (firstError.text) {
      const errorText = String(firstError.text).substring(0, 200)
      parts.push(`: ${errorText}${errorText.length >= 200 ? "..." : ""}`)
    }
  }

  if (runtimeErrors.length > 0) {
    if (parts.length > 0) parts.push("; ")
    parts.push(`${runtimeErrors.length} runtime error(s)`)
    const firstError = runtimeErrors[0]
    if (firstError.text) {
      const errorText = String(firstError.text).substring(0, 200)
      parts.push(`: ${errorText}${errorText.length >= 200 ? "..." : ""}`)
    }
  }

  return parts.join("")
}
