import LandingPage from "@/components/pages/landing-page"

export const metadata = {
  title: "chromie.dev — the deterministic stack for web agents",
  description:
    "Deterministic tool calls for web agents: analyze past executions, build tailored tools around repeated actions, and invoke skills at runtime based on task and position.",
  alternates: {
    canonical: "https://chromie.dev",
  },
  openGraph: {
    title: "chromie.dev — the deterministic stack for web agents",
    description:
      "Deterministic tool calls for web agents: analyze past executions, build tailored tools around repeated actions, and invoke skills at runtime based on task and position.",
    url: "https://chromie.dev",
  },
}

export default function Home() {
  return <LandingPage />
}
