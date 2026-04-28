import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowRight, Chrome, Eye } from "lucide-react"
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
  pagination: null,
}

export default function FeaturedCreationsSection({
  limit = null,
  showSeeMore = false,
  sectionId = "featured-creations",
  cardVariant = "default",
  enablePagination = false,
}) {
  const [state, setState] = useState(INITIAL_STATE)
  const [page, setPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loadMoreRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    const fetchFeaturedProjects = async () => {
      try {
        if (enablePagination && page > 1) {
          setIsLoadingMore(true)
        } else {
          setState((prev) => ({ ...prev, loading: true }))
        }

        const queryParams = new URLSearchParams()
        if (Number.isFinite(limit) && limit > 0) queryParams.set("limit", String(limit))
        if (enablePagination) queryParams.set("page", String(page))
        const query = queryParams.toString()
        const response = await fetch(`/api/featured-projects${query ? `?${query}` : ""}`)

        if (!response.ok) {
          setState({
            loading: false,
            error: "unable to load featured creations right now.",
            projects: [],
            pagination: null,
          })
          return
        }

        const data = await response.json()
        setState((prev) => {
          const nextProjects = Array.isArray(data.projects) ? data.projects : []
          const mergedProjects =
            enablePagination && page > 1
              ? [
                  ...prev.projects,
                  ...nextProjects.filter(
                    (nextProject) => !prev.projects.some((existing) => existing.id === nextProject.id)
                  ),
                ]
              : nextProjects

          return {
            loading: false,
            error: null,
            projects: mergedProjects,
            pagination: data.pagination ?? null,
          }
        })
      } catch (error) {
        setState({
          loading: false,
          error: "unexpected error loading featured creations.",
          projects: [],
          pagination: null,
        })
      } finally {
        setIsLoadingMore(false)
      }
    }

    fetchFeaturedProjects()
  }, [enablePagination, limit, page])

  useEffect(() => {
    if (!enablePagination) return
    if (!state.pagination?.hasNextPage) return
    const sentinel = loadMoreRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoadingMore && !state.loading) {
          setPage((prev) => prev + 1)
        }
      },
      { rootMargin: "250px" }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [enablePagination, isLoadingMore, state.loading, state.pagination?.hasNextPage])

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
  const useLargeCards = cardVariant === "large"

  return (
    <section id={sectionId} className="relative z-10 w-full">
      <div className="max-w-6xl mx-auto px-6 pt-6 pb-16 md:pt-8 md:pb-20">
        {/* Header */}
        <div className="text-center mb-10 md:mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-3">
            gallery
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
            featured creations
          </h2>
          <p className="text-sm md:text-base text-zinc-400 max-w-xl mx-auto">
            discover extensions built with chromie. curated projects from teams, founders, and
            builders shipping in the browser.
          </p>
        </div>

        {/* Content */}
        {state.loading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-white/30 animate-spin" />
          </div>
        ) : state.error ? (
          <div className="flex flex-col items-center justify-center py-8 text-sm text-zinc-400">
            <p>{state.error}</p>
          </div>
        ) : visibleProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-sm text-zinc-400">
            <p>no featured creations yet.</p>
            <p className="mt-1 text-xs text-zinc-600">
              add project IDs to the <code className="text-xs text-zinc-400">featured_projects</code>{" "}
              table in supabase to populate this section.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap justify-center gap-6">
              {visibleProjects.map((project) => (
                <div
                  key={project.id}
                  className={cn(
                    "min-w-0 w-full",
                    useLargeCards
                      ? "max-w-xl md:w-[calc((100%-1.5rem)/2)] md:max-w-none"
                      : "max-w-md",
                    !useLargeCards &&
                      visibleProjects.length > 1 &&
                      "md:w-[calc((100%-1.5rem)/2)] md:max-w-none lg:w-[calc((100%-3rem)/3)]"
                  )}
                >
                  <Dialog>
                    <article
                      className="group relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1117] hover:border-white/[0.14] transition-all duration-200"
                    >
                  {/* Hero area */}
                  <div className={cn("relative bg-slate-900", useLargeCards ? "h-60" : "h-52")}>
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
                  <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-xs font-medium text-zinc-100">
                        {project.name?.charAt(0)?.toLowerCase() ?? "p"}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-zinc-200">
                          {(project.name || "chromie project")?.toLowerCase()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-zinc-600">
                      {project.chromeWebStoreUrl && (
                        <a
                          href={project.chromeWebStoreUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-300 hover:bg-white/[0.08] hover:border-white/20 transition-colors"
                          aria-label={`Open ${project.name || "project"} on Chrome Web Store`}
                          title="view on chrome web store"
                        >
                          <Chrome className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {project.demoVideoUrl && (
                        <DialogTrigger asChild>
                          <button
                            type="button"
                            className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-300 hover:bg-white/[0.08] hover:border-white/20 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </DialogTrigger>
                      )}

                      {project.isPublic && (
                        <Button
                          size="sm"
                          variant="default"
                          className="rounded-full bg-white text-[#080a0f] hover:bg-zinc-100 px-4 py-1.5 text-xs font-medium"
                          onClick={() => handleForkProject(project.id)}
                        >
                          fork project
                        </Button>
                      )}
                    </div>
                  </div>
                  </article>

                  {project.demoVideoUrl && (
                    <DialogContent className="max-w-3xl bg-[#0f1117] border-white/[0.08]">
                      <DialogHeader className="mb-2">
                        <DialogTitle className="text-sm font-medium text-zinc-200">
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
                </div>
              ))}
            </div>
            {showSeeMore && (
              <div className="mt-10 text-center">
                <Link
                  href="/gallery"
                  className="group inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors duration-200"
                >
                  <span className="text-base font-medium">see more</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
              </div>
            )}
            {enablePagination && (
              <div ref={loadMoreRef} className="mt-10 flex items-center justify-center">
                {isLoadingMore && (
                  <div className="h-7 w-7 rounded-full border-2 border-white/10 border-t-white/30 animate-spin" />
                )}
                {!state.pagination?.hasNextPage && (
                  <span className="text-xs text-zinc-600">you reached the end</span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

