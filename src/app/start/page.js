import StartBuildingPage from "@/components/pages/start-building-page"
import { openGraphWithImage } from "@/lib/site-metadata"

export const metadata = {
  title: "Start building | chromie.dev",
  description:
    "Describe your Chrome extension in plain language and generate it with AI. Try example prompts or write your own.",
  alternates: {
    canonical: "https://chromie.dev/start",
  },
  openGraph: openGraphWithImage({
    title: "Start building | chromie.dev",
    description:
      "Describe your Chrome extension in plain language and generate it with AI.",
    url: "https://chromie.dev/start",
  }),
}

export default function StartPage() {
  return <StartBuildingPage />
}
