"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Edit3, Chrome, TestTube, Zap, Check, Star } from "lucide-react"
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
                    <div className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="text-gray-300">150K AI tokens</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="text-gray-300">30 mins testing</span>
                    </div>
                  </div>
                  <Button 
                    onClick={() => window.open('https://buy.stripe.com/test_7sY28q5gl0hyaW3gSq7kc01', '_blank')}
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
                      <span className="text-gray-300">10 chrome extensions</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="text-gray-300">1M AI tokens</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="text-gray-300">120 mins testing</span>
                    </div>
                  </div>
                  <Button 
                    onClick={() => window.open('https://buy.stripe.com/dRm00i7ot2pGd4b45E7kc03', '_blank')}
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
                      <span className="text-gray-300">5M tokens per month</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="text-gray-300">240 mins testing per month</span>
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
