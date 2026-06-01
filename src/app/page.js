import LandingPage from "@/components/pages/landing-page"
import { openGraphWithImage } from "@/lib/site-metadata"

export const metadata = {
  title: "chromie.dev — the deterministic stack for web agents",
  description:
    "Deterministic tool calls for web agents: analyze past executions, build tailored tools around repeated actions, and invoke skills at runtime based on task and position.",
  alternates: {
    canonical: "https://chromie.dev",
  },
  openGraph: openGraphWithImage({
    title: "chromie.dev — the deterministic stack for web agents",
    description:
      "Deterministic tool calls for web agents: analyze past executions, build tailored tools around repeated actions, and invoke skills at runtime based on task and position.",
    url: "https://chromie.dev",
  }),
  twitter: {
    card: "summary_large_image",
    title: "chromie.dev — the deterministic stack for web agents",
    description:
      "Deterministic tool calls for web agents: analyze past executions, build tailored tools around repeated actions, and invoke skills at runtime based on task and position.",
    images: ["/chromie-og.png"],
  },
}

export default function Home() {
  return <LandingPage />
}
