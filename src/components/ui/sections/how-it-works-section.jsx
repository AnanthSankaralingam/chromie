"use client"

import { useRef, useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Play } from "lucide-react"

const DEMO_VIDEO_URL = "https://www.youtube.com/watch?v=jg2oDxsKay0"

function getYouTubeEmbedUrl(url, showControls = true) {
  let videoId = null
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.replace("/", "")
    } else {
      videoId = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop()
    }
  } catch {}
  if (!videoId) return null
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    ...(showControls ? { controls: "1" } : {}),
  })
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
}

export default function HowItWorksSection() {
  const containerRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const embedUrl = getYouTubeEmbedUrl(DEMO_VIDEO_URL)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "80px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="how-it-works" className="relative z-10 px-6 pb-16 md:pb-20">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 md:mb-12"
        >
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-3">
            how it works
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
            from idea to extension in minutes
          </h2>
          <p className="text-sm md:text-base text-zinc-400 max-w-xl mx-auto">
            describe your extension. test it in the app. download, share or publish.
          </p>
        </motion.div>

        {/* Video Demo */}
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="relative w-full rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0f1117] aspect-video">
            {isVisible && embedUrl ? (
              <iframe
                title="chromie demo"
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f1117]">
                <div className="w-16 h-16 rounded-full bg-white/[0.06] flex items-center justify-center mb-4">
                  <Play className="w-8 h-8 text-zinc-400 ml-1" />
                </div>
                <p className="text-sm text-zinc-600">watch the demo</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
