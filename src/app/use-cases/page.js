import UseCasesPage from "@/components/pages/use-cases-page"
import { openGraphWithImage } from "@/lib/site-metadata"

export const metadata = {
  title: "Use Cases",
  description:
    "Watch tailored chromie.dev demos for pharma intelligence, clinical trials, insurance, and government contracting workflows.",
  alternates: {
    canonical: "https://chromie.dev/use-cases",
  },
  openGraph: openGraphWithImage({
    title: "Use Cases | chromie.dev",
    description:
      "Watch tailored chromie.dev demos for pharma intelligence, clinical trials, insurance, and government contracting workflows.",
    url: "https://chromie.dev/use-cases",
  }),
}

export default function UseCases() {
  return <UseCasesPage />
}
