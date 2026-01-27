import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkLimit, formatLimitError } from "@/lib/limit-checker"

const TEXT_EXTENSIONS = new Set([
  "js",
  "jsx",
  "ts",
  "tsx",
  "json",
  "html",
  "css",
  "md",
  "txt",
])

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "ico",
])

function getExtension(filePath = "") {
  const parts = filePath.split(".")
  if (parts.length < 2) return ""
  return parts.pop().toLowerCase()
}

function isTextFile(filePath) {
  const ext = getExtension(filePath)
  return TEXT_EXTENSIONS.has(ext) || filePath === "manifest.json"
}

function isImageFile(filePath, mimeType = "") {
  const ext = getExtension(filePath)
  if (IMAGE_EXTENSIONS.has(ext)) return true
  if (mimeType.startsWith("image/")) return true
  return false
}

export async function POST(request) {
  const supabase = createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()

    const requestedName = formData.get("projectName")
    const requestedDescription =
      formData.get("description") || "Imported Chrome extension"

    const files = formData.getAll("files") || []

    if (!files.length) {
      return NextResponse.json(
        { error: "No files provided for import" },
        { status: 400 }
      )
    }

    console.log("[import-extension] Starting import for user", {
      userId: user.id,
      fileCount: files.length,
    })

    // Compute a common top-level folder prefix (e.g. "my-ext/") so we can
    // strip it and avoid nesting everything under a single extra folder.
    const rawPaths = files
      .map((file) => file.name || "")
      .filter((name) => typeof name === "string" && name.length > 0)

    let commonRootPrefix = ""
    if (rawPaths.length > 0) {
      const first = rawPaths[0]
      const firstSlashIndex = first.indexOf("/")
      if (firstSlashIndex !== -1) {
        const candidate = first.slice(0, firstSlashIndex + 1) // include trailing slash
        const allSharePrefix = rawPaths.every((p) => p.startsWith(candidate))
        if (allSharePrefix) {
          commonRootPrefix = candidate
          console.log("[import-extension] Detected common root folder prefix", {
            commonRootPrefix,
          })
        }
      }
    }

    const normalizePath = (relativePath) => {
      if (!relativePath || typeof relativePath !== "string") return relativePath
      if (commonRootPrefix && relativePath.startsWith(commonRootPrefix)) {
        return relativePath.slice(commonRootPrefix.length)
      }
      return relativePath
    }

    // Enforce project limits
    const limitCheck = await checkLimit(user.id, "projects", 1, supabase)

    if (!limitCheck.allowed) {
      console.log(
        `[import-extension] User ${user.id} hit project limit`,
        limitCheck
      )
      return NextResponse.json(
        formatLimitError(limitCheck, "projects"),
        { status: 403 }
      )
    }

    // Create the project first
    const {
      data: project,
      error: projectError,
    } = await supabase
      .from("projects")
      .insert([
        {
          user_id: user.id,
          name: requestedName || "Imported Extension",
          description: requestedDescription,
          created_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
          archived: false,
        },
      ])
      .select()
      .single()

    if (projectError || !project) {
      console.error("[import-extension] Error creating project:", projectError)
      return NextResponse.json(
        { error: projectError?.message || "Failed to create project" },
        { status: 500 }
      )
    }

    const projectId = project.id
    console.log("[import-extension] Created project", { projectId })

    let manifestContent = null

    // Insert files
    for (const file of files) {
      // In the browser we send the relative path as the third argument to FormData.append,
      // so on the server it arrives as file.name.
      const rawRelativePath = file.name || file.webkitRelativePath || file._name
      const relativePath = normalizePath(rawRelativePath)
      if (!relativePath) {
        console.warn("[import-extension] Skipping file with no name")
        continue
      }

      const mimeType = file.type || ""
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const size = buffer.length

      if (isTextFile(relativePath)) {
        const content = buffer.toString("utf8")

        if (!content.trim()) {
          console.log(
            `[import-extension] Skipping empty text file: ${relativePath}`
          )
          continue
        }

        if (relativePath === "manifest.json") {
          manifestContent = content
        }

        const { error: insertError } = await supabase.from("code_files").insert({
          project_id: projectId,
          file_path: relativePath,
          content,
          last_used_at: new Date().toISOString(),
        })

        if (insertError) {
          console.error(
            `[import-extension] Error inserting code file ${relativePath}:`,
            insertError
          )
        } else {
          console.log(
            `[import-extension] Saved code file ${relativePath} (${content.length} chars)`
          )
        }
      } else if (isImageFile(relativePath, mimeType)) {
        const base64 = buffer.toString("base64")

        const { error: assetError } = await supabase
          .from("project_assets")
          .insert({
            project_id: projectId,
            file_path: relativePath,
            content_base64: base64,
            file_type: "asset",
            mime_type: mimeType || "application/octet-stream",
            file_size: size,
          })

        if (assetError) {
          console.error(
            `[import-extension] Error inserting asset ${relativePath}:`,
            assetError
          )
        } else {
          console.log(
            `[import-extension] Saved asset ${relativePath} (${size} bytes)`
          )
        }
      } else {
        // Fallback: treat as text if it looks like text, otherwise store as asset
        const asString = buffer.toString("utf8")
        const looksLikeText = /^[\x09\x0A\x0D\x20-\x7E]/.test(asString[0] || "")

        if (looksLikeText) {
          const content = asString

          const { error: insertError } = await supabase
            .from("code_files")
            .insert({
              project_id: projectId,
              file_path: relativePath,
              content,
              last_used_at: new Date().toISOString(),
            })

          if (insertError) {
            console.error(
              `[import-extension] Error inserting fallback text file ${relativePath}:`,
              insertError
            )
          } else {
            console.log(
              `[import-extension] Saved fallback text file ${relativePath} (${content.length} chars)`
            )
          }
        } else {
          const base64 = buffer.toString("base64")

          const { error: assetError } = await supabase
            .from("project_assets")
            .insert({
              project_id: projectId,
              file_path: relativePath,
              content_base64: base64,
              file_type: "asset",
              mime_type: mimeType || "application/octet-stream",
              file_size: size,
            })

          if (assetError) {
            console.error(
              `[import-extension] Error inserting fallback asset ${relativePath}:`,
              assetError
            )
          } else {
            console.log(
              `[import-extension] Saved fallback asset ${relativePath} (${size} bytes)`
            )
          }
        }
      }
    }

    // Optionally update project name/description from manifest.json
    if (manifestContent) {
      try {
        const manifest = JSON.parse(manifestContent)
        const updateData = {
          last_used_at: new Date().toISOString(),
        }

        if (manifest.name && manifest.name.trim()) {
          updateData.name = manifest.name.trim()
        }
        if (manifest.description && manifest.description.trim()) {
          updateData.description = manifest.description.trim()
        }

        const { error: updateError } = await supabase
          .from("projects")
          .update(updateData)
          .eq("id", projectId)

        if (updateError) {
          console.error(
            "[import-extension] Error updating project from manifest:",
            updateError
          )
        } else {
          console.log(
            "[import-extension] Updated project metadata from manifest.json"
          )
        }
      } catch (manifestError) {
        console.warn(
          "[import-extension] Failed to parse manifest.json:",
          manifestError
        )
      }
    }

    console.log("[import-extension] Import completed successfully", {
      projectId,
    })

    return NextResponse.json({ project })
  } catch (error) {
    console.error("[import-extension] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

