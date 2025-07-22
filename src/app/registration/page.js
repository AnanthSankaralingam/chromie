"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, Mail, Lock, User, ArrowRight, Check, Sparkles } from "lucide-react"

export default function RegistrationPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    // TODO: Integrate with Supabase authentication
    console.log("registering user:", formData)

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      // Redirect to builder or dashboard
    }, 2000)
  }

  const benefits = [
    "unlimited ai-powered extension generation",
    "access to premium templates and components",
    "priority customer support",
    "advanced customization options",
    "browser testing environment",
    "version control and project management",
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 text-white">
      <div className="flex min-h-screen">
        {/* Left Side - Registration Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="text-center mb-8">
              <Link href="/" className="inline-flex items-center space-x-2 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold">chromie ai</span>
              </Link>
              <h1 className="text-3xl font-bold mb-2">create your account</h1>
              <p className="text-slate-300">start building chrome extensions with ai</p>
            </div>

            {/* Registration Form */}
            <Card className="bg-black/20 backdrop-blur-sm border-white/10">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-300">
                      full name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="enter your full name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">
                      email address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="enter your email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-300">
                      password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="create a password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-slate-300">
                      confirm password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="confirm your password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-400"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white py-3"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-2" />
                    )}
                    {isLoading ? "creating account..." : "create account"}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-slate-400 text-sm">
                    already have an account?{" "}
                    <Link href="/login" className="text-purple-400 hover:text-purple-300">
                      sign in
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Side - Product Promotion */}
        <div className="flex-1 bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-sm border-l border-white/10 p-8 flex items-center justify-center">
          <div className="max-w-lg">
            <div className="text-center mb-8">
              <Badge variant="secondary" className="mb-4 bg-purple-500/10 text-purple-400 border-purple-500/20">
                <Sparkles className="h-4 w-4 mr-1" />
                ai-powered development
              </Badge>
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                build extensions without code
              </h2>
              <p className="text-xl text-slate-300 mb-8">
                join thousands of developers creating powerful chrome extensions using ai
              </p>
            </div>

            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-slate-300">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 bg-black/20 backdrop-blur-sm rounded-lg border border-white/10">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">$0.10</div>
                <div className="text-slate-300 mb-4">per extension generation</div>
                <p className="text-sm text-slate-400">start free with 3 generations, then pay only for what you use</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
