"use client"

import { useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { Menu, X } from "lucide-react"
import { PrimaryButton } from "@/components/ui/landing/landing-buttons"
import { CAL_URL, CONTACT_EMAIL, NAV_LINKS } from "@/components/ui/landing/landing-content"

export default function LandingHeader() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#" className="flex items-center gap-2.5">
          <Image
            src="/chromie-logo-1.png"
            alt="Chromie"
            width={28}
            height={28}
            className="shrink-0"
          />
          <span className="text-lg font-bold tracking-tight">
            chromie<span className="font-normal text-zinc-500">.dev</span>
          </span>
        </a>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-6 sm:flex">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 transition-colors hover:text-white"
          >
            Contact
          </a>
          <PrimaryButton href={CAL_URL} external className="!px-4 !py-2 text-xs">
            Get started
          </PrimaryButton>
        </div>

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center border border-white/15 text-white lg:hidden"
          aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileNavOpen((open) => !open)}
        >
          {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {mobileNavOpen ? (
        <nav className="border-t border-white/10 px-4 py-4 lg:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileNavOpen(false)}
                className="font-mono text-xs uppercase tracking-wider text-zinc-400 hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-4 border-t border-white/10 pt-4">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                onClick={() => setMobileNavOpen(false)}
                className="font-mono text-xs uppercase tracking-wider text-zinc-400 hover:text-white"
              >
                Contact
              </a>
              <PrimaryButton href={CAL_URL} external>
                Get started
              </PrimaryButton>
            </div>
          </div>
        </nav>
      ) : null}
    </motion.header>
  )
}
