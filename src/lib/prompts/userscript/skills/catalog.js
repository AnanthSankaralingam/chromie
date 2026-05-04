export const EXTENSION_USERSCRIPT_SKILLS = [
  {
    id: "dom",
    title: "DOM Targeting and Resilience",
    description:
      "Needed only when interacting with existing page structure/content (targeting site elements, scraping sections, or anchoring behavior to host DOM). Skip for self-contained overlays/timers/panels mounted on document.body.",
    context: `- Use stable selectors first (id, data-*, aria-*), scope queries to the right container, and include explicit fallbacks.
- Handle timing and re-render churn with bounded retries or MutationObserver; avoid fragile one-shot DOM grabs.
- Validate node existence and expected shape before acting so behavior fails safely on layout variants.`,
  },
  {
    id: "llm_api",
    title: "LLM API Integration",
    description:
      "Needed when the userscript must generate AI output via Chromie's authenticated backend proxy (not user-provided LLM keys).",
    context: `- Do not call provider SDKs, never ask for user API keys, and never fetch Chromie from the page (host CSP/connect-src blocks it). Use only \`await chromieLlm.call(request)\` where \`request\` is POST-shaped JSON: \`{ prompt }\` or \`{ input }\` or \`{ messages }\`, plus optional \`{ temperature, max_output_tokens }\` (same shapes as Chromie's proxy). The Chromie host injects \`chromieLlm\` into scope before your code runs.
- \`chromieLlm.call\` returns a Promise resolving to \`{ text, usage }\`. Wrap in try/catch; on failure the Error \`message\` often reflects sign-in required, token limits, or upstream errors—surface readable UI feedback.
- Do not use \`fetch\`, \`XMLHttpRequest\`, \`chrome.runtime\`, or hard-coded chromie.dev URLs for LLM calls; codegen must not implement transport—only call \`chromieLlm.call\`.`,
  },
  {
    id: "injected_ui",
    title: "Injected UI Quality",
    description:
      "Needed when adding visible controls, overlays, toasts, panels, or other UI to the host page.",
    context: `- Keep injected UI compact, accessible, and dismissible with semantic controls, labels, and visible keyboard focus.
- Avoid blocking core page navigation/content; position thoughtfully and respect viewport constraints.
- Scope styles and DOM ids/classes to prevent host-page collisions and unintended visual regressions.`,
  },
];

const SKILL_INDEX = new Map(
  EXTENSION_USERSCRIPT_SKILLS.map((skill) => [skill.id, skill])
);

const MAX_SKILLS = 6;

export function getExtensionUserscriptSkillCatalogText() {
  return EXTENSION_USERSCRIPT_SKILLS.map(
    (skill) => `- ${skill.id}: ${skill.title} — ${skill.description}`
  ).join("\n");
}

export function normalizeExtensionUserscriptSkillIds(rawIds) {
  if (!Array.isArray(rawIds) || rawIds.length === 0) return [];
  const out = [];
  for (const raw of rawIds) {
    if (typeof raw !== "string") continue;
    const id = raw.trim();
    if (!id || out.includes(id)) continue;
    if (!SKILL_INDEX.has(id)) continue;
    out.push(id);
    if (out.length >= MAX_SKILLS) break;
  }
  return out;
}

export function formatExtensionUserscriptSkillContext(skillIds) {
  const ids = normalizeExtensionUserscriptSkillIds(skillIds);
  if (ids.length === 0) return "NOT_PROVIDED";
  return ids
    .map((id) => {
      const skill = SKILL_INDEX.get(id);
      return `- ${skill.title}: ${skill.context}`;
    })
    .join("\n");
}
