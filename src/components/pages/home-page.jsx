"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"
import { useSession } from '@/components/SessionProviderClient'
import Link from "next/link"
import AppBar from "@/components/ui/app-bars/app-bar"
import HowItWorksSection from "@/components/ui/sections/how-it-works-section"
import BlogSection from "@/components/ui/sections/blog-section"
import PricingSection from "@/components/ui/sections/pricing-section"
import ContactSection from "@/components/ui/sections/contact-section"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import { motion } from "framer-motion"
import FeaturedCreationsSection from "@/components/ui/sections/featured-creations-section"
import { HeroSocialProofBar } from "@/components/ui/hero-social-proof-bar"

const CHROMIE_CHROME_WEB_STORE_URL =
  "https://chromewebstore.google.com/detail/chromiedev/bcnimmmbcdongfkkppoiiangempjmpap"

export default function HomePage() {
  const { isLoading } = useSession()

  // Handle hash navigation (e.g., from /#blog, /#pricing, or /#contact)
  useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash
      const supportedHashes = ['#blog', '#pricing', '#contact', '#featured-creations', '#how-it-works']

      if (supportedHashes.includes(hash)) {
        setTimeout(() => {
          const section = document.getElementById(hash.substring(1))
          if (section) {
            section.scrollIntoView({ behavior: 'smooth' })
          }
        }, 100)
      }
    }

    handleHashScroll()
    window.addEventListener('hashchange', handleHashScroll)
    return () => window.removeEventListener('hashchange', handleHashScroll)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080a0f]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/10 border-t-white/30" />
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-[#080a0f] text-white relative overflow-hidden flex flex-col">
        {/* Header */}
        <AppBar />

        {/* Flickering Grid Background */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <FlickeringGrid
            className="absolute inset-0 z-0"
            squareSize={4}
            gridGap={6}
            color="rgb(156, 163, 175)"
            maxOpacity={0.08}
            flickerChance={2.0}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pt-8 sm:pt-12 pb-8 sm:pb-10 relative z-10">
          <div className="w-full max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              {/* Title Section */}
              <div className="text-center mb-4 sm:mb-6">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.6 }}
                  className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4 leading-[1.05] mx-auto max-w-4xl"
                >
                  build powerful chrome extensions.
                </motion.h1>
                <motion.p
                  className="text-sm md:text-base text-zinc-400 max-w-xl mx-auto mb-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                >
                  automate tasks, extend your product, or build something new.
                </motion.p>
                <motion.p
                  className="flex items-center justify-center gap-2.5 text-xs text-zinc-600 mt-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                >
                  <span>no chrome knowledge needed</span>
                  <span className="text-zinc-700">·</span>
                  <span>integrate any sites and apis</span>
                  <span className="text-zinc-700">·</span>
                  <span>built-in testing</span>
                  <span className="text-zinc-700">·</span>
                  <span>one-click deploy</span>
                </motion.p>
              </div>

              {/* Chrome Web Store + builder */}
              <div className="max-w-3xl mx-auto">
                <motion.div
                  className="flex flex-col items-center"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.35, duration: 0.5 }}
                >
                  <Button
                    asChild
                    size="lg"
                    className="font-medium transition-all duration-200 px-6 py-2.5 rounded-full text-xs md:text-sm bg-white text-[#080a0f] hover:bg-zinc-100"
                  >
                    <a
                      href={CHROMIE_CHROME_WEB_STORE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="start building with chromie — opens chrome web store"
                    >
                      <span className="flex items-center gap-2">
                        start building with chromie
                        <ExternalLink className="w-4 h-4 shrink-0" aria-hidden />
                      </span>
                    </a>
                  </Button>
                  <Link
                    href="/start"
                    className="mt-5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    or visit the full site
                  </Link>
                  <HeroSocialProofBar
                    storeHref={CHROMIE_CHROME_WEB_STORE_URL}
                    className="mt-7"
                  />
                </motion.div>
              </div>

              {/* Trusted by — inline social proof */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55, duration: 0.6 }}
                className="flex flex-col items-center gap-4 pt-6"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">trusted by</p>
                <div className="flex items-center justify-center gap-16 md:gap-24">
                  <a href="https://www.youtube.com/watch?v=SCteMclpA38" target="_blank" rel="noopener noreferrer" className="opacity-75 hover:opacity-100 transition-opacity">
                    <img src="/promptly-logo-128.png" alt="Promptly AI" className="h-8 md:h-10 object-contain" style={{ mixBlendMode: "screen" }} />
                  </a>
                  <a href="https://chromewebstore.google.com/detail/omnispeech-ai-deepfake-de/fdaalloapkmfoeelgbhdedlbiplcoahp/" target="_blank" rel="noopener noreferrer" className="opacity-75 hover:opacity-100 transition-opacity">
                    <img src="/omnispeech_logo.png" alt="Omnispeech" className="h-8 md:h-10 object-contain" style={{ mixBlendMode: "screen" }} />
                  </a>
                  <a href="https://chromewebstore.google.com/detail/ionrouter-by-cumulus-labs/pdfigecoikombaefidghfheahgipepoc" target="_blank" rel="noopener noreferrer" className="opacity-75 hover:opacity-100 transition-opacity">
                    <img src="/ion-logo-128.jpeg" alt="ION" className="h-8 md:h-10 object-contain" style={{ mixBlendMode: "screen" }} />
                  </a>
                  <a href="https://qtr.ai/" target="_blank" rel="noopener noreferrer" className="opacity-75 hover:opacity-100 transition-opacity">
                    <img src="/QTR-Logo.png" alt="QTR" className="h-8 md:h-10 object-contain" style={{ mixBlendMode: "screen", filter: "brightness(0) invert(1)" }} />
                  </a>
                </div>
              </motion.div>

            </motion.div>
          </div>
        </main>

        {/* Featured Creations Section */}
        <FeaturedCreationsSection limit={3} showSeeMore />

        {/* How It Works Section */}
        <HowItWorksSection />

        {/* Pricing Section */}
        <PricingSection />

        {/* Blog Section */}
        <BlogSection />

        {/* Contact Section */}
        <ContactSection />

        {/* Footer */}
        <footer className="relative z-20 px-6 py-5 border-t border-white/[0.06] mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-zinc-600">
              © 2026 chromie.dev
            </div>

            <div className="flex items-center gap-3 text-xs">
              <a
                href="/privacy"
                className="text-zinc-500 hover:text-white transition-colors"
              >
                privacy policy
              </a>
              <a
                href="https://linkedin.com/company/chromie-dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-white transition-colors"
              >
                linkedin
              </a>
            </div>
          </div>
        </footer>

      </div>

    </>
  )
}

