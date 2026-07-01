import blogPostsData from "@/lib/data/blog-posts.json"

const BASE_URL = "https://chromie.dev"

function entry(path, { changeFrequency = "weekly", priority = 0.5, lastModified } = {}) {
  return {
    url: `${BASE_URL}${path}`,
    lastModified: lastModified || new Date().toISOString(),
    changeFrequency,
    priority,
  }
}

export default function sitemap() {
  const lastModified = new Date().toISOString()

  const staticPages = [
    entry("/", { priority: 1 }),
    entry("/use-cases", { priority: 0.9 }),
    entry("/gov", { priority: 0.9 }),
    entry("/gov/onboarding", { priority: 0.8 }),
    entry("/blog", { priority: 0.7 }),
    entry("/privacy-policy", { priority: 0.3, changeFrequency: "yearly" }),
  ]

  const blogPages = blogPostsData.map((post) =>
    entry(`/blog/${post.slug}`, {
      priority: 0.6,
      changeFrequency: "monthly",
      lastModified,
    }),
  )

  return [...staticPages, ...blogPages]
}
