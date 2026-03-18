"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, X, Star, ChevronDown, ChevronUp, Play } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
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

const features = [
  { label: "credits", key: "credits" },                          // all plans
  { label: "simulated browser testing", key: "browserTesting" }, // all plans
  { label: "deployment wizard", key: "deploymentWizard" },       // all plans
  { label: "private extension sharing", key: "privateSharing" }, // pro+
  { label: "GitHub export", key: "githubExport" },               // pro+
  { label: "version history", key: "versionHistory" },           // pro+
  { label: "automated AI testing", key: "advancedTesting" },     // pro+
  { label: "metrics platform", key: "metricsPlatform" },         // pro+
  { label: "privacy policy hosting", key: "privacyPolicyHosting" }, // pro+
  { label: "demo creator", key: "demoCreator" },                 // pro+
  { label: "dedicated support", key: "dedicatedSupport" },       // enterprise only
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
      credits: "10 credits",
      browserTesting: true,
      privateSharing: false,
      githubExport: false,
      versionHistory: false,
      advancedTesting: false,
      metricsPlatform: false,
      privacyPolicyHosting: false,
      deploymentWizard: true,
      demoCreator: false,
      dedicatedSupport: false,
    },
  },
  {
    id: "pro",
    title: "pro",
    price: "$9.99",
    originalPrice: "$14.99",
    period: "/month",
    note: "cancel anytime",
    saleBanner: "limited time sale",
    cta: "get started",
    href: "https://buy.stripe.com/cNi8wO7ot5BSe8f7hQ7kc05",
    featured: true,
    features: {
      credits: "500 credits/month",
      browserTesting: true,
      privateSharing: true,
      githubExport: true,
      versionHistory: true,
      advancedTesting: true,
      metricsPlatform: true,
      privacyPolicyHosting: true,
      deploymentWizard: true,
      demoCreator: true,
      dedicatedSupport: false,
    },
  },
  {
    id: "enterprise",
    title: "enterprise",
    price: "custom",
    period: "",
    note: null,
    cta: "contact us",
    href: "/book-demo",
    featured: false,
    features: {
      credits: "unlimited credits",
      browserTesting: true,
      privateSharing: true,
      githubExport: true,
      versionHistory: true,
      advancedTesting: true,
      metricsPlatform: true,
      privacyPolicyHosting: true,
      deploymentWizard: true,
      demoCreator: true,
      dedicatedSupport: true,
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
          "relative flex flex-col rounded-2xl border p-6 h-full transition-all overflow-hidden",
          "bg-[#0f1117] border-white/[0.08] hover:border-white/[0.14]",
          plan.featured && "border-white/40 shadow-[0_0_40px_rgba(255,255,255,0.12),0_0_80px_rgba(255,255,255,0.06)]"
        )}
      >
        {/* Diagonal sale banner - top right */}
        {plan.saleBanner && (
          <div className="absolute top-0 right-0 w-28 h-28 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 transform rotate-45 translate-x-10 translate-y-6 bg-amber-500 text-slate-900 text-xs font-bold py-1 px-10 shadow-lg">
              sale
            </div>
          </div>
        )}
        {/* Plan title + badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-xl font-bold text-white">{plan.title}</h3>
          {plan.featured && (
            <div className="flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/[0.12] px-2.5 py-1 text-xs font-medium text-zinc-300 whitespace-nowrap">
              <Star className="w-3 h-3 text-zinc-400 flex-shrink-0" />
              <span>most popular</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="mb-1">
          {plan.originalPrice ? (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-500 line-through">{plan.originalPrice}</span>
              <span className="text-3xl font-bold text-slate-100">{plan.price}</span>
              {plan.period && (
                <span className="text-base text-slate-400 ml-1.5">{plan.period}</span>
              )}
            </div>
          ) : (
            <>
              <span className="text-3xl font-bold text-slate-100">{plan.price}</span>
              {plan.period && (
                <span className="text-base text-slate-400 ml-1.5">{plan.period}</span>
              )}
            </>
          )}
        </div>
        <p className="text-xs text-zinc-600 mb-5 min-h-[16px]">{plan.note ?? ""}</p>

        {/* CTA */}
        <Button
          onClick={handleClick}
          className="w-full mb-5 font-medium bg-white text-[#080a0f] hover:bg-zinc-100 transition-all duration-200"
        >
          {plan.cta}
        </Button>

        {/* Divider */}
        <div className="border-t border-white/[0.06] mb-5" />

        {/* Feature list */}
        <ul className="space-y-3 flex-grow">
          {features.map((feature) => {
            const value = plan.features[feature.key]
            const included = value !== false
            return (
              <li key={feature.key} className="flex items-center gap-2.5 text-base">
                {included ? (
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-slate-600 flex-shrink-0" />
                )}
                <span className={cn(included ? "text-zinc-200" : "text-zinc-600")}>
                  {typeof value === "string" ? value : feature.label}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </motion.div>
  )
}

export default function PricingSection() {
  const [faqOpen, setFaqOpen] = useState(null) // 'credit' | 'browser' | 'why' | 'privacyPolicy' | null
  const [isExtendedDemoOpen, setIsExtendedDemoOpen] = useState(false)

  return (
    <section id="pricing" className="relative z-10 px-4 sm:px-6 py-16 overflow-x-hidden">
      <div className="container mx-auto max-w-7xl">

        {/* Limited time sale banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="inline-flex flex-wrap justify-center items-center gap-x-2 gap-y-1 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs sm:text-sm font-semibold">
              <span>limited time sale — Pro $9.99/mo — use code</span>
              <span className="font-mono font-bold text-white tracking-widest bg-amber-500/30 px-2 py-0.5 rounded">LAUNCH11</span>
              <span className="text-amber-200">at checkout</span>
            </div>
          </div>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 md:mb-12"
        >
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-3">pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">pricing</h2>
          <p className="text-sm md:text-base text-zinc-400 max-w-xl mx-auto mb-4">
            choose the perfect plan for your chrome extension development needs
          </p>
          <button
            onClick={() => setIsExtendedDemoOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/20 hover:text-white transition-all"
          >
            <Play className="w-4 h-4" />
            watch extended demo
          </button>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-20">
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
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-3xl font-bold mb-8 text-center text-white">
            faq
          </h2>

          <div className="space-y-4">
            <div className="bg-[#0f1117] border border-white/[0.08] rounded-lg overflow-hidden">
              <button
                onClick={() => setFaqOpen(faqOpen === 'credit' ? null : 'credit')}
                className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-base sm:text-xl font-semibold text-white">what is a credit?</span>
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
                  className="px-4 sm:px-6 pb-4 sm:pb-6 text-zinc-400 space-y-4"
                >
                  <p>
                    credits are used when sending messages in chromie and using the simulated browser. pricing varies by request type:
                  </p>

                  <div className="space-y-2">
                    <p className="font-semibold text-white">credit costs:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>all initial code generation project requests require 3 credits</li>
                      <li>all follow-up code generation requests require 1 credit</li>
                      <li>each "try it out" simulated browser use requires 1 credit</li>
                    </ul>
                  </div>

                  <div className="mt-4">
                    <p className="font-semibold text-white mb-3">here are some example prompts and their cost:</p>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse bg-white/[0.02] rounded-lg">
                        <thead>
                          <tr className="border-b border-white/[0.08]">
                            <th className="text-left py-3 px-4 text-white font-semibold">user prompt</th>
                            <th className="text-left py-3 px-4 text-white font-semibold">work done</th>
                            <th className="text-left py-3 px-4 text-white font-semibold">credits</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          <tr className="border-b border-white/[0.06]">
                            <td className="py-3 px-4">create a new chrome extension</td>
                            <td className="py-3 px-4">initial code generation with all files</td>
                            <td className="py-3 px-4 font-semibold">3.00</td>
                          </tr>
                          <tr className="border-b border-white/[0.06]">
                            <td className="py-3 px-4">add a button to the popup</td>
                            <td className="py-3 px-4">updates existing extension files</td>
                            <td className="py-3 px-4 font-semibold">1.00</td>
                          </tr>
                          <tr className="border-b border-white/[0.06]">
                            <td className="py-3 px-4">change the background color</td>
                            <td className="py-3 px-4">updates styles</td>
                            <td className="py-3 px-4 font-semibold">1.00</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4">try it out (simulated browser)</td>
                            <td className="py-3 px-4">opens a simulated browser session to test your extension</td>
                            <td className="py-3 px-4 font-semibold">1.00</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="bg-[#0f1117] border border-white/[0.08] rounded-lg overflow-hidden">
              <button
                onClick={() => setFaqOpen(faqOpen === 'why' ? null : 'why')}
                className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-base sm:text-xl font-semibold text-white">why chromie.dev?</span>
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
                  className="px-4 sm:px-6 pb-4 sm:pb-6 text-zinc-400 space-y-4"
                >
                  <p>
                    chromie.dev is purpose-built for chrome extension development — not a general-purpose AI tool with extension support bolted on. that focus means better code, fewer hallucinations around Chrome APIs, and a faster path from idea to working extension.
                  </p>
                  <div className="space-y-2">
                    <p className="font-semibold text-white">built-in features you won&apos;t find elsewhere:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>simulated browser testing — test your extension instantly without any manual setup</li>
                      <li>asset upload — bring in your own icons and images directly into the builder</li>
                      <li>automated AI testing — chromie.dev can test your extension and catch issues for you</li>
                      <li>private extension sharing — share a working version with teammates or clients without going through the Chrome Web Store, perfect for internal tools or beta testing</li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="bg-[#0f1117] border border-white/[0.08] rounded-lg overflow-hidden">
              <button
                onClick={() => setFaqOpen(faqOpen === 'browser' ? null : 'browser')}
                className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-base sm:text-xl font-semibold text-white">what is simulated browser testing?</span>
                {faqOpen === 'browser' ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {faqOpen === 'browser' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="px-4 sm:px-6 pb-4 sm:pb-6 text-zinc-400 space-y-4"
                >
                  <p>
                    simulated browser testing lets you run chrome right inside chromie. we host Chrome through our website — you get a full browser with your extension loaded and pinned, so you can test instantly.
                  </p>
                  <p>
                    no more manually loading unpacked extensions or hitting reload every time you make a change. it&apos;s all handled in the website.
                  </p>
                </motion.div>
              )}
            </div>

            <div className="bg-[#0f1117] border border-white/[0.08] rounded-lg overflow-hidden">
              <button
                onClick={() => setFaqOpen(faqOpen === 'privacyPolicy' ? null : 'privacyPolicy')}
                className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-base sm:text-xl font-semibold text-white">what is privacy policy hosting?</span>
                {faqOpen === 'privacyPolicy' ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {faqOpen === 'privacyPolicy' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="px-4 sm:px-6 pb-4 sm:pb-6 text-zinc-400 space-y-4"
                >
                  <p>
                    every chrome extension published to the chrome web store requires a publicly hosted privacy policy. traditionally, this meant spinning up a separate website or page just to host that document — and repeating that process for every extension you build.
                  </p>
                  <p>
                    chromie handles this automatically. when you build an extension, chromie generates a privacy policy tailored to what your extension actually does, then hosts it for you at a dedicated URL — no separate website needed. every extension gets its own hosted policy, ready to paste straight into the Chrome Web Store submission form.
                  </p>
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
