"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Edit3, Chrome, TestTube, Zap, Check, Star } from "lucide-react"
import { useSession } from '@/components/SessionProviderClient'
import { useRouter } from "next/navigation"
import AppBar from "@/components/ui/app-bar"
import AuthModal from "@/components/ui/auth-modal"
import BillingModal from "@/components/ui/billing-modal"

export default function PricingPage() {
  const { isLoading, user } = useSession()
  const router = useRouter()
  const [billingModalOpen, setBillingModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 text-white">
        {/* Header */}
        <AppBar />

        {/* Main Content */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            {/* Title */}
            <div className="text-center mb-16">
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
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
                  <div className="text-4xl font-bold text-white">$12<span className="text-lg text-gray-300">/month</span></div>
                  <CardDescription className="text-gray-300">
                    perfect for individual developers and hobbyists
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="text-gray-300">up to 20 builds per month</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="text-gray-300">100,000 tokens per month</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="text-gray-300">basic support</span>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleGetStarted('starter')}
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
                  <div className="text-4xl font-bold text-white">$25<span className="text-lg text-gray-300">/month</span></div>
                  <CardDescription className="text-gray-300">
                    ideal for solo founders and indie businesses
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="text-gray-300">100 builds per month</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="text-gray-300">1,000,000 tokens per month</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="text-gray-300">priority support</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="text-gray-300">advanced analytics</span>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleGetStarted('pro')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    get started
                  </Button>
                </CardContent>
              </Card>

              {/* Enterprise Plan */}
              <Card className="bg-green-800/30 backdrop-blur-sm border-green-500/30 hover:border-green-400/50 transition-all">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-green-300">enterprise</CardTitle>
                  <div className="text-4xl font-bold text-white">contact us</div>
                  <CardDescription className="text-gray-300">
                    maximum security and scale for large teams
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
                      <span className="text-gray-300">unlimited tokens</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="text-gray-300">dedicated support</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="text-gray-300">automated backend proxy</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="text-gray-300">maximum security</span>
                    </div>
                  </div>
                  <Button 
                    onClick={handleContactUs}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    contact us
                  </Button>
                </CardContent>
              </Card>
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
