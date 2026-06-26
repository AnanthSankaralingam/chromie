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
            Upload PDFs from past proposals or solicitations for future matching.
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
            className="flex items-center gap-3 border border-white/10 px-3 py-2.5 text-sm"
          >
            <FileText className="h-4 w-4 shrink-0 text-zinc-500" />
            <button
              type="button"
              onClick={() => onDownload(pdf.id)}
              className="min-w-0 flex-1 truncate text-left text-zinc-200 hover:text-white"
            >
              {pdf.filename}
            </button>
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
        ))}
        <p className="text-xs text-zinc-600">PDF only, max 15 MB each.</p>
      </CardContent>
    </Card>
  )
}
