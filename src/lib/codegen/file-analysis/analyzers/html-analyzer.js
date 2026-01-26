/**
 * HTML file analyzer
 * Extracts structure, scripts, styles, interactive elements, and Chrome context
 */

import { inferChromeContext } from '../utils/file-utils.js'
import {
  HTML_SCRIPT_TAG,
  HTML_SCRIPT_SRC,
  HTML_SCRIPT_TYPE,
  HTML_STYLE_TAG,
  HTML_LINK_STYLESHEET,
  HTML_LINK_HREF,
  HTML_ID_ATTR,
  HTML_CLASS_ATTR,
  HTML_DATA_ATTR,
  HTML_FORM,
  HTML_BUTTON,
  HTML_INPUT,
  HTML_ANCHOR,
  HTML_DOCTYPE,
  HTML_CSP_META,
  HTML_CSP_CONTENT
} from '../utils/regex-patterns.js'

/**
 * Analyzes an HTML file
 * @param {string} content - File content
 * @param {string} path - File path
 * @returns {Object} Analysis result
 */
export function analyzeHtml(content, path) {
  const result = {
    scripts: extractScripts(content),
    styles: extractStyles(content),
    interactiveElements: extractInteractiveElements(content),
    identifiers: extractIdentifiers(content),
    chromeContext: extractChromeContext(content, path)
  }

  return result
}

/**
 * Extracts document structure
 */
function extractStructure(content) {
  const structure = {
    doctype: null,
    hasHead: false,
    hasBody: false,
    headRange: null,
    bodyRange: null
  }

  // DOCTYPE
  const doctypeMatch = content.match(HTML_DOCTYPE)
  if (doctypeMatch) {
    structure.doctype = doctypeMatch[1]
  }

  // Head section
  const headStart = content.indexOf('<head')
  const headEnd = content.indexOf('</head>')
  if (headStart !== -1 && headEnd !== -1) {
    structure.hasHead = true
    structure.headRange = {
      start: getLineNumber(content, headStart),
      end: getLineNumber(content, headEnd)
    }
  }

  // Body section
  const bodyStart = content.indexOf('<body')
  const bodyEnd = content.indexOf('</body>')
  if (bodyStart !== -1 && bodyEnd !== -1) {
    structure.hasBody = true
    structure.bodyRange = {
      start: getLineNumber(content, bodyStart),
      end: getLineNumber(content, bodyEnd)
    }
  }

  return structure
}

/**
 * Extracts script information
 */
function extractScripts(content) {
  const scripts = {
    external: [],
    inline: [],
    modules: []
  }

  let match
  const scriptPattern = new RegExp(HTML_SCRIPT_TAG.source, 'gi')

  while ((match = scriptPattern.exec(content)) !== null) {
    const attributes = match[1]
    const inlineContent = match[2]

    // Check for src attribute
    const srcMatch = attributes.match(HTML_SCRIPT_SRC)
    const typeMatch = attributes.match(HTML_SCRIPT_TYPE)
    const isModule = typeMatch && typeMatch[1] === 'module'

    if (srcMatch) {
      const scriptInfo = {
        src: srcMatch[1],
        isModule
      }

      if (isModule) {
        scripts.modules.push(srcMatch[1])
      }
      scripts.external.push(scriptInfo)
    } else if (inlineContent && inlineContent.trim()) {
      scripts.inline.push({
        lineCount: inlineContent.split('\n').length,
        isModule,
        preview: inlineContent.trim().substring(0, 100)
      })
    }
  }

  return scripts
}

/**
 * Extracts style information
 */
function extractStyles(content) {
  const styles = {
    external: [],
    inline: []
  }

  // External stylesheets
  let match
  const linkPattern = new RegExp(HTML_LINK_STYLESHEET.source, 'gi')
  while ((match = linkPattern.exec(content)) !== null) {
    const hrefMatch = match[0].match(HTML_LINK_HREF)
    if (hrefMatch) {
      styles.external.push(hrefMatch[1])
    }
  }

  // Inline styles
  const stylePattern = new RegExp(HTML_STYLE_TAG.source, 'gi')
  while ((match = stylePattern.exec(content)) !== null) {
    const styleContent = match[2]
    if (styleContent && styleContent.trim()) {
      styles.inline.push({
        lineCount: styleContent.split('\n').length,
        preview: styleContent.trim().substring(0, 100)
      })
    }
  }

  return styles
}

/**
 * Extracts interactive elements
 */
function extractInteractiveElements(content) {
  const elements = {
    forms: [],
    buttons: [],
    inputs: [],
    links: []
  }

  // Forms
  const formPattern = new RegExp(HTML_FORM.source, 'gi')
  let formCount = 0
  while (formPattern.exec(content) !== null) {
    formCount++
  }
  if (formCount > 0) {
    elements.forms.push({ count: formCount })
  }

  // Buttons
  let match
  const buttonPattern = new RegExp(HTML_BUTTON.source, 'gi')
  while ((match = buttonPattern.exec(content)) !== null) {
    const idMatch = match[0].match(/id\s*=\s*['"]([^'"]+)['"]/i)
    elements.buttons.push({
      text: match[1] ? match[1].trim().substring(0, 50) : '',
      id: idMatch ? idMatch[1] : null
    })
  }

  // Inputs
  const inputPattern = new RegExp(HTML_INPUT.source, 'gi')
  while ((match = inputPattern.exec(content)) !== null) {
    const typeMatch = match[0].match(/type\s*=\s*['"]([^'"]+)['"]/i)
    const idMatch = match[0].match(/id\s*=\s*['"]([^'"]+)['"]/i)
    const nameMatch = match[0].match(/name\s*=\s*['"]([^'"]+)['"]/i)

    elements.inputs.push({
      type: typeMatch ? typeMatch[1] : 'text',
      id: idMatch ? idMatch[1] : null,
      name: nameMatch ? nameMatch[1] : null
    })
  }

  // Links (internal/external)
  const anchorPattern = new RegExp(HTML_ANCHOR.source, 'gi')
  while ((match = anchorPattern.exec(content)) !== null) {
    const href = match[1]
    const isExternal = href.startsWith('http://') || href.startsWith('https://')
    elements.links.push({
      href,
      isExternal
    })
  }

  return elements
}

/**
 * Extracts identifiers (IDs, classes, data attributes)
 */
function extractIdentifiers(content) {
  const identifiers = {
    ids: [],
    classes: [],
    dataAttributes: []
  }

  // IDs
  let match
  const idPattern = new RegExp(HTML_ID_ATTR.source, 'gi')
  while ((match = idPattern.exec(content)) !== null) {
    if (!identifiers.ids.includes(match[1])) {
      identifiers.ids.push(match[1])
    }
  }

  // Classes
  const classPattern = new RegExp(HTML_CLASS_ATTR.source, 'gi')
  while ((match = classPattern.exec(content)) !== null) {
    const classList = match[1].split(/\s+/).filter(Boolean)
    for (const cls of classList) {
      if (!identifiers.classes.includes(cls)) {
        identifiers.classes.push(cls)
      }
    }
  }

  // Data attributes
  const dataPattern = new RegExp(HTML_DATA_ATTR.source, 'gi')
  while ((match = dataPattern.exec(content)) !== null) {
    const attrName = `data-${match[1]}`
    if (!identifiers.dataAttributes.includes(attrName)) {
      identifiers.dataAttributes.push(attrName)
    }
  }

  return identifiers
}

/**
 * Extracts Chrome extension context from HTML
 */
function extractChromeContext(content, path) {
  const context = {
    pageType: inferChromeContext(path),
    hasCSP: false,
    cspContent: null
  }

  // Check for CSP meta tag
  const cspPattern = new RegExp(HTML_CSP_META.source, 'gi')
  const cspMatch = cspPattern.exec(content)
  if (cspMatch) {
    context.hasCSP = true
    const contentMatch = cspMatch[0].match(HTML_CSP_CONTENT)
    if (contentMatch) {
      context.cspContent = contentMatch[1]
    }
  }

  return context
}

/**
 * Gets line number from character index
 */
function getLineNumber(content, index) {
  const substring = content.substring(0, index)
  return substring.split('\n').length
}
