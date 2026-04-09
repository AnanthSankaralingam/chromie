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
      if (analysis.imports?.chromeApis?.length) {
        const apis = analysis.imports.chromeApis;
        parts.push(`Chrome APIs: ${apis.slice(0, 3).join(', ')}${apis.length > 3 ? '...' : ''}`);
      }
      if (analysis.messageNames?.received?.length) {
        parts.push(`receives: ${analysis.messageNames.received.join(', ')}`);
      }
      if (analysis.messageNames?.sent?.length) {
        parts.push(`sends: ${analysis.messageNames.sent.join(', ')}`);
      }
      if (analysis.exports?.named?.length) {
        parts.push(`exports: ${analysis.exports.named.slice(0, 3).join(', ')}${analysis.exports.named.length > 3 ? '...' : ''}`);
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
          lines.push(`  Senders: ${senders.map(s => `${s.file} [${(s.methods || []).join(', ')}]`).join(', ')}`);
        }
        if (receivers?.length > 0) {
          lines.push(`  Receivers: ${receivers.map(r => `${r.file} [${(r.methods || []).join(', ')}]`).join(', ')}`);
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
 * Formats file analysis into an expanded summary suited for the followup meta planner.
 * Includes function names, Chrome listeners, element IDs, permissions, etc. so the
 * planner can write accurate per-file task descriptions.
 * @param {Object} analysisResult - Result from analyzeExtensionFiles
 * @returns {string}
 */
export function formatFileSummariesForFollowupPlanner(analysisResult) {
  if (!analysisResult || !analysisResult.files) {
    return '(No files to analyze)'
  }

  const sections = []

  for (const [path, analysis] of Object.entries(analysisResult.files)) {
    if (analysis.skipped) continue
    if (analysis.error) {
      sections.push(`### ${path}\n(analysis error)`)
      continue
    }

    const lines = [`### ${path}`]

    // ── Manifest ──────────────────────────────────────────────────────────────
    if (path === 'manifest.json' && analysis.manifestVersion) {
      lines.push(`Manifest V${analysis.manifestVersion} — "${analysis.name || 'Extension'}" v${analysis.version || '?'}`)
      if (analysis.description) lines.push(`Description: ${analysis.description}`)

      if (analysis.permissions?.length) {
        lines.push(`Permissions: ${analysis.permissions.join(', ')}`)
      }
      if (analysis.hostPermissions?.length) {
        lines.push(`Host permissions: ${analysis.hostPermissions.join(', ')}`)
      }
      if (analysis.background) {
        const bg = analysis.background
        const bgFile = bg.serviceWorker || (bg.scripts?.length ? bg.scripts.join(', ') : null)
        lines.push(`Background: ${bg.type}${bgFile ? ` → ${bgFile}` : ''}`)
      }
      if (analysis.action?.defaultPopup) {
        lines.push(`Action popup: ${analysis.action.defaultPopup}`)
      }
      if (analysis.sidePanel?.defaultPath) {
        lines.push(`Side panel: ${analysis.sidePanel.defaultPath}`)
      }
      if (analysis.options?.page) {
        lines.push(`Options page: ${analysis.options.page}`)
      }
      if (analysis.contentScripts?.length) {
        for (const cs of analysis.contentScripts) {
          const files = [...(cs.js || []), ...(cs.css || [])].join(', ')
          const matches = (cs.matches || []).slice(0, 2).join(', ')
          lines.push(`Content script: ${files} → matches [${matches}]`)
        }
      }

    // ── JavaScript ────────────────────────────────────────────────────────────
    } else if (analysis.functions !== undefined) {
      // Inferred context (background, popup, content, etc.)
      if (analysis.chromeContext) lines.push(`Role: ${analysis.chromeContext}`)

      const fnNames = (analysis.functions || []).slice(0, 15).map(f => f.name).filter(Boolean)
      if (fnNames.length) lines.push(`Functions: ${fnNames.join(', ')}`)

      const chromeApis = (analysis.imports?.chromeApis || []).slice(0, 10)
      if (chromeApis.length) lines.push(`Chrome APIs: ${chromeApis.join(', ')}`)

      const chromeListeners = (analysis.eventHandlers?.chrome || [])
      if (chromeListeners.length) lines.push(`Chrome listeners: ${chromeListeners.join(', ')}`)

      const domEvents = (analysis.eventHandlers?.dom || [])
      if (domEvents.length) lines.push(`DOM events: ${domEvents.join(', ')}`)

      const senders = (analysis.eventHandlers?.messageHandlers?.senders || [])
      const receivers = (analysis.eventHandlers?.messageHandlers?.receivers || [])
      if (senders.length) lines.push(`Messaging (sends): ${senders.join(', ')}`)
      if (receivers.length) lines.push(`Messaging (receives): ${receivers.join(', ')}`)

      const receivedNames = (analysis.messageNames?.received || [])
      if (receivedNames.length) lines.push(`Message names received: ${receivedNames.join(', ')}`)
      const sentNames = (analysis.messageNames?.sent || [])
      if (sentNames.length) lines.push(`Message names sent: ${sentNames.join(', ')}`)

      const namedExports = (analysis.exports?.named || []).slice(0, 8)
      if (namedExports.length) lines.push(`Exports: ${namedExports.join(', ')}`)

    // ── HTML ──────────────────────────────────────────────────────────────────
    } else if (analysis.scripts !== undefined) {
      if (analysis.chromeContext?.pageType) lines.push(`Page type: ${analysis.chromeContext.pageType}`)

      const extScripts = (analysis.scripts?.external || []).map(s => s.src).filter(Boolean)
      if (extScripts.length) lines.push(`Scripts: ${extScripts.join(', ')}`)

      const extStyles = (analysis.styles?.external || []).filter(Boolean)
      if (extStyles.length) lines.push(`Stylesheets: ${extStyles.join(', ')}`)

      const ids = (analysis.identifiers?.ids || []).slice(0, 20)
      if (ids.length) lines.push(`Element IDs: ${ids.join(', ')}`)

      const buttons = (analysis.interactiveElements?.buttons || [])
        .filter(b => b.id || b.text)
        .slice(0, 10)
        .map(b => b.id ? `${b.text || '(no text)'} #${b.id}` : b.text)
      if (buttons.length) lines.push(`Buttons: ${buttons.join(', ')}`)

      const inputs = (analysis.interactiveElements?.inputs || [])
        .filter(i => i.id || i.type)
        .slice(0, 10)
        .map(i => [i.type, i.id ? `#${i.id}` : null].filter(Boolean).join(' '))
      if (inputs.length) lines.push(`Inputs: ${inputs.join(', ')}`)

    // ── CSS ───────────────────────────────────────────────────────────────────
    } else if (analysis.selectors !== undefined) {
      const classes = (analysis.selectors?.classes || []).slice(0, 20)
      if (classes.length) lines.push(`Classes: .${classes.join(', .')}`)

      const ids = (analysis.selectors?.ids || []).slice(0, 10)
      if (ids.length) lines.push(`IDs: #${ids.join(', #')}`)

      if (analysis.mediaQueries?.length) lines.push(`Media queries: ${analysis.mediaQueries.join(', ')}`)

    // ── Fallback ──────────────────────────────────────────────────────────────
    } else {
      lines.push(analysis.purpose || analysis.fileType || 'file')
    }

    sections.push(lines.join('\n'))
  }

  // Cross-file messaging summary
  const crossFile = analysisResult._cross_file
  if (crossFile?.messageFlow) {
    const { senders, receivers } = crossFile.messageFlow
    if (senders?.length || receivers?.length) {
      const msgLines = ['### Message passing (cross-file)']
      if (senders?.length) {
        msgLines.push(`Senders: ${senders.map(s => `${s.file} [${(s.methods || []).join(', ')}]`).join(', ')}`)
      }
      if (receivers?.length) {
        msgLines.push(`Receivers: ${receivers.map(r => `${r.file} [${(r.methods || []).join(', ')}]`).join(', ')}`)
      }
      sections.push(msgLines.join('\n'))
    }
  }

  return sections.join('\n\n')
}

/**
 * Format truncated file contents for the follow-up planning agent.
 * Includes actual source code so the planner can match error messages,
 * line references, and specific code snippets to the correct file.
 * Binary files and asset metadata entries are skipped.
 * @param {Object} files - Map of file paths to file contents
 * @param {number} maxLinesPerFile - Truncate files longer than this (default 200)
 * @returns {string} - XML-formatted file contents for prompt injection
 */
export function formatFileContentsForPlanning(files, maxLinesPerFile = 200) {
  if (!files || typeof files !== 'object') {
    return '(No files)';
  }

  const sections = [];

  for (const [path, content] of Object.entries(files)) {
    // Skip binary files
    if (isBinaryFile(path)) continue;

    // Skip non-string content (asset metadata entries like "[Custom icon: ...]")
    if (typeof content !== 'string') continue;
    if (content.startsWith('[Custom')) continue;

    const lines = content.split('\n');
    const truncated = lines.length > maxLinesPerFile;
    const displayLines = truncated ? lines.slice(0, maxLinesPerFile) : lines;
    const truncationNote = truncated
      ? `\n... (truncated, ${lines.length - maxLinesPerFile} more lines)`
      : '';

    sections.push(
      `<file path="${path}">\n${displayLines.join('\n')}${truncationNote}\n</file>`
    );
  }

  return sections.join('\n\n');
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
