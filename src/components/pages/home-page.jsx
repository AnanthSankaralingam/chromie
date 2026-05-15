"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Chrome, Code2, ExternalLink } from "lucide-react"
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
import { ProductHuntBadge } from "@/components/ui/product-hunt-badge"

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
              <motion.div className="text-center mb-4 sm:mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05, duration: 0.5 }}
                  className="flex justify-center mb-5 sm:mb-6"
                >
                  <ProductHuntBadge />
                </motion.div>
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
              </motion.div>

              {/* Chrome Web Store + builder */}
              <div className="max-w-3xl mx-auto">
                <motion.div
                  className="flex flex-col items-center"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.35, duration: 0.5 }}
                >
                  <div className="grid w-full max-w-2xl grid-cols-2 gap-7">
                    <Button
                      asChild
                      size="lg"
                      className="group relative h-auto min-h-[108px] overflow-hidden rounded-[1.35rem] border border-white/[0.16] bg-[#0d1017] px-4 py-4 text-left text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_55px_rgba(0,0,0,0.28)] transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-[#111620] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_24px_70px_rgba(0,0,0,0.36)] sm:px-5"
                    >
                      <a
                        href={CHROMIE_CHROME_WEB_STORE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="add chromie to chrome — opens chrome web store"
                        className="flex w-full items-center justify-between gap-3"
                      >
                        <span className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-white/[0.08] blur-2xl transition-opacity duration-300 group-hover:opacity-100" aria-hidden />
                        <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" aria-hidden />
                        <span className="relative z-10 flex min-w-0 items-center gap-3 sm:gap-4">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#080a0f] shadow-[0_10px_30px_rgba(255,255,255,0.12)] transition-transform duration-300 group-hover:scale-105">
                            <Chrome className="h-5 w-5" aria-hidden />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[13px] font-semibold leading-tight tracking-[-0.01em] text-white sm:text-sm">
                              Add to Chrome
                            </span>
                            <span className="mt-1.5 block text-[11px] font-normal leading-snug text-zinc-400 sm:text-xs">
                              for everyday users
                            </span>
                          </span>
                        </span>
                        <ExternalLink className="relative z-10 h-4 w-4 shrink-0 text-zinc-500 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" aria-hidden />
                      </a>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      className="group relative h-auto min-h-[108px] overflow-hidden rounded-[1.35rem] border border-white/[0.16] bg-[#0d1017] px-4 py-4 text-left text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_55px_rgba(0,0,0,0.28)] transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-[#111620] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_24px_70px_rgba(0,0,0,0.36)] sm:px-5"
                    >
                      <Link
                        href="/start"
                        aria-label="start building a chrome extension"
                        className="flex w-full items-center justify-between gap-3"
                      >
                        <span className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-cyan-400/[0.08] blur-2xl transition-opacity duration-300 group-hover:opacity-100" aria-hidden />
                        <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" aria-hidden />
                        <span className="relative z-10 flex min-w-0 items-center gap-3 sm:gap-4">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/[0.18] bg-cyan-200/[0.08] text-cyan-100 shadow-[0_10px_30px_rgba(34,211,238,0.08)] transition-transform duration-300 group-hover:scale-105">
                            <Code2 className="h-5 w-5" aria-hidden />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[13px] font-semibold leading-tight tracking-[-0.01em] text-white sm:text-sm">
                              Start building
                            </span>
                            <span className="mt-1.5 block text-[11px] font-normal leading-snug text-zinc-400 sm:text-xs">
                              for extension devs
                            </span>
                          </span>
                        </span>
                        <ArrowRight className="relative z-10 h-4 w-4 shrink-0 text-zinc-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white" aria-hidden />
                      </Link>
                    </Button>
                  </div>
                  <p className="mt-4 max-w-xl text-center text-xs text-zinc-500">
                    use the extension today, or build a full top-to-bottom extension you can deploy to the webstore.
                  </p>
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
                className="flex flex-col items-center gap-4 pt-12 sm:pt-16"
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

