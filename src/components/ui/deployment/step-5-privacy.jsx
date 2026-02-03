"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Copy, ExternalLink, CheckCircle2, FileText, RefreshCw, Eye, Edit } from "lucide-react"
import { parseMarkdown } from "@/components/ui/chat/markdown-parser"

export default function Step5Privacy({
  projectId,
  projectData,
  existingSlug,
  onPolicyGenerated,
  onComplete,
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [policySlug, setPolicySlug] = useState(existingSlug || "")
  const [policyText, setPolicyText] = useState("")
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [error, setError] = useState(null)
  const [hasExistingPolicy, setHasExistingPolicy] = useState(false)
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  // Fetch existing policy on mount
  useEffect(() => {
    const fetchExistingPolicy = async () => {
      try {
        // Fetch from privacy policy API to get both slug and content
        const response = await fetch(`/api/projects/${projectId}/privacy-policy`)
        if (response.ok) {
          const data = await response.json()
          if (data.privacy_slug) {
            setPolicySlug(data.privacy_slug)
            setHasExistingPolicy(true)
          }
          if (data.privacy_policy) {
            setPolicyText(data.privacy_policy)
          }
        }
      } catch (err) {
        console.error("Error loading existing policy:", err)
      }
    }

    if (projectId) {
      fetchExistingPolicy()
    }
  }, [projectId])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      // Generate privacy policy
      const generateResponse = await fetch(`/api/projects/${projectId}/privacy-policy/generate`, {
        method: "POST",
      })

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json()
        throw new Error(errorData.error || "Failed to generate privacy policy")
      }

      const generateData = await generateResponse.json()
      setPolicyText(generateData.privacy_policy)

      // Auto-save to get slug
      setIsSaving(true)
      const saveResponse = await fetch(`/api/projects/${projectId}/privacy-policy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privacy_policy: generateData.privacy_policy,
        }),
      })

      if (!saveResponse.ok) {
        throw new Error("Failed to save privacy policy")
      }

      const saveData = await saveResponse.json()
      const slug = saveData.privacy_slug || saveData.slug
      setPolicySlug(slug)
      setHasExistingPolicy(true)
      onPolicyGenerated(slug, generateData.privacy_policy)
      onComplete()
    } catch (err) {
      console.error("Error generating/saving privacy policy:", err)
      setError(err.message)
    } finally {
      setIsGenerating(false)
      setIsSaving(false)
    }
  }

  const handleCopyUrl = async () => {
    const url = `https://chromie.dev/privacy-policy/${policySlug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch (err) {
      console.error("Failed to copy URL:", err)
    }
  }

  const handleViewPolicy = () => {
    window.open(`https://chromie.dev/privacy-policy/${policySlug}`, "_blank")
  }

  const handleSavePolicy = async () => {
    if (!policyText || policyText.trim().length < 100) {
      setError("Privacy policy must be at least 100 characters")
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const saveResponse = await fetch(`/api/projects/${projectId}/privacy-policy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privacy_policy: policyText,
        }),
      })

      if (!saveResponse.ok) {
        throw new Error("Failed to save privacy policy")
      }

      const saveData = await saveResponse.json()
      const slug = saveData.privacy_slug || saveData.slug
      setPolicySlug(slug)
      setHasExistingPolicy(true)
      onPolicyGenerated(slug, policyText)
      onComplete()
    } catch (err) {
      console.error("Error saving privacy policy:", err)
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const policyUrl = policySlug ? `https://chromie.dev/privacy-policy/${policySlug}` : ""

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
        <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Privacy Policy Required
        </h4>
        <p className="text-sm text-zinc-400">
          Chrome Web Store requires a privacy policy URL for extensions that handle user data. We'll
          generate one for you and host it at a permanent URL you can use in your listing.
        </p>
      </div>

      {/* Generate/Regenerate controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-400">Privacy Policy</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleGenerate}
          disabled={isGenerating || isSaving}
          className="text-zinc-400 hover:text-white"
        >
          {isGenerating || isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              {isGenerating ? "Generating..." : "Saving..."}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-1" />
              {hasExistingPolicy ? "Regenerate with AI" : "Generate with AI"}
            </>
          )}
        </Button>
      </div>

      {/* Policy URL (if exists) */}
      {hasExistingPolicy && policySlug && (
        <div>
          <div className="flex items-center gap-2 text-green-500 mb-3">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-semibold">Privacy Policy URL Generated</span>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <code className="text-sm text-indigo-400 break-all flex-1">{policyUrl}</code>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyUrl}
                  className="text-zinc-400 hover:text-white flex-shrink-0 h-8 w-8 p-0"
                >
                  {copiedUrl ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleViewPolicy}
                  className="text-zinc-400 hover:text-white flex-shrink-0 h-8 w-8 p-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Policy editor/preview */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-zinc-500">
            {!policyText
              ? "Click 'Generate with AI' to create a privacy policy or write your own in markdown"
              : isPreviewMode
              ? "Previewing rendered markdown"
              : "Editing privacy policy markdown"}
          </p>
          <div className="flex items-center gap-2">
            {policyText && (
              <>
                <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsPreviewMode(false)}
                    className={`rounded-r-none ${
                      !isPreviewMode
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsPreviewMode(true)}
                    className={`rounded-l-none border-l border-zinc-800 ${
                      isPreviewMode
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Preview
                  </Button>
                </div>
                {!isPreviewMode && (
                  <Button
                    size="sm"
                    onClick={handleSavePolicy}
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Edit Mode - Markdown Editor */}
        {!isPreviewMode && (
          <>
            <textarea
              value={policyText}
              onChange={(e) => setPolicyText(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-4 min-h-[400px] resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              placeholder="# Privacy Policy&#10;&#10;Write your privacy policy in markdown format...&#10;&#10;## Information We Collect&#10;&#10;## How We Use Your Information&#10;&#10;..."
              disabled={isGenerating || isSaving}
            />
            <p className="text-xs text-zinc-500 mt-2">
              {policyText.length} characters • Minimum 100 characters required
            </p>
          </>
        )}

        {/* Preview Mode - Rendered Markdown */}
        {isPreviewMode && policyText && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 min-h-[400px] max-h-[600px] overflow-y-auto">
            <div
              className="prose prose-invert prose-sm max-w-none [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:space-y-1 [&_ul]:my-3 [&_li]:ml-4 [&_li]:mb-1"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(policyText) }}
            />
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-400">{error}</p>
          {error.includes("paid") && (
            <p className="text-xs text-zinc-400 mt-2">
              Privacy policy generation requires a paid plan. Please upgrade your account.
            </p>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h4 className="font-semibold mb-2 text-sm">Paste this URL in the "Privacy Policy" field in the Developer Dashboard.</h4>
      </div>
    </div>
  )
}
