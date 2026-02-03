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
  const [justifications, setJustifications] = useState({})
  const [copiedPermission, setCopiedPermission] = useState(null)
  const [error, setError] = useState(null)
  const [permissions, setPermissions] = useState([])

  // Extract permissions from project data
  useEffect(() => {
    if (projectData) {
      // In real implementation, this would parse manifest.json from project files
      // For now, we'll simulate with placeholder data
      const manifestPermissions = ["tabs", "storage", "activeTab"]
      setPermissions(manifestPermissions)

      // Initialize justifications object with empty strings or existing data
      const initialJustifications = {}
      manifestPermissions.forEach(perm => {
        const existing = generatedJustifications?.find(j => j.permission === perm)
        initialJustifications[perm] = existing?.justification || ""
      })
      setJustifications(initialJustifications)
    }
  }, [projectData, generatedJustifications])

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

      // Convert array response to object format
      const justificationsObj = {}
      data.justifications.forEach(item => {
        justificationsObj[item.permission] = item.justification
      })

      setJustifications(justificationsObj)
      onJustificationsGenerated(data.justifications)
      onComplete()
    } catch (err) {
      console.error("Error generating justifications:", err)
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async (permission) => {
    try {
      await navigator.clipboard.writeText(justifications[permission] || "")
      setCopiedPermission(permission)
      setTimeout(() => setCopiedPermission(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const updateJustification = (permission, newText) => {
    setJustifications(prev => ({
      ...prev,
      [permission]: newText
    }))
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
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
        <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Extension Permissions
        </h4>
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
        <p className="text-xs text-zinc-500 mt-2">
          Chrome Web Store requires justifications for each permission
        </p>
      </div>

      {/* Generate button and controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-400">Permission Justifications</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="text-zinc-400 hover:text-white"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-1" />
              Generate with AI
            </>
          )}
        </Button>
      </div>

      {/* Justification textareas - always visible */}
      <div className="space-y-4">
        {permissions.map((permission) => {
          const charCount = justifications[permission]?.length || 0
          const charLimit = 1000
          const isOverLimit = charCount > charLimit
          const isNearLimit = charCount > charLimit - 50 && charCount <= charLimit

          return (
            <div key={permission}>
              <textarea
                value={justifications[permission] || ""}
                onChange={(e) => updateJustification(permission, e.target.value)}
                className={`w-full bg-zinc-900 border rounded-lg p-4 min-h-[100px] resize-y focus:outline-none focus:ring-2 ${
                  isOverLimit
                    ? "border-red-500 focus:ring-red-500"
                    : isNearLimit
                    ? "border-yellow-500 focus:ring-yellow-500"
                    : "border-zinc-800 focus:ring-indigo-500"
                }`}
                placeholder={`${permission} justification*`}
                disabled={isGenerating}
              />
              <div className="flex items-center justify-between mt-1 px-1">
                <span className="text-xs text-zinc-500">{permission}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs ${
                      isOverLimit
                        ? "text-red-500"
                        : isNearLimit
                        ? "text-yellow-500"
                        : "text-zinc-500"
                    }`}
                  >
                    {charCount}/{charLimit}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopy(permission)}
                    className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
                  >
                    {copiedPermission === permission ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tips */}
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

      {/* Error message */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}
