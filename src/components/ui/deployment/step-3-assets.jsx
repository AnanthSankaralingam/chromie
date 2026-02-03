"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Upload, Download, Image as ImageIcon, CheckCircle2, Sparkles, RefreshCw, AlertCircle, Pencil } from "lucide-react"

export default function Step3Assets({ projectId, projectData, onComplete }) {
  const [uploadedFile, setUploadedFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [resizedAssets, setResizedAssets] = useState([])
  const [error, setError] = useState(null)

  // AI Generation state
  const [generationMode, setGenerationMode] = useState("upload") // "upload" | "ai"
  const [aiPrompt, setAiPrompt] = useState("")
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiGeneratedImage, setAiGeneratedImage] = useState(null) // { base64, mimeType }
  const [aiAttempts, setAiAttempts] = useState(0)
  const [aiError, setAiError] = useState(null)

  // Edit with AI state (when user has AI-generated image and wants to refine it)
  const [aiEditInstruction, setAiEditInstruction] = useState("")
  const [isEditingAI, setIsEditingAI] = useState(false)
  const [aiEditError, setAiEditError] = useState(null)

  const MAX_AI_ATTEMPTS = 3
  const MAX_PROMPT_LENGTH = 500

  const requiredSizes = [
    { name: "Small Tile", width: 440, height: 280, required: true },
    { name: "Marquee", width: 1400, height: 560, required: false },
    { name: "Screenshot", width: 1280, height: 800, required: true },
  ]

  // Initialize AI prompt from project description
  useEffect(() => {
    if (projectData?.description) {
      setAiPrompt(`Create a promotional image for my Chrome extension based on this description: ${projectData.description}`)
    } else if (projectData?.name) {
      setAiPrompt(`Create a promotional image for a Chrome extension called "${projectData.name}". Make it visually appealing with modern design.`)
    }
  }, [projectData])

  const resizeImage = (file, targetWidth, targetHeight) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      img.onload = () => {
        canvas.width = targetWidth
        canvas.height = targetHeight

        // Draw image scaled to fit canvas
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error("Failed to create blob"))
            }
          },
          "image/png",
          0.95
        )
      }

      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = URL.createObjectURL(file)
    })
  }

  const resizeBase64Image = (base64Data, mimeType, targetWidth, targetHeight) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      img.onload = () => {
        canvas.width = targetWidth
        canvas.height = targetHeight

        // Draw image scaled to fit canvas
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error("Failed to create blob"))
            }
          },
          "image/png",
          0.95
        )
      }

      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = `data:${mimeType};base64,${base64Data}`
    })
  }

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    const file = files[0]
    setIsProcessing(true)
    setError(null)

    try {
      // Validate file type
      const validTypes = ["image/png", "image/jpeg", "image/jpg"]
      if (!validTypes.includes(file.type)) {
        throw new Error("Only PNG and JPG files are supported")
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error("File must be less than 5MB")
      }

      setUploadedFile(file)

      // Resize to all required sizes
      const resized = []
      for (const size of requiredSizes) {
        const blob = await resizeImage(file, size.width, size.height)
        const url = URL.createObjectURL(blob)
        resized.push({
          name: size.name,
          width: size.width,
          height: size.height,
          blob,
          url,
        })
      }

      setResizedAssets(resized)
      onComplete()
    } catch (err) {
      console.error("Processing error:", err)
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGenerateAI = async () => {
    if (aiAttempts >= MAX_AI_ATTEMPTS) {
      setAiError("Maximum generation attempts reached. Please upload an image manually.")
      return
    }

    if (!aiPrompt.trim()) {
      setAiError("Please enter a prompt")
      return
    }

    const trimmedPrompt = aiPrompt.trim()
    if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
      setAiError(`Prompt must be ${MAX_PROMPT_LENGTH} characters or less (${trimmedPrompt.length} entered)`)
      return
    }

    setIsGeneratingAI(true)
    setAiError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/assets/generate-brand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmedPrompt })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Insufficient credits. Please upgrade your plan to continue.")
        }
        throw new Error(data.error || "Failed to generate image")
      }

      if (data.success && data.image) {
        setAiGeneratedImage(data.image)
        setAiAttempts(prev => prev + 1)

        // Resize to all required sizes
        const resized = []
        for (const size of requiredSizes) {
          const blob = await resizeBase64Image(data.image.base64, data.image.mimeType, size.width, size.height)
          const url = URL.createObjectURL(blob)
          resized.push({
            name: size.name,
            width: size.width,
            height: size.height,
            blob,
            url,
          })
        }

        setResizedAssets(resized)
        onComplete()
      } else {
        throw new Error("No image returned from AI")
      }
    } catch (err) {
      console.error("AI generation error:", err)
      setAiError(err.message)
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const handleEditAI = async () => {
    if (!aiGeneratedImage?.base64) {
      setAiEditError("No generated image to edit. Regenerate first.")
      return
    }
    const trimmed = aiEditInstruction.trim()
    if (!trimmed) {
      setAiEditError("Describe what to change")
      return
    }
    if (trimmed.length > MAX_PROMPT_LENGTH) {
      setAiEditError(`Instruction must be ${MAX_PROMPT_LENGTH} characters or less (${trimmed.length} entered)`)
      return
    }

    setIsEditingAI(true)
    setAiEditError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/assets/edit-brand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: aiGeneratedImage.base64,
          imageMimeType: aiGeneratedImage.mimeType,
          editInstruction: trimmed,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Insufficient credits. Please upgrade your plan to continue.")
        }
        throw new Error(data.error || "Failed to edit image")
      }

      if (data.success && data.image) {
        setAiGeneratedImage(data.image)
        setAiEditInstruction("")

        // Revoke old resized URLs before replacing
        resizedAssets.forEach((asset) => URL.revokeObjectURL(asset.url))

        const resized = []
        for (const size of requiredSizes) {
          const blob = await resizeBase64Image(data.image.base64, data.image.mimeType, size.width, size.height)
          const url = URL.createObjectURL(blob)
          resized.push({
            name: size.name,
            width: size.width,
            height: size.height,
            blob,
            url,
          })
        }
        setResizedAssets(resized)
        onComplete()
      } else {
        throw new Error("No edited image returned from AI")
      }
    } catch (err) {
      console.error("AI edit error:", err)
      setAiEditError(err.message)
    } finally {
      setIsEditingAI(false)
    }
  }

  const handleDownloadAsset = (asset) => {
    const a = document.createElement("a")
    a.href = asset.url
    a.download = `${asset.name.toLowerCase().replace(/\s+/g, "-")}-${asset.width}x${asset.height}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleDownloadAll = async () => {
    for (const asset of resizedAssets) {
      handleDownloadAsset(asset)
      // Small delay between downloads
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }

  const resetAssets = () => {
    // Clean up URLs
    resizedAssets.forEach((asset) => URL.revokeObjectURL(asset.url))
    setUploadedFile(null)
    setResizedAssets([])
    setAiGeneratedImage(null)
  }

  const remainingAttempts = MAX_AI_ATTEMPTS - aiAttempts

  return (
    <div className="space-y-6">
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
        <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Chrome Web Store Image Requirements
        </h4>
        <ul className="text-sm text-zinc-400 space-y-1">
          {requiredSizes.map((size) => (
            <li key={size.name}>
              <strong>{size.name}:</strong> {size.width}x{size.height}px
              {size.required && <span className="text-red-400"> (Required)</span>}
            </li>
          ))}
        </ul>
        <p className="text-xs text-zinc-500 mt-2">
          Upload or generate one high-quality image and we'll resize it to all required dimensions
        </p>
      </div>

      {/* Mode toggle - only show when no assets created yet */}
      {resizedAssets.length === 0 && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant={generationMode === "upload" ? "default" : "outline"}
            onClick={() => setGenerationMode("upload")}
            className={generationMode === "upload" ? "bg-indigo-600 hover:bg-indigo-700" : "border-zinc-700 hover:bg-zinc-800"}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Image
          </Button>
          <Button
            type="button"
            variant={generationMode === "ai" ? "default" : "outline"}
            onClick={() => setGenerationMode("ai")}
            className={generationMode === "ai" ? "bg-indigo-600 hover:bg-indigo-700" : "border-zinc-700 hover:bg-zinc-800"}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate with AI
          </Button>
        </div>
      )}

      {/* Upload section */}
      {resizedAssets.length === 0 && generationMode === "upload" && (
        <div>
          <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors">
            <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-500" />
            <p className="text-lg font-semibold mb-2">Upload Promotional Image</p>
            <p className="text-sm text-zinc-400 mb-4">
              PNG or JPG, max 5MB. We'll create all required sizes for you.
            </p>
            <Button
              type="button"
              onClick={() => document.getElementById("asset-upload").click()}
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Choose Image"}
            </Button>
          </div>
          <input
            id="asset-upload"
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

      {/* AI Generation section */}
      {resizedAssets.length === 0 && generationMode === "ai" && (
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <label className="block text-sm font-medium mb-2">
              Describe the image you want to generate
            </label>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Create a promotional image for my Chrome extension..."
              maxLength={MAX_PROMPT_LENGTH}
              className="w-full h-32 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              disabled={isGeneratingAI}
            />
            <p className="text-xs text-zinc-500 mt-1">
              {aiPrompt.length}/{MAX_PROMPT_LENGTH} characters
              {aiPrompt.length > MAX_PROMPT_LENGTH && (
                <span className="text-red-400 ml-1">(over limit)</span>
              )}
            </p>
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-zinc-400">
                {remainingAttempts > 0 ? (
                  <span>{remainingAttempts} generation{remainingAttempts !== 1 ? 's' : ''} remaining</span>
                ) : (
                  <span className="text-red-400">No generations remaining</span>
                )}
              </p>
              <Button
                type="button"
                onClick={handleGenerateAI}
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={isGeneratingAI || remainingAttempts <= 0 || aiPrompt.trim().length > MAX_PROMPT_LENGTH}
              >
                {isGeneratingAI ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate ({remainingAttempts}/{MAX_AI_ATTEMPTS})
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* AI Error message */}
          {aiError && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-400">{aiError}</p>
                {aiError.includes("credits") && (
                  <a href="/settings/billing" className="text-sm text-indigo-400 hover:underline mt-1 inline-block">
                    Upgrade your plan
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Processing state */}
      {isProcessing && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-zinc-400">Resizing image to Chrome Web Store specifications...</p>
        </div>
      )}

      {/* AI Generation loading state */}
      {isGeneratingAI && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-zinc-400">Generating image with AI...</p>
          <p className="text-xs text-zinc-500 mt-2">This may take a few moments</p>
        </div>
      )}

      {/* Resized assets */}
      {resizedAssets.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Images Ready to Download
            </h3>
            <Button
              onClick={handleDownloadAll}
              variant="outline"
              className="border-zinc-700 hover:bg-zinc-800"
            >
              <Download className="w-4 h-4 mr-2" />
              Download All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resizedAssets.map((asset, index) => (
              <div key={index} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold">{asset.name}</p>
                    <p className="text-sm text-zinc-400">
                      {asset.width} x {asset.height}px
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleDownloadAsset(asset)}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
                <img
                  src={asset.url}
                  alt={asset.name}
                  className="w-full h-32 object-cover rounded border border-zinc-700"
                />
              </div>
            ))}
          </div>

          {/* Edit with AI - only when current assets are AI-generated */}
          {generationMode === "ai" && aiGeneratedImage && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Pencil className="w-4 h-4" />
                Edit with AI
              </h4>
              <p className="text-sm text-zinc-400">
                Describe what to change (e.g. &quot;Make the background darker&quot;, &quot;Add a blue accent&quot;).
              </p>
              <textarea
                value={aiEditInstruction}
                onChange={(e) => {
                  setAiEditInstruction(e.target.value)
                  if (aiEditError) setAiEditError(null)
                }}
                placeholder="What should change in this image?"
                maxLength={MAX_PROMPT_LENGTH}
                className="w-full h-24 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                disabled={isEditingAI}
              />
              <p className="text-xs text-zinc-500">
                {aiEditInstruction.length}/{MAX_PROMPT_LENGTH} characters
                {aiEditInstruction.trim().length > MAX_PROMPT_LENGTH && (
                  <span className="text-red-400 ml-1">(over limit)</span>
                )}
              </p>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={handleEditAI}
                  className="bg-indigo-600 hover:bg-indigo-700"
                  disabled={
                    isEditingAI ||
                    !aiEditInstruction.trim() ||
                    aiEditInstruction.trim().length > MAX_PROMPT_LENGTH
                  }
                >
                  {isEditingAI ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Editing...
                    </>
                  ) : (
                    <>
                      <Pencil className="w-4 h-4 mr-2" />
                      Apply edits
                    </>
                  )}
                </Button>
                {aiEditError && (
                  <p className="text-sm text-red-400">{aiEditError}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={resetAssets}
              variant="ghost"
              className="text-zinc-400 hover:text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Different Image
            </Button>
            {generationMode === "ai" && remainingAttempts > 0 && (
              <Button
                onClick={() => {
                  resetAssets()
                  setGenerationMode("ai")
                }}
                variant="ghost"
                className="text-zinc-400 hover:text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Regenerate with AI ({remainingAttempts} left)
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h4 className="font-semibold mb-2 text-sm">Tips for promotional images:</h4>
        <ul className="text-sm text-zinc-400 space-y-1 list-disc list-inside">
          <li>Use a high-quality screenshot or graphic (at least 1400x900px)</li>
          <li>Show your extension in action with clear UI elements</li>
          <li>Avoid small text that won't be readable when resized</li>
          <li>The small tile appears in search results (most important)</li>
        </ul>
      </div>
    </div>
  )
}
