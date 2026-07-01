"use client"

import {
  CheckCircle2,
  Clipboard,
  Clock3,
  FileText,
  Loader2,
  MonitorUp,
  Radio,
  RotateCw,
  Save,
  Square,
} from "lucide-react"
import {
  BTN_OUTLINE,
  BTN_PRIMARY,
  CARD_CLASS,
  INPUT_CLASS,
  LABEL_CLASS,
  SECTION_LABEL,
} from "@/components/ui/app-dashboard-theme"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/forms-and-input/input"
import { Textarea } from "@/components/ui/forms-and-input/textarea"

function formatTimer(seconds) {
  const safeSeconds = Math.max(0, seconds)
  const minutes = Math.floor(safeSeconds / 60)
  const rest = safeSeconds % 60
  return `${minutes}:${String(rest).padStart(2, "0")}`
}

function sessionStatusLabel(status) {
  if (status === "starting") return "Starting browser"
  if (status === "recording") return "Recording"
  if (status === "finishing") return "Finishing session"
  if (status === "complete") return "Session complete"
  return "Ready"
}

export function NewAutomationHero() {
  return (
    <section className="max-w-3xl">
      <p className={SECTION_LABEL}>Self-serve builder</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Record the workflow. Describe the outcome.
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
        Start a short browser session, perform the steps you want automated, then
        finish the recording to inspect the captured telemetry.
      </p>
    </section>
  )
}

export function RecordingDraftCard({
  canRecord,
  description,
  error,
  isActive,
  liveUrl,
  onDescriptionChange,
  onFinish,
  onSignIn,
  onStart,
  remainingSeconds,
  sessionId,
  status,
  user,
}) {
  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="border-b border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-white">New automation draft</CardTitle>
          </div>
          <div className="flex items-center gap-2 border border-white/10 px-3 py-2">
            <Clock3 className="h-4 w-4 text-cyan-300" aria-hidden />
            <span className="font-mono text-sm text-white">{formatTimer(remainingSeconds)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <SessionControls
          canRecord={canRecord}
          isActive={isActive}
          onFinish={onFinish}
          onStart={onStart}
          sessionId={sessionId}
          status={status}
        />

        {error && (
          <div className="border border-red-400/30 bg-red-950/20 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {!user && <SignInPrompt onSignIn={onSignIn} />}
        <LiveBrowserFrame isActive={isActive} liveUrl={liveUrl} />
        <WorkflowDescription
          description={description}
          disabled={isActive || status === "finishing"}
          onChange={onDescriptionChange}
        />
      </CardContent>
    </Card>
  )
}

function SessionControls({ canRecord, isActive, onFinish, onStart, sessionId, status }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center border border-white/10 bg-black">
          <Radio className={`h-4 w-4 ${isActive ? "text-red-400" : "text-zinc-500"}`} aria-hidden />
        </span>
        <div>
          <p className="text-sm font-medium text-white">{sessionStatusLabel(status)}</p>
          <p className="text-xs text-zinc-500">
            {sessionId ? `Session ${sessionId}` : "No active session"}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className={BTN_PRIMARY} disabled={!canRecord} onClick={onStart}>
          <MonitorUp className="mr-2 h-4 w-4" aria-hidden />
          Record
        </Button>
        <Button
          type="button"
          className={BTN_OUTLINE}
          disabled={!isActive || status === "finishing"}
          onClick={onFinish}
        >
          <Square className="mr-2 h-4 w-4" aria-hidden />
          Done
        </Button>
      </div>
    </div>
  )
}

function SignInPrompt({ onSignIn }) {
  return (
    <div className="border border-amber-300/20 bg-amber-300/10 px-3 py-3 text-sm text-amber-100">
      Sign in before starting a Browserbase recording session.
      <Button
        type="button"
        className={`ml-0 mt-3 ${BTN_OUTLINE} sm:ml-3 sm:mt-0`}
        onClick={onSignIn}
      >
        Sign in
      </Button>
    </div>
  )
}

function LiveBrowserFrame({ isActive, liveUrl }) {
  if (!isActive && !liveUrl) return null

  return (
    <div className="overflow-hidden border border-white/10 bg-black">
      {liveUrl ? (
        <iframe
          src={liveUrl}
          title="New automation recording session"
          className="h-[min(72vh,780px)] min-h-[560px] w-full bg-black"
          sandbox="allow-same-origin allow-scripts"
          allow="clipboard-read; clipboard-write"
        />
      ) : (
        <div className="flex h-32 items-center justify-center px-6 text-center">
          <p className="text-sm font-medium text-zinc-300">Preparing the live browser...</p>
        </div>
      )}
    </div>
  )
}

function WorkflowDescription({ description, disabled, onChange }) {
  return (
    <div>
      <label htmlFor="workflow-description" className={LABEL_CLASS}>
        Workflow description
      </label>
      <Textarea
        id="workflow-description"
        value={description}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Example: Log into our vendor portal, download yesterday's invoices, and summarize failed payments."
        className={`${INPUT_CLASS} min-h-24 resize-y px-3 py-3`}
        disabled={disabled}
      />
    </div>
  )
}

export function SaveAutomationCard({
  name,
  onNameChange,
  onSave,
  pagesVisited,
  activity,
  savedCompanyId,
  saveError,
  saveStatus,
}) {
  const isSaving = saveStatus === "saving"
  const isSaved = saveStatus === "saved"

  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-white">
          <Save className="h-4 w-4 text-cyan-300" aria-hidden />
          Save automation
        </CardTitle>
        <CardDescription className="mt-2 text-zinc-400">
          Save this recording to your automations. Teammates on your company
          domain will be able to access it too.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="automation-name" className={LABEL_CLASS}>
            Automation name
          </label>
          <Input
            id="automation-name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Download daily vendor invoices"
            className={`${INPUT_CLASS} px-3 py-2`}
            disabled={isSaving || isSaved}
          />
        </div>

        <div className="flex flex-wrap gap-3 font-mono text-[11px] text-zinc-600">
          <span>
            {pagesVisited.length} page{pagesVisited.length === 1 ? "" : "s"} navigated
          </span>
          <span>
            {activity.length} action{activity.length === 1 ? "" : "s"} captured
          </span>
        </div>

        {saveError && (
          <div className="border border-red-400/30 bg-red-950/20 px-3 py-2 text-sm text-red-200">
            {saveError}
          </div>
        )}

        {isSaved ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border border-emerald-400/30 bg-emerald-950/20 px-3 py-3 text-sm text-emerald-200">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {savedCompanyId
                ? `Saved and shared with everyone at ${savedCompanyId}.`
                : "Saved to your automations."}
            </span>
            <a href="/automations" className="underline hover:text-emerald-100">
              View automations
            </a>
          </div>
        ) : (
          <Button type="button" className={BTN_PRIMARY} disabled={isSaving} onClick={onSave}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="mr-2 h-4 w-4" aria-hidden />
            )}
            {isSaving ? "Saving..." : "Save automation"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function ActionTranscriptCard({
  activity,
  description,
  hasCompletedSession,
  logsMessage,
  onRetry,
  pagesVisited,
}) {
  const markdown = buildTranscriptMarkdown({ activity, description, pagesVisited })

  async function copyMarkdown() {
    if (!markdown || typeof navigator === "undefined" || !navigator.clipboard) return
    await navigator.clipboard.writeText(markdown)
  }

  return (
    <Card className={`mt-8 ${CARD_CLASS}`}>
      <CardHeader className="border-b border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold text-white">
              <FileText className="h-4 w-4 text-cyan-300" aria-hidden />
              Markdown transcript
            </CardTitle>
            <CardDescription className="mt-2 text-zinc-400">
              Copy the run as clean markdown for reviewing or generating an automation.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className={BTN_OUTLINE} disabled={!markdown} onClick={copyMarkdown}>
              <Clipboard className="mr-2 h-4 w-4" aria-hidden />
              Copy markdown
            </Button>
            {hasCompletedSession && (
              <Button type="button" className={BTN_OUTLINE} onClick={onRetry}>
                <RotateCw className="mr-2 h-4 w-4" aria-hidden />
                Retry transcript
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {logsMessage && <TranscriptMessage message={logsMessage} />}
        {markdown ? (
          <textarea
            readOnly
            value={markdown}
            className="min-h-[420px] w-full resize-y border border-white/10 bg-black p-4 font-mono text-xs leading-6 text-zinc-200 outline-none"
          />
        ) : (
          <div className="border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
            {hasCompletedSession
              ? "No action transcript returned yet."
              : "Record and finish a session to populate this area."}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TranscriptMessage({ message }) {
  return (
    <p className="border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
      {message}
    </p>
  )
}

function buildTranscriptMarkdown({ activity, description, pagesVisited }) {
  if (!activity.length && !description && !pagesVisited.length) return ""
  const lines = ["# Recorded workflow", ""]

  if (description) {
    lines.push("## User description", "", description.trim(), "")
  }

  if (pagesVisited.length) {
    lines.push("## Pages visited", "")
    pagesVisited.forEach((page, index) => {
      lines.push(`${index + 1}. ${page.url}`)
    })
    lines.push("")
  }

  lines.push("## Actions", "")
  if (!activity.length) {
    lines.push("_No actions captured._")
    return lines.join("\n")
  }

  activity.forEach((item, index) => {
    lines.push(`${index + 1}. ${markdownLineForAction(item)}`)
  })

  return lines.join("\n")
}

function markdownLineForAction(item) {
  if (item.type === "click") return markdownClickAction(item)
  if (item.type === "navigation") return `Navigated to ${item.url || item.detail}`
  if (item.type === "navigation-intent") return `Requested navigation to ${item.url || item.detail}`
  if (item.type === "input") return `${item.label}: ${item.detail}`
  if (item.type === "key") return `${item.label}${item.detail ? ` ${item.detail}` : ""}`
  if (item.type === "submit") return `Submitted ${item.detail}`
  if (item.type === "tab") return item.detail
  return `${item.label}: ${item.detail || item.type}`
}

function markdownClickAction(item) {
  const detail = item.detail || "page"
  const htmlIndex = detail.indexOf(" at <")
  if (htmlIndex === -1) return `Clicked ${detail}`

  const target = detail.slice(0, htmlIndex)
  const html = detail.slice(htmlIndex + 4)
  return [`Clicked ${target} at:`, "", "```html", html, "```"].join("\n")
}
