/**
 * Template code for Google Workspace authentication
 * This gets injected into generated extensions that use Workspace APIs
 */

export const WORKSPACE_AUTH_TEMPLATE = {
  // Helper functions to include in popup.js or background.js
  helperFunctions: `
// === Google Workspace Authentication ===

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

// Check if user is authenticated (non-interactive)
async function checkAuthStatus() {
  try {
    const token = await getWorkspaceToken(false);
    return !!token;
  } catch (error) {
    return false;
  }
}

// Sign out
async function signOut() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (token) {
        chrome.identity.removeCachedAuthToken({ token }, () => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

// Make authenticated request to Google Workspace API
async function makeWorkspaceRequest(url, options = {}) {
  const token = await getWorkspaceToken(true);
  
  const headers = {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  if (!response.ok) {
    throw new Error(\`API request failed: \${response.status} \${response.statusText}\`);
  }
  
  return response.json();
}
`,

  // Sign-in UI template (for popup.html or sidepanel.html)
  signInUI: `
<div id="auth-container" style="display: none;">
  <div style="text-align: center; padding: 40px 20px;">
    <h2 style="margin-bottom: 16px; color: #1976d2;">Sign in Required</h2>
    <p style="margin-bottom: 24px; color: #666;">
      This extension needs access to your Google Workspace to function.
    </p>
    <button id="sign-in-btn" style="
      padding: 12px 24px;
      background: linear-gradient(135deg, #1976d2, #1565c0);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: all 0.2s;
    ">
      Sign in with Google
    </button>
  </div>
</div>

<div id="main-container" style="display: none;">
  <!-- Your main extension UI goes here -->
</div>
`,

  // Initialization code for popup.js
  initCode: `
// Initialize extension - check auth status
document.addEventListener('DOMContentLoaded', async () => {
  const authContainer = document.getElementById('auth-container');
  const mainContainer = document.getElementById('main-container');
  const signInBtn = document.getElementById('sign-in-btn');
  
  // Check if already authenticated
  const isAuthenticated = await checkAuthStatus();
  
  if (isAuthenticated) {
    authContainer.style.display = 'none';
    mainContainer.style.display = 'block';
    // Load your extension data here
    await loadExtensionData();
  } else {
    authContainer.style.display = 'block';
    mainContainer.style.display = 'none';
  }
  
  // Handle sign-in button click
  signInBtn.addEventListener('click', async () => {
    try {
      signInBtn.textContent = 'Signing in...';
      signInBtn.disabled = true;
      
      await getWorkspaceToken(true);
      
      authContainer.style.display = 'none';
      mainContainer.style.display = 'block';
      
      // Load your extension data here
      await loadExtensionData();
    } catch (error) {
      console.error('Sign in failed:', error);
      alert('Sign in failed. Please try again.');
      signInBtn.textContent = 'Sign in with Google';
      signInBtn.disabled = false;
    }
  });
});
`
};

