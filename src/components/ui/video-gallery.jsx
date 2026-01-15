"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export default function VideoGallery({ videos = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  // Extract YouTube video ID from URL
  const getYouTubeEmbedUrl = (url) => {
    try {
      const urlObj = new URL(url)
      let videoId = ''
      
      if (urlObj.hostname.includes('youtube.com')) {
        videoId = urlObj.searchParams.get('v')
      } else if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1)
      }
      
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1`
    } catch (error) {
      console.error('Invalid YouTube URL:', url)
      return url
    }
  }

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % videos.length)
  }, [videos.length])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + videos.length) % videos.length)
  }

  const goToSlide = (index) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false) // Stop autoplay when manually selecting
  }

  // Auto-advance carousel
  useEffect(() => {
    if (!isAutoPlaying || videos.length <= 1) return

    const interval = setInterval(() => {
      goToNext()
    }, 10000) // Change video every 10 seconds

    return () => clearInterval(interval)
  }, [isAutoPlaying, videos.length, goToNext])

  if (!videos || videos.length === 0) {
    return null
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="relative rounded-2xl overflow-hidden bg-slate-800/30 border border-slate-700/40 backdrop-blur-sm shadow-2xl">
        {/* Video Container */}
        <div className="relative aspect-video w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <iframe
                src={getYouTubeEmbedUrl(videos[currentIndex])}
                title={`Video ${currentIndex + 1}`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows */}
          {videos.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-sm transition-all hover:scale-110 border border-slate-700/50"
                aria-label="Previous video"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-sm transition-all hover:scale-110 border border-slate-700/50"
                aria-label="Next video"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Dots Navigation */}
        {videos.length > 1 && (
          <div className="flex items-center justify-center gap-2 py-4 px-4">
            {videos.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  index === currentIndex
                    ? "w-8 bg-purple-500"
                    : "w-2 bg-slate-600 hover:bg-slate-500"
                )}
                aria-label={`Go to video ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Video Counter */}
      {videos.length > 1 && (
        <div className="text-center mt-4">
          <span className="text-sm text-slate-400">
            {currentIndex + 1} / {videos.length}
          </span>
        </div>
      )}
    </div>
  )
}
