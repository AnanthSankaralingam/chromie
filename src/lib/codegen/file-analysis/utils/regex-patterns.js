/**
 * Shared regex patterns for file analysis
 */

// ES6 import patterns
export const ES6_IMPORT = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*\s*from\s*['"]([^'"]+)['"]/g
export const ES6_IMPORT_SIDE_EFFECT = /import\s+['"]([^'"]+)['"]/g
export const DYNAMIC_IMPORT = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g

// Export patterns
export const NAMED_EXPORT = /export\s+(?:const|let|var|function|class|async\s+function)\s+(\w+)/g
export const DEFAULT_EXPORT = /export\s+default\s+(?:function\s+)?(\w+)?/g
export const EXPORT_FROM = /export\s+(?:\{[^}]*\}|\*)\s+from\s+['"]([^'"]+)['"]/g

// Function patterns
export const FUNCTION_DECLARATION = /(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g
export const ARROW_FUNCTION = /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g
export const METHOD_DEFINITION = /(\w+)\s*\([^)]*\)\s*\{/g

// Class patterns
export const CLASS_DECLARATION = /class\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{/g
export const CLASS_METHOD = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/g

// Chrome API patterns
export const CHROME_API = /chrome\.(\w+)(?:\.(\w+))?(?:\.(\w+))?/g
export const CHROME_LISTENER = /chrome\.(\w+)\.(\w+)\.addListener\s*\(/g
export const CHROME_STORAGE = /chrome\.storage\.(sync|local|session)\.(\w+)/g
export const CHROME_MESSAGE = /chrome\.runtime\.(sendMessage|onMessage|connect|onConnect)/g
export const CHROME_TABS_MESSAGE = /chrome\.tabs\.sendMessage/g

// DOM event patterns
export const DOM_EVENT_LISTENER = /(?:addEventListener|on\w+)\s*\(\s*['"](\w+)['"]/g
export const DOCUMENT_READY = /(?:DOMContentLoaded|document\.ready|window\.onload)/g

// Variable declarations
export const CONST_DECLARATION = /const\s+(\w+)\s*=/g
export const LET_DECLARATION = /let\s+(\w+)\s*=/g
export const VAR_DECLARATION = /var\s+(\w+)\s*=/g

// HTML patterns
export const HTML_SCRIPT_TAG = /<script([^>]*)>([^<]*)<\/script>/gi
export const HTML_SCRIPT_SRC = /src\s*=\s*['"]([^'"]+)['"]/i
export const HTML_SCRIPT_TYPE = /type\s*=\s*['"]([^'"]+)['"]/i
export const HTML_STYLE_TAG = /<style([^>]*)>([^<]*)<\/style>/gi
export const HTML_LINK_STYLESHEET = /<link[^>]+rel\s*=\s*['"]stylesheet['"][^>]*>/gi
export const HTML_LINK_HREF = /href\s*=\s*['"]([^'"]+)['"]/i
export const HTML_ID_ATTR = /id\s*=\s*['"]([^'"]+)['"]/gi
export const HTML_CLASS_ATTR = /class\s*=\s*['"]([^'"]+)['"]/gi
export const HTML_DATA_ATTR = /data-(\w+(?:-\w+)*)\s*=\s*['"]([^'"]+)['"]/gi
export const HTML_FORM = /<form[^>]*>/gi
export const HTML_BUTTON = /<button[^>]*>([^<]*)<\/button>/gi
export const HTML_INPUT = /<input[^>]*>/gi
export const HTML_ANCHOR = /<a[^>]*href\s*=\s*['"]([^'"]+)['"][^>]*>/gi
export const HTML_DOCTYPE = /<!DOCTYPE\s+(\w+)/i
export const HTML_CSP_META = /<meta[^>]+http-equiv\s*=\s*['"]Content-Security-Policy['"][^>]*>/gi
export const HTML_CSP_CONTENT = /content\s*=\s*['"]([^'"]+)['"]/i

// CSS patterns
export const CSS_CLASS_SELECTOR = /\.([a-zA-Z_][\w-]*)/g
export const CSS_ID_SELECTOR = /#([a-zA-Z_][\w-]*)/g
export const CSS_ELEMENT_SELECTOR = /(?:^|[\s,{}>+~])([a-zA-Z][\w-]*)(?=[^}]*\{)/g
export const CSS_MEDIA_QUERY = /@media\s+([^{]+)\{/g
export const CSS_KEYFRAMES = /@keyframes\s+(\w+)/g
export const CSS_ANIMATION = /animation(?:-name)?\s*:\s*([^;]+)/g
export const CSS_VAR_DECLARATION = /--([a-zA-Z_][\w-]*)\s*:/g
export const CSS_VAR_USAGE = /var\s*\(\s*--([a-zA-Z_][\w-]*)/g
export const CSS_IMPORT = /@import\s+(?:url\s*\(\s*)?['"]([^'"]+)['"]\s*\)?/g
export const CSS_FONT_FACE = /@font-face\s*\{([^}]*)\}/g
export const CSS_FONT_FAMILY = /font-family\s*:\s*['"]?([^;'"]+)['"]?/g

// Special patterns
export const IIFE = /\(\s*(?:async\s+)?function\s*\([^)]*\)\s*\{|\(\s*\([^)]*\)\s*=>\s*\{/g
export const USE_STRICT = /['"]use strict['"]/g
export const SERVICE_WORKER_SELF = /self\.(addEventListener|postMessage|clients)/g

// JSON structure detection
export const JSON_ARRAY_START = /^\s*\[/
export const JSON_OBJECT_START = /^\s*\{/

// Common Chrome extension manifest fields
export const MANIFEST_FIELDS = [
  'manifest_version',
  'name',
  'version',
  'description',
  'permissions',
  'host_permissions',
  'background',
  'action',
  'content_scripts',
  'web_accessible_resources',
  'icons',
  'side_panel',
  'options_page',
  'options_ui',
  'chrome_url_overrides'
]
