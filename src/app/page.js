import HomePage from "@/components/pages/home-page"

export const metadata = {
  title: "chromie.dev — Build Chrome Extensions with AI — No Coding Required",
  description: "Describe your idea and chromie.dev builds a fully functional Chrome extension in seconds. Free plan available. See pricing, featured extensions, and get started instantly.",
  alternates: {
    canonical: "https://chromie.dev",
  },
  openGraph: {
    title: "chromie.dev — Build Chrome Extensions with AI — No Coding Required",
    description: "Describe your idea and chromie.dev builds a fully functional Chrome extension in seconds. Free plan available — no coding required.",
    url: "https://chromie.dev",
  },
}

export default function Home() {
  return <HomePage />
}
