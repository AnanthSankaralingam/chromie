"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/feedback/badge"
import { CircleCheck, Star, ChevronDown, ChevronUp, Info } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const pricingData = [
  {
    title: "free",
    price: "$0",
    period: "",
    description: "get started with chrome extension development",
    features: [
      "10 credits (one-time)",
      "unlimited chrome extensions",
      "AI-powered code generation",
      "simulated browser testing",
      "code editing & iteration",
      "download & export extensions",
      "public extension sharing",
      "all UI types supported"
    ],
    cta: "get started",
    href: "/builder",
    color: "slate",
    featured: false
  },
  {
    title: "pro",
    price: "$9.99",
    period: "one-time",
    description: "build unlimited chrome extensions",
    features: [
      "500 credits (one-time)",
      "version history",
      "GitHub export",
      "private extension sharing",
      "on-demand credit top-ups",
      "unlimited extension downloads"
    ],
    cta: "get started",
    href: "https://buy.stripe.com/6oU4gydMRc0g8NVeKi7kc04",
    color: "purple",
    featured: true
  },
  {
    title: "legend",
    price: "$14.99",
    period: "/month",
    description: "unlimited builds for agencies or frequent creators",
    features: [
      "1000 credits per month",
      "credit rollovers",
      "priority support",
      "advanced browser use agent testing features",
      "metrics platform",
      "team collaboration",
      "cancel anytime",
    ],
    cta: "get started",
    href: "https://buy.stripe.com/cNi8wO7ot5BSe8f7hQ7kc05",
    color: "blue",
    featured: false
  },
  {
    title: "enterprise",
    price: "custom",
    period: "",
    description: "tailored solutions for large teams and organizations",
    features: [
      "dedicated support",
      "unlimited credits",
      "custom integrations",
      "SSO & advanced security",
      "onboarding services",
      "priority feature requests"
    ],
    cta: "contact us",
    href: "/book-demo",
    color: "gradient",
    featured: false,
    isEnterprise: true
  }
]

// Filter features to only show unique features not in lower tier plans
function processPricingData(data) {
  const processed = []
  const seenFeatures = new Set()
  const planNames = ["free", "pro", "legend", "enterprise"]
  
  for (let i = 0; i < data.length; i++) {
    const plan = data[i]
    
    // Enterprise plan keeps all its features as-is but still tracks previous plan
    if (plan.isEnterprise) {
      processed.push({ 
        ...plan,
        previousPlanName: planNames[i - 1] || null
      })
      continue
    }
    
    // Filter out features that appeared in lower tier plans
    const uniqueFeatures = plan.features.filter(feature => {
      if (seenFeatures.has(feature.toLowerCase())) {
        return false
      }
      seenFeatures.add(feature.toLowerCase())
      return true
    })
    
    processed.push({
      ...plan,
      features: uniqueFeatures,
      previousPlanName: planNames[i - 1] || null
    })
  }
  
  return processed
}

export default function PricingSection() {
  const [faqOpen, setFaqOpen] = useState(false)
  const processedPricingData = processPricingData(pricingData)

  return (
    <section id="pricing" className="relative z-10 px-4 sm:px-6 py-16 overflow-x-hidden">
      <div className="container mx-auto max-w-7xl">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 overflow-visible"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent leading-normal pb-2 overflow-visible">
            pricing
          </h2>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
            choose the perfect plan for your chrome extension development needs
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-20">
          {processedPricingData.map((plan, index) => (
            <PricingCard key={plan.title} plan={plan} index={index} />
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
          <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            faq
          </h2>
          
          <div className="space-y-4">
            {/* What is a credit? FAQ */}
            <div className="bg-slate-800/70 backdrop-blur-sm border-2 border-slate-600/50 rounded-lg overflow-hidden shadow-xl">
              <button
                onClick={() => setFaqOpen(!faqOpen)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-700/50 transition-colors"
              >
                <span className="text-xl font-semibold text-white">what is a credit?</span>
                {faqOpen ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              {faqOpen && (
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
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function PricingCard({ plan, index }) {
  const colorStyles = {
    slate: {
      card: "bg-slate-800/40 border-slate-600/30 hover:border-slate-500/50",
      badge: "bg-slate-600/20 text-slate-300 border-slate-500/40",
      price: "text-slate-200",
      button: "bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 shadow-lg shadow-slate-500/20"
    },
    purple: {
      card: "bg-purple-900/20 border-purple-500/40 hover:border-purple-400/60",
      badge: "bg-purple-500/20 text-purple-300 border-purple-400/50",
      price: "text-purple-300",
      button: "bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 hover:from-purple-500 hover:via-purple-400 hover:to-blue-500 shadow-lg shadow-purple-500/30"
    },
    blue: {
      card: "bg-blue-900/20 border-blue-500/40 hover:border-blue-400/60",
      badge: "bg-blue-500/20 text-blue-300 border-blue-400/50",
      price: "text-blue-300",
      button: "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-500/30"
    },
    gradient: {
      card: "bg-gradient-to-br from-purple-900/20 via-slate-800/40 to-blue-900/20 border-purple-400/30 hover:border-purple-300/50",
      badge: "bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-200 border-purple-400/40",
      price: "bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent",
      button: "bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-500 hover:via-blue-500 hover:to-purple-500 shadow-lg shadow-purple-500/30"
    }
  }

  const colors = colorStyles[plan.color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
      className="relative"
    >
      <div
        className={cn(
          "flex flex-col rounded-2xl border backdrop-blur-xl p-6 sm:p-8 text-left h-full transition-all min-w-0",
          colors.card,
          plan.featured && "ring-2 ring-purple-400/40 shadow-lg shadow-purple-500/20"
        )}
      >
        {/* Badge and Featured Label */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col items-start gap-2">
            <h3 className="text-xl sm:text-2xl font-bold text-white capitalize break-words">{plan.title}</h3>
            {plan.featured && (
              <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-blue-400/30 px-2 sm:px-3 py-1 text-xs font-medium text-blue-300 whitespace-nowrap">
                <Star className="w-3 h-3 flex-shrink-0" />
                <span>most popular</span>
              </div>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="mb-4 sm:mb-6">
          <h4 className={cn("text-3xl sm:text-4xl font-bold mb-2 break-words", colors.price)}>
            {plan.price}
            {plan.period && <span className="text-base sm:text-lg text-gray-300 font-normal"> {plan.period}</span>}
          </h4>
          {plan.title === "free" && (
            <p className="text-xs text-gray-400 mb-2 sm:mb-3">No credit card needed</p>
          )}
          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed break-words">{plan.description}</p>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 mb-4 sm:mb-6" />

        {/* Features */}
        <div className="mb-6 sm:mb-8 flex-grow min-w-0">
          {plan.previousPlanName && (
            <p className="text-xs font-semibold text-gray-400 mb-4 sm:mb-5 uppercase tracking-wider break-words">
              All features in {plan.previousPlanName}, plus:
            </p>
          )}
          {!plan.previousPlanName && (
            <p className="text-xs font-semibold text-gray-400 mb-4 sm:mb-5 uppercase tracking-wider">
              Free for everyone
            </p>
          )}
          <ul className="space-y-2.5 sm:space-y-3.5">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start text-xs sm:text-sm text-gray-200 min-w-0">
                <CircleCheck className="mr-2 sm:mr-3 h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed break-words">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Button */}
        <div className="mt-auto">
          <Button
            onClick={() => {
              if (plan.href.startsWith('http')) {
                window.open(plan.href, '_blank')
              } else {
                window.location.href = plan.href
              }
            }}
            className={cn(
              "w-full transition-all duration-300 font-semibold py-4 sm:py-6 text-sm sm:text-base",
              plan.featured 
                ? "bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 hover:from-purple-500 hover:via-purple-400 hover:to-blue-500 shadow-lg shadow-purple-500/30 text-white"
                : colors.button
            )}
          >
            {plan.cta}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
