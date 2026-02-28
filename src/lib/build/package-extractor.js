/**
 * Package extractor — detects npm package imports from JavaScript source code
 * Classifies import specifiers and extracts bare module names
 */

import { validatePackages } from './package-whitelist.js'

/**
 * Classify an import specifier into its type
 * @param {string} specifier - Import path (e.g. './foo', 'lodash', 'chrome.storage', 'https://...')
 * @returns {'local' | 'chrome_api' | 'npm_package' | 'url'}
 */
export function classifyImport(specifier) {
  if (!specifier || typeof specifier !== 'string') return 'local'

  // Relative/absolute local paths
  if (specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/')) {
    return 'local'
  }

  // URLs
  if (specifier.startsWith('http://') || specifier.startsWith('https://') || specifier.startsWith('data:')) {
    return 'url'
  }

  // Chrome API references (rare in import statements, but possible)
  if (specifier.startsWith('chrome.') || specifier === 'chrome') {
    return 'chrome_api'
  }

  // Everything else is a bare module specifier → npm package
  return 'npm_package'
}

/**
 * Extract the root package name from a specifier, stripping subpaths
 * 'lodash/get' → 'lodash'
 * '@scope/pkg/sub' → '@scope/pkg'
 * @param {string} specifier
 * @returns {string}
 */
function getRootPackageName(specifier) {
  if (specifier.startsWith('@')) {
    // Scoped package: @scope/name/sub → @scope/name
    const parts = specifier.split('/')
    return parts.slice(0, 2).join('/')
  }
  // Regular package: name/sub → name
  return specifier.split('/')[0]
}

// Regex patterns for import detection
// Note: ES6_IMPORT_RE uses a simple `from 'module'` match to avoid catastrophic
// backtracking from nested quantifiers on large/minified files.
const ES6_IMPORT_RE = /\bfrom\s+['"]([^'"]+)['"]/g
const ES6_SIDE_EFFECT_RE = /\bimport\s+['"]([^'"]+)['"]/g
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
const COMMONJS_REQUIRE_RE = /(?:^|[^.\w])require\s*\(\s*['"]([^'"]+)['"]\s*\)/g

/**
 * Extract npm package names from JavaScript source content
 * Handles ES6 imports, dynamic import(), and require()
 * @param {string} jsContent - JavaScript source code
 * @returns {string[]} Deduplicated list of npm package root names
 */
function extractNpmImports(jsContent) {
  if (!jsContent || typeof jsContent !== 'string') return []

  const npmPackages = new Set()

  const patterns = [ES6_IMPORT_RE, ES6_SIDE_EFFECT_RE, DYNAMIC_IMPORT_RE, COMMONJS_REQUIRE_RE]

  for (const basePattern of patterns) {
    const pattern = new RegExp(basePattern.source, basePattern.flags)
    let match
    while ((match = pattern.exec(jsContent)) !== null) {
      const specifier = match[1]
      if (classifyImport(specifier) === 'npm_package') {
        npmPackages.add(getRootPackageName(specifier))
      }
    }
  }

  return Array.from(npmPackages)
}

/**
 * Extract npm imports from all JS files in a project
 * @param {Record<string, string>} filesMap - Map of file_path → content
 * @returns {string[]} Deduplicated list of npm package root names across all files
 */
function extractNpmImportsFromFiles(filesMap) {
  const allPackages = new Set()

  for (const [filePath, content] of Object.entries(filesMap)) {
    if (!filePath.endsWith('.js') && !filePath.endsWith('.mjs') && !filePath.endsWith('.ts')) continue
    const packages = extractNpmImports(content)
    for (const pkg of packages) {
      allPackages.add(pkg)
    }
  }

  return Array.from(allPackages)
}

/**
 * Resolve project packages by merging plan-suggested and code-detected packages,
 * then validating against the whitelist
 * @param {Array<{name: string, purpose?: string}>} planPackages - Packages suggested by planning phase
 * @param {Record<string, string>} files - Map of file_path → content
 * @returns {{ valid: Array<{name: string, version: string, description: string, use_cases: string[]}>, rejected: string[] }}
 */
export function resolveProjectPackages(planPackages = [], files = {}) {
  // Collect package names from both sources
  const planNames = (planPackages || []).map(p => p.name || p).filter(Boolean)
  const codeNames = extractNpmImportsFromFiles(files)

  // Merge and deduplicate
  const allNames = [...new Set([...planNames, ...codeNames])]

  // Validate against whitelist
  return validatePackages(allNames)
}
