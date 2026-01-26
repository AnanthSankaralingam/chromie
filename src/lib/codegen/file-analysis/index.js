/**
 * File Analysis System - Main Orchestrator
 * Analyzes Chrome extension files and generates structured JSON summaries
 */

import { getFileType, isBinaryFile } from './utils/file-utils.js'
import { analyzeJavaScript } from './analyzers/javascript-analyzer.js'
import { analyzeHtml } from './analyzers/html-analyzer.js'
import { analyzeCss } from './analyzers/css-analyzer.js'
import { analyzeJson } from './analyzers/json-analyzer.js'
import { analyzeManifest } from './analyzers/manifest-analyzer.js'
import { performCrossFileAnalysis } from './cross-file-analyzer.js'

/**
 * Analyzes all files in a Chrome extension
 * @param {Object} files - Map of file paths to file contents
 * @returns {Object} Complete analysis result
 */
export function analyzeExtensionFiles(files) {
  const result = {
    files: {},
    _cross_file: {},
    errors: []
  }

  if (!files || typeof files !== 'object') {
    result.errors.push({
      type: 'input_error',
      message: 'Invalid files input: expected an object'
    })
    return result
  }

  const fileEntries = Object.entries(files)

  // Analyze each file
  for (const [path, content] of fileEntries) {
    try {
      // Skip binary files
      if (isBinaryFile(path)) {
        result.files[path] = {
          type: 'binary',
          skipped: true
        }
        continue
      }

      // Skip non-string content (might be metadata entries)
      if (typeof content !== 'string') {
        result.files[path] = {
          type: 'non-string',
          skipped: true
        }
        continue
      }

      // Analyze based on file type
      const fileType = getFileType(path)
      result.files[path] = analyzeByType(fileType, content, path)

    } catch (error) {
      result.errors.push({
        type: 'analysis_error',
        file: path,
        message: error.message
      })
      // Mark file as having an error
      result.files[path] = {
        error: error.message
      }
    }
  }

  // Perform cross-file analysis
  try {
    result._cross_file = performCrossFileAnalysis(result.files, files)
  } catch (error) {
    result.errors.push({
      type: 'cross_file_error',
      message: error.message
    })
    result._cross_file = {
      messageFlow: { senders: [], receivers: [] }
    }
  }

  return result
}

/**
 * Analyzes a file based on its type
 * @param {string} fileType - File type
 * @param {string} content - File content
 * @param {string} path - File path
 * @returns {Object} Analysis result
 */
function analyzeByType(fileType, content, path) {
  switch (fileType) {
    case 'javascript':
      return analyzeJavaScript(content, path)

    case 'html':
      return analyzeHtml(content, path)

    case 'css':
      return analyzeCss(content, path)

    case 'manifest':
      return analyzeManifest(content, path)

    case 'json':
      return analyzeJson(content, path)

    default:
      // Return basic info for unknown file types
      return {
        fileType: 'unknown'
      }
  }
}

/**
 * Generates a compact summary suitable for logging
 * @param {Object} analysis - Full analysis result
 * @returns {Object} Compact summary
 */
export function generateCompactSummary(analysis) {
  const summary = {
    fileCount: analysis._meta.fileCount,
    fileTypes: {},
    chromeApis: [],
    entryPoints: analysis._cross_file.entryPoints.length,
    messagePassing: {
      senders: analysis._cross_file.messageFlow.senders.length,
      receivers: analysis._cross_file.messageFlow.receivers.length
    },
    errors: analysis.errors.length
  }

  // Count file types
  for (const [path, fileAnalysis] of Object.entries(analysis.files)) {
    const type = getFileType(path)
    summary.fileTypes[type] = (summary.fileTypes[type] || 0) + 1
  }

  // Collect unique Chrome APIs
  const apiSet = new Set()
  for (const [api, files] of Object.entries(analysis._cross_file.chromeApiUsageMap)) {
    apiSet.add(api)
  }
  summary.chromeApis = Array.from(apiSet)

  return summary
}
