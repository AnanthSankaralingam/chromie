/**
 * Google Workspace Authentication Instructions for Extension Prompts
 * This is injected into prompts when Workspace APIs are detected
 */

export const WORKSPACE_AUTH_INSTRUCTIONS_POPUP_SIDEPANEL = `
<google_workspace_authentication>
IF the extension uses Google Workspace APIs (Gmail, Drive, Calendar, Sheets, Docs, Tasks, Chat, Admin SDK, Meet, Slides, Forms):

MANDATORY: Include OAuth2 authentication configuration and code.

1. MANIFEST CONFIGURATION:
Add these to manifest.json:
{
  "permissions": ["identity"],
  "host_permissions": ["https://www.googleapis.com/*"],
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "scopes": [/* appropriate scopes based on APIs used */]
  }
}

2. AUTHENTICATION HELPER FUNCTIONS:
Include these functions in popup.js/sidepanel.js:

// Get OAuth2 token for Google Workspace APIs
async function getWorkspaceToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        console.error('Auth error:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }
      if (!token) {
        reject(new Error('No token received'));
        return;
      }
      resolve(token);
    });
  });
}

// Check if user is authenticated
async function checkAuthStatus() {
  try {
    const token = await getWorkspaceToken(false);
    return !!token;
  } catch (error) {
    return false;
  }
}

// Make authenticated API request
async function makeWorkspaceRequest(url, options = {}) {
  const token = await getWorkspaceToken(true);
  const headers = {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) throw new Error(\`API request failed: \${response.status}\`);
  return response.json();
}

3. SIGN-IN UI:
Add sign-in container to popup.html/sidepanel.html BEFORE main content:

<div id="auth-container" style="display: none; text-align: center; padding: 40px 20px;">
  <h2 style="margin-bottom: 16px; color: #1976d2;">Sign in Required</h2>
  <p style="margin-bottom: 24px; color: #666;">
    This extension needs access to your Google Workspace to function.
  </p>
  <button id="sign-in-btn" style="padding: 12px 24px; background: linear-gradient(135deg, #1976d2, #1565c0); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    Sign in with Google
  </button>
</div>

<div id="main-container" style="display: none;">
  <!-- Your main extension UI -->
</div>

4. INITIALIZATION CODE:
Add to DOMContentLoaded in popup.js/sidepanel.js:

document.addEventListener('DOMContentLoaded', async () => {
  const authContainer = document.getElementById('auth-container');
  const mainContainer = document.getElementById('main-container');
  const signInBtn = document.getElementById('sign-in-btn');
  
  const isAuthenticated = await checkAuthStatus();
  
  if (isAuthenticated) {
    authContainer.style.display = 'none';
    mainContainer.style.display = 'block';
    // Load extension data
  } else {
    authContainer.style.display = 'block';
    mainContainer.style.display = 'none';
  }
  
  signInBtn.addEventListener('click', async () => {
    try {
      signInBtn.textContent = 'Signing in...';
      signInBtn.disabled = true;
      await getWorkspaceToken(true);
      authContainer.style.display = 'none';
      mainContainer.style.display = 'block';
      // Load extension data
    } catch (error) {
      alert('Sign in failed. Please try again.');
      signInBtn.textContent = 'Sign in with Google';
      signInBtn.disabled = false;
    }
  });
});

5. USE TOKEN IN API CALLS:
When making Workspace API calls, always use the token:
const token = await getWorkspaceToken();
fetch('https://www.googleapis.com/...', {
  headers: { 'Authorization': \`Bearer \${token}\` }
});
</google_workspace_authentication>
`;

export const WORKSPACE_AUTH_INSTRUCTIONS_NEW_TAB = `
<google_workspace_authentication>
IF the extension uses Google Workspace APIs (Gmail, Drive, Calendar, Sheets, Docs, Tasks, Chat, Admin SDK, Meet, Slides, Forms):

MANDATORY: Include OAuth2 authentication configuration and code.

1. MANIFEST CONFIGURATION:
Add these to manifest.json:
{
  "permissions": ["identity", "storage"],
  "host_permissions": ["https://www.googleapis.com/*"],
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "scopes": [/* appropriate scopes based on APIs used */]
  }
}

2. AUTHENTICATION HELPER FUNCTIONS:
Include these functions in newtab.js:

async function getWorkspaceToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      if (!token) {
        reject(new Error('No token received'));
        return;
      }
      resolve(token);
    });
  });
}

async function checkAuthStatus() {
  try {
    const token = await getWorkspaceToken(false);
    return !!token;
  } catch (error) {
    return false;
  }
}

async function makeWorkspaceRequest(url, options = {}) {
  const token = await getWorkspaceToken(true);
  const headers = {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) throw new Error(\`API request failed: \${response.status}\`);
  return response.json();
}

3. SIGN-IN UI:
Add sign-in container to newtab.html:

<div id="auth-container" style="display: none; text-align: center; padding: 80px 20px;">
  <h1 style="margin-bottom: 24px; color: #1976d2; font-size: 32px;">Sign in Required</h1>
  <p style="margin-bottom: 32px; color: #666; font-size: 18px;">
    This extension needs access to your Google Workspace to function.
  </p>
  <button id="sign-in-btn" style="padding: 16px 32px; background: linear-gradient(135deg, #1976d2, #1565c0); color: white; border: none; border-radius: 12px; font-size: 18px; font-weight: 600; cursor: pointer;">
    Sign in with Google
  </button>
</div>

<div id="main-container" style="display: none;">
  <!-- Your main new tab UI -->
</div>

4. INITIALIZATION CODE:
Add to DOMContentLoaded in newtab.js:

document.addEventListener('DOMContentLoaded', async () => {
  const authContainer = document.getElementById('auth-container');
  const mainContainer = document.getElementById('main-container');
  const signInBtn = document.getElementById('sign-in-btn');
  
  const isAuthenticated = await checkAuthStatus();
  
  if (isAuthenticated) {
    authContainer.style.display = 'none';
    mainContainer.style.display = 'block';
  } else {
    authContainer.style.display = 'block';
    mainContainer.style.display = 'none';
  }
  
  signInBtn.addEventListener('click', async () => {
    try {
      signInBtn.textContent = 'Signing in...';
      signInBtn.disabled = true;
      await getWorkspaceToken(true);
      authContainer.style.display = 'none';
      mainContainer.style.display = 'block';
    } catch (error) {
      alert('Sign in failed.');
      signInBtn.textContent = 'Sign in with Google';
      signInBtn.disabled = false;
    }
  });
});
</google_workspace_authentication>
`;

export const WORKSPACE_AUTH_INSTRUCTIONS_CONTENT_SCRIPT = `
<google_workspace_authentication>
IF the extension uses Google Workspace APIs (Gmail, Drive, Calendar, Sheets, Docs, Tasks, Chat, Admin SDK, Meet, Slides, Forms):

MANDATORY: Include OAuth2 authentication configuration and code.

1. MANIFEST CONFIGURATION:
Add these to manifest.json:
{
  "permissions": ["identity"],
  "host_permissions": ["https://www.googleapis.com/*"],
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "scopes": [/* appropriate scopes based on APIs used */]
  }
}

2. AUTHENTICATION IN BACKGROUND.JS:
Include authentication helpers in background.js:

async function getWorkspaceToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      if (!token) {
        reject(new Error('No token received'));
        return;
      }
      resolve(token);
    });
  });
}

async function makeWorkspaceRequest(url, options = {}) {
  const token = await getWorkspaceToken(true);
  const headers = {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) throw new Error(\`API request failed: \${response.status}\`);
  return response.json();
}

3. CONTENT SCRIPT MESSAGING:
Content scripts cannot directly use chrome.identity. Use message passing:

// In content.js
chrome.runtime.sendMessage({ 
  type: 'WORKSPACE_API_CALL', 
  url: 'https://www.googleapis.com/...',
  options: { method: 'GET' }
}, response => {
  if (response.success) {
    // Use response.data
  }
});

// In background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'WORKSPACE_API_CALL') {
    makeWorkspaceRequest(request.url, request.options)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open
  }
});
</google_workspace_authentication>
`;

/**
 * Helper function to inject workspace auth instructions based on frontend type
 * @param {string} frontendType - The frontend type (popup, sidepanel, overlay, new_tab, content_script_ui)
 * @returns {string} The appropriate workspace auth instructions
 */
export function getWorkspaceAuthInstructions(frontendType) {
  switch (frontendType) {
    case 'popup':
    case 'sidepanel':
      return WORKSPACE_AUTH_INSTRUCTIONS_POPUP_SIDEPANEL;
    case 'new_tab':
      return WORKSPACE_AUTH_INSTRUCTIONS_NEW_TAB;
    case 'overlay':
    case 'content_script_ui':
      return WORKSPACE_AUTH_INSTRUCTIONS_CONTENT_SCRIPT;
    default:
      return WORKSPACE_AUTH_INSTRUCTIONS_POPUP_SIDEPANEL;
  }
}

