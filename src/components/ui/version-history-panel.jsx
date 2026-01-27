"use client"

import { useState, useEffect } from "react"
import { History, Clock, ChevronDown, ChevronUp, RotateCcw, Trash2, X, Save, AlertCircle, Lock } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { usePaidPlan } from "@/hooks/use-paid-plan"

export default function VersionHistoryPanel({ projectId, isOpen, onClose, onVersionRestored }) {
  const { isPaid, isLoading: isLoadingPaidPlan } = usePaidPlan()
  // Ensure boolean values to prevent runtime errors
  const userIsPaid = Boolean(isPaid)
  const isStillLoading = Boolean(isLoadingPaidPlan)
  const [versions, setVersions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [expandedVersion, setExpandedVersion] = useState(null)
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [isReverting, setIsReverting] = useState(false)
  const [isCreatingVersion, setIsCreatingVersion] = useState(false)
  const [newVersionName, setNewVersionName] = useState("")
  const [newVersionDescription, setNewVersionDescription] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen && projectId) {
      loadVersions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, projectId])

  const loadVersions = async () => {
    if (!projectId) {
      console.log('No project ID, skipping version load')
      return
    }
    
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}/versions`)
      const data = await response.json()
      
      if (!response.ok) {
        // Check if it's a paid feature error
        if (response.status === 403 && data.error && data.error.includes('paid feature')) {
          throw new Error("Version history is a paid feature. Please upgrade to access this feature.")
        }
        // Check if it's a database table missing error
        if (data.error && (data.error.includes('does not exist') || data.error.includes('relation'))) {
          throw new Error("Version history feature not yet enabled. Please run the database migration first.")
        }
        throw new Error(data.error || "Failed to load versions")
      }
      
      setVersions(data.versions || [])
      console.log(`📋 Loaded ${data.versions?.length || 0} versions`)
    } catch (err) {
      console.error("Error loading versions:", err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateVersion = async () => {
    if (!newVersionName.trim()) {
      setError("Please enter a version name")
      return
    }

    setIsCreatingVersion(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}/versions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version_name: newVersionName.trim(),
          description: newVersionDescription.trim() || null,
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        // Check if it's a paid feature error
        if (response.status === 403 && data.error && data.error.includes('paid feature')) {
          throw new Error("Version history is a paid feature. Please upgrade to access this feature.")
        }
        // Check if it's a database function missing error
        if (data.error && (data.error.includes('Could not find the function') || data.error.includes('schema cache'))) {
          throw new Error("Version history feature not yet enabled. Please run the database migration first.")
        }
        throw new Error(data.error || "Failed to create version")
      }

      console.log(`✅ Created version: ${data.version.version_number}`)
      
      // Reset form and reload versions
      setNewVersionName("")
      setNewVersionDescription("")
      setShowCreateForm(false)
      await loadVersions()
    } catch (err) {
      console.error("Error creating version:", err)
      setError(err.message)
    } finally {
      setIsCreatingVersion(false)
    }
  }

  const handleRevertToVersion = async (versionId, versionNumber) => {
    if (!confirm(`Are you sure you want to revert to version ${versionNumber}? Your current project state will be backed up automatically.`)) {
      return
    }

    setIsReverting(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}/versions/${versionId}/revert`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        // Check if it's a paid feature error
        if (response.status === 403 && errorData.error && errorData.error.includes('paid feature')) {
          throw new Error("Version history is a paid feature. Please upgrade to access this feature.")
        }
        throw new Error(errorData.error || "Failed to revert to version")
      }

      const data = await response.json()
      console.log(`✅ Reverted to version ${versionNumber}`, data)
      
      // Show success message
      alert(`Successfully reverted to version ${versionNumber}. Files restored: ${data.stats.files_restored}, Assets restored: ${data.stats.assets_restored}`)
      
      // Reload versions and notify parent
      await loadVersions()
      if (onVersionRestored) {
        onVersionRestored()
      }
    } catch (err) {
      console.error("Error reverting to version:", err)
      setError(err.message)
      alert(`Failed to revert: ${err.message}`)
    } finally {
      setIsReverting(false)
    }
  }

  const handleDeleteVersion = async (versionId, versionNumber) => {
    if (!confirm(`Are you sure you want to delete version ${versionNumber}? This action cannot be undone.`)) {
      return
    }

    setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}/versions/${versionId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete version")
      }

      console.log(`🗑️ Deleted version ${versionNumber}`)
      await loadVersions()
    } catch (err) {
      console.error("Error deleting version:", err)
      setError(err.message)
    }
  }

  const handleViewVersionDetails = async (versionId) => {
    if (expandedVersion === versionId) {
      setExpandedVersion(null)
      setSelectedVersion(null)
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/versions/${versionId}`)
      if (!response.ok) {
        throw new Error("Failed to load version details")
      }
      const data = await response.json()
      setSelectedVersion(data.version)
      setExpandedVersion(versionId)
    } catch (err) {
      console.error("Error loading version details:", err)
      setError(err.message)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gradient-to-r from-gray-900/20 to-gray-900/20">
          <div className="flex items-center space-x-3">
            <History className="h-6 w-6 text-gray-400" />
            <h2 className="text-xl font-semibold text-white">Version History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-300">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Create Version Button */}
        <div className="px-6 py-4 border-b border-gray-700">
          {!showCreateForm ? (
            <button
              onClick={() => {
                if (!userIsPaid && !isStillLoading) {
                  window.location.href = '/pricing'
                  return
                }
                setShowCreateForm(true)
              }}
              disabled={!userIsPaid && !isStillLoading}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                !userIsPaid && !isStillLoading
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
              }`}
            >
              {!userIsPaid && !isStillLoading ? (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Create Version Snapshot (Paid)</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Create Version Snapshot</span>
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Version name (e.g., 'Before UI redesign')"
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
              />
              <textarea
                placeholder="Description (optional)"
                value={newVersionDescription}
                onChange={(e) => setNewVersionDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none"
              />
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCreateVersion}
                  disabled={isCreatingVersion || !newVersionName.trim()}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isCreatingVersion ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Version</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false)
                    setNewVersionName("")
                    setNewVersionDescription("")
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Versions List */}
        <div className="overflow-y-auto max-h-[calc(90vh-240px)] px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-500 border-t-transparent" />
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <History className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-lg">No versions yet</p>
              <p className="text-sm">Create your first version snapshot to start tracking changes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden hover:border-gray-500/50 transition-colors"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-900/50 text-gray-300 border border-gray-500/50">
                            v{version.version_number}
                          </span>
                          <h3 className="text-white font-medium">
                            {version.version_name || `Version ${version.version_number}`}
                          </h3>
                        </div>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatDate(version.created_at)}</span>
                          </div>
                        </div>
                        {version.description && (
                          <p className="mt-2 text-sm text-gray-300">{version.description}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleViewVersionDetails(version.id)}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                          title="View details"
                        >
                          {expandedVersion === version.id ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleRevertToVersion(version.id, version.version_number)}
                          disabled={isReverting}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                          title="Revert to this version"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Revert</span>
                        </button>
                        <button
                          onClick={() => handleDeleteVersion(version.id, version.version_number)}
                          className="p-2 hover:bg-red-900/50 rounded-lg transition-colors"
                          title="Delete version"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedVersion === version.id && selectedVersion && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-700 bg-gray-900/50"
                      >
                        <div className="p-4 space-y-3">
                          <div>
                            <h4 className="text-sm font-medium text-gray-300 mb-2">Code Files</h4>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {selectedVersion.snapshot_data?.code_files?.length > 0 ? (
                                selectedVersion.snapshot_data.code_files.map((file, idx) => (
                                  <div
                                    key={idx}
                                    className="text-xs text-gray-400 px-2 py-1 bg-gray-800/50 rounded"
                                  >
                                    {file.file_path}
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-gray-500">No code files</p>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-300 mb-2">Assets</h4>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {selectedVersion.snapshot_data?.assets?.length > 0 ? (
                                selectedVersion.snapshot_data.assets.map((asset, idx) => (
                                  <div
                                    key={idx}
                                    className="text-xs text-gray-400 px-2 py-1 bg-gray-800/50 rounded"
                                  >
                                    {asset.file_path}
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-gray-500">No assets</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

