"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Zap, X, Check, CreditCard, Mail, User } from "lucide-react"
import { useSession } from '@/components/SessionProviderClient'
import AuthModal from "@/components/ui/auth-modal"

// Add Stripe import
const loadStripe = async (publishableKey) => {
  const { loadStripe: loadStripeFn } = await import('@stripe/stripe-js')
  return loadStripeFn(publishableKey)
}

export default function BillingModal({ isOpen, onClose, selectedPlan }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const { user, supabase } = useSession()

  const planDetails = {
    starter: {
      name: "Starter",
      price: "$12/month",
      description: "Perfect for individual developers and hobbyists",
      features: ["Up to 20 builds per month", "10,000 tokens per month", "Basic support"]
    },
    pro: {
      name: "Pro", 
      price: "$25/month",
      description: "Ideal for solo founders and indie businesses",
      features: ["100 builds per month", "50,000 tokens per month", "Priority support", "Advanced analytics"]
    },
    enterprise: {
      name: "Enterprise",
      price: "Contact us",
      description: "Maximum security and scale for large teams",
      features: ["Unlimited builds", "Unlimited tokens", "Dedicated support", "Automated backend proxy", "Maximum security"]
    }
  }

  const currentPlan = selectedPlan ? planDetails[selectedPlan] : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) {
      setError("please sign in to continue")
      return
    }

    if (selectedPlan === 'enterprise') {
      // Handle enterprise contact form
      setSuccess(true)
      return
    }

    setLoading(true)
    setError("")

    try {
      // Create Stripe checkout session
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: selectedPlan,
          userId: user.id,
          email: user.email
        }),
      })

      const { sessionId, error } = await response.json()

      if (error) {
        setError(error)
        return
      }

      // Redirect to Stripe checkout
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      })

      if (stripeError) {
        setError(stripeError.message)
      }
    } catch (err) {
      setError("something went wrong. please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError("")
    setSuccess(false)
    onClose()
  }

  if (!currentPlan) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/95 border-slate-700 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-white text-xl font-semibold">
            {selectedPlan === 'enterprise' ? 'contact us' : 'complete your subscription'}
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">thank you!</h3>
            <p className="text-gray-300">
              {selectedPlan === 'enterprise' 
                ? 'we\'ll contact you soon to discuss your enterprise needs.'
                : 'your subscription has been processed successfully.'
              }
            </p>
            <Button onClick={handleClose} className="mt-6">
              close
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Plan Summary */}
            <Card className="bg-slate-700/50 border-slate-600">
              <CardHeader>
                <CardTitle className="text-white">{currentPlan.name}</CardTitle>
                <CardDescription className="text-gray-300">{currentPlan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white mb-4">{currentPlan.price}</div>
                <div className="space-y-2">
                  {currentPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {selectedPlan === 'enterprise' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-white">name</Label>
                  <Input 
                    id="name" 
                    type="text" 
                    required 
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="your name"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-white">email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    required 
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="your email"
                    defaultValue={user?.email || ''}
                  />
                </div>
                <div>
                  <Label htmlFor="company" className="text-white">company</Label>
                  <Input 
                    id="company" 
                    type="text" 
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="your company"
                  />
                </div>
                <div>
                  <Label htmlFor="message" className="text-white">message</Label>
                  <textarea 
                    id="message" 
                    rows={4}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white resize-none"
                    placeholder="tell us about your needs..."
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'sending...' : 'send message'}
                </Button>
              </form>
            ) : (
              <div className="text-center">
                {!user ? (
                  <div className="space-y-4">
                    <p className="text-gray-300">please sign in to continue with your subscription</p>
                    <Button 
                      onClick={() => setIsAuthModalOpen(true)}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      sign in
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button 
                      onClick={handleSubmit} 
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      disabled={loading}
                    >
                      {loading ? 'processing...' : 'proceed to payment'}
                    </Button>
                    <p className="text-xs text-gray-400 mt-2">
                      you'll be redirected to stripe to complete your payment
                    </p>
                  </>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-md p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        redirectUrl={window.location.pathname}
      />
    </Dialog>
  )
} 