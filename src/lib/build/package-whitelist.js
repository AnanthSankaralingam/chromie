/**
 * Package whitelist validation service
 * Provides O(1) lookup and validation of npm packages against a curated whitelist
 */

import whitelistData from '@/lib/data/npm-package-whitelist.json'

/** @type {Map<string, {name: string, version: string, description: string, use_cases: string[]}>} */
const whitelistMap = new Map(whitelistData.map(entry => [entry.name, entry]))

/**
 * Check if a package name is on the whitelist
 * @param {string} name - Package name (e.g. 'lodash')
 * @returns {boolean}
 */
export function isWhitelistedPackage(name) {
  return whitelistMap.has(name)
}

/**
 * Get the whitelist entry for a package
 * @param {string} name - Package name
 * @returns {{name: string, version: string, description: string, use_cases: string[]} | null}
 */
export function getWhitelistEntry(name) {
  return whitelistMap.get(name) || null
}

/**
 * Validate an array of package names against the whitelist
 * @param {string[]} names - Package names to validate
 * @returns {{ valid: Array<{name: string, version: string, description: string, use_cases: string[]}>, rejected: string[] }}
 */
export function validatePackages(names) {
  const valid = []
  const rejected = []

  for (const name of names) {
    const entry = whitelistMap.get(name)
    if (entry) {
      valid.push(entry)
    } else {
      rejected.push(name)
    }
  }

  return { valid, rejected }
}

/**
 * Get the whitelist formatted for LLM prompt injection
 * @returns {string}
 */
export function getWhitelistForPrompt() {
  return whitelistData
    .map(entry => `- ${entry.name}`)
    // .map(entry => `- **${entry.name}**: ${entry.description}.`)
    .join('\n')
}

/**
 * Get all whitelisted package names
 * @returns {string[]}
 */
export function getAllWhitelistedNames() {
  return whitelistData.map(entry => entry.name)
}
