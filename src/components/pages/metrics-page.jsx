"use client"

import { useState, useEffect } from "react"
import { useSession } from '@/components/SessionProviderClient'
import { useRouter, useSearchParams } from 'next/navigation'
import AppBar from "@/components/ui/app-bars/app-bar"
import MetricsSidebar from "@/components/ui/metrics/sidebar"
import OverviewStats from "@/components/ui/metrics/overview-stats"
import ChartsSection from "@/components/ui/metrics/charts-section"
import AnalyticsTab from "@/components/ui/metrics/analytics-tab"
import SettingsTab from "@/components/ui/metrics/settings-tab"

export default function MetricsPage() {
  const { user, isLoading } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  // State management
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(true)

  // Load persisted state from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCollapsed = sessionStorage.getItem('chromie_metrics_sidebar_collapsed')
      const savedTab = sessionStorage.getItem('chromie_metrics_active_tab')
      const savedProject = sessionStorage.getItem('chromie_metrics_selected_project')

      if (savedCollapsed !== null) {
        setSidebarCollapsed(savedCollapsed === 'true')
      }
      if (savedTab) {
        setActiveTab(savedTab)
      }
      if (savedProject) {
        setSelectedProjectId(savedProject)
      }
    }
  }, [])

  // Persist sidebar collapsed state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('chromie_metrics_sidebar_collapsed', sidebarCollapsed.toString())
    }
  }, [sidebarCollapsed])

  // Persist active tab
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('chromie_metrics_active_tab', activeTab)
    }
  }, [activeTab])

  // Persist selected project
  useEffect(() => {
    if (selectedProjectId && typeof window !== 'undefined') {
      sessionStorage.setItem('chromie_metrics_selected_project', selectedProjectId)
    }
  }, [selectedProjectId])

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return

      try {
        setProjectsLoading(true)
        const response = await fetch('/api/projects')

        if (response.ok) {
          const data = await response.json()
          setProjects(data.projects || [])

          // Set first project as selected if none selected yet
          if (!selectedProjectId && data.projects && data.projects.length > 0) {
            setSelectedProjectId(data.projects[0].id)
          }
        } else {
          console.error('Failed to fetch projects')
        }
      } catch (error) {
        console.error('Error fetching projects:', error)
      } finally {
        setProjectsLoading(false)
      }
    }

    fetchProjects()
  }, [user])

  // Handle tab changes
  const handleTabChange = (newTab) => {
    setActiveTab(newTab)
  }

  // Handle project selection
  const handleProjectChange = (projectId) => {
    setSelectedProjectId(projectId)
  }

  // Handle sidebar toggle
  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0A0A0F] via-[#0F111A] to-[#0A0A0F] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-500 border-t-transparent" />
      </div>
    )
  }

  // Show sign in prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0A0F] via-[#0F111A] to-[#0A0A0F]">
        <AppBar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Sign in to view metrics</h2>
            <p className="text-slate-400">Please sign in to access your extension metrics and analytics.</p>
          </div>
        </div>
      </div>
    )
  }

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-slate-400">
                Monitor your extension's performance and usage metrics
              </p>
            </div>
            <OverviewStats />
            <ChartsSection />
          </div>
        )
      case 'analytics':
        return <AnalyticsTab />
      case 'settings':
        return <SettingsTab selectedProjectId={selectedProjectId} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0F] via-[#0F111A] to-[#0A0A0F]">
      <AppBar />
      <div className="flex">
        {/* Sidebar */}
        <MetricsSidebar
          collapsed={sidebarCollapsed}
          onToggle={handleSidebarToggle}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onProjectChange={handleProjectChange}
        />

        {/* Main content area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {renderTabContent()}
        </main>
      </div>
    </div>
  )
}
