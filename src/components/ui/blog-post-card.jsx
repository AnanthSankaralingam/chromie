"use client"

import { motion } from "framer-motion"
import { TestTube, Sparkles, Code, Chrome, Zap, Boxes } from "lucide-react"
import Link from "next/link"

const iconMap = {
  "test-tube": TestTube,
  "sparkles": Sparkles,
  "code": Code,
  "chrome": Chrome,
  "zap": Zap,
  "boxes": Boxes,
}

export default function BlogPostCard({ post, index }) {
  const Icon = iconMap[post.icon] || TestTube

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Link href={`/blog/${post.slug}`}>
        <div className="group relative h-full bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 overflow-hidden cursor-pointer">
          {/* Hover gradient effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 to-blue-600/0 group-hover:from-purple-600/10 group-hover:to-blue-600/10 transition-all duration-300" />
          
          <div className="relative p-8 flex flex-col h-full">
            {/* Icon */}
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-lg flex items-center justify-center border border-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                <Icon className="w-8 h-8 text-purple-400" />
              </div>
            </div>

            {/* Date */}
            <div className="text-sm text-gray-400 mb-4">
              {post.date}
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white mb-4 group-hover:text-purple-300 transition-colors duration-300">
              {post.title}
            </h2>

            {/* Excerpt */}
            <p className="text-gray-300 leading-relaxed mb-6 flex-grow">
              {post.excerpt}
            </p>

            {/* Authors */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-700/50">
              <div className="flex -space-x-2">
                {post.authors.map((author, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-xs font-semibold border-2 border-gray-900"
                    title={author.name}
                  >
                    {author.name.charAt(0)}
                  </div>
                ))}
              </div>
              <span className="text-sm text-gray-400">
                {post.authors.map(a => a.name).join(" and ")}
              </span>
            </div>
          </div>

          {/* Bottom highlight on hover */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        </div>
      </Link>
    </motion.div>
  )
}
