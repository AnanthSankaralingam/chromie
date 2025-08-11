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
      console.log("Creating test session with:", { extensionFiles, projectId })
      const resolvedProjectId = projectId || this.projectId
      console.log("Resolved project ID:", resolvedProjectId)
      console.log("API Key available:", !!this.apiKey)
      
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
      
      console.log("Session created:", session)

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
      zip.file(filePath, content)
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
      // Placeholder implementation
      console.log("Getting session status for:", sessionId)

      // Mock response
      return {
        sessionId,
        status: "active",
        expiresAt: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
        extensionLoaded: true,
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
      // Use REST API to terminate session (SDK may not expose delete)
      const res = await fetch(`${this.baseUrl}/v1/sessions/${sessionId}`, {
        method: "DELETE",
        headers: {
          "X-BB-API-Key": this.apiKey,
        },
      })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        console.error("Browserbase terminate failed:", res.status, text)
        return false
      }
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

      // Mock successful update
      return true
    } catch (error) {
      console.error("Failed to update extension:", error)
      return false
    }
  }
}

export const browserBaseService = new BrowserBaseService()
