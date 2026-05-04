"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, X, Star, ChevronDown, ChevronUp, Play } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { BILLING_SUBSCRIBE, PLAN_LIMITS } from "@/lib/constants"
import { Dialog, DialogContent } from "@/components/ui/dialog"

const EXTENDED_DEMO_URL = "https://www.youtube.com/watch?v=towZ0uxt5s4"

function getYouTubeEmbedUrl(url) {
  let videoId = null
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.replace("/", "")
    } else {
      videoId = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop()
    }
  } catch {}
  if (!videoId) return null
  const params = new URLSearchParams({ rel: "0", modestbranding: "1", playsinline: "1", controls: "1" })
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
}

/** Monthly LLM proxy budget (tokens); shown as a simple allowance label. */
function formatAiProxyMonthly(tokens) {
  if (tokens >= 1_000_000) return `~${tokens / 1_000_000}M/mo`
  if (tokens >= 1_000) return `~${tokens / 1_000}K/mo`
  return `${tokens}/mo`
}

const features = [
  { key: "credits" },
  { key: "aiCalls" },
  { key: "frontierModels" },
]

const plans = [
  {
    id: "free",
    title: "free",
    price: "$0",
    period: "",
    note: "No credit card needed",
    cta: "get started",
    href: "/builder",
    featured: false,
    features: {
      credits: "30 credits / month",
      aiCalls: `${formatAiProxyMonthly(PLAN_LIMITS.free.extension_proxy_tokens)} AI calls / month (LLM proxy)`,
      frontierModels: "fast, capable models for everyday extension work",
    },
  },
  {
    id: "pro",
    title: "pro",
    price: "$9.99",
    period: "/month",
    note: "cancel anytime",
    cta: "upgrade to pro",
    href: BILLING_SUBSCRIBE.pro,
    featured: true,
    features: {
      credits: "250 credits / month",
      aiCalls: `${formatAiProxyMonthly(PLAN_LIMITS.pro.extension_proxy_tokens)} AI calls / month (LLM proxy)`,
      frontierModels: "stronger models for complex features & refactors",
    },
  },
  {
    id: "builder",
    title: "builder",
    price: "$14.99",
    period: "/month",
    note: "for higher-volume teams",
    cta: "get builder",
    href: BILLING_SUBSCRIBE.builder,
    featured: false,
    features: {
      credits: "500 credits / month",
      aiCalls: `${formatAiProxyMonthly(PLAN_LIMITS.builder.extension_proxy_tokens)} AI calls / month (LLM proxy)`,
      frontierModels: "frontier coding models",
    },
  },
]

function PricingCard({ plan, index }) {
  const handleClick = () => {
    if (plan.href.startsWith("http")) {
      window.open(plan.href, "_blank")
    } else {
      window.location.href = plan.href
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
      className="relative"
    >
      {plan.featured && (
        <div className="absolute -inset-[1px] rounded-2xl bg-white/20 blur-[18px] pointer-events-none" />
      )}
      <div
        className={cn(
          "relative flex flex-col rounded-2xl border p-7 sm:p-8 h-full transition-all overflow-hidden",
          "bg-[#0f1117] border-white/[0.08] hover:border-white/[0.14]",
          plan.featured && "border-white/40 shadow-[0_0_40px_rgba(255,255,255,0.12),0_0_80px_rgba(255,255,255,0.06)]"
        )}
      >
        {/* Plan title + badge */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <h3 className="text-2xl font-bold text-white tracking-tight">{plan.title}</h3>
          {plan.featured && (
            <div className="flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/[0.12] px-3 py-1.5 text-sm font-medium text-zinc-300 whitespace-nowrap">
              <Star className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
              <span>most popular</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="mb-2">
          {plan.originalPrice ? (
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-500 line-through">{plan.originalPrice}</span>
              <span className="text-4xl font-bold text-slate-100">{plan.price}</span>
              {plan.period && (
                <span className="text-lg text-slate-400 ml-1.5">{plan.period}</span>
              )}
            </div>
          ) : (
            <>
              <span className="text-4xl font-bold text-slate-100">{plan.price}</span>
              {plan.period && (
                <span className="text-lg text-slate-400 ml-1.5">{plan.period}</span>
              )}
            </>
          )}
        </div>
        <p className="text-sm text-zinc-500 mb-7 min-h-[20px]">{plan.note ?? ""}</p>

        {/* CTA */}
        <Button
          onClick={handleClick}
          className="w-full mb-7 py-6 text-base font-medium bg-white text-[#080a0f] hover:bg-zinc-100 transition-all duration-200"
        >
          {plan.cta}
        </Button>

        {/* Divider */}
        <div className="border-t border-white/[0.06] mb-7" />

        {/* Feature list */}
        <ul className="space-y-5 flex-grow">
          {features.map((feature) => {
            const value = plan.features[feature.key]
            const included = value !== false
            const display = typeof value === "string" ? value : ""
            return (
              <li key={feature.key} className="flex items-start gap-4 text-base">
                {included ? (
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                ) : (
                  <X className="w-5 h-5 text-slate-600 flex-shrink-0 mt-1" />
                )}
                <p
                  className={cn(
                    "min-w-0 text-base leading-relaxed",
                    included ? "text-zinc-200" : "text-zinc-600"
                  )}
                >
                  {display}
                </p>
              </li>
            )
          })}
        </ul>
      </div>
    </motion.div>
  )
}

export default function PricingSection() {
  const [faqOpen, setFaqOpen] = useState(null) // 'credit' | 'aiProxy' | 'frontier' | 'why' | null
  const [isExtendedDemoOpen, setIsExtendedDemoOpen] = useState(false)

  return (
    <section id="pricing" className="relative z-10 px-4 sm:px-6 py-20 md:py-24 overflow-x-hidden">
      <div className="container mx-auto max-w-7xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-14"
        >
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500 mb-4">pricing</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">pricing</h2>
          <p className="text-base md:text-lg text-zinc-400 max-w-xl mx-auto mb-6 leading-relaxed">
            choose the perfect plan for your chrome extension development needs
          </p>
          <button
            onClick={() => setIsExtendedDemoOpen(true)}
            className="inline-flex items-center gap-2.5 px-5 py-3 rounded-lg text-base font-medium text-zinc-300 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/20 hover:text-white transition-all"
          >
            <Play className="w-5 h-5" />
            watch extended demo
          </button>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mb-24">
          {plans.map((plan, index) => (
            <PricingCard key={plan.id} plan={plan} index={index} />
          ))}
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-4xl font-bold mb-10 text-center text-white tracking-tight">
            faq
          </h2>

          <div className="space-y-5">
            <div className="bg-[#0f1117] border border-white/[0.08] rounded-xl overflow-hidden">
              <button
                onClick={() => setFaqOpen(faqOpen === 'credit' ? null : 'credit')}
                className="w-full flex items-center justify-between p-5 sm:p-7 text-left hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-lg sm:text-xl font-semibold text-white pr-4">what is a credit?</span>
                {faqOpen === 'credit' ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {faqOpen === 'credit' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="px-5 sm:px-7 pb-6 sm:pb-8 text-zinc-400 space-y-5 text-base leading-relaxed"
                >
                  <p>
                    <span className="text-zinc-200 font-medium">Credits</span> are Chromie&apos;s simple unit for work in the builder: mostly AI-powered code generation and edits in the app. Each plan includes a monthly credit pool; unused credits do not roll over.
                  </p>
                  <div className="space-y-3">
                    <p className="font-semibold text-white text-lg">typical costs:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>starting a new extension generation project: 3 credits</li>
                      <li>follow-up edits on an existing project: 2 credits each</li>
                    </ul>
                  </div>
                  <p>
                    AI traffic through the <span className="text-zinc-300">extension LLM proxy</span> is counted separately (see &quot;AI calls&quot; below), not as credits.
                  </p>
                </motion.div>
              )}
            </div>

            <div className="bg-[#0f1117] border border-white/[0.08] rounded-xl overflow-hidden">
              <button
                onClick={() => setFaqOpen(faqOpen === 'aiProxy' ? null : 'aiProxy')}
                className="w-full flex items-center justify-between p-5 sm:p-7 text-left hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-lg sm:text-xl font-semibold text-white pr-4">what are AI calls (LLM proxy)?</span>
                {faqOpen === 'aiProxy' ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {faqOpen === 'aiProxy' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="px-5 sm:px-7 pb-6 sm:pb-8 text-zinc-400 space-y-5 text-base leading-relaxed"
                >
                  <p>
                    <span className="text-zinc-200 font-medium">AI calls</span> are requests from the Chromie browser extension that run through our hosted LLM proxy (sidepanel chat, userscript help, and related flows). Usage is measured on our side and each plan has a monthly allowance, shown in the pricing table as a rough monthly budget (~100K / ~500K / ~1M proxy tokens for Free / Pro / Builder).
                  </p>
                  <p>
                    That allowance resets each billing month. It is separate from <span className="text-zinc-300">credits</span>, which cover generation and edits in the web app.
                  </p>
                </motion.div>
              )}
            </div>

            <div className="bg-[#0f1117] border border-white/[0.08] rounded-xl overflow-hidden">
              <button
                onClick={() => setFaqOpen(faqOpen === 'frontier' ? null : 'frontier')}
                className="w-full flex items-center justify-between p-5 sm:p-7 text-left hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-lg sm:text-xl font-semibold text-white pr-4">what are frontier coding models?</span>
                {faqOpen === 'frontier' ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {faqOpen === 'frontier' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="px-5 sm:px-7 pb-6 sm:pb-8 text-zinc-400 text-base leading-relaxed"
                >
                  <p>
                    <span className="text-zinc-200 font-medium">Frontier coding models</span> are the latest, most capable model families we route to for writing and refactoring real code (as opposed to lightweight classifiers or tiny helper calls). Higher plans are aligned with more demanding workflows: Pro and Builder get more room to use stronger models for large refactors, multi-file changes, and harder debugging, in addition to higher monthly credits and proxy allowances.
                  </p>
                </motion.div>
              )}
            </div>

            <div className="bg-[#0f1117] border border-white/[0.08] rounded-xl overflow-hidden">
              <button
                onClick={() => setFaqOpen(faqOpen === 'why' ? null : 'why')}
                className="w-full flex items-center justify-between p-5 sm:p-7 text-left hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-lg sm:text-xl font-semibold text-white pr-4">why chromie.dev?</span>
                {faqOpen === 'why' ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {faqOpen === 'why' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="px-5 sm:px-7 pb-6 sm:pb-8 text-zinc-400 space-y-5 text-base leading-relaxed"
                >
                  <p>
                    chromie.dev is purpose-built for chrome extension development — not a general-purpose AI tool with extension support bolted on. that focus means better code, fewer hallucinations around Chrome APIs, and a faster path from idea to working extension.
                  </p>
                  <div className="space-y-3">
                    <p className="font-semibold text-white text-lg">built for extensions:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>asset upload — bring icons and images straight into the builder</li>
                      <li>automated AI testing — catch issues before you ship</li>
                      <li>private extension sharing — share a working build without the Chrome Web Store for internal or beta use</li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Extended Demo Modal */}
        <Dialog open={isExtendedDemoOpen} onOpenChange={setIsExtendedDemoOpen}>
          <DialogContent className="sm:max-w-4xl bg-[#0f1117] border-white/[0.08] p-0 overflow-hidden">
            <div className="aspect-video w-full">
              {getYouTubeEmbedUrl(EXTENDED_DEMO_URL) && (
                <iframe
                  title="chromie extended demo"
                  src={getYouTubeEmbedUrl(EXTENDED_DEMO_URL)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  )
}
