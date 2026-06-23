"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Embeds a Browserbase session without dashboard login:
 * - running → Live View URL from API (iframe)
 * - finished → HLS replay proxied through Chromie (video + hls.js)
 */
export default function WorkflowSessionViewer({ automationId, runId, runStatus, poll = true }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const [mode, setMode] = useState(null)
  const [liveUrl, setLiveUrl] = useState(null)
  const [playlistUrl, setPlaylistUrl] = useState(null)
  const [pending, setPending] = useState(true)
  const [error, setError] = useState(null)

  const loadSessionView = useCallback(async () => {
    if (!automationId || !runId) return
    const res = await fetch(`/api/automations/${automationId}/runs/${runId}/session-view`)
    if (res.status === 202) {
      const json = await res.json().catch(() => ({}))
      setPending(true)
      setError(null)
      setMode(null)
      setLiveUrl(null)
      setPlaylistUrl(null)
      if (json.message) setError(json.message)
      return
    }
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setPending(false)
      setError(json.error || "Could not load session")
      return
    }
    const json = await res.json()
    setPending(false)
    setError(null)
    setMode(json.mode)
    if (json.mode === "live") {
      setLiveUrl(json.url)
      setPlaylistUrl(null)
    } else if (json.mode === "replay") {
      setPlaylistUrl(json.playlistUrl)
      setLiveUrl(null)
    }
  }, [automationId, runId])

  useEffect(() => {
    loadSessionView()
    if (!poll) return
    const interval = setInterval(loadSessionView, 3000)
    return () => clearInterval(interval)
  }, [loadSessionView, poll])

  useEffect(() => {
    if (mode !== "replay" || !playlistUrl || !videoRef.current) return

    const video = videoRef.current
    let cancelled = false

    async function attachPlayer() {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = playlistUrl
        return
      }

      const { default: Hls } = await import("hls.js")
      if (cancelled || !Hls.isSupported()) return
      const hls = new Hls()
      hlsRef.current = hls
      hls.loadSource(playlistUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setError("Replay playback failed. Try refreshing.")
        }
      })
    }

    attachPlayer()
    return () => {
      cancelled = true
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [mode, playlistUrl])

  if (pending && !liveUrl && !playlistUrl) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-sm text-zinc-500">
        {error || (runStatus === "running" ? "Connecting to live session…" : "Loading session recording…")}
      </div>
    )
  }

  if (error && !liveUrl && !playlistUrl) {
    return <p className="text-sm text-amber-400/90">{error}</p>
  }

  if (mode === "live" && liveUrl) {
    return (
      <iframe
        src={liveUrl}
        title="Workflow live session"
        className="w-full rounded-lg border border-zinc-800 bg-black"
        style={{ height: "min(70vh, 640px)" }}
        sandbox="allow-same-origin allow-scripts"
        allow="clipboard-read; clipboard-write"
      />
    )
  }

  if (mode === "replay" && playlistUrl) {
    return (
      <video
        ref={videoRef}
        controls
        playsInline
        className="w-full rounded-lg border border-zinc-800 bg-black"
        style={{ height: "min(70vh, 640px)" }}
      />
    )
  }

  return null
}
