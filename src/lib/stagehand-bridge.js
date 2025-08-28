/**
 * Stagehand Bridge System for Chrome Extensions
 * 
 * This system provides a communication bridge between web pages and Chrome extensions
 * for automated testing using the real Stagehand SDK from Browserbase.
 */

import { Stagehand } from "@browserbasehq/stagehand";

export class StagehandBridge {
  constructor() {
    this.messageId = 0
    this.pendingRequests = new Map()
    this.stagehand = null
    this.sessionId = null
  }

  /**
   * Initialize Stagehand with Browserbase
   * @param {Object} config - Stagehand configuration
   * @returns {Promise<Object>} Initialization result
   */
  async initializeStagehand(config = {}) {
    try {
      console.log("🔗 STAGEHAND: Initializing with Browserbase...")
      
      const stagehandConfig = {
        env: "BROWSERBASE",
        apiKey: process.env.BROWSERBASE_API_KEY,
        projectId: process.env.BROWSERBASE_PROJECT_ID,
        browserbaseSessionID: config.sessionId, // Connect to existing session if provided
        browserbaseSessionCreateParams: {
          proxies: config.proxies || false,
          region: config.region || "us-west-2",
          timeout: config.timeout || 3600,
          keepAlive: config.keepAlive || false,
          browserSettings: {
            viewport: config.viewport || { width: 1920, height: 1080 },
            blockAds: config.blockAds || true,
            solveCaptchas: config.solveCaptchas || false,
            recordSession: config.recordSession || false,
            ...config.browserSettings
          },
          userMetadata: {
            userId: config.userId || "chrome-extension-user",
            environment: config.environment || "production",
            ...config.userMetadata
          }
        },
        ...config
      }

      this.stagehand = new Stagehand(stagehandConfig)
      
      const result = await this.stagehand.init()
      this.sessionId = result.sessionId
      
      console.log("✅ STAGEHAND: Initialized successfully")
      console.log("Session ID:", this.sessionId)
      console.log("Debug URL:", result.debugUrl)
      console.log("Session URL:", result.sessionUrl)
      
      return result
      
    } catch (error) {
      console.error("❌ STAGEHAND: Initialization failed:", error)
      throw error
    }
  }

  /**
   * Get the Stagehand page instance
   * @returns {Object} Stagehand page object
   */
  getPage() {
    if (!this.stagehand) {
      throw new Error("Stagehand not initialized. Call initializeStagehand() first.")
    }
    return this.stagehand.page
  }

  /**
   * Get the Stagehand agent instance
   * @param {Object} config - Agent configuration
   * @returns {Object} Stagehand agent object
   */
  getAgent(config = {}) {
    if (!this.stagehand) {
      throw new Error("Stagehand not initialized. Call initializeStagehand() first.")
    }
    return this.stagehand.agent(config)
  }

  /**
   * Execute a natural language action using Stagehand
   * @param {string} action - Natural language action description
   * @returns {Promise<Object>} Action result
   */
  async executeAction(action) {
    try {
      console.log("🎯 STAGEHAND ACT:", action)
      const page = this.getPage()
      const result = await page.act(action)
      console.log("✅ STAGEHAND ACT Result:", result)
      return result
    } catch (error) {
      console.error("❌ STAGEHAND ACT Error:", error)
      throw error
    }
  }

  /**
   * Extract structured data using Stagehand
   * @param {Object} schema - Data extraction schema
   * @returns {Promise<Object>} Extracted data
   */
  async extractData(schema) {
    try {
      console.log("📊 STAGEHAND EXTRACT:", schema)
      const page = this.getPage()
      const result = await page.extract(schema)
      console.log("✅ STAGEHAND EXTRACT Result:", result)
      return result
    } catch (error) {
      console.error("❌ STAGEHAND EXTRACT Error:", error)
      throw error
    }
  }

  /**
   * Observe page elements using Stagehand
   * @param {string} query - Observation query
   * @returns {Promise<Object>} Observed elements
   */
  async observeElements(query) {
    try {
      console.log("👁️ STAGEHAND OBSERVE:", query)
      const page = this.getPage()
      const result = await page.observe(query)
      console.log("✅ STAGEHAND OBSERVE Result:", result)
      return result
    } catch (error) {
      console.error("❌ STAGEHAND OBSERVE Error:", error)
      throw error
    }
  }

  /**
   * Execute agent task using Stagehand
   * @param {string} task - Agent task description
   * @param {Object} config - Agent configuration
   * @returns {Promise<Object>} Agent execution result
   */
  async executeAgentTask(task, config = {}) {
    try {
      console.log("🤖 STAGEHAND AGENT:", task, config)
      const agent = this.getAgent(config)
      const result = await agent.execute(task)
      console.log("✅ STAGEHAND AGENT Result:", result)
      return result
    } catch (error) {
      console.error("❌ STAGEHAND AGENT Error:", error)
      throw error
    }
  }

  /**
   * Generate stagehand bridge code for content scripts
   * @param {Object} extensionConfig - Extension configuration
   * @returns {string} Content script bridge code
   */
  generateContentScriptBridge(extensionConfig) {
    return `
// Stagehand Bridge - Content Script
// This allows Stagehand to communicate with the extension

(function() {
  let lastUrl = location.href;
  
  // Create Stagehand API interface that communicates with the extension
  window.stagehand = {
    page: {
      // Act - Execute natural language actions
      act: async (action) => {
        console.log("🎯 STAGEHAND ACT:", action);
        
        // Send action to extension for processing via Stagehand SDK
        const response = await sendCommandToExtension("EXECUTE_STAGEHAND_ACTION", {
          type: "act",
          action: action
        });
        
        return response;
      },
      
      // Extract - Pull structured data
      extract: async (schema) => {
        console.log("📊 STAGEHAND EXTRACT:", schema);
        
        // Send extraction request to extension for processing via Stagehand SDK
        const response = await sendCommandToExtension("EXECUTE_STAGEHAND_EXTRACT", {
          type: "extract",
          schema: schema
        });
        
        return response;
      },
      
      // Observe - Discover available actions
      observe: async (query) => {
        console.log("👁️ STAGEHAND OBSERVE:", query);
        
        // Send observation request to extension for processing via Stagehand SDK
        const response = await sendCommandToExtension("EXECUTE_STAGEHAND_OBSERVE", {
          type: "observe",
          query: query
        });
        
        return response;
      }
    },
    
    // Agent - Automate entire workflows
    agent: (config) => ({
      execute: async (task) => {
        console.log("🤖 STAGEHAND AGENT:", task, config);
        
        // Send agent task to extension for processing via Stagehand SDK
        const response = await sendCommandToExtension("EXECUTE_STAGEHAND_AGENT", {
          type: "agent",
          task: task,
          config: config
        });
        
        return response;
      }
    })
  };
  
  // Helper function to send commands to extension
  async function sendCommandToExtension(cmd, payload = {}) {
    const id = Math.random().toString(36).slice(2);
    
    return new Promise((resolve, reject) => {
      // Set up response listener
      const listener = (event) => {
        if (event.source !== window) return;
        const msg = event.data;
        if (!msg || msg.type !== "STAGEHAND_EXT_RESULT" || msg.id !== id) return;
        
        window.removeEventListener("message", listener);
        
        if (msg.success) {
          resolve(msg.resp);
        } else {
          reject(new Error(msg.resp.error || "Extension command failed"));
        }
      };
      
      window.addEventListener("message", listener);
      
      // Send command to extension service worker
      chrome.runtime.sendMessage(
        { 
          cmd: cmd, 
          payload: payload,
          stagehandId: id 
        },
        (resp) => {
          console.log("🔗 STAGEHAND: Extension response:", resp);
          // Relay result back to page
          window.postMessage({ 
            type: "STAGEHAND_EXT_RESULT", 
            id: id, 
            resp: resp,
            success: resp && resp.success !== false
          }, "*");
        }
      );
    });
  }
  
  // Listen to page messages from Stagehand
  window.addEventListener("message", async (event) => {
    if (event.source !== window) return;
    const msg = event.data;
    if (!msg || msg.type !== "STAGEHAND_EXT") return;

    console.log("🔗 STAGEHAND: Received command:", msg.cmd, msg.payload);

    try {
      // Send command to extension service worker
      chrome.runtime.sendMessage(
        { 
          cmd: msg.cmd, 
          payload: msg.payload,
          stagehandId: msg.id 
        },
        (resp) => {
          console.log("🔗 STAGEHAND: Extension response:", resp);
          // Relay result back to page
          window.postMessage({ 
            type: "STAGEHAND_EXT_RESULT", 
            id: msg.id, 
            resp,
            success: true 
          }, "*");
        }
      );
    } catch (error) {
      console.error("🔗 STAGEHAND: Error processing command:", error);
      window.postMessage({ 
        type: "STAGEHAND_EXT_RESULT", 
        id: msg.id, 
        resp: { error: error.message },
        success: false 
      }, "*");
    }
  });

  // Dynamic site monitoring for SPAs
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log("🔗 STAGEHAND: URL changed, bridge ready for:", lastUrl);
    }
  }).observe(document.body, { childList: true, subtree: true });

  console.log("🔗 STAGEHAND: Bridge initialized for extension: ${extensionConfig.name}");
  console.log("🔗 STAGEHAND: Available API:", window.stagehand);
})();
`
  }

  /**
   * Generate service worker bridge code
   * @param {Object} extensionConfig - Extension configuration
   * @returns {string} Service worker bridge code
   */
  generateServiceWorkerBridge(extensionConfig) {
    return `
// Stagehand Bridge - Service Worker
// Handles commands from Stagehand and executes extension functionality using real Stagehand SDK

import { Stagehand } from "@browserbasehq/stagehand";

let stagehandInstance = null;
let sessionId = null;

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  console.log("🔗 STAGEHAND: Service worker received command:", req.cmd);
  
  (async () => {
    try {
      let result = null;
      
      switch (req.cmd) {
        case "INITIALIZE_STAGEHAND":
          result = await initializeStagehand(req.payload);
          break;
          
        case "EXECUTE_STAGEHAND_ACTION":
          result = await executeStagehandAction(req.payload);
          break;
          
        case "EXECUTE_STAGEHAND_EXTRACT":
          result = await executeStagehandExtract(req.payload);
          break;
          
        case "EXECUTE_STAGEHAND_OBSERVE":
          result = await executeStagehandObserve(req.payload);
          break;
          
        case "EXECUTE_STAGEHAND_AGENT":
          result = await executeStagehandAgent(req.payload);
          break;
          
        case "GET_EXTENSION_INFO":
          result = {
            name: "${extensionConfig.name}",
            description: "${extensionConfig.description}",
            version: "${extensionConfig.version || '1.0.0'}",
            sessionId: sessionId
          };
          break;
          
        default:
          result = { error: "Unknown command: " + req.cmd };
      }
      
      console.log("🔗 STAGEHAND: Command result:", result);
      sendResponse({ success: true, data: result });
      
    } catch (error) {
      console.error("🔗 STAGEHAND: Error executing command:", error);
      sendResponse({ 
        success: false, 
        error: error.message,
        stagehandId: req.stagehandId 
      });
    }
  })();
  
  return true; // Keep channel open for async response
});

// Initialize Stagehand with Browserbase
async function initializeStagehand(config = {}) {
  try {
    console.log("🔗 STAGEHAND: Initializing with Browserbase...");
    
    const stagehandConfig = {
      env: "BROWSERBASE",
      apiKey: process.env.BROWSERBASE_API_KEY,
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      browserbaseSessionID: config.sessionId, // Connect to existing session if provided
      browserbaseSessionCreateParams: {
        proxies: config.proxies || false,
        region: config.region || "us-west-2",
        timeout: config.timeout || 3600,
        keepAlive: config.keepAlive || false,
        browserSettings: {
          viewport: config.viewport || { width: 1920, height: 1080 },
          blockAds: config.blockAds || true,
          solveCaptchas: config.solveCaptchas || false,
          recordSession: config.recordSession || false,
          ...config.browserSettings
        },
        userMetadata: {
          userId: config.userId || "chrome-extension-user",
          environment: config.environment || "production",
          ...config.userMetadata
        }
      },
      ...config
    };

    stagehandInstance = new Stagehand(stagehandConfig);
    
    const result = await stagehandInstance.init();
    sessionId = result.sessionId;
    
    console.log("✅ STAGEHAND: Initialized successfully");
    console.log("Session ID:", sessionId);
    console.log("Debug URL:", result.debugUrl);
    console.log("Session URL:", result.sessionUrl);
    
    return result;
    
  } catch (error) {
    console.error("❌ STAGEHAND: Initialization failed:", error);
    throw error;
  }
}

// Execute Stagehand action
async function executeStagehandAction(payload) {
  if (!stagehandInstance) {
    throw new Error("Stagehand not initialized. Call INITIALIZE_STAGEHAND first.");
  }
  
  try {
    console.log("🎯 STAGEHAND ACT:", payload.action);
    const result = await stagehandInstance.page.act(payload.action);
    console.log("✅ STAGEHAND ACT Result:", result);
    return result;
  } catch (error) {
    console.error("❌ STAGEHAND ACT Error:", error);
    throw error;
  }
}

// Execute Stagehand extract
async function executeStagehandExtract(payload) {
  if (!stagehandInstance) {
    throw new Error("Stagehand not initialized. Call INITIALIZE_STAGEHAND first.");
  }
  
  try {
    console.log("📊 STAGEHAND EXTRACT:", payload.schema);
    const result = await stagehandInstance.page.extract(payload.schema);
    console.log("✅ STAGEHAND EXTRACT Result:", result);
    return result;
  } catch (error) {
    console.error("❌ STAGEHAND EXTRACT Error:", error);
    throw error;
  }
}

// Execute Stagehand observe
async function executeStagehandObserve(payload) {
  if (!stagehandInstance) {
    throw new Error("Stagehand not initialized. Call INITIALIZE_STAGEHAND first.");
  }
  
  try {
    console.log("👁️ STAGEHAND OBSERVE:", payload.query);
    const result = await stagehandInstance.page.observe(payload.query);
    console.log("✅ STAGEHAND OBSERVE Result:", result);
    return result;
  } catch (error) {
    console.error("❌ STAGEHAND OBSERVE Error:", error);
    throw error;
  }
}

// Execute Stagehand agent
async function executeStagehandAgent(payload) {
  if (!stagehandInstance) {
    throw new Error("Stagehand not initialized. Call INITIALIZE_STAGEHAND first.");
  }
  
  try {
    console.log("🤖 STAGEHAND AGENT:", payload.task, payload.config);
    const agent = stagehandInstance.agent(payload.config);
    const result = await agent.execute(payload.task);
    console.log("✅ STAGEHAND AGENT Result:", result);
    return result;
  } catch (error) {
    console.error("❌ STAGEHAND AGENT Error:", error);
    throw error;
  }
}
`
  }

  /**
   * Generate stagehand automation script for testing
   * @param {Object} extensionConfig - Extension configuration
   * @param {string} stagehandScript - Custom stagehand script
   * @returns {string} Stagehand automation script
   */
  generateStagehandScript(extensionConfig, stagehandScript) {
    if (!stagehandScript) {
      return `
// No Stagehand script provided for ${extensionConfig.name}
console.log("⚠️ STAGEHAND: No automation script found for this extension")
`
    }
    
    return `
// Stagehand Automation Script for ${extensionConfig.name}
// Generated automatically based on extension functionality

console.log("🤖 STAGEHAND: Starting automated test for ${extensionConfig.name}")

// Execute automation sequence using Stagehand API
(async () => {
  try {
    // Wait for Stagehand API to be available
    if (!window.stagehand) {
      console.log("⏳ STAGEHAND: Waiting for API to be available...")
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (window.stagehand) {
            clearInterval(checkInterval)
            resolve()
          }
        }, 100)
      })
    }
    
    const { page, agent } = window.stagehand
    
    // Example usage of the Stagehand API:
    console.log("🎯 STAGEHAND: Testing page.act()")
    await page.act("click the login button")
    
    console.log("📊 STAGEHAND: Testing page.extract()")
    const { price } = await page.extract({
      schema: { price: true }
    })
    console.log("Extracted price:", price)
    
    console.log("👁️ STAGEHAND: Testing page.observe()")
    const actions = await page.observe("find submit buttons")
    console.log("Found elements:", actions)
    
    console.log("🤖 STAGEHAND: Testing agent.execute()")
    const agentInstance = agent({
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      options: {
        apiKey: process.env.ANTHROPIC_API_KEY,
      },
    })
    await agentInstance.execute("apply for this job")
    
    // Execute the provided Stagehand script
    ${stagehandScript}
    
    console.log("✅ STAGEHAND: All tests completed successfully!")
    
    // Show completion notification
    const notification = document.createElement('div')
    notification.style.cssText = 
      'position: fixed; bottom: 20px; left: 20px; background: #4CAF50; color: white; ' +
      'padding: 15px; border-radius: 8px; z-index: 10001; font-weight: bold;'
    notification.textContent = '🎉 Stagehand Automation Complete!'
    document.body.appendChild(notification)
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 5000)
    
  } catch (error) {
    console.error("❌ STAGEHAND: Automation failed:", error)
    throw error
  }
})()
`
  }

  /**
   * Close the Stagehand session
   */
  async close() {
    if (this.stagehand) {
      try {
        await this.stagehand.close()
        console.log("🔗 STAGEHAND: Session closed successfully")
      } catch (error) {
        console.error("❌ STAGEHAND: Error closing session:", error)
      }
    }
  }
}

export const stagehandBridge = new StagehandBridge()
