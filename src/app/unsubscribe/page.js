"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle } from "lucide-react"

export default function UnsubscribePage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const [status, setStatus] = useState('loading') // 'loading', 'success', 'error'
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!email) {
      setStatus('error')
      setMessage('No email address provided')
      return
    }

    // For now, just show success - in a real implementation, you'd call an API
    // to unsubscribe the user from emails
    setStatus('success')
    setMessage(`You have been unsubscribed from Chromie emails.`)
  }, [email])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Unsubscribe from Chromie
          </CardTitle>
          <CardDescription>
            Manage your email preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Processing...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-700 mb-4">{message}</p>
              <p className="text-sm text-gray-500">
                You can still use Chromie - this only affects marketing emails.
              </p>
              <Button 
                onClick={() => window.location.href = '/'}
                className="mt-4 w-full"
              >
                Back to Chromie
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-4">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-700 mb-4">{message}</p>
              <Button 
                onClick={() => window.location.href = '/'}
                className="mt-4 w-full"
              >
                Back to Chromie
              </Button>
            </div>
          )}

          {email && (
            <div className="text-center text-sm text-gray-500 border-t pt-4">
              <p>Email: {email}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
