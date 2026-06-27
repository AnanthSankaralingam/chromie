"use client"

import { BTN_OUTLINE, CARD_CLASS } from "@/components/ui/app-dashboard-theme"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Trash2, Upload } from "lucide-react"

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function processingLabel(status) {
  if (status === "processed") return "Processed"
  if (status === "failed") return "Needs review"
  return "Processing"
}

function processingTone(status) {
  if (status === "processed") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  if (status === "failed") return "border-amber-500/30 bg-amber-500/10 text-amber-300"
  return "border-sky-500/30 bg-sky-500/10 text-sky-300"
}

export default function PastRfpSection({
  fileInputRef,
  pastRfpPdfs,
  uploading,
  deletingId,
  onUploadClick,
  onFileChange,
  onDownload,
  onDelete,
}) {
  return (
    <Card className={`mt-8 ${CARD_CLASS}`}>
      <CardHeader className="flex flex-row items-center justify-between border-b border-white/10 pb-4">
        <div>
          <CardTitle className="text-base font-bold text-white">Past RFPs</CardTitle>
          <CardDescription className="text-zinc-400">
            Upload completed proposal or solicitation PDFs to influence future fit scoring.
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={BTN_OUTLINE}
          disabled={uploading}
          onClick={onUploadClick}
        >
          <Upload className="mr-1 h-3 w-3" />
          {uploading ? "Uploading…" : "Upload PDF"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={onFileChange}
        />
      </CardHeader>
      <CardContent className="space-y-3 pt-6">
        {pastRfpPdfs.length === 0 && (
          <p className="text-sm text-zinc-500">No PDFs uploaded yet.</p>
        )}
        {pastRfpPdfs.map((pdf) => (
          <div
            key={pdf.id}
            className="border border-white/10 px-3 py-2.5 text-sm"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 shrink-0 text-zinc-500" />
              <button
                type="button"
                onClick={() => onDownload(pdf.id)}
                className="min-w-0 flex-1 truncate text-left text-zinc-200 hover:text-white"
              >
                {pdf.filename}
              </button>
              <span
                className={`shrink-0 border px-2 py-0.5 text-[11px] font-medium ${processingTone(pdf.processing_status)}`}
              >
                {processingLabel(pdf.processing_status)}
              </span>
              <span className="shrink-0 text-xs text-zinc-500">{formatBytes(pdf.size_bytes)}</span>
              <button
                type="button"
                disabled={deletingId === pdf.id}
                onClick={() => onDelete(pdf.id)}
                className="shrink-0 text-zinc-500 hover:text-red-400 disabled:opacity-40"
                aria-label={`Delete ${pdf.filename}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {pdf.fit_context || pdf.summary ? (
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-zinc-400">
                {pdf.fit_context || pdf.summary}
              </p>
            ) : pdf.processing_error ? (
              <p className="mt-2 text-xs text-amber-300">{pdf.processing_error}</p>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">Extracting profile-matching signals…</p>
            )}
          </div>
        ))}
        <p className="text-xs text-zinc-600">
          PDF only, max 15 MB each. Processed RFPs are summarized into your company profile context.
        </p>
      </CardContent>
    </Card>
  )
}
