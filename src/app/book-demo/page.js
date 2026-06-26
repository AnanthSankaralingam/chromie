import BookDemoPage from "@/components/pages/book-demo-page"
import { openGraphWithImage } from "@/lib/site-metadata"

export const metadata = {
  title: "Book a Demo",
  description: "See chromie.dev in action. Book a personalized demo to learn how your team can schedule and inspect reliable browser automations.",
  alternates: {
    canonical: "https://chromie.dev/book-demo",
  },
  openGraph: openGraphWithImage({
    title: "Book a Demo | chromie.dev",
    description: "Get a personalized demo of chromie.dev and its automation hub.",
    url: "https://chromie.dev/book-demo",
  }),
}

export default function BookDemo() {
  return <BookDemoPage />
}
