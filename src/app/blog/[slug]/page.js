import BlogPostPage from "@/components/pages/blog-post-page"
import blogPostsData from "@/lib/data/blog-posts.json"

export async function generateMetadata({ params }) {
  const post = blogPostsData.find((p) => p.slug === params.slug)

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
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `https://chromie.dev/blog/${post.slug}`,
      type: "article",
      publishedTime: post.year ? `${post.year}-01-01` : undefined,
      tags: post.tags,
    },
  }
}

export default function BlogPost({ params }) {
  return <BlogPostPage slug={params.slug} />
}
