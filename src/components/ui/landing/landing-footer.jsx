import Image from "next/image"
import { Reveal } from "@/components/ui/landing/landing-motion"
import { CAL_URL, CONTACT_EMAIL, NAV_LINKS } from "@/components/ui/landing/landing-content"

export default function LandingFooter() {
  return (
    <Reveal>
      <footer className="py-12 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center gap-2.5">
              <Image src="/chromie-logo-1.png" alt="Chromie" width={28} height={28} />
              <span className="text-lg font-bold">
                chromie<span className="font-normal text-zinc-500">.dev</span>
              </span>
            </a>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-500">
              The deterministic stack for web agents. Intelligence and reliability on the live web.
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">Quick menu</p>
            <ul className="mt-4 space-y-2">
              {NAV_LINKS.slice(0, 4).map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-zinc-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">Contact</p>
            <ul className="mt-4 space-y-2">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={CAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  Get started
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-6xl border-t border-white/10 px-4 pt-8 sm:px-6">
          <p className="font-mono text-[11px] text-zinc-600">
            © {new Date().getFullYear()} chromie.dev. All rights reserved.
          </p>
        </div>
      </footer>
    </Reveal>
  )
}
