import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const CACHE_HEADERS = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" }

// GET /api/featured-projects?limit=3
// Returns featured projects from `featured_projects`, optionally limited.
export async function GET(request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const limitParam = Number.parseInt(searchParams.get("limit") || "", 10)
  const pageParam = Number.parseInt(searchParams.get("page") || "", 10)
  const hasValidLimit = Number.isFinite(limitParam) && limitParam > 0
  const hasValidPage = Number.isFinite(pageParam) && pageParam > 0
  const limit = hasValidLimit ? Math.min(limitParam, 50) : null
  const page = hasValidPage ? pageParam : 1

  try {
    let query = supabase
      .from("featured_projects")
      .select("id, project_id, position, created_at, demo_video_url, chrome_web_store_url, is_public, projects(id, name, description, created_at, user_id)", { count: "exact" })
      .order("position", { ascending: true })
      .order("created_at", { ascending: false })

    if (limit) {
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)
    }

    const { data: featuredRows, error, count } = await query

    if (error) {
      console.error("[FeaturedProjects] Error fetching featured projects:", error)
      return NextResponse.json({ error: "Failed to load featured projects" }, { status: 500 })
    }

    if (!featuredRows || featuredRows.length === 0) {
      console.log("[FeaturedProjects] No featured projects configured")
      return NextResponse.json({ projects: [] }, { status: 200, headers: CACHE_HEADERS })
    }

    const orderedProjects = featuredRows
      .map((row) => {
        const project = row.projects
        if (!project) {
          console.warn("[FeaturedProjects] Featured project row has missing project record", {
            featuredId: row.id,
            projectId: row.project_id,
          })
          return null
        }
        return {
          id: project.id,
          name: project.name,
          description: project.description,
          createdAt: project.created_at,
          userId: project.user_id,
          featuredId: row.id,
          position: row.position,
          featuredAt: row.created_at,
          demoVideoUrl: row.demo_video_url ?? null,
          chromeWebStoreUrl: row.chrome_web_store_url ?? null,
          isPublic: row.is_public ?? true,
        }
      })
      .filter(Boolean)

    const pagination = limit
      ? {
          page,
          limit,
          totalCount: count ?? orderedProjects.length,
          totalPages: Math.max(1, Math.ceil((count ?? orderedProjects.length) / limit)),
          hasNextPage: page * limit < (count ?? orderedProjects.length),
        }
      : null

    return NextResponse.json({ projects: orderedProjects, pagination }, { status: 200, headers: CACHE_HEADERS })
  } catch (error) {
    console.error("[FeaturedProjects] Unexpected error loading featured projects:", error)
    return NextResponse.json({ error: "Unexpected error loading featured projects" }, { status: 500 })
  }
}

