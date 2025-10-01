"use client"

// Markdown message component with adaptive typing
import { useEffect, useMemo, useRef, useState } from "react"
import { parseMarkdown } from "./markdown-parser"

export default function MarkdownMessage({ content, typingCancelSignal }) {
  const fullHtml = useMemo(() => parseMarkdown(content), [content])
  const [displayHtml, setDisplayHtml] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const timerRef = useRef(null)
  const indexRef = useRef(0)
  const tokensRef = useRef([])

  // Tokenize by sentence first, then by words to allow adaptive batching
  const tokenize = (text) => {
    const sentences = text.split(/(?<=[.!?])\s+/)
    const result = []
    for (const s of sentences) {
      const parts = s.split(/(\s+)/)
      for (const p of parts) {
        if (p) result.push(p)
      }
      result.push(" ")
    }
    return result
  }

  // Start typing effect whenever content changes
  useEffect(() => {
    // Cancel any previous timers
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const html = parseMarkdown(content)
    const raw = content || ""
    // If content contains formatting (markdown or HTML), render immediately to avoid partial tag artifacts
    const hasFormatting = /[`*_#>\[\]\(\)]|<[^>]+>/m.test(raw)
    if (hasFormatting) {
      setIsTyping(false)
      setDisplayHtml(html)
      return
    }
    tokensRef.current = tokenize(raw)
    indexRef.current = 0
    setDisplayHtml("")
    setIsTyping(false)

    const step = () => {
      // Adaptive batch size: grow with message length
      const total = tokensRef.current.length
      const base = total < 40 ? 1 : total < 120 ? 2 : total < 250 ? 4 : 6
      const batchSize = base

      const nextIndex = Math.min(indexRef.current + batchSize, total)
      const slice = tokensRef.current.slice(0, nextIndex).join("")
      indexRef.current = nextIndex
      // During typing, render plain text to avoid partial HTML artifacts
      setIsTyping(true)
      setDisplayHtml(slice)

      if (nextIndex < total) {
        // Interval adapts slightly with size: shorter delays for longer texts
        const delay = total < 40 ? 35 : total < 120 ? 22 : total < 250 ? 16 : 12
        timerRef.current = setTimeout(step, delay)
      } else {
        setIsTyping(false)
        setDisplayHtml(html)
      }
    }

    // For very short strings, render immediately
    if ((content || "").length <= 3) {
      setDisplayHtml(html)
      return
    }

    timerRef.current = setTimeout(step, 10)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [content])

  // Cancel typing immediately on external signal and flush full content
  useEffect(() => {
    if (typingCancelSignal === undefined) return
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setIsTyping(false)
    setDisplayHtml(fullHtml)
  }, [typingCancelSignal, fullHtml])

  return (
    isTyping ? (
      <div className="text-sm whitespace-pre-wrap">{displayHtml}</div>
    ) : (
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
        dangerouslySetInnerHTML={{ __html: displayHtml || fullHtml }}
      />
    )
  )
}