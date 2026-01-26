"use client"

import { useState, useEffect } from "react"
import { Key, Copy, Check, AlertTriangle, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/forms-and-input/input"
import { Label } from "@/components/ui/forms-and-input/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Truncate API key for display
const truncateKey = (key) => {
  if (!key || key.length < 20) return key
  const prefix = key.substring(0, 15)
  const suffix = key.substring(key.length - 5)
  return `${prefix}...${suffix}`
}

// Format date
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export default function ApiKeySection({ selectedProjectId }) {
  const [showModal, setShowModal] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState(null)
  const [copiedKeyId, setCopiedKeyId] = useState(null)
  const [apiKeys, setApiKeys] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch API keys on mount and when selectedProjectId changes
  useEffect(() => {
    fetchApiKeys()
  }, [selectedProjectId])

  const fetchApiKeys = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/api-keys')

      if (!response.ok) {
        throw new Error('Failed to fetch API keys')
      }

      const data = await response.json()
      console.log('Fetched API keys:', data.apiKeys?.length || 0)
      setApiKeys(data.apiKeys || [])
    } catch (error) {
      console.error('Error fetching API keys:', error)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateKey = async () => {
    if (!selectedProjectId) {
      setError('Please select a project first')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${selectedProjectId}/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: keyName }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate API key')
      }

      setNewlyGeneratedKey(data.apiKey)
      console.log('API key generated successfully for project:', selectedProjectId)

      // Refresh the list
      await fetchApiKeys()
    } catch (error) {
      console.error('Error generating API key:', error)
      setError(error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeleteKey = async (projectId) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/api-key`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete API key')
      }

      console.log('API key deleted successfully for project:', projectId)

      // Refresh the list
      await fetchApiKeys()
    } catch (error) {
      console.error('Error deleting API key:', error)
      setError(error.message)
    }
  }

  const handleCopyKey = async (keyText, keyId) => {
    try {
      await navigator.clipboard.writeText(keyText)
      setCopiedKeyId(keyId)
      setTimeout(() => setCopiedKeyId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setKeyName('')
    setNewlyGeneratedKey(null)
    setIsGenerating(false)
  }

  const handleOpenModal = () => {
    setShowModal(true)
    setNewlyGeneratedKey(null)
    setKeyName('')
  }

  return (
    <>
      <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              Manage API keys for programmatic access to metrics
            </CardDescription>
          </div>
          <Button
            onClick={handleOpenModal}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            Generate New Key
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-500 border-t-transparent mx-auto" />
              <p className="text-sm text-slate-400 mt-4">Loading API keys...</p>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-4 flex justify-center">
                <div className="p-4 rounded-full bg-slate-700/20">
                  <Key className="h-8 w-8 text-slate-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-300 mb-2">
                No API keys yet
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                Generate your first key to start accessing metrics programmatically
              </p>
              <Button
                onClick={handleOpenModal}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <Key className="h-4 w-4 mr-2" />
                Generate API Key
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((apiKey) => (
                <div
                  key={apiKey.id}
                  className="flex items-center justify-between p-4 bg-slate-700/20 rounded-lg border border-slate-600/30"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-medium text-white">{apiKey.name}</p>
                    </div>
                    <p className="text-sm font-mono text-slate-300 mb-1">
                      {truncateKey(apiKey.key)}
                    </p>
                    <p className="text-xs text-slate-400">
                      Created {formatDate(apiKey.created)}
                      {apiKey.lastUsed && ` • Last used ${formatDate(apiKey.lastUsed)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="iconSm"
                      onClick={() => handleCopyKey(apiKey.key, apiKey.id)}
                      className="text-slate-400 hover:text-white"
                      title="Copy API key prefix"
                    >
                      {copiedKeyId === apiKey.id ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      onClick={() => handleDeleteKey(apiKey.id)}
                      className="text-slate-400 hover:text-red-400"
                      title="Delete API key"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate API Key Modal */}
      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogContent className="bg-slate-800/95 border-slate-700 backdrop-blur-sm text-white">
          {!newlyGeneratedKey ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">Generate New API Key</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Create a new API key for programmatic access to your extension metrics
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {!selectedProjectId && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-sm text-yellow-300">
                      Please select a project from the sidebar before generating an API key.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="keyName" className="text-slate-300">
                    Key Name (Optional)
                  </Label>
                  <Input
                    id="keyName"
                    placeholder="e.g., Production Analytics"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                    disabled={isGenerating || !selectedProjectId}
                  />
                </div>

                <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-orange-300 mb-1">
                      Keys cannot be viewed again after generation. Save it securely.
                    </p>
                    <p className="text-xs text-orange-400">
                      You can only have 1 API key total across all projects.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={handleCloseModal}
                  className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateKey}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isGenerating || !selectedProjectId}
                >
                  {isGenerating ? 'Generating...' : 'Generate Key'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-400" />
                  API Key Generated
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Save this key now. You won't be able to see it again.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Your API Key</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-3 bg-slate-900/50 border border-slate-600 rounded-lg">
                      <p className="text-sm font-mono text-white break-all">
                        {newlyGeneratedKey.key}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopyKey(newlyGeneratedKey.key, newlyGeneratedKey.id)}
                      className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                    >
                      {copiedKeyId === newlyGeneratedKey.id ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">
                    Save this key now. You won't be able to see it again after closing this dialog.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={handleCloseModal}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
