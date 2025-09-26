import { useState } from "react"

export default function useDownloadExtension(currentProjectId, currentProjectName, fileStructure) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownloadZip = async () => {
    if (!currentProjectId) {
      console.error("No project available for download")
      return
    }

    setIsDownloading(true)

    try {
      // Download from backend API which will materialize icons from shared_icons
      const response = await fetch(`/api/projects/${currentProjectId}/download`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Download failed')
      }

      // Get the zip blob from the response
      const zipBlob = await response.blob()

      // Create download link
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      
      // Create filename with project name
      const safeProjectName = currentProjectName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()
      link.download = `chromie-ext-${safeProjectName}.zip`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up
      URL.revokeObjectURL(url)
      
      console.log("ZIP file downloaded successfully with icons materialized from shared_icons")
    } catch (error) {
      console.error("Error downloading ZIP file:", error)
      alert(`Download failed: ${error.message}`)
    } finally {
      setIsDownloading(false)
    }
  }

  return {
    isDownloading,
    handleDownloadZip
  }
} 