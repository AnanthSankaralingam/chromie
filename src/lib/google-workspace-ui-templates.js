/**
 * Google Workspace UI Templates
 * Provides ready-to-use UI components for Google Workspace authentication and setup
 */

/**
 * Generate authentication UI for popup extensions
 */
export function generateWorkspaceAuthPopup(apis = []) {
  return {
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      width: 350px;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
    }
    .auth-container {
      text-align: center;
    }
    .auth-status {
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
    }
    .auth-success {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    .auth-error {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    .auth-pending {
      background-color: #fff3cd;
      color: #856404;
      border: 1px solid #ffeaa7;
    }
    .btn {
      background-color: #4285f4;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin: 5px;
    }
    .btn:hover {
      background-color: #3367d6;
    }
    .btn:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }
    .setup-instructions {
      text-align: left;
      font-size: 12px;
      color: #666;
      margin-top: 20px;
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 4px;
    }
    .setup-instructions h4 {
      margin-top: 0;
      color: #333;
    }
    .setup-instructions ol {
      padding-left: 20px;
    }
    .setup-instructions li {
      margin: 5px 0;
    }
    .api-list {
      text-align: left;
      margin: 10px 0;
    }
    .api-item {
      display: flex;
      align-items: center;
      padding: 5px 0;
    }
    .api-status {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 8px;
    }
    .api-connected {
      background-color: #28a745;
    }
    .api-disconnected {
      background-color: #dc3545;
    }
    .hidden {
      display: none;
    }
  </style>
</head>
<body>
  <div class="auth-container">
    <h3>Google Workspace Setup</h3>
    
    <div id="authStatus" class="auth-status hidden"></div>
    
    <div id="authSection">
      <p>Connect to Google Workspace to use this extension:</p>
      
      <div class="api-list">
        ${apis.map(api => `
        <div class="api-item">
          <div class="api-status api-disconnected" id="status-${api}"></div>
          <span>${formatApiName(api)}</span>
        </div>
        `).join('')}
      </div>
      
      <button id="signInBtn" class="btn">Sign in to Google</button>
      <button id="signOutBtn" class="btn" style="display: none;">Sign Out</button>
    </div>
    
    <div class="setup-instructions">
      <h4>🔧 First Time Setup Required</h4>
      <p>To use Google Workspace features, you need to:</p>
      <ol>
        <li>Get a Google Cloud Project client ID</li>
        <li>Enable the required Google APIs</li>
        <li>Update the extension manifest</li>
      </ol>
      <p><strong>Need help?</strong> Check the extension documentation for detailed setup instructions.</p>
    </div>
  </div>

  <script src="popup.js"></script>
</body>
</html>`,

    js: `// Google Workspace Authentication Popup
document.addEventListener('DOMContentLoaded', async () => {
  const signInBtn = document.getElementById('signInBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const authStatus = document.getElementById('authStatus');
  
  // Check initial auth status
  await checkAuthStatus();
  
  signInBtn.addEventListener('click', handleSignIn);
  signOutBtn.addEventListener('click', handleSignOut);
  
  async function checkAuthStatus() {
    try {
      // Try to get token without interactive flow
      const token = await getGoogleWorkspaceToken(false);
      if (token) {
        showAuthSuccess();
        await testAPIAccess();
      } else {
        showAuthRequired();
      }
    } catch (error) {
      console.log('Not authenticated:', error);
      showAuthRequired();
    }
  }
  
  async function handleSignIn() {
    try {
      signInBtn.disabled = true;
      signInBtn.textContent = 'Signing in...';
      showAuthPending('Authenticating with Google...');
      
      const token = await getGoogleWorkspaceToken(true);
      console.log('✅ Authentication successful');
      
      showAuthSuccess();
      await testAPIAccess();
      
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      showAuthError(getErrorMessage(error));
    } finally {
      signInBtn.disabled = false;
      signInBtn.textContent = 'Sign in to Google';
    }
  }
  
  async function handleSignOut() {
    try {
      // Get current token to remove it
      const token = await getGoogleWorkspaceToken(false);
      if (token) {
        await removeGoogleWorkspaceToken(token);
      }
      
      showAuthRequired();
      updateAPIStatus({});
      
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }
  
  async function testAPIAccess() {
    const apis = [${apis.map(api => `'${api}'`).join(', ')}];
    const results = {};
    
    for (const api of apis) {
      try {
        await testSingleAPI(api);
        results[api] = true;
      } catch (error) {
        console.error(\`API test failed for \${api}:\`, error);
        results[api] = false;
      }
    }
    
    updateAPIStatus(results);
  }
  
  async function testSingleAPI(api) {
    // Simple API test calls
    const testEndpoints = {
      'drive': 'https://www.googleapis.com/drive/v3/about?fields=user',
      'gmail': 'https://www.googleapis.com/gmail/v1/users/me/profile',
      'calendar': 'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1',
      'docs': 'https://docs.googleapis.com/v1/documents/test', // This will fail but tests auth
      'sheets': 'https://sheets.googleapis.com/v4/spreadsheets/test', // This will fail but tests auth
      'slides': 'https://slides.googleapis.com/v1/presentations/test' // This will fail but tests auth
    };
    
    const endpoint = testEndpoints[api];
    if (!endpoint) return;
    
    const response = await makeWorkspaceAPIRequest(endpoint);
    // For docs/sheets/slides, 404 is expected and means auth is working
    if (response.status === 404 && ['docs', 'sheets', 'slides'].includes(api)) {
      return; // Auth is working
    }
    
    if (!response.ok && response.status !== 404) {
      throw new Error(\`API test failed: \${response.status}\`);
    }
  }
  
  function updateAPIStatus(results) {
    Object.keys(results).forEach(api => {
      const statusElement = document.getElementById(\`status-\${api}\`);
      if (statusElement) {
        statusElement.className = \`api-status \${results[api] ? 'api-connected' : 'api-disconnected'}\`;
      }
    });
  }
  
  function showAuthSuccess() {
    authStatus.className = 'auth-status auth-success';
    authStatus.textContent = '✅ Connected to Google Workspace';
    authStatus.classList.remove('hidden');
    signInBtn.style.display = 'none';
    signOutBtn.style.display = 'inline-block';
  }
  
  function showAuthError(message) {
    authStatus.className = 'auth-status auth-error';
    authStatus.textContent = \`❌ \${message}\`;
    authStatus.classList.remove('hidden');
    signInBtn.style.display = 'inline-block';
    signOutBtn.style.display = 'none';
  }
  
  function showAuthPending(message) {
    authStatus.className = 'auth-status auth-pending';
    authStatus.textContent = message;
    authStatus.classList.remove('hidden');
  }
  
  function showAuthRequired() {
    authStatus.className = 'auth-status auth-pending';
    authStatus.textContent = '🔐 Google Workspace authentication required';
    authStatus.classList.remove('hidden');
    signInBtn.style.display = 'inline-block';
    signOutBtn.style.display = 'none';
  }
  
  function getErrorMessage(error) {
    if (error.message?.includes('OAuth2')) {
      return 'OAuth2 setup required. Please check extension configuration.';
    }
    if (error.message?.includes('client_id')) {
      return 'Missing client ID. Please update manifest.json with your Google Cloud client ID.';
    }
    if (error.message?.includes('scope')) {
      return 'Permission denied. Please check OAuth2 scopes in manifest.json.';
    }
    return error.message || 'Authentication failed. Please try again.';
  }
});

// Google Workspace API helper functions
${generateWorkspaceHelpers(apis)}`
  };
}

/**
 * Generate authentication UI for sidepanel extensions
 */
export function generateWorkspaceAuthSidepanel(apis = []) {
  return {
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      width: 100%;
      height: 100vh;
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f8f9fa;
    }
    .container {
      max-width: 400px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .auth-card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .auth-status {
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
      text-align: center;
    }
    .auth-success {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    .auth-error {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    .auth-pending {
      background-color: #fff3cd;
      color: #856404;
      border: 1px solid #ffeaa7;
    }
    .btn {
      background-color: #4285f4;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      width: 100%;
      margin: 10px 0;
    }
    .btn:hover {
      background-color: #3367d6;
    }
    .btn:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }
    .btn-secondary {
      background-color: #6c757d;
    }
    .btn-secondary:hover {
      background-color: #545b62;
    }
    .api-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 20px 0;
    }
    .api-card {
      padding: 15px;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      text-align: center;
      background: white;
    }
    .api-connected {
      border-color: #28a745;
      background-color: #f8fff9;
    }
    .api-disconnected {
      border-color: #dc3545;
      background-color: #fff8f8;
    }
    .api-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      margin: 0 auto 8px;
    }
    .connected {
      background-color: #28a745;
    }
    .disconnected {
      background-color: #dc3545;
    }
    .setup-guide {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .setup-guide h4 {
      margin-top: 0;
      color: #495057;
    }
    .setup-steps {
      list-style: none;
      padding: 0;
    }
    .setup-steps li {
      padding: 10px 0;
      border-bottom: 1px solid #e9ecef;
      position: relative;
      padding-left: 30px;
    }
    .setup-steps li:before {
      content: counter(step-counter);
      counter-increment: step-counter;
      position: absolute;
      left: 0;
      top: 10px;
      background: #007bff;
      color: white;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .setup-steps {
      counter-reset: step-counter;
    }
    .hidden {
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Google Workspace</h2>
    </div>
    
    <div class="auth-card">
      <div id="authStatus" class="auth-status hidden"></div>
      
      <div class="api-grid">
        ${apis.map(api => `
        <div class="api-card api-disconnected" id="card-${api}">
          <div class="api-icon disconnected" id="icon-${api}"></div>
          <div>${formatApiName(api)}</div>
        </div>
        `).join('')}
      </div>
      
      <button id="signInBtn" class="btn">Connect to Google Workspace</button>
      <button id="signOutBtn" class="btn btn-secondary hidden">Disconnect</button>
    </div>
    
    <div class="setup-guide">
      <h4>🔧 Setup Required</h4>
      <p>To use Google Workspace features:</p>
      <ol class="setup-steps">
        <li>Create a Google Cloud Project</li>
        <li>Enable required Google APIs</li>
        <li>Get OAuth2 client credentials</li>
        <li>Update extension manifest.json</li>
      </ol>
      <p><small>Check the extension documentation for detailed instructions.</small></p>
    </div>
  </div>

  <script src="sidepanel.js"></script>
</body>
</html>`,

    js: `// Google Workspace Authentication Sidepanel
document.addEventListener('DOMContentLoaded', async () => {
  const signInBtn = document.getElementById('signInBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const authStatus = document.getElementById('authStatus');
  
  // Check initial auth status
  await checkAuthStatus();
  
  signInBtn.addEventListener('click', handleSignIn);
  signOutBtn.addEventListener('click', handleSignOut);
  
  async function checkAuthStatus() {
    try {
      const token = await getGoogleWorkspaceToken(false);
      if (token) {
        showAuthSuccess();
        await testAPIAccess();
      } else {
        showAuthRequired();
      }
    } catch (error) {
      console.log('Not authenticated:', error);
      showAuthRequired();
    }
  }
  
  async function handleSignIn() {
    try {
      signInBtn.disabled = true;
      signInBtn.textContent = 'Connecting...';
      showAuthPending('Authenticating with Google Workspace...');
      
      const token = await getGoogleWorkspaceToken(true);
      console.log('✅ Authentication successful');
      
      showAuthSuccess();
      await testAPIAccess();
      
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      showAuthError(getErrorMessage(error));
    } finally {
      signInBtn.disabled = false;
      signInBtn.textContent = 'Connect to Google Workspace';
    }
  }
  
  async function handleSignOut() {
    try {
      const token = await getGoogleWorkspaceToken(false);
      if (token) {
        await removeGoogleWorkspaceToken(token);
      }
      
      showAuthRequired();
      updateAPIStatus({});
      
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }
  
  async function testAPIAccess() {
    const apis = [${apis.map(api => `'${api}'`).join(', ')}];
    const results = {};
    
    for (const api of apis) {
      try {
        await testSingleAPI(api);
        results[api] = true;
      } catch (error) {
        console.error(\`API test failed for \${api}:\`, error);
        results[api] = false;
      }
    }
    
    updateAPIStatus(results);
  }
  
  async function testSingleAPI(api) {
    const testEndpoints = {
      'drive': 'https://www.googleapis.com/drive/v3/about?fields=user',
      'gmail': 'https://www.googleapis.com/gmail/v1/users/me/profile',
      'calendar': 'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1'
    };
    
    const endpoint = testEndpoints[api];
    if (!endpoint) return;
    
    const response = await makeWorkspaceAPIRequest(endpoint);
    if (!response.ok) {
      throw new Error(\`API test failed: \${response.status}\`);
    }
  }
  
  function updateAPIStatus(results) {
    Object.keys(results).forEach(api => {
      const card = document.getElementById(\`card-\${api}\`);
      const icon = document.getElementById(\`icon-\${api}\`);
      
      if (card && icon) {
        const isConnected = results[api];
        card.className = \`api-card \${isConnected ? 'api-connected' : 'api-disconnected'}\`;
        icon.className = \`api-icon \${isConnected ? 'connected' : 'disconnected'}\`;
      }
    });
  }
  
  function showAuthSuccess() {
    authStatus.className = 'auth-status auth-success';
    authStatus.textContent = '✅ Connected to Google Workspace';
    authStatus.classList.remove('hidden');
    signInBtn.classList.add('hidden');
    signOutBtn.classList.remove('hidden');
  }
  
  function showAuthError(message) {
    authStatus.className = 'auth-status auth-error';
    authStatus.textContent = \`❌ \${message}\`;
    authStatus.classList.remove('hidden');
    signInBtn.classList.remove('hidden');
    signOutBtn.classList.add('hidden');
  }
  
  function showAuthPending(message) {
    authStatus.className = 'auth-status auth-pending';
    authStatus.textContent = message;
    authStatus.classList.remove('hidden');
  }
  
  function showAuthRequired() {
    authStatus.className = 'auth-status auth-pending';
    authStatus.textContent = '🔐 Connect to Google Workspace to get started';
    authStatus.classList.remove('hidden');
    signInBtn.classList.remove('hidden');
    signOutBtn.classList.add('hidden');
  }
  
  function getErrorMessage(error) {
    if (error.message?.includes('OAuth2')) {
      return 'OAuth2 setup required. Check extension configuration.';
    }
    if (error.message?.includes('client_id')) {
      return 'Missing client ID. Update manifest.json.';
    }
    if (error.message?.includes('scope')) {
      return 'Permission denied. Check OAuth2 scopes.';
    }
    return error.message || 'Connection failed. Please try again.';
  }
});

// Google Workspace API helper functions
${generateWorkspaceHelpers(apis)}`
  };
}

/**
 * Generate manifest configuration with proper OAuth2 setup
 */
export function generateWorkspaceManifest(apis = [], extensionName = "Google Workspace Extension") {
  const scopeMap = {
    'drive': 'https://www.googleapis.com/auth/drive.file',
    'gmail': 'https://www.googleapis.com/auth/gmail.readonly',
    'calendar': 'https://www.googleapis.com/auth/calendar.readonly',
    'docs': 'https://www.googleapis.com/auth/documents',
    'sheets': 'https://www.googleapis.com/auth/spreadsheets',
    'slides': 'https://www.googleapis.com/auth/presentations',
    'forms': 'https://www.googleapis.com/auth/forms',
    'admin': 'https://www.googleapis.com/auth/admin.directory.user.readonly'
  };

  const requiredScopes = apis.map(api => scopeMap[api]).filter(Boolean);

  return {
    "manifest_version": 3,
    "name": extensionName,
    "version": "1.0.0",
    "description": "Chrome extension with Google Workspace integration",
    "permissions": [
      "identity",
      "storage",
      "activeTab"
    ],
    "oauth2": {
      "client_id": "YOUR_CLIENT_ID.googleusercontent.com",
      "scopes": requiredScopes
    },
    "background": {
      "service_worker": "background.js"
    },
    "action": {
      "default_popup": "popup.html"
    },
    "icons": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  };
}

/**
 * Generate setup instructions for users
 */
export function generateSetupInstructions(apis = []) {
  return `# Google Workspace Extension Setup

## Required Setup Steps

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Note your project ID

### 2. Enable APIs
Enable these APIs in your Google Cloud project:
${apis.map(api => `- ${formatApiName(api)} API`).join('\n')}

### 3. Create OAuth2 Credentials
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client IDs**
3. Choose **Chrome Extension** as application type
4. Add your extension ID to authorized origins

### 4. Update Extension
1. Replace \`YOUR_CLIENT_ID.googleusercontent.com\` in manifest.json
2. Use your actual OAuth2 client ID from step 3
3. Reload the extension in Chrome

### 5. Test Connection
1. Open the extension
2. Click "Sign in to Google" or "Connect to Google Workspace"
3. Complete the OAuth flow
4. Verify API connections are working

## Troubleshooting

**"OAuth2 setup required"**
- Make sure you've created OAuth2 credentials
- Update manifest.json with correct client_id

**"Permission denied"**
- Check that required APIs are enabled
- Verify OAuth2 scopes match your needs

**"Missing client ID"**
- Replace placeholder client_id in manifest.json
- Use format: your-id.googleusercontent.com

## API Usage Examples

${apis.map(api => `
### ${formatApiName(api)}
\`\`\`javascript
// Example usage for ${api}
${getAPIExample(api)}
\`\`\`
`).join('\n')}

Need more help? Check the [Chrome Extension OAuth2 documentation](https://developer.chrome.com/docs/extensions/mv3/tut_oauth/).
`;
}

/**
 * Helper function to format API names for display
 */
function formatApiName(api) {
  const names = {
    'drive': 'Google Drive',
    'gmail': 'Gmail',
    'calendar': 'Google Calendar',
    'docs': 'Google Docs',
    'sheets': 'Google Sheets',
    'slides': 'Google Slides',
    'forms': 'Google Forms',
    'admin': 'Google Admin'
  };
  return names[api] || api.charAt(0).toUpperCase() + api.slice(1);
}

/**
 * Generate workspace helper functions
 */
function generateWorkspaceHelpers(apis) {
  return `
// Google Workspace Authentication Token Management
async function getGoogleWorkspaceToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(token);
      }
    });
  });
}

async function removeGoogleWorkspaceToken(token) {
  return new Promise((resolve, reject) => {
    chrome.identity.removeCachedAuthToken({ token }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

async function makeWorkspaceAPIRequest(url, options = {}) {
  const token = await getGoogleWorkspaceToken(true);
  
  const defaultHeaders = {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json'
  };

  const requestOptions = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  const response = await fetch(url, requestOptions);
  
  // Handle token expiration
  if (response.status === 401) {
    await removeGoogleWorkspaceToken(token);
    const newToken = await getGoogleWorkspaceToken(true);
    requestOptions.headers['Authorization'] = \`Bearer \${newToken}\`;
    return fetch(url, requestOptions);
  }
  
  return response;
}
`;
}

/**
 * Get example code for specific API
 */
function getAPIExample(api) {
  const examples = {
    'drive': `
const files = await makeWorkspaceAPIRequest('https://www.googleapis.com/drive/v3/files');
const fileList = await files.json();
console.log('Drive files:', fileList.files);`,
    
    'gmail': `
const profile = await makeWorkspaceAPIRequest('https://www.googleapis.com/gmail/v1/users/me/profile');
const userProfile = await profile.json();
console.log('Gmail profile:', userProfile);`,
    
    'calendar': `
const calendars = await makeWorkspaceAPIRequest('https://www.googleapis.com/calendar/v3/users/me/calendarList');
const calendarList = await calendars.json();
console.log('Calendars:', calendarList.items);`,
    
    'docs': `
const doc = await makeWorkspaceAPIRequest('https://docs.googleapis.com/v1/documents/DOCUMENT_ID');
const document = await doc.json();
console.log('Document:', document.title);`,
    
    'sheets': `
const sheet = await makeWorkspaceAPIRequest('https://sheets.googleapis.com/v4/spreadsheets/SHEET_ID/values/A1:B10');
const data = await sheet.json();
console.log('Sheet data:', data.values);`
  };
  
  return examples[api] || `// Example code for ${api} API`;
}
