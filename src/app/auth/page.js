"use client"

import { useState, useEffect, Suspense } from "react"
import Image from "next/image"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useSession } from '@/components/SessionProviderClient'
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

function AuthPageContent() {
     const [loading, setLoading] = useState(false)
     const [error, setError] = useState("")
     const searchParams = useSearchParams()
     const router = useRouter()
     const { supabase } = useSession()

     const mode = searchParams.get('mode') || 'signin'
     const isSignUp = mode === 'signup'
     const redirectUrl = searchParams.get('redirectUrl')

     useEffect(() => {
          // Check for auth errors in URL params
          const authError = searchParams.get('error')
          const message = searchParams.get('message')

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
               // Clean up URL
               const newUrl = new URL(window.location.href)
               newUrl.searchParams.delete('error')
               newUrl.searchParams.delete('message')
               window.history.replaceState({}, '', newUrl.toString())
          }
     }, [searchParams])

     const handleGoogleAuth = async () => {
          setLoading(true)
          setError("")

          try {
               const currentOrigin = window.location.origin
               const finalRedirect = redirectUrl || '/builder'
               const authCallbackUrl = `${currentOrigin}/auth/callback`

               sessionStorage.setItem('auth_redirect_destination', finalRedirect)

               const { error } = await supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: {
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
                    setLoading(false)
               }
          } catch (err) {
               console.error('❌ Exception in handleGoogleAuth:', err)
               setError("An unexpected error occurred. Please try again.")
               setLoading(false)
          }
     }

     return (
          <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
               {/* Background decoration */}
               <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[100px]" />
                    <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[100px]" />
               </div>

               <div className="w-full max-w-md relative z-10">
                    <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
                         <ArrowLeft className="w-4 h-4 mr-2" />
                         Back to Home
                    </Link>

                    <Card className="bg-white/80 backdrop-blur-xl border-border/50 shadow-2xl rounded-3xl overflow-hidden">
                         <CardHeader className="text-center pb-6 pt-8">
                              <div className="flex items-center justify-center space-x-2 mb-6">
                                   <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner border border-primary/20">
                                        <Image
                                             src="/chromie-logo-1.png"
                                             alt="chromie Logo"
                                             width={48}
                                             height={48}
                                             className="object-contain p-1"
                                        />
                                   </div>
                              </div>
                              <CardTitle className="text-2xl font-bold text-foreground">
                                   {isSignUp ? "Create your account" : "Welcome back"}
                              </CardTitle>
                              <CardDescription className="text-muted-foreground text-base mt-2">
                                   {isSignUp
                                        ? "Start building Chrome extensions with AI"
                                        : "Sign in to continue building Chrome extensions"
                                   }
                              </CardDescription>
                         </CardHeader>

                         <CardContent className="space-y-6 pb-8 px-8">
                              {error && (
                                   <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                                        {error}
                                   </div>
                              )}

                              <Button
                                   onClick={handleGoogleAuth}
                                   disabled={loading}
                                   className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 h-12 rounded-xl text-base font-medium"
                              >
                                   {loading ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                                   ) : (
                                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                                             <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                             <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                             <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                             <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                   )}
                                   <span>
                                        {loading ? (isSignUp ? "Signing up..." : "Signing in...") : "Continue with Google"}
                                   </span>
                              </Button>

                              <div className="text-center pt-2">
                                   <p className="text-muted-foreground text-sm">
                                        {isSignUp ? "Already have an account? " : "Don't have an account? "}
                                        <Link
                                             href={isSignUp ? "/auth?mode=signin" : "/auth?mode=signup"}
                                             className="text-primary hover:text-primary/80 font-medium transition-colors"
                                        >
                                             {isSignUp ? "Sign in" : "Sign up"}
                                        </Link>
                                   </p>
                              </div>
                         </CardContent>
                    </Card>

                    <div className="mt-8 text-center text-xs text-muted-foreground">
                         <p>By continuing, you agree to our <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link> and <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.</p>
                    </div>
               </div>
          </div>
     )
}

export default function AuthPage() {
     return (
          <Suspense fallback={
               <div className="min-h-screen flex items-center justify-center bg-background">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
               </div>
          }>
               <AuthPageContent />
          </Suspense>
     )
}
