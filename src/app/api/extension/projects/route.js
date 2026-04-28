import { createClient } from "@/lib/supabase/server"
import { extensionJson, extensionOptions } from "@/lib/api/extension-api"
import {
  groupFilesByProject,
  isExtensionEligibleProject,
  keyByProjectId,
  toExtensionScript,
  toProjectRows,
} from "@/lib/api/extension-projects"

export function OPTIONS(request) {
  return extensionOptions(request)
}

async function getAuthenticatedClient(request) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { response: extensionJson(request, { error: "Unauthorized" }, { status: 401 }) }
  }

  return { supabase, user }
}

export async function GET(request) {
  const auth = await getAuthenticatedClient(request)
  if (auth.response) return auth.response
  const { supabase, user } = auth

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, user_id, name, description, created_at, last_used_at, archived")
    .eq("user_id", user.id)
    .eq("archived", false)
    .order("last_used_at", { ascending: false })

  if (projectsError) {
    return extensionJson(request, { error: projectsError.message }, { status: 500 })
  }

  const projectIds = (projects || []).map((project) => project.id)
  if (projectIds.length === 0) {
    return extensionJson(request, { scripts: {}, projects: [] })
  }

  const [{ data: files, error: filesError }, { data: metadata, error: metadataError }] = await Promise.all([
    supabase.from("code_files").select("*").in("project_id", projectIds).order("file_path"),
    supabase.from("extension_project_metadata").select("*").in("project_id", projectIds),
  ])

  if (filesError) {
    return extensionJson(request, { error: filesError.message }, { status: 500 })
  }

  if (metadataError) {
    return extensionJson(request, { error: metadataError.message }, { status: 500 })
  }

  const filesByProject = groupFilesByProject(files || [])
  const metadataByProject = keyByProjectId(metadata || [])
  const scripts = {}
  const eligibleProjects = []

  for (const project of projects || []) {
    const projectFiles = filesByProject.get(project.id) || []
    const projectMetadata = metadataByProject.get(project.id) || null
    if (!isExtensionEligibleProject(projectFiles, projectMetadata)) continue

    const script = toExtensionScript(project, projectFiles, projectMetadata)
    scripts[script.id] = script
    eligibleProjects.push(project)
  }

  return extensionJson(request, { scripts, projects: eligibleProjects })
}

export async function PUT(request) {
  const auth = await getAuthenticatedClient(request)
  if (auth.response) return auth.response
  const { supabase, user } = auth
  const body = await request.json().catch(() => ({}))
  const incoming = Array.isArray(body?.scripts) ? body.scripts : Object.values(body?.scripts || {})
  const deletedIds = Array.isArray(body?.deletedIds) ? body.deletedIds : []
  const saved = {}

  for (const projectId of deletedIds) {
    const { error: archiveError } = await supabase
      .from("projects")
      .update({ archived: true, last_used_at: new Date().toISOString() })
      .eq("id", projectId)
      .eq("user_id", user.id)

    if (archiveError) {
      return extensionJson(request, { error: archiveError.message }, { status: 500 })
    }
  }

  for (const script of incoming) {
    const rows = toProjectRows(script, user.id)

    const { error: projectError } = await supabase
      .from("projects")
      .upsert(rows.project, { onConflict: "id" })

    if (projectError) {
      return extensionJson(request, { error: projectError.message }, { status: 500 })
    }

    const { error: fileError } = await supabase
      .from("code_files")
      .upsert(rows.codeFile, { onConflict: "project_id,file_path" })

    if (fileError) {
      return extensionJson(request, { error: fileError.message }, { status: 500 })
    }

    const { error: metadataError } = await supabase
      .from("extension_project_metadata")
      .upsert(rows.metadata, { onConflict: "project_id" })

    if (metadataError) {
      return extensionJson(request, { error: metadataError.message }, { status: 500 })
    }

    saved[rows.projectId] = {
      ...script,
      id: rows.projectId,
      projectId: rows.projectId,
      remoteUpdatedAt: rows.metadata.updated_at,
    }
  }

  return extensionJson(request, { success: true, scripts: saved, count: Object.keys(saved).length })
}
