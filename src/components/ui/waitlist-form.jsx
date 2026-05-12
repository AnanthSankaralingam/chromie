"use client"

import { useState } from "react"
import { Input } from "@/components/ui/forms-and-input/input"
import { Textarea } from "@/components/ui/forms-and-input/textarea"
import { Loader2 } from "lucide-react"

const fieldClass =
  "h-11 w-full rounded-xl border border-white/[0.12] bg-black/40 px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] focus:border-cyan-400/45 focus:outline-none focus:ring-1 focus:ring-cyan-400/25 disabled:opacity-50"

const textareaClass =
  "min-h-[88px] w-full rounded-xl border border-white/[0.12] bg-black/40 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] focus:border-cyan-400/45 focus:outline-none focus:ring-1 focus:ring-cyan-400/25 disabled:opacity-50 resize-y"

export default function WaitlistForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [useCase, setUseCase] = useState("")
  const [status, setStatus] = useState("idle")
  const [message, setMessage] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage("")

    if (!name.trim() || !email.trim()) {
      setStatus("error")
      setMessage("Please add your name and email.")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setStatus("error")
      setMessage("Please enter a valid email address.")
      return
    }

    const submittedEmail = email.trim()
    setStatus("loading")

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: submittedEmail,
          useCase: useCase.trim() || undefined,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setStatus("error")
        setMessage(data.error || "Something went wrong. Please try again.")
        return
      }

      setStatus("success")
      setMessage("You're on the list — we'll be in touch.")
      setName("")
      setEmail("")
      setUseCase("")
      console.log("[waitlist] signup ok", { email: submittedEmail })
    } catch (err) {
      console.error("[waitlist] request failed", err)
      setStatus("error")
      setMessage("Network error. Please try again.")
    }
  }

  return (
    <div>
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-white mb-2">
          Join the waitlist
        </h1>
        <p className="text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
          Get early access as we ship tailored tools and runtime skills for web agents.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1.5">
            <label htmlFor="waitlist-name" className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
              Name
            </label>
            <Input
              id="waitlist-name"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={fieldClass}
              disabled={status === "loading" || status === "success"}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="waitlist-email" className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
              Email
            </label>
            <Input
              id="waitlist-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className={fieldClass}
              disabled={status === "loading" || status === "success"}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="waitlist-use-case" className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
            Use case <span className="normal-case text-zinc-600 font-normal">(optional)</span>
          </label>
          <Textarea
            id="waitlist-use-case"
            name="useCase"
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            placeholder="Agent stack, workflows you want to optimize, etc."
            className={textareaClass}
            disabled={status === "loading" || status === "success"}
          />
        </div>

        <div className="flex justify-center pt-1">
          <button
            type="submit"
            disabled={status === "loading" || status === "success"}
            className="w-full sm:w-auto min-w-[200px] inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/[0.12] px-6 py-3 text-sm font-semibold text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all hover:border-cyan-300/55 hover:bg-cyan-500/[0.2] hover:shadow-[0_0_28px_-6px_rgba(34,211,238,0.35)] disabled:pointer-events-none disabled:opacity-45"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                Joining…
              </>
            ) : status === "success" ? (
              "Joined"
            ) : (
              "Join the waitlist"
            )}
          </button>
        </div>

        {message ? (
          <p
            role="status"
            className={
              status === "success"
                ? "text-center text-sm text-emerald-400/95"
                : "text-center text-sm text-amber-400/95"
            }
          >
            {message}
          </p>
        ) : null}
      </form>
    </div>
  )
}
