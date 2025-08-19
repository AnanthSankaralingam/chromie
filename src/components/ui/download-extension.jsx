import { useState } from "react"
import JSZip from 'jszip'

export default function useDownloadExtension(currentProjectId, currentProjectName, fileStructure) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownloadZip = async () => {
    if (!currentProjectId || fileStructure.length === 0) {
      console.error("No project or files available for download")
      return
    }

    setIsDownloading(true)

    try {
      // Create a new JSZip instance
      const zip = new JSZip()

      // Helper function to add files to zip recursively
      const addFilesToZip = (items, zipFolder = zip) => {
        items.forEach(item => {
          if (item.type === "file") {
            // Check if this is an icon file (base64 encoded)
            if (item.fullPath && item.fullPath.startsWith('icons/') && item.fullPath.match(/\.(png|ico)$/i)) {
              try {
                // Convert base64 back to binary for icon files
                const binaryContent = atob(item.content)
                const bytes = new Uint8Array(binaryContent.length)
                for (let i = 0; i < binaryContent.length; i++) {
                  bytes[i] = binaryContent.charCodeAt(i)
                }
                zipFolder.file(item.name, bytes)
                console.log(`Added icon file: ${item.name}`)
              } catch (iconError) {
                console.warn(`Failed to process icon ${item.name}:`, iconError)
                // Fallback to text content if base64 conversion fails
                zipFolder.file(item.name, item.content)
              }
            } else {
              // Regular text file
              zipFolder.file(item.name, item.content)
            }
          } else if (item.type === "folder" && item.children) {
            // Create folder in zip and add its contents
            const folder = zipFolder.folder(item.name)
            addFilesToZip(item.children, folder)
          }
        })
      }

      // Add all files to the zip
      addFilesToZip(fileStructure)

      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: "blob" })

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
      
      console.log("ZIP file downloaded successfully")
    } catch (error) {
      console.error("Error creating ZIP file:", error)
    } finally {
      setIsDownloading(false)
    }
  }

  return {
    isDownloading,
    handleDownloadZip
  }
} 