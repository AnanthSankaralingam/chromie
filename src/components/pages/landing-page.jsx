"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useSession } from '@/components/SessionProviderClient'
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import Image from "next/image"
import VideoGallery from "@/components/ui/video-gallery"

export default function LandingPage() {
  const { user, isLoading } = useSession()
  const router = useRouter()

  // YouTube video URLs for the gallery
  const demoVideos = [
    "https://www.youtube.com/watch?v=zgUaJT1w8uA",
    "https://youtu.be/-lGtGrBPsp0",
    "https://www.youtube.com/watch?v=inC7M0n4Xt4",
    "https://youtu.be/22fHmrF3k3g",
    "https://www.youtube.com/watch?v=d6Bnwys49kY",
    "https://www.youtube.com/watch?v=EkAibSxZ2TU"
  ]

  useEffect(() => {
    // If user is already authenticated, redirect to home
    if (user && !isLoading) {
      router.push('/home')
    }
  }, [user, isLoading, router])

  const handleGetStarted = () => {
    // Redirect to waitlist page
    router.push('/waitlist')
  }

  const handleBookDemo = () => {
    router.push('/book-demo')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-slate-900 to-slate-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0A0A0F] via-[#0F111A] to-[#0A0A0F] text-white relative flex flex-col overflow-x-hidden overflow-y-auto">
      {/* Animated Background */}
      <div className="fixed inset-0 w-full h-full pointer-events-none -z-10">
        <FlickeringGrid
          className="absolute inset-0 z-0"
          squareSize={4}
          gridGap={6}
          color="rgb(156, 163, 175)"
          maxOpacity={0.15}
          flickerChance={2.0}
        />
        
        <motion.div 
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gray-600/15 rounded-full filter blur-[140px] z-10"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute top-1/3 right-1/4 w-[700px] h-[700px] bg-gray-600/15 rounded-full filter blur-[140px] z-10"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-20 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <motion.div 
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Image src="/chromie-logo-1.png" alt="Chromie" width={32} height={32} className="shrink-0" />
          <span className="inline-block text-xl">
            <span className="font-bold bg-gradient-to-r from-gray-400 to-gray-300 bg-clip-text text-transparent">chromie</span>
            <span className="font-normal text-gray-500">.dev</span>
          </span>
        </motion.div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-6 pt-12 pb-20 flex-1">
        <div className="max-w-5xl mx-auto w-full">
          {/* Hero Section */}
          <div className="text-center mb-12">
          {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
            className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-50 mb-3 leading-tight max-w-3xl mx-auto"
            >
              extend reach. not roadmaps.
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.7 }}
              className="text-sm md:text-base text-slate-400 mb-8 max-w-xl mx-auto"
            >
              augment your product suite with a browser extension in seconds.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.7 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-6"
            >
              <div className="flex flex-col items-center gap-2">
                <Button
                  onClick={handleGetStarted}
                  size="lg"
                  variant="ghost"
                  className="text-xs md:text-sm px-6 py-3 rounded-full font-semibold bg-slate-50 text-slate-900 hover:bg-white shadow-lg shadow-slate-500/30 hover:shadow-slate-500/40 transition-all duration-300"
                >
                  join the waitlist
                </Button>
                <span className="text-sm text-slate-400 font-medium">for individuals</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <Button
                  onClick={handleBookDemo}
                  size="lg"
                  variant="ghost"
                  className="text-xs md:text-sm px-6 py-3 rounded-full font-semibold bg-slate-900/60 text-slate-100 border border-slate-600/60 hover:bg-slate-900 hover:border-slate-500/80 shadow-md hover:shadow-lg transition-all duration-300"
                >
                  book a demo
                </Button>
                <span className="text-sm text-slate-400 font-medium">for teams</span>
              </div>
            </motion.div>
          </div>

          {/* Video Gallery */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.7 }}
            className="mb-20"
          >
            <VideoGallery videos={demoVideos} />
          </motion.div>

          {/* Feature Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.7 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto mb-12"
          >
            <div className="p-5 rounded-xl bg-slate-800/20 border border-slate-700/30 backdrop-blur-sm hover:border-gray-500/30 transition-all duration-300">
              <h3 className="text-base font-semibold mb-1.5 text-white">lightning fast</h3>
              <p className="text-xs text-slate-400">generate fully functional extensions in seconds, not weeks</p>
            </div>

            <div className="p-5 rounded-xl bg-slate-800/20 border border-slate-700/30 backdrop-blur-sm hover:border-gray-500/30 transition-all duration-300">
              <h3 className="text-base font-semibold mb-1.5 text-white">no code required</h3>
              <p className="text-xs text-slate-400">just describe what you want, we handle the rest</p>
            </div>

            <div className="p-5 rounded-xl bg-slate-800/20 border border-slate-700/30 backdrop-blur-sm hover:border-gray-500/30 transition-all duration-300">
              <h3 className="text-base font-semibold mb-1.5 text-white">deploy instantly</h3>
              <p className="text-xs text-slate-400">download and publish to chrome web store immediately</p>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 px-6 py-5 border-t border-slate-800/50 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            © 2026 chromie.dev
          </div>

          <div className="flex items-center gap-3 text-xs">
            <a
              href="/privacy"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="https://linkedin.com/company/chromiedev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition-colors"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
