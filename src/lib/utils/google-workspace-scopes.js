/**
 * Maps Google Workspace API names to their required OAuth 2.0 scopes
 * This enables automatic scope detection and manifest configuration
 */

export const WORKSPACE_API_SCOPES = {
  'Gmail API': {
    readonly: ['https://www.googleapis.com/auth/gmail.readonly'],
    send: ['https://www.googleapis.com/auth/gmail.send'],
    modify: ['https://www.googleapis.com/auth/gmail.modify'],
    full: ['https://www.googleapis.com/auth/gmail']
  },
  'Google Drive API': {
    file: ['https://www.googleapis.com/auth/drive.file'],
    readonly: ['https://www.googleapis.com/auth/drive.readonly'],
    full: ['https://www.googleapis.com/auth/drive']
  },
  'Google Calendar API': {
    readonly: ['https://www.googleapis.com/auth/calendar.readonly'],
    events: ['https://www.googleapis.com/auth/calendar.events'],
    full: ['https://www.googleapis.com/auth/calendar']
  },
  'Google Sheets API': {
    readonly: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    full: ['https://www.googleapis.com/auth/spreadsheets']
  },
  'Google Docs API': {
    readonly: ['https://www.googleapis.com/auth/documents.readonly'],
    full: ['https://www.googleapis.com/auth/documents']
  },
  'Google Tasks API': {
    readonly: ['https://www.googleapis.com/auth/tasks.readonly'],
    full: ['https://www.googleapis.com/auth/tasks']
  },
  'Google Chat API': {
    bot: ['https://www.googleapis.com/auth/chat.bot'],
    full: ['https://www.googleapis.com/auth/chat.spaces']
  },
  'Admin SDK API': {
    users_readonly: ['https://www.googleapis.com/auth/admin.directory.user.readonly'],
    groups_readonly: ['https://www.googleapis.com/auth/admin.directory.group.readonly'],
    users: ['https://www.googleapis.com/auth/admin.directory.user'],
    groups: ['https://www.googleapis.com/auth/admin.directory.group']
  },
  'Google Meet API': {
    full: ['https://www.googleapis.com/auth/meetings.space.created']
  },
  'Google Slides API': {
    readonly: ['https://www.googleapis.com/auth/presentations.readonly'],
    full: ['https://www.googleapis.com/auth/presentations']
  },
  'Google Forms API': {
    body: ['https://www.googleapis.com/auth/forms.body'],
    responses_readonly: ['https://www.googleapis.com/auth/forms.responses.readonly']
  }
};

/**
 * Detects if an API is a Google Workspace API
 */
export function isWorkspaceAPI(apiName) {
  if (!apiName) return false;
  
  return Object.keys(WORKSPACE_API_SCOPES).some(key => 
    apiName.toLowerCase().includes(key.toLowerCase()) ||
    key.toLowerCase().includes(apiName.toLowerCase())
  );
}

/**
 * Gets default scopes for a Workspace API
 * Defaults to "full" access if specific level not specified
 */
export function getDefaultScopes(apiName) {
  const key = Object.keys(WORKSPACE_API_SCOPES).find(k => 
    apiName.toLowerCase().includes(k.toLowerCase())
  );
  
  if (!key) return [];
  
  const apiScopes = WORKSPACE_API_SCOPES[key];
  
  // Prioritize: full > modify > readonly
  if (apiScopes.full) return apiScopes.full;
  if (apiScopes.modify) return apiScopes.modify;
  if (apiScopes.readonly) return apiScopes.readonly;
  
  // Return first available scope set
  return Object.values(apiScopes)[0] || [];
}

/**
 * Determines required scopes from user request context
 * Analyzes the request to choose appropriate permission level
 */
export function inferScopesFromContext(apiName, userRequest) {
  const request = userRequest.toLowerCase();
  const key = Object.keys(WORKSPACE_API_SCOPES).find(k => 
    apiName.toLowerCase().includes(k.toLowerCase())
  );
  
  if (!key) return getDefaultScopes(apiName);
  
  const apiScopes = WORKSPACE_API_SCOPES[key];
  
  // Check for read-only operations
  if (request.includes('read') || request.includes('view') || 
      request.includes('display') || request.includes('show') ||
      request.includes('list') || request.includes('get')) {
    if (apiScopes.readonly) return apiScopes.readonly;
  }
  
  // Check for write operations
  if (request.includes('create') || request.includes('send') || 
      request.includes('write') || request.includes('add') ||
      request.includes('update') || request.includes('modify') ||
      request.includes('delete') || request.includes('save')) {
    if (apiScopes.full) return apiScopes.full;
    if (apiScopes.modify) return apiScopes.modify;
  }
  
  // Default to full access for safety
  return getDefaultScopes(apiName);
}

/**
 * Collects all required scopes from a list of external APIs
 */
export function collectWorkspaceScopes(externalApis, userRequest = '') {
  const allScopes = new Set();
  
  if (!externalApis || !Array.isArray(externalApis)) {
    return [];
  }
  
  for (const api of externalApis) {
    if (isWorkspaceAPI(api.name)) {
      const scopes = inferScopesFromContext(api.name, userRequest);
      scopes.forEach(scope => allScopes.add(scope));
    }
  }
  
  return Array.from(allScopes);
}

