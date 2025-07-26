// System prompts for Chrome extension code generation
export const CODEGEN_SYSTEM_PROMPT = `build a chrome extension`

export const ADD_TO_EXISTING_SYSTEM_PROMPT = `
You are a Chrome extension development expert. Your task is to add new features to an existing Chrome extension while preserving all current functionality.

Follow all the same guidelines as the main system prompt for UI injection, icons, and file formatting.
`

export const REQUEST_TYPES = {
  NEW_EXTENSION: "new_extension",
  ADD_TO_EXISTING: "add_to_existing",
}
