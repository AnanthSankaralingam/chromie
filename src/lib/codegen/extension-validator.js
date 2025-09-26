// extension-validator.js
// Post-processing validation and cleanup for generated Chrome extensions

/**
 * Validates and fixes common issues in Claude-generated Chrome extensions
 * @param {Object} extensionFiles - Generated extension files
 * @returns {Object} Fixed extension files
 */
export function validateAndFixExtension(extensionFiles) {
  console.log('🔍 Validating and fixing generated extension files...')
  
  const fixedFiles = { ...extensionFiles }
  
  // Parse manifest
  let manifest
  try {
    manifest = typeof fixedFiles['manifest.json'] === 'string' 
      ? JSON.parse(fixedFiles['manifest.json']) 
      : fixedFiles['manifest.json']
  } catch (error) {
    console.error('❌ Invalid manifest.json:', error)
    throw new Error('Generated manifest.json is not valid JSON')
  }
  
  // Fix content_scripts issues
  if (manifest.content_scripts) {
    console.log('🔧 Checking content_scripts configuration...')
    
    const validContentScripts = []
    
    for (let i = 0; i < manifest.content_scripts.length; i++) {
      const script = manifest.content_scripts[i]
      const validJsFiles = []
      const validCssFiles = []
      
      // Check JavaScript files
      if (script.js) {
        for (const jsFile of script.js) {
          const fileContent = fixedFiles[jsFile]
          
          if (!fileContent) {
            console.warn(`⚠️ Content script ${jsFile} referenced in manifest but not provided - creating default`)
            fixedFiles[jsFile] = createDefaultContentScript()
            validJsFiles.push(jsFile)
          } else if (isEmptyOrCommentOnly(fileContent)) {
            console.warn(`⚠️ Content script ${jsFile} is empty or comment-only - adding default functionality`)
            fixedFiles[jsFile] = createDefaultContentScript()
            validJsFiles.push(jsFile)
          } else {
            validJsFiles.push(jsFile)
          }
        }
      }
      
      // Check CSS files
      if (script.css) {
        for (const cssFile of script.css) {
          const fileContent = fixedFiles[cssFile]
          
          if (!fileContent) {
            console.warn(`⚠️ Content CSS ${cssFile} referenced in manifest but not provided - creating default`)
            fixedFiles[cssFile] = createDefaultContentCSS()
            validCssFiles.push(cssFile)
          } else if (isEmptyOrCommentOnly(fileContent)) {
            console.warn(`⚠️ Content CSS ${cssFile} is empty or comment-only - adding default styles`)
            fixedFiles[cssFile] = createDefaultContentCSS()
            validCssFiles.push(cssFile)
          } else {
            validCssFiles.push(cssFile)
          }
        }
      }
      
      // Only include content_script if it has valid files
      if (validJsFiles.length > 0 || validCssFiles.length > 0) {
        const validScript = {
          ...script,
          ...(validJsFiles.length > 0 && { js: validJsFiles }),
          ...(validCssFiles.length > 0 && { css: validCssFiles })
        }
        validContentScripts.push(validScript)
      } else {
        console.warn(`⚠️ Removing content_script[${i}] - no valid js or css files`)
      }
    }
    
    // Update manifest with valid content scripts
    if (validContentScripts.length > 0) {
      manifest.content_scripts = validContentScripts
    } else {
      console.warn('⚠️ Removing entire content_scripts section - no valid scripts found')
      delete manifest.content_scripts
    }
  }
  
  // Validate other referenced files
  validateReferencedFiles(manifest, fixedFiles)
  
  // Update manifest in files
  fixedFiles['manifest.json'] = JSON.stringify(manifest, null, 2)
  
  console.log('✅ Extension validation and fixes complete')
  return fixedFiles
}

/**
 * Check if a file is empty or contains only comments
 */
function isEmptyOrCommentOnly(content) {
  if (!content || content.trim().length === 0) {
    return true
  }
  
  // Remove all comments and whitespace
  const cleanContent = content
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, '') // Remove line comments
    .replace(/\s+/g, '') // Remove all whitespace
  
  return cleanContent.length === 0
}

/**
 * Create a default content script with basic functionality
 */
function createDefaultContentScript() {
  return `// Auto-generated content script
console.log('Extension content script loaded on:', window.location.href);

// Basic extension functionality
(function() {
  'use strict';
  
  // Add a small indicator that the extension is active
  const indicator = document.createElement('div');
  indicator.style.cssText = \`
    position: fixed;
    top: 10px;
    right: 10px;
    background: #4CAF50;
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-family: Arial, sans-serif;
    font-size: 12px;
    z-index: 999999;
    opacity: 0.9;
  \`;
  indicator.textContent = 'Extension Active';
  document.body.appendChild(indicator);
  
  // Remove indicator after 3 seconds
  setTimeout(() => {
    if (indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }, 3000);
  
  // Listen for messages from background or popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    if (request.action === 'ping') {
      sendResponse({status: 'Content script active'});
    }
    
    return true;
  });
})();`
}

/**
 * Create default CSS for content scripts
 */
function createDefaultContentCSS() {
  return `/* Auto-generated content script styles */
.extension-highlight {
  background-color: #ffeb3b !important;
  padding: 2px 4px !important;
  border-radius: 2px !important;
}

.extension-overlay {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  z-index: 999999 !important;
  background: white !important;
  border: 2px solid #ccc !important;
  border-radius: 8px !important;
  padding: 20px !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
}`
}

/**
 * Validate that all files referenced in manifest exist
 */
function validateReferencedFiles(manifest, files) {
  console.log('🔍 Validating referenced files...')
  
  // Check popup files
  if (manifest.action?.default_popup) {
    const popupFile = manifest.action.default_popup
    if (!files[popupFile]) {
      console.warn(`⚠️ Popup file ${popupFile} missing - will be created by hyperbrowser service`)
    }
  }
  
  // Check side panel files
  if (manifest.side_panel?.default_path) {
    const sidePanelFile = manifest.side_panel.default_path
    if (!files[sidePanelFile]) {
      console.warn(`⚠️ Side panel file ${sidePanelFile} missing - will be created by hyperbrowser service`)
    }
  }
  
  // Check background script
  if (manifest.background?.service_worker) {
    const backgroundFile = manifest.background.service_worker
    if (!files[backgroundFile]) {
      console.warn(`⚠️ Background script ${backgroundFile} missing - will be created by hyperbrowser service`)
    } else if (isEmptyOrCommentOnly(files[backgroundFile])) {
      console.warn(`⚠️ Background script ${backgroundFile} is empty - adding basic functionality`)
      files[backgroundFile] = createDefaultBackgroundScript()
    }
  }
}

/**
 * Create a basic background script
 */
function createDefaultBackgroundScript() {
  return `// Auto-generated background script
console.log('Extension background script loaded');

// Basic extension setup
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.action === 'ping') {
    sendResponse({status: 'Background script active'});
  }
  
  return true;
});`
}
