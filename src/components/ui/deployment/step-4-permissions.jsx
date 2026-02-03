"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Copy, RefreshCw, CheckCircle2, Shield } from "lucide-react"

export default function Step4Permissions({
  projectId,
  projectData,
  generatedJustifications,
  onJustificationsGenerated,
  onComplete,
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [justifications, setJustifications] = useState(generatedJustifications || [])
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [error, setError] = useState(null)
  const [permissions, setPermissions] = useState([])

  // Extract permissions from project data
  useEffect(() => {
    if (projectData) {
      // In real implementation, this would parse manifest.json from project files
      // For now, we'll simulate with placeholder data
      const manifestPermissions = ["tabs", "storage", "activeTab"]
      setPermissions(manifestPermissions)
    }
  }, [projectData])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/permissions/justify`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate justifications")
      }

      const data = await response.json()
      setJustifications(data.justifications)
      onJustificationsGenerated(data.justifications)
      onComplete()
    } catch (err) {
      console.error("Error generating justifications:", err)
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async (text, index = null) => {
    try {
      await navigator.clipboard.writeText(text)
      if (index !== null) {
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 2000)
      } else {
        setCopiedAll(true)
        setTimeout(() => setCopiedAll(false), 2000)
      }
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleCopyAll = () => {
    const allText = justifications
      .map((j) => `${j.permission}:\n${j.justification}`)
      .join("\n\n")
    handleCopy(allText)
  }

  const updateJustification = (index, newText) => {
    const updated = [...justifications]
    updated[index].justification = newText
    setJustifications(updated)
  }

  // No permissions case
  if (permissions.length === 0) {
    return (
      <div className="text-center py-8">
        <Shield className="w-16 h-16 mx-auto mb-4 text-green-500" />
        <h3 className="text-xl font-semibold mb-2">No Permissions Required</h3>
        <p className="text-zinc-400">
          Your extension doesn't request any special permissions. You can skip this step.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Extension info */}
      <div>
        <h3 className="text-sm font-semibold mb-2 text-zinc-400">Extension Permissions</h3>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm mb-2">Your extension requests the following permissions:</p>
          <div className="flex flex-wrap gap-2">
            {permissions.map((perm) => (
              <span
                key={perm}
                className="px-3 py-1 bg-indigo-900/30 border border-indigo-800 rounded-full text-sm"
              >
                {perm}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Generate button */}
      {justifications.length === 0 && (
        <div>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-indigo-600 hover:bg-indigo-700 w-full"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate Justifications with AI"}
          </Button>
          <p className="text-xs text-zinc-500 mt-2">
            AI will analyze your code and explain why each permission is needed
          </p>
        </div>
      )}

      {/* Generated justifications */}
      {justifications.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Permission Justifications</h3>
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
                onClick={handleCopyAll}
                className="text-zinc-400 hover:text-white"
              >
                {copiedAll ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Copied All!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy All
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {justifications.map((item, index) => (
              <div
                key={index}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-400" />
                    {item.permission}
                  </h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopy(item.justification, index)}
                    className="text-zinc-400 hover:text-white"
                  >
                    {copiedIndex === index ? (
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
                <textarea
                  value={item.justification}
                  onChange={(e) => updateJustification(index, e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Justification for this permission..."
                />
              </div>
            ))}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-sm">
              Tips for permission justifications:
            </h4>
            <ul className="text-sm text-zinc-400 space-y-1 list-disc list-inside">
              <li>Be specific about how the permission is used</li>
              <li>Explain the user benefit, not just the technical need</li>
              <li>Use simple, non-technical language</li>
              <li>Be transparent and honest about data usage</li>
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
