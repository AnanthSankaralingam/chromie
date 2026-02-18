import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function useProjectSetup(user, isLoading) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isSettingUpProject, setIsSettingUpProject] = useState(false)
  const [projectSetupError, setProjectSetupError] = useState(null)
  const [currentProjectId, setCurrentProjectId] = useState(null)
  const [currentProjectName, setCurrentProjectName] = useState('')
  const [currentProjectHasGithubRepo, setCurrentProjectHasGithubRepo] = useState(false)
  const [isProjectLimitModalOpen, setIsProjectLimitModalOpen] = useState(false)
  const [projectLimitDetails, setProjectLimitDetails] = useState(null)
  const [isTokenLimitModalOpen, setIsTokenLimitModalOpen] = useState(false)
  const hasSetupRunRef = useRef(false) // Prevent duplicate setup calls

  // Cache for project details to avoid duplicate fetches
  const projectDetailsCache = useRef(new Map())

  const FETCH_TIMEOUT_MS = 15000

  const fetchWithTimeout = async (url, options = {}) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const response = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timeoutId)
      return response
    } catch (err) {
      clearTimeout(timeoutId)
      throw err
    }
  }

  // Helper function to fetch project details with caching
  const fetchProjectDetails = async (projectId, skipCache = false) => {
    // Return cached data if available and not skipping cache
    if (!skipCache && projectDetailsCache.current.has(projectId)) {
      return projectDetailsCache.current.get(projectId)
    }

    try {
      const response = await fetchWithTimeout(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        const project = data.project
        // Cache the result
        projectDetailsCache.current.set(projectId, project)
        return project
      }
    } catch (error) {
      console.error('Error fetching project details:', error)
    }
    return null
  }

  // Public: refresh current project's details (e.g., name/description) from API
  const refreshCurrentProjectDetails = async () => {
    try {
      if (!currentProjectId) return
      // Skip cache to force fresh fetch from API
      const project = await fetchProjectDetails(currentProjectId, true)
      if (project) {
        setCurrentProjectName(project.name)
        setCurrentProjectHasGithubRepo(!!project.github_repo_full_name)
      }
    } catch (error) {
      console.error('Error refreshing current project details:', error)
    }
  }

  const createDefaultProject = async () => {
    try {
      console.log('Creating default project...')
      const response = await fetchWithTimeout('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'My First Extension',
          description: 'A Chrome extension built with chromie AI'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        if (response.status === 403 && errorData.error === "Project limit reached") {
          setProjectLimitDetails(errorData.details)
          setIsProjectLimitModalOpen(true)
          setIsSettingUpProject(false)
          return
        } else if (response.status === 403 && (errorData.error === 'Token usage limit exceeded' || (errorData.error || '').toLowerCase().includes('token usage'))) {
          setIsTokenLimitModalOpen(true)
          setIsSettingUpProject(false)
          return
        }
        
        console.error('Failed to create default project:', errorData)
        setProjectSetupError(`Failed to create project: ${errorData.error}`)
        setIsSettingUpProject(false)
        return
      }

      const data = await response.json()
      const newProject = data.project

      console.log('Created new project:', newProject.id)
      
      setCurrentProjectId(newProject.id)
      setCurrentProjectName(newProject.name)
      setCurrentProjectHasGithubRepo(false)
      sessionStorage.setItem('chromie_current_project_id', newProject.id)
      setIsSettingUpProject(false)
    } catch (error) {
      console.error('Error creating default project:', error)
      const isTimeout = error?.name === 'AbortError'
      setProjectSetupError(isTimeout ? 'Request timed out. Please try again.' : 'Failed to create project')
      setIsSettingUpProject(false)
    }
  }

  const checkAndSetupProject = async (forceRetry = false) => {
    // Check if we have a project ID in URL state (from navigation)
    const urlParams = new URLSearchParams(window.location.search)
    const projectIdFromUrl = urlParams.get('project')
    
    // Check if we have a project ID in session storage
    const storedProjectId = sessionStorage.getItem('chromie_current_project_id')
    
    // Priority: URL parameter > session storage > most recent project
    if (projectIdFromUrl) {
      try {
        console.log('Using project ID from URL:', projectIdFromUrl)
        setCurrentProjectId(projectIdFromUrl)
        sessionStorage.setItem('chromie_current_project_id', projectIdFromUrl)
        const projectDetails = await fetchProjectDetails(projectIdFromUrl)
        if (projectDetails) {
          setCurrentProjectName(projectDetails.name)
          setCurrentProjectHasGithubRepo(!!projectDetails.github_repo_full_name)
        }
        setIsSettingUpProject(false)
        setProjectSetupError(null)
      } catch (err) {
        console.error('Error loading project from URL:', err)
        const isTimeout = err?.name === 'AbortError'
        setProjectSetupError(isTimeout ? 'Request timed out. Please try again.' : 'Failed to load project')
        setIsSettingUpProject(false)
      }
      return
    }

    if (storedProjectId) {
      try {
        setCurrentProjectId(storedProjectId)
        const projectDetails = await fetchProjectDetails(storedProjectId)
        if (projectDetails) {
          setCurrentProjectName(projectDetails.name)
          setCurrentProjectHasGithubRepo(!!projectDetails.github_repo_full_name)
        }
        setIsSettingUpProject(false)
        setProjectSetupError(null)
      } catch (err) {
        console.error('Error loading stored project:', err)
        const isTimeout = err?.name === 'AbortError'
        setProjectSetupError(isTimeout ? 'Request timed out. Please try again.' : 'Failed to load project')
        setIsSettingUpProject(false)
      }
      return
    }

    // Prevent infinite loops - only try once (unless force retry from error state)
    if (!forceRetry && projectSetupError) {
      return
    }

    setIsSettingUpProject(true)
    setProjectSetupError(null)

    try {
      const response = await fetchWithTimeout('/api/projects')
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to fetch projects:', errorText)
        setProjectSetupError('Failed to load projects')
        setIsSettingUpProject(false)
        return
      }

      const data = await response.json()
      const projects = data.projects || []

      if (projects.length > 0) {
        const mostRecentProject = projects[0]
        console.log('Using existing project:', mostRecentProject.id)
        setCurrentProjectId(mostRecentProject.id)
        setCurrentProjectName(mostRecentProject.name)
        setCurrentProjectHasGithubRepo(!!mostRecentProject.github_repo_full_name)
        sessionStorage.setItem('chromie_current_project_id', mostRecentProject.id)
      } else {
        await createDefaultProject()
      }
    } catch (error) {
      console.error('Error checking/setting up project:', error)
      const isTimeout = error?.name === 'AbortError'
      setProjectSetupError(isTimeout ? 'Request timed out. Please try again.' : 'Failed to set up project')
      setIsSettingUpProject(false)
      if (forceRetry) hasSetupRunRef.current = false
    }
  }

  // Re-run when URL project param changes (e.g. router.push from pending_prompt)
  const projectIdFromUrl = searchParams?.get('project') ?? null

  // Check for project and create one if needed
  useEffect(() => {
    if (!user || isLoading) {
      if (!user) {
        hasSetupRunRef.current = false
        projectDetailsCache.current.clear()
      }
      return
    }
    // Skip when pending_prompt is being processed (home/builder will create project)
    if (typeof window !== 'undefined' && sessionStorage.getItem('pending_prompt')) {
      return
    }
    // Allow re-run when URL has a new project (e.g. after pending_prompt redirect)
    if (projectIdFromUrl && projectIdFromUrl !== currentProjectId) {
      hasSetupRunRef.current = false
    }
    if (!hasSetupRunRef.current) {
      hasSetupRunRef.current = true
      checkAndSetupProject()
    }
  }, [user, isLoading, projectIdFromUrl, currentProjectId])

  const handleUpgradePlan = () => {
    setIsProjectLimitModalOpen(false)
    router.push('/pricing')
  }

  const handleManageProjects = () => {
    setIsProjectLimitModalOpen(false)
  }

  return {
    isSettingUpProject,
    projectSetupError,
    currentProjectId,
    currentProjectName,
    currentProjectHasGithubRepo,
    isProjectLimitModalOpen,
    projectLimitDetails,
    setProjectLimitDetails,
    setIsProjectLimitModalOpen,
    isTokenLimitModalOpen,
    setIsTokenLimitModalOpen,
    handleUpgradePlan,
    handleManageProjects,
    setProjectSetupError,
    checkAndSetupProject,
    refreshCurrentProjectDetails
  }
} 