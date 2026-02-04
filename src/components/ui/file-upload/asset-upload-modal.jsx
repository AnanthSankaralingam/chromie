"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/forms-and-input/label"
import { Input } from "@/components/ui/forms-and-input/input"
import { Upload, Image as ImageIcon, FileIcon, AlertCircle, CheckCircle2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/forms-and-input/select"
import { INPUT_LIMITS } from "@/lib/constants"
import { Textarea } from "@/components/ui/forms-and-input/textarea"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const CHROME_ICON_SIZES = [16, 32, 48, 64, 128, 256, 512]
const MAX_PROMPT_LENGTH = 500

const ALLOWED_FILE_TYPES = {
  icon: {
    label: "Icon (PNG, JPG, SVG)",
    accept: "image/png,image/jpeg,image/svg+xml",
    mimeTypes: ["image/png", "image/jpeg", "image/svg+xml"]
  },
  asset: {
    label: "Asset (Images, JSON, CSS, HTML, TXT)",
    accept: "image/*,application/json,text/css,text/html,text/plain",
    mimeTypes: ["image/png", "image/jpeg", "image/svg+xml", "application/json", "text/css", "text/html", "text/plain"]
  }
}

export default function AssetUploadModal({
  isOpen,
  onClose,
  onUpload,
  projectId,
  defaultMode = "upload",
  defaultFileType = "icon"
}) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [fileType, setFileType] = useState("icon")
  const [sourceMode, setSourceMode] = useState("upload") // upload only (generate/library deprecated)
  const [customPath, setCustomPath] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)
  const [iconDimensions, setIconDimensions] = useState(null)
  const [isPrimaryIcon, setIsPrimaryIcon] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiGeneratedImage, setAiGeneratedImage] = useState(null)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiError, setAiError] = useState(null)
  const fileInputRef = useRef(null)

  const resetAiState = () => {
    setAiPrompt("")
    setAiGeneratedImage(null)
    setIsGeneratingAI(false)
    setAiError(null)
  }

  const resetUploadState = () => {
    setSelectedFile(null)
    setFilePreview(null)
    setCustomPath("")
    setError(null)
    setIconDimensions(null)
    setIsPrimaryIcon(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  useEffect(() => {
    if (!isOpen) return
    const nextFileType = defaultFileType === "asset" ? "asset" : "icon"
    // Deprecated: generate and library modes removed, only upload supported
    const nextMode = "upload"
    setFileType(nextFileType)
    setSourceMode("upload")
    resetUploadState()
    resetAiState()
  }, [defaultFileType, defaultMode, isOpen])

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setIconDimensions(null)
    setAiError(null)
    setAiGeneratedImage(null)

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`)
      return
    }

    // Validate MIME type
    const allowedTypes = ALLOWED_FILE_TYPES[fileType].mimeTypes
    if (!allowedTypes.includes(file.type)) {
      setError(`Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES[fileType].label}`)
      return
    }

    setSelectedFile(file)

    // Generate preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFilePreview(e.target.result)

        // For icons, validate dimensions
        if (fileType === "icon" && file.type === "image/png") {
          const img = new Image()
          img.onload = () => {
            const { width, height } = img
            setIconDimensions({ width, height })

            // Check if square (non-square icons can't be properly resized)
            if (width !== height) {
              setError(`Icon must be square. Current size: ${width}x${height}px`)
            } else {
              // Icon is square - it will be auto-resized to required sizes
              if (!CHROME_ICON_SIZES.includes(width)) {
                setError(`⚠️ Icon will be automatically resized to 16x16, 48x48, and 128x128 pixels`)
              }
            }
          }
          img.src = e.target.result
        }
      }
      reader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }

    // Auto-generate path if not set
    if (!customPath) {
      const fileName = file.name
      if (fileType === "icon") {
        setCustomPath(`icons/${fileName}`)
      } else {
        setCustomPath(`assets/${fileName}`)
      }
    }
  }

  const uploadAsset = async ({ base64Content, mimeType }) => {
    const response = await fetch(`/api/projects/${projectId}/assets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_path: customPath,
        content_base64: base64Content,
        file_type: fileType,
        mime_type: mimeType,
        is_primary_icon: fileType === "icon" ? isPrimaryIcon : false,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Failed to upload file")
    }

    const uploadedAssets = data.assets || (data.asset ? [data.asset] : [])

    if (uploadedAssets.length > 1) {
      console.log("✅ Files uploaded successfully (auto-resized):", uploadedAssets.map(a => a.file_path).join(", "))
    } else {
      console.log("✅ File uploaded successfully:", uploadedAssets[0]?.file_path)
    }

    if (onUpload) {
      uploadedAssets.forEach(asset => onUpload(asset))
    }

    handleClose()
  }

  const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64Content = e.target.result.split(",")[1]
      resolve(base64Content)
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })

  const handleUpload = async () => {
    if (!customPath) {
      setError("Please specify a file path")
      return
    }

    if (sourceMode === "upload" && !selectedFile) {
      setError("Please select a file")
      return
    }

    if (sourceMode === "generate" && !aiGeneratedImage?.base64) {
      setError("Generate an icon before uploading")
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      if (sourceMode === "generate") {
        await uploadAsset({
          base64Content: aiGeneratedImage.base64,
          mimeType: aiGeneratedImage.mimeType || "image/png",
        })
        return
      }

      const base64Content = await readFileAsBase64(selectedFile)
      await uploadAsset({
        base64Content,
        mimeType: selectedFile.type,
      })
    } catch (err) {
      console.error("Error uploading file:", err)
      setError(err.message)
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    resetUploadState()
    resetAiState()
    setSourceMode("upload")
    setIsUploading(false)
    onClose()
  }

  const handleFileTypeChange = (newType) => {
    setFileType(newType)
    setSourceMode("upload")
    // Reset file selection when changing type
    setSelectedFile(null)
    setFilePreview(null)
    setError(null)
    setIconDimensions(null)
    setIsPrimaryIcon(false)
    resetAiState()
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }

    // Update path prefix
    if (customPath) {
      const fileName = customPath.split('/').pop()
      setCustomPath(newType === "icon" ? `icons/${fileName}` : `assets/${fileName}`)
    }
  }


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Upload File</DialogTitle>
          <DialogDescription className="text-slate-400">
            Upload custom icons or assets for your extension
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Type Selection */}
          <div className="space-y-2">
            <Label className="text-white">File Type</Label>
            <Select value={fileType} onValueChange={handleFileTypeChange}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="icon" className="text-white">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    <span>Icon</span>
                  </div>
                </SelectItem>
                <SelectItem value="asset" className="text-white">
                  <div className="flex items-center gap-2">
                    <FileIcon className="h-4 w-4" />
                    <span>Other Asset</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {fileType === "icon" && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400">
                  Icons will be automatically resized to 16x16, 48x48, and 128x128 for Chrome extension compatibility
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrimaryIcon}
                    onChange={(e) => setIsPrimaryIcon(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-slate-900"
                  />
                  <span className="text-sm text-white">
                    Set as primary extension icon (updates manifest.json)
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* File Upload */}
          {sourceMode === "upload" && (
            <div className="space-y-2">
              <Label className="text-white">Select File</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
                {selectedFile && (
                  <span className="text-sm text-slate-400 truncate">
                    {selectedFile.name} ({Math.round(selectedFile.size / 1024)}KB)
                  </span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_FILE_TYPES[fileType].accept}
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}


          {/* File Path */}
          <div className="space-y-2">
            <Label className="text-white">File Path</Label>
            <Input
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value.slice(0, INPUT_LIMITS.FILE_PATH))}
              maxLength={INPUT_LIMITS.FILE_PATH}
              placeholder={fileType === "icon" ? "icons/custom-icon.png" : "assets/my-file.json"}
              className="bg-slate-800 border-slate-700 text-white"
            />
            <p className="text-xs text-slate-400">
              Path where the file will be accessible in your extension
            </p>
          </div>

          {/* Preview */}
          {filePreview && (
            <div className="space-y-2">
              <Label className="text-white">Preview</Label>
              <div className="border border-slate-700 rounded-lg p-4 bg-slate-800">
                <img 
                  src={filePreview} 
                  alt="Preview" 
                  className="max-h-48 mx-auto object-contain"
                />
                {iconDimensions && (
                  <div className="mt-2 text-center">
                    <p className="text-sm text-slate-400">
                      {iconDimensions.width}x{iconDimensions.height}px
                      {iconDimensions.width === iconDimensions.height && (
                        <CheckCircle2 className="inline-block ml-1 h-4 w-4 text-green-500" />
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          {aiError && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{aiError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={
                !customPath ||
                isUploading ||
                (sourceMode === "upload" && !selectedFile) ||
                (sourceMode === "generate" && !aiGeneratedImage) ||
                (error && !error.startsWith("⚠️")) ||
                Boolean(aiError)
              }
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
