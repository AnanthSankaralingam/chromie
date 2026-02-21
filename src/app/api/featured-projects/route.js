import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const CACHE_HEADERS = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" }

// GET /api/featured-projects
// Returns a list of featured projects, based on project IDs stored in the `featured_projects` table.
export async function GET() {
  const supabase = await createClient()

  try {
    const { data: featuredRows, error } = await supabase
      .from("featured_projects")
      .select("id, project_id, position, created_at, demo_video_url, projects(id, name, description, created_at, user_id)")
      .order("position", { ascending: true })
      .order("created_at", { ascending: false })

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
        }
      })
      .filter(Boolean)

    return NextResponse.json({ projects: orderedProjects }, { status: 200, headers: CACHE_HEADERS })
  } catch (error) {
    console.error("[FeaturedProjects] Unexpected error loading featured projects:", error)
    return NextResponse.json({ error: "Unexpected error loading featured projects" }, { status: 500 })
  }
}

