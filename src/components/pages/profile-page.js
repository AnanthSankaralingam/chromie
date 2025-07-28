"use client"

import { useState, useEffect } from "react"
import { useSession } from '@/components/SessionProviderClient'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Trash2, Edit, User, Mail, Calendar, AlertTriangle } from "lucide-react"
import AppBar from "@/components/ui/app-bar"

export default function ProfilePage() {
  const { user, supabase } = useSession()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingProject, setEditingProject] = useState(null)
  const [newProjectName, setNewProjectName] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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

  useEffect(() => {
    if (user) {
      fetchProjects()
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
        body: JSON.stringify({ name: newName.trim() }),
      })

      if (response.ok) {
        setProjects(projects.map(project => 
          project.id === projectId 
            ? { ...project, name: newName.trim() }
            : project
        ))
        setEditingProject(null)
        setNewProjectName("")
      }
    } catch (error) {
      console.error('Error renaming project:', error)
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

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-6">
            <div className="text-center text-white">
              <p>Please sign in to view your profile.</p>
            </div>
          </CardContent>
        </Card>
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
            <CardTitle className="text-white flex items-center space-x-3">
              <User className="h-6 w-6" />
              <span>Profile Information</span>
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
                          className="text-slate-400 hover:text-white"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-red-500/10 backdrop-blur-sm border-red-500/20">
          <CardHeader>
                         <CardTitle className="text-red-400 flex items-center space-x-2">
               <AlertTriangle className="h-5 w-5" />
               <span>Account Actions</span>
             </CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                             <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
               <Trash2 className="h-4 w-4 mr-2" />
               Sign Out
             </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-red-400">Delete Account</DialogTitle>
                  <DialogDescription className="text-slate-300">
                    Are you sure you want to sign out?
                    Your projects and data will remain safe and you can sign back in anytime.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setDeleteDialogOpen(false)}
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
