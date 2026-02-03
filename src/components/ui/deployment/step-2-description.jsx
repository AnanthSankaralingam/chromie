"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Copy, RefreshCw, CheckCircle2 } from "lucide-react"

export default function Step2Description({
  projectId,
  projectData,
  generatedDescription,
  onDescriptionGenerated,
  onComplete,
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [description, setDescription] = useState(generatedDescription || "")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)

  const manifestDescription = projectData?.name || ""
  const charLimit = 132

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/description/generate`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate description")
      }

      const data = await response.json()
      setDescription(data.description)
      onDescriptionGenerated(data.description)
      onComplete()
    } catch (err) {
      console.error("Error generating description:", err)
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(description)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const charCount = description.length
  const isOverLimit = charCount > charLimit
  const isNearLimit = charCount > charLimit - 20 && charCount <= charLimit

  return (
    <div className="space-y-6">
      {/* Current manifest description */}
      <div>
        <h3 className="text-sm font-semibold mb-2 text-zinc-400">
          Current Extension Name
        </h3>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm">{manifestDescription || "No name provided"}</p>
        </div>
      </div>

      {/* Generate button */}
      {!description && (
        <div>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-indigo-600 hover:bg-indigo-700 w-full"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate Description with AI"}
          </Button>
          <p className="text-xs text-zinc-500 mt-2">
            AI will analyze your extension code and create a compelling description
          </p>
        </div>
      )}

      {/* Generated/edited description */}
      {description && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-zinc-400">
                Chrome Web Store Description
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="text-zinc-400 hover:text-white"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${isGenerating ? "animate-spin" : ""}`} />
                  Regenerate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopy}
                  className="text-zinc-400 hover:text-white"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full bg-zinc-900 border rounded-lg p-4 min-h-[120px] resize-none focus:outline-none focus:ring-2 ${
                isOverLimit
                  ? "border-red-500 focus:ring-red-500"
                  : isNearLimit
                  ? "border-yellow-500 focus:ring-yellow-500"
                  : "border-zinc-800 focus:ring-indigo-500"
              }`}
              placeholder="Enter your extension description..."
            />

            <div className="flex items-center justify-between mt-2">
              <span
                className={`text-sm ${
                  isOverLimit
                    ? "text-red-500"
                    : isNearLimit
                    ? "text-yellow-500"
                    : "text-zinc-500"
                }`}
              >
                {charCount} / {charLimit} characters
              </span>
              {isOverLimit && (
                <span className="text-sm text-red-500">Exceeds Chrome Web Store limit</span>
              )}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-sm">Tips for a great description:</h4>
            <ul className="text-sm text-zinc-400 space-y-1 list-disc list-inside">
              <li>Start with the main benefit or value proposition</li>
              <li>Use active voice and action verbs</li>
              <li>Be specific about what the extension does</li>
              <li>Avoid technical jargon</li>
            </ul>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}
