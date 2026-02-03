"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, ExternalLink, CheckCircle2 } from "lucide-react"

export default function Step1Download({ projectId, onComplete }) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [hasDownloaded, setHasDownloaded] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/download`)
      if (!response.ok) throw new Error("Download failed")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `extension-${projectId}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setHasDownloaded(true)
      if (onComplete) onComplete()
    } catch (error) {
      console.error("Download error:", error)
      alert("Failed to download extension. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-semibold flex-shrink-0">
            1
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Download Your Extension</h3>
            <p className="text-zinc-400 mb-4">
              Download the packaged extension as a ZIP file. You'll upload this to the Chrome Web
              Store in the next step.
            </p>
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? "Downloading..." : "Download Extension"}
            </Button>
            {hasDownloaded && (
              <div className="flex items-center gap-2 mt-3 text-green-500">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm">Extension downloaded successfully</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-semibold flex-shrink-0">
            2
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Open Chrome Web Store Developer Dashboard</h3>
            <p className="text-zinc-400 mb-4">
              Navigate to the Chrome Web Store Developer Dashboard where you'll create a new item
              and upload your extension.
            </p>
            <Button
              onClick={() =>
                window.open("https://chrome.google.com/webstore/devconsole", "_blank")
              }
              variant="outline"
              className="border-zinc-700 hover:bg-zinc-800"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Developer Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h4 className="font-semibold mb-2 text-sm">What happens next?</h4>
        <p className="text-sm text-zinc-400">
          In the Developer Dashboard, click "New Item" and upload the ZIP file you just downloaded.
          The following steps will help you complete the required fields for your extension listing.
        </p>
      </div>
    </div>
  )
}
