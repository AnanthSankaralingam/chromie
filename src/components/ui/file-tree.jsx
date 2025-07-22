"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from "lucide-react"

export default function FileTree({ files, onFileSelect, selectedFile }) {
  const [expandedFolders, setExpandedFolders] = useState({
    scripts: true,
    styles: true,
  })

  const toggleFolder = (folderName) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }))
  }

  const renderFileTree = (items, level = 0) => {
    return items.map((item, index) => (
      <div key={index} style={{ marginLeft: `${level * 16}px` }}>
        {item.type === "folder" ? (
          <div>
            <div
              className="flex items-center py-1 px-2 hover:bg-slate-700 cursor-pointer rounded transition-colors"
              onClick={() => toggleFolder(item.name)}
            >
              {expandedFolders[item.name] ? (
                <ChevronDown className="h-4 w-4 mr-1 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-1 text-slate-400" />
              )}
              {expandedFolders[item.name] ? (
                <FolderOpen className="h-4 w-4 mr-2 text-blue-400" />
              ) : (
                <Folder className="h-4 w-4 mr-2 text-blue-400" />
              )}
              <span className="text-sm text-slate-300 select-none">{item.name}</span>
            </div>
            {expandedFolders[item.name] && item.children && <div>{renderFileTree(item.children, level + 1)}</div>}
          </div>
        ) : (
          <div
            className={`flex items-center py-1 px-2 hover:bg-slate-700 cursor-pointer rounded transition-colors ${
              selectedFile?.name === item.name ? "bg-slate-700" : ""
            }`}
            onClick={() => onFileSelect(item)}
          >
            <File className="h-4 w-4 mr-2 text-slate-400" />
            <span className="text-sm text-slate-300 select-none">{item.name}</span>
          </div>
        )}
      </div>
    ))
  }

  return <div className="space-y-1">{renderFileTree(files)}</div>
}
