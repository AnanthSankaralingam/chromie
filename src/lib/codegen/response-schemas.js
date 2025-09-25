// Follow-up extension schema (all files optional except explanation + manifest.json)
export const FOLLOWUP_EXTENSION_RESPONSE_SCHEMA = {
    name: "extension_implementation",
    schema: {
      type: "object",
      properties: {
        explanation: { type: "string" },
        "manifest.json": { type: "string" },
        "background.js": { type: "string" },
        "content.js": { type: "string" },
        "popup.html": { type: "string" },
        "popup.js": { type: "string" },
        "sidepanel.html": { type: "string" },
        "sidepanel.js": { type: "string" },
        "overlay.html": { type: "string" },
        "overlay.js": { type: "string" },
        "styles.css": { type: "string" }
      },
      required: [
        "explanation",
        "manifest.json",
        "background.js",
        "content.js",
        "popup.html",
        "popup.js",
        "sidepanel.html",
        "sidepanel.js",
        "overlay.html",
        "overlay.js",
        "styles.css"
      ],
      additionalProperties: false // strict, no unknown fields
    }
  }
  
  // Side panel extension schema
  export const SIDEPANEL_EXTENSION_RESPONSE_SCHEMA = {
    name: "extension_implementation",
    schema: {
      type: "object",
      properties: {
        explanation: { type: "string" },
        "manifest.json": { type: "string" },
        "background.js": { type: "string" },
        "content.js": { type: "string" },
        "sidepanel.html": { type: "string" },
        "sidepanel.js": { type: "string" },
        "styles.css": { type: "string" }
      },
      required: [
        "explanation",
        "manifest.json",
        "background.js",
        "content.js",
        "sidepanel.html",
        "sidepanel.js",
        "styles.css"
      ],
      additionalProperties: false
    }
  }
  
  // Popup extension schema
  export const POPUP_EXTENSION_RESPONSE_SCHEMA = {
    name: "extension_implementation",
    schema: {
      type: "object",
      properties: {
        explanation: { type: "string" },
        "manifest.json": { type: "string" },
        "content.js": { type: "string" },
        "background.js": { type: "string" },
        "popup.html": { type: "string" },
        "popup.js": { type: "string" },
        "styles.css": { type: "string" }
      },
      required: [
        "explanation",
        "manifest.json",
        "content.js",
        "background.js",
        "popup.html",
        "popup.js",
        "styles.css"
      ],
      additionalProperties: false
    }
  }
  
  // Overlay extension schema
  export const OVERLAY_EXTENSION_RESPONSE_SCHEMA = {
    name: "extension_implementation",
    schema: {
      type: "object",
      properties: {
        explanation: { type: "string" },
        "manifest.json": { type: "string" },
        "content.js": { type: "string" },
        "background.js": { type: "string" },
        "overlay.html": { type: "string" },
        "overlay.js": { type: "string" },
        "styles.css": { type: "string" }
      },
      required: [
        "explanation",
        "manifest.json",
        "content.js",
        "background.js",
        "overlay.html",
        "overlay.js",
        "styles.css"
      ],
      additionalProperties: false
    }
  }
  
  // Generic extension schema
  export const GENERIC_EXTENSION_RESPONSE_SCHEMA = {
    name: "extension_implementation",
    schema: {
      type: "object",
      properties: {
        explanation: { type: "string" },
        "manifest.json": { type: "string" },
        "background.js": { type: "string" },
        "content.js": { type: "string" },
        "popup.html": { type: "string" },
        "popup.js": { type: "string" },
        "sidepanel.html": { type: "string" },
        "sidepanel.js": { type: "string" },
        "styles.css": { type: "string" }
      },
      required: [
        "explanation",
        "manifest.json",
        "background.js",
        "content.js",
        "popup.html",
        "popup.js",
        "sidepanel.html",
        "sidepanel.js",
        "styles.css"
      ],
      additionalProperties: false
    }
  }
  
  /**
   * Selects the appropriate response schema based on frontend type and request type
   * @param {string} frontendType - The frontend type (side_panel, popup, overlay, generic)
   * @param {string} requestType - The request type (NEW_EXTENSION, ADD_TO_EXISTING)
   * @returns {Object} The appropriate response schema
   */
  export function selectResponseSchema(frontendType, requestType) {
    // For add-to-existing requests, use the followup schema
    if (requestType === 'ADD_TO_EXISTING') {
      return FOLLOWUP_EXTENSION_RESPONSE_SCHEMA
    }
    
    // For new extensions, select based on frontend type
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
  