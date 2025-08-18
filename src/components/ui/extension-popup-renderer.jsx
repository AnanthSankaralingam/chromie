"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Play, Settings, Bookmark, Download, ToggleLeft, ToggleRight, Bell, Layers, Monitor, Palette, Zap, Wifi } from "lucide-react"

function ExtensionPopupRenderer({ 
  extensionFiles = [], 
  onRenderStateChange
}) {
  const [popupContent, setPopupContent] = useState(null)
  const [popupStyles, setPopupStyles] = useState("")
  const iframeRef = useRef(null)

  useEffect(() => {
    console.log("ExtensionPopupRenderer received files:", extensionFiles.length)
    
    if (extensionFiles.length > 0) {
      parseExtensionFiles()
      onRenderStateChange?.(true)
    } else {
      onRenderStateChange?.(false)
    }
  }, [extensionFiles, onRenderStateChange])

  const parseExtensionFiles = () => {
    const popupHTML = extensionFiles.find(f => f.file_path === 'popup.html')
    const sidePanelHTML = extensionFiles.find(f => f.file_path === 'sidepanel.html')
    const popupCSS = extensionFiles.find(f => f.file_path === 'popup.css' || f.file_path === 'styles.css')
    const contentJS = extensionFiles.find(f => f.file_path === 'content.js')
    const manifest = extensionFiles.find(f => f.file_path === 'manifest.json')

    console.log("Found extension files:", {
      popup: !!popupHTML,
      sidePanel: !!sidePanelHTML,
      content: !!contentJS,
      css: !!popupCSS,
      manifest: !!manifest
    })

    if (popupHTML) {
      // Handle popup-based extensions
      renderPopupInterface(popupHTML, popupCSS)
    } else if (sidePanelHTML) {
      // Handle side panel extensions
      renderSidePanelInterface(sidePanelHTML, popupCSS)
    } else if (contentJS) {
      // Handle overlay/content script extensions
      generateOverlayInterface(contentJS, manifest)
    } else {
      // Generate a default interface based on manifest
      generateDefaultInterface(manifest)
    }
  }

  const renderPopupInterface = (popupHTML, popupCSS) => {
    let content = popupHTML.content
    
    // Remove script tags for security and replace with our action buttons
    content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    
    // Add CSS if available
    if (popupCSS) {
      const styleTag = `<style>${popupCSS.content}</style>`
      content = content.replace('</head>', `${styleTag}</head>`)
    }
    
    // Add base styling
    const baseStyles = getBasePopupStyles()
    content = content.replace('</head>', `${baseStyles}</head>`)
    
    setPopupContent(content)
  }

  const renderSidePanelInterface = (sidePanelHTML, popupCSS) => {
    let content = sidePanelHTML.content
    
    // Remove script tags for security
    content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    
    // Add CSS if available
    if (popupCSS) {
      const styleTag = `<style>${popupCSS.content}</style>`
      content = content.replace('</head>', `${styleTag}</head>`)
    }
    
    // Add base styling optimized for side panel preview
    const baseStyles = getBaseSidePanelStyles()
    content = content.replace('</head>', `${baseStyles}</head>`)
    
    setPopupContent(content)
  }

  const generateOverlayInterface = (contentJS, manifest) => {
    let extensionName = "Overlay Extension"
    let extensionDescription = "This extension injects content directly into web pages"
    let overlayFeatures = []

    if (manifest) {
      try {
        const manifestContent = JSON.parse(manifest.content)
        extensionName = manifestContent.name || extensionName
        extensionDescription = manifestContent.description || extensionDescription
        
        // Extract features from content script
        if (contentJS) {
          const contentCode = contentJS.content
          overlayFeatures = extractOverlayFeatures(contentCode)
        }
      } catch (error) {
        console.error("Error parsing manifest for overlay interface:", error)
      }
    }

    const overlayInterface = generateOverlayHTML(extensionName, extensionDescription, overlayFeatures)
    setPopupContent(overlayInterface)
  }

  const generateDefaultInterface = (manifest) => {
    let extensionName = "Chrome Extension"
    let extensionDescription = "Background extension functionality"

    if (manifest) {
      try {
        const manifestContent = JSON.parse(manifest.content)
        extensionName = manifestContent.name || extensionName
        extensionDescription = manifestContent.description || extensionDescription
      } catch (error) {
        console.error("Error parsing manifest for default interface:", error)
      }
    }

    const defaultInterface = generateBackgroundExtensionHTML(extensionName, extensionDescription)
    setPopupContent(defaultInterface)
  }

  const extractOverlayFeatures = (contentCode) => {
    const features = []
    
    // Look for common overlay patterns
    if (contentCode.includes('createOverlayElement') || contentCode.includes('overlay')) {
      features.push('Creates overlay UI on web pages')
    }
    if (contentCode.includes('MutationObserver')) {
      features.push('Monitors page changes dynamically')
    }
    if (contentCode.includes('addEventListener')) {
      features.push('Interactive elements and event handling')
    }
    if (contentCode.includes('setInterval') || contentCode.includes('setTimeout')) {
      features.push('Automatic or timed functionality')
    }
    if (contentCode.includes('chrome.runtime.sendMessage') || contentCode.includes('chrome.tabs')) {
      features.push('Communicates with extension background')
    }
    
    return features.length > 0 ? features : ['Injects custom functionality into web pages']
  }

  const getBasePopupStyles = () => `
    <style>
      body {
        margin: 0;
        padding: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        color: #333;
        background: white;
        width: 300px;
        min-height: 200px;
        box-sizing: border-box;
      }
    </style>
  `

  const getBaseSidePanelStyles = () => `
    <style>
      body {
        margin: 0;
        padding: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        color: #333;
        background: white;
        width: 320px;
        min-height: 300px;
        box-sizing: border-box;
      }
      h1, h2, h3 { margin-top: 0; }
    </style>
  `

  const generateOverlayHTML = (extensionName, extensionDescription, features) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          margin: 0;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.4;
          color: #333;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          width: 300px;
          min-height: 250px;
          box-sizing: border-box;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.2);
        }
        .title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .description {
          font-size: 12px;
          color: rgba(255,255,255,0.9);
        }
        .type-badge {
          display: inline-block;
          background: rgba(255,255,255,0.2);
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          margin-top: 8px;
        }
        .features {
          margin-top: 16px;
        }
        .feature-list {
          list-style: none;
          padding: 0;
          margin: 8px 0;
        }
        .feature-list li {
          padding: 4px 0;
          font-size: 12px;
          color: rgba(255,255,255,0.9);
        }
        .feature-list li:before {
          content: "•";
          color: #4CAF50;
          margin-right: 8px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${extensionName}</div>
        <div class="description">${extensionDescription}</div>
        <div class="type-badge">Overlay Extension</div>
      </div>
      <div class="features">
        <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px;">Features:</div>
        <ul class="feature-list">
          ${features.map(feature => `<li>${feature}</li>`).join('')}
        </ul>
      </div>
      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.2); text-align: center; font-size: 11px; color: rgba(255,255,255,0.7);">
        This extension works by injecting content directly into web pages. Use the action buttons below to test its functionality.
      </div>
    </body>
    </html>
  `

  const generateBackgroundExtensionHTML = (extensionName, extensionDescription) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          margin: 0;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.4;
          color: #333;
          background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%);
          color: white;
          width: 300px;
          min-height: 200px;
          box-sizing: border-box;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.2);
        }
        .title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .description {
          font-size: 12px;
          color: rgba(255,255,255,0.9);
        }
        .type-badge {
          display: inline-block;
          background: rgba(255,255,255,0.2);
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          margin-top: 8px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${extensionName}</div>
        <div class="description">${extensionDescription}</div>
        <div class="type-badge">Background Extension</div>
      </div>
      <div style="text-align: center; margin-top: 20px; font-size: 12px; color: rgba(255,255,255,0.9);">
        <p>This extension runs in the background and doesn't have a visible popup interface.</p>
        <p>Use the action buttons below to trigger its functionality.</p>
      </div>
    </body>
    </html>
  `

  const generateDefaultPopup = () => {
    const manifest = extensionFiles.find(f => f.file_path === 'manifest.json')
    let extensionName = "Chrome Extension"
    let extensionDescription = "Extension functionality"

    if (manifest) {
      try {
        const manifestContent = JSON.parse(manifest.content)
        extensionName = manifestContent.name || extensionName
        extensionDescription = manifestContent.description || extensionDescription
      } catch (error) {
        console.error("Error parsing manifest for default popup:", error)
      }
    }

    const defaultPopup = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            margin: 0;
            padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.4;
            color: #333;
            background: white;
            width: 300px;
            min-height: 200px;
            box-sizing: border-box;
          }
          .header {
            text-align: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #eee;
          }
          .title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 4px;
          }
          .description {
            font-size: 12px;
            color: #666;
          }
          .extension-actions {
            margin-top: 16px;
          }
          .action-button {
            width: 100%;
            padding: 8px 12px;
            margin-bottom: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: #f8f9fa;
            cursor: pointer;
            transition: background-color 0.2s;
            text-align: left;
            font-size: 12px;
          }
          .action-button:hover {
            background: #e9ecef;
          }
          .action-button:last-child {
            margin-bottom: 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${extensionName}</div>
          <div class="description">${extensionDescription}</div>
        </div>
        <div class="content">
          <p style="font-size: 12px; color: #666; text-align: center;">
            No popup.html found. This is a generated interface based on your extension's capabilities.
          </p>
        </div>
      </body>
      </html>
    `

    setPopupContent(defaultPopup)
  }



  if (!popupContent) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <Settings className="h-8 w-8 mx-auto" />
          </div>
          <p className="text-sm text-gray-500">No popup interface available</p>
          <p className="text-xs text-gray-400 mt-1">Extension may use content scripts or background functionality</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Popup Iframe */}
      <div className="flex-1 min-h-0 p-4 overflow-auto">
        <div className="border border-gray-200 rounded-lg overflow-auto shadow-sm">
          <iframe
            ref={iframeRef}
            srcDoc={popupContent}
            className="w-full border-0"
            sandbox="allow-same-origin"
            title="Extension Popup Preview"
            style={{ 
              background: 'white',
              minHeight: '400px',
              height: 'auto'
            }}
          />
        </div>
      </div>
    </div>
  )
}

// Separate component for header buttons
export function ExtensionActionButtons({ popupActions = [], onAction }) {
  const [isToggled, setIsToggled] = useState(false)
  
  if (popupActions.length === 0) {
    return null
  }

  return (
    <div className="flex items-center space-x-2">
      {popupActions.map((action) => (
        <Button
          key={action.id}
          variant="outline"
          size="sm"
          className="text-xs px-2 py-1 h-7 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
          onClick={() => {
            if (action.id === 'toggle_feature') {
              setIsToggled(!isToggled)
            }
            onAction?.(action)
          }}
          title={action.description}
        >
          <div className="flex items-center space-x-1">
            {action.type === 'test_action' && <Wifi className="h-3 w-3 text-blue-600" />}
            {action.type === 'extension_action' && <Zap className="h-3 w-3 text-purple-600" />}
            <span>{action.label}</span>
          </div>
        </Button>
      ))}
    </div>
  )
}

export default ExtensionPopupRenderer
