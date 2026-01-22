import BlogPostPage from "@/components/pages/blog-post-page"

export default function BlogPost({ params }) {
  return <BlogPostPage slug={params.slug} />
}
