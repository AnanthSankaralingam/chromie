import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/featured-projects
// Returns a list of featured projects, based on project IDs stored in the `featured_projects` table.
export async function GET() {
  const supabase = createClient()

  try {
    const { data: featuredRows, error: featuredError } = await supabase
      .from("featured_projects")
      .select("id, project_id, position, created_at, demo_video_url")
      .order("position", { ascending: true })
      .order("created_at", { ascending: false })

    if (featuredError) {
      console.error("[FeaturedProjects] Error fetching featured_projects rows:", featuredError)
      return NextResponse.json(
        { error: "Failed to load featured projects" },
        { status: 500 }
      )
    }

    if (!featuredRows || featuredRows.length === 0) {
      console.log("[FeaturedProjects] No featured projects configured")
      return NextResponse.json({ projects: [] }, { status: 200 })
    }

    const projectIds = featuredRows.map((row) => row.project_id).filter(Boolean)

    if (projectIds.length === 0) {
      console.log("[FeaturedProjects] featured_projects rows found, but no valid project IDs")
      return NextResponse.json({ projects: [] }, { status: 200 })
    }

    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, name, description, created_at, user_id")
      .in("id", projectIds)

    if (projectsError) {
      console.error("[FeaturedProjects] Error fetching projects for featured IDs:", projectsError)
      return NextResponse.json(
        { error: "Failed to load featured projects" },
        { status: 500 }
      )
    }

    const projectsById = new Map(projects.map((project) => [project.id, project]))

    const orderedProjects = featuredRows
      .map((row) => {
        const project = projectsById.get(row.project_id)
        if (!project) {
          console.warn(
            "[FeaturedProjects] Featured project row has missing project record",
            { featuredId: row.id, projectId: row.project_id }
          )
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

    console.log(
      "[FeaturedProjects] Returning featured projects",
      { requestedCount: featuredRows.length, resolvedCount: orderedProjects.length }
    )

    return NextResponse.json({ projects: orderedProjects }, { status: 200 })
  } catch (error) {
    console.error("[FeaturedProjects] Unexpected error loading featured projects:", error)
    return NextResponse.json(
      { error: "Unexpected error loading featured projects" },
      { status: 500 }
    )
  }
}

