import BlogPage from "@/components/pages/blog-page"

export const metadata = {
  title: "Blog",
  description: "Engineering updates, product launches, and tips for building Chrome extensions with AI. From the chromie.dev team.",
  alternates: {
    canonical: "https://chromie.dev/blog",
  },
  openGraph: {
    title: "Blog | chromie.dev",
    description: "Engineering updates, product launches, and tips for building Chrome extensions with AI.",
    url: "https://chromie.dev/blog",
  },
}

export default function Blog() {
  return <BlogPage />
}
