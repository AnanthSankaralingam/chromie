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

/**
 * Format file analysis result into concise summaries for planning
 * @param {Object} analysisResult - Result from analyzeExtensionFiles
 * @returns {string} - Formatted file summaries
 */
export function formatFileSummariesForPlanning(analysisResult) {
  if (!analysisResult || !analysisResult.files) {
    return '(No files to analyze)';
  }

  const lines = [];

  for (const [path, analysis] of Object.entries(analysisResult.files)) {
    // Skip files that were skipped during analysis
    if (analysis.skipped) continue;

    // Skip error files
    if (analysis.error) {
      lines.push(`- ${path}: (analysis error)`);
      continue;
    }

    let summary = `- ${path}: `;

    // Build concise summary based on file type
    if (path === 'manifest.json' && analysis.manifestVersion) {
      summary += `Manifest V${analysis.manifestVersion}`;
      if (analysis.permissions?.length) {
        const permList = analysis.permissions.slice(0, 5).join(', ');
        summary += `, permissions: [${permList}${analysis.permissions.length > 5 ? '...' : ''}]`;
      }
      if (analysis.contentScripts?.length) {
        summary += `, ${analysis.contentScripts.length} content script(s)`;
      }
      if (analysis.backgroundScript) {
        summary += `, background script`;
      }
    } else if (analysis.fileType === 'javascript' || path.endsWith('.js')) {
      const parts = [];

      if (analysis.functions?.length) {
        parts.push(`${analysis.functions.length} functions`);
      }
      if (analysis.chromeApis?.length) {
        parts.push(`Chrome APIs: ${analysis.chromeApis.slice(0, 3).join(', ')}${analysis.chromeApis.length > 3 ? '...' : ''}`);
      }
      if (analysis.exports?.length) {
        parts.push(`exports: ${analysis.exports.slice(0, 3).join(', ')}${analysis.exports.length > 3 ? '...' : ''}`);
      }
      if (analysis.role) {
        parts.unshift(analysis.role);
      }

      summary += parts.length > 0 ? parts.join(', ') : 'JavaScript file';
    } else if (analysis.fileType === 'html' || path.endsWith('.html')) {
      const parts = [];

      if (analysis.scripts?.length) {
        parts.push(`${analysis.scripts.length} script(s)`);
      }
      if (analysis.styles?.length) {
        parts.push(`${analysis.styles.length} stylesheet(s)`);
      }
      if (analysis.purpose) {
        parts.unshift(analysis.purpose);
      }

      summary += parts.length > 0 ? parts.join(', ') : 'HTML file';
    } else if (analysis.fileType === 'css' || path.endsWith('.css')) {
      const parts = [];

      if (analysis.selectors?.length) {
        parts.push(`${analysis.selectors.length} selectors`);
      }
      if (analysis.purpose) {
        parts.unshift(analysis.purpose);
      }

      summary += parts.length > 0 ? parts.join(', ') : 'CSS file';
    } else if (analysis.fileType === 'json' || path.endsWith('.json')) {
      summary += analysis.purpose || 'JSON config';
    } else {
      // Generic fallback
      summary += analysis.purpose || analysis.fileType || 'file';
    }

    lines.push(summary);
  }

  // Add cross-file analysis summary if available
  if (analysisResult._cross_file) {
    const crossFile = analysisResult._cross_file;

    if (crossFile.messageFlow) {
      const { senders, receivers } = crossFile.messageFlow;
      if (senders?.length > 0 || receivers?.length > 0) {
        lines.push('');
        lines.push('Message passing:');
        if (senders?.length > 0) {
          lines.push(`  Senders: ${senders.join(', ')}`);
        }
        if (receivers?.length > 0) {
          lines.push(`  Receivers: ${receivers.join(', ')}`);
        }
      }
    }

    if (crossFile.chromeApiUsageMap && Object.keys(crossFile.chromeApiUsageMap).length > 0) {
      const apis = Object.keys(crossFile.chromeApiUsageMap);
      lines.push('');
      lines.push(`Chrome APIs used: ${apis.slice(0, 5).join(', ')}${apis.length > 5 ? '...' : ''}`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate a minimal summary suitable for token-constrained contexts
 * @param {Object} analysisResult - Result from analyzeExtensionFiles
 * @returns {string} - Minimal file list with types
 */
export function formatMinimalSummary(analysisResult) {
  if (!analysisResult || !analysisResult.files) {
    return '(No files)';
  }

  const fileTypes = {};

  for (const [path, analysis] of Object.entries(analysisResult.files)) {
    if (analysis.skipped) continue;

    const type = analysis.fileType || 'other';
    if (!fileTypes[type]) {
      fileTypes[type] = [];
    }
    fileTypes[type].push(path);
  }

  const lines = [];
  for (const [type, files] of Object.entries(fileTypes)) {
    lines.push(`${type}: ${files.join(', ')}`);
  }

  return lines.join('\n');
}
