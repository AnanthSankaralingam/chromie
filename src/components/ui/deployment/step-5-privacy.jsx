"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Copy, ExternalLink, CheckCircle2, FileText, RefreshCw } from "lucide-react"

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

  // Check for existing policy on mount
  useEffect(() => {
    if (existingSlug) {
      setHasExistingPolicy(true)
      setPolicySlug(existingSlug)
      loadExistingPolicy(existingSlug)
    }
  }, [existingSlug])

  const loadExistingPolicy = async (slug) => {
    try {
      const response = await fetch(`/api/privacy-policy/${slug}`)
      if (response.ok) {
        const data = await response.json()
        setPolicyText(data.policy_text || "")
      }
    } catch (err) {
      console.error("Error loading existing policy:", err)
    }
  }

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
      setPolicyText(generateData.policy)

      // Auto-save to get slug
      setIsSaving(true)
      const saveResponse = await fetch(`/api/projects/${projectId}/privacy-policy`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policy_text: generateData.policy,
        }),
      })

      if (!saveResponse.ok) {
        throw new Error("Failed to save privacy policy")
      }

      const saveData = await saveResponse.json()
      const slug = saveData.privacy_slug || saveData.slug
      setPolicySlug(slug)
      setHasExistingPolicy(true)
      onPolicyGenerated(slug, generateData.policy)
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
    const url = `https://chromie.com/privacy-policy/${policySlug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch (err) {
      console.error("Failed to copy URL:", err)
    }
  }

  const handleViewPolicy = () => {
    window.open(`https://chromie.com/privacy-policy/${policySlug}`, "_blank")
  }

  const policyUrl = policySlug ? `https://chromie.com/privacy-policy/${policySlug}` : ""

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

      {/* Generate button (if no existing policy) */}
      {!hasExistingPolicy && (
        <div>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 w-full"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isGenerating
              ? "Generating Privacy Policy..."
              : isSaving
              ? "Saving..."
              : "Generate Privacy Policy with AI"}
          </Button>
          <p className="text-xs text-zinc-500 mt-2">
            AI will analyze your extension and create a comprehensive privacy policy
          </p>
        </div>
      )}

      {/* Existing/generated policy display */}
      {hasExistingPolicy && policySlug && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-500 mb-4">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">Privacy Policy Ready</span>
          </div>

          {/* Policy URL */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-zinc-400">Hosted Privacy Policy URL</h3>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <code className="text-sm text-indigo-400 break-all">{policyUrl}</code>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyUrl}
                    className="text-zinc-400 hover:text-white flex-shrink-0"
                  >
                    {copiedUrl ? (
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleViewPolicy}
                    className="text-zinc-400 hover:text-white flex-shrink-0"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                Use this URL in the "Privacy Policy" field on the Chrome Web Store listing
              </p>
            </div>
          </div>

          {/* Policy preview */}
          {policyText && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-zinc-400">Policy Preview</h3>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-sans">
                    {policyText}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Regenerate option */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || isSaving}
              variant="outline"
              className="border-zinc-700 hover:bg-zinc-800"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
              {isGenerating ? "Regenerating..." : "Regenerate Privacy Policy"}
            </Button>
          </div>
        </div>
      )}

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
        <h4 className="font-semibold mb-2 text-sm">What to do with this URL:</h4>
        <ol className="text-sm text-zinc-400 space-y-1 list-decimal list-inside">
          <li>Copy the privacy policy URL above</li>
          <li>Open your Chrome Web Store Developer Dashboard</li>
          <li>Navigate to your extension's listing</li>
          <li>Paste the URL in the "Privacy Policy" field</li>
          <li>Save your changes</li>
        </ol>
      </div>
    </div>
  )
}
