"use client"

import { Play } from "lucide-react"
import { getDemoEmbedUrl, getDemoThumbnailUrl } from "@/lib/demo-use-cases"

export default function DemoVideoEmbed({
  videoId,
  title,
  engaged = false,
  playKey = 0,
  onEngage,
  className = "absolute inset-0 h-full w-full",
}) {
  if (!engaged) {
    return (
      <button
        type="button"
        onClick={onEngage}
        className={`group relative flex cursor-pointer items-center justify-center overflow-hidden bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${className}`}
        aria-label={`Play ${title}`}
      >
        <img
          src={getDemoThumbnailUrl(videoId)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-90"
        />
        <div className="absolute inset-0 bg-black/35 transition-colors group-hover:bg-black/25" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white shadow-lg backdrop-blur-sm transition-transform group-hover:scale-105">
          <Play className="ml-1 h-7 w-7 fill-current" aria-hidden />
        </span>
      </button>
    )
  }

  return (
    <iframe
      key={`${videoId}-${playKey}`}
      title={title}
      src={getDemoEmbedUrl(videoId, { autoplay: true })}
      className={className}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  )
}
