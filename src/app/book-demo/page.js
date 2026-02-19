import BookDemoPage from "@/components/pages/book-demo-page"

export const metadata = {
  title: "Book a Demo",
  description: "See chromie.dev in action. Book a personalized demo to learn how your team can build and deploy Chrome extensions for your product suite — no coding required.",
  alternates: {
    canonical: "https://chromie.dev/book-demo",
  },
  openGraph: {
    title: "Book a Demo | chromie.dev",
    description: "Get a personalized demo of chromie.dev. See how your team can build and deploy Chrome extensions for your product suite.",
    url: "https://chromie.dev/book-demo",
  },
}

export default function BookDemo() {
  return <BookDemoPage />
}
