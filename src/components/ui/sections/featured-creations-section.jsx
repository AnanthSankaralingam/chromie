import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const INITIAL_STATE = {
  loading: true,
  error: null,
  projects: [],
}

export default function FeaturedCreationsSection() {
  const [state, setState] = useState(INITIAL_STATE)
  const router = useRouter()

  useEffect(() => {
    const fetchFeaturedProjects = async () => {
      try {
        console.log("[FeaturedCreations] Fetching featured projects...")
        const response = await fetch("/api/featured-projects")

        if (!response.ok) {
          console.error("[FeaturedCreations] Failed to fetch featured projects", {
            status: response.status,
          })
          setState({
            loading: false,
            error: "unable to load featured creations right now.",
            projects: [],
          })
          return
        }

        const data = await response.json()
        console.log("[FeaturedCreations] Loaded featured projects", {
          count: data?.projects?.length ?? 0,
        })

        setState({
          loading: false,
          error: null,
          projects: Array.isArray(data.projects) ? data.projects : [],
        })
      } catch (error) {
        console.error("[FeaturedCreations] Unexpected error while loading featured projects", error)
        setState({
          loading: false,
          error: "unexpected error loading featured creations.",
          projects: [],
        })
      }
    }

    fetchFeaturedProjects()
  }, [])

  const handleForkProject = async (projectId) => {
    try {
      console.log("[FeaturedCreations] Forking featured project", { projectId })

      const response = await fetch(`/api/projects/${projectId}/fork`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        const message = data.error || "Failed to fork project"
        console.error("[FeaturedCreations] Fork failed:", message)
        return
      }

      console.log("[FeaturedCreations] Fork completed successfully", data)

      if (data?.project?.id) {
        sessionStorage.setItem("chromie_current_project_id", data.project.id)
        router.push(`/builder?project=${data.project.id}`)
      }
    } catch (error) {
      console.error("[FeaturedCreations] Error forking project:", error)
    }
  }

  const visibleProjects = state.projects

  return (
    <section
      id="featured-creations"
      className="relative z-10 w-full"
    >
      <div className="max-w-6xl mx-auto px-6 pt-10 pb-16 md:pt-12 md:pb-20">
        {/* Header */}
        <div className="text-center mb-10 md:mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-3">
            gallery
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-50 mb-3">
            featured creations
          </h2>
          <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto">
            discover extensions built with chromie. curated projects from teams, founders, and
            builders shipping in the browser.
          </p>
        </div>

        {/* Content */}
        {state.loading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" />
          </div>
        ) : state.error ? (
          <div className="flex flex-col items-center justify-center py-8 text-sm text-slate-400">
            <p>{state.error}</p>
          </div>
        ) : visibleProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-sm text-slate-400">
            <p>no featured creations yet.</p>
            <p className="mt-1 text-xs text-slate-500">
              Add project IDs to the <code className="text-xs text-slate-300">featured_projects</code>{" "}
              table in Supabase to populate this section.
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-6",
              visibleProjects.length === 1
                ? "grid-cols-1 place-items-center"
                : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            )}
          >
            {visibleProjects.map((project) => (
              <article
                key={project.id}
                className="group relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950/60 shadow-[0_18px_60px_rgba(15,23,42,0.7)] hover:-translate-y-1.5 hover:shadow-[0_24px_80px_rgba(15,23,42,0.9)] transition-all duration-300"
              >
                {/* Hero area */}
                <div className="relative h-52 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                  <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_0%_0%,rgba(148,163,184,0.35),transparent_55%),radial-gradient(circle_at_100%_0%,rgba(148,163,184,0.15),transparent_55%)]" />
                  <div className="absolute inset-0 flex items-end p-6">
                    <div className="max-w-xs">
                      <h3 className="text-xl font-semibold tracking-tight text-slate-50 drop-shadow-md">
                        {(project.name || "").toLowerCase()}
                      </h3>
                      {project.description && (
                        <p className="mt-2 text-xs text-slate-200/80 line-clamp-2 drop-shadow">
                          {String(project.description).toLowerCase()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Meta row */}
                <div className="flex items-center justify-between px-5 py-4 bg-slate-950/90">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-medium text-slate-100">
                      {project.name?.charAt(0)?.toLowerCase() ?? "p"}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-100">
                        {(project.name || "chromie project")?.toLowerCase()}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        featured
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500">
                    <Button
                      size="sm"
                      variant="default"
                      className="rounded-full bg-slate-50 text-slate-900 hover:bg-white px-4 py-1.5 text-xs font-medium"
                      onClick={() => handleForkProject(project.id)}
                    >
                      fork project
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

