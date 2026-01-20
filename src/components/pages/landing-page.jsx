"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useSession } from '@/components/SessionProviderClient'
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import { Chrome } from "lucide-react"
// import VideoGallery from "@/components/ui/video-gallery" // COMMENTED OUT: Videos taking up too many resources on Vercel

export default function LandingPage() {
  const { user, isLoading } = useSession()
  const router = useRouter()

  /* COMMENTED OUT: Videos taking up too many resources on Vercel
  // YouTube video URLs for the gallery
  const demoVideos = [
    "https://www.youtube.com/watch?v=zgUaJT1w8uA",
    "https://youtu.be/-lGtGrBPsp0",
    "https://www.youtube.com/watch?v=inC7M0n4Xt4",
    "https://youtu.be/22fHmrF3k3g",
    "https://www.youtube.com/watch?v=d6Bnwys49kY",
    "https://www.youtube.com/watch?v=EkAibSxZ2TU"
  ]
  */

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
          color="rgb(139, 92, 246)"
          maxOpacity={0.15}
          flickerChance={2.0}
        />
        
        <motion.div 
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-600/15 rounded-full filter blur-[140px] z-10"
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
          className="absolute top-1/3 right-1/4 w-[700px] h-[700px] bg-blue-600/15 rounded-full filter blur-[140px] z-10"
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
          <Chrome className="w-6 h-6 text-purple-500" />
          <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            chromie
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
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5"
              style={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #A78BFA 50%, #60A5FA 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1.2,
              }}
            >
              extend reach. not roadmaps.
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.7 }}
              className="text-lg md:text-xl text-slate-300 mb-8 font-light"
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
                <div className="relative group p-[2px] rounded-full bg-gradient-to-r from-purple-600 via-purple-500 to-blue-500 hover:from-purple-500 hover:via-purple-400 hover:to-blue-400 transition-all duration-300">
                  <Button
                    onClick={handleGetStarted}
                    size="lg"
                    variant="ghost"
                    className="relative text-sm px-6 py-5 bg-[#0F111A] hover:bg-slate-900 text-white rounded-full font-semibold transition-all duration-300"
                  >
                    join the waitlist
                  </Button>
                </div>
                <span className="text-sm text-slate-400 font-medium">for individuals</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="relative group p-[2px] rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 hover:from-cyan-400 hover:via-blue-400 hover:to-indigo-400 transition-all duration-300">
                  <Button
                    onClick={handleBookDemo}
                    size="lg"
                    variant="ghost"
                    className="relative text-sm px-6 py-5 bg-[#0F111A] hover:bg-slate-900 text-white rounded-full font-semibold transition-all duration-300"
                  >
                    book a demo
                  </Button>
                </div>
                <span className="text-sm text-slate-400 font-medium">for teams</span>
              </div>
            </motion.div>
          </div>

          {/* COMMENTED OUT: Video Gallery - Videos taking up too many resources on Vercel
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.7 }}
            className="mb-20"
          >
            <VideoGallery videos={demoVideos} />
          </motion.div>
          */}

          {/* Feature Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.7 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto mb-12"
          >
            <div className="p-5 rounded-xl bg-slate-800/20 border border-slate-700/30 backdrop-blur-sm hover:border-purple-500/30 transition-all duration-300">
              <h3 className="text-base font-semibold mb-1.5 text-white">lightning fast</h3>
              <p className="text-xs text-slate-400">generate fully functional extensions in seconds, not weeks</p>
            </div>

            <div className="p-5 rounded-xl bg-slate-800/20 border border-slate-700/30 backdrop-blur-sm hover:border-purple-500/30 transition-all duration-300">
              <h3 className="text-base font-semibold mb-1.5 text-white">no code required</h3>
              <p className="text-xs text-slate-400">just describe what you want, we handle the rest</p>
            </div>

            <div className="p-5 rounded-xl bg-slate-800/20 border border-slate-700/30 backdrop-blur-sm hover:border-purple-500/30 transition-all duration-300">
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
              href="https://twitter.com/chromiedev" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Twitter
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
