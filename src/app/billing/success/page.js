"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Zap } from "lucide-react"

export default function BillingSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    if (sessionId) {
      // Verify the session and update subscription status
      // This would typically involve calling your API to confirm the payment
      setTimeout(() => {
        setIsLoading(false)
      }, 2000)
    } else {
      router.push("/pricing")
    }
  }, [sessionId, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-purple-500 border-t-transparent mx-auto mb-4" />
          <p className="text-slate-300">Processing your subscription...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-4 py-3 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">chromie ai</span>
          </Link>
        </div>
      </header>

      {/* Success Content */}
      <div className="container mx-auto px-4 py-20 flex items-center justify-center">
        <Card className="bg-black/20 backdrop-blur-sm border-white/10 max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">Subscription Activated!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-slate-300">
              Thank you for subscribing to Chromie AI Pro! Your subscription is now active and you have access to all
              premium features.
            </p>
            <div className="space-y-2">
              <Link href="/builder">
                <Button className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                  Start Building Extensions
                </Button>
              </Link>
              <Link href="/profile">
                <Button
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                >
                  View Profile
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
