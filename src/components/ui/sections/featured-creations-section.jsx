import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Eye } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

function getYouTubeEmbedUrl(url, controls = false) {
  let videoId = null
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.replace("/", "")
    } else {
      videoId = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop()
    }
  } catch {}
  const base = videoId ? `https://www.youtube.com/embed/${videoId}` : url
  const loop = videoId ? `&loop=1&playlist=${videoId}` : "&loop=1"
  return `${base}?autoplay=1&mute=1&rel=0&controls=${controls ? 1 : 0}&playsinline=1${loop}`
}

function LazyVideoHero({ project }) {
  const containerRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "100px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const url = String(project.demoVideoUrl || "").trim()
  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be")

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {isVisible ? (
        isYouTube ? (
          <iframe
            title={`${project.name || "featured project"} demo`}
            src={getYouTubeEmbedUrl(url)}
            className="h-full w-full object-cover"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen={false}
          />
        ) : (
          <video
            src={url}
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="none"
          />
        )
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
    </div>
  )
}

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
        const response = await fetch("/api/featured-projects")

        if (!response.ok) {
          setState({
            loading: false,
            error: "unable to load featured creations right now.",
            projects: [],
          })
          return
        }

        const data = await response.json()
        setState({
          loading: false,
          error: null,
          projects: Array.isArray(data.projects) ? data.projects : [],
        })
      } catch (error) {
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
      const response = await fetch(`/api/projects/${projectId}/fork`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        return
      }

      if (data?.project?.id) {
        sessionStorage.setItem("chromie_current_project_id", data.project.id)
        router.push(`/builder?project=${data.project.id}`)
      }
    } catch (error) {
      // Fork failed
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
              <Dialog key={project.id}>
                <article
                  className="group relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950/60 shadow-[0_18px_60px_rgba(15,23,42,0.7)] hover:-translate-y-1.5 hover:shadow-[0_24px_80px_rgba(15,23,42,0.9)] transition-all duration-300"
                >
                  {/* Hero area */}
                  <div className="relative h-52 bg-slate-900">
                    {project.demoVideoUrl ? (
                      <LazyVideoHero project={project} />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_0%_0%,rgba(148,163,184,0.35),transparent_55%),radial-gradient(circle_at_100%_0%,rgba(148,163,184,0.15),transparent_55%)]" />
                      </>
                    )}

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

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      {project.demoVideoUrl && (
                        <DialogTrigger asChild>
                          <button
                            type="button"
                            className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:border-slate-500 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </DialogTrigger>
                      )}

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

                {project.demoVideoUrl && (
                  <DialogContent className="max-w-3xl bg-slate-950 border-slate-800">
                    <DialogHeader className="mb-2">
                      <DialogTitle className="text-sm font-medium text-slate-100">
                        {(project.name || "featured project").toLowerCase()} demo
                      </DialogTitle>
                    </DialogHeader>
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-900">
                      {(() => {
                        const url = String(project.demoVideoUrl || "").trim()
                        const isYouTube = url.includes("youtube.com") || url.includes("youtu.be")
                        if (isYouTube) {
                          return (
                            <iframe
                              title={`${project.name || "featured project"} demo (large)`}
                              src={getYouTubeEmbedUrl(url, true)}
                              className="h-full w-full object-cover"
                              allow="autoplay; encrypted-media; picture-in-picture"
                              allowFullScreen
                            />
                          )
                        }
                        return (
                          <video
                            src={url}
                            className="h-full w-full object-cover"
                            autoPlay
                            muted
                            loop
                            controls
                            playsInline
                          />
                        )
                      })()}
                    </div>
                  </DialogContent>
                )}
              </Dialog>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

