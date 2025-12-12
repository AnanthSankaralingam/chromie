"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/feedback/badge"
import { CircleCheck, Star } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const pricingData = [
  {
    title: "Starter",
    price: "$4.99",
    period: "one-time",
    description: "Build up to 2 chrome extensions",
    features: [
      "2 chrome extensions",
      "150K AI tokens",
      "30 mins testing"
    ],
    cta: "Get Started",
    href: "https://buy.stripe.com/28EbJ0105e8o4xF6dM7kc02",
    featured: false
  },
  {
    title: "Pro",
    price: "$9.99",
    period: "one-time",
    description: "Build up to 10 chrome extensions",
    features: [
      "10 chrome extensions",
      "1M AI tokens",
      "120 mins testing"
    ],
    cta: "Get Started",
    href: "https://buy.stripe.com/6oU4gydMRc0g8NVeKi7kc04",
    featured: true
  },
  {
    title: "Legend",
    price: "$14.99",
    period: "/month",
    description: "Unlimited builds for agencies or frequent creators",
    features: [
      "Unlimited builds",
      "5M tokens per month",
      "240 mins testing per month",
      "Cancel anytime"
    ],
    cta: "Get Started",
    href: "https://buy.stripe.com/cNi8wO7ot5BSe8f7hQ7kc05",
    featured: false
  },
  {
    title: "Enterprise",
    price: "Custom",
    period: "",
    description: "Tailored solutions for large teams and organizations",
    features: [
      "Dedicated support",
      "Unlimited builds",
      "Unlimited tokens",
      "Priority feature requests"
    ],
    cta: "Contact Us",
    href: "https://x.com/_ananthhh",
    featured: false,
    isEnterprise: true
  }
]

export default function PricingSection() {
  return (
    <section id="pricing" className="py-24 bg-secondary/30 relative z-10">
      <div className="container-width">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan for your Chrome extension development needs.
          </p>
        </motion.div>

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
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
      className="relative h-full"
    >
      <div
        className={cn(
          "flex flex-col rounded-3xl border p-6 text-left h-full transition-all duration-300",
          "bg-card border-border/50 hover:shadow-xl hover:-translate-y-1",
          plan.featured && "ring-2 ring-primary border-primary shadow-lg shadow-primary/10"
        )}
      >
        {/* Badge and Featured Label */}
        <div className="flex items-center justify-between mb-6">
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-secondary text-secondary-foreground"
          >
            {plan.title}
          </Badge>
          {plan.featured && (
            <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <Star className="w-3 h-3 fill-primary" />
              <span>Popular</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="mb-6">
          <h4 className="text-4xl font-bold text-foreground tracking-tight">
            {plan.price}
            {plan.period && <span className="text-base font-normal text-muted-foreground ml-1">{plan.period}</span>}
          </h4>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{plan.description}</p>
        </div>

        {/* Divider */}
        <div className="border-t border-border/50 my-6" />

        {/* Features */}
        <ul className="space-y-4 mb-8 flex-grow">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start text-sm text-foreground/80">
              <CircleCheck className="mr-3 h-5 w-5 text-primary flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <div className="mt-auto">
          <Button
            onClick={() => window.open(plan.href, '_blank')}
            className={cn(
              "w-full rounded-xl py-6 text-base font-semibold transition-all duration-300",
              plan.featured
                ? "btn-primary shadow-lg shadow-primary/20 hover:shadow-primary/30"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {plan.cta}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
