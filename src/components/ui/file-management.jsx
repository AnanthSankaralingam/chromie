import { useState, useEffect, useRef, useCallback } from "react"

export default function useFileManagement(currentProjectId, user) {
  const [fileStructure, setFileStructure] = useState([])
  const [flatFiles, setFlatFiles] = useState([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [loadedProjectId, setLoadedProjectId] = useState(null) // Track which project's files are loaded
  const isLoadingRef = useRef(false) // Prevent concurrent loads

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
            // This is a file - preserve all metadata including asset info
            current[part] = {
              name: part,
              type: "file",
              content: file.content,
              fullPath: file.file_path,
              file_path: file.file_path,
              isAsset: file.isAsset || false,
              assetId: file.assetId,
              mime_type: file.mime_type,
              file_size: file.file_size
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
        name: manifest.name || ' chromie Chrome Extension',
        description: manifest.description || 'A Chrome extension built with chromie'
      }
    } catch (error) {
      console.error('Error parsing manifest.json:', error)
      return null
    }
  }

  // Helper function to update project with extension info
  // Note: Project name and description are now automatically updated during code generation
  // This function is kept for compatibility but no longer makes API calls
  const updateProjectWithExtensionInfo = async (extensionInfo) => {
    if (!extensionInfo || !currentProjectId) return
    
  }

  const loadProjectFiles = useCallback(async (refreshFromServer = false) => {
    if (!currentProjectId) {
      console.error("No project ID available for loading files")
      return
    }

    // Skip loading if we already have files for this project (unless refreshing from server)
    if (!refreshFromServer && loadedProjectId === currentProjectId && fileStructure.length > 0) {
      return
    }

    // Prevent concurrent loads
    if (isLoadingRef.current) {
      return
    }

    isLoadingRef.current = true
    setIsLoadingFiles(true)
    try {
      // Fetch code files
      const filesResponse = await fetch(`/api/projects/${currentProjectId}/files`)
      
      if (!filesResponse.ok) {
        const errorData = await filesResponse.json()
        console.error("Error loading project files:", errorData.error)
        return
      }

      const filesData = await filesResponse.json()
      const codeFiles = filesData.files || []

      // Fetch project assets
      let assetFiles = []
      try {
        const assetsResponse = await fetch(`/api/projects/${currentProjectId}/assets`)
        if (assetsResponse.ok) {
          const assetsData = await assetsResponse.json()
          // Transform assets to match code_files format (with a marker for assets)
          assetFiles = (assetsData.assets || []).map(asset => ({
            file_path: asset.file_path,
            content: `[Asset: ${asset.mime_type}, ${Math.round(asset.file_size / 1024)}KB]`,
            isAsset: true,
            assetId: asset.id,
            mime_type: asset.mime_type,
            file_size: asset.file_size,
          }))
        }
      } catch (assetsError) {
        console.warn("Error loading project assets:", assetsError)
        // Continue without assets - not critical
      }

      // Combine code files and assets
      const allFiles = [...codeFiles, ...assetFiles]

      // Store both flat files for actions and transformed tree for display
      setFlatFiles(allFiles)
      const transformedFiles = transformFilesToTree(allFiles)
      setFileStructure(transformedFiles)
      setLoadedProjectId(currentProjectId) // Mark this project as loaded
      
      
      // Debug manifest.json specifically
      const manifestFile = allFiles.find(file => file.file_path === 'manifest.json')
      if (manifestFile) {
      }

      // Extract and update project with extension info from manifest.json
      const extensionInfo = extractExtensionInfo(allFiles)
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
      isLoadingRef.current = false
    }
  }, [currentProjectId, loadedProjectId])

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

    } catch (error) {
      console.error('Error saving file:', error)
      throw error
    }
  }

  // Function to delete an asset
  const handleAssetDelete = async (file) => {
    if (!file || !file.isAsset || !currentProjectId) {
      console.error('Invalid file or no project ID available')
      return
    }

    // Prevent concurrent delete operations
    if (isLoadingRef.current) {
      console.warn('Already loading, skipping delete')
      return
    }

    try {
      const response = await fetch(`/api/projects/${currentProjectId}/assets`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: file.file_path
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to delete asset')
      }

      console.log(`Deleted asset: ${file.file_path}`)
      
      // Refresh the file list to reflect the deletion
      await loadProjectFiles(true)
      
    } catch (error) {
      console.error('Error deleting asset:', error)
      throw error
    }
  }

  // Function to find and return the manifest.json file
  const findManifestFile = () => {
    
    const findFileInTree = (items) => {
      for (const item of items) {
        if (item.type === 'file' && item.name === 'manifest.json') {
          return item
        } else if (item.type === 'folder' && item.children) {
          const found = findFileInTree(item.children)
          if (found) return found
        }
      }
      return null
    }
    
    const result = findFileInTree(fileStructure)
    if (!result) {
    }
    return result
  }

  // Only load files when switching to a new project
  useEffect(() => {
    if (currentProjectId && user && loadedProjectId !== currentProjectId && !isLoadingRef.current) {
      loadProjectFiles()
    }
  }, [currentProjectId, user, loadedProjectId, loadProjectFiles])

  return {
    fileStructure,
    flatFiles,
    isLoadingFiles,
    loadProjectFiles,
    handleFileSave,
    handleAssetDelete,
    extractExtensionInfo,
    updateProjectWithExtensionInfo,
    findManifestFile
  }
} 