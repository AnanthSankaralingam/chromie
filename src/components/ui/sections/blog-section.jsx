"use client"

import { motion } from "framer-motion"
import { TestTube, Sparkles, Code, Chrome, Zap, Boxes, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import blogPostsData from "@/lib/data/blog-posts.json"

const iconMap = {
  "test-tube": TestTube,
  "sparkles": Sparkles,
  "code": Code,
  "chrome": Chrome,
  "zap": Zap,
  "boxes": Boxes,
}

export default function BlogSection() {
  // Get featured posts (currently just showing the first 3)
  const featuredPosts = blogPostsData.slice(0, 3)

  return (
    <section id="blog" className="relative z-20 px-6 py-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 md:mb-12"
        >
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-3">
            blog
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-50 mb-3">
            blog
          </h2>
          <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto">
            check out featured chromie news
          </p>
        </motion.div>

        {/* Featured Posts Grid - center when single post, grid when multiple */}
        <div className={`mb-12 ${featuredPosts.length === 1 ? 'flex justify-center' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'}`}>
          {featuredPosts.map((post, index) => {
            const Icon = iconMap[post.icon] || TestTube
            const iconImage = post.iconImage
            return (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={featuredPosts.length === 1 ? 'max-w-md w-full' : ''}
            >
              <Link href={`/blog/${post.slug}`}>
                <div className="group relative h-full bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50 hover:border-gray-500/50 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col">
                  {/* Cover image area */}
                  <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 shrink-0">
                    {post.coverImage ? (
                      <img
                        src={post.coverImage}
                        alt=""
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-700/60 via-gray-800/80 to-gray-900" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          {iconImage ? (
                            <img src={iconImage} alt="" className="w-12 h-12 object-contain opacity-60" />
                          ) : (
                            <Icon className="w-10 h-10 text-gray-500" />
                          )}
                        </div>
                      </>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
                  </div>

                  {/* Hover gradient effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-600/0 to-gray-400/0 group-hover:from-gray-600/10 group-hover:to-gray-400/10 transition-all duration-300" />
                  
                  <div className="relative flex flex-col flex-1 p-6">
                    {/* Date */}
                    <div className="text-sm text-gray-400 mb-3">
                      {String(post.date).toLowerCase()}
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-gray-300 transition-colors duration-300 line-clamp-2">
                      {String(post.title).toLowerCase()}
                    </h3>

                    {/* Excerpt */}
                    <p className="text-gray-300 text-sm leading-relaxed mb-4 flex-grow line-clamp-3">
                      {String(post.excerpt).toLowerCase()}
                    </p>

                    {/* Read More Link */}
                    <div className="flex items-center gap-2 text-gray-400 text-sm font-semibold group-hover:gap-3 transition-all duration-300">
                      <span>read more</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Bottom highlight on hover */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-600 to-gray-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                </div>
              </Link>
            </motion.div>
            )
          })}
        </div>

        {/* View All Posts Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center"
        >
          <Link href="/blog" className="group inline-flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-300">
            <span className="text-base font-medium">view all posts</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
