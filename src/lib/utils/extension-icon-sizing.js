/**
 * Ensures icon sizing CSS is present in extension files at download/export time.
 * Fallback if codegen didn't include it. PNG icons are 128-512px native; without constraints they render huge.
 */

const ICON_SIZING_CSS = `
/* Chromie: constrain icons - PNGs are 128-512px native */
img.icon, img[src*="icons/"], img[src*="chrome-extension://"] {
  max-width: 24px; max-height: 24px; width: auto; height: auto; object-fit: contain;
}
`

const MARKER = '/* Chromie: constrain icons'

function injectIntoStyles(content) {
  if (typeof content !== 'string') return content
  if (content.includes(MARKER)) return content
  return content.trimEnd() + ICON_SIZING_CSS
}

function injectIntoHtml(content) {
  if (typeof content !== 'string') return content
  if (content.includes(MARKER)) return content
  const style = `<style>${ICON_SIZING_CSS.trim()}</style>`
  return content.replace(/<\/head>/i, style + '\n</head>')
}

const hasIconRefs = (files) =>
  files.some(f => typeof f.content === 'string' && /icons\/[A-Za-z0-9-_]+\.png/i.test(f.content))

const hasCss = (files) =>
  files.some(f => f.file_path === 'styles.css' || f.file_path === 'popup.css')

/**
 * Returns file content with icon sizing injected when needed (only if not already present).
 */
export function getContentWithIconSizing(file, allFiles) {
  if (!hasIconRefs(allFiles)) return file.content

  if (file.file_path === 'styles.css' || file.file_path === 'popup.css') {
    return injectIntoStyles(file.content)
  }
  if (!hasCss(allFiles) && (file.file_path === 'popup.html' || file.file_path === 'sidepanel.html')) {
    return injectIntoHtml(file.content)
  }
  return file.content
}
