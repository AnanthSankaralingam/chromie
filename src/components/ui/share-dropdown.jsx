"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/forms-and-input/dropdown-menu"
import { Share, Download, Link, Upload, ChevronDown, Github, GitFork, Lock, Shield } from "lucide-react"

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
  isPaid = false,
  isLoadingPaidPlan = true,
}) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Ensure boolean values
  const userIsPaid = Boolean(isPaid)
  const isStillLoading = Boolean(isLoadingPaidPlan)

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
    ? (isExportingToGithub ? "Syncing..." : "Sync to GitHub")
    : (isExportingToGithub ? "Exporting..." : "Export to GitHub")

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
          onClick={handleForkClick}
          disabled={isDisabled || isForkLoading}
          className="cursor-pointer text-slate-200 hover:bg-slate-700/50 hover:text-white focus:bg-slate-700/50 focus:text-white"
        >
          <GitFork className="h-4 w-4 mr-3 text-gray-400" />
          <span className="flex-1">
            {isForkLoading ? "Forking..." : "Fork Project"}
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handlePublishClick}
          disabled={isDisabled}
          className="cursor-pointer text-slate-200 hover:bg-slate-700/50 hover:text-white focus:bg-slate-700/50 focus:text-white"
        >
          <Upload className="h-4 w-4 mr-3 text-pink-400" />
          <span className="flex-1">Publish to Chrome Web Store</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => {
            if (!userIsPaid && !isStillLoading) {
              window.location.href = '/pricing'
              return
            }
            handleShareClick()
          }}
          disabled={isSharing || (!userIsPaid && !isStillLoading)}
          className={!userIsPaid && !isStillLoading ? "cursor-not-allowed text-slate-500 hover:bg-slate-800/30 hover:text-slate-500 focus:bg-slate-800/30 focus:text-slate-500" : "cursor-pointer text-slate-200 hover:bg-slate-700/50 hover:text-white focus:bg-slate-700/50 focus:text-white"}
        >
          {!userIsPaid && !isStillLoading ? (
            <Lock className="h-4 w-4 mr-3 text-slate-500" />
          ) : (
            <Link className="h-4 w-4 mr-3 text-green-400" />
          )}
          <span className="flex-1">
            {isSharing ? "Generating..." : !userIsPaid && !isStillLoading ? "Get Shareable Link (Paid)" : "Get Shareable Link"}
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            if (!userIsPaid && !isStillLoading) {
              window.location.href = '/pricing'
              return
            }
            handleExportToGithubClick()
          }}
          disabled={isDisabled || isExportingToGithub || (!userIsPaid && !isStillLoading)}
          className={!userIsPaid && !isStillLoading ? "cursor-not-allowed text-slate-500 hover:bg-slate-800/30 hover:text-slate-500 focus:bg-slate-800/30 focus:text-slate-500" : "cursor-pointer text-slate-200 hover:bg-slate-700/50 hover:text-white focus:bg-slate-700/50 focus:text-white"}
        >
          {!userIsPaid && !isStillLoading ? (
            <Lock className="h-4 w-4 mr-3 text-slate-500" />
          ) : (
            <Github className="h-4 w-4 mr-3 text-slate-200" />
          )}
          <span className="flex-1">
            {!userIsPaid && !isStillLoading ? `${githubLabel} (Paid)` : githubLabel}
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            if (!userIsPaid && !isStillLoading) {
              window.location.href = '/pricing'
              return
            }
            handlePrivacyPolicyClick()
          }}
          disabled={isDisabled || (!userIsPaid && !isStillLoading)}
          className={!userIsPaid && !isStillLoading ? "cursor-not-allowed text-slate-500 hover:bg-slate-800/30 hover:text-slate-500 focus:bg-slate-800/30 focus:text-slate-500" : "cursor-pointer text-slate-200 hover:bg-slate-700/50 hover:text-white focus:bg-slate-700/50 focus:text-white"}
        >
          {!userIsPaid && !isStillLoading ? (
            <Lock className="h-4 w-4 mr-3 text-slate-500" />
          ) : (
            <Shield className="h-4 w-4 mr-3 text-purple-400" />
          )}
          <span className="flex-1">
            {!userIsPaid && !isStillLoading ? "Privacy Policy (Paid)" : "Privacy Policy"}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
