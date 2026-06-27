"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { BackedByYCombinatorPill } from "@/components/ui/backed-by-y-combinator-pill"
import DemoBrowserMockup from "@/components/ui/landing/demo-browser-mockup"
import HeroUseCaseHeadline from "@/components/ui/landing/hero-use-case-headline"
import LandingTrustedBy from "@/components/ui/landing/landing-trusted-by"
import {
  fadeUp,
  scaleIn,
  staggerContainer,
} from "@/components/ui/landing/landing-motion"
import { PrimaryButton, SecondaryButton } from "@/components/ui/landing/landing-buttons"
import { BLURB, CAL_URL } from "@/components/ui/landing/landing-content"

export default function LandingHeroSection() {
  const router = useRouter()

  return (
    <>
      <section id="hero" className="relative border-b border-white/10">
        <div className="mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2">
            <motion.div
              className="border-b border-white/10 p-6 sm:p-10 lg:border-b-0 lg:border-r lg:p-12"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={fadeUp} className="mb-6">
                <BackedByYCombinatorPill />
              </motion.div>

              <motion.div variants={fadeUp} className="contents">
                <HeroUseCaseHeadline />
              </motion.div>

              <motion.p
                variants={fadeUp}
                className="mt-6 max-w-lg text-sm leading-relaxed text-zinc-400 sm:text-base"
              >
                {BLURB}
              </motion.p>

              <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
                <PrimaryButton href={CAL_URL} external>
                  Book a demo
                </PrimaryButton>
                <SecondaryButton onClick={() => router.push("/gov/onboarding")}>
                  GovCon? Try free
                </SecondaryButton>
              </motion.div>
            </motion.div>

            <motion.div
              id="hero-demo"
              className="p-4 sm:p-6 lg:p-8"
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.2 }}
            >
              <DemoBrowserMockup id="hero" />
            </motion.div>
          </div>

          <LandingTrustedBy />
        </div>
      </section>
    </>
  )
}
