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
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-3">
            blog
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
            blog
          </h2>
          <p className="text-sm md:text-base text-zinc-400 max-w-xl mx-auto">
            check out featured chromie news
          </p>
        </motion.div>

        {/* Featured posts: flex wrap so last incomplete row stays centered */}
        <div className="mb-12 flex flex-wrap justify-center gap-8">
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
              className={
                featuredPosts.length === 1
                  ? "min-w-0 w-full max-w-md"
                  : "min-w-0 w-full max-w-md md:w-[calc((100%-2rem)/2)] md:max-w-none lg:w-[calc((100%-4rem)/3)]"
              }
            >
              <Link href={`/blog/${post.slug}`}>
                <div className="group relative h-full bg-[#0f1117] rounded-xl border border-white/[0.08] hover:border-white/[0.15] transition-all duration-200 overflow-hidden cursor-pointer flex flex-col">
                  {/* Cover image area */}
                  <div className="relative h-36 w-full overflow-hidden bg-white/[0.03] border-b border-white/[0.06] shrink-0">
                    {post.coverImage ? (
                      <img
                        src={post.coverImage}
                        alt=""
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        {iconImage ? (
                          <img src={iconImage} alt="" className="w-12 h-12 object-contain opacity-40" />
                        ) : (
                          <Icon className="w-10 h-10 text-zinc-700" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="relative flex flex-col flex-1 p-6">
                    {/* Date */}
                    <div className="text-sm text-zinc-500 mb-3">
                      {String(post.date).toLowerCase()}
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-zinc-300 transition-colors duration-200 line-clamp-2">
                      {String(post.title).toLowerCase()}
                    </h3>

                    {/* Excerpt */}
                    <p className="text-zinc-400 text-sm leading-relaxed mb-4 flex-grow line-clamp-3">
                      {String(post.excerpt).toLowerCase()}
                    </p>

                    {/* Read More Link */}
                    <div className="flex items-center gap-2 text-zinc-500 text-sm font-medium group-hover:gap-3 group-hover:text-zinc-300 transition-all duration-200">
                      <span>read more</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>

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
          <Link href="/blog" className="group inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors duration-200">
            <span className="text-base font-medium">view all posts</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
