"use client"

import { useRef } from "react"
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion"

export const EASE_OUT = [0.22, 1, 0.36, 1]

export const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: EASE_OUT },
  },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.55, ease: EASE_OUT },
  },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, ease: EASE_OUT },
  },
}

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
}

export function useMotionSafe() {
  return useReducedMotion()
}

export function FilmGrain() {
  const reduce = useReducedMotion()
  if (reduce) return null

  return (
    <div
      className="landing-film-grain pointer-events-none fixed inset-0 z-[100]"
      aria-hidden
    />
  )
}

export function Reveal({
  children,
  className = "",
  delay = 0,
  variant = fadeUp,
  once = true,
  margin = "-12%",
}) {
  const reduce = useReducedMotion()

  if (reduce) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin }}
      variants={variant}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerReveal({
  children,
  className = "",
  stagger = 0.09,
  delayChildren = 0.04,
}) {
  const reduce = useReducedMotion()

  if (reduce) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10%" }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: stagger, delayChildren },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className = "" }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>

  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  )
}

export function ParallaxHatch({ className = "" }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const y = useTransform(scrollYProgress, [0, 1], [-12, 12])

  return (
    <div ref={ref} className={className}>
      {reduce ? (
        <HatchStatic />
      ) : (
        <motion.div style={{ y }}>
          <HatchStatic />
        </motion.div>
      )}
    </div>
  )
}

function HatchStatic() {
  return (
    <div
      className="h-8 w-full border-y border-white/10"
      style={{
        backgroundImage: `repeating-linear-gradient(
          -45deg,
          transparent,
          transparent 6px,
          rgba(255,255,255,0.06) 6px,
          rgba(255,255,255,0.06) 7px
        )`,
      }}
      aria-hidden
    />
  )
}

export function ScrollScrubVisual({ children, className = "" }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.15"],
  })

  const scale = useTransform(scrollYProgress, [0, 0.45, 1], [0.9, 1, 0.92])
  const y = useTransform(scrollYProgress, [0, 1], [48, -48])
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.75, 1], [0.35, 1, 1, 0.4])
  const smoothScale = useSpring(scale, { stiffness: 90, damping: 28, mass: 0.4 })

  return (
    <div ref={ref} className={`relative ${className}`}>
      {reduce ? (
        children
      ) : (
        <motion.div style={{ scale: smoothScale, y, opacity }} className="relative w-full">
          {children}
          <DitherOverlay />
        </motion.div>
      )}
    </div>
  )
}

export function DitherOverlay() {
  const reduce = useReducedMotion()
  if (reduce) return null

  return (
    <motion.div
      className="landing-dither-overlay pointer-events-none absolute inset-0 z-10"
      aria-hidden
      initial={{ opacity: 0.12 }}
      whileInView={{ opacity: [0.12, 0.28, 0.12] }}
      viewport={{ once: false, amount: 0.4 }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    />
  )
}

export function HeroScrollGlow() {
  const { scrollYProgress } = useScroll()
  const reduce = useReducedMotion()
  const opacity = useTransform(scrollYProgress, [0, 0.25], [0.5, 0])
  const y = useTransform(scrollYProgress, [0, 0.3], [0, -120])

  if (reduce) return null

  return (
    <motion.div
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[min(70vh,520px)] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(255,255,255,0.07),transparent_70%)]"
      style={{ opacity, y }}
      aria-hidden
    />
  )
}

export function SectionHeader({ label, title, description, className = "" }) {
  return (
    <StaggerReveal className={className}>
      <StaggerItem>
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
          {label}
        </p>
      </StaggerItem>
      <StaggerItem>
        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      </StaggerItem>
      {description ? (
        <StaggerItem>
          <div className="mt-4 max-w-xl text-sm text-zinc-400 sm:text-base">{description}</div>
        </StaggerItem>
      ) : null}
    </StaggerReveal>
  )
}

export function TypewriterLines({ lines, className = "" }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-15%" })
  const reduce = useReducedMotion()

  return (
    <div ref={ref} className={className}>
      {lines.map((line, i) => (
        <motion.p
          key={line}
          className="whitespace-pre-wrap"
          initial={reduce ? false : { opacity: 0, x: -10, filter: "blur(4px)" }}
          animate={
            reduce || inView
              ? { opacity: 1, x: 0, filter: "blur(0px)" }
              : { opacity: 0, x: -10, filter: "blur(4px)" }
          }
          transition={{ delay: i * 0.09, duration: 0.4, ease: EASE_OUT }}
        >
          {line}
        </motion.p>
      ))}
    </div>
  )
}

export function AnimatedFaqPanel({ isOpen, children }) {
  const reduce = useReducedMotion()

  if (reduce) {
    return isOpen ? children : null
  }

  return (
    <AnimatePresence initial={false}>
      {isOpen ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
