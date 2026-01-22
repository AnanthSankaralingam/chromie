"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Calendar, Tag, TestTube, Sparkles, Code, Chrome, Zap, Boxes } from "lucide-react"
import Link from "next/link"
import AppBar from "@/components/ui/app-bars/app-bar"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import blogPostsData from "@/lib/data/blog-posts.json"

const iconMap = {
  "test-tube": TestTube,
  "sparkles": Sparkles,
  "code": Code,
  "chrome": Chrome,
  "zap": Zap,
  "boxes": Boxes,
}

export default function BlogPostPage({ slug }) {
  const [post, setPost] = useState(null)

  useEffect(() => {
    const foundPost = blogPostsData.find((p) => p.slug === slug)
    setPost(foundPost)
    console.log('[blog-post] loaded post:', foundPost?.title)
  }, [slug])

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-slate-900 to-slate-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-400">Loading post...</p>
        </div>
      </div>
    )
  }

  const Icon = iconMap[post.icon] || TestTube

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0F] via-[#0F111A] to-[#0A0A0F] text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <FlickeringGrid
          className="absolute inset-0 z-0"
          squareSize={4}
          gridGap={6}
          color="rgb(139, 92, 246)"
          maxOpacity={0.15}
          flickerChance={2.0}
        />

        <motion.div
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-600/15 rounded-full filter blur-[140px] z-10"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/3 right-1/4 w-[700px] h-[700px] bg-blue-600/15 rounded-full filter blur-[140px] z-10"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </div>

      {/* Header */}
      <AppBar />

      {/* Main Content */}
      <div className="relative z-20 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link href="/blog">
            <motion.button
              className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors mb-8"
              whileHover={{ x: -5 }}
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Blog
            </motion.button>
          </Link>

          {/* Post Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            {/* Icon */}
            <div className="mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-lg flex items-center justify-center border border-purple-500/30">
                <Icon className="w-10 h-10 text-purple-400" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent leading-tight">
              {post.title}
            </h1>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-6 text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{post.date}, {post.year}</span>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                <span>{post.category}</span>
              </div>
            </div>

            {/* Authors */}
            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-700/50">
              <div className="flex -space-x-2">
                {post.authors.map((author, i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-sm font-semibold border-2 border-gray-900"
                    title={author.name}
                  >
                    {author.name.charAt(0)}
                  </div>
                ))}
              </div>
              <span className="text-gray-300">
                {post.authors.map(a => a.name).join(" and ")}
              </span>
            </div>
          </motion.div>

          {/* Post Content */}
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="prose prose-invert prose-lg max-w-none"
          >
            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 md:p-12">
              <p className="text-xl text-gray-300 leading-relaxed mb-8">
                Here's the thing about testing Chrome extensions: it sucks. You make a change, load the extension manually, click around to see if it works, check the console for errors, then do it all over again for the next change.
              </p>

              <p className="text-gray-300 leading-relaxed mb-8">
                We were doing this ourselves and hated it. So we built something better.
              </p>

              <h2 className="text-3xl font-bold text-white mt-12 mb-6">What we shipped</h2>
              
              <p className="text-gray-300 leading-relaxed mb-8">
                Two big features: side-by-side testing and AI-generated test suites. Both solve the same problem: making it fast to know if your extension actually works.
              </p>

              <div className="bg-purple-900/20 border-l-4 border-purple-500 p-6 rounded-r-lg mb-8">
                <p className="text-purple-200 font-semibold mb-2">Key Features:</p>
                <ul className="list-disc list-inside text-gray-300 space-y-2">
                  <li>Side-by-side browser simulator for instant testing</li>
                  <li>AI-powered test generation from your extension description</li>
                  <li>Automated Puppeteer tests that run in real browsers</li>
                  <li>Browser use agent tests for intelligent interaction simulation</li>
                  <li>Visual feedback and detailed error reporting</li>
                </ul>
              </div>

              <h2 className="text-3xl font-bold text-white mt-12 mb-6">Side-by-side testing</h2>
              
              <p className="text-gray-300 leading-relaxed mb-8">
                The test modal shows your code next to a live browser running your extension. Make a change, hit test, see it run. No more switching between windows or reloading. It's all there.
              </p>

              <p className="text-gray-300 leading-relaxed mb-8">
                The browser simulator loads your extension the same way Chrome does, so you get real behavior. When something breaks, you see it immediately instead of finding out later from a confused user.
              </p>

              <h2 className="text-3xl font-bold text-white mt-12 mb-6">Auto-generated tests</h2>
              
              <p className="text-gray-300 leading-relaxed mb-8">
                The other thing we shipped: Chromie now generates two types of automated tests for you. Just describe what your extension does, and we create test suites that actually check if it works.
              </p>

              <p className="text-gray-300 leading-relaxed mb-8">
                First, we generate Puppeteer tests that run in our Chromie simulated browser environment. These test basic functionality with low latency—click buttons, fill forms, navigate pages. They run in seconds and catch bugs before you ship.
              </p>

              <p className="text-gray-300 leading-relaxed mb-8">
                We also generate Browser Use agent tests that simulate complex, end-to-end user behavior. These AI-powered agents can handle multi-step workflows, adapt to page changes, and test scenarios that traditional scripts might miss.
              </p>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl px-8 py-8">
                <h3 className="text-xl font-semibold text-blue-200 mb-6">How It Works</h3>
                <div className="space-y-3 text-gray-300">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">1</div>
                    <p className="m-0">Navigate to target webpage</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">2</div>
                    <p className="m-0">Load your extension in the browser</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">3</div>
                    <p className="m-0">Trigger extension functionality</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">4</div>
                    <p className="m-0">Verify expected changes occurred</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">5</div>
                    <p className="m-0">Report results with screenshots and logs</p>
                  </div>
                </div>
              </div>

              <h2 className="text-3xl font-bold text-white mt-8 mb-6">Why it matters</h2>
              
              <p className="text-gray-300 leading-relaxed mb-8">
                Chrome extensions are weird. They run in three different contexts (background, content scripts, popups), interact with websites in unpredictable ways, and break in edge cases you didn't think about.
              </p>

              <p className="text-gray-300 leading-relaxed mb-8">
                Manual testing means you're constantly context-switching. Edit code, load extension, click around, check console, repeat. It's slow and you miss things.
              </p>

              <p className="text-gray-300 leading-relaxed mb-8">
                With automated testing:
              </p>

              <ul className="list-disc list-inside text-gray-300 space-y-3 mb-8 ml-4">
                <li className="leading-relaxed">Test in seconds instead of minutes</li>
                <li className="leading-relaxed">Catch bugs before users do</li>
                <li className="leading-relaxed">Don't break things when you ship updates</li>
                <li className="leading-relaxed">Actually know if your extension works</li>
              </ul>

              <h2 className="text-3xl font-bold text-white mt-12 mb-6">What's next</h2>
              
              <p className="text-gray-300 leading-relaxed mb-8">
                This is version one. We're planning cross-browser testing, performance checks, and CI/CD integration. If you have ideas for what would make testing better, let us know.
              </p>

              <p className="text-gray-300 leading-relaxed mb-8">
                The goal is simple: building extensions should be about building the thing you want, not fighting tooling. We handle the complexity so you don't have to.
              </p>

              <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-8 mt-12">
                <h3 className="text-2xl font-bold text-white mb-4">Try it out</h3>
                <p className="text-gray-300 mb-6">
                  Both features are live now. Build an extension, hit test, see what happens.
                </p>
                <Link href="/builder">
                  <button className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold transition-all duration-300 shadow-lg shadow-purple-500/50">
                    Start Building
                  </button>
                </Link>
              </div>
            </div>
          </motion.article>

          {/* Tags */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12 pt-8 border-t border-gray-700/50"
          >
            <div className="flex flex-wrap gap-3">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-full text-sm text-gray-300 hover:border-purple-500/50 transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Share Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-12 pt-8 border-t border-gray-700/50"
          >
            <p className="text-gray-400 text-center">
              Have questions or feedback? We'd love to hear from you.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
