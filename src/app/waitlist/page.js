import WaitlistPage from "@/components/pages/waitlist-page"
import { openGraphWithImage } from "@/lib/site-metadata"

export const metadata = {
  title: "Join the waitlist",
  description:
    "Sign up for early access to chromie.dev — tailored tools and runtime skills for web agents.",
  alternates: {
    canonical: "https://chromie.dev/waitlist",
  },
  openGraph: openGraphWithImage({
    title: "Join the waitlist | chromie.dev",
    description:
      "Sign up for early access to chromie.dev — tailored tools and runtime skills for web agents.",
    url: "https://chromie.dev/waitlist",
  }),
}

export default function Waitlist() {
  return <WaitlistPage />
}
