"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export default function VideoGallery({ videos = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [isApiReady, setIsApiReady] = useState(false)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const playerRef = useRef(null)

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url) => {
    try {
      const urlObj = new URL(url)
      let videoId = ''
      
      if (urlObj.hostname.includes('youtube.com')) {
        videoId = urlObj.searchParams.get('v')
      } else if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1)
      }
      
      return videoId
    } catch (error) {
      console.error('Invalid YouTube URL:', url)
      return null
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

  // Load YouTube IFrame API
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      setIsApiReady(true)
      return
    }

    // Load the API
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)

    // API ready callback
    window.onYouTubeIframeAPIReady = () => {
      setIsApiReady(true)
    }

    return () => {
      window.onYouTubeIframeAPIReady = null
    }
  }, [])

  // Initialize YouTube player when API is ready
  useEffect(() => {
    if (!isApiReady || videos.length === 0) return

    const videoId = getYouTubeVideoId(videos[0])
    if (!videoId) return

    // Only create player if it doesn't exist
    if (!playerRef.current) {
      try {
        playerRef.current = new window.YT.Player('youtube-player', {
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 1,
            modestbranding: 1,
            rel: 0
          },
          events: {
            onReady: () => {
              console.log('YouTube player is ready')
              setIsPlayerReady(true)
            },
            onStateChange: (event) => {
              // YT.PlayerState.ENDED = 0
              if (event.data === 0 && isAutoPlaying && videos.length > 1) {
                console.log('Video ended, moving to next...')
                goToNext()
              }
            },
            onError: (event) => {
              console.error('YouTube player error:', event.data)
            }
          }
        })
      } catch (error) {
        console.error('Error creating YouTube player:', error)
      }
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy()
        } catch (error) {
          console.error('Error destroying YouTube player:', error)
        }
        playerRef.current = null
      }
      setIsPlayerReady(false)
    }
  }, [isApiReady, videos, isAutoPlaying, goToNext])

  // Change video when currentIndex changes
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady || videos.length === 0) return

    const videoId = getYouTubeVideoId(videos[currentIndex])
    if (!videoId) return

    try {
      // Use loadVideoById to change the video without recreating the player
      playerRef.current.loadVideoById({
        videoId: videoId,
        startSeconds: 0
      })
      console.log(`Loading video ${currentIndex + 1}: ${videoId}`)
    } catch (error) {
      console.error('Error loading video:', error)
    }
  }, [currentIndex, videos, isPlayerReady])

  if (!videos || videos.length === 0) {
    return null
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="relative rounded-2xl overflow-hidden bg-slate-800/30 border border-slate-700/40 backdrop-blur-sm shadow-2xl">
        {/* Video Container */}
        <div className="relative aspect-video w-full">
          <div
            id="youtube-player"
            className="w-full h-full"
          />

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
