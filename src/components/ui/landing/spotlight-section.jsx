"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { PrimaryButton } from "@/components/ui/landing/landing-buttons"
import {
  ScrollScrubVisual,
  StaggerItem,
  StaggerReveal,
} from "@/components/ui/landing/landing-motion"
import SpotlightVisual from "@/components/ui/landing/spotlight-visual"
import { CAL_URL } from "@/components/ui/landing/landing-content"
import { SectionLabel } from "@/components/ui/landing/landing-primitives"

export default function SpotlightSection({ item, reverse }) {
  const sectionRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.9", "end 0.1"],
  })
  const lineWidth = useTransform(scrollYProgress, [0.1, 0.45], ["0%", "100%"])

  return (
    <section ref={sectionRef} className="relative border-b border-white/10">
      <motion.div
        className="absolute left-0 top-0 h-px bg-white/30"
        style={{ width: lineWidth }}
        aria-hidden
      />
      <div
        className={`mx-auto grid max-w-6xl lg:min-h-[88vh] lg:grid-cols-2 ${reverse ? "[&>div:first-child]:lg:order-2 [&>div:first-child]:lg:border-l [&>div:first-child]:lg:border-r-0" : ""}`}
      >
        <div className="flex flex-col justify-center border-white/10 p-6 sm:p-10 lg:border-r lg:p-12 lg:py-20">
          <StaggerReveal>
            <StaggerItem>
              <SectionLabel>{item.label}</SectionLabel>
            </StaggerItem>
            <StaggerItem>
              <h3 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {item.title}
              </h3>
            </StaggerItem>
            <StaggerItem>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base">
                {item.body}
              </p>
            </StaggerItem>
            <StaggerItem>
              <div className="mt-8">
                <PrimaryButton href={CAL_URL} external>
                  Get started
                </PrimaryButton>
              </div>
            </StaggerItem>
          </StaggerReveal>
        </div>
        <div className="border-t border-white/10 p-4 sm:p-6 lg:sticky lg:top-14 lg:flex lg:max-h-[calc(100vh-3.5rem)] lg:items-center lg:self-start lg:border-t-0 lg:p-8">
          <ScrollScrubVisual className="w-full">
            <SpotlightVisual type={item.visual} />
          </ScrollScrubVisual>
        </div>
      </div>
    </section>
  )
}
