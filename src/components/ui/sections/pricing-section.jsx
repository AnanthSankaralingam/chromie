"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, X, Star, ChevronDown, ChevronUp } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const features = [
  { label: "credits", key: "credits" },                          // all plans
  { label: "simulated browser testing", key: "browserTesting" }, // all plans
  { label: "private extension sharing", key: "privateSharing" }, // pro+
  { label: "GitHub export", key: "githubExport" },               // pro+
  { label: "version history", key: "versionHistory" },           // pro+
  { label: "automated AI testing", key: "advancedTesting" },     // pro+
  { label: "metrics platform", key: "metricsPlatform" },         // pro+
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
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400/30 via-cyan-400/30 to-blue-400/30 rounded-2xl blur opacity-60 animate-pulse" />
      )}

      <div
        className={cn(
          "relative flex flex-col rounded-2xl border backdrop-blur-xl p-6 h-full transition-all overflow-hidden",
          "bg-slate-900/60 border-slate-700/50 hover:border-slate-600/70 shadow-xl shadow-slate-900/50",
          plan.featured && "ring-2 ring-blue-400/50 shadow-2xl shadow-blue-500/30 border-blue-400/40"
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
            <div className="flex items-center gap-1 rounded-full bg-blue-500/20 border border-blue-400/40 px-2.5 py-1 text-xs font-medium text-blue-200 whitespace-nowrap">
              <Star className="w-3 h-3 text-blue-300 flex-shrink-0" />
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
        <p className="text-xs text-slate-500 mb-5 min-h-[16px]">{plan.note ?? ""}</p>

        {/* CTA */}
        <Button
          onClick={handleClick}
          className="w-full mb-5 font-semibold bg-white text-gray-900 hover:bg-gray-100 shadow-lg shadow-white/10 hover:scale-[1.02] transition-all duration-200"
        >
          {plan.cta}
        </Button>

        {/* Divider */}
        <div className="border-t border-slate-700/50 mb-5" />

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
                <span className={cn(included ? "text-slate-200" : "text-slate-500")}>
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
  const [faqOpen, setFaqOpen] = useState(null) // 'credit' | 'browser' | null

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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-sm font-semibold">
            <span>limited time sale</span>
            <span className="text-amber-400">— Pro $9.99/mo</span>
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
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-3">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-50 mb-3">pricing</h2>
          <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto">
            choose the perfect plan for your chrome extension development needs
          </p>
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
          <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-gray-400 to-gray-300 bg-clip-text text-transparent">
            faq
          </h2>

          <div className="space-y-4">
            <div className="bg-slate-800/70 backdrop-blur-sm border-2 border-slate-600/50 rounded-lg overflow-hidden shadow-xl">
              <button
                onClick={() => setFaqOpen(faqOpen === 'credit' ? null : 'credit')}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-700/50 transition-colors"
              >
                <span className="text-xl font-semibold text-white">what is a credit?</span>
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
                  className="px-6 pb-6 text-gray-300 space-y-4"
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
                      <table className="w-full border-collapse bg-slate-900/30 rounded-lg">
                        <thead>
                          <tr className="border-b border-slate-600">
                            <th className="text-left py-3 px-4 text-white font-semibold">user prompt</th>
                            <th className="text-left py-3 px-4 text-white font-semibold">work done</th>
                            <th className="text-left py-3 px-4 text-white font-semibold">credits</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          <tr className="border-b border-slate-700/50">
                            <td className="py-3 px-4">create a new chrome extension</td>
                            <td className="py-3 px-4">initial code generation with all files</td>
                            <td className="py-3 px-4 font-semibold">3.00</td>
                          </tr>
                          <tr className="border-b border-slate-700/50">
                            <td className="py-3 px-4">add a button to the popup</td>
                            <td className="py-3 px-4">updates existing extension files</td>
                            <td className="py-3 px-4 font-semibold">1.00</td>
                          </tr>
                          <tr className="border-b border-slate-700/50">
                            <td className="py-3 px-4">change the background color</td>
                            <td className="py-3 px-4">updates styles</td>
                            <td className="py-3 px-4 font-semibold">1.00</td>
                          </tr>
                          <tr className="border-b border-slate-700/50">
                            <td className="py-3 px-4">add authentication with sign up and login</td>
                            <td className="py-3 px-4">adds authentication pages and logic, updates routes</td>
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

            <div className="bg-slate-800/70 backdrop-blur-sm border-2 border-slate-600/50 rounded-lg overflow-hidden shadow-xl">
              <button
                onClick={() => setFaqOpen(faqOpen === 'browser' ? null : 'browser')}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-700/50 transition-colors"
              >
                <span className="text-xl font-semibold text-white">what is simulated browser testing?</span>
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
                  className="px-6 pb-6 text-gray-300 space-y-4"
                >
                  <p>
                    simulated browser testing lets you run Chrome right inside chromie. we host Chrome through our website — you get a full browser with your extension loaded and pinned, so you can test instantly.
                  </p>
                  <p>
                    no more manually loading unpacked extensions or hitting reload every time you make a change. it&apos;s all handled in the website.
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  )
}
