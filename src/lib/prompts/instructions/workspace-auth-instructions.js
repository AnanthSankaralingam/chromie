/**
 * Google Workspace Authentication Instructions for Extension Prompts
 * This is injected into prompts when Workspace APIs are detected
 */

export const WORKSPACE_AUTH_INSTRUCTIONS_POPUP_SIDEPANEL = `
<google_workspace_authentication>
MANDATORY for Workspace APIs: Include OAuth2 config and auth code.

1. MANIFEST (manifest.json):
{ "permissions": ["identity"], "host_permissions": ["https://www.googleapis.com/*"],
  "oauth2": { "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com", "scopes": [/* API scopes */] } }

2. AUTH HELPERS (popup.js/sidepanel.js):
async function getWorkspaceToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) reject(chrome.runtime.lastError || new Error('No token'));
      else resolve(token);
    });
  });
}
async function checkAuthStatus() {
  try { return !!(await getWorkspaceToken(false)); } catch { return false; }
}
async function makeWorkspaceRequest(url, options = {}) {
  const token = await getWorkspaceToken(true);
  const response = await fetch(url, { ...options, headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', ...options.headers } });
  if (!response.ok) throw new Error('API error: ' + response.status);
  return response.json();
}

3. SIGN-IN UI (popup.html/sidepanel.html - add BEFORE main content):
<div id="auth-container" style="display:none;text-align:center;padding:40px 20px">
  <h2 style="color:#1976d2;margin-bottom:16px">Sign in Required</h2>
  <p style="color:#666;margin-bottom:24px">Extension needs Google Workspace access.</p>
  <button id="sign-in-btn" style="padding:12px 24px;background:#1976d2;color:white;border:none;border-radius:8px;cursor:pointer">Sign in with Google</button>
</div>
<div id="main-container" style="display:none"><!-- Main UI --></div>

4. INIT CODE (popup.js/sidepanel.js DOMContentLoaded):
const [authContainer, mainContainer, signInBtn] = ['auth-container', 'main-container', 'sign-in-btn'].map(id => document.getElementById(id));
const isAuth = await checkAuthStatus();
authContainer.style.display = isAuth ? 'none' : 'block';
mainContainer.style.display = isAuth ? 'block' : 'none';
signInBtn.onclick = async () => {
  try { signInBtn.textContent = 'Signing in...'; signInBtn.disabled = true; await getWorkspaceToken(true);
    authContainer.style.display = 'none'; mainContainer.style.display = 'block';
  } catch { alert('Sign in failed'); signInBtn.textContent = 'Sign in with Google'; signInBtn.disabled = false; }
};

5. API CALLS: Use token in Authorization header:
const token = await getWorkspaceToken(); fetch('https://www.googleapis.com/...', { headers: { 'Authorization': 'Bearer ' + token } });
</google_workspace_authentication>
`;

export const WORKSPACE_AUTH_INSTRUCTIONS_NEW_TAB = `
<google_workspace_authentication>
MANDATORY for Workspace APIs: Include OAuth2 config and auth code.

1. MANIFEST (manifest.json):
{ "permissions": ["identity", "storage"], "host_permissions": ["https://www.googleapis.com/*"],
  "oauth2": { "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com", "scopes": [/* API scopes */] } }

2. AUTH HELPERS (newtab.js) - Same as popup variant:
async function getWorkspaceToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) reject(chrome.runtime.lastError || new Error('No token'));
      else resolve(token);
    });
  });
}
async function checkAuthStatus() { try { return !!(await getWorkspaceToken(false)); } catch { return false; } }
async function makeWorkspaceRequest(url, options = {}) {
  const token = await getWorkspaceToken(true);
  const response = await fetch(url, { ...options, headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', ...options.headers } });
  if (!response.ok) throw new Error('API error: ' + response.status);
  return response.json();
}

3. SIGN-IN UI (newtab.html - larger styling for new tab):
<div id="auth-container" style="display:none;text-align:center;padding:80px 20px">
  <h1 style="color:#1976d2;font-size:32px;margin-bottom:24px">Sign in Required</h1>
  <p style="color:#666;font-size:18px;margin-bottom:32px">Extension needs Google Workspace access.</p>
  <button id="sign-in-btn" style="padding:16px 32px;background:#1976d2;color:white;border:none;border-radius:12px;font-size:18px;cursor:pointer">Sign in with Google</button>
</div>
<div id="main-container" style="display:none"><!-- Main new tab UI --></div>

4. INIT CODE (newtab.js DOMContentLoaded) - Same pattern as popup.
</google_workspace_authentication>
`;

export const WORKSPACE_AUTH_INSTRUCTIONS_CONTENT_SCRIPT = `
<google_workspace_authentication>
MANDATORY for Workspace APIs: OAuth2 config + message passing (content scripts can't use chrome.identity directly).

1. MANIFEST (manifest.json):
{ "permissions": ["identity"], "host_permissions": ["https://www.googleapis.com/*"],
  "oauth2": { "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com", "scopes": [/* API scopes */] } }

2. AUTH IN BACKGROUND.JS:
async function getWorkspaceToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) reject(chrome.runtime.lastError || new Error('No token'));
      else resolve(token);
    });
  });
}
async function makeWorkspaceRequest(url, options = {}) {
  const token = await getWorkspaceToken(true);
  const response = await fetch(url, { ...options, headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', ...options.headers } });
  if (!response.ok) throw new Error('API error: ' + response.status);
  return response.json();
}

3. MESSAGE PASSING (content.js → background.js):
// content.js - send API request to background
chrome.runtime.sendMessage({ type: 'WORKSPACE_API_CALL', url: 'https://www.googleapis.com/...', options: {} }, res => {
  if (res.success) { /* use res.data */ }
});

// background.js - handle API calls
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === 'WORKSPACE_API_CALL') {
    makeWorkspaceRequest(req.url, req.options)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
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

