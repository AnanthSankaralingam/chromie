import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Zap, ArrowRight, Mail, Phone } from "lucide-react"

export default function PricingPage() {
  const plans = [
    {
      name: "starter",
      price: "free",
      description: "perfect for trying out chromie ai",
      features: [
        "3 extensions per month",
        "basic ai assistance",
        "standard templates",
        "community support",
        "download as zip",
      ],
      limitations: ["limited customization", "basic file structure"],
      cta: "start free",
      popular: false,
    },
    {
      name: "pro",
      price: "$0.10",
      unit: "per generation",
      description: "usage-based pricing for individual developers",
      features: [
        "unlimited extensions",
        "advanced ai assistance",
        "premium templates",
        "priority support",
        "advanced customization",
        "code optimization",
        "browser testing",
        "version control",
      ],
      cta: "start building",
      popular: true,
    },
    {
      name: "enterprise",
      price: "custom",
      description: "tailored solutions for teams and organizations",
      features: [
        "everything in pro",
        "team collaboration",
        "custom integrations",
        "dedicated support",
        "sla guarantees",
        "advanced analytics",
        "white-label options",
        "custom ai training",
      ],
      cta: "contact sales",
      popular: false,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-4 py-3 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">chromie ai</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-slate-300 hover:text-white transition-colors">
              home
            </Link>
            <Link href="/about" className="text-slate-300 hover:text-white transition-colors">
              about us
            </Link>
            <Link href="/builder" className="text-slate-300 hover:text-white transition-colors">
              builder
            </Link>
            <Link href="/pricing" className="text-white font-medium">
              pricing
            </Link>
          </nav>
          <div className="flex items-center space-x-2">
            <Link href="/auth/signin">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                sign in
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                sign up
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Badge variant="secondary" className="mb-4 bg-purple-500/10 text-purple-400 border-purple-500/20">
            ✨ simple, transparent pricing
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            pay for what you use
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            start free, scale as you grow. no hidden fees, no long-term commitments.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`relative bg-black/20 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-300 ${
                  plan.popular ? "ring-2 ring-purple-500/50 scale-105" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-1">
                      most popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl font-bold mb-2">{plan.name}</CardTitle>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.unit && <span className="text-slate-400 ml-1">{plan.unit}</span>}
                  </div>
                  <CardDescription className="text-slate-300">{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center space-x-3">
                        <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                        <span className="text-slate-300">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {plan.limitations && (
                    <div className="pt-4 border-t border-white/10">
                      <p className="text-sm text-slate-400 mb-2">limitations:</p>
                      <div className="space-y-2">
                        {plan.limitations.map((limitation, limitIndex) => (
                          <div key={limitIndex} className="flex items-center space-x-3">
                            <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                              <div className="w-1 h-1 bg-slate-500 rounded-full" />
                            </div>
                            <span className="text-slate-400 text-sm">{limitation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-6">
                    {plan.name === "enterprise" ? (
                      <Button className="w-full bg-slate-700 hover:bg-slate-600 text-white">
                        <Mail className="h-4 w-4 mr-2" />
                        {plan.cta}
                      </Button>
                    ) : (
                      <Link href={plan.name === "starter" ? "/builder" : "/auth/signup"}>
                        <Button
                          className={`w-full ${
                            plan.popular
                              ? "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                              : "bg-slate-700 hover:bg-slate-600"
                          } text-white`}
                        >
                          {plan.cta}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Usage Explanation */}
      <section className="py-20 px-4 bg-black/10">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">how usage-based pricing works</h2>
            <p className="text-xl text-slate-300">pay only for what you generate, with complete transparency</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-black/20 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-xl">what counts as a generation?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-slate-300">
                <p>• creating a new chrome extension from scratch</p>
                <p>• major modifications to existing extensions</p>
                <p>• generating new features or components</p>
                <p>• ai-powered code optimization</p>
              </CardContent>
            </Card>

            <Card className="bg-black/20 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-xl">what's included for free?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-slate-300">
                <p>• minor edits and tweaks</p>
                <p>• downloading your extensions</p>
                <p>• testing in browser environment</p>
                <p>• accessing your saved projects</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold mb-6">need something custom?</h2>
            <p className="text-xl text-slate-300 mb-8">
              we work with teams and enterprises to create tailored solutions that fit your specific needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-lg px-8 py-3"
              >
                <Mail className="h-5 w-5 mr-2" />
                contact sales
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 text-lg px-8 py-3 bg-transparent"
              >
                <Phone className="h-5 w-5 mr-2" />
                schedule a call
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-4 bg-black/20">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">chromie ai</span>
            </div>
            <div className="text-slate-400 text-sm">© 2024 chromie ai. all rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
