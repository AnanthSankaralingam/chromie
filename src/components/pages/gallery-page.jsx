"use client"

import AppBar from "@/components/ui/app-bars/app-bar"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import FeaturedCreationsSection from "@/components/ui/sections/featured-creations-section"

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-[#080a0f] text-white relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <FlickeringGrid
          className="absolute inset-0 z-0"
          squareSize={4}
          gridGap={6}
          color="rgb(156, 163, 175)"
          maxOpacity={0.08}
          flickerChance={2.0}
        />
      </div>

      <div className="relative z-10">
        <AppBar />
        <FeaturedCreationsSection
          sectionId="gallery-list"
          limit={6}
          cardVariant="large"
          enablePagination
        />
        <section className="px-6 pb-16 md:pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="rounded-xl border border-white/[0.08] bg-[#0f1117] px-5 py-4 text-center">
              <p className="text-sm text-zinc-300">
                Coming Soon: submit your project to be showcased on the gallery.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
