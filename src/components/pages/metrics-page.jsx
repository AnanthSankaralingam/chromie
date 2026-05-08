"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from '@/components/SessionProviderClient'
import { useRouter, useSearchParams } from 'next/navigation'
import AppBar from "@/components/ui/app-bars/app-bar"
import MetricsSidebar from "@/components/ui/metrics/sidebar"
import OverviewStats from "@/components/ui/metrics/overview-stats"
import ChartsSection from "@/components/ui/metrics/charts-section"
import AnalyticsTab from "@/components/ui/metrics/analytics-tab"
import SettingsTab from "@/components/ui/metrics/settings-tab"
import { Button } from "@/components/ui/button"
import { Key, ArrowRight, BookOpen } from "lucide-react"

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
  const [apiKeys, setApiKeys] = useState([])
  const [apiKeysLoading, setApiKeysLoading] = useState(true)

  // Metrics data state
  const [metricsData, setMetricsData] = useState(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [timeRange, setTimeRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    to: new Date().toISOString(),
    bucket: 'day'
  })

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

  // Handle project deeplink from query param
  useEffect(() => {
    const queryProjectId = searchParams.get('project')
    if (!queryProjectId || projectsLoading || projects.length === 0) return

    const matchingProject = projects.find((project) => project.id === queryProjectId)
    if (matchingProject && selectedProjectId !== queryProjectId) {
      setSelectedProjectId(queryProjectId)
    }
  }, [searchParams, projects, projectsLoading, selectedProjectId])

  // Fetch API key status for onboarding and default display
  useEffect(() => {
    const fetchApiKeys = async () => {
      if (!user) return
      try {
        setApiKeysLoading(true)
        const response = await fetch('/api/api-keys')
        if (!response.ok) {
          throw new Error('Failed to fetch API keys')
        }
        const data = await response.json()
        setApiKeys(data.apiKeys || [])
      } catch (error) {
        console.error('Error fetching API keys for metrics page:', error)
        setApiKeys([])
      } finally {
        setApiKeysLoading(false)
      }
    }

    fetchApiKeys()
  }, [user])

  // Fetch metrics data whenever project changes
  // Note: This fetches from the pre-aggregated metrics_aggregates table for performance
  const fetchMetrics = useCallback(async (projectId) => {
    if (!projectId) return

    try {
      setMetricsLoading(true)
      const params = new URLSearchParams({
        projectId: projectId,
        from: timeRange.from,
        to: timeRange.to,
        bucket: timeRange.bucket
      })

      const response = await fetch(`/api/metrics/dashboard?${params}`)

      if (response.ok) {
        const data = await response.json()
        setMetricsData(data.metrics)
      } else {
        console.error('Failed to fetch metrics')
        setMetricsData(null)
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
      setMetricsData(null)
    } finally {
      setMetricsLoading(false)
    }
  }, [timeRange])

  // Fetch metrics whenever selectedProjectId changes
  useEffect(() => {
    if (selectedProjectId) {
      fetchMetrics(selectedProjectId)
    }
  }, [selectedProjectId, fetchMetrics])

  // Handle tab changes
  const handleTabChange = (newTab) => {
    setActiveTab(newTab)
  }

  // Handle project selection
  const handleProjectChange = (projectId) => {
    setSelectedProjectId(projectId)
    // Clear current metrics to show loading state while fetching new project data
    setMetricsData(null)
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
            <OverviewStats
              metricsData={metricsData}
              loading={metricsLoading}
            />
            <ChartsSection
              metricsData={metricsData}
              loading={metricsLoading}
              timeRange={timeRange}
            />
          </div>
        )
      case 'analytics':
        return <AnalyticsTab selectedProjectId={selectedProjectId} timeRange={timeRange} />
      case 'settings':
        return <SettingsTab selectedProjectId={selectedProjectId} />
      default:
        return null
    }
  }

  const hasApiKey = apiKeys.length > 0
  const defaultApiKey = hasApiKey ? apiKeys[0] : null
  const truncatedDefaultKey = defaultApiKey?.key
    ? `${defaultApiKey.key.slice(0, 15)}...${defaultApiKey.key.slice(-5)}`
    : null

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
          <div className="mb-6 rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
            {apiKeysLoading ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-400">Checking API key status...</p>
                <Button
                  variant="outline"
                  onClick={() => router.push('/metrics/docs')}
                  className="border-slate-600 text-slate-200 hover:text-white hover:bg-slate-800"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  SDK Docs
                </Button>
              </div>
            ) : hasApiKey ? (
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-2">
                    <Key className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Default metrics API key is ready</p>
                    <p className="text-sm text-slate-300 font-mono">{truncatedDefaultKey}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Using key: {defaultApiKey.name || 'Untitled key'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/metrics/docs')}
                    className="border-slate-600 text-slate-200 hover:text-white hover:bg-slate-800"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    SDK Docs
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('settings')}
                    className="border-slate-600 text-slate-200 hover:text-white hover:bg-slate-800"
                  >
                    Manage API Key
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-white font-medium">Set up metrics access</p>
                  <p className="text-sm text-slate-400">
                    You do not have an API key yet. Generate one in 3 steps: select a project in the sidebar, open the Settings tab, then click Generate New Key.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/metrics/docs')}
                    className="border-slate-600 text-slate-200 hover:text-white hover:bg-slate-800"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    SDK Docs
                  </Button>
                  <Button
                    onClick={() => setActiveTab('settings')}
                    className="bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    Generate API Key
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          {renderTabContent()}
        </main>
      </div>
    </div>
  )
}
