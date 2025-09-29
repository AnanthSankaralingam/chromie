import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function useProjectSetup(user, isLoading) {
  const router = useRouter()
  const [isSettingUpProject, setIsSettingUpProject] = useState(false)
  const [projectSetupError, setProjectSetupError] = useState(null)
  const [currentProjectId, setCurrentProjectId] = useState(null)
  const [currentProjectName, setCurrentProjectName] = useState('')
  const [isProjectLimitModalOpen, setIsProjectLimitModalOpen] = useState(false)
  const [projectLimitDetails, setProjectLimitDetails] = useState(null)
  const [isTokenLimitModalOpen, setIsTokenLimitModalOpen] = useState(false)

  // Helper function to fetch project details
  const fetchProjectDetails = async (projectId) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        return data.project
      }
    } catch (error) {
      console.error('Error fetching project details:', error)
    }
    return null
  }

  const createDefaultProject = async () => {
    try {
      console.log('Creating default project...')
      const response = await fetch('/api/projects', {
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
      sessionStorage.setItem('chromie_current_project_id', newProject.id)
      setIsSettingUpProject(false)
    } catch (error) {
      console.error('Error creating default project:', error)
      setProjectSetupError('Failed to create project')
      setIsSettingUpProject(false)
    }
  }

  const checkAndSetupProject = async () => {
    // Check if we have a project ID in URL state (from navigation)
    const urlParams = new URLSearchParams(window.location.search)
    const projectIdFromUrl = urlParams.get('project')
    
    // Check if we have a project ID in session storage
    const storedProjectId = sessionStorage.getItem('chromie_current_project_id')
    
    // Priority: URL parameter > session storage > most recent project
    if (projectIdFromUrl) {
      console.log('Using project ID from URL:', projectIdFromUrl)
      setCurrentProjectId(projectIdFromUrl)
      sessionStorage.setItem('chromie_current_project_id', projectIdFromUrl)
      const projectDetails = await fetchProjectDetails(projectIdFromUrl)
      if (projectDetails) {
        setCurrentProjectName(projectDetails.name)
      }
      setIsSettingUpProject(false)
      setProjectSetupError(null)
      return
    }
    
    if (storedProjectId) {
      setCurrentProjectId(storedProjectId)
      const projectDetails = await fetchProjectDetails(storedProjectId)
      if (projectDetails) {
        setCurrentProjectName(projectDetails.name)
      }
      setIsSettingUpProject(false)
      setProjectSetupError(null)
      return
    }

    // Prevent infinite loops - only try once
    if (projectSetupError) {
      return
    }

    setIsSettingUpProject(true)
    setProjectSetupError(null)

    try {
      const response = await fetch('/api/projects')
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
        sessionStorage.setItem('chromie_current_project_id', mostRecentProject.id)
      } else {
        await createDefaultProject()
      }
    } catch (error) {
      console.error('Error checking/setting up project:', error)
      setProjectSetupError('Failed to set up project')
      setIsSettingUpProject(false)
    }
  }

  // Check for project and create one if needed
  useEffect(() => {
    if (user && !isLoading) {
      checkAndSetupProject()
    }
  }, [user, isLoading])

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
    isProjectLimitModalOpen,
    projectLimitDetails,
    setProjectLimitDetails,
    setIsProjectLimitModalOpen,
    isTokenLimitModalOpen,
    setIsTokenLimitModalOpen,
    handleUpgradePlan,
    handleManageProjects,
    setProjectSetupError,
    checkAndSetupProject
  }
} 