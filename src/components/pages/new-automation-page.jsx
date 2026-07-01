"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "@/components/SessionProviderClient"
import AppBarDashboard from "@/components/ui/app-bars/app-bar-dashboard"
import { APP_PAGE } from "@/components/ui/app-dashboard-theme"
import { FilmGrain } from "@/components/ui/landing/landing-motion"
import AuthModal from "@/components/ui/modals/modal-auth"
import {
  ActionTranscriptCard,
  NewAutomationHero,
  RecordingDraftCard,
} from "./new-automation-page-components"

const SESSION_SECONDS = 300

export default function NewAutomationPage() {
  const { user } = useSession()
  const [showAuth, setShowAuth] = useState(false)
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState("idle")
  const [sessionId, setSessionId] = useState(null)
  const [liveUrl, setLiveUrl] = useState(null)
  const [expiresAt, setExpiresAt] = useState(null)
  const [remainingSeconds, setRemainingSeconds] = useState(SESSION_SECONDS)
  const [logs, setLogs] = useState([])
  const [activity, setActivity] = useState([])
  const [pagesVisited, setPagesVisited] = useState([])
  const [transcriptMeta, setTranscriptMeta] = useState(null)
  const [logsMessage, setLogsMessage] = useState(null)
  const [error, setError] = useState(null)
  const finishInFlightRef = useRef(false)

  const isActive = status === "starting" || status === "recording"
  const canRecord = Boolean(user) && !isActive && status !== "finishing"
  const hasCompletedSession = status === "complete"

  const applyTranscriptResponse = useCallback((json, fallbackMessage) => {
    setLogs(json.logs || [])
    setActivity(json.activity || [])
    setPagesVisited(json.pagesVisited || [])
    setTranscriptMeta({
      source: json.source || null,
      recorderStatus: json.recorderStatus || null,
      recorderError: json.recorderError || null,
      pageCount: json.pagesVisited?.length || 0,
      rawCount: json.rawCount || 0,
    })
    setLogsMessage(json.message || json.logsMessage || fallbackMessage(json))
  }, [])

  const finishSession = useCallback(async () => {
    if (!sessionId || finishInFlightRef.current) return
    finishInFlightRef.current = true
    setStatus("finishing")
    setError(null)

    try {
      const res = await fetch(`/api/new-automation-sessions/${sessionId}`, {
        method: "DELETE",
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error || "Failed to finish session")
      }
      applyTranscriptResponse(
        json,
        (payload) =>
          payload.activity?.length
            ? null
            : "Browserbase has not returned action events yet. Try Retry transcript in a few seconds.",
      )
      setLiveUrl(null)
      setExpiresAt(null)
      setRemainingSeconds(0)
      setStatus("complete")
    } catch (err) {
      setError(err.message || "Failed to finish session")
      setStatus("recording")
    } finally {
      finishInFlightRef.current = false
    }
  }, [applyTranscriptResponse, sessionId])

  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => {
      setRemainingSeconds((current) => {
        const next = expiresAt
          ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)
          : current - 1
        return Math.max(0, next)
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, isActive])

  useEffect(() => {
    if (isActive && remainingSeconds <= 0) {
      finishSession()
    }
  }, [finishSession, isActive, remainingSeconds])

  useEffect(() => {
    if (!isActive || liveUrl || !sessionId) return
    let cancelled = false
    let timeoutId = null

    async function pollLiveUrl() {
      try {
        const res = await fetch(`/api/new-automation-sessions/${sessionId}`)
        if (!res.ok || cancelled) return
        const json = await res.json()
        if (json.liveUrl) {
          setLiveUrl(json.liveUrl)
          setStatus("recording")
          return
        }
      } catch {
        // Keep polling; the session live URL can lag behind creation briefly.
      } finally {
        if (!cancelled) {
          timeoutId = window.setTimeout(pollLiveUrl, 2500)
        }
      }
    }

    pollLiveUrl()
    return () => {
      cancelled = true
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [isActive, liveUrl, sessionId])

  useEffect(() => {
    function warnBeforeUnload(event) {
      if (!isActive) return
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", warnBeforeUnload)
    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [isActive])

  async function startRecording() {
    if (!user) {
      setShowAuth(true)
      return
    }

    setStatus("starting")
    setError(null)
    setLogs([])
    setActivity([])
    setPagesVisited([])
    setTranscriptMeta(null)
    setLogsMessage(null)
    setLiveUrl(null)
    setSessionId(null)
    setRemainingSeconds(SESSION_SECONDS)

    try {
      const res = await fetch("/api/new-automation-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 401) setShowAuth(true)
        throw new Error(json.error || "Failed to start recording")
      }
      setSessionId(json.sessionId)
      setLiveUrl(json.liveUrl || null)
      setExpiresAt(json.expiresAt || null)
      setStatus(json.liveUrl ? "recording" : "starting")
    } catch (err) {
      setError(err.message || "Failed to start recording")
      setStatus("idle")
    }
  }

  async function retryLogs() {
    if (!sessionId) return
    setLogsMessage("Checking Browserbase action transcript again...")
    try {
      const res = await fetch(`/api/new-automation-sessions/${sessionId}?transcript=1`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok && res.status !== 202) {
        throw new Error(json.error || "Failed to load action transcript")
      }
      applyTranscriptResponse(
        json,
        (payload) =>
          payload.activity?.length
            ? null
            : "No action transcript returned yet. Try again in a few seconds.",
      )
    } catch (err) {
      setLogsMessage(err.message || "Action transcript is not available yet.")
    }
  }

  return (
    <div className={APP_PAGE}>
      <FilmGrain />
      <AppBarDashboard showOpportunities={false} />
      <main className="relative z-[1] mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="space-y-6">
          <NewAutomationHero />
          <RecordingDraftCard
            canRecord={canRecord}
            description={description}
            error={error}
            isActive={isActive}
            liveUrl={liveUrl}
            onDescriptionChange={setDescription}
            onFinish={finishSession}
            onSignIn={() => setShowAuth(true)}
            onStart={startRecording}
            remainingSeconds={remainingSeconds}
            sessionId={sessionId}
            status={status}
            user={user}
          />
        </div>

        <ActionTranscriptCard
          activity={activity}
          description={description}
          hasCompletedSession={hasCompletedSession}
          logs={logs}
          logsMessage={logsMessage}
          onRetry={retryLogs}
          pagesVisited={pagesVisited}
          transcriptMeta={transcriptMeta}
        />
      </main>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  )
}
