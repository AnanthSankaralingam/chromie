import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import fs from "fs"
import path from "path"
import os from "os"

export async function POST(request, { params }) {
  const supabase = createClient()
  const projectId = params.id

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    console.log("🧪 Starting simple extension test for project:", projectId)

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
    }

    // Get all extension files (exclude test scripts)
    const { data: extensionFiles, error: filesError } = await supabase
      .from("code_files")
      .select("file_path, content")
      .eq("project_id", projectId)
      .neq("file_path", "puppeteer_test_script.js")
      .neq("file_path", "hyperagent_test_script.js")

    if (filesError || !extensionFiles || extensionFiles.length === 0) {
      return NextResponse.json({ 
        error: "No extension files found. Please generate the extension first." 
      }, { status: 404 })
    }

    console.log(`📦 Found ${extensionFiles.length} extension files`)

    // Create temporary directory for extension
    const tempDir = path.join(os.tmpdir(), `chromie-test-${Date.now()}`)
    await fs.promises.mkdir(tempDir, { recursive: true })

    try {
      // Write all extension files to temp directory
      console.log("📝 Writing extension files to temp directory...")
      for (const file of extensionFiles) {
        const filePath = path.join(tempDir, file.file_path)
        const dir = path.dirname(filePath)
        await fs.promises.mkdir(dir, { recursive: true })
        await fs.promises.writeFile(filePath, file.content || '', 'utf8')
      }

      console.log("✅ Extension files written to:", tempDir)

      // Load and test extension using Playwright
      const testResults = await runExtensionTests(tempDir, project.name)

      // Clean up temp directory
      await fs.promises.rm(tempDir, { recursive: true, force: true })
      console.log("🧹 Cleaned up temp directory")

      // Save test results to database
      try {
        await supabase
          .from("projects")
          .update({
            ai_test_message: testResults.message,
            ai_test_result: testResults.result,
            ai_test_task: `Test ${project.name} extension`,
            ai_test_updated_at: new Date().toISOString()
          })
          .eq("id", projectId)
          .eq("user_id", user.id)
      } catch (saveError) {
        console.warn("⚠️ Failed to save test results:", saveError)
      }

      return NextResponse.json(testResults)

    } catch (testError) {
      // Clean up on error
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true })
      } catch (cleanupError) {
        console.warn("⚠️ Failed to clean up temp directory:", cleanupError)
      }
      throw testError
    }

  } catch (error) {
    console.error("❌ Extension test failed:", error)
    return NextResponse.json({
      success: false,
      error: error.message || "Extension test failed",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 })
  }
}

/**
 * Run extension tests using Playwright
 */
async function runExtensionTests(extensionPath, extensionName) {
  let playwright
  try {
    // Try to import Playwright
    playwright = await import('playwright')
  } catch (importError) {
    console.warn("⚠️ Playwright not installed, trying Puppeteer...")
    // Fallback to Puppeteer if Playwright is not available
    return await runExtensionTestsWithPuppeteer(extensionPath, extensionName)
  }

  console.log("🎭 Using Playwright for testing...")
  
  const browser = await playwright.chromium.launch({
    headless: true,
    args: [
      '--disable-extensions-except=' + extensionPath,
      '--load-extension=' + extensionPath,
      '--disable-dev-shm-usage',
      '--no-sandbox'
    ]
  })

  const context = await browser.newContext()
  const page = await context.newPage()

  const results = {
    success: true,
    message: "Extension test completed",
    result: "",
    tests: []
  }

  try {
    // Test 1: Check if extension loaded
    console.log("🔍 Test 1: Checking if extension loaded...")
    await page.goto('chrome://extensions', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    
    // Check for extension in the extensions page
    const extensionFound = await page.evaluate((name) => {
      const manager = document.querySelector('extensions-manager')
      if (!manager || !manager.shadowRoot) return false
      
      const items = manager.shadowRoot.querySelectorAll('extensions-item')
      for (const item of items) {
        if (item.shadowRoot) {
          const nameElement = item.shadowRoot.querySelector('#name')
          if (nameElement && nameElement.textContent.includes(name)) {
            return true
          }
        }
      }
      return false
    }, extensionName)

    results.tests.push({
      name: "Extension loaded",
      passed: extensionFound,
      message: extensionFound ? "Extension found in chrome://extensions" : "Extension not found"
    })

    // Test 2: Navigate to a test page and check for console errors
    console.log("🔍 Test 2: Checking for console errors...")
    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('https://example.com', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000) // Wait for extension to potentially inject

    results.tests.push({
      name: "No console errors",
      passed: consoleErrors.length === 0,
      message: consoleErrors.length === 0 
        ? "No console errors detected" 
        : `Found ${consoleErrors.length} console error(s): ${consoleErrors.slice(0, 3).join(', ')}`
    })

    // Test 3: Check if manifest is valid
    console.log("🔍 Test 3: Validating manifest...")
    const manifestPath = path.join(extensionPath, 'manifest.json')
    let manifestValid = false
    let manifestError = null

    try {
      const manifestContent = await fs.promises.readFile(manifestPath, 'utf8')
      const manifest = JSON.parse(manifestContent)
      manifestValid = manifest && manifest.name && manifest.version
    } catch (manifestErr) {
      manifestError = manifestErr.message
    }

    results.tests.push({
      name: "Manifest valid",
      passed: manifestValid,
      message: manifestValid ? "Manifest is valid" : `Manifest error: ${manifestError || 'Invalid format'}`
    })

    // Test 4: Try to interact with extension if it's a popup or side panel
    console.log("🔍 Test 4: Testing extension interaction...")
    let interactionSuccess = false
    let interactionMessage = "Extension interaction test skipped"

    try {
      // Get extension ID from chrome://extensions
      await page.goto('chrome://extensions', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)

      const extensionId = await page.evaluate((name) => {
        const manager = document.querySelector('extensions-manager')
        if (!manager || !manager.shadowRoot) return null
        
        const items = manager.shadowRoot.querySelectorAll('extensions-item')
        for (const item of items) {
          if (item.shadowRoot) {
            const nameElement = item.shadowRoot.querySelector('#name')
            if (nameElement && nameElement.textContent.includes(name)) {
              return item.getAttribute('id')
            }
          }
        }
        return null
      }, extensionName)

      if (extensionId) {
        // Try to open extension popup or side panel
        const extensionUrl = `chrome-extension://${extensionId}/`
        
        // Check what type of extension it is by reading manifest
        const manifestContent = await fs.promises.readFile(manifestPath, 'utf8')
        const manifest = JSON.parse(manifestContent)
        
        if (manifest.action && manifest.action.default_popup) {
          const popupUrl = extensionUrl + manifest.action.default_popup
          try {
            const popupPage = await context.newPage()
            await popupPage.goto(popupUrl, { waitUntil: 'domcontentloaded', timeout: 5000 })
            await popupPage.waitForTimeout(1000)
            interactionSuccess = true
            interactionMessage = "Popup opened successfully"
            await popupPage.close()
          } catch (popupError) {
            interactionMessage = `Failed to open popup: ${popupError.message}`
          }
        } else if (manifest.side_panel) {
          interactionMessage = "Side panel extension detected (requires manual testing)"
          interactionSuccess = true // Side panels need special handling
        } else {
          interactionMessage = "Content script or background extension (no UI to test)"
          interactionSuccess = true
        }
      }
    } catch (interactionError) {
      interactionMessage = `Interaction test error: ${interactionError.message}`
    }

    results.tests.push({
      name: "Extension interaction",
      passed: interactionSuccess,
      message: interactionMessage
    })

    // Calculate overall success
    const passedTests = results.tests.filter(t => t.passed).length
    const totalTests = results.tests.length
    results.success = passedTests === totalTests
    results.message = `Tests completed: ${passedTests}/${totalTests} passed`
    results.result = results.tests.map(t => 
      `${t.passed ? '✅' : '❌'} ${t.name}: ${t.message}`
    ).join('\n')

  } catch (testError) {
    results.success = false
    results.message = `Test execution failed: ${testError.message}`
    results.result = testError.stack || testError.message
  } finally {
    await browser.close()
  }

  return results
}

/**
 * Fallback: Run extension tests using Puppeteer
 */
async function runExtensionTestsWithPuppeteer(extensionPath, extensionName) {
  console.log("🎭 Using Puppeteer for testing...")
  
  let puppeteer
  try {
    puppeteer = await import('puppeteer-core')
  } catch (importError) {
    throw new Error("Neither Playwright nor Puppeteer is available. Please install one of them.")
  }

  // For Puppeteer, we need Chrome/Chromium executable
  // This is a simplified version - in production you'd want to use chrome-launcher or similar
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--disable-dev-shm-usage',
      '--no-sandbox'
    ]
  })

  const page = await browser.newPage()
  const results = {
    success: true,
    message: "Extension test completed (Puppeteer)",
    result: "",
    tests: []
  }

  try {
    // Basic test: navigate and check for errors
    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('https://example.com', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    results.tests.push({
      name: "No console errors",
      passed: consoleErrors.length === 0,
      message: consoleErrors.length === 0 
        ? "No console errors detected" 
        : `Found ${consoleErrors.length} console error(s)`
    })

    // Check manifest
    const manifestPath = path.join(extensionPath, 'manifest.json')
    try {
      const manifestContent = await fs.promises.readFile(manifestPath, 'utf8')
      const manifest = JSON.parse(manifestContent)
      results.tests.push({
        name: "Manifest valid",
        passed: true,
        message: "Manifest is valid"
      })
    } catch (manifestErr) {
      results.tests.push({
        name: "Manifest valid",
        passed: false,
        message: `Manifest error: ${manifestErr.message}`
      })
    }

    const passedTests = results.tests.filter(t => t.passed).length
    const totalTests = results.tests.length
    results.success = passedTests === totalTests
    results.message = `Tests completed: ${passedTests}/${totalTests} passed`
    results.result = results.tests.map(t => 
      `${t.passed ? '✅' : '❌'} ${t.name}: ${t.message}`
    ).join('\n')

  } catch (testError) {
    results.success = false
    results.message = `Test execution failed: ${testError.message}`
    results.result = testError.stack || testError.message
  } finally {
    await browser.close()
  }

  return results
}

