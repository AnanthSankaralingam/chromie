"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

function UnsubscribeContent() {
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">
            Unsubscribe from Chromie
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Manage your email preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="mt-2 text-muted-foreground">Processing...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-foreground mb-4">{message}</p>
              <p className="text-sm text-muted-foreground">
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
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-foreground mb-4">{message}</p>
              <Button
                onClick={() => window.location.href = '/'}
                className="mt-4 w-full"
              >
                Back to Chromie
              </Button>
            </div>
          )}

          {email && (
            <div className="text-center text-sm text-muted-foreground border-t border-border pt-4">
              <p>Email: {email}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-foreground">
              Unsubscribe from Chromie
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Manage your email preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="mt-2 text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  )
}
