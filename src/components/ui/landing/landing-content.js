import { DEMO_USE_CASES } from "@/lib/demo-use-cases"

export const USE_CASE_TABS = DEMO_USE_CASES.slice().sort((a, b) => {
  if (a.id === "government-contracts") return -1
  if (b.id === "government-contracts") return 1
  return 0
}).map(({ id, label, videoId }) => ({
  id,
  label,
  videoId,
}))

export const BLURB =
  "Mission-critical workflows can't afford one production failure. chromie.dev gives web agents deterministic skills that keep automations reliable when sites, layouts, & edge cases change."

export const CONTACT_EMAIL = "founders@chromie.dev"
export const CAL_URL = "https://cal.com/chromie"

export const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#benefits", label: "Benefits" },
  { href: "/use-cases", label: "Use Cases" },
  { href: "#compare", label: "Compare" },
  { href: "#faq", label: "FAQs" },
]

export const TRUSTED_LOGOS = [
  {
    href: "https://www.ycombinator.com/",
    src: "/ycombinator-logo.svg",
    alt: "Y Combinator",
  },
  {
    href: "https://chromewebstore.google.com/detail/ionrouter-by-cumulus-labs/pdfigecoikombaefidghfheahgipepoc",
    src: "/ion-logo-128.jpeg",
    alt: "Cumulus Lab",
  },
  {
    href: "https://chromewebstore.google.com/detail/omnispeech-ai-deepfake-de/fdaalloapkmfoeelgbhdedlbiplcoahp/",
    src: "/omnispeech_logo.png",
    alt: "Omnispeech",
  },
  { href: "https://qtr.ai/", src: "/QTR-Logo.png", alt: "QTR", invert: true },
  { href: "https://bricked.ai/", src: "/bricked-logo.png", alt: "Bricked" },
  { href: "https://mentrix.ai/", src: "/mentrix-logo.png", alt: "Mentrix" },
  {
    href: "https://www.salesgraph.com/",
    src: "/salesgraph-logo.svg",
    alt: "Salesgraph",
    wide: true,
  },
]

export const SPOTLIGHTS = [
  {
    id: "deterministic",
    label: "Deterministic tool calls",
    title: "Intelligence with deterministic guardrails",
    body: "Full audit trail, no opaque model calls deciding what happens next. Intelligence where you need it. Deterministic tools where you can't afford to guess.",
    visual: "tools",
  },
  {
    id: "analysis",
    label: "Build or upgrade",
    title: "New automation or upgrade the one you have",
    body: "Create a brand-new automation with the chromie agent and its tools, or connect chromie to what you already run and layer deterministic tools on top.",
    visual: "analysis",
  },
  {
    id: "runtime",
    label: "Runtime skill selection",
    title: "Right skill, right moment in the flow",
    body: "Select and position skills based on task context and where the agent sits in the workflow.",
    visual: "router",
  },
  {
    id: "self-healing",
    label: "Self-healing tools",
    title: "Recover when the site changes",
    body: "When selectors break or the DOM drifts, tools detect failure and re-resolve targets automatically. Each invocation makes them smarter and more reliable, with no manual fixes.",
    visual: "healing",
  },
]

export const FEATURE_PILLS = [
  "Deterministic tool calls",
  "Execution replay",
  "Task-aware routing",
  "Self-healing tools",
  "Auditable actions",
  "Bot detection evasion",
]

export const BENEFITS = [
  {
    title: "Reliability without dumbing down",
    body: "Keep frontier models for reasoning while deterministic tools handle the steps that must not fail.",
  },
  {
    title: "Auditable agent actions",
    body: "Every tool invocation is traceable, built for teams that need to explain what happened and why.",
  },
  {
    title: "Workflow-native skills",
    body: "Skills map to how your agents actually work on the web, not generic one-size prompts.",
  },
  {
    title: "Past-run learning",
    body: "Mine execution history to spot patterns worth turning into permanent tooling.",
  },
  {
    title: "Production guardrails",
    body: "Combine LLM flexibility with hard boundaries so agents stay inside approved paths.",
  },
  {
    title: "Self-healing tools",
    body: "When sites change or selectors break, tools recover automatically and grow smarter on every invocation, with no manual fixes.",
  },
]

export const COMPARISON_ROWS = [
  { feature: "Deterministic tool invocation", other: "Probabilistic", chromie: "Deterministic" },
  { feature: "Past execution analysis", other: "Manual", chromie: "Automated" },
  { feature: "Runtime skill selection", other: "Static prompts", chromie: "Task-aware" },
  { feature: "Self-healing tools", other: "Manual fixes", chromie: "Automatic recovery" },
  { feature: "Reliability + intelligence", other: "Trade-off", chromie: "Both" },
  { feature: "Auditable agent actions", other: "Limited", chromie: "Full trace" },
  { feature: "Setup for production", other: "Weeks", chromie: "Minutes" },
]

export const FAQ_ITEMS = [
  {
    id: "what",
    num: "01",
    q: "What is chromie.dev?",
    a: "The deterministic stack for web agents, combining AI with tooling that executes reliably on the web.",
  },
  {
    id: "how",
    num: "02",
    q: "How is this different from pure LLM automation?",
    a: BLURB,
  },
  {
    id: "demo",
    num: "03",
    q: "How do I see it in action?",
    a: "Book a demo via our calendar or watch the product walkthrough in the hero browser preview.",
  },
  {
    id: "contact",
    num: "04",
    q: "Who do I reach for partnerships or pilots?",
    a: `Email us at ${CONTACT_EMAIL} and we'll respond quickly.`,
  },
  {
    id: "stack",
    num: "05",
    q: "What kinds of workflows is chromie built for?",
    a: "Healthcare research, pharma workflows, clinical studies, search & report agents: any web agent that needs both intelligence and deterministic reliability.",
  },
]
