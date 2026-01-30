"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/SessionProviderClient'
import AppBar from '@/components/ui/app-bars/app-bar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/forms-and-input/textarea'
import { parseMarkdown } from '@/components/ui/chat/markdown-parser'
import { Shield, Eye, Code, Copy, Check, ExternalLink, Sparkles, Loader2 } from 'lucide-react'

export default function PrivacyPolicyWorkflowPage() {
  const { user, isLoading: isSessionLoading } = useSession()
  const router = useRouter()

  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [content, setContent] = useState('')
  const [previewMode, setPreviewMode] = useState(true)
  const [copied, setCopied] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState('')

  useEffect(() => {
    // Wait for session to load before checking authentication
    if (isSessionLoading) return

    if (!user) {
      router.push('/')
      return
    }
    fetchProjects()
  }, [user, isSessionLoading, router])

  async function fetchProjects() {
    try {
      const res = await fetch('/api/privacy-policy')
      const data = await res.json()
      if (res.ok) {
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleProjectSelect(project) {
    setSelectedProject(project)
    setGeneratedUrl('')
    setCopied(false)

    // Load existing privacy policy if available
    if (project.privacy_slug) {
      try {
        const res = await fetch(`/api/projects/${project.id}/privacy-policy`)
        const data = await res.json()
        if (res.ok && data.privacy_policy) {
          setContent(data.privacy_policy)
          setGeneratedUrl(data.url)
        }
      } catch (error) {
        console.error('Error loading privacy policy:', error)
      }
    } else {
      setContent('')
    }
  }

  async function handleGenerateAI() {
    if (!selectedProject) return

    setGenerating(true)
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/privacy-policy/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await res.json()

      if (res.ok && data.privacy_policy) {
        setContent(data.privacy_policy)
      } else {
        alert(data.error || 'Failed to generate privacy policy')
      }
    } catch (error) {
      console.error('Error generating privacy policy:', error)
      alert('Failed to generate privacy policy')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!selectedProject || !content.trim()) return

    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/privacy-policy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacy_policy: content })
      })

      const data = await res.json()

      if (res.ok) {
        setGeneratedUrl(data.url)
        // Refresh projects list
        await fetchProjects()
      } else {
        alert(data.error || 'Failed to save privacy policy')
      }
    } catch (error) {
      console.error('Error saving privacy policy:', error)
      alert('Failed to save privacy policy')
    } finally {
      setSaving(false)
    }
  }

  async function handleCopy() {
    if (!generatedUrl) return

    try {
      await navigator.clipboard.writeText(generatedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  if (loading || isSessionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0A0F] via-[#0F111A] to-[#0A0A0F]">
        <AppBar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0F] via-[#0F111A] to-[#0A0A0F] text-white">
      <AppBar />

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Shield className="h-8 w-8 text-purple-400" />
            <h1 className="text-3xl font-bold">Privacy Policy Hosting</h1>
          </div>
          <p className="text-slate-400">Create and host privacy policies for your extensions</p>
        </div>

        {!selectedProject ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <button
                key={project.id}
                onClick={() => handleProjectSelect(project)}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-left hover:border-purple-500 transition-all"
              >
                <h3 className="font-semibold text-lg mb-2">{project.name}</h3>
                <p className="text-sm text-slate-400 mb-3">{project.description || 'No description'}</p>
                {project.privacy_slug && (
                  <div className="flex items-center text-xs text-purple-400">
                    <Check className="h-3 w-3 mr-1" />
                    Has privacy policy
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-lg">{selectedProject.name}</h2>
                  <p className="text-sm text-slate-400">{selectedProject.description}</p>
                </div>
                <Button variant="outline" onClick={() => setSelectedProject(null)}>
                  Change Project
                </Button>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => setPreviewMode(true)}
                variant={previewMode ? "default" : "outline"}
                className={previewMode ? "bg-purple-600 hover:bg-purple-700" : ""}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                onClick={handleGenerateAI}
                disabled={generating}
                variant="outline"
                className="ml-auto"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate with AI
              </Button>
              <Button
                onClick={() => setPreviewMode(false)}
                variant={!previewMode ? "default" : "outline"}
                className={!previewMode ? "bg-purple-600 hover:bg-purple-700" : ""}
              >
                <Code className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>

            {!previewMode ? (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your privacy policy in markdown..."
                className="min-h-[500px] bg-slate-800 border-slate-700 text-white font-mono text-sm"
              />
            ) : (
              <div
                className="min-h-[500px] bg-slate-800 border border-slate-700 rounded-lg p-6 prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
              />
            )}

            <div className="flex space-x-3">
              <Button
                onClick={handleSave}
                disabled={saving || !content.trim()}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save & Publish'}
              </Button>

              {generatedUrl && (
                <>
                  <div className="flex-1 flex items-center space-x-2 bg-slate-800 border border-slate-700 rounded-lg px-4">
                    <input
                      type="text"
                      value={generatedUrl}
                      readOnly
                      className="flex-1 bg-transparent text-sm text-slate-300 outline-none"
                    />
                    <Button size="sm" variant="ghost" onClick={handleCopy}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => window.open(generatedUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
