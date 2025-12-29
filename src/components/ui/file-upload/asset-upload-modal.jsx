"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/forms-and-input/label"
import { Input } from "@/components/ui/forms-and-input/input"
import { Upload, Image as ImageIcon, FileIcon, X, AlertCircle, CheckCircle2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/forms-and-input/select"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const CHROME_ICON_SIZES = [16, 32, 48, 64, 128, 256, 512]

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

export default function AssetUploadModal({ isOpen, onClose, onUpload, projectId }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [fileType, setFileType] = useState("icon")
  const [customPath, setCustomPath] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)
  const [iconDimensions, setIconDimensions] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setIconDimensions(null)

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

            // Check if square
            if (width !== height) {
              setError(`Icon must be square. Current size: ${width}x${height}px`)
            } else if (!CHROME_ICON_SIZES.includes(width)) {
              setError(`⚠️ Icon size ${width}x${height}px is not standard for Chrome extensions. Recommended: ${CHROME_ICON_SIZES.join(", ")}px`)
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

  const handleUpload = async () => {
    if (!selectedFile || !customPath) {
      setError("Please select a file and specify a path")
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      // Convert file to base64
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64Content = e.target.result.split(',')[1] // Remove data URL prefix

        const response = await fetch(`/api/projects/${projectId}/assets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_path: customPath,
            content_base64: base64Content,
            file_type: fileType,
            mime_type: selectedFile.type,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to upload file')
        }

        const data = await response.json()
        console.log('✅ File uploaded successfully:', data.asset)

        // Call onUpload callback with the uploaded asset
        if (onUpload) {
          onUpload(data.asset)
        }

        // Reset form and close
        handleClose()
      }
      reader.readAsDataURL(selectedFile)
    } catch (err) {
      console.error('Error uploading file:', err)
      setError(err.message)
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setFilePreview(null)
    setCustomPath("")
    setError(null)
    setIconDimensions(null)
    setIsUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onClose()
  }

  const handleFileTypeChange = (newType) => {
    setFileType(newType)
    // Reset file selection when changing type
    setSelectedFile(null)
    setFilePreview(null)
    setError(null)
    setIconDimensions(null)
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
              <p className="text-xs text-slate-400">
                Recommended sizes: {CHROME_ICON_SIZES.join(", ")}px (square)
              </p>
            )}
          </div>

          {/* File Path */}
          <div className="space-y-2">
            <Label className="text-white">File Path</Label>
            <Input
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder={fileType === "icon" ? "icons/custom-icon.png" : "assets/my-file.json"}
              className="bg-slate-800 border-slate-700 text-white"
            />
            <p className="text-xs text-slate-400">
              Path where the file will be accessible in your extension
            </p>
          </div>

          {/* File Upload */}
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
              disabled={!selectedFile || !customPath || isUploading || (error && !error.startsWith("⚠️"))}
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

