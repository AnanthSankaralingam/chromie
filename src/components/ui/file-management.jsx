import { useState, useEffect } from "react"

export default function useFileManagement(currentProjectId, user) {
  const [fileStructure, setFileStructure] = useState([])
  const [flatFiles, setFlatFiles] = useState([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)

  // Helper function to transform flat file list into tree structure
  const transformFilesToTree = (files) => {
    const tree = {}
    const result = []

    // First, create all files and folders
    files.forEach(file => {
      const pathParts = file.file_path.split('/')
      let current = tree

      pathParts.forEach((part, index) => {
        if (!current[part]) {
          if (index === pathParts.length - 1) {
            // This is a file
            current[part] = {
              name: part,
              type: "file",
              content: file.content,
              fullPath: file.file_path
            }
          } else {
            // This is a folder
            const folderPath = pathParts.slice(0, index + 1).join('/')
            current[part] = {
              name: part,
              type: "folder",
              children: {},
              fullPath: folderPath
            }
          }
        }
        current = current[part].children || current[part]
      })
    })

    // Convert tree structure to array format
    const convertToArray = (obj) => {
      return Object.values(obj).map(item => {
        if (item.type === "folder" && item.children) {
          return {
            ...item,
            children: convertToArray(item.children)
          }
        }
        return item
      })
    }

    return convertToArray(tree)
  }

  // Helper function to extract extension info from manifest.json
  const extractExtensionInfo = (files) => {
    const manifestFile = files.find(file => file.file_path === 'manifest.json')
    if (!manifestFile) return null

    try {
      const manifest = JSON.parse(manifestFile.content)
      return {
        name: manifest.name || 'Chrome Extension',
        description: manifest.description || 'A Chrome extension built with Chromie AI'
      }
    } catch (error) {
      console.error('Error parsing manifest.json:', error)
      return null
    }
  }

  // Helper function to update project with extension info
  const updateProjectWithExtensionInfo = async (extensionInfo) => {
    if (!extensionInfo || !currentProjectId) return

    try {
      const response = await fetch(`/api/projects/${currentProjectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: extensionInfo.name,
          description: extensionInfo.description
        }),
      })

      if (!response.ok) {
        console.error('Failed to update project with extension info')
      }
    } catch (error) {
      console.error('Error updating project with extension info:', error)
    }
  }

  const loadProjectFiles = async () => {
    if (!currentProjectId) {
      console.error("No project ID available for loading files")
      return
    }

    setIsLoadingFiles(true)
    try {
      const response = await fetch(`/api/projects/${currentProjectId}/files`)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error loading project files:", errorData.error)
        return
      }

      const data = await response.json()
      const files = data.files || []

      // Store both flat files for actions and transformed tree for display
      setFlatFiles(files)
      const transformedFiles = transformFilesToTree(files)
      setFileStructure(transformedFiles)

      // Extract and update project with extension info from manifest.json
      const extensionInfo = extractExtensionInfo(files)
      if (extensionInfo) {
        // Check if we need to update (avoid unnecessary updates)
        const lastUpdateKey = `last_project_update_${currentProjectId}`
        const lastUpdate = sessionStorage.getItem(lastUpdateKey)
        const now = Date.now()
        
        // Only update if it's been more than 5 minutes since last update
        if (!lastUpdate || (now - parseInt(lastUpdate)) > 5 * 60 * 1000) {
          await updateProjectWithExtensionInfo(extensionInfo)
          sessionStorage.setItem(lastUpdateKey, now.toString())
        }
      }
    } catch (error) {
      console.error("Error loading project files:", error)
    } finally {
      setIsLoadingFiles(false)
    }
  }

  const handleFileSave = async (selectedFile, content) => {
    if (!selectedFile || !currentProjectId) {
      console.error('No file selected or project ID available')
      return
    }

    try {
      const response = await fetch(`/api/projects/${currentProjectId}/files`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: selectedFile.fullPath,
          content: content
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save file')
      }

      // Update the file content in the local state
      setFileStructure(prevStructure => {
        const updateFileInTree = (items) => {
          return items.map(item => {
            if (item.type === 'file' && item.fullPath === selectedFile.fullPath) {
              return { ...item, content: content }
            } else if (item.type === 'folder' && item.children) {
              return { ...item, children: updateFileInTree(item.children) }
            }
            return item
          })
        }
        return updateFileInTree(prevStructure)
      })

      console.log('File saved successfully:', selectedFile.name)
    } catch (error) {
      console.error('Error saving file:', error)
      throw error
    }
  }

  // Load project files when currentProjectId is available
  useEffect(() => {
    if (currentProjectId && user) {
      loadProjectFiles()
    }
  }, [currentProjectId, user])

  return {
    fileStructure,
    flatFiles,
    isLoadingFiles,
    loadProjectFiles,
    handleFileSave,
    extractExtensionInfo,
    updateProjectWithExtensionInfo
  }
} 