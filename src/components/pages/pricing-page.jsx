"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Edit3, Chrome, TestTube, Zap, Check, Star, ChevronDown, ChevronUp } from "lucide-react"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useSession } from '@/components/SessionProviderClient'
import { useRouter } from "next/navigation"
import AppBar from "@/components/ui/app-bars/app-bar"
import AuthModal from "@/components/ui/modals/modal-auth"
import BillingModal from "@/components/ui/modals/modal-billing"

export default function PricingPage() {
  const { isLoading, user } = useSession()
  const router = useRouter()
  const [billingModalOpen, setBillingModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [faqOpen, setFaqOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-slate-900 to-slate-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-500 border-t-transparent" />
      </div>
    )
  }

  const handleGetStarted = (plan) => {
    if (!user) {
      // For now, just open the billing modal anyway - the modal will handle auth
      setSelectedPlan(plan)
      setBillingModalOpen(true)
      return
    }
    setSelectedPlan(plan)
    setBillingModalOpen(true)
  }

  const handleContactUs = () => {
    window.open('https://x.com/_ananthhh', '_blank')
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-[#0A0A0F] via-[#0F111A] to-[#0A0A0F] text-white relative overflow-hidden flex flex-col">
        {/* Header */}
        <AppBar />

        {/* Animated Background Blobs */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          {/* Flickering Grid Background */}
          <FlickeringGrid
            className="absolute inset-0 z-0"
            squareSize={4}
            gridGap={6}
            color="rgb(139, 92, 246)"
            maxOpacity={0.15}
            flickerChance={2.0}
          />

          <motion.div
            className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-600/15 rounded-full filter blur-[140px] z-10"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.15, 0.25, 0.15],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute top-1/3 right-1/4 w-[700px] h-[700px] bg-blue-600/15 rounded-full filter blur-[140px] z-10"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="max-w-6xl mx-auto">
            {/* Title */}
            <div className="text-center mb-16 overflow-visible">
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent leading-normal pb-2 overflow-visible">
                pricing
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                choose the perfect plan for your chrome extension development needs
              </p>
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-8">
              {/* Starter Plan */}
              <Card className="bg-purple-800/30 backdrop-blur-sm border-purple-500/30 hover:border-purple-400/50 transition-all">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-purple-300">starter</CardTitle>
                  <div className="text-4xl font-bold text-white">$4.99<span className="text-lg text-gray-300"> one-time</span></div>
                  <CardDescription className="text-gray-300">
                    build up to 2 chrome extensions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="text-gray-300">2 chrome extensions</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => window.open('https://buy.stripe.com/28EbJ0105e8o4xF6dM7kc02', '_blank')}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    get started
                  </Button>
                </CardContent>
              </Card>

              {/* Pro Plan */}
              <Card className="bg-blue-800/30 backdrop-blur-sm border-blue-500/30 hover:border-blue-400/50 transition-all relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center space-x-1">
                    <Star className="w-4 h-4" />
                    <span>most popular</span>
                  </div>
                </div>
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-blue-300">pro</CardTitle>
                  <div className="text-4xl font-bold text-white">$9.99<span className="text-lg text-gray-300"> one-time</span></div>
                  <CardDescription className="text-gray-300">
                    build up to 10 chrome extensions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="text-gray-300">500 credits</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => window.open('https://buy.stripe.com/6oU4gydMRc0g8NVeKi7kc04', '_blank')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    get started
                  </Button>
                </CardContent>
              </Card>

              {/* Legend Plan */}
              <Card className="bg-green-800/30 backdrop-blur-sm border-green-500/30 hover:border-green-400/50 transition-all">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-green-300">legend</CardTitle>
                  <div className="text-4xl font-bold text-white">$14.99<span className="text-lg text-gray-300">/month</span></div>
                  <CardDescription className="text-gray-300">
                    unlimited builds for agencies or frequent creators
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="text-gray-300">unlimited builds</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="text-gray-300">cancel anytime</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => window.open('https://buy.stripe.com/cNi8wO7ot5BSe8f7hQ7kc05', '_blank')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    get started
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* FAQ Section */}
            <div className="mt-20 mb-16 max-w-3xl mx-auto relative z-10">
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
                        credits are used when sending messages in chromie. pricing varies by request type:
                      </p>
                      
                      <div className="space-y-2">
                        <p className="font-semibold text-white">credit costs:</p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>all initial code generation project requests require 3 credits</li>
                          <li>all follow-up code generation requests require 1 credit</li>
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
                              <tr>
                                <td className="py-3 px-4">add authentication with sign up and login</td>
                                <td className="py-3 px-4">adds authentication pages and logic, updates routes</td>
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
            </div>
          </div>
        </div>
      </div>

      {/* Billing Modal */}
      <BillingModal
        isOpen={billingModalOpen}
        onClose={() => setBillingModalOpen(false)}
        selectedPlan={selectedPlan}
      />
    </>
  )
}
