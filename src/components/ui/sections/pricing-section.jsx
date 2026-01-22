"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/feedback/badge"
import { CircleCheck, Star } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const pricingData = [
  {
    title: "starter",
    price: "$4.99",
    period: "one-time",
    description: "build up to 2 chrome extensions",
    features: [
      "2 chrome extensions",
      "150K AI tokens",
      "30 mins testing"
    ],
    cta: "get started",
    href: "https://buy.stripe.com/28EbJ0105e8o4xF6dM7kc02",
    color: "slate",
    featured: false
  },
  {
    title: "pro",
    price: "$9.99",
    period: "one-time",
    description: "build up to 10 chrome extensions",
    features: [
      "10 chrome extensions",
      "1M AI tokens",
      "120 mins testing"
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
      "unlimited builds",
      "5M tokens per month",
      "240 mins testing per month",
      "cancel anytime"
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
      "unlimited builds",
      "unlimited tokens",
      "priority feature requests"
    ],
    cta: "contact us",
    href: "https://x.com/_ananthhh",
    color: "gradient",
    featured: false,
    isEnterprise: true
  }
]

export default function PricingSection() {
  return (
    <section id="pricing" className="relative z-10 px-6 py-16">
      <div className="container mx-auto max-w-6xl">
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
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {pricingData.map((plan, index) => (
            <PricingCard key={plan.title} plan={plan} index={index} />
          ))}
        </div>
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
          "flex flex-col rounded-2xl border backdrop-blur-xl p-6 text-left h-full transition-all",
          colors.card,
          plan.featured && "ring-1 ring-blue-400/20"
        )}
      >
        {/* Badge and Featured Label */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2">
            <Badge
              className={cn(
                "border",
                colors.badge
              )}
            >
              {plan.title}
            </Badge>
            {plan.featured && (
              <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-blue-400/30 px-2 py-0.5 text-xs font-medium text-blue-300">
                <Star className="w-3 h-3" />
                <span>most popular</span>
              </div>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="text-center mb-4">
          <h4 className={cn("text-4xl font-bold", colors.price)}>
            {plan.price}
            {plan.period && <span className="text-lg text-gray-300"> {plan.period}</span>}
          </h4>
          <p className="text-sm text-gray-400 mt-2">{plan.description}</p>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 my-4" />

        {/* Features */}
        <ul className="space-y-3 mb-6 flex-grow">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-center text-sm text-gray-300">
              <CircleCheck className="mr-3 h-4 w-4 text-green-400 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <div className="mt-auto">
          <Button
            onClick={() => window.open(plan.href, '_blank')}
            className={cn("w-full transition-all duration-300", colors.button)}
          >
            {plan.cta}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
