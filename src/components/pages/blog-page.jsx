"use client"

import { useState, useEffect } from "react"
import { Search, Rss } from "lucide-react"
import { motion } from "framer-motion"
import AppBar from "@/components/ui/app-bars/app-bar"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import BlogPostCard from "@/components/ui/blog-post-card"
import blogPostsData from "@/lib/data/blog-posts.json"

const categories = [
  "All Posts",
  "Engineering",
  "Community",
  "Company News",
  "Updates",
  "Changelog",
]

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState("All Posts")
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredPosts, setFilteredPosts] = useState(blogPostsData)

  useEffect(() => {
    let posts = blogPostsData

    // Filter by category
    if (selectedCategory !== "All Posts") {
      posts = posts.filter((post) => post.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery) {
      posts = posts.filter(
        (post) =>
          post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.tags.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    }

    setFilteredPosts(posts)
    console.log('[blog] filtered posts:', posts.length)
  }, [selectedCategory, searchQuery])

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
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4 text-white px-4">
            chromie blog
          </h1>
          <p className="text-xl text-gray-400">
            latest updates, insights, and stories from the chromie team
          </p>
        </div>

        {/* Category Tabs and Search */}
        <div className="max-w-6xl mx-auto mb-12">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  selectedCategory === category
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/50"
                    : "bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-gray-700/50"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="flex items-center justify-center gap-4">
            <div className="relative w-full max-w-lg">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
              />
            </div>
            <button className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg hover:bg-gray-700/50 transition-all duration-300">
              <Rss className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Blog Posts Grid */}
        <div className="max-w-7xl mx-auto">
          {filteredPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post, index) => (
                <BlogPostCard key={post.id} post={post} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-semibold text-gray-300 mb-2">
                No posts found
              </h3>
              <p className="text-gray-400">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>

        {/* Newsletter Section */}
        <div className="max-w-3xl mx-auto mt-20">
          <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">stay updated</h2>
            <p className="text-gray-300 mb-8">
              get the latest chromie updates delivered straight to your inbox
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
              />
              <button className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold transition-all duration-300 shadow-lg shadow-purple-500/50">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
