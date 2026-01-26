/**
 * CSS file analyzer
 * Extracts selectors, media queries, animations, variables, imports, and fonts
 */

import {
  CSS_CLASS_SELECTOR,
  CSS_ID_SELECTOR,
  CSS_MEDIA_QUERY,
  CSS_KEYFRAMES,
  CSS_ANIMATION,
  CSS_IMPORT,
  CSS_FONT_FACE,
  CSS_FONT_FAMILY
} from '../utils/regex-patterns.js'

/**
 * Analyzes a CSS file
 * @param {string} content - File content
 * @param {string} path - File path
 * @returns {Object} Analysis result
 */
export function analyzeCss(content, path) {
  const result = {
    selectors: extractSelectors(content),
    mediaQueries: extractMediaQueries(content),
    animations: extractAnimations(content),
    imports: extractImports(content),
    fonts: extractFonts(content)
  }

  return result
}

/**
 * Extracts selectors (class, ID, element)
 */
function extractSelectors(content) {
  const selectors = {
    classes: [],
    ids: [],
    elementCount: 0
  }

  // Remove comments to avoid false positives
  const cleanContent = removeComments(content)

  // Class selectors
  let match
  const classPattern = new RegExp(CSS_CLASS_SELECTOR.source, 'g')
  while ((match = classPattern.exec(cleanContent)) !== null) {
    if (!selectors.classes.includes(match[1])) {
      selectors.classes.push(match[1])
    }
  }

  // ID selectors
  const idPattern = new RegExp(CSS_ID_SELECTOR.source, 'g')
  while ((match = idPattern.exec(cleanContent)) !== null) {
    if (!selectors.ids.includes(match[1])) {
      selectors.ids.push(match[1])
    }
  }

  // Count rule blocks as rough element selector estimate
  const ruleBlocks = cleanContent.match(/\{[^}]*\}/g) || []
  selectors.elementCount = ruleBlocks.length

  return selectors
}

/**
 * Extracts media queries
 */
function extractMediaQueries(content) {
  const mediaQueries = []
  const cleanContent = removeComments(content)

  let match
  const mediaPattern = new RegExp(CSS_MEDIA_QUERY.source, 'g')
  while ((match = mediaPattern.exec(cleanContent)) !== null) {
    const query = match[1].trim()
    if (!mediaQueries.includes(query)) {
      mediaQueries.push(query)
    }
  }

  return mediaQueries
}

/**
 * Extracts animations and keyframes
 */
function extractAnimations(content) {
  const animations = {
    keyframes: [],
    usages: []
  }
  const cleanContent = removeComments(content)

  // Keyframe definitions
  let match
  const keyframesPattern = new RegExp(CSS_KEYFRAMES.source, 'g')
  while ((match = keyframesPattern.exec(cleanContent)) !== null) {
    if (!animations.keyframes.includes(match[1])) {
      animations.keyframes.push(match[1])
    }
  }

  // Animation usages
  const animationPattern = new RegExp(CSS_ANIMATION.source, 'g')
  while ((match = animationPattern.exec(cleanContent)) !== null) {
    const animationValue = match[1].trim()
    // Extract animation name (first word before any timing/duration)
    const animationName = animationValue.split(/\s+/)[0]
    if (animationName && !animations.usages.includes(animationName)) {
      animations.usages.push(animationName)
    }
  }

  return animations
}

/**
 * Extracts CSS custom properties (variables)
 */
function extractVariables(content) {
  const variables = {
    declarations: [],
    usages: []
  }
  const cleanContent = removeComments(content)

  // Variable declarations
  let match
  const declPattern = new RegExp(CSS_VAR_DECLARATION.source, 'g')
  while ((match = declPattern.exec(cleanContent)) !== null) {
    if (!variables.declarations.includes(match[1])) {
      variables.declarations.push(match[1])
    }
  }

  // Variable usages
  const usagePattern = new RegExp(CSS_VAR_USAGE.source, 'g')
  while ((match = usagePattern.exec(cleanContent)) !== null) {
    if (!variables.usages.includes(match[1])) {
      variables.usages.push(match[1])
    }
  }

  return variables
}

/**
 * Extracts @import statements
 */
function extractImports(content) {
  const imports = []
  const cleanContent = removeComments(content)

  let match
  const importPattern = new RegExp(CSS_IMPORT.source, 'g')
  while ((match = importPattern.exec(cleanContent)) !== null) {
    imports.push(match[1])
  }

  return imports
}

/**
 * Extracts font declarations
 */
function extractFonts(content) {
  const fonts = {
    fontFaces: [],
    families: []
  }
  const cleanContent = removeComments(content)

  // @font-face declarations
  let match
  const fontFacePattern = new RegExp(CSS_FONT_FACE.source, 'g')
  while ((match = fontFacePattern.exec(cleanContent)) !== null) {
    const fontFaceContent = match[1]
    const familyMatch = fontFaceContent.match(CSS_FONT_FAMILY)
    if (familyMatch) {
      const familyName = familyMatch[1].trim().replace(/['"]/g, '')
      if (!fonts.fontFaces.includes(familyName)) {
        fonts.fontFaces.push(familyName)
      }
    }
  }

  // font-family usages (outside @font-face)
  const familyPattern = new RegExp(CSS_FONT_FAMILY.source, 'g')
  while ((match = familyPattern.exec(cleanContent)) !== null) {
    const families = match[1].split(',').map(f => f.trim().replace(/['"]/g, ''))
    for (const family of families) {
      if (family && !fonts.families.includes(family) && !fonts.fontFaces.includes(family)) {
        fonts.families.push(family)
      }
    }
  }

  return fonts
}

/**
 * Removes CSS comments
 */
function removeComments(content) {
  return content.replace(/\/\*[\s\S]*?\*\//g, '')
}
