"use client"

// Simple markdown parser for basic formatting
const parseMarkdown = (text) => {
  if (!text) return text
  
  
  // Convert markdown to HTML
  let html = text
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mb-2 text-white border-b border-slate-600 pb-1">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mb-3 text-white border-b border-slate-600 pb-1">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4 text-white border-b border-slate-600 pb-1">$1</h1>')
    
    // Bold and italic - debug each step
    .replace(/\*\*([^*]+)\*\*/g, (match, p1) => {
      return '<strong class="font-semibold text-white">' + p1 + '</strong>'
    })
    .replace(/\*([^*]+)\*/g, (match, p1) => {
      return '<em class="italic text-slate-300">' + p1 + '</em>'
    })
    
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-800 border border-slate-600 rounded-lg p-3 my-3 overflow-x-auto"><code class="text-sm text-green-400 font-mono">$1</code></pre>')
    
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-slate-800 px-2 py-1 rounded text-sm text-green-400 font-mono border border-slate-600">$1</code>')
    
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline transition-colors">$1</a>')
    
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-purple-500 pl-4 py-2 my-3 bg-purple-500/10 italic text-slate-300">$1</blockquote>')
    
    // Lists
    .replace(/^\* (.*$)/gim, '<li class="ml-4 mb-1">• $1</li>')
    .replace(/^- (.*$)/gim, '<li class="ml-4 mb-1">• $1</li>')
    .replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4 mb-1">$1. $2</li>')
    
    // Line breaks
    .replace(/\n/g, '<br />')
    
    // Wrap lists in ul/ol tags (simple approach)
    .replace(/(<li.*<\/li>)/g, '<ul class="list-none space-y-1 my-3">$1</ul>')
    
    // Clean up multiple ul tags
    .replace(/<\/ul>\s*<ul[^>]*>/g, '')
    
    // Paragraphs (simple approach)
    .replace(/([^<]+)(?=<br \/>|$)/g, '<p class="mb-3 leading-relaxed">$1</p>')
    
    // Clean up empty paragraphs
    .replace(/<p class="mb-3 leading-relaxed"><br \/><\/p>/g, '')
    .replace(/<p class="mb-3 leading-relaxed"><\/p>/g, '')
    
    // Clean up multiple br tags
    .replace(/(<br \/>\s*){2,}/g, '<br />')
    
    // Clean up leading/trailing br tags
    .replace(/^(<br \/>\s*)+/, '')
    .replace(/(<br \/>\s*)+$/, '')
  
  return html
}

// Markdown message component
export default function MarkdownMessage({ content }) {
  const html = parseMarkdown(content)
  
  // Temporary test - hardcode the expected output
  const testHtml = content.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
  
  return (
    <div 
      className="text-sm prose prose-invert max-w-none"
      style={{
        '--tw-prose-body': 'rgb(203 213 225)',
        '--tw-prose-headings': 'rgb(255 255 255)',
        '--tw-prose-links': 'rgb(96 165 250)',
        '--tw-prose-bold': 'rgb(255 255 255)',
        '--tw-prose-counters': 'rgb(148 163 184)',
        '--tw-prose-bullets': 'rgb(148 163 184)',
        '--tw-prose-hr': 'rgb(71 85 105)',
        '--tw-prose-quotes': 'rgb(148 163 184)',
        '--tw-prose-quote-borders': 'rgb(71 85 105)',
        '--tw-prose-captions': 'rgb(148 163 184)',
        '--tw-prose-code': 'rgb(34 197 94)',
        '--tw-prose-pre-code': 'rgb(34 197 94)',
        '--tw-prose-pre-bg': 'rgb(30 41 59)',
        '--tw-prose-th-borders': 'rgb(71 85 105)',
        '--tw-prose-td-borders': 'rgb(71 85 105)',
      }}
      dangerouslySetInnerHTML={{ __html: testHtml }}
    />
  )
} 