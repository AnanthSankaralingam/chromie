"use client"

export default function TrustedBySection() {
  return (
    <section id="trusted-by" className="relative z-10 w-full px-6 py-10 md:py-14">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-600 text-center mb-8">
        trusted by
      </p>
      <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16">
        <a
          href="https://www.youtube.com/watch?v=SCteMclpA38"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-75 hover:opacity-100 transition-opacity"
        >
          <img
            src="/promptly-logo-128.png"
            alt="Promptly AI"
            className="h-8 md:h-10 object-contain"
            style={{ mixBlendMode: "screen" }}
          />
        </a>
        <a
          href="https://chromewebstore.google.com/detail/omnispeech-ai-deepfake-de/fdaalloapkmfoeelgbhdedlbiplcoahp/"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-75 hover:opacity-100 transition-opacity"
        >
          <img
            src="/omnispeech_logo.png"
            alt="Omnispeech"
            className="h-8 md:h-10 object-contain"
            style={{ mixBlendMode: "screen" }}
          />
        </a>
        <a
          href="https://qtr.ai/"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-75 hover:opacity-100 transition-opacity"
        >
          <img
            src="/QTR-Logo.png"
            alt="QTR"
            className="h-8 md:h-10 object-contain"
            style={{ mixBlendMode: "screen", filter: "brightness(0) invert(1)" }}
          />
        </a>
        <a
          href="https://bricked.ai/"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-75 hover:opacity-100 transition-opacity"
        >
          <img
            src="/bricked-logo.png"
            alt="Bricked"
            className="h-8 md:h-10 object-contain"
            style={{ mixBlendMode: "screen" }}
          />
        </a>
        <a
          href="https://mentrix.ai/"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-75 hover:opacity-100 transition-opacity"
        >
          <img
            src="/mentrix-logo.png"
            alt="Mentrix"
            className="h-8 md:h-10 object-contain"
            style={{ mixBlendMode: "screen" }}
          />
        </a>
        <a
          href="https://www.salesgraph.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-75 hover:opacity-100 transition-opacity"
        >
          <img
            src="/salesgraph-logo.svg"
            alt="Salesgraph"
            className="h-8 md:h-10 w-auto max-w-[8.5rem] object-contain"
            style={{ mixBlendMode: "screen" }}
          />
        </a>
      </div>
    </section>
  )
}
