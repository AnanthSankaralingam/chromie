"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Mail, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

const contactEmails = [
  { name: "Ananth", email: "ananths1@terpmail.umd.edu" },
  { name: "Akshay", email: "akshay.mistry@gatech.edu" },
]

export default function ContactSection() {
  const [copiedEmail, setCopiedEmail] = useState(null)

  const handleCopyEmail = async (email) => {
    try {
      await navigator.clipboard.writeText(email)
      setCopiedEmail(email)
      setTimeout(() => setCopiedEmail(null), 2000)
    } catch (err) {
      console.error("Failed to copy email:", err)
    }
  }

  return (
    <section id="contact" className="relative z-10 px-6 py-16">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-3">
            Contact
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-50 mb-3">
            contact us
          </h2>
          <p className="text-sm md:text-base text-slate-400">
            we'll reply the same day
          </p>
        </motion.div>

        {/* Email Cards */}
        <div className="space-y-3">
          {contactEmails.map((contact, index) => (
            <motion.div
              key={contact.email}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.05 * index }}
              className="backdrop-blur-xl bg-slate-800/30 rounded-xl border border-slate-700/40 p-4 hover:border-gray-500/40 transition-all duration-300"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-gray-600 to-gray-400 rounded-lg flex-shrink-0">
                    <Mail className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 text-sm md:text-base break-all">{contact.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleCopyEmail(contact.email)}
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200 flex-shrink-0",
                    copiedEmail === contact.email
                      ? "bg-green-600/20 text-green-400 border border-green-500/30"
                      : "bg-slate-700/50 text-slate-300 hover:bg-slate-700/70 hover:text-white border border-slate-600/50 hover:border-gray-500/50"
                  )}
                  aria-label={`Copy ${contact.email}`}
                >
                  {copiedEmail === contact.email ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

