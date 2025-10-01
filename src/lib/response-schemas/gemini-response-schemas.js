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
 * Selects the appropriate response schema based on frontend type and request type
 * Returns a Gemini Type-based schema object
 * @param {string} frontendType - The frontend type (side_panel, popup, overlay, generic)
 * @param {string} requestType - The request type (NEW_EXTENSION, ADD_TO_EXISTING)
 * @returns {{name: string, schema: any}} The appropriate response schema
 */
export function selectResponseSchema(frontendType, requestType) {
  if (requestType === 'ADD_TO_EXISTING') {
    return FOLLOWUP_EXTENSION_RESPONSE_SCHEMA
  }
  switch (frontendType) {
    case 'side_panel':
      return SIDEPANEL_EXTENSION_RESPONSE_SCHEMA
    case 'popup':
      return POPUP_EXTENSION_RESPONSE_SCHEMA
    case 'overlay':
      return OVERLAY_EXTENSION_RESPONSE_SCHEMA
    case 'generic':
    default:
      return GENERIC_EXTENSION_RESPONSE_SCHEMA
  }
}
