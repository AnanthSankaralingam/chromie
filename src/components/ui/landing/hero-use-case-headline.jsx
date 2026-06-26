"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { HERO_USE_CASES } from "@/components/ui/landing/landing-content"

export default function HeroUseCaseHeadline() {
  const reduceMotion = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)
  const activeUseCase = HERO_USE_CASES[activeIndex]

  useEffect(() => {
    if (reduceMotion) return undefined

    const intervalId = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % HERO_USE_CASES.length)
    }, 3000)

    return () => window.clearInterval(intervalId)
  }, [reduceMotion])

  const useCaseText = reduceMotion ? (
    activeUseCase.useCase
  ) : (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={activeUseCase.id}
        initial={{ y: "80%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "-80%", opacity: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="inline-block"
      >
        {activeUseCase.useCase}
      </motion.span>
    </AnimatePresence>
  )

  const industryText = reduceMotion ? (
    `${activeUseCase.industry}.`
  ) : (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={`${activeUseCase.id}-industry`}
        initial={{ y: "80%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "-80%", opacity: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="inline-block"
      >
        {activeUseCase.industry}.
      </motion.span>
    </AnimatePresence>
  )

  return (
    <div>
      <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.25rem]">
        <span className="block">Automate</span>
        <span className="relative block min-h-[1.08em] overflow-hidden text-cyan-400">
          {useCaseText}
        </span>
        <span className="block">
          for{" "}
          <span className="relative inline-block min-h-[1.08em] overflow-hidden align-bottom text-cyan-400">
            {industryText}
          </span>
        </span>
      </h1>
    </div>
  )
}
