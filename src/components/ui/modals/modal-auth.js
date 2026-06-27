"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/forms-and-input/input"
import { useSession } from '@/components/SessionProviderClient'

export default function AuthModal({ isOpen, onClose, redirectUrl, showBlurredBackground }) {
  const [loadingMethod, setLoadingMethod] = useState(null)
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")
  const [emailSent, setEmailSent] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const { supabase } = useSession()

  useEffect(() => {
    // Check for auth errors in URL params when modal opens
    if (isOpen) {
      const urlParams = new URLSearchParams(window.location.search)
      const authError = urlParams.get('error')
      const message = urlParams.get('message')
      
      if (authError) {
        let errorMessage = "Authentication failed. Please try again."
        
        switch (authError) {
          case 'auth_callback_error':
            errorMessage = message ? `Auth error: ${decodeURIComponent(message)}` : "Authentication callback failed."
            break
          case 'no_session':
            errorMessage = "No session was created. Please try signing in again."
            break
          case 'no_code':
            errorMessage = "Invalid authentication response. Please try again."
            break
          case 'auth_timeout':
            errorMessage = "Authentication timed out. Please try signing in again."
            break
          case 'exception':
            errorMessage = message ? `Error: ${decodeURIComponent(message)}` : "An unexpected error occurred."
            break
        }
        
        setError(errorMessage)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [isOpen])

  const prepareAuthRedirect = () => {
    const currentOrigin = window.location.origin
    const finalRedirect = redirectUrl?.trim() || ""
    const secure = window.location.protocol === "https:" ? "; Secure" : ""
    let authCallbackUrl = `${currentOrigin}/auth/callback`

    if (finalRedirect) {
      authCallbackUrl += `?next=${encodeURIComponent(finalRedirect)}`
      document.cookie = `auth_redirect_destination=${encodeURIComponent(finalRedirect)}; path=/; max-age=300; samesite=lax${secure}`
      sessionStorage.setItem("auth_redirect_destination", finalRedirect)
    } else {
      document.cookie = `auth_redirect_destination=; path=/; max-age=0; samesite=lax`
      sessionStorage.removeItem("auth_redirect_destination")
    }

    return authCallbackUrl
  }

  const handleGoogleAuth = async () => {
    setLoadingMethod("google")
    setError("")
    
    try {
      const authCallbackUrl = prepareAuthRedirect()

      // Use Supabase's built-in OAuth flow
      // This will redirect to Google, then Google will redirect to our callback route
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // This is where Google OAuth will redirect after successful auth
          redirectTo: authCallbackUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      })
      
      if (error) {
        console.error('❌ Supabase OAuth error:', error)
        setError(error.message)
        setLoadingMethod(null)
      }
      // If successful, browser will redirect to Google OAuth
      // Then Google will redirect to Supabase callback
      // Then Supabase will redirect to our redirectTo URL
    } catch (err) {
      console.error('❌ Exception in handleGoogleAuth:', err)
      setError("An unexpected error occurred. Please try again.")
      setLoadingMethod(null)
    }
  }

  const handleEmailAuth = async (event) => {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError("Enter your email address to continue.")
      return
    }

    setLoadingMethod("email")
    setError("")
    setEmailSent(false)

    try {
      const authCallbackUrl = prepareAuthRedirect()
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: authCallbackUrl,
          shouldCreateUser: true,
        },
      })

      if (error) {
        setError(error.message)
        setLoadingMethod(null)
        return
      }

      console.log("[auth] magic link sent", normalizedEmail)
      setEmailSent(true)
    } catch (err) {
      console.error("❌ Exception in handleEmailAuth:", err)
      setError("Could not send a magic link. Please try again.")
    } finally {
      setLoadingMethod(null)
    }
  }

  const loading = Boolean(loadingMethod)

  const blurredOverlayStyle = showBlurredBackground
    ? {
        backgroundImage: "url('/auth-blurred-background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: 'transparent',
      }
    : undefined

  return (
    <>
      {isOpen && showBlurredBackground && typeof document !== 'undefined' && createPortal(
        <div className="fixed left-[11%] top-[66%] z-[49] pointer-events-none select-none">
          <div className="px-4 py-3 flex gap-2.5">
            {['-0.32s', '-0.16s', '0s'].map((delay) => (
              <div
                key={delay}
                className="w-3 h-3 rounded-full bg-white/80 animate-bounce shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                style={{ animationDelay: delay }}
              />
            ))}
          </div>
        </div>,
        document.body
      )}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="sm:max-w-md bg-slate-800/95 border-slate-700 backdrop-blur-sm"
          overlayClassName="z-[48]"
          overlayStyle={blurredOverlayStyle}
        >
        <DialogTitle className="sr-only">Authentication</DialogTitle>
        <div className="sr-only">Sign in or create an account to continue using Chromie automations</div>
        <div className="relative">
          <Card className="bg-transparent border-none shadow-none">
            <CardHeader className="text-center pb-6">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                  <Image 
                    src="/chromie-logo-1.png" 
                    alt="chromie Logo" 
                    width={40} 
                    height={40}
                    className="object-contain"
                  />
                </div>
                <span className="text-2xl font-bold text-white">chromie.dev</span>
              </div>
              <CardTitle className="text-2xl text-white">
                {isSignUp ? "Create your account" : "Welcome back"}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {isSignUp 
                  ? "Start building extensions with chromie" 
                  : "Sign back in to chromie"
                }
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Button
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-100 text-gray-900 border border-gray-300 flex items-center justify-center space-x-3 py-3"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-900 border-t-transparent" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                <span>
                  {loading ? (isSignUp ? "Signing up..." : "Signing in...") : "Continue with Google"}
                </span>
              </Button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-700" />
                <span className="text-xs uppercase tracking-[0.2em] text-slate-500">or</span>
                <div className="h-px flex-1 bg-slate-700" />
              </div>

              <form className="space-y-3" onSubmit={handleEmailAuth}>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setEmailSent(false)
                  }}
                  placeholder="you@company.com"
                  disabled={loading}
                  className="border-slate-700 bg-slate-950/60 text-white placeholder:text-slate-500"
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-700 text-white hover:bg-slate-600"
                >
                  {loadingMethod === "email" ? "Sending magic link..." : "Continue with email"}
                </Button>
                {emailSent ? (
                  <p className="text-center text-sm text-emerald-300">
                    Check your inbox for a secure sign-in link.
                  </p>
                ) : null}
              </form>
            </CardContent>
          </Card>
        </div>
        </DialogContent>
      </Dialog>
    </>
  )
}