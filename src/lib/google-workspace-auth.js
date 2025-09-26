/**
 * Google Workspace Authentication and API Helper Library
 * Provides OAuth2 authentication and helper functions for Google Workspace APIs
 */

// Common Google Workspace API scopes
export const WORKSPACE_SCOPES = {
  DRIVE: {
    READONLY: 'https://www.googleapis.com/auth/drive.readonly',
    FILE: 'https://www.googleapis.com/auth/drive.file',
    FULL: 'https://www.googleapis.com/auth/drive'
  },
  CALENDAR: {
    READONLY: 'https://www.googleapis.com/auth/calendar.readonly',
    EVENTS: 'https://www.googleapis.com/auth/calendar.events',
    FULL: 'https://www.googleapis.com/auth/calendar'
  },
  GMAIL: {
    READONLY: 'https://www.googleapis.com/auth/gmail.readonly',
    SEND: 'https://www.googleapis.com/auth/gmail.send',
    MODIFY: 'https://www.googleapis.com/auth/gmail.modify',
    FULL: 'https://www.googleapis.com/auth/gmail'
  },
  DOCS: {
    READONLY: 'https://www.googleapis.com/auth/documents.readonly',
    FULL: 'https://www.googleapis.com/auth/documents'
  },
  SHEETS: {
    READONLY: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    FULL: 'https://www.googleapis.com/auth/spreadsheets'
  },
  SLIDES: {
    READONLY: 'https://www.googleapis.com/auth/presentations.readonly',
    FULL: 'https://www.googleapis.com/auth/presentations'
  },
  FORMS: {
    READONLY: 'https://www.googleapis.com/auth/forms.responses.readonly',
    FULL: 'https://www.googleapis.com/auth/forms'
  },
  ADMIN: {
    USER_READONLY: 'https://www.googleapis.com/auth/admin.directory.user.readonly',
    GROUP_READONLY: 'https://www.googleapis.com/auth/admin.directory.group.readonly',
    DOMAIN_READONLY: 'https://www.googleapis.com/auth/admin.directory.domain.readonly'
  }
};

// API Base URLs
export const API_ENDPOINTS = {
  DRIVE: 'https://www.googleapis.com/drive/v3',
  CALENDAR: 'https://www.googleapis.com/calendar/v3',
  GMAIL: 'https://www.googleapis.com/gmail/v1',
  DOCS: 'https://docs.googleapis.com/v1',
  SHEETS: 'https://sheets.googleapis.com/v4',
  SLIDES: 'https://slides.googleapis.com/v1',
  FORMS: 'https://forms.googleapis.com/v1',
  ADMIN: 'https://admin.googleapis.com/admin/directory/v1'
};

/**
 * Get OAuth2 authentication token using Chrome Identity API
 * @param {boolean} interactive - Whether to show interactive auth flow
 * @returns {Promise<string>} Authentication token
 */
export function getGoogleWorkspaceToken(interactive = true) {
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

/**
 * Remove cached authentication token
 * @param {string} token - Token to remove
 * @returns {Promise<void>}
 */
export function removeGoogleWorkspaceToken(token) {
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

/**
 * Make authenticated API request to Google Workspace
 * @param {string} url - API endpoint URL
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} API response
 */
export async function makeWorkspaceAPIRequest(url, options = {}) {
  const token = await getGoogleWorkspaceToken();
  
  const defaultHeaders = {
    'Authorization': `Bearer ${token}`,
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
    // Remove expired token and retry
    await removeGoogleWorkspaceToken(token);
    const newToken = await getGoogleWorkspaceToken();
    
    requestOptions.headers['Authorization'] = `Bearer ${newToken}`;
    return fetch(url, requestOptions);
  }
  
  return response;
}

/**
 * Handle API errors and provide user-friendly messages
 * @param {Response} response - API response
 * @returns {Promise<object>} Parsed response or error
 */
export async function handleWorkspaceAPIResponse(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    const error = new Error(
      errorData.error?.message || 
      `API request failed with status ${response.status}`
    );
    
    error.status = response.status;
    error.code = errorData.error?.code;
    throw error;
  }
  
  return response.json();
}

/**
 * Generate manifest.json configuration for Google Workspace integration
 * @param {Array<string>} scopes - Required OAuth2 scopes
 * @param {string} clientId - Google OAuth2 client ID placeholder
 * @returns {object} Manifest configuration
 */
export function generateWorkspaceManifestConfig(scopes = [], clientId = 'YOUR_CLIENT_ID.googleusercontent.com') {
  return {
    permissions: ['identity'],
    oauth2: {
      client_id: clientId,
      scopes: scopes
    },
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...' // Placeholder for extension key
  };
}

/**
 * Common error handling for Workspace API calls
 * @param {Error} error - Error from API call
 * @returns {object} User-friendly error information
 */
export function formatWorkspaceError(error) {
  const errorMappings = {
    400: 'Invalid request. Please check your parameters.',
    401: 'Authentication required. Please sign in to Google.',
    403: 'Permission denied. Please check your OAuth2 scopes.',
    404: 'Resource not found.',
    429: 'Too many requests. Please try again later.',
    500: 'Google server error. Please try again later.'
  };

  return {
    message: errorMappings[error.status] || error.message || 'An unexpected error occurred',
    status: error.status,
    code: error.code,
    retryable: [429, 500, 502, 503, 504].includes(error.status)
  };
}

/**
 * Generate boilerplate code for Google Workspace authentication
 * @param {Array<string>} apis - APIs to include (drive, gmail, calendar, etc.)
 * @returns {string} JavaScript code for authentication setup
 */
export function generateWorkspaceAuthCode(apis = []) {
  const scopeMap = {
    drive: 'WORKSPACE_SCOPES.DRIVE.FULL',
    gmail: 'WORKSPACE_SCOPES.GMAIL.READONLY',
    calendar: 'WORKSPACE_SCOPES.CALENDAR.FULL',
    docs: 'WORKSPACE_SCOPES.DOCS.FULL',
    sheets: 'WORKSPACE_SCOPES.SHEETS.FULL',
    slides: 'WORKSPACE_SCOPES.SLIDES.FULL',
    forms: 'WORKSPACE_SCOPES.FORMS.FULL',
    admin: 'WORKSPACE_SCOPES.ADMIN.USER_READONLY'
  };

  const requiredScopes = apis.map(api => scopeMap[api] || `'https://www.googleapis.com/auth/${api}'`);

  return `
// Google Workspace Authentication Setup
import { 
  getGoogleWorkspaceToken, 
  makeWorkspaceAPIRequest, 
  handleWorkspaceAPIResponse,
  formatWorkspaceError,
  WORKSPACE_SCOPES,
  API_ENDPOINTS 
} from './google-workspace-auth.js';

// Configure required scopes
const REQUIRED_SCOPES = [${requiredScopes.join(', ')}];

// Authentication helper
async function authenticateWorkspace() {
  try {
    const token = await getGoogleWorkspaceToken(true);
    console.log('✅ Google Workspace authentication successful');
    return token;
  } catch (error) {
    console.error('❌ Authentication failed:', error);
    throw error;
  }
}

// Generic API call helper
async function callWorkspaceAPI(endpoint, options = {}) {
  try {
    const response = await makeWorkspaceAPIRequest(endpoint, options);
    return await handleWorkspaceAPIResponse(response);
  } catch (error) {
    const formattedError = formatWorkspaceError(error);
    console.error('API Error:', formattedError);
    throw formattedError;
  }
}

// Initialize authentication on extension startup
chrome.runtime.onStartup.addListener(async () => {
  try {
    await authenticateWorkspace();
  } catch (error) {
    console.log('Deferred authentication - will prompt when needed');
  }
});
`;
}

/**
 * Generate example code for specific Google Workspace API
 * @param {string} apiName - API name (drive, gmail, calendar, etc.)
 * @returns {string} Example JavaScript code
 */
export function generateWorkspaceAPIExample(apiName) {
  const examples = {
    drive: `
// Google Drive Examples
async function listDriveFiles() {
  const endpoint = \`\${API_ENDPOINTS.DRIVE}/files\`;
  return await callWorkspaceAPI(endpoint);
}

async function createDriveFile(name, content, mimeType = 'text/plain') {
  const metadata = { name };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
  form.append('file', new Blob([content], {type: mimeType}));
  
  const endpoint = \`\${API_ENDPOINTS.DRIVE}/files?uploadType=multipart\`;
  return await callWorkspaceAPI(endpoint, { method: 'POST', body: form });
}`,

    gmail: `
// Gmail Examples
async function getUnreadEmails() {
  const endpoint = \`\${API_ENDPOINTS.GMAIL}/users/me/messages?q=is:unread\`;
  return await callWorkspaceAPI(endpoint);
}

async function sendEmail(to, subject, body) {
  const email = ['To: ' + to, 'Subject: ' + subject, '', body].join('\\n');
  const encodedEmail = btoa(email).replace(/\\+/g, '-').replace(/\\//g, '_');
  
  const endpoint = \`\${API_ENDPOINTS.GMAIL}/users/me/messages/send\`;
  return await callWorkspaceAPI(endpoint, {
    method: 'POST',
    body: JSON.stringify({ raw: encodedEmail })
  });
}`,

    calendar: `
// Google Calendar Examples
async function listUpcomingEvents() {
  const timeMin = new Date().toISOString();
  const endpoint = \`\${API_ENDPOINTS.CALENDAR}/calendars/primary/events?timeMin=\${timeMin}&maxResults=10&singleEvents=true&orderBy=startTime\`;
  return await callWorkspaceAPI(endpoint);
}

async function createCalendarEvent(title, startTime, endTime, attendees = []) {
  const event = {
    summary: title,
    start: { dateTime: startTime, timeZone: 'America/Los_Angeles' },
    end: { dateTime: endTime, timeZone: 'America/Los_Angeles' },
    attendees: attendees.map(email => ({email}))
  };
  
  const endpoint = \`\${API_ENDPOINTS.CALENDAR}/calendars/primary/events\`;
  return await callWorkspaceAPI(endpoint, {
    method: 'POST',
    body: JSON.stringify(event)
  });
}`,

    sheets: `
// Google Sheets Examples
async function readSheetData(spreadsheetId, range) {
  const endpoint = \`\${API_ENDPOINTS.SHEETS}/spreadsheets/\${spreadsheetId}/values/\${range}\`;
  return await callWorkspaceAPI(endpoint);
}

async function writeSheetData(spreadsheetId, range, values) {
  const endpoint = \`\${API_ENDPOINTS.SHEETS}/spreadsheets/\${spreadsheetId}/values/\${range}?valueInputOption=RAW\`;
  return await callWorkspaceAPI(endpoint, {
    method: 'PUT',
    body: JSON.stringify({ values })
  });
}`,

    docs: `
// Google Docs Examples
async function createDocument(title) {
  const endpoint = \`\${API_ENDPOINTS.DOCS}/documents\`;
  return await callWorkspaceAPI(endpoint, {
    method: 'POST',
    body: JSON.stringify({ title })
  });
}

async function addTextToDocument(documentId, text, index = 1) {
  const requests = [{ insertText: { location: { index }, text } }];
  const endpoint = \`\${API_ENDPOINTS.DOCS}/documents/\${documentId}:batchUpdate\`;
  return await callWorkspaceAPI(endpoint, {
    method: 'POST',
    body: JSON.stringify({ requests })
  });
}`
  };

  return examples[apiName] || `// Example code for ${apiName} API not available`;
}
