"use client"

import { useState, useEffect } from "react"
import { useSession } from '@/components/SessionProviderClient'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/forms-and-input/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/feedback/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Trash2, Edit, User, Mail, Calendar, CreditCard, Crown, Zap, ArrowUpRight, ArrowDownRight, ExternalLink, Share, Copy, Check, X, Download } from "lucide-react"
import AppBar from "@/components/ui/app-bars/app-bar"
import AuthModal from "@/components/ui/modals/modal-auth"
import { navigateToBuilderWithProject } from "@/lib/utils"
import React from "react"
import TokenUsageDisplay from "@/components/ui/chat/token-usage-display"
import BrowserUsageDisplay from "@/components/ui/chat/browser-usage-display"

export default function ProfilePage() {
  const { user, supabase } = useSession()
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
    }
  }, [user])

  // Handle project rename
  const handleRenameProject = async (projectId, newName) => {
    if (!newName.trim()) return

    // Project names are now automatically updated during code generation
    // Show a message to the user
    alert('Project names are now automatically updated based on the extension manifest. Renaming is no longer supported.')
    setEditingProject(null)
    setNewProjectName("")
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

  // Get plan display info
  const getPlanInfo = (plan) => {
    const plans = {
      starter: {
        name: 'Starter',
        price: '$12/month',
        color: 'bg-purple-500',
        icon: Zap
      },
      pro: {
        name: 'Pro',
        price: '$25/month',
        color: 'bg-blue-500',
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <AppBar />
        <div className="max-w-4xl mx-auto space-y-6 p-6 pt-8">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="text-center text-white space-y-4">
                <h2 className="text-2xl font-bold">Welcome to Your Profile</h2>
                <p className="text-slate-300">Sign in to view and manage your projects, billing, and account settings.</p>
                <Button 
                  onClick={() => setAuthModalOpen(true)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <AppBar />
      <div className="max-w-4xl mx-auto space-y-6 p-6 pt-8">
        {/* User Profile Section */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
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
                <AvatarFallback className="bg-purple-600 text-white text-lg font-medium">
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
          </CardContent>
        </Card>

        {/* Billing Section */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
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
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
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
                    className={`${
                      billing.status === 'active' 
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
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Billing
                  </Button>
                  
                  {billing.plan === 'starter' && (
                    <Button
                      onClick={() => handleBillingAction('upgrade', 'pro')}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
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
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Subscribe Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Section */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
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

        {/* Projects Section */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Your Projects</CardTitle>
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
                  <div key={project.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex-1">
                      {editingProject === project.id ? (
                        <div className="flex items-center space-x-2">
                          <Input
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
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
                            className="bg-blue-600 hover:bg-blue-700"
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
                            className="text-slate-400 hover:text-white"
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
                          <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
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
                           className="text-slate-500 hover:text-slate-400 cursor-not-allowed"
                           title="Renaming is no longer supported - names update automatically"
                           disabled
                         >
                           <Edit className="h-4 w-4" />
                         </Button>
                         <Button
                           size="sm"
                           variant="ghost"
                           onClick={() => navigateToBuilderWithProject(project.id)}
                           className="text-blue-400 hover:text-blue-300"
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
                           className="text-red-400 hover:text-red-300"
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

        {/* Shares Section */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Share className="h-5 w-5" />
              <span>Shared Extensions</span>
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
                  <div key={share.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h3 className="text-white font-medium">{share.project.name}</h3>
                          {share.project.description && (
                            <p className="text-slate-400 text-sm">{share.project.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-xs text-slate-500 mt-1">
                            <span>Shared {formatDate(share.created_at)}</span>
                            <span className="flex items-center space-x-1">
                              <Download className="h-3 w-3" />
                              <span>{share.download_count} downloads</span>
                            </span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
                          Active
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyShareLink(share.share_url, share.id)}
                        className="text-blue-400 hover:text-blue-300"
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
                        className="text-purple-400 hover:text-purple-300"
                        title="View share page"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRevokeShare(share.project.id, share.id)}
                        disabled={revokingShareId === share.id}
                        className="text-red-400 hover:text-red-300"
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

        {/* Sign Out Button */}
        <div className="flex justify-center pt-4">
          <Dialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500">
                Sign Out
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-red-400">Sign Out</DialogTitle>
                <DialogDescription className="text-slate-300">
                  Are you sure you want to sign out?
                  Your projects and data will remain safe and you can sign back in anytime.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setSignOutDialogOpen(false)}
                  className="text-slate-300 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? 'Signing out...' : 'Sign Out'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Project Deletion Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700">
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
                variant="ghost"
                onClick={() => {
                  setDeleteDialogOpen(false)
                  setProjectToDelete(null)
                }}
                className="text-slate-300 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteProject(projectToDelete?.id)}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? 'Deleting...' : 'Delete Project'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Billing Modal */}
      <Dialog open={billingDialogOpen} onOpenChange={setBillingDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
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
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
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
              variant="ghost"
              onClick={() => setBillingDialogOpen(false)}
              className="text-slate-300 hover:text-white"
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
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {selectedPlan === 'pro' ? 'Upgrade Now' : selectedPlan === 'starter' ? 'Downgrade Now' : 'Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
