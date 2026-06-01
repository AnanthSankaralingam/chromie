import BlogPostPage from "@/components/pages/blog-post-page"
import blogPostsData from "@/lib/data/blog-posts.json"
import { openGraphWithImage } from "@/lib/site-metadata"

export async function generateMetadata({ params }) {
  const { slug } = await params
  const post = blogPostsData.find((p) => p.slug === slug)

  if (!post) {
    return {
      title: "Post Not Found",
      description: "This blog post could not be found.",
    }
  }

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `https://chromie.dev/blog/${post.slug}`,
    },
    openGraph: openGraphWithImage({
      title: post.title,
      description: post.excerpt,
      url: `https://chromie.dev/blog/${post.slug}`,
      type: "article",
      publishedTime: post.year ? `${post.year}-01-01` : undefined,
      tags: post.tags,
    }),
  }
}

export default async function BlogPost({ params }) {
  const { slug } = await params
  return <BlogPostPage slug={slug} />
}
