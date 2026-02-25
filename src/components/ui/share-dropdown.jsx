"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/forms-and-input/dropdown-menu"
import { Share, Download, Link, Upload, ChevronDown, Github, GitFork, Shield } from "lucide-react"

export default function ShareDropdown({
  projectId,
  isDownloading = false,
  isSharing = false,
  isGenerating = false,
  isTestDisabled = false,
  onDownloadZip,
  onShareClick,
  onPublishClick,
  onExportToGithubClick,
  onForkClick,
  onPrivacyPolicyClick,
  isExportingToGithub = false,
  isForkLoading = false,
  hasGithubRepo = false,
  className = "",
  triggerId,
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

  const handleExportToGithubClick = () => {
    setIsOpen(false)
    onExportToGithubClick?.()
  }

  const handleForkClick = () => {
    setIsOpen(false)
    onForkClick?.()
  }

  const handlePrivacyPolicyClick = () => {
    setIsOpen(false)
    onPrivacyPolicyClick?.()
  }

  const isDisabled = !projectId || isGenerating || isTestDisabled

  const githubLabel = hasGithubRepo
    ? (isExportingToGithub ? "syncing..." : "sync to github")
    : (isExportingToGithub ? "exporting..." : "export to github")

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          id={triggerId}
          disabled={isDisabled}
          variant="ghost"
          className={`rounded-full font-medium bg-slate-900/60 text-slate-100 border border-slate-600/60 hover:bg-slate-900 hover:border-slate-500/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 px-4 py-2 ${className}`}
        >
          <Share className="h-4 w-4 mr-2" />
          share
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 rounded-xl bg-slate-900/95 border border-slate-600/60 backdrop-blur-sm shadow-xl shadow-black/20"
      >
        <DropdownMenuItem
          onClick={handleDownloadClick}
          disabled={isDownloading}
          className="cursor-pointer text-slate-200 hover:bg-slate-800/80 hover:text-slate-100 focus:bg-slate-800/80 focus:text-slate-100 rounded-lg"
        >
          <Download className="h-4 w-4 mr-3 text-slate-400" />
          <span className="flex-1">
            {isDownloading ? "downloading..." : "download extension"}
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleForkClick}
          disabled={isDisabled || isForkLoading}
          className="cursor-pointer text-slate-200 hover:bg-slate-800/80 hover:text-slate-100 focus:bg-slate-800/80 focus:text-slate-100 rounded-lg"
        >
          <GitFork className="h-4 w-4 mr-3 text-slate-400" />
          <span className="flex-1">
            {isForkLoading ? "forking..." : "fork project"}
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handlePublishClick}
          disabled={isDisabled}
          className="cursor-pointer text-slate-200 hover:bg-slate-800/80 hover:text-slate-100 focus:bg-slate-800/80 focus:text-slate-100 rounded-lg"
        >
          <Upload className="h-4 w-4 mr-3 text-slate-400" />
          <span className="flex-1">publish to chrome web store</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleShareClick}
          disabled={isSharing}
          className="cursor-pointer text-slate-200 hover:bg-slate-800/80 hover:text-slate-100 focus:bg-slate-800/80 focus:text-slate-100 rounded-lg"
        >
          <Link className="h-4 w-4 mr-3 text-slate-400" />
          <span className="flex-1">
            {isSharing ? "generating..." : "get shareable link"}
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleExportToGithubClick}
          disabled={isDisabled || isExportingToGithub}
          className="cursor-pointer text-slate-200 hover:bg-slate-800/80 hover:text-slate-100 focus:bg-slate-800/80 focus:text-slate-100 rounded-lg"
        >
          <Github className="h-4 w-4 mr-3 text-slate-400" />
          <span className="flex-1">{githubLabel}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handlePrivacyPolicyClick}
          disabled={isDisabled}
          className="cursor-pointer text-slate-200 hover:bg-slate-800/80 hover:text-slate-100 focus:bg-slate-800/80 focus:text-slate-100 rounded-lg"
        >
          <Shield className="h-4 w-4 mr-3 text-slate-400" />
          <span className="flex-1">privacy policy</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
