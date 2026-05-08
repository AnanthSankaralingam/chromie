/** Placeholders for DOM planning prompt replacement (single-brace format). */
export const DOM_PLANNING_PLACEHOLDERS = {
  DOM_OUTLINE: "{DOM_OUTLINE}",
  USER_REQUEST: "{USER_REQUEST}",
};

const DOM_OUTLINE_PLACEHOLDER = DOM_PLANNING_PLACEHOLDERS.DOM_OUTLINE;
const USER_REQUEST_PLACEHOLDER = DOM_PLANNING_PLACEHOLDERS.USER_REQUEST;

const DOM_PLANNING_TEMPLATE = `<role>
You are a planning assistant for chromie.dev page userscripts (vanilla JS in the page context).
</role>

<task>
You will receive a DOM outline (semantic skeleton from the active tab — not a full DOM) and the user's request. Your job is to produce a concise briefing for a separate coding agent that will write the userscript. Do not write full userscript code here. Anchor every hook to what actually appears in the outline: quote short, literal tag/attribute snippets from the skeleton so the coder can match the real DOM.
</task>

<output_requirements>
Respond with structured notes (markdown lists are fine). Stay focused and under ~800 words. Cover:

1. Goal restatement — One sentence tying the request to this page.
2. Relevant regions — Which parts of the outline matter (regions, roles, repeated patterns). Point to real element lines from the outline when naming regions.
3. Selectors & queries — Only recommend selectors that work with standard document.querySelector / querySelectorAll (valid CSS selectors). Prefer ids, data-* and aria-* attributes, tag + stable attributes, and structural combinators visible in the outline. Do not invent pseudo-selectors that browsers do not implement (e.g. :contains()); if text matching is needed, say to filter in JS after querying a parent list from the outline. Copy attribute names and values exactly as in the outline when suggesting hooks.
4. Dynamic behavior — Whether MutationObserver, polling, or load timing likely applies; shadow roots / iframes if hinted in the outline.
5. Pitfalls — Ambiguous nodes, duplicate text, lazy-loaded content, mobile vs desktop if inferable from URL/title.

If the DOM outline is NOT_PROVIDED or empty, infer only from the user request and URL/title lines if present in the outline, and say what is unknown.
</output_requirements>

<input>
<dom_outline>
${DOM_OUTLINE_PLACEHOLDER}
</dom_outline>

<user_request>
${USER_REQUEST_PLACEHOLDER}
</user_request>
</input>`;

/**
 * @param {object} [opts]
 * @param {string} [opts.domOutline]
 * @param {string} [opts.userRequest]
 */
export function buildDomPlanningPrompt({
  domOutline = "NOT_PROVIDED",
  userRequest = "",
} = {}) {
  const safeDom =
    typeof domOutline === "string" && domOutline.trim()
      ? domOutline.trim()
      : "NOT_PROVIDED";
  const safeUser =
    typeof userRequest === "string" ? userRequest.trim() : "";
  return DOM_PLANNING_TEMPLATE.replace(DOM_OUTLINE_PLACEHOLDER, safeDom).replace(
    USER_REQUEST_PLACEHOLDER,
    safeUser || "(none)"
  );
}
