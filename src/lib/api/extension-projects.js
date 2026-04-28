const USER_SCRIPT_FILE = "userscript.js"
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const USER_SCRIPT_META_RE = /\/\/\s*==UserScript==/

export function normalizeRunAt(runAt) {
  if (runAt === "document_start" || runAt === "document_end" || runAt === "document_idle") {
    return runAt
  }
  return "document_idle"
}

export function normalizeStringList(values, fallback = []) {
  if (!Array.isArray(values)) return fallback
  const cleaned = values.map((value) => String(value || "").trim()).filter(Boolean)
  return cleaned.length > 0 ? cleaned : fallback
}

export function isUuid(value) {
  return UUID_RE.test(String(value || ""))
}

export function findRunnableUserScriptFile(files = [], metadata = null) {
  const jsFiles = (files || []).filter((file) => file.file_path?.endsWith(".js"))
  return (
    jsFiles.find((file) => file.file_path === USER_SCRIPT_FILE) ||
    jsFiles.find((file) => USER_SCRIPT_META_RE.test(file.content || "")) ||
    (metadata ? jsFiles[0] : null)
  )
}

export function isExtensionEligibleProject(files = [], metadata = null) {
  return Boolean(findRunnableUserScriptFile(files, metadata))
}

export function toExtensionScript(project, files = [], metadata = null) {
  const scriptFile = findRunnableUserScriptFile(files, metadata)

  return {
    id: project.id,
    projectId: project.id,
    name: project.name || "Untitled Extension",
    description: project.description || "",
    code: scriptFile?.content || "",
    enabled: metadata?.enabled !== false,
    matchPatterns: normalizeStringList(metadata?.match_patterns, ["*://*/*"]),
    excludePatterns: normalizeStringList(metadata?.exclude_patterns, []),
    runAt: normalizeRunAt(metadata?.run_at),
    version: metadata?.version || "1.0",
    author: metadata?.author || "user",
    source: metadata?.source || "chromie-web",
    createdAt: project.created_at ? new Date(project.created_at).getTime() : Date.now(),
    updatedAt: metadata?.updated_at
      ? new Date(metadata.updated_at).getTime()
      : project.last_used_at
      ? new Date(project.last_used_at).getTime()
      : Date.now(),
    remoteUpdatedAt: metadata?.updated_at || project.last_used_at || project.created_at || null,
    aiConversation: metadata?.ai_conversation || [],
  }
}

export function toProjectRows(script, userId) {
  const now = new Date().toISOString()
  const projectId = isUuid(script?.projectId) ? script.projectId : isUuid(script?.id) ? script.id : crypto.randomUUID()
  const updatedAt = script?.updatedAt ? new Date(script.updatedAt).toISOString() : now

  return {
    projectId,
    project: {
      id: projectId,
      user_id: userId,
      name: script?.name || "Untitled Extension",
      description: script?.description || "",
      initial_prompt: (script?.description || "").slice(0, 2000) || null,
      archived: false,
      last_used_at: updatedAt,
    },
    codeFile: {
      project_id: projectId,
      file_path: USER_SCRIPT_FILE,
      content: script?.code || "",
      last_used_at: updatedAt,
    },
    metadata: {
      project_id: projectId,
      user_id: userId,
      enabled: script?.enabled !== false,
      match_patterns: normalizeStringList(script?.matchPatterns, ["*://*/*"]),
      exclude_patterns: normalizeStringList(script?.excludePatterns, []),
      run_at: normalizeRunAt(script?.runAt),
      version: script?.version || "1.0",
      author: script?.author || "user",
      source: script?.source || "chromie-extension",
      ai_conversation: Array.isArray(script?.aiConversation) ? script.aiConversation : [],
      installed_at: script?.createdAt ? new Date(script.createdAt).toISOString() : now,
      last_synced_at: now,
      updated_at: updatedAt,
    },
  }
}

export function groupFilesByProject(files = []) {
  const grouped = new Map()
  for (const file of files || []) {
    const list = grouped.get(file.project_id) || []
    list.push(file)
    grouped.set(file.project_id, list)
  }
  return grouped
}

export function keyByProjectId(rows = []) {
  const keyed = new Map()
  for (const row of rows || []) {
    keyed.set(row.project_id, row)
  }
  return keyed
}
