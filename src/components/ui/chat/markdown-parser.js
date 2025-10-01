export const parseMarkdown = (text) => {
  if (!text) return text

  // Step 1: normalize raw <br> forms
  let normalized = String(text).replace(/<\s*\/?\s*br\s*\/?\s*>/gi, '<br />')

  // Step 2: escape raw HTML
  normalized = normalized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Step 3: normalize escaped artifacts
  normalized = normalized
    .replace(/&lt;\s*\/?\s*br\s*\/?\s*&gt;/gi, '<br />')
    .replace(/&lt;\s*\/?\s*(strong|code)(?:\s[^&gt;]*)?&gt;/gi, '')

  // Step 4: Markdown replacements
  let html = normalized
    .replace(/^### (.*)$/gim, '<h3 class="text-lg font-semibold mb-2 text-white border-b border-slate-600 pb-1">$1</h3>')
    .replace(/^## (.*)$/gim, '<h2 class="text-xl font-bold mb-3 text-white border-b border-slate-600 pb-1">$1</h2>')
    .replace(/^# (.*)$/gim, '<h1 class="text-2xl font-bold mb-4 text-white border-b border-slate-600 pb-1">$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em class="italic text-slate-300">$1</em>')
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-800 border border-slate-600 rounded-lg p-3 my-3 overflow-x-auto"><code class="text-sm text-green-400 font-mono">$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-800 px-2 py-1 rounded text-sm text-green-400 font-mono border border-slate-600">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline transition-colors">$1</a>')
    .replace(/^> (.*)$/gim, '<blockquote class="border-l-4 border-purple-500 pl-4 py-2 my-3 bg-purple-500/10 italic text-slate-300">$1</blockquote>')
    .replace(/^\* (.*)$/gim, '<li class="ml-4 mb-1">• $1</li>')
    .replace(/^- (.*)$/gim, '<li class="ml-4 mb-1">• $1</li>')
    .replace(/^(\d+)\. (.*)$/gim, '<li class="ml-4 mb-1">$1. $2</li>')

  // Step 5: group list items
  html = html
    .replace(/(<li.*?<\/li>)/g, '<ul class="list-none space-y-1 my-3">$1</ul>')
    .replace(/<\/ul>\s*<ul[^>]*>/g, '')

  // Step 6: split into paragraphs by double line breaks
  const paragraphs = html.split(/\n\s*\n|(<br \/><br \/>)/)
  html = paragraphs
    .map((block) => {
      if (!block || block === '<br /><br />') return ''
      const trimmed = block.trim()
      if (!trimmed) return ''
      // leave block-level elements alone
      if (/^<(h[1-6]|ul|li|pre|blockquote)/i.test(trimmed)) return trimmed
      return `<p class="mb-3 leading-relaxed">${trimmed}</p>`
    })
    .join('')

  // Step 7: final cleanup
  html = html
    .replace(/<p class="mb-3 leading-relaxed"><\/p>/g, '')
    .replace(/&lt;\s*\/?\s*br\s*\/?\s*&gt;/gi, '<br />')
    .replace(/&lt;[^>]*br[^>]*&gt;/gi, '<br />')

  return html
}

// CommonJS export for Node tests
try {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports.parseMarkdown = parseMarkdown
  }
} catch (_) {}
