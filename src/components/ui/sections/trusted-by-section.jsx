"use client"

export default function TrustedBySection() {
  return (
    <section id="trusted-by" className="relative z-10 px-6 py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 text-center mb-6">
          trusted by
        </p>
        <div className="flex items-center justify-center gap-16 md:gap-24 opacity-80">
          <a
            href="https://www.youtube.com/watch?v=SCteMclpA38"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-100 transition-opacity"
          >
            <img
              src="/promptly-logo-128.png"
              alt="Promptly AI"
              className="h-10 md:h-12 object-contain"
            />
          </a>
          <a
            href="https://chromewebstore.google.com/detail/omnispeech-ai-deepfake-de/fdaalloapkmfoeelgbhdedlbiplcoahp/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-100 transition-opacity"
          >
            <img
              src="/omnispeech_logo.png"
              alt="Omnispeech"
              className="h-10 md:h-12 object-contain"
            />
          </a>
          <a
            href="https://qtr.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-100 transition-opacity"
          >
            <img
              src="/QTR-Logo.png"
              alt="QTR"
              className="h-10 md:h-12 object-contain"
            />
          </a>
        </div>
      </div>
    </section>
  )
}
