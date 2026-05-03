import { getExtensionUserscriptSkillCatalogText } from "@/lib/prompts/userscript/skills/catalog"

/** Placeholders for userscript skill-selection prompt replacement (single-brace format). */
export const USERSCRIPT_SKILL_SELECTION_PLACEHOLDERS = {
  USER_REQUEST: "{USER_REQUEST}",
  SKILL_CATALOG: "{SKILL_CATALOG}",
}

const USER_REQUEST_PLACEHOLDER =
  USERSCRIPT_SKILL_SELECTION_PLACEHOLDERS.USER_REQUEST
const SKILL_CATALOG_PLACEHOLDER =
  USERSCRIPT_SKILL_SELECTION_PLACEHOLDERS.SKILL_CATALOG

const USERSCRIPT_SKILL_SELECTION_TEMPLATE = `<system>
You select implementation skills for a userscript coding agent.
Choose only skills that are clearly useful for the user's request.
Return strict JSON with this exact shape and no extra keys:
{"skillIds":["id1","id2"]}
Use ids only from the provided catalog. Return an empty array when none apply.
</system>

<skill_catalog>
${SKILL_CATALOG_PLACEHOLDER}
</skill_catalog>

<user_request>
${USER_REQUEST_PLACEHOLDER}
</user_request>`

export function buildUserscriptSkillSelectionPrompt({ userRequest = "" } = {}) {
  const safeUserRequest =
    typeof userRequest === "string" ? userRequest.trim() : ""
  return USERSCRIPT_SKILL_SELECTION_TEMPLATE.replace(
    SKILL_CATALOG_PLACEHOLDER,
    getExtensionUserscriptSkillCatalogText()
  ).replace(USER_REQUEST_PLACEHOLDER, safeUserRequest || "(none)")
}
