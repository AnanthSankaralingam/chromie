"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { motion, useScroll, useTransform } from "framer-motion"
import {
  ArrowRight,
  Check,
  ChevronDown,
  Menu,
  X,
} from "lucide-react"
import {
  AnimatedFaqPanel,
  fadeUp,
  FilmGrain,
  HeroScrollGlow,
  ParallaxHatch,
  Reveal,
  scaleIn,
  ScrollScrubVisual,
  SectionHeader,
  staggerContainer,
  StaggerItem,
  StaggerReveal,
} from "@/components/ui/landing/landing-motion"
import ResultsComparisonVisual from "@/components/ui/landing/results-comparison-visual"
import AutomationPathsVisual from "@/components/ui/landing/automation-paths-visual"
import SelfHealingVisual from "@/components/ui/landing/self-healing-visual"
import ExecutionReplayVisual from "@/components/ui/landing/execution-replay-visual"
import ConfidenceCtaSection from "@/components/ui/landing/confidence-cta-section"
import { BackedByYCombinatorPill } from "@/components/ui/backed-by-y-combinator-pill"

const BASE_DEMO_VIDEO_ID = "uI0MVyhb2xg"

const USE_CASE_TABS = [
  { id: "pharma", label: "Pharma", videoId: "VZ-VA4kEbMw" },
  { id: "clinical-studies", label: "Clinical Studies", videoId: "DdcGoIdp2aY" },
  { id: "healthcare", label: "Healthcare", videoId: "qxaJAN6aFAE" },
  { id: "search-report", label: "Search & Report", videoId: "cmntcD5iwjg" },
]

function getDemoEmbedUrl(videoId, { autoplay = false, muted = false } = {}) {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    controls: "1",
  })
  if (autoplay) {
    params.set("autoplay", "1")
    if (muted) params.set("mute", "1")
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}

const BLURB =
  "Current automation either sacrifices intelligence for reliability, or reliability for intelligence. We provide both through AI augmented with deterministic tooling."

const CONTACT_EMAIL = "founders@chromie.dev"
const CAL_URL = "https://cal.com/chromie"

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#benefits", label: "Benefits" },
  { href: "#compare", label: "Compare" },
  { href: "#faq", label: "FAQs" },
]

const TRUSTED_LOGOS = [
  {
    href: "https://www.ycombinator.com/",
    src: "/ycombinator-logo.svg",
    alt: "Y Combinator",
  },
  {
    href: "https://chromewebstore.google.com/detail/ionrouter-by-cumulus-labs/pdfigecoikombaefidghfheahgipepoc",
    src: "/ion-logo-128.jpeg",
    alt: "Cumulus Lab",
  },
  {
    href: "https://chromewebstore.google.com/detail/omnispeech-ai-deepfake-de/fdaalloapkmfoeelgbhdedlbiplcoahp/",
    src: "/omnispeech_logo.png",
    alt: "Omnispeech",
  },
  { href: "https://qtr.ai/", src: "/QTR-Logo.png", alt: "QTR", invert: true },
  { href: "https://bricked.ai/", src: "/bricked-logo.png", alt: "Bricked" },
  { href: "https://mentrix.ai/", src: "/mentrix-logo.png", alt: "Mentrix" },
  {
    href: "https://www.salesgraph.com/",
    src: "/salesgraph-logo.svg",
    alt: "Salesgraph",
    wide: true,
  },
]

const SPOTLIGHTS = [
  {
    id: "deterministic",
    label: "Deterministic tool calls",
    title: "Intelligence with deterministic guardrails",
    body: "Full audit trail, no opaque model calls deciding what happens next. Intelligence where you need it. Deterministic tools where you can't afford to guess.",
    visual: "tools",
  },
  {
    id: "analysis",
    label: "Build or upgrade",
    title: "New automation or upgrade the one you have",
    body: "Create a brand-new automation with the chromie agent and its tools, or connect chromie to what you already run and layer deterministic tools on top.",
    visual: "analysis",
  },
  {
    id: "runtime",
    label: "Runtime skill selection",
    title: "Right skill, right moment in the flow",
    body: "Select and position skills based on task context and where the agent sits in the workflow.",
    visual: "router",
  },
  {
    id: "self-healing",
    label: "Self-healing tools",
    title: "Recover when the site changes",
    body: "When selectors break or the DOM drifts, tools detect failure and re-resolve targets automatically. Each invocation makes them smarter and more reliable, with no manual fixes.",
    visual: "healing",
  },
]

const FEATURE_PILLS = [
  "Deterministic tool calls",
  "Execution replay",
  "Task-aware routing",
  "Self-healing tools",
  "Auditable actions",
  "Bot detection evasion",
]

const BENEFITS = [
  {
    title: "Reliability without dumbing down",
    body: "Keep frontier models for reasoning while deterministic tools handle the steps that must not fail.",
  },
  {
    title: "Auditable agent actions",
    body: "Every tool invocation is traceable, built for teams that need to explain what happened and why.",
  },
  {
    title: "Workflow-native skills",
    body: "Skills map to how your agents actually work on the web, not generic one-size prompts.",
  },
  {
    title: "Past-run learning",
    body: "Mine execution history to spot patterns worth turning into permanent tooling.",
  },
  {
    title: "Production guardrails",
    body: "Combine LLM flexibility with hard boundaries so agents stay inside approved paths.",
  },
  {
    title: "Self-healing tools",
    body: "When sites change or selectors break, tools recover automatically and grow smarter on every invocation, with no manual fixes.",
  },
]

const COMPARISON_ROWS = [
  { feature: "Deterministic tool invocation", other: "Probabilistic", chromie: "Deterministic" },
  { feature: "Past execution analysis", other: "Manual", chromie: "Automated" },
  { feature: "Runtime skill selection", other: "Static prompts", chromie: "Task-aware" },
  { feature: "Self-healing tools", other: "Manual fixes", chromie: "Automatic recovery" },
  { feature: "Reliability + intelligence", other: "Trade-off", chromie: "Both" },
  { feature: "Auditable agent actions", other: "Limited", chromie: "Full trace" },
  { feature: "Setup for production", other: "Weeks", chromie: "Minutes" },
]

const FAQ_ITEMS = [
  {
    id: "what",
    num: "01",
    q: "What is chromie.dev?",
    a: "The deterministic stack for web agents, combining AI with tooling that executes reliably on the web.",
  },
  {
    id: "how",
    num: "02",
    q: "How is this different from pure LLM automation?",
    a: BLURB,
  },
  {
    id: "demo",
    num: "03",
    q: "How do I see it in action?",
    a: "Book a demo via our calendar or watch the product walkthrough in the hero browser preview.",
  },
  {
    id: "contact",
    num: "04",
    q: "Who do I reach for partnerships or pilots?",
    a: `Email us at ${CONTACT_EMAIL} and we'll respond quickly.`,
  },
  {
    id: "stack",
    num: "05",
    q: "What kinds of workflows is chromie built for?",
    a: "Healthcare research, pharma workflows, clinical studies, search & report agents: any web agent that needs both intelligence and deterministic reliability.",
  },
]

function HatchBand({ className = "" }) {
  return <ParallaxHatch className={className} />
}

function SectionLabel({ children }) {
  return (
    <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
      {children}
    </p>
  )
}

function PrimaryButton({ href, children, external, className = "" }) {
  const props = external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {}
  return (
    <a
      href={href}
      {...props}
      className={`inline-flex items-center justify-center gap-2 border border-white bg-white px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 ${className}`}
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </a>
  )
}

function SecondaryButton({ href, children, className = "" }) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center gap-2 border border-white/25 bg-transparent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/[0.04] ${className}`}
    >
      {children}
    </a>
  )
}

function DemoBrowserMockup({ id = "hero" }) {
  const [activeTabId, setActiveTabId] = useState(null)
  const [playGeneration, setPlayGeneration] = useState(0)
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const activeTab = activeTabId
    ? USE_CASE_TABS.find((tab) => tab.id === activeTabId)
    : null
  const videoId = activeTab?.videoId ?? BASE_DEMO_VIDEO_ID
  const shouldAutoplay = activeTabId === null || playGeneration > 0
  const shouldMute = shouldAutoplay && !audioUnlocked

  function selectTab(tabId) {
    setAudioUnlocked(true)
    const nextTabId = tabId === activeTabId ? null : tabId
    setActiveTabId(nextTabId)
    setPlayGeneration((generation) => generation + 1)
  }

  return (
    <div className="border border-white/10 bg-black">
      <div
        id={`${id}-panel`}
        role="tabpanel"
        className="relative aspect-video w-full bg-black"
      >
        <iframe
          key={`${videoId}-${playGeneration}`}
          title={
            activeTab
              ? `chromie.dev ${activeTab.label} demo`
              : "chromie.dev demo"
          }
          src={getDemoEmbedUrl(videoId, {
            autoplay: shouldAutoplay,
            muted: shouldMute,
          })}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <div className="border-t border-white/10 bg-zinc-950 px-4 py-4 sm:px-5 sm:py-5">
        <p className="text-sm font-semibold text-white">Use Cases</p>
        <p className="mt-1 text-xs text-zinc-500">
          Pick an industry to watch a tailored demo.
        </p>
        <div
          className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-0 sm:overflow-hidden sm:border sm:border-white/20"
          role="tablist"
          aria-label="Demo use cases"
        >
          {USE_CASE_TABS.map((tab, index) => {
            const isActive = tab.id === activeTabId
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`${id}-panel`}
                id={`${id}-tab-${tab.id}`}
                onClick={() => selectTab(tab.id)}
                className={`flex min-h-12 w-full cursor-pointer items-center justify-center border px-3 py-3 text-center text-sm font-semibold leading-snug transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 sm:min-h-[3.25rem] sm:border-0 sm:px-4 sm:text-[15px] ${
                  index < USE_CASE_TABS.length - 1 ? "sm:border-r sm:border-white/20" : ""
                } ${
                  isActive
                    ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-100 ring-1 ring-inset ring-cyan-400/40 sm:bg-cyan-500/20 sm:ring-0"
                    : "border-white/30 bg-zinc-900 text-white hover:border-white/50 hover:bg-zinc-800 sm:bg-zinc-950 sm:hover:bg-white/[0.06]"
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SpotlightVisual({ type }) {
  if (type === "tools") {
    return <ResultsComparisonVisual />
  }

  if (type === "replay") {
    return <ExecutionReplayVisual />
  }

  if (type === "analysis") {
    return <AutomationPathsVisual />
  }

  if (type === "healing") {
    return <SelfHealingVisual />
  }

  return <RuntimeRoutingVisual />
}

function RuntimeRoutingVisual() {
  const steps = [
    { label: "Task", value: "triage_inbox" },
    { label: "Step", value: "2 of 4" },
    { label: "Skills available", value: "classify, draft" },
    { label: "Selected", value: "classify@v2", highlight: true },
  ]

  return (
    <div className="landing-visual-panel w-full overflow-hidden border border-white/10 bg-[#080808]">
      <div className="border-b border-white/10 px-4 py-3 text-center">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
          Runtime routing
        </p>
        <p className="mt-1 text-[11px] text-zinc-400 sm:text-xs">
          right skill for where the agent is in the flow
        </p>
      </div>
      <dl className="space-y-0 divide-y divide-white/10">
        {steps.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[120px_1fr] gap-3 px-4 py-3 sm:px-5 sm:py-3.5"
          >
            <dt className="font-mono text-[10px] uppercase tracking-wider text-zinc-600 sm:text-[11px]">
              {row.label}
            </dt>
            <dd
              className={`font-mono text-[11px] sm:text-xs ${
                row.highlight ? "text-cyan-400/90" : "text-zinc-300"
              }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function SpotlightSection({ item, reverse }) {
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

function FaqAccordion() {
  const [openId, setOpenId] = useState(FAQ_ITEMS[0]?.id ?? null)

  const rowGrid =
    "grid w-full grid-cols-[2.5rem_minmax(0,1fr)_1.25rem] items-start gap-x-4"

  return (
    <div className="divide-y divide-white/10 border border-white/10">
      {FAQ_ITEMS.map((item) => {
        const isOpen = openId === item.id
        return (
          <div key={item.id} className="bg-black">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className={`${rowGrid} px-5 py-5 text-left transition-colors hover:bg-white/[0.02] sm:px-6 ${isOpen ? "pb-4" : ""}`}
              aria-expanded={isOpen}
            >
              <span className="font-mono text-xs leading-5 text-zinc-600">{item.num}</span>
              <span className="min-w-0 text-sm font-semibold leading-snug text-white sm:text-base">
                {item.q}
              </span>
              <ChevronDown
                className={`mt-0.5 h-4 w-4 justify-self-end text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatedFaqPanel isOpen={isOpen}>
              <div className="border-t border-white/10 px-5 pb-5 sm:px-6 sm:pb-6">
                <div className={`${rowGrid} pt-4`}>
                  <div aria-hidden="true" />
                  <p className="col-span-2 col-start-2 min-w-0 text-sm leading-relaxed text-zinc-400">
                    {item.a}
                  </p>
                </div>
              </div>
            </AnimatedFaqPanel>
          </div>
        )
      })}
    </div>
  )
}

export default function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white">
      <FilmGrain />
      <HeroScrollGlow />

      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm"
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#" className="flex items-center gap-2.5">
            <Image
              src="/chromie-logo-1.png"
              alt="Chromie"
              width={28}
              height={28}
              className="shrink-0"
            />
            <span className="text-lg font-bold tracking-tight">
              chromie<span className="font-normal text-zinc-500">.dev</span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-6 sm:flex">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 transition-colors hover:text-white"
            >
              Contact
            </a>
            <PrimaryButton href={CAL_URL} external className="!px-4 !py-2 text-xs">
              Get started
            </PrimaryButton>
          </div>

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center border border-white/15 text-white lg:hidden"
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileNavOpen((o) => !o)}
          >
            {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {mobileNavOpen && (
          <nav
            className="border-t border-white/10 px-4 py-4 lg:hidden"
            aria-label="Mobile"
          >
            <div className="flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileNavOpen(false)}
                  className="font-mono text-xs uppercase tracking-wider text-zinc-400 hover:text-white"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-4 border-t border-white/10 pt-4">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  onClick={() => setMobileNavOpen(false)}
                  className="font-mono text-xs uppercase tracking-wider text-zinc-400 hover:text-white"
                >
                  Contact
                </a>
                <PrimaryButton href={CAL_URL} external>
                  Get started
                </PrimaryButton>
              </div>
            </div>
          </nav>
        )}
      </motion.header>

      <HatchBand />

      <main className="relative z-[1]">
        {/* Hero */}
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

                <motion.h1
                  variants={fadeUp}
                  className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.25rem]"
                >
                  Run browser automation with{" "}
                  <span className="text-cyan-400">reliability</span> and{" "}
                  <span className="text-cyan-400">intelligence</span>
                </motion.h1>

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

            {/* Trusted by */}
            <Reveal className="border-t border-white/10 px-6 py-10 sm:px-10">
              <SectionLabel>Trusted by</SectionLabel>
              <StaggerReveal className="mt-6 flex flex-wrap items-center justify-center gap-10 opacity-60 grayscale transition-opacity hover:opacity-90 sm:justify-start sm:gap-12">
                {TRUSTED_LOGOS.map((logo) => (
                  <StaggerItem key={logo.alt}>
                    <a
                      href={logo.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block transition-opacity hover:opacity-100"
                    >
                      <img
                        src={logo.src}
                        alt={logo.alt}
                        className={`h-7 object-contain sm:h-8${logo.wide ? " w-auto max-w-[7rem] sm:max-w-[8.5rem]" : ""}`}
                        style={{
                          mixBlendMode: "screen",
                          ...(logo.invert ? { filter: "brightness(0) invert(1)" } : {}),
                        }}
                      />
                    </a>
                  </StaggerItem>
                ))}
              </StaggerReveal>
            </Reveal>
          </div>
        </section>

        {/* Spotlight sections */}
        {SPOTLIGHTS.map((item, i) => (
          <SpotlightSection key={item.id} item={item} reverse={i % 2 === 1} />
        ))}

        <HatchBand />

        {/* Features */}
        <section id="features" className="border-b border-white/10 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeader
              label="Features"
              title="Web agent infrastructure that just works"
              description="Deterministic tool calls, execution analysis, and runtime skill selection, built for production web agents."
            />

            <StaggerReveal className="mt-10 flex flex-wrap gap-2" stagger={0.05}>
              {FEATURE_PILLS.map((pill) => (
                <StaggerItem key={pill}>
                  <span className="border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                    {pill}
                  </span>
                </StaggerItem>
              ))}
            </StaggerReveal>

            <Reveal className="mt-8" delay={0.1}>
              <div className="grid gap-0 border border-white/10 lg:grid-cols-[1fr_1.2fr]">
                <div className="border-b border-white/10 p-6 sm:p-8 lg:border-b-0 lg:border-r">
                  <h3 className="text-lg font-bold">Live execution trace</h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                    Every skill invocation logged: inputs, outputs, latency, and task context.
                    Replay runs for debugging and compliance.
                  </p>
                  <div className="mt-6">
                    <PrimaryButton href={CAL_URL} external>
                      Book a demo
                    </PrimaryButton>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <ScrollScrubVisual>
                    <SpotlightVisual type="replay" />
                  </ScrollScrubVisual>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Benefits */}
        <section id="benefits" className="border-b border-white/10 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeader label="Benefits" title="Web automation at production scale" />

            <StaggerReveal className="mt-12 grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map((b) => (
                <StaggerItem key={b.title}>
                  <article className="h-full bg-[#0a0a0a] p-6 transition-colors hover:bg-white/[0.02] sm:p-8">
                    <h3 className="text-base font-bold text-white">{b.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">{b.body}</p>
                  </article>
                </StaggerItem>
              ))}
            </StaggerReveal>
          </div>
        </section>

        {/* Comparison */}
        <section id="compare" className="border-b border-white/10 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeader label="Comparison" title="Why teams choose chromie" />

            <Reveal className="mt-12 overflow-hidden border border-white/10" delay={0.05}>
              <div className="grid grid-cols-3 border-b border-white/10 bg-white/[0.03] font-mono text-[10px] uppercase tracking-wider sm:text-[11px]">
                <div className="p-4 text-zinc-500" />
                <div className="border-l border-white/10 p-4 text-zinc-500">Generic Automation</div>
                <div className="border-l border-white/10 p-4 text-white">chromie.dev</div>
              </div>
              {COMPARISON_ROWS.map((row, i) => (
                <motion.div
                  key={row.feature}
                  className={`grid grid-cols-3 ${i < COMPARISON_ROWS.length - 1 ? "border-b border-white/10" : ""}`}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-5%" }}
                  transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="p-4 text-sm font-medium text-zinc-300">{row.feature}</div>
                  <div className="flex items-center border-l border-white/10 p-4 text-sm text-zinc-500">
                    {row.other}
                  </div>
                  <div className="flex items-center gap-2 border-l border-white/10 p-4 text-sm font-medium text-white">
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                    {row.chromie}
                  </div>
                </motion.div>
              ))}
            </Reveal>
          </div>
        </section>

        <HatchBand />

        {/* FAQ */}
        <section id="faq" className="border-b border-white/10 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <SectionHeader
              label="FAQs"
              title="Got questions? We've got answers."
              description={
                <>
                  Still have questions?{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-white underline underline-offset-4"
                  >
                    Contact us
                  </a>{" "}
                  and we&apos;ll help you out.
                </>
              }
            />
            <Reveal className="mt-10" delay={0.1}>
              <FaqAccordion />
            </Reveal>
          </div>
        </section>

        <ConfidenceCtaSection
          primaryHref={CAL_URL}
          primaryLabel="Book a demo"
          secondaryHref={`mailto:${CONTACT_EMAIL}`}
          secondaryLabel={CONTACT_EMAIL}
        />
      </main>

      <HatchBand />

      {/* Footer */}
      <Reveal>
      <footer className="py-12 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center gap-2.5">
              <Image
                src="/chromie-logo-1.png"
                alt="Chromie"
                width={28}
                height={28}
              />
              <span className="text-lg font-bold">
                chromie<span className="font-normal text-zinc-500">.dev</span>
              </span>
            </a>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-500">
              The deterministic stack for web agents. Intelligence and reliability on the live
              web.
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
              Quick menu
            </p>
            <ul className="mt-4 space-y-2">
              {NAV_LINKS.slice(0, 4).map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-zinc-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
              Contact
            </p>
            <ul className="mt-4 space-y-2">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={CAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  Get started
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-6xl border-t border-white/10 px-4 pt-8 sm:px-6">
          <p className="font-mono text-[11px] text-zinc-600">
            © {new Date().getFullYear()} chromie.dev. All rights reserved.
          </p>
        </div>
      </footer>
      </Reveal>
    </div>
  )
}
