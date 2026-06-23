export const BASE_DEMO_VIDEO_ID = "uI0MVyhb2xg"

export const DEMO_USE_CASES = [
  {
    id: "pharma-intelligence",
    label: "Pharma",
    title: "Pharma Intelligence",
    videoId: "7d0FBnxEbhY",
    summary:
      "Monitor competitive pipelines, extract structured data from public filings, and compile intelligence reports across pharma sources.",
    description:
      "Pharma teams need current data from trial registries, SEC filings, press releases, and specialty databases — often spread across dozens of sites with inconsistent layouts. chromie agents navigate these sources with deterministic tools so extractions stay reliable run after run.",
    highlights: [
      "Track competitor trial activity and pipeline changes",
      "Extract structured fields from filings and registry pages",
      "Full execution trace for audit and compliance review",
    ],
  },
  {
    id: "clinical-trials",
    label: "Clinical Trials",
    title: "Clinical Trials",
    videoId: "PSh90XUcy6g",
    summary:
      "Search trial registries, monitor enrollment status, and pull protocol metadata without brittle one-off scrapers.",
    description:
      "Clinical research workflows depend on up-to-date trial data from sources like ClinicalTrials.gov and sponsor sites. chromie combines LLM reasoning with self-healing tools so agents recover when selectors break and keep producing consistent output.",
    highlights: [
      "Query and filter trials across public registries",
      "Monitor status changes and new study postings",
      "Export normalized trial records for downstream analysis",
    ],
  },
  {
    id: "insurance",
    label: "Insurance",
    title: "Insurance",
    videoId: "3CHbocJSUaU",
    summary:
      "Automate payer portal navigation, prior authorization lookups, and provider directory research with production-grade reliability.",
    description:
      "Insurance workflows often require logging into payer portals, searching provider networks, and copying structured eligibility or authorization details. chromie handles the repetitive browser steps deterministically while the agent decides what to look up next.",
    highlights: [
      "Navigate payer and clearinghouse portals reliably",
      "Fill and submit forms with auditable tool calls",
      "Self-heal when portal UI layouts change",
    ],
  },
  {
    id: "government-contracts",
    label: "Gov Contracts",
    title: "Government Contracts",
    videoId: "E48_3b6VS0s",
    summary:
      "Research federal procurement data, monitor contract awards, and build recurring search-and-report workflows on SAM.gov and related sources.",
    description:
      "Government contracting research means searching SAM.gov, FPDS, agency sites, and vendor pages — then synthesizing results into actionable reports. chromie agents run these searches on schedule with deterministic extraction so your team gets the same fields every time.",
    highlights: [
      "Search award and opportunity databases at scale",
      "Compile vendor and contract intelligence reports",
      "Schedule recurring monitoring with execution replay",
    ],
  },
]

export function getDemoThumbnailUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

export function getDemoEmbedUrl(videoId, { autoplay = false, muted = false } = {}) {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    controls: "1",
  })
  if (autoplay) {
    params.set("autoplay", "1")
    if (muted) params.set("mute", "1")
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}
