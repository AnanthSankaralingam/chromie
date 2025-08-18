// BrowserBase integration service using official SDK
import Browserbase from "@browserbasehq/sdk"
import fs from "fs"
import os from "os"
import path from "path"
import JSZip from "jszip"

export class BrowserBaseService {
  constructor() {
    this.apiKey = process.env.BROWSERBASE_API_KEY
    this.projectId = process.env.BROWSERBASE_PROJECT_ID
    this.baseUrl = process.env.BROWSERBASE_API_URL || "https://api.browserbase.com"
    this.client = new Browserbase({ apiKey: this.apiKey })
  }

  /**
   * Create a new browser session with extension loaded
   * @param {Object} extensionFiles - The extension files to load
   * @param {string} projectId - Project identifier
   * @returns {Promise<Object>} Session details including iframe URL
   */
  async createTestSession(extensionFiles = {}, projectId) {
    try {
      const resolvedProjectId = projectId || this.projectId
      console.log("Resolved project ID:", resolvedProjectId)
      
      if (!this.apiKey) {
        throw new Error("Missing BROWSERBASE_API_KEY")
      }
      if (!resolvedProjectId) {
        throw new Error("Missing Browserbase projectId (BROWSERBASE_PROJECT_ID)")
      }

      // If extension files were provided, zip and upload them to get an extensionId
      let extensionId = null
      const filesArray = Array.isArray(extensionFiles)
        ? extensionFiles
        : typeof extensionFiles === "object" && Object.keys(extensionFiles).length > 0
          ? Object.entries(extensionFiles).map(([file_path, content]) => ({ file_path, content }))
          : []

      if (filesArray.length > 0) {
        console.log("Uploading extension from files:", filesArray.length)
        extensionId = await this.uploadExtensionFromFiles(filesArray)
        console.log("Uploaded extensionId:", extensionId)
      }

      // Create a new Browserbase session with optional extension loaded
      console.log("Creating session with project ID:", resolvedProjectId, "extensionId:", extensionId)
      const sessionCreatePayload = {
        projectId: resolvedProjectId,
        browserSettings: {
          viewport: { width: 1280, height: 720 },
          blockAds: false,
          solveCaptchas: true,
          recordSession: true,
          logSession: true,
        },
      }
      if (extensionId) {
        // According to Browserbase docs
        sessionCreatePayload.extensionId = extensionId
      }

      const session = await this.client.sessions.create(sessionCreatePayload)
      
      console.log("Session created!")


      // Fetch Live View URLs for embedding the interactive browser (retry briefly until ready)
      let liveViewLinks = null
      let liveViewUrl = null
      for (let attempt = 0; attempt < 5; attempt += 1) {
        // eslint-disable-next-line no-await-in-loop
        liveViewLinks = await this.client.sessions.debug(session.id)
        liveViewUrl = liveViewLinks?.debuggerFullscreenUrl || liveViewLinks?.debuggerUrl
        if (liveViewUrl) break
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 300))
      }
      console.log("Live View links:", liveViewLinks)

      // Return a shape compatible with existing UI
      // The connectUrl is the WebSocket URL to connect to the actual browser instance
      const result = {
        success: true,
        sessionId: session.id,
        // Live View URL to embed in an iframe for interactive control
        liveViewUrl,
        // Back-compat fields expected by some UI paths
        iframeUrl: liveViewUrl,
        browserUrl: liveViewUrl,
        status: session.status || "ready",
        expiresAt: session.expiresAt || null,
        browserInfo: {
          userAgent: "Chrome Extension Tester",
          viewport: { width: 1280, height: 720 },
        },
        connectUrl: session.connectUrl,
        seleniumRemoteUrl: session.seleniumRemoteUrl,
        pages: liveViewLinks?.pages || []
      }
      
      console.log("Returning result:", result)
      return result
    } catch (error) {
      console.error("Failed to create BrowserBase test session:", error)
      throw new Error(`BrowserBase session creation failed: ${error.message}`)
    }
  }

  /**
   * Zip provided extension files to a temporary archive, upload to Browserbase, then delete the temp file
   * @param {Array<{file_path: string, content: string}>} files - Flat list of files with paths and contents
   * @returns {Promise<string|null>} The uploaded extension ID
   */
  async uploadExtensionFromFiles(files) {
    if (!files || files.length === 0) return null
    if (!this.apiKey) throw new Error("Missing BROWSERBASE_API_KEY")

    console.log("Zipping extension files for upload:", files.length)
    const zip = new JSZip()

    for (const file of files) {
      const filePath = file.file_path || file.path || file.name
      if (!filePath) continue
      const content = file.content ?? ""
      
      // Check if this is an icon file (base64 encoded)
      if (filePath.startsWith('icons/') && filePath.match(/\.(png|ico)$/i)) {
        try {
          // Convert base64 back to binary for icon files
          const binaryContent = Buffer.from(content, 'base64')
          zip.file(filePath, binaryContent)
          console.log(`Added icon file to zip: ${filePath}`)
        } catch (iconError) {
          console.warn(`Failed to process icon ${filePath}:`, iconError)
          // Fallback to text content if base64 conversion fails
          zip.file(filePath, content)
        }
      } else {
        // Regular text file
        zip.file(filePath, content)
      }
    }

    const buffer = await zip.generateAsync({ type: "nodebuffer" })
    const tempZipPath = path.join(os.tmpdir(), `chromie-extension-${Date.now()}.zip`)
    await fs.promises.writeFile(tempZipPath, buffer)
    console.log("Temporary extension zip written:", tempZipPath)

    try {
      const fileStream = fs.createReadStream(tempZipPath)
      const extension = await this.client.extensions.create({ file: fileStream })
      const extensionId = extension?.id || null
      console.log("Extension uploaded, id:", extensionId)
      return extensionId
    } catch (err) {
      console.error("Failed to upload extension to Browserbase:", err)
      throw err
    } finally {
      // Clean up the temporary file regardless of success/failure
      try {
        await fs.promises.unlink(tempZipPath)
        console.log("Temporary extension zip removed:", tempZipPath)
      } catch (cleanupErr) {
        console.warn("Failed to remove temporary extension zip:", cleanupErr)
      }
    }
  }

  /**
   * Get session status
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Session status
   */
  async getSessionStatus(sessionId) {
    try {
      console.log("Getting session status for:", sessionId)
      
      const session = this.activeSessions.get(sessionId)
      if (session) {
        return {
          sessionId,
          status: session.status || "active",
          expiresAt: session.expiresAt,
          extensionLoaded: true,
          currentUrl: session.directUrl || "https://example.com",
        }
      }

      // If not in local cache, try to get from Browserbase
      if (this.apiKey) {
        const { Browserbase } = await import('@browserbasehq/sdk')
        const bb = new Browserbase({ apiKey: this.apiKey })
        
        try {
          const sessionInfo = await bb.sessions.retrieve(sessionId)
          return {
            sessionId,
            status: sessionInfo.status || "active",
            expiresAt: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
            extensionLoaded: true,
            currentUrl: "https://example.com",
          }
        } catch (error) {
          console.warn("Could not retrieve session from Browserbase:", error.message)
        }
      }

      // Fallback response
      return {
        sessionId,
        status: "unknown",
        expiresAt: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
        extensionLoaded: false,
        currentUrl: "https://example.com",
      }
    } catch (error) {
      console.error("Failed to get session status:", error)
      throw error
    }
  }

  /**
   * Terminate a test session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<boolean>} Success status
   */
  async terminateSession(sessionId) {
    try {
      if (!sessionId) return false
      
      // Use the existing client instance to request session release
      await this.client.sessions.update(sessionId, {
        status: "REQUEST_RELEASE",
        projectId: this.projectId,
      })
      
      console.log("Session release requested for:", sessionId)
      return true
    } catch (error) {
      console.error("Failed to terminate session:", error)
      return false
    }
  }

  /**
   * Update extension in active session
   * @param {string} sessionId - Session identifier
   * @param {Object} extensionFiles - Updated extension files
   * @returns {Promise<boolean>} Success status
   */
  async updateExtension(sessionId, extensionFiles) {
    try {
      console.log("Updating extension in session:", sessionId)
      console.log("Updated files:", Object.keys(extensionFiles))

      if (!this.apiKey) {
        console.warn("No Browserbase API key - cannot update extension")
        return false
      }

      const { Browserbase } = await import('@browserbasehq/sdk')
      const bb = new Browserbase({ apiKey: this.apiKey })

      // Create new extension from updated files
      const extensionId = await this.createExtensionFromFiles(bb, extensionFiles, sessionId)
      
      // Note: Browserbase doesn't support hot-reloading extensions in existing sessions
      // This would require creating a new session with the updated extension
      console.warn("Extension updated, but requires new session for changes to take effect")
      
      return true
    } catch (error) {
      console.error("Failed to update extension:", error)
      return false
    }
  }

  /**
   * Create extension zip from files and upload to Browserbase
   * @param {Object} bb - Browserbase instance
   * @param {Object} extensionFiles - Extension files object
   * @param {string} projectId - Project identifier
   * @returns {Promise<string>} Extension ID
   */
  async createExtensionFromFiles(bb, extensionFiles, projectId) {
    return new Promise(async (resolve, reject) => {
      try {
        // Create temporary directory for extension files
        const tempDir = path.join(__dirname, '..', '..', 'temp', `ext_${projectId}_${Date.now()}`)
        
        // Ensure temp directory exists
        await fs.promises.mkdir(tempDir, { recursive: true })
        
        // Write extension files to temp directory
        for (const [filePath, content] of Object.entries(extensionFiles)) {
          const fullPath = path.join(tempDir, filePath)
          const dir = path.dirname(fullPath)
          
          // Ensure directory exists
          await fs.promises.mkdir(dir, { recursive: true })
          
          // Write file
          await fs.promises.writeFile(fullPath, content, 'utf8')
        }

        // Ensure required extension files exist for proper functionality
        await this.ensureExtensionRequirements(tempDir, extensionFiles)

        // Create zip file
        const zipPath = `${tempDir}.zip`
        const output = fs.createWriteStream(zipPath)
        const archive = archiver('zip', { zlib: { level: 9 } })

        output.on('close', async () => {
          try {
            // Upload to Browserbase
            const file = fs.createReadStream(zipPath)
            const extension = await bb.extensions.create({ file })
            
            // Cleanup temp files
            await fs.promises.rm(tempDir, { recursive: true, force: true })
            await fs.promises.rm(zipPath, { force: true })
            
            resolve(extension.id)
          } catch (uploadError) {
            reject(uploadError)
          }
        })

        output.on('error', reject)
        archive.on('error', reject)

        archive.pipe(output)
        archive.directory(tempDir, false)
        archive.finalize()
        
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Ensure extension has all required files for proper functionality
   * @param {string} tempDir - Temporary directory path
   * @param {Object} extensionFiles - Extension files object
   */
  async ensureExtensionRequirements(tempDir, extensionFiles) {
    try {
      // Ensure icons directory exists
      const iconsDir = path.join(tempDir, 'icons')
      await fs.promises.mkdir(iconsDir, { recursive: true })

      // Create default icons if they don't exist
      const requiredIcons = ['icon16.png', 'icon48.png', 'icon128.png']
      
      for (const iconFile of requiredIcons) {
        const iconPath = path.join(iconsDir, iconFile)
        if (!await fs.promises.stat(iconPath).catch(() => false)) {
          await this.createDefaultIcon(iconPath, iconFile)
        }
      }

      // Validate and fix manifest.json if needed
      const manifestPath = path.join(tempDir, 'manifest.json')
      if (await fs.promises.stat(manifestPath).catch(() => false)) {
        await this.validateManifest(manifestPath)
      }

      console.log('✅ Extension requirements ensured')
    } catch (error) {
      console.warn('⚠️ Warning: Could not ensure all extension requirements:', error.message)
    }
  }

  /**
   * Create a simple default icon
   * @param {string} iconPath - Path where to create the icon
   * @param {string} iconFile - Icon filename
   */
  async createDefaultIcon(iconPath, iconFile) {
    try {
      // Create a simple SVG icon and convert to PNG-like format
      // For a real implementation, you'd want to use a proper image library
      // For now, we'll create a minimal PNG-like file that browsers can handle
      const size = iconFile.includes('16') ? 16 : iconFile.includes('48') ? 48 : 128
      
      // Create a simple base64 encoded 1x1 transparent PNG
      const transparentPNG = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
        0x0B, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x60, 0x00, 0x02, 0x00,
        0x00, 0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00,
        0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ])
      
      await fs.promises.writeFile(iconPath, transparentPNG)
      console.log(`Created default icon: ${iconFile}`)
    } catch (error) {
      console.warn(`Could not create default icon ${iconFile}:`, error.message)
    }
  }

  /**
   * Validate and fix manifest.json
   * @param {string} manifestPath - Path to manifest.json
   */
  async validateManifest(manifestPath) {
    try {
      const manifestContent = await fs.promises.readFile(manifestPath, 'utf8')
      const manifest = JSON.parse(manifestContent)

      // Ensure required fields exist
      if (!manifest.manifest_version) {
        manifest.manifest_version = 3
      }

      if (!manifest.name) {
        manifest.name = "Generated Extension"
      }

      if (!manifest.version) {
        manifest.version = "1.0"
      }

      // Ensure icons are properly configured
      if (!manifest.icons) {
        manifest.icons = {
          "16": "icons/icon16.png",
          "48": "icons/icon48.png", 
          "128": "icons/icon128.png"
        }
      }

      // Ensure action has icon if it exists
      if (manifest.action && !manifest.action.default_icon) {
        manifest.action.default_icon = {
          "16": "icons/icon16.png",
          "48": "icons/icon48.png",
          "128": "icons/icon128.png"
        }
      }

      // Ensure basic permissions for functionality
      if (!manifest.permissions) {
        manifest.permissions = []
      }

      // Add activeTab permission if not present (commonly needed)
      if (!manifest.permissions.includes('activeTab')) {
        manifest.permissions.push('activeTab')
      }

      // Ensure storage permission for extension functionality
      if (!manifest.permissions.includes('storage')) {
        manifest.permissions.push('storage')
      }

      // For better debugging in Browserbase, ensure developer mode friendly settings
      if (manifest.content_security_policy) {
        // Allow unsafe-eval for development extensions if needed
        if (typeof manifest.content_security_policy === 'string') {
          manifest.content_security_policy = {
            extension_pages: manifest.content_security_policy
          }
        }
      }

      // Write back the validated manifest
      await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2))
      console.log('✅ Manifest validated and updated')
    } catch (error) {
      console.warn('⚠️ Could not validate manifest:', error.message)
    }
  }

  /**
   * Get debug information about the session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Debug information
   */
  async getSessionDebugInfo(sessionId) {
    try {
      if (!this.apiKey) {
        return { error: 'Browserbase not configured' }
      }

      const { Browserbase } = await import('@browserbasehq/sdk')
      const bb = new Browserbase({ apiKey: this.apiKey })

      const session = await bb.sessions.retrieve(sessionId)
      const debug = await bb.sessions.debug(sessionId)

      return {
        sessionId,
        status: session.status,
        projectId: session.projectId,
        extensionId: session.extensionId,
        debuggerUrl: debug.debuggerUrl,
        debuggerFullscreenUrl: debug.debuggerFullscreenUrl,
        browserInfo: {
          platform: 'browserbase',
          version: 'latest'
        }
      }
    } catch (error) {
      console.error('Failed to get session debug info:', error)
      return { error: error.message }
    }
  }
}

export const browserBaseService = new BrowserBaseService()
