 "use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from '@/components/SessionProviderClient'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/forms-and-input/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/feedback/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Trash2, Edit, User, Mail, Calendar, CreditCard, Crown, Zap, ArrowUpRight, ArrowDownRight, ExternalLink, Share, Copy, Check, X, Download, Eye, Clock, BarChart3, Upload } from "lucide-react"
import AppBar from "@/components/ui/app-bars/app-bar"
import AuthModal from "@/components/ui/modals/modal-auth"
import { navigateToBuilderWithProject, cn } from "@/lib/utils"
import React from "react"
import TokenUsageDisplay from "@/components/ui/chat/token-usage-display"
import BrowserUsageDisplay from "@/components/ui/chat/browser-usage-display"

export default function ProfilePage() {
  const { user, supabase } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState([])
  const [billing, setBilling] = useState(null)
  const [loading, setLoading] = useState(true)
  const [billingLoading, setBillingLoading] = useState(true)
  const [editingProject, setEditingProject] = useState(null)
  const [newProjectName, setNewProjectName] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false)
  const [billingDialogOpen, setBillingDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [shares, setShares] = useState([])
  const [sharesLoading, setSharesLoading] = useState(true)
  const [copiedShareId, setCopiedShareId] = useState(null)
  const [revokingShareId, setRevokingShareId] = useState(null)
  const [isGithubChecking, setIsGithubChecking] = useState(true)
  const [isGithubConnected, setIsGithubConnected] = useState(false)
  const [githubUsername, setGithubUsername] = useState(null)
  const [isImportingExtension, setIsImportingExtension] = useState(false)
  const importInputRef = useRef(null)

  // Helper function to get user initials
  const getUserInitials = (user) => {
    if (user?.user_metadata?.name) {
      return user.user_metadata.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }

  // Fetch user's projects
  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch user's shares
  const fetchShares = async () => {
    try {
      setSharesLoading(true)
      const response = await fetch('/api/shares')
      if (response.ok) {
        const data = await response.json()
        setShares(data.shares || [])
      } else {
        console.error('Failed to fetch shares')
      }
    } catch (error) {
      console.error('Error fetching shares:', error)
    } finally {
      setSharesLoading(false)
    }
  }

  // Fetch GitHub connection status
  const fetchGithubStatus = async () => {
    try {
      setIsGithubChecking(true)
      const response = await fetch('/api/github/status')
      if (response.ok) {
        const data = await response.json()
        setIsGithubConnected(!!data.connected)
        setGithubUsername(data.username || null)
      } else {
        console.error('Failed to fetch GitHub status')
        setIsGithubConnected(false)
      }
    } catch (error) {
      console.error('Error fetching GitHub status:', error)
      setIsGithubConnected(false)
    } finally {
      setIsGithubChecking(false)
    }
  }

  // Fetch user's billing information
  const fetchBilling = async () => {
    try {
      const response = await fetch('/api/billing/status')
      if (response.ok) {
        const data = await response.json()
        setBilling(data.billing)
      }
    } catch (error) {
      console.error('Error fetching billing:', error)
    } finally {
      setBillingLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchProjects()
      fetchBilling()
      fetchShares()
      fetchGithubStatus()
    }
  }, [user])

  // Handle project rename
  const handleRenameProject = async (projectId, newName) => {
    if (!newName.trim()) return

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName }),
      })

      if (response.ok) {
        // Update the project in local state immediately
        setProjects(projects.map(project =>
          project.id === projectId
            ? { ...project, name: newName }
            : project
        ))
        setEditingProject(null)
        setNewProjectName("")
      } else {
        const errorData = await response.json()
        console.error('Failed to rename project:', errorData.error)
        alert('Failed to rename project. Please try again.')
      }
    } catch (error) {
      console.error('Error renaming project:', error)
      alert('Error renaming project. Please try again.')
    }
  }

  // Handle project deletion
  const handleDeleteProject = async (projectId) => {
    if (!projectId) return

    console.log('Attempting to delete project:', projectId)
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove the project from the local state
        setProjects(projects.filter(project => project.id !== projectId))
        setDeleteDialogOpen(false)
        setProjectToDelete(null)
        console.log('Project deleted successfully')
      } else {
        const errorData = await response.json()
        console.error('Failed to delete project:', errorData.error)
        alert('Failed to delete project. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Error deleting project. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle billing actions
  const handleBillingAction = (action, plan = null) => {
    if (action === 'upgrade' || action === 'downgrade') {
      setSelectedPlan(plan)
      setBillingDialogOpen(true)
    } else if (action === 'cancel') {
      // Redirect to Stripe customer portal
      window.open('/api/billing/portal', '_blank')
    } else if (action === 'manage') {
      // Redirect to Stripe customer portal using environment variable
      const manageBillingUrl = process.env.NEXT_PUBLIC_STRIPE_MANAGE_BILLING || '/api/billing/portal'
      window.open(manageBillingUrl, '_blank')
    }
  }

  // Handle account deletion
  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      // FIXME For now, we'll just sign out the user
      // In a production app, you'd want to implement proper account deletion
      // through a server-side API endpoint with admin privileges
      await supabase.auth.signOut()

      // Redirect to home page
      window.location.href = '/'
    } catch (error) {
      console.error('Error during account deletion:', error)
      // Fallback: sign out the user
      await supabase.auth.signOut()
      window.location.href = '/'
    }
  }

  // Handle share link copy
  const handleCopyShareLink = async (shareUrl, shareId) => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedShareId(shareId)
      setTimeout(() => setCopiedShareId(null), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopiedShareId(shareId)
      setTimeout(() => setCopiedShareId(null), 2000)
    }
  }

  // Handle share revocation
  const handleRevokeShare = async (projectId, shareId) => {
    try {
      setRevokingShareId(shareId)
      const response = await fetch(`/api/projects/${projectId}/share`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Remove the share from local state
        setShares(shares.filter(share => share.id !== shareId))
        console.log('Share revoked successfully')
      } else {
        const errorData = await response.json()
        console.error('Failed to revoke share:', errorData.error)
        alert('Failed to revoke share. Please try again.')
      }
    } catch (error) {
      console.error('Error revoking share:', error)
      alert('Error revoking share. Please try again.')
    } finally {
      setRevokingShareId(null)
    }
  }

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Calculate time remaining until expiry
  const getTimeRemaining = (expiryDate) => {
    const now = new Date()
    const expiry = new Date(expiryDate)
    const diff = expiry - now

    if (diff <= 0) return 'Expired'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) {
      return `Expires in ${days}d ${hours}h`
    }
    return `Expires in ${hours}h`
  }

  // Get plan display info
  const getPlanInfo = (plan) => {
    const plans = {
      starter: {
        name: 'Starter',
        price: '$12/month',
        color: 'bg-black',
        icon: Zap
      },
      pro: {
        name: 'Pro',
        price: '$25/month',
        color: 'bg-gray-500',
        icon: Crown
      },
      enterprise: {
        name: 'Enterprise',
        price: 'Contact us',
        color: 'bg-green-500',
        icon: Crown
      }
    }
    return plans[plan] || plans.starter
  }

  const handleImportExtensionClick = () => {
    if (!user) {
      router.push('/')
      return
    }
    if (importInputRef.current) {
      importInputRef.current.value = ''
      importInputRef.current.click()
    }
  }

  const handleImportExtensionFilesSelected = async (event) => {
    try {
      const files = Array.from(event.target.files || [])
      if (!files.length) {
        return
      }

      const defaultName = "Imported Extension"
      const projectName = window.prompt(
        "Name your imported extension project:",
        defaultName
      )

      if (!projectName) {
        console.log('[import-extension] User cancelled project naming, aborting import')
        return
      }

      setIsImportingExtension(true)
      console.log('[import-extension] Starting client-side import from profile page', {
        fileCount: files.length,
        projectName,
      })

      const formData = new FormData()
      formData.append('projectName', projectName)

      files.forEach((file) => {
        const relativePath = file.webkitRelativePath || file.name
        formData.append('files', file, relativePath)
      })

      const response = await fetch('/api/projects/import-extension', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const message = data?.error || 'Failed to import extension'
        console.error('[import-extension] Import failed from profile page:', {
          status: response.status,
          message,
          details: data,
        })
        alert(message)
        return
      }

      const newProjectId = data?.project?.id
      if (!newProjectId) {
        console.error('[import-extension] Import succeeded but project ID missing', data)
        alert('Extension imported but project ID was missing in the response.')
        return
      }

      console.log('[import-extension] Import completed successfully from profile page', {
        projectId: newProjectId,
        projectName: data?.project?.name,
      })

      sessionStorage.setItem('chromie_current_project_id', newProjectId)
      router.push(`/builder?project=${newProjectId}`)
    } catch (error) {
      console.error('[import-extension] Unexpected error during import from profile page:', error)
      alert(error?.message || 'Failed to import extension')
    } finally {
      setIsImportingExtension(false)
      if (event?.target) {
        event.target.value = ''
      }
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0A0F] via-[#0F111A] to-[#0A0A0F] text-white relative overflow-hidden">
        {/* Static Background */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gray-600/10 rounded-full filter blur-[100px]" />
          <div className="absolute top-1/3 right-1/4 w-[700px] h-[700px] bg-gray-600/10 rounded-full filter blur-[100px]" />
        </div>

        <AppBar />
        <div className="max-w-4xl mx-auto space-y-6 p-6 pt-8 relative z-10">
          <div>
            <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
              <CardContent className="p-6">
                <div className="text-center text-white space-y-4">
                  <h2 className="text-2xl font-bold">Welcome to Your Profile</h2>
                  <p className="text-slate-300">Sign in to view and manage your projects, billing, and account settings.</p>
                  <Button
                    onClick={() => setAuthModalOpen(true)}
                    className="bg-gradient-to-r from-gray-600 via-gray-500 to-gray-400 hover:from-gray-500 hover:via-gray-400 hover:to-gray-300 shadow-lg shadow-gray-500/30 hover:shadow-gray-500/40 transition-all duration-300"
                  >
                    Sign In
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          redirectUrl="/profile"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0F] via-[#0F111A] to-[#0A0A0F] text-white relative overflow-hidden">
      {/* Static Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gray-600/10 rounded-full filter blur-[100px]" />
        <div className="absolute top-1/3 right-1/4 w-[700px] h-[700px] bg-gray-600/10 rounded-full filter blur-[100px]" />
      </div>

      <AppBar />
      <div className="max-w-4xl mx-auto space-y-6 p-6 pt-8 relative z-10">
        <input
          ref={importInputRef}
          type="file"
          multiple
          webkitdirectory="true"
          style={{ display: 'none' }}
          onChange={handleImportExtensionFilesSelected}
        />
        {/* User Profile Section */}
        <div>
          <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
            <CardHeader>
              <CardTitle className="text-white">
                Profile Information
              </CardTitle>
            </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={user?.user_metadata?.picture}
                  alt={user?.user_metadata?.name || user?.email}
                />
                <AvatarFallback className="bg-gray-600 text-white text-lg font-medium">
                  {getUserInitials(user)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="text-white">{user.email}</span>
                </div>
                {user.user_metadata?.name && (
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-white">{user.user_metadata.name}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-300 text-sm">
                    Member since {formatDate(user.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* GitHub connection status */}
            <div className="mt-4 p-3 rounded-lg border border-slate-700/60 bg-slate-900/40 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm font-medium text-white">GitHub integration</div>
                {isGithubChecking ? (
                  <div className="text-xs text-slate-400">Checking GitHub connection...</div>
                ) : isGithubConnected ? (
                  <div className="text-xs text-green-400">
                    Connected{githubUsername ? ` as ${githubUsername}` : ''}. You can export projects directly to GitHub from the builder.
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">
                    Not connected. Connect GitHub once to enable one-click export from the builder.
                  </div>
                )}
              </div>
              <Button
                size="sm"
                variant={isGithubConnected ? "outline" : "default"}
                className={isGithubConnected
                  ? "border-slate-600 text-slate-200 hover:text-white hover:bg-slate-800"
                  : "bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 hover:from-slate-700 hover:via-slate-600 hover:to-slate-700"}
                onClick={() => {
                  window.location.href = '/api/github/login'
                }}
              >
                {isGithubConnected ? 'Reconnect GitHub' : 'Connect GitHub'}
              </Button>
            </div>
          </CardContent>
          </Card>
        </div>

        {/* Billing Section */}
        <div>
          <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
            <CardHeader>
              <CardTitle className="text-white">
                Billing & Subscription
              </CardTitle>
            </CardHeader>
          <CardContent>
            {billingLoading ? (
              <div className="text-center py-8">
                <div className="text-white">Loading billing information...</div>
              </div>
            ) : billing ? (
              <div className="space-y-4">
                {/* Current Plan */}
                <div className="flex items-center justify-between p-4 bg-slate-700/20 rounded-lg border border-slate-600/30">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${getPlanInfo(billing.plan).color}`}>
                      {React.createElement(getPlanInfo(billing.plan).icon, { className: "h-5 w-5 text-white" })}
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{getPlanInfo(billing.plan).name}</h3>
                      <p className="text-slate-400 text-sm">{getPlanInfo(billing.plan).price}</p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`${billing.status === 'active'
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : billing.status === 'past_due'
                          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                  >
                    {billing.status === 'active' ? 'Active' : billing.status === 'past_due' ? 'Past Due' : billing.status}
                  </Badge>
                </div>

                {/* Billing Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    onClick={() => handleBillingAction('manage')}
                    variant="outline"
                    className="border-gray-500/50 text-gray-400 hover:bg-gray-500/10 hover:border-gray-500"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Billing
                  </Button>

                  {billing.plan === 'starter' && (
                    <Button
                      onClick={() => handleBillingAction('upgrade', 'pro')}
                      className="bg-gradient-to-r from-gray-600 via-gray-500 to-gray-400 hover:from-gray-500 hover:via-gray-400 hover:to-gray-300 shadow-lg shadow-gray-500/30 hover:shadow-gray-500/40 transition-all duration-300 text-white"
                    >
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Upgrade to Pro
                    </Button>
                  )}

                  {billing.plan === 'pro' && (
                    <Button
                      onClick={() => handleBillingAction('downgrade', 'starter')}
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <ArrowDownRight className="h-4 w-4 mr-2" />
                      Downgrade to Starter
                    </Button>
                  )}
                </div>

                {/* Subscription Details */}
                <div className="text-sm text-slate-400 space-y-1">
                  <p>Valid until: {formatDate(billing.valid_until)}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-slate-300 mb-4">No active subscription found.</div>
                <Button
                  onClick={() => setBillingDialogOpen(true)}
                  className="bg-gradient-to-r from-gray-600 via-gray-500 to-gray-400 hover:from-gray-500 hover:via-gray-400 hover:to-gray-300 shadow-lg shadow-gray-500/30 hover:shadow-gray-500/40 transition-all duration-300"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Subscribe Now
                </Button>
              </div>
            )}
          </CardContent>
          </Card>
        </div>

        {/* Usage Section */}
        <div>
          <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
            <CardHeader>
              <CardTitle className="text-white">
                Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-4 space-x-8">
                <TokenUsageDisplay />
                <BrowserUsageDisplay />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects Section */}
        <div>
          <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Your Projects</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleImportExtensionClick}
                disabled={isImportingExtension}
                className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <Upload className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">
                  {isImportingExtension ? 'Importing…' : 'Upload extension'}
                </span>
                <span className="sm:hidden">Upload</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/metrics')}
                className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Metrics
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="text-white">Loading projects...</div>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-slate-300">No projects found. Create your first project in the builder!</div>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-4 bg-slate-700/20 rounded-lg border border-slate-600/30">
                    <div className="flex-1">
                      {editingProject === project.id ? (
                        <div className="flex items-center space-x-2">
                          <Input
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            className="backdrop-blur-xl bg-slate-700/30 border-slate-600/40 text-white placeholder:text-slate-400"
                            placeholder="Enter new project name"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleRenameProject(project.id, newProjectName)
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleRenameProject(project.id, newProjectName)}
                            className="bg-gray-600 hover:bg-gray-700"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingProject(null)
                              setNewProjectName("")
                            }}
                            className="text-slate-400 hover:text-white hover:bg-slate-800"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3">
                          <div>
                            <h3 className="text-white font-medium">{project.name}</h3>
                            {project.description && (
                              <p className="text-slate-400 text-sm">{project.description}</p>
                            )}
                            <p className="text-slate-500 text-xs mt-1">
                              Created {formatDate(project.created_at)}
                            </p>
                          </div>
                          <Badge variant="secondary" className="bg-gray-500/10 text-gray-400 border-gray-500/20">
                            {project.archived ? 'Archived' : 'Active'}
                          </Badge>
                        </div>
                      )}
                    </div>
                    {editingProject !== project.id && (
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingProject(project.id)
                            setNewProjectName(project.name)
                          }}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          title="Rename project"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigateToBuilderWithProject(project.id)}
                          className="text-gray-400 hover:text-gray-300 hover:bg-gray-500/10"
                          title="Edit project in builder"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setProjectToDelete(project)
                            setDeleteDialogOpen(true)
                          }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          title="Delete project"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          </Card>
        </div>

        {/* Shares Section */}
        <div>
          <Card className="backdrop-blur-xl bg-slate-800/30 border-slate-700/40">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Share className="h-5 w-5" />
                  <span>Shared Extensions</span>
                </div>
                {shares.length > 0 && (
                  <div className="text-sm font-normal text-slate-400">
                    {shares.reduce((total, share) => total + (share.view_count || 0), 0)} total views
                  </div>
                )}
              </CardTitle>
            </CardHeader>
          <CardContent>
            {sharesLoading ? (
              <div className="text-center py-8">
                <div className="text-white">Loading shares...</div>
              </div>
            ) : shares.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-slate-300">No shared extensions yet. Share your projects from the builder!</div>
              </div>
            ) : (
              <div className="space-y-3">
                {shares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between p-4 bg-slate-700/20 rounded-lg border border-slate-600/30">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h3 className="text-white font-medium">{share.project.name}</h3>
                          {share.project.description && (
                            <p className="text-slate-400 text-sm">{share.project.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-xs text-slate-500 mt-2">
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>Shared {formatDate(share.created_at)}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Eye className="h-3 w-3" />
                              <span>{share.view_count || 0} views</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Download className="h-3 w-3" />
                              <span>{share.download_count || 0} downloads</span>
                            </span>
                          </div>
                          {share.last_accessed_at && (
                            <div className="flex items-center space-x-1 text-xs text-slate-600 mt-1">
                              <Clock className="h-3 w-3" />
                              <span>Last accessed {formatDate(share.last_accessed_at)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
                            Active
                          </Badge>
                          {share.expires_at && (
                            <span className="text-xs text-slate-500">
                              {getTimeRemaining(share.expires_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyShareLink(share.share_url, share.id)}
                        className="text-gray-400 hover:text-gray-300 hover:bg-gray-500/10"
                        title="Copy share link"
                      >
                        {copiedShareId === share.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(share.share_url, '_blank')}
                        className="text-gray-400 hover:text-gray-300 hover:bg-gray-500/10"
                        title="View share page"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRevokeShare(share.project.id, share.id)}
                        disabled={revokingShareId === share.id}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        title="Revoke share link"
                      >
                        {revokingShareId === share.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-400 border-t-transparent"></div>
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          </Card>
        </div>

        {/* Sign Out Button */}
        <div className="flex justify-center pt-4">
          <Dialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500">
                Sign Out
              </Button>
            </DialogTrigger>
            <DialogContent className="backdrop-blur-xl bg-slate-800/90 border-slate-700/60">
              <DialogHeader>
                <DialogTitle className="text-red-400">Sign Out</DialogTitle>
                <DialogDescription className="text-slate-300">
                  Are you sure you want to sign out?
                  Your projects and data will remain safe and you can sign back in anytime.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSignOutDialogOpen(false)}
                  className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? 'Signing out...' : 'Sign Out'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Project Deletion Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="backdrop-blur-xl bg-slate-800/90 border-slate-700/60">
            <DialogHeader>
              <DialogTitle className="text-red-400">Delete Project</DialogTitle>
              <DialogDescription className="text-slate-300">
                {projectToDelete ? (
                  <>
                    Are you sure you want to delete <strong>"{projectToDelete.name}"</strong>?
                    This action cannot be undone and will permanently remove the project and all its files.
                  </>
                ) : (
                  "Are you sure you want to delete this project? This action cannot be undone."
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false)
                  setProjectToDelete(null)
                }}
                className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteProject(projectToDelete?.id)}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete Project'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Billing Modal */}
      <Dialog open={billingDialogOpen} onOpenChange={setBillingDialogOpen}>
        <DialogContent className="backdrop-blur-xl bg-slate-800/90 border-slate-700/60">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedPlan === 'pro' ? 'Upgrade to Pro' : selectedPlan === 'starter' ? 'Downgrade to Starter' : 'Choose a Plan'}
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              {selectedPlan === 'pro'
                ? 'Upgrade to Pro for more features and higher limits.'
                : selectedPlan === 'starter'
                  ? 'Downgrade to Starter plan.'
                  : 'Select a plan that fits your needs.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPlan && (
              <div className="p-4 bg-slate-700/20 rounded-lg border border-slate-600/30">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${getPlanInfo(selectedPlan).color}`}>
                    {React.createElement(getPlanInfo(selectedPlan).icon, { className: "h-5 w-5 text-white" })}
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{getPlanInfo(selectedPlan).name}</h3>
                    <p className="text-slate-400 text-sm">{getPlanInfo(selectedPlan).price}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBillingDialogOpen(false)}
              className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedPlan === 'pro') {
                  window.location.href = 'https://buy.stripe.com/test_7sY28q5gl0hyaW3gSq7kc01'
                } else if (selectedPlan === 'starter') {
                  window.location.href = 'https://buy.stripe.com/test_9B614mcIN3tK0hp59I7kc00'
                }
                setBillingDialogOpen(false)
              }}
              className="bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 hover:from-purple-500 hover:via-purple-400 hover:to-blue-500 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 transition-all duration-300"
            >
              {selectedPlan === 'pro' ? 'Upgrade Now' : selectedPlan === 'starter' ? 'Downgrade Now' : 'Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
