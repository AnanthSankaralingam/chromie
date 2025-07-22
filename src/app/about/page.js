import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Code, Download, TestTube, Zap, Shield, Rocket } from "lucide-react"

export default function AboutPage() {
  const features = [
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "ai-powered generation",
      description: "describe your extension idea and let ai generate the complete code structure",
    },
    {
      icon: <Code className="h-6 w-6" />,
      title: "no-code interface",
      description: "build chrome extensions without writing a single line of code",
    },
    {
      icon: <TestTube className="h-6 w-6" />,
      title: "live testing",
      description: "test your extensions in a browser environment before deployment",
    },
    {
      icon: <Download className="h-6 w-6" />,
      title: "instant download",
      description: "download your extension as a zip file ready for chrome web store",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "secure storage",
      description: "your projects are safely stored and accessible anytime",
    },
    {
      icon: <Rocket className="h-6 w-6" />,
      title: "quick deploy",
      description: "from idea to chrome extension in minutes, not hours",
    },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">chromie ai</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-slate-300 hover:text-white transition-colors">
              home
            </Link>
            <Link href="/about" className="text-white font-medium">
              about us
            </Link>
            <Link href="/src/app/features" className="text-slate-300 hover:text-white transition-colors">
              features
            </Link>
            <Link href="/pricing" className="text-slate-300 hover:text-white transition-colors">
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
                get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Badge variant="secondary" className="mb-4 bg-purple-500/10 text-purple-400 border-purple-500/20">
            ✨ ai-powered extension builder
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            build chrome extensions
            <br />
            without code
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            transform your ideas into powerful chrome extensions using ai. no coding experience required - just describe
            what you want to build.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-lg px-8 py-3"
              >
                start building now
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800 text-lg px-8 py-3 bg-transparent"
            >
              watch demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-slate-900/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">powerful features</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              everything you need to create professional chrome extensions
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-300">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">how it works</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              from idea to chrome extension in three simple steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-4">describe your idea</h3>
              <p className="text-slate-300">
                tell our ai what kind of chrome extension you want to build using natural language
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-4">ai generates code</h3>
              <p className="text-slate-300">
                our ai creates the complete extension structure with all necessary files and functionality
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-4">test & download</h3>
              <p className="text-slate-300">
                test your extension in our browser environment, then download the zip file for chrome
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">ready to build your extension?</h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            join thousands of developers who are building chrome extensions without code
          </p>
          <Link href="/">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-lg px-8 py-3"
            >
              start building for free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-4">
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
