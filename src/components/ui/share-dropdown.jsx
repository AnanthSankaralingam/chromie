"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/forms-and-input/dropdown-menu"
import { Share, Download, Link, Upload, ChevronDown } from "lucide-react"

export default function ShareDropdown({
  projectId,
  isDownloading = false,
  isSharing = false,
  isGenerating = false,
  isTestDisabled = false,
  onDownloadZip,
  onShareClick,
  onPublishClick,
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false)

  const handleDownloadClick = () => {
    setIsOpen(false)
    onDownloadZip?.()
  }

  const handleShareClick = () => {
    setIsOpen(false)
    onShareClick?.()
  }

  const handlePublishClick = () => {
    setIsOpen(false)
    onPublishClick?.()
  }

  const isDisabled = !projectId || isGenerating || isTestDisabled

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          disabled={isDisabled}
          className={`bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/25 transition-all duration-200 px-4 py-2 font-medium ${className}`}
        >
          <Share className="h-4 w-4 mr-2" />
          share
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-56 bg-slate-800/95 border-slate-700 backdrop-blur-sm"
      >
        <DropdownMenuItem 
          onClick={handleDownloadClick}
          disabled={isDownloading}
          className="cursor-pointer text-slate-200 hover:bg-slate-700/50 hover:text-white focus:bg-slate-700/50 focus:text-white"
        >
          <Download className="h-4 w-4 mr-3 text-orange-400" />
          <span className="flex-1">
            {isDownloading ? "Downloading..." : "Download Extension"}
          </span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={handleShareClick}
          disabled={isSharing}
          className="cursor-pointer text-slate-200 hover:bg-slate-700/50 hover:text-white focus:bg-slate-700/50 focus:text-white"
        >
          <Link className="h-4 w-4 mr-3 text-green-400" />
          <span className="flex-1">
            {isSharing ? "Generating..." : "Get Shareable Link"}
          </span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={handlePublishClick}
          disabled={isDisabled}
          className="cursor-pointer text-slate-200 hover:bg-slate-700/50 hover:text-white focus:bg-slate-700/50 focus:text-white"
        >
          <Upload className="h-4 w-4 mr-3 text-purple-400" />
          <span className="flex-1">Publish to Chrome Web Store</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
