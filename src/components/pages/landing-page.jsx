"use client"

import { useState } from "react"
import Image from "next/image"
import { motion, useScroll, useTransform } from "framer-motion"
import { ChevronDown, Mail, Minus, Plus } from "lucide-react"
import { FlickeringGrid } from "@/components/ui/flickering-grid"

const DEMO_TABS = [
  { id: "pharma", label: "Pharma", videoId: "VZ-VA4kEbMw" },
  { id: "clinical-studies", label: "Clinical Studies", videoId: "DdcGoIdp2aY" },
  { id: "healthcare", label: "Healthcare", videoId: "qxaJAN6aFAE" },
  { id: "search-report", label: "Search & Report", videoId: "cmntcD5iwjg" },
]

const BLURB =
  "Current automation either sacrifices intelligence for reliability, or reliability for intelligence. We provide both through AI augmented with deterministic tooling."

const CONTACT_EMAIL = "founders@chromie.dev"

const TRUSTED_LOGOS = [
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
]

const BENTO_FEATURES = [
  {
    title: "Deterministic tool calls",
    body: "Invoke skills at runtime with predictable, auditable execution paths—not opaque model guesses.",
    accent: "from-cyan-500/20 to-transparent",
  },
  {
    title: "Execution analysis",
    body: "Analyze past runs to find repeated actions worth codifying into tools.",
    accent: "from-violet-500/15 to-transparent",
  },
  {
    title: "Tailored tools",
    body: "Build specialized tools around the workflows your agents perform most.",
    accent: "from-teal-500/15 to-transparent",
  },
  {
    title: "Task-aware skills",
    body: "Select and position skills based on task context and where the agent sits in the flow.",
    accent: "from-cyan-500/10 via-violet-500/10 to-transparent",
  },
]

const COMPARISON_ROWS = [
  { feature: "Deterministic tool invocation", chromie: true, generic: false },
  { feature: "Past execution analysis", chromie: true, generic: "partial" },
  { feature: "Runtime skill selection by task", chromie: true, generic: false },
  { feature: "Reliability + intelligence", chromie: true, generic: "partial" },
  { feature: "Auditable agent actions", chromie: true, generic: false },
]

const FAQ_ITEMS = [
  {
    id: "what",
    q: "What is chromie.dev?",
    a: "The deterministic stack for web agents—combining AI with tooling that executes reliably on the web.",
  },
  {
    id: "how",
    q: "How is this different from pure LLM automation?",
    a: BLURB,
  },
  {
    id: "demo",
    q: "How do I see it in action?",
    a: "Book a demo via our calendar link or watch the product walkthrough in the hero browser preview.",
  },
  {
    id: "contact",
    q: "Who do I reach for partnerships or pilots?",
    a: `Email us at ${CONTACT_EMAIL} and we'll respond quickly.`,
  },
]

function GridOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] opacity-[0.35]"
      aria-hidden
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "48px 48px",
      }}
    />
  )
}

function SectionDivider() {
  return (
    <div className="relative py-10 sm:py-14" aria-hidden>
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-gradient-to-b from-transparent via-white/[0.015] to-transparent" />
    </div>
  )
}

function DemoBrowserMockup() {
  const [activeTabId, setActiveTabId] = useState(DEMO_TABS[0].id)
  const activeTab = DEMO_TABS.find((tab) => tab.id === activeTabId) ?? DEMO_TABS[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.15 }}
      className="relative w-full lg:min-h-[420px]"
    >
      <div
        className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-b from-cyan-500/15 via-transparent to-violet-500/12 blur-2xl"
        aria-hidden
      />
      <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_0_40px_-8px_rgba(34,211,238,0.25)] ring-1 ring-cyan-400/10">
        <div
          className="flex flex-wrap gap-1 border-b border-white/10 bg-zinc-950/90 p-2 sm:gap-1.5 sm:p-2.5"
          role="tablist"
          aria-label="Demo use cases"
        >
          {DEMO_TABS.map((tab) => {
            const isActive = tab.id === activeTabId
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`demo-panel-${tab.id}`}
                id={`demo-tab-${tab.id}`}
                onClick={() => setActiveTabId(tab.id)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:px-4 sm:text-sm ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/30"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
        <div
          id={`demo-panel-${activeTab.id}`}
          role="tabpanel"
          aria-labelledby={`demo-tab-${activeTab.id}`}
          className="relative min-h-[220px] flex-1 bg-black sm:min-h-[280px] md:min-h-[340px] lg:min-h-[380px]"
        >
          <iframe
            key={activeTab.videoId}
            title={`chromie.dev ${activeTab.label} demo`}
            src={`https://www.youtube-nocookie.com/embed/${activeTab.videoId}`}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </motion.div>
  )
}

function ComparisonCell({ value }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center text-cyan-400" aria-label="Yes">
        <Plus className="h-4 w-4" strokeWidth={2.5} />
      </span>
    )
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center text-zinc-600" aria-label="No">
        <Minus className="h-4 w-4" />
      </span>
    )
  }
  return <span className="text-xs text-zinc-500">Partial</span>
}

function FaqAccordion() {
  const [openId, setOpenId] = useState(FAQ_ITEMS[0]?.id ?? null)

  return (
    <div className="space-y-3">
      {FAQ_ITEMS.map((item) => {
        const isOpen = openId === item.id
        return (
          <div
            key={item.id}
            className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition-colors hover:border-white/15 hover:bg-white/[0.04]"
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-sm font-semibold text-zinc-100">{item.q}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            <motion.div
              initial={false}
              animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <p className="px-5 pb-4 text-sm leading-relaxed text-zinc-400">{item.a}</p>
            </motion.div>
          </div>
        )
      })}
    </div>
  )
}

export default function LandingPage() {
  const { scrollYProgress } = useScroll()
  const heroGlowY = useTransform(scrollYProgress, [0, 0.35], [0, -80])

  return (
    <div className="min-h-screen bg-[#09090b] text-white relative overflow-hidden">
      <GridOverlay />

      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(34,211,238,0.12),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_70%_50%_at_100%_30%,rgba(139,92,246,0.07),transparent_50%)]"
        aria-hidden
      />

      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <FlickeringGrid
          className="absolute inset-0 opacity-90"
          squareSize={4}
          gridGap={6}
          color="rgb(148, 163, 184)"
          maxOpacity={0.07}
          flickerChance={1.8}
        />
      </div>

      {/* Fixed header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-md bg-black/50">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#" className="flex items-center gap-2 transition-colors [&>span]:hover:opacity-90">
            <Image
              src="/chromie-logo-1.png"
              alt="Chromie"
              width={32}
              height={32}
              className="shrink-0 opacity-90"
            />
            <span className="inline-block text-xl">
              <span className="font-bold bg-gradient-to-r from-gray-400 to-gray-300 bg-clip-text text-transparent">
                chromie
              </span>
              <span className="font-normal text-gray-500">.dev</span>
            </span>
          </a>
          <div className="hidden items-center gap-8 text-xs font-medium text-zinc-400 sm:flex">
            <a href="#features" className="transition-colors hover:text-white">
              Features
            </a>
            <a href="#compare" className="transition-colors hover:text-white">
              Compare
            </a>
            <a href="#faq" className="transition-colors hover:text-white">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="hidden text-xs text-zinc-400 transition-colors hover:text-white sm:inline"
            >
              Contact
            </a>
            <a
              href="https://cal.com/chromie"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/20 bg-white px-3.5 py-2 text-xs font-bold text-black transition-all hover:bg-zinc-200"
            >
              Book a demo
            </a>
          </div>
        </nav>
      </header>

      <main className="relative z-10">
        {/* Hero — two columns + trusted by */}
        <section className="mx-auto max-w-7xl px-4 pt-28 sm:px-6 sm:pt-32">
          <motion.div style={{ y: heroGlowY }} className="pointer-events-none absolute -top-20 right-0 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden />

          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] lg:gap-12 xl:gap-14">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* <span className="mb-5 inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-200">
                Web agents
              </span> */}

              <h1 className="text-4xl font-extrabold tracking-[-0.04em] leading-[1.05] sm:text-5xl md:text-6xl">
                <span className="bg-gradient-to-br from-white via-white to-zinc-400 bg-clip-text text-transparent">
                  chromie.dev
                </span>
              </h1>

              <p className="mt-5 text-xl font-bold text-zinc-300 sm:text-2xl">
                the deterministic stack for{" "}
                <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-200/95 to-teal-300/90">
                  web agents
                </span>
              </p>

              <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-zinc-400 sm:text-base">
                {BLURB}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="https://cal.com/chromie"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-xl border border-white bg-white px-7 py-3.5 text-sm font-bold text-black transition-all hover:bg-zinc-200 hover:shadow-[0_0_24px_-4px_rgba(255,255,255,0.35)]"
                >
                  Book a demo
                </a>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-transparent px-7 py-3.5 text-sm font-bold text-white transition-all hover:border-white/40 hover:bg-white/[0.06]"
                >
                  <Mail className="h-4 w-4" aria-hidden />
                  Email us
                </a>
              </div>
            </motion.div>

            <DemoBrowserMockup />
          </div>

          <div className="relative mt-20 pb-4 sm:mt-24 sm:pb-6">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 -top-16 h-16 bg-gradient-to-b from-transparent to-[#09090b] sm:-top-20 sm:h-20"
              aria-hidden
            />
            <p className="mb-5 pt-3 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500 sm:pt-4">
              trusted by
            </p>
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-8 opacity-50 grayscale transition-opacity duration-500 hover:opacity-70 sm:gap-10">
              {TRUSTED_LOGOS.map((logo) => (
                <a
                  key={logo.alt}
                  href={logo.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-opacity duration-300 hover:opacity-100"
                >
                  <img
                    src={logo.src}
                    alt={logo.alt}
                    className="h-6 object-contain sm:h-7 md:h-8"
                    style={{
                      mixBlendMode: "screen",
                      ...(logo.invert ? { filter: "brightness(0) invert(1)" } : {}),
                    }}
                  />
                </a>
              ))}
            </div>
          </div>
        </section>

        <SectionDivider />

        {/* Bento features */}
        <section id="features" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="mb-12 max-w-2xl"
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Capabilities</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Intelligence with deterministic guardrails
            </h2>
            <p className="mt-3 text-sm text-zinc-400 sm:text-base">
              Deterministic tool calls for web agents: analyze past executions, build tailored tools, and invoke skills at runtime.
            </p>
          </motion.div>

          <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENTO_FEATURES.map((card, i) => (
              <motion.article
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                className="group relative flex h-full min-h-[168px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/50 p-6 transition-all hover:border-cyan-400/25 hover:shadow-[0_0_32px_-12px_rgba(34,211,238,0.2)]"
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent} opacity-0 transition-opacity group-hover:opacity-100`}
                  aria-hidden
                />
                <h3 className="relative text-lg font-bold text-white">{card.title}</h3>
                <p className="relative mt-2 flex-1 text-sm leading-relaxed text-zinc-400">{card.body}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <SectionDivider />

        {/* Comparison matrix */}
        <section id="compare" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-10 text-center sm:text-left"
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Compare</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">Why teams choose chromie</h2>
          </motion.div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03]">
                    <th className="px-5 py-4 font-bold text-zinc-300">Capability</th>
                    <th className="px-5 py-4 font-bold text-cyan-300">chromie.dev</th>
                    <th className="px-5 py-4 font-bold text-zinc-500">Generic LLM agents</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={`border-b border-white/10 transition-colors hover:bg-white/[0.02] ${i === COMPARISON_ROWS.length - 1 ? "border-b-0" : ""}`}
                    >
                      <td className="px-5 py-4 font-medium text-zinc-200">{row.feature}</td>
                      <td className="px-5 py-4 text-center">
                        <ComparisonCell value={row.chromie} />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <ComparisonCell value={row.generic} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <SectionDivider />

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 sm:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-10 text-center"
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">FAQ</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">Common questions</h2>
          </motion.div>
          <FaqAccordion />
        </section>

        <SectionDivider />

        {/* Contact footer strip */}
        <footer className="relative py-12">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"
            aria-hidden
          />
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Contact</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="group inline-flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-base font-bold text-zinc-100 transition-all hover:border-cyan-400/40 hover:bg-white/[0.08] hover:shadow-[0_0_24px_-4px_rgba(34,211,238,0.2)]"
            >
              <Mail className="h-4 w-4 text-cyan-300/90" aria-hidden />
              {CONTACT_EMAIL}
            </a>
          </div>
        </footer>
      </main>
    </div>
  )
}
