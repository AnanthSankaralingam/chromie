/**
 * Cross-file analyzer
 * Builds dependency graph, identifies entry points, maps Chrome API usage, and analyzes message flow
 */

/**
 * Performs cross-file analysis
 * @param {Object} fileAnalyses - Map of file path to analysis result
 * @param {Object} files - Original files map (path -> content)
 * @returns {Object} Cross-file analysis result
 */
export function performCrossFileAnalysis(fileAnalyses, files) {
  return {
    messageFlow: analyzeMessageFlow(fileAnalyses)
  }
}

/**
 * Builds a dependency graph showing imports and importedBy relationships
 */
function buildDependencyGraph(fileAnalyses) {
  const graph = {}

  // Initialize graph with all files
  for (const [path, analysis] of Object.entries(fileAnalyses)) {
    graph[path] = {
      imports: [],
      importedBy: []
    }
  }

  // Build imports relationships
  for (const [path, analysis] of Object.entries(fileAnalyses)) {
    // JavaScript file imports
    if (analysis.imports) {
      const allImports = [
        ...(analysis.imports.es6 || []),
        ...(analysis.imports.dynamic || []),
        ...(analysis.imports.sideEffect || [])
      ]

      for (const importPath of allImports) {
        // Resolve relative imports
        const resolvedPath = resolveImportPath(path, importPath)
        if (resolvedPath && !graph[path].imports.includes(resolvedPath)) {
          graph[path].imports.push(resolvedPath)

          // Add to importedBy if the imported file exists in our analysis
          if (graph[resolvedPath]) {
            if (!graph[resolvedPath].importedBy.includes(path)) {
              graph[resolvedPath].importedBy.push(path)
            }
          }
        }
      }
    }

    // HTML file script references
    if (analysis.scripts) {
      const externalScripts = (analysis.scripts.external || []).map(s => s.src || s)
      for (const scriptPath of externalScripts) {
        const resolvedPath = resolveImportPath(path, scriptPath)
        if (resolvedPath && !graph[path].imports.includes(resolvedPath)) {
          graph[path].imports.push(resolvedPath)

          if (graph[resolvedPath]) {
            if (!graph[resolvedPath].importedBy.includes(path)) {
              graph[resolvedPath].importedBy.push(path)
            }
          }
        }
      }
    }

    // HTML file stylesheet references
    if (analysis.styles && analysis.styles.external) {
      for (const stylePath of analysis.styles.external) {
        const resolvedPath = resolveImportPath(path, stylePath)
        if (resolvedPath && !graph[path].imports.includes(resolvedPath)) {
          graph[path].imports.push(resolvedPath)

          if (graph[resolvedPath]) {
            if (!graph[resolvedPath].importedBy.includes(path)) {
              graph[resolvedPath].importedBy.push(path)
            }
          }
        }
      }
    }

    // CSS file imports
    if (analysis.imports && Array.isArray(analysis.imports)) {
      for (const importPath of analysis.imports) {
        const resolvedPath = resolveImportPath(path, importPath)
        if (resolvedPath && !graph[path].imports.includes(resolvedPath)) {
          graph[path].imports.push(resolvedPath)

          if (graph[resolvedPath]) {
            if (!graph[resolvedPath].importedBy.includes(path)) {
              graph[resolvedPath].importedBy.push(path)
            }
          }
        }
      }
    }
  }

  return graph
}

/**
 * Identifies entry points from manifest analysis
 */
function identifyEntryPoints(fileAnalyses) {
  const entryPoints = []

  // Find manifest analysis
  let manifestAnalysis = null
  for (const [path, analysis] of Object.entries(fileAnalyses)) {
    if (path.endsWith('manifest.json') && analysis.manifestVersion) {
      manifestAnalysis = analysis
      break
    }
  }

  if (!manifestAnalysis) {
    return entryPoints
  }

  // Background script/service worker
  if (manifestAnalysis.background) {
    if (manifestAnalysis.background.serviceWorker) {
      entryPoints.push({
        file: manifestAnalysis.background.serviceWorker,
        type: 'background',
        subType: 'service_worker'
      })
    }
    if (manifestAnalysis.background.scripts) {
      for (const script of manifestAnalysis.background.scripts) {
        entryPoints.push({
          file: script,
          type: 'background',
          subType: 'script'
        })
      }
    }
  }

  // Popup
  if (manifestAnalysis.action && manifestAnalysis.action.defaultPopup) {
    entryPoints.push({
      file: manifestAnalysis.action.defaultPopup,
      type: 'popup'
    })
  }

  // Content scripts
  if (manifestAnalysis.contentScripts) {
    for (const cs of manifestAnalysis.contentScripts) {
      for (const jsFile of (cs.js || [])) {
        entryPoints.push({
          file: jsFile,
          type: 'content_script',
          matches: cs.matches
        })
      }
      for (const cssFile of (cs.css || [])) {
        entryPoints.push({
          file: cssFile,
          type: 'content_script_css',
          matches: cs.matches
        })
      }
    }
  }

  // Side panel
  if (manifestAnalysis.sidePanel && manifestAnalysis.sidePanel.defaultPath) {
    entryPoints.push({
      file: manifestAnalysis.sidePanel.defaultPath,
      type: 'side_panel'
    })
  }

  // Options page
  if (manifestAnalysis.options && manifestAnalysis.options.page) {
    entryPoints.push({
      file: manifestAnalysis.options.page,
      type: 'options'
    })
  }

  // Chrome URL overrides
  if (manifestAnalysis.chromeUrlOverrides) {
    for (const [overrideType, page] of Object.entries(manifestAnalysis.chromeUrlOverrides)) {
      entryPoints.push({
        file: page,
        type: 'chrome_url_override',
        overrideType
      })
    }
  }

  return entryPoints
}

/**
 * Builds a map of Chrome API usage across files
 */
function buildChromeApiUsageMap(fileAnalyses) {
  const apiMap = {}

  for (const [path, analysis] of Object.entries(fileAnalyses)) {
    // JavaScript file Chrome APIs
    if (analysis.imports && analysis.imports.chromeApis) {
      for (const api of analysis.imports.chromeApis) {
        if (!apiMap[api]) {
          apiMap[api] = []
        }
        if (!apiMap[api].includes(path)) {
          apiMap[api].push(path)
        }
      }
    }

    // Chrome event handlers
    if (analysis.eventHandlers && analysis.eventHandlers.chrome) {
      for (const handler of analysis.eventHandlers.chrome) {
        // Extract API from handler (e.g., "runtime.onMessage.addListener" -> "runtime.onMessage")
        const parts = handler.split('.')
        if (parts.length >= 2) {
          const api = `${parts[0]}.${parts[1]}`
          if (!apiMap[api]) {
            apiMap[api] = []
          }
          if (!apiMap[api].includes(path)) {
            apiMap[api].push(path)
          }
        }
      }
    }
  }

  return apiMap
}

/**
 * Analyzes message flow between files
 */
function analyzeMessageFlow(fileAnalyses) {
  const messageFlow = {
    senders: [],
    receivers: []
  }

  for (const [path, analysis] of Object.entries(fileAnalyses)) {
    if (analysis.eventHandlers && analysis.eventHandlers.messageHandlers) {
      const handlers = analysis.eventHandlers.messageHandlers

      // Senders
      if (handlers.senders && handlers.senders.length > 0) {
        messageFlow.senders.push({
          file: path,
          methods: handlers.senders,
          context: analysis.chromeContext || inferContextFromPath(path)
        })
      }

      // Receivers
      if (handlers.receivers && handlers.receivers.length > 0) {
        messageFlow.receivers.push({
          file: path,
          methods: handlers.receivers,
          context: analysis.chromeContext || inferContextFromPath(path)
        })
      }
    }
  }

  return messageFlow
}

/**
 * Resolves an import path relative to the importing file
 */
function resolveImportPath(fromPath, importPath) {
  // Skip external packages
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return null
  }

  // Handle absolute paths
  if (importPath.startsWith('/')) {
    return importPath.slice(1)  // Remove leading slash
  }

  // Handle relative paths
  const fromParts = fromPath.split('/')
  fromParts.pop()  // Remove filename

  const importParts = importPath.split('/')

  for (const part of importParts) {
    if (part === '..') {
      fromParts.pop()
    } else if (part !== '.') {
      fromParts.push(part)
    }
  }

  let resolved = fromParts.join('/')

  // Add .js extension if not present (common in ES6 imports)
  if (!resolved.includes('.')) {
    resolved += '.js'
  }

  return resolved
}

/**
 * Infers Chrome context from file path
 */
function inferContextFromPath(path) {
  const normalizedPath = path.toLowerCase()

  if (normalizedPath.includes('background') || normalizedPath.includes('service_worker')) {
    return 'background'
  }
  if (normalizedPath.includes('popup')) {
    return 'popup'
  }
  if (normalizedPath.includes('content')) {
    return 'content'
  }
  if (normalizedPath.includes('options')) {
    return 'options'
  }
  if (normalizedPath.includes('sidepanel')) {
    return 'sidepanel'
  }

  return null
}
