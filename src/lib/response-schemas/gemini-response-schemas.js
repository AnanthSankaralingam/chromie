import { Type } from "@google/genai"

function baseFileFields() {
  return {
    explanation: { type: Type.STRING },
    "manifest.json": { type: Type.STRING },
    "background.js": { type: Type.STRING },
    "content.js": { type: Type.STRING },
    "styles.css": { type: Type.STRING }
  }
}

function withPopupFields() {
  return {
    "popup.html": { type: Type.STRING },
    "popup.js": { type: Type.STRING }
  }
}

function withSidepanelFields() {
  return {
    "sidepanel.html": { type: Type.STRING },
    "sidepanel.js": { type: Type.STRING }
  }
}

function withOverlayFields() {
  return {
    "overlay.html": { type: Type.STRING },
    "overlay.js": { type: Type.STRING }
  }
}

function withNewTabFields() {
  return {
    "newtab.html": { type: Type.STRING },
    "newtab.js": { type: Type.STRING }
  }
}

function withContentScriptUIFields() {
  return {}  // Uses base fields only (content.js, styles.css)
}

// Follow-up extension schema (all files optional except explanation + manifest.json)
export const FOLLOWUP_EXTENSION_RESPONSE_SCHEMA = {
  name: "extension_implementation",
  schema: {
    type: Type.OBJECT,
    properties: {
      ...baseFileFields(),
      ...withPopupFields(),
      ...withSidepanelFields(),
      ...withOverlayFields()
    },
    required: [
      "explanation",
      "manifest.json"
    ],
    propertyOrdering: [
      "manifest.json",
      "background.js",
      "content.js",
      "popup.html",
      "popup.js",
      "sidepanel.html",
      "sidepanel.js",
      "overlay.html",
      "overlay.js",
      "styles.css",
      "explanation"
    ]
  }
}

// Side panel extension schema
export const SIDEPANEL_EXTENSION_RESPONSE_SCHEMA = {
  name: "extension_implementation",
  schema: {
    type: Type.OBJECT,
    properties: {
      ...baseFileFields(),
      ...withSidepanelFields()
    },
    required: [
      "explanation",
      "manifest.json"
    ],
    propertyOrdering: [
      "manifest.json",
      "background.js",
      "content.js",
      "sidepanel.html",
      "sidepanel.js",
      "styles.css",
      "explanation"
    ]
  }
}

// Popup extension schema
export const POPUP_EXTENSION_RESPONSE_SCHEMA = {
  name: "extension_implementation",
  schema: {
    type: Type.OBJECT,
    properties: {
      ...baseFileFields(),
      ...withPopupFields()
    },
    required: [
      "explanation",
      "manifest.json"
    ],
    propertyOrdering: [
      "manifest.json",
      "content.js",
      "background.js",
      "popup.html",
      "popup.js",
      "styles.css",
      "explanation"
    ]
  }
}

// Overlay extension schema
export const OVERLAY_EXTENSION_RESPONSE_SCHEMA = {
  name: "extension_implementation",
  schema: {
    type: Type.OBJECT,
    properties: {
      ...baseFileFields(),
      ...withOverlayFields()
    },
    required: [
      "explanation",
      "manifest.json"
    ],
    propertyOrdering: [
      "manifest.json",
      "content.js",
      "background.js",
      "overlay.html",
      "overlay.js",
      "styles.css",
      "explanation"
    ]
  }
}

// New tab extension schema
export const NEW_TAB_EXTENSION_RESPONSE_SCHEMA = {
  name: "extension_implementation",
  schema: {
    type: Type.OBJECT,
    properties: {
      ...baseFileFields(),
      ...withNewTabFields()
    },
    required: [
      "explanation",
      "manifest.json",
      "newtab.html",
      "styles.css"
    ],
    propertyOrdering: [
      "manifest.json",
      "background.js",
      "newtab.html",
      "newtab.js",
      "styles.css",
      "explanation"
    ]
  }
}

// Content script UI extension schema
export const CONTENT_SCRIPT_UI_EXTENSION_RESPONSE_SCHEMA = {
  name: "extension_implementation",
  schema: {
    type: Type.OBJECT,
    properties: {
      ...baseFileFields(),
      ...withContentScriptUIFields()
    },
    required: [
      "explanation",
      "manifest.json",
      "content.js",
      "styles.css"
    ],
    propertyOrdering: [
      "manifest.json",
      "background.js",
      "content.js",
      "styles.css",
      "explanation"
    ]
  }
}

// Generic extension schema
export const GENERIC_EXTENSION_RESPONSE_SCHEMA = {
  name: "extension_implementation",
  schema: {
    type: Type.OBJECT,
    properties: {
      ...baseFileFields(),
      ...withPopupFields(),
      ...withSidepanelFields()
    },
    required: [
      "explanation",
      "manifest.json"
    ],
    propertyOrdering: [
      "manifest.json",
      "background.js",
      "content.js",
      "popup.html",
      "popup.js",
      "sidepanel.html",
      "sidepanel.js",
      "styles.css",
      "explanation"
    ]
  }
}

/**
 * Converts a Gemini Type-based schema to OpenAI-compatible format
 * @param {Object} geminiSchema - Gemini schema object with Type-based properties
 * @returns {Object} OpenAI-compatible schema object
 */
export function convertToOpenAIFormat(geminiSchema) {
  if (!geminiSchema || !geminiSchema.schema) {
    throw new Error('Invalid Gemini schema provided')
  }

  const convertType = (type) => {
    switch (type) {
      case Type.STRING:
        return 'string'
      case Type.NUMBER:
        return 'number'
      case Type.BOOLEAN:
        return 'boolean'
      case Type.OBJECT:
        return 'object'
      case Type.ARRAY:
        return 'array'
      default:
        return 'string' // fallback
    }
  }

  const convertProperties = (properties) => {
    const converted = {}
    for (const [key, value] of Object.entries(properties)) {
      if (value && typeof value === 'object' && value.type) {
        converted[key] = {
          type: convertType(value.type),
          description: value.description || ''
        }
      } else {
        converted[key] = { type: 'string' }
      }
    }
    return converted
  }

  return {
    name: geminiSchema.name,
    schema: {
      type: 'object',
      properties: convertProperties(geminiSchema.schema.properties || {}),
      required: geminiSchema.schema.required || [],
      additionalProperties: false
    }
  }
}

/**
 * Selects the appropriate response schema based on frontend type and request type
 * Returns a Gemini Type-based schema object
 * @param {string} frontendType - The frontend type (side_panel, popup, overlay, new_tab, content_script_ui, generic)
 * @param {string} requestType - The request type (NEW_EXTENSION, ADD_TO_EXISTING)
 * @returns {{name: string, schema: any}} The appropriate response schema
 */
export function selectResponseSchema(frontendType, requestType) {
  if (requestType === 'ADD_TO_EXISTING') {
    return FOLLOWUP_EXTENSION_RESPONSE_SCHEMA
  }
  switch (frontendType) {
    case 'side_panel':
    case 'sidepanel':
      return SIDEPANEL_EXTENSION_RESPONSE_SCHEMA
    case 'popup':
      return POPUP_EXTENSION_RESPONSE_SCHEMA
    case 'overlay':
      return OVERLAY_EXTENSION_RESPONSE_SCHEMA
    case 'new_tab':
    case 'newtab':
      return NEW_TAB_EXTENSION_RESPONSE_SCHEMA
    case 'content_script_ui':
    case 'content-injection':
      return CONTENT_SCRIPT_UI_EXTENSION_RESPONSE_SCHEMA
    case 'generic':
    default:
      return GENERIC_EXTENSION_RESPONSE_SCHEMA
  }
}