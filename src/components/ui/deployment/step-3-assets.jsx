"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, Download, Image as ImageIcon, CheckCircle2 } from "lucide-react"

export default function Step3Assets({ projectId, projectData, onComplete }) {
  const [uploadedFile, setUploadedFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [resizedAssets, setResizedAssets] = useState([])
  const [error, setError] = useState(null)

  const requiredSizes = [
    { name: "Small Tile", width: 440, height: 280, required: true },
    { name: "Marquee", width: 1400, height: 560, required: false },
    { name: "Screenshot", width: 1280, height: 800, required: true },
  ]

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
          Upload one high-quality image and we'll resize it to all required dimensions
        </p>
      </div>

      {/* Upload section */}
      {resizedAssets.length === 0 && (
        <div>
          <label htmlFor="asset-upload" className="block w-full cursor-pointer">
            <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors">
              <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-500" />
              <p className="text-lg font-semibold mb-2">Upload Promotional Image</p>
              <p className="text-sm text-zinc-400 mb-4">
                PNG or JPG, max 5MB. We'll create all required sizes for you.
              </p>
              <Button
                type="button"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Choose Image"}
              </Button>
            </div>
          </label>
          <input
            id="asset-upload"
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

      {/* Processing state */}
      {isProcessing && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-zinc-400">Resizing image to Chrome Web Store specifications...</p>
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

          <Button
            onClick={() => {
              // Clean up URLs
              resizedAssets.forEach((asset) => URL.revokeObjectURL(asset.url))
              setUploadedFile(null)
              setResizedAssets([])
            }}
            variant="ghost"
            className="text-zinc-400 hover:text-white"
          >
            Upload Different Image
          </Button>
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
