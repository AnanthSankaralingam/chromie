import GalleryPage from "@/components/pages/gallery-page"

export const metadata = {
  title: "Gallery",
  description: "Explore published Chrome extensions built with chromie.dev.",
  alternates: {
    canonical: "https://chromie.dev/gallery",
  },
  openGraph: {
    title: "Gallery | chromie.dev",
    description: "Published Chrome extensions and demos built with chromie.dev.",
    url: "https://chromie.dev/gallery",
  },
}

export default function Gallery() {
  return <GalleryPage />
}
